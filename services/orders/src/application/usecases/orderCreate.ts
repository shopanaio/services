import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CreateOrderInput } from "@src/application/order/types";
import type { CreateOrderCommand } from "@src/domain/order/commands";
import type { CheckoutSnapshot } from "@src/domain/order/checkoutSnapshot";
import type { Checkout } from "@shopana/checkout-sdk";
// no ShippingPaymentModel needed in redacted snapshot mapping
import type { OrderCreated } from "@src/domain/order/events";
import { v7 as uuidv7 } from "uuid";
import { orderDecider } from "@src/domain/order/decider";

export interface CreateOrderUseCaseDependencies extends UseCaseDependencies {}

export class CreateOrderUseCase extends UseCase<CreateOrderInput, string> {
  constructor(deps: CreateOrderUseCaseDependencies) {
    super(deps);
  }

  async execute(input: CreateOrderInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const id = uuidv7();
    const streamId = this.streamNames.buildOrderStreamNameFromId(id);

    // Получаем полный агрегат Checkout через checkout-api и превращаем в снапшот
    const checkoutAggregate: Checkout = await this.checkoutApi.getById(
      businessInput.checkoutId,
      project.id
    );

    const checkoutSnapshot: CheckoutSnapshot = this.toSnapshotFromCheckout(
      checkoutAggregate,
      input
    );

    const command: CreateOrderCommand = {
      type: "order.create",
      data: {
        // Core context
        currencyCode:
          checkoutAggregate.currencyCode ?? checkoutSnapshot.currencyCode,
        idempotencyKey: checkoutAggregate.idempotencyKey ?? businessInput.checkoutId,
        salesChannel: checkoutAggregate.salesChannel ?? null,
        externalSource: checkoutAggregate.externalSource ?? null,
        externalId: checkoutAggregate.externalId ?? null,
        localeCode: checkoutAggregate.localeCode ?? null,

        // Totals
        subtotalAmount: checkoutAggregate.cost.subtotalAmount,
        totalDiscountAmount: checkoutAggregate.cost.totalDiscountAmount,
        totalTaxAmount: checkoutAggregate.cost.totalTaxAmount,
        totalShippingAmount: checkoutAggregate.cost.totalShippingAmount,
        totalAmount: checkoutAggregate.cost.totalAmount,

        // Customer
        customerEmail: checkoutAggregate.customerIdentity.email,
        customerPhone: checkoutAggregate.customerIdentity.phone,
        customerId: checkoutAggregate.customerIdentity.customer?.id ?? null,
        customerCountryCode: checkoutAggregate.customerIdentity.countryCode,
        customerNote: checkoutAggregate.customerNote,

        // Snapshot for audit
        checkoutSnapshot,
      },
      metadata: this.createCommandMetadata(id, context),
    };

    const { state } = await this.loadOrderState(id);

    const events = orderDecider.decide(command, state);
    const eventsToAppend = (
      Array.isArray(events) ? events : [events]
    ) as OrderCreated[];

    await this.appendToStream(
      streamId,
      eventsToAppend,
      "STREAM_DOES_NOT_EXIST"
    );

    return id;
  }

  /**
   * Builds audit-focused snapshot from Checkout aggregate.
   * Keeps only business-critical data for disputes and audits.
   */
  private toSnapshotFromCheckout(
    aggregate: Checkout,
    input: CreateOrderInput
  ): CheckoutSnapshot {
    const snapshot: CheckoutSnapshot = {
      checkoutId: aggregate.id,
      projectId: input.project.id,
      currencyCode:
        aggregate.currencyCode ?? aggregate.cost.totalAmount.currency().code,
      externalSource: aggregate.externalSource ?? null,
      externalId: aggregate.externalId ?? null,
      capturedAt: new Date(),
      customer: {
        customerId: aggregate.customerIdentity.customer?.id ?? null,
        countryCode: aggregate.customerIdentity.countryCode ?? null,
      },
      lines: aggregate.lines.map((l) => ({
        quantity: l.quantity,
        unit: {
          id: l.purchasableId,
          price: l.cost.unitPrice,
          compareAtPrice: l.cost.compareAtUnitPrice ?? null,
          title: l.title,
          sku: l.sku ?? null,
          imageUrl: l.imageSrc ?? null,
          snapshot: (l.purchasable as Record<string, unknown> | null) ?? null,
        },
      })),
      deliveryGroups: aggregate.deliveryGroups.map((g) => ({
        checkoutLineIds: g.checkoutLines.map((cl) => cl.id),
        deliveryAddress: g.deliveryAddress
          ? {
              countryCode: g.deliveryAddress.countryCode,
              provinceCode: g.deliveryAddress.provinceCode ?? null,
              postalCode: g.deliveryAddress.postalCode ?? null,
            }
          : null,
        selectedDeliveryMethod: g.selectedDeliveryMethod
          ? {
              code: g.selectedDeliveryMethod.code,
              deliveryMethodType: g.selectedDeliveryMethod.deliveryMethodType,
              provider: {
                code: g.selectedDeliveryMethod.provider.code,
              },
            }
          : null,
        shippingCost: g.shippingCost
          ? {
              amount: g.shippingCost.amount,
              paymentModel: g.shippingCost.paymentModel ?? null,
            }
          : null,
      })),
      appliedPromoCodes: aggregate.appliedPromoCodes.map((p) => ({
        code: p.code,
        appliedAt: new Date(p.appliedAt),
        discountType: p.discountType,
        value: p.value,
        provider: p.provider,
      })),
    };
    return snapshot;
  }
}

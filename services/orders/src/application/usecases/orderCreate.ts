import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CreateOrderInput } from "@src/application/order/types";
import type { CreateOrderCommand } from "@src/domain/order/commands";
import type { CheckoutSnapshot } from "@src/domain/order/checkoutSnapshot";
import type { Checkout } from "@shopana/checkout-sdk";
import { ShippingPaymentModel } from "@shopana/shipping-plugin-sdk";
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
        currencyCode: checkoutSnapshot.currencyCode,
        idempotencyKey: businessInput.checkoutId, // Using checkoutId as idempotency key
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
        email: aggregate.customerIdentity.email ?? null,
        customerId: aggregate.customerIdentity.customer?.id ?? null,
        phone: aggregate.customerIdentity.phone ?? null,
        countryCode: aggregate.customerIdentity.countryCode ?? null,
        note: aggregate.customerNote ?? null,
      },
      lines: aggregate.lines.map((l) => ({
        quantity: l.quantity,
        unit: {
          price: l.cost.unitPrice,
          compareAtPrice: l.cost.compareAtUnitPrice,
          title: l.title,
          sku: l.sku ?? null,
        },
      })),
      deliveryGroups: aggregate.deliveryGroups.map((g) => ({
        checkoutLineIds: g.checkoutLines.map((cl) => cl.id),
        deliveryAddress: g.deliveryAddress
          ? {
              address1: g.deliveryAddress.address1,
              address2: g.deliveryAddress.address2 ?? null,
              city: g.deliveryAddress.city,
              countryCode: g.deliveryAddress.countryCode,
              provinceCode: g.deliveryAddress.provinceCode ?? null,
              postalCode: g.deliveryAddress.postalCode ?? null,
              email: g.deliveryAddress.email ?? null,
              firstName: g.deliveryAddress.firstName ?? null,
              lastName: g.deliveryAddress.lastName ?? null,
              phone: (g.deliveryAddress as any).phone ?? null,
            }
          : null,
        selectedDeliveryMethod: g.selectedDeliveryMethod
          ? {
              code: g.selectedDeliveryMethod.code,
              deliveryMethodType: g.selectedDeliveryMethod.deliveryMethodType,
              shippingPaymentModel:
                g.selectedDeliveryMethod.shippingPaymentModel ??
                ShippingPaymentModel.MERCHANT_COLLECTED,
              provider: {
                code: g.selectedDeliveryMethod.provider.code,
              },
            }
          : null,
        shippingCost: g.shippingCost
          ? {
              amount: g.shippingCost.amount,
              paymentModel: g.shippingCost.paymentModel,
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

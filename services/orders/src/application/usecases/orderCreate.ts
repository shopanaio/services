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
    const checkoutAggregate: Checkout = await this.checkoutApi.getByCheckoutId({
      projectId: project.id,
      checkoutId: businessInput.checkoutId,
    });

    const checkoutSnapshot: CheckoutSnapshot = this.toSnapshotFromCheckout(
      checkoutAggregate,
      input
    );

    const command: CreateOrderCommand = {
      type: "order.create",
      data: {
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

  private toSnapshotFromCheckout(aggregate: Checkout, _input: CreateOrderInput): CheckoutSnapshot {
    const snapshot: CheckoutSnapshot = {
      checkoutId: aggregate.id,
      projectId: aggregate.customerIdentity.customer?.id ?? "",
      currencyCode: aggregate.cost.totalAmount.currency().code,
      localeCode: null,
      salesChannel: "",
      externalSource: null,
      externalId: null,
      capturedAt: new Date(),
      customer: {
        email: aggregate.customerIdentity.email ?? null,
        customerId: aggregate.customerIdentity.customer?.id ?? null,
        phone: aggregate.customerIdentity.phone ?? null,
        countryCode: aggregate.customerIdentity.countryCode ?? null,
        note: aggregate.customerNote ?? null,
      },
      lines: aggregate.lines.map((l) => ({
        lineId: l.id,
        quantity: l.quantity,
        unit: {
          id: l.purchasableId,
          price: l.cost.unitPrice,
          compareAtPrice: l.cost.compareAtUnitPrice,
          title: l.title,
          imageUrl: l.imageSrc ?? null,
          sku: l.sku ?? null,
          snapshot: (l as any).purchasable?.snapshot ?? null,
        },
      })),
      deliveryGroups: aggregate.deliveryGroups.map((g) => ({
        id: g.id,
        checkoutLineIds: g.checkoutLines.map((cl) => cl.id),
        deliveryAddress: g.deliveryAddress
          ? {
              id: g.deliveryAddress.id,
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
              data: (g.deliveryAddress?.data as any) ?? null,
            }
          : null,
        selectedDeliveryMethod: g.selectedDeliveryMethod
          ? {
              code: g.selectedDeliveryMethod.code,
              deliveryMethodType: g.selectedDeliveryMethod.deliveryMethodType,
              shippingPaymentModel:
                g.estimatedCost?.paymentModel ?? ShippingPaymentModel.MERCHANT_COLLECTED,
              provider: {
                code: g.selectedDeliveryMethod.provider.code,
                data: g.selectedDeliveryMethod.provider.data as any,
              },
            }
          : null,
        shippingCost: g.estimatedCost
          ? { amount: g.estimatedCost.amount, paymentModel: g.estimatedCost.paymentModel }
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

import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CreateOrderInput } from "@src/application/order/types";
import type { CreateOrderCommand } from "@src/domain/order/commands";
import type { CheckoutSnapshot } from "@src/domain/order/checkoutSnapshot";
import type { Checkout } from "@shopana/checkout-sdk";
import type { OrderCreated } from "@src/domain/order/events";
import type { AppliedDiscount, OrderUnitSnapshot } from "@src/domain/order/evolve";
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

    // Build order business data (independent from audit snapshot)
    const orderLines = checkoutAggregate.lines.map((l) => ({
      lineId: l.id, // use checkout line id as initial order line id
      quantity: l.quantity,
      unit: {
        id: l.purchasableId,
        price: l.cost.unitPrice,
        compareAtPrice: l.cost.compareAtUnitPrice ?? null,
        title: l.title,
        sku: l.sku ?? null,
        imageUrl: l.imageSrc ?? null,
        snapshot: (l.purchasable as Record<string, unknown> | null) ?? null,
      } satisfies OrderUnitSnapshot,
    }));

    // Prepare PII to be persisted separately and map delivery group -> addressId
    // 1) Generate address IDs and persist addresses in PII tables
    const deliveryAddressesToPersist = checkoutAggregate.deliveryGroups
      .filter((g) => !!g.deliveryAddress)
      .map((g) => {
        const addrId = uuidv7();
        return {
          addrId,
          groupId: g.id,
          payload: {
            id: addrId,
            projectId: project.id,
            orderId: id,
            deliveryGroupId: g.id,
            address1: g.deliveryAddress!.address1,
            address2: g.deliveryAddress!.address2 ?? null,
            city: g.deliveryAddress!.city,
            countryCode: g.deliveryAddress!.countryCode,
            provinceCode: g.deliveryAddress!.provinceCode ?? null,
            postalCode: g.deliveryAddress!.postalCode ?? null,
            email: g.deliveryAddress!.email ?? null,
            firstName: g.deliveryAddress!.firstName ?? null,
            lastName: g.deliveryAddress!.lastName ?? null,
            phone: g.deliveryAddress!.phone ?? null,
            metadata: (g.deliveryAddress!.data as Record<string, unknown> | null) ?? null,
          },
        };
      });

    // 2) Persist order contact PII and delivery addresses
    // Note: this side-write keeps PII out of event payloads. If this write fails,
    // the order creation should be aborted to avoid dangling references.
    await this.ordersPiiRepository.upsertOrderContacts({
      projectId: project.id,
      orderId: id,
      customerEmail: checkoutAggregate.customerIdentity.email ?? null,
      customerPhoneE164: checkoutAggregate.customerIdentity.phone ?? null,
      customerNote: checkoutAggregate.customerNote ?? null,
      expiresAt: null,
    });

    await this.ordersPiiRepository.insertDeliveryAddresses(
      deliveryAddressesToPersist.map((a) => a.payload)
    );

    // 3) Build delivery groups payload for event with references to PII (addressId)
    const deliveryGroupsForEvent = checkoutAggregate.deliveryGroups.map((g) => ({
      id: g.id,
      orderLineIds: g.checkoutLines.map((cl) => cl.id),
      deliveryAddressId:
        deliveryAddressesToPersist.find((a) => a.groupId === g.id)?.addrId ?? null,
      deliveryCost: g.shippingCost
        ? {
            amount: g.shippingCost.amount,
            paymentModel: g.shippingCost.paymentModel,
          }
        : null,
    }));

    const appliedDiscounts: AppliedDiscount[] = checkoutAggregate.appliedPromoCodes.map(
      (p) => ({
        code: p.code,
        appliedAt: new Date(p.appliedAt),
        type: p.discountType,
        value: p.value,
        provider: p.provider,
      })
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

        // Customer (no PII in events)
        customerId: checkoutAggregate.customerIdentity.customer?.id ?? null,
        customerCountryCode: checkoutAggregate.customerIdentity.countryCode,

        // Order business state
        lines: orderLines,
        deliveryGroups: deliveryGroupsForEvent,
        appliedDiscounts,

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

    // NOTE: PII has been persisted into platform.orders_pii_records and
    // platform.order_delivery_addresses. Only references (deliveryAddressId)
    // are kept in event payloads for safe, GDPR-compliant event sourcing.
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

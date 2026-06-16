import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CreateOrderInput } from "@src/application/order/types";
import type { CreateOrderCommand } from "@src/domain/order/commands";
import type { CheckoutSnapshot } from "@src/domain/order/checkoutSnapshot";
import type { CheckoutApiClient } from "@shopana/shared-service-api";
import type { OrderCreated } from "@src/domain/order/events";
import type {
  AppliedDiscount,
  OrderUnitSnapshot,
} from "@src/domain/order/evolve";
import { Money } from "@shopana/shared-money";
import { v7 as uuidv7 } from "uuid";
import { orderDecider } from "@src/domain/order/decider";
import {
  runOrderCreateProjectionContext,
  setOrderCreateProjectionContext,
  type OrderCreateProjectionContextData,
} from "@src/application/usecases/orderCreateProjectionContext";

/** Checkout aggregate type as returned by the checkout API client. */
type Checkout = Awaited<ReturnType<CheckoutApiClient['getById']>>;

/**
 * Converts a Money value from checkout-sdk to shared-money Money.
 *
 * The checkout-sdk bundles its own Money class declaration in dist,
 * creating a distinct TypeScript type from @shopana/shared-money's Money
 * (private fields make them structurally incompatible).
 * This helper bridges the two by going through amountMinor + currency code.
 */
function toMoney(value: { amountMinor(): bigint; currency(): { code: string } }): Money {
  return Money.fromMinor(value.amountMinor(), value.currency().code);
}

/**
 * Converts a Money | number union from checkout to the shared-money equivalent.
 */
function toMoneyOrNumber(value: number | { amountMinor(): bigint; currency(): { code: string } }): number | Money {
  if (typeof value === "number") return value;
  return toMoney(value);
}

export interface CreateOrderUseCaseDependencies extends UseCaseDependencies {}

export class CreateOrderUseCase extends UseCase<CreateOrderInput, string> {
  constructor(deps: CreateOrderUseCaseDependencies) {
    super(deps);
  }

  async execute(input: CreateOrderInput): Promise<string> {
    return runOrderCreateProjectionContext(async () => {
      return this.executeWithProjectionContext(input);
    });
  }

  private async executeWithProjectionContext(
    input: CreateOrderInput
  ): Promise<string> {
    const { apiKey, store, customer, user, ...businessInput } = input;
    const context = { apiKey, store, customer, user };

    const id = uuidv7();
    const streamId = this.streamNames.buildOrderStreamNameFromId(id);

    // Get full checkout aggregate through checkout-api and convert to snapshot
    const checkoutAggregate = await this.checkoutApi.getById(
      businessInput.checkoutId,
      store.id
    );

    // Validate checkout readiness before creating order (mock implementation)
    this.validateCheckout(checkoutAggregate);

    // Resolve idempotency key from checkout aggregate or fallback
    const idempotencyKey =
      checkoutAggregate.idempotencyKey ?? businessInput.checkoutId;

    // Idempotency: return existing order if key previously used
    const idemHit = await this.idempotencyRepository.get(
      store.id,
      idempotencyKey
    );
    if (idemHit?.id) {
      return idemHit.id;
    }

    const checkoutSnapshot: CheckoutSnapshot = this.toSnapshotFromCheckout(
      checkoutAggregate,
      input
    );

    // Build order business data (independent from audit snapshot)
    // Flatten hierarchical lines (parent + children) into a flat array
    const orderLines = this.flattenCheckoutLines(checkoutAggregate.lines);

    const deliveryAddressRefs = this.populateProjectionContext(
      id,
      store.id,
      checkoutAggregate
    );

    // Build delivery groups payload for event with references to PII (addressId)
    const deliveryGroupsForEvent = checkoutAggregate.deliveryGroups.map(
      (g) => ({
        id: g.id,
        orderLineIds: g.checkoutLines.map((cl) => cl.id),
        deliveryAddressId: deliveryAddressRefs.get(g.id) ?? null,
        deliveryCost: g.shippingCost?.amount
          ? {
              amount: toMoney(g.shippingCost.amount),
              paymentModel: g.shippingCost.paymentModel,
            }
          : null,
      })
    );

    const appliedDiscounts: AppliedDiscount[] =
      checkoutAggregate.appliedPromoCodes.map((p) => ({
        code: p.code,
        appliedAt: new Date(p.appliedAt),
        type: p.discountType,
        value: toMoneyOrNumber(p.value),
        provider: p.provider,
      }));

    const command: CreateOrderCommand = {
      type: "order.create",
      data: {
        // Core context
        currencyCode:
          checkoutAggregate.currencyCode ?? checkoutSnapshot.currencyCode,
        idempotencyKey:
          checkoutAggregate.idempotencyKey ?? businessInput.checkoutId,
        salesChannel: checkoutAggregate.salesChannel ?? null,
        externalSource: checkoutAggregate.externalSource ?? null,
        externalId: checkoutAggregate.externalId ?? null,
        localeCode: checkoutAggregate.localeCode ?? null,

        // Totals
        subtotalAmount: toMoney(checkoutAggregate.cost.subtotalAmount),
        totalDiscountAmount: toMoney(checkoutAggregate.cost.totalDiscountAmount),
        totalTaxAmount: toMoney(checkoutAggregate.cost.totalTaxAmount),
        totalShippingAmount: toMoney(checkoutAggregate.cost.totalShippingAmount),
        totalAmount: toMoney(checkoutAggregate.cost.totalAmount),

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
      metadata: this.createCommandMetadata(id, context, idempotencyKey),
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

  private populateProjectionContext(
    orderId: string,
    projectId: string,
    checkoutAggregate: Checkout
  ): Map<string, string> {
    const deliveryGroups = checkoutAggregate.deliveryGroups.filter(
      (group) => group.deliveryAddress
    );

    const contact = {
      projectId,
      orderId,
      firstName: checkoutAggregate.customerIdentity.firstName ?? null,
      lastName: checkoutAggregate.customerIdentity.lastName ?? null,
      middleName: checkoutAggregate.customerIdentity.middleName ?? null,
      customerId: checkoutAggregate.customerIdentity.customer?.id ?? null,
      customerEmail: checkoutAggregate.customerIdentity.email ?? null,
      customerPhoneE164: checkoutAggregate.customerIdentity.phone ?? null,
      customerNote: checkoutAggregate.customerNote ?? null,
      countryCode: checkoutAggregate.customerIdentity.countryCode ?? null,
      metadata: null,
      expiresAt: null,
    } satisfies OrderCreateProjectionContextData["contact"];

    const deliveryAddressRefs = new Map<string, string>();
    const deliveryAddresses: OrderCreateProjectionContextData["deliveryAddresses"] = [];
    const recipients: OrderCreateProjectionContextData["recipients"] = [];
    const deliveryGroupMappings: OrderCreateProjectionContextData["deliveryGroupMappings"] = [];
    const deliveryMethods: OrderCreateProjectionContextData["deliveryMethods"] = [];
    const selectedDeliveryMethods: OrderCreateProjectionContextData["selectedDeliveryMethods"] = [];

    for (const group of deliveryGroups) {
      const address = group.deliveryAddress!;

      const addrId = uuidv7();
      const recipientId = uuidv7();

      deliveryAddressRefs.set(group.id, addrId);

      deliveryAddresses.push({
        id: addrId,
        address1: address.address1,
        address2: address.address2 ?? null,
        city: address.city,
        countryCode: address.countryCode,
        provinceCode: address.provinceCode ?? null,
        postalCode: address.postalCode ?? null,
        metadata: (address.data as Record<string, unknown> | null) ?? null,
      });

      recipients.push({
        id: recipientId,
        projectId,
        firstName: address.firstName ?? null,
        lastName: address.lastName ?? null,
        middleName: null,
        email: address.email ?? null,
        phone: address.phone ?? null,
        metadata: null,
      });

      deliveryGroupMappings.push({
        deliveryGroupId: group.id,
        addressId: addrId,
        recipientId: recipientId,
      });
    }

    // Collect all delivery methods from all groups
    for (const group of checkoutAggregate.deliveryGroups) {
      for (const method of group.deliveryMethods) {
        deliveryMethods.push({
          code: method.code,
          provider: method.provider.code,
          deliveryGroupId: group.id,
          deliveryMethodType: method.deliveryMethodType,
          paymentModel: method.shippingPaymentModel ?? null,
          metadata: null,
          customerInput: (method.provider.data as Record<string, unknown> | null) ?? null,
        });
      }

      // Store selected delivery method
      if (group.selectedDeliveryMethod) {
        selectedDeliveryMethods.push({
          deliveryGroupId: group.id,
          code: group.selectedDeliveryMethod.code,
          provider: group.selectedDeliveryMethod.provider.code,
        });
      }
    }

    setOrderCreateProjectionContext(orderId, {
      contact,
      deliveryAddresses,
      recipients,
      deliveryGroupMappings,
      deliveryMethods,
      selectedDeliveryMethods,
      paymentMethods: [], // TODO: Add when payment methods are available in checkout
      selectedPaymentMethod: null,
    });

    return deliveryAddressRefs;
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
      projectId: input.store.id,
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
          price: toMoney(l.cost.unitPrice),
          title: l.title,
          sku: l.sku ?? null,
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
        shippingCost: g.shippingCost?.amount
          ? {
              amount: toMoney(g.shippingCost.amount),
              paymentModel: g.shippingCost.paymentModel ?? null,
            }
          : null,
      })),
      appliedPromoCodes: aggregate.appliedPromoCodes.map((p) => ({
        code: p.code,
        appliedAt: new Date(p.appliedAt),
        discountType: p.discountType,
        value: toMoneyOrNumber(p.value),
        provider: p.provider,
      })),
    };
    return snapshot;
  }

  /**
   * Validates that checkout aggregate is eligible to be turned into an order.
   * This is a mock implementation and should be replaced with real checks
   * (e.g., finalized state, non-empty lines, inventory/payment validations).
   *
   * @param aggregate - Checkout aggregate loaded from checkout service
   */
  protected validateCheckout(aggregate: Checkout): void {
    // Mock: basic guard to ensure there is at least one line
    if (!aggregate.lines || aggregate.lines.length === 0) {
      throw new Error("Checkout has no lines to create an order");
    }
  }

  /**
   * Flattens hierarchical checkout lines (parent + children) into a flat array for order lines.
   * Parent lines are included first, followed by their children with parentLineId set.
   */
  private flattenCheckoutLines(
    lines: Checkout["lines"],
    parentLineId: string | null = null
  ): Array<{
    lineId: string;
    quantity: number;
    unit: OrderUnitSnapshot;
    tag: { id: string; slug: string; isUnique: boolean } | null;
    parentLineId: string | null;
  }> {
    const result: Array<{
      lineId: string;
      quantity: number;
      unit: OrderUnitSnapshot;
      tag: { id: string; slug: string; isUnique: boolean } | null;
      parentLineId: string | null;
    }> = [];

    for (const line of lines) {
      // Add the current line
      result.push({
        lineId: line.id,
        quantity: line.quantity,
        unit: {
          id: line.purchasableId,
          price: toMoney(line.cost.unitPrice),
          compareAtPrice: line.cost.compareAtUnitPrice ? toMoney(line.cost.compareAtUnitPrice) : null,
          title: line.title,
          sku: line.sku ?? null,
          imageUrl: line.imageSrc ?? null,
          snapshot: (line.purchasable as Record<string, unknown> | null) ?? null,
        } satisfies OrderUnitSnapshot,
        tag: line.tag
          ? {
              id: line.tag.id,
              slug: line.tag.slug,
              isUnique: line.tag.isUnique,
            }
          : null,
        parentLineId,
      });

      // Recursively add children with current line as parent
      if (line.children && line.children.length > 0) {
        result.push(...this.flattenCheckoutLines(line.children, line.id));
      }
    }

    return result;
  }
}

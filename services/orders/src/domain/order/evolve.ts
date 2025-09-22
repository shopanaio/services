import { OrderEventTypes, type OrderEvent } from "./events";
import { Money } from "@shopana/shared-money";
import { ShippingPaymentModel } from "@shopana/shipping-plugin-sdk";

/** Order status aligned with admin GraphQL schema. */
export enum OrderStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED",
  CANCELLED = "CANCELLED",
}

/**
 * Domain snapshot of a purchasable unit that composes an order line.
 */
export type OrderUnitSnapshot = Readonly<{
  id: string;
  price: Money;
  compareAtPrice: Money | null;
  title: string;
  imageUrl: string | null;
  sku: string | null;
  snapshot: Record<string, unknown> | null;
}>;

/**
 * Domain state for a single order line item.
 */
export type OrderLineItemState = Readonly<{
  lineId: string;
  quantity: number;
  unit: OrderUnitSnapshot;
}>;

/**
 * Delivery address attached to a delivery group.
 *
 * Note: This structure contains PII. Avoid persisting it in event payloads.
 * Keep addresses in PII storage/read-model and only reference them from events.
 */
export type OrderDeliveryAddress = Readonly<{
  id: string;
  /** PII */
  address1: string;
  /** PII */
  address2?: string | null;
  /** PII */
  city: string;
  countryCode: string;
  provinceCode?: string | null;
  postalCode?: string | null;
  /** PII */
  email?: string | null;
  /** PII */
  firstName?: string | null;
  /** PII */
  lastName?: string | null;
  /** PII */
  phone?: string | null;
  /** PII: may contain additional personal attributes */
  data?: Record<string, unknown> | null;
}>;

/**
 * Delivery group that groups lines by delivery address/method.
 */
export type OrderDeliveryGroup = Readonly<{
  id: string;
  /** Order lines associated with the delivery group. */
  orderLineIds: string[];
  /**
   * PII: Full delivery address contains personal data. Do not persist in event payloads.
   * Prefer storing a reference (deliveryAddressId) and keep address record in PII storage.
   */
  deliveryAddress: OrderDeliveryAddress | null;
  /**
   * Delivery cost could update after order creation.
   * Initial cost is set to the cost of the selected delivery method.
   */
  deliveryCost: {
    amount: Money;
    paymentModel: ShippingPaymentModel;
  } | null;
}>;

/**
 * Applied promo code snapshot attached to order.
 */
export type OrderPromoCode = Readonly<{
  code: string;
  appliedAt: Date;
  discountType: string;
  value: number | Money;
  provider: string;
  conditions?: Record<string, unknown> | null;
}>;

/**
 * Applied discount normalized representation used for pricing/totals context.
 */
export type AppliedDiscount = Readonly<{
  code: string;
  appliedAt: Date;
  type: string;
  value: number | Money;
  provider: string;
}>;

/**
 * Aggregate state for Order. Designed for event-sourced storage and rebuild.
 */
export type OrderState = Readonly<{
  // Identity and lifecycle
  id: string;
  exists: boolean;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  // Context and source
  apiKey: string;
  createdBy: string | null;
  salesChannel: string;
  externalSource: string | null;
  externalId: string | null;

  // Localization and currency
  currencyCode: string;
  localeCode: string | null;

  // Totals
  subtotal: Money;
  discountTotal: Money;
  taxTotal: Money;
  shippingTotal: Money;
  grandTotal: Money;

  // Customer facing metadata
  number: number | null;
  status: OrderStatus;
  expiresAt: Date | null;
  version: number;
  metadata: Record<string, unknown>;

  // Customer identity
  /** PII: keep out of event payloads; store in PII storage/read-model. */
  customerEmail: string | null;
  customerId: string | null;
  /** PII: keep out of event payloads; store in PII storage/read-model. */
  customerPhone: string | null;
  customerCountryCode: string | null;
  /** PII: may contain personal data. Keep out of event payloads. */
  customerNote: string | null;

  // Business data
  idempotencyKey: string;
  linesRecord: Record<string, OrderLineItemState>;
  appliedDiscounts: AppliedDiscount[];
  deliveryGroups: OrderDeliveryGroup[];
}>;

/**
 * Creates initial empty state for the Order aggregate.
 */
export const orderInitialState = (): OrderState => ({
  id: "",
  exists: false,
  projectId: "",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  deletedAt: null,

  apiKey: "",
  createdBy: null,
  salesChannel: "",
  externalSource: null,
  externalId: null,

  currencyCode: "",
  localeCode: null,

  subtotal: Money.zero(),
  discountTotal: Money.zero(),
  taxTotal: Money.zero(),
  shippingTotal: Money.zero(),
  grandTotal: Money.zero(),

  number: null,
  status: OrderStatus.DRAFT,
  expiresAt: null,
  version: 0,
  metadata: {},

  customerEmail: null,
  customerId: null,
  customerPhone: null,
  customerCountryCode: null,
  customerNote: null,

  idempotencyKey: "",
  linesRecord: {},
  appliedDiscounts: [],
  deliveryGroups: [],
});

export const orderEvolve = (
  current: OrderState,
  event: OrderEvent
): OrderState => {
  switch (event.type) {
    case OrderEventTypes.OrderCreated: {
      // Build lines record for quick lookup and immutable state representation
      const linesRecord: Record<string, OrderLineItemState> = {};
      for (const line of event.data.lines) {
        linesRecord[line.lineId] = {
          lineId: line.lineId,
          quantity: line.quantity,
          unit: line.unit,
        };
      }

      // Build delivery groups without PII (addresses are stored in PII storage)
      const deliveryGroups: OrderDeliveryGroup[] =
        event.data.deliveryGroups.map((g) => ({
          id: g.id,
          orderLineIds: g.orderLineIds,
          deliveryAddress: null, // PII is not stored in events; resolved via read-model
          deliveryCost: g.deliveryCost
            ? {
                amount: g.deliveryCost.amount,
                paymentModel: g.deliveryCost
                  .paymentModel as ShippingPaymentModel,
              }
            : null,
        }));

      return {
        ...current,
        exists: true,
        id: event.metadata.aggregateId,
        projectId: event.metadata.projectId,
        createdAt: event.metadata.now,
        updatedAt: event.metadata.now,

        apiKey: event.metadata.apiKey,
        createdBy: event.metadata.userId ?? null,
        salesChannel: event.data.salesChannel ?? "",
        externalSource: event.data.externalSource,
        externalId: event.data.externalId,

        currencyCode: event.data.currencyCode,
        localeCode: event.data.localeCode,

        subtotal: event.data.subtotalAmount,
        discountTotal: event.data.totalDiscountAmount,
        taxTotal: event.data.totalTaxAmount,
        shippingTotal: event.data.totalShippingAmount,
        grandTotal: event.data.totalAmount,

        // Keep status as DRAFT on creation; follow-up events drive transitions
        number: null, // populated from numbers
        status: OrderStatus.DRAFT,
        version: current.version + 1,

        customerId: event.data.customerId,
        customerCountryCode: event.data.customerCountryCode,
        // PII (email/phone/note) is intentionally not part of event payloads

        idempotencyKey: event.data.idempotencyKey,
        linesRecord,
        deliveryGroups,
        appliedDiscounts: event.data.appliedDiscounts,
      };
    }

    default:
      return current;
  }
};

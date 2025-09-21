import { OrderEventTypes, type OrderEvent } from "./events";
import { Money } from "@shopana/shared-money";
import type { ShippingPaymentModel } from "@shopana/shipping-plugin-sdk";

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
 */
export type OrderDeliveryAddress = Readonly<{
  id: string;
  address1: string;
  address2?: string | null;
  city: string;
  countryCode: string;
  provinceCode?: string | null;
  postalCode?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  data?: Record<string, unknown> | null;
}>;

/**
 * Delivery group that groups lines by delivery address/method.
 */
export type OrderDeliveryGroup = Readonly<{
  id: string;
  /** Order lines associated with the delivery group. */
  orderLineIds: string[];
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
  customerEmail: string | null;
  customerId: string | null;
  customerPhone: string | null;
  customerCountryCode: string | null;
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
      return { ...current };
    }

    default:
      return current;
  }
};

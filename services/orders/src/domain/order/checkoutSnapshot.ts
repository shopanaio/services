import { Money } from "@shopana/shared-money";
import {
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/shipping-plugin-sdk";

/**
 * Snapshot of a Checkout captured at Order creation time for audit/disputes.
 *
 * Purpose:
 * - Persist in orders event store to rebuild customer-visible context
 *   without calling the checkout service.
 * - Excludes processing/business fields that live in Order domain.
 */
export type CheckoutSnapshot = Readonly<{
  /** Checkout aggregate identifier */
  checkoutId: string;
  /** Project (tenant) identifier */
  projectId: string;

  /** Pricing and localization */
  currencyCode: string;
  localeCode: string | null;

  /** Sales channel and external system references */
  salesChannel: string;
  externalSource: string | null;
  externalId: string | null;

  /** Timestamps */
  createdAt: Date; // checkout creation time
  capturedAt: Date; // when this snapshot was captured (order creation time)

  /** Totals computed by checkout domain */
  totals: CheckoutTotalsSnapshot;

  /** Customer identity and note provided at checkout time */
  customer: CheckoutCustomerSnapshot;

  /** Flattened list of checkout lines (no DB ids from orders domain) */
  lines: CheckoutLineSnapshot[];

  /** Delivery groups state captured from checkout */
  deliveryGroups: CheckoutDeliveryGroupSnapshot[];

  /** Applied promo codes visible to the customer */
  appliedPromoCodes: CheckoutPromoCodeSnapshot[];
}>;

/**
 * Per-line snapshot including purchasable unit snapshot and quantity.
 */
export type CheckoutLineSnapshot = Readonly<{
  lineId: string;
  quantity: number;
  unit: CheckoutUnitSnapshot;
}>;

/**
 * Purchasable unit snapshot copied from checkout event payloads.
 */
export type CheckoutUnitSnapshot = Readonly<{
  id: string;
  price: Money;
  compareAtPrice: Money | null;
  title: string;
  imageUrl: string | null;
  sku: string | null;
  /** Opaque vendor-specific snapshot payload */
  snapshot: Record<string, unknown> | null;
}>;

/**
 * Totals snapshot aligned with checkout domain calculation output.
 */
export type CheckoutTotalsSnapshot = Readonly<{
  subtotal: Money;
  discountTotal: Money;
  taxTotal: Money;
  shippingTotal: Money;
  grandTotal: Money;
  totalQuantity: number;
}>;

/**
 * Customer identity data present at checkout time.
 */
export type CheckoutCustomerSnapshot = Readonly<{
  email: string | null;
  customerId: string | null;
  phone: string | null;
  countryCode: string | null;
  note: string | null;
}>;

/**
 * Delivery provider descriptor.
 */
export type CheckoutDeliveryProviderSnapshot = Readonly<{
  code: string;
  data: Record<string, unknown>;
}>;

/**
 * Delivery method descriptor selected or proposed for a group.
 */
export type CheckoutDeliveryMethodSnapshot = Readonly<{
  code: string;
  deliveryMethodType: DeliveryMethodType;
  shippingPaymentModel: ShippingPaymentModel;
  provider: CheckoutDeliveryProviderSnapshot;
}>;

/**
 * Delivery address attached to a group.
 */
export type CheckoutDeliveryAddressSnapshot = Readonly<{
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
 * Delivery group state including selected method and shipping cost.
 */
export type CheckoutDeliveryGroupSnapshot = Readonly<{
  id: string;
  checkoutLineIds: string[];
  deliveryAddress: CheckoutDeliveryAddressSnapshot | null;
  selectedDeliveryMethod: CheckoutDeliveryMethodSnapshot | null;
  shippingCost: { amount: Money; paymentModel: ShippingPaymentModel } | null;
}>;

/**
 * Applied promo code snapshot stored with the checkout.
 */
export type CheckoutPromoCodeSnapshot = Readonly<{
  code: string;
  appliedAt: Date;
  /** Discount type as opaque string to avoid tight coupling */
  discountType: string;
  /** Discount value; may be percentage/amount depending on type */
  value: number | Money;
  provider: string;
}>;

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

  /** Pricing */
  currencyCode: string;

  /** External system references (for reconciliation) */
  externalSource: string | null;
  externalId: string | null;

  /** Timestamp when this snapshot was captured (order creation time) */
  capturedAt: Date;

  /** Minimal customer identity (no PII beyond stable id) */
  customer: CheckoutCustomerSnapshot;

  /** Flattened list of checkout lines relevant to audit */
  lines: CheckoutLineSnapshot[];

  /** Delivery groups state: geography and selected method */
  deliveryGroups: CheckoutDeliveryGroupSnapshot[];

  /** Minimal promo code facts (no provider-specific calculations) */
  appliedPromoCodes: CheckoutPromoCodeSnapshot[];
}>;

/**
 * Per-line snapshot including purchasable unit snapshot and quantity.
 */
export type CheckoutLineSnapshot = Readonly<{
  /** Quantity of the purchasable unit */
  quantity: number;
  /** Unit business descriptor */
  unit: CheckoutUnitSnapshot;
}>;

/**
 * Purchasable unit snapshot copied from checkout event payloads.
 */
export type CheckoutUnitSnapshot = Readonly<{
  /** Final unit price at checkout time */
  price: Money;
  /** Reference (strike-through) price if applicable */
  compareAtPrice: Money | null;
  /** Human-readable title of the unit */
  title: string;
  /** Merchant SKU if provided */
  sku: string | null;
}>;

/**
 * Totals snapshot aligned with checkout domain calculation output.
 */
export type CheckoutTotalsSnapshot = Readonly<{
  /** Subtotal before discounts and taxes */
  subtotal: Money;
  /** Total discounts applied */
  discountTotal: Money;
  /** Total tax amount */
  taxTotal: Money;
  /** Total shipping amount */
  shippingTotal: Money;
  /** Grand total (customer pays) */
  grandTotal: Money;
  /** Total quantity across all lines */
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
  /** Provider code (no opaque data) */
  code: string;
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
  address1: string;
  address2: string | null;
  city: string;
  countryCode: string;
  provinceCode: string | null;
  postalCode: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}>;

/**
 * Delivery group state including selected method and shipping cost.
 */
export type CheckoutDeliveryGroupSnapshot = Readonly<{
  /** Relation to checkout line identities for traceability */
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

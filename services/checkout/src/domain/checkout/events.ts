import type { CreateEventType } from "@event-driven-io/emmett";
import { CheckoutCommandMetadata } from "@src/domain/checkout/commands";
import { Money } from "@shopana/shared-money";
import { DiscountCondition, DiscountType } from "@shopana/pricing-plugin-sdk";
import {
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/shipping-api";
import type {
  CheckoutLineCostSnapshot,
  CheckoutTotalsSnapshot,
  CheckoutCostSnapshot,
} from "@src/domain/checkout/cost";
import { AppliedDiscountSnapshot } from "@src/domain/checkout/discount";

export const CheckoutEventTypes = {
  CheckoutCreated: "checkout.created",
  CheckoutLinesAdded: "checkout.lines.added",
  CheckoutLinesUpdated: "checkout.lines.updated",
  CheckoutLinesDeleted: "checkout.lines.deleted",
  CheckoutLinesCleared: "checkout.lines.cleared",
  // New events for extended functionality
  CheckoutCustomerIdentityUpdated: "checkout.customer.identity.updated",
  CheckoutCustomerNoteUpdated: "checkout.customer.note.updated",
  CheckoutLanguageCodeUpdated: "checkout.language.code.updated",
  CheckoutCurrencyCodeUpdated: "checkout.currency.code.updated",
  CheckoutPromoCodeAdded: "checkout.promo.code.added",
  CheckoutPromoCodeRemoved: "checkout.promo.code.removed",
  // Delivery Groups events (deprecated separate created)
  CheckoutDeliveryGroupAddressUpdated:
    "checkout.delivery.group.address.updated",
  CheckoutDeliveryGroupAddressCleared:
    "checkout.delivery.group.address.cleared",
  CheckoutDeliveryGroupMethodUpdated: "checkout.delivery.group.method.updated",
  CheckoutDeliveryGroupRemoved: "checkout.delivery.group.removed",
} as const;

/**
 * Contract version for checkout domain events.
 *
 * Versioning policy:
 * - Every event carries `metadata.contractVersion` set to this constant at write time.
 * - Readers (aggregates/projections/consumers) MUST upcast older versions to the latest
 *   before evolve/projection. Upcasters are pure functions registered per (type, fromVersion).
 * - Backward-incompatible schema changes bump this value and require corresponding upcasters.
 *
 * See also: ARCHITECTURE.md → "Event Versioning & Upcasting".
 */
export const CheckoutEventsContractVersion = 3 as const;

/**
 * Event: checkout.created (v1)
 *
 * Metadata:
 * - contractVersion: aligns with `CheckoutEventsContractVersion`
 */
/**
 * Strict payload for CheckoutCreated event. Only whitelisted fields are allowed.
 */
export type CheckoutCreatedPayload = Readonly<{
  currencyCode: string;
  idempotencyKey: string;
  salesChannel: string;
  externalSource: string | null;
  externalId: string | null;
  localeCode: string | null;
  displayCurrencyCode: string | null;
  displayExchangeRate: number | null;
  deliveryGroups: Array<{
    id: string;
    deliveryMethods: Array<{
      code: string;
      provider: string;
      deliveryMethodType: DeliveryMethodType;
      shippingPaymentModel: ShippingPaymentModel;
    }>;
  }>;
}>;

export type CheckoutCreated = CreateEventType<
  typeof CheckoutEventTypes.CheckoutCreated,
  CheckoutCreatedPayload,
  CheckoutCommandMetadata
>;

export type CheckoutUnit = Readonly<{
  id: string;
  price: Money;
  compareAtPrice: Money | null;
  title: string;
  imageUrl: string | null;
  sku: string | null;
  snapshot: Record<string, unknown> | null;
}>;

export type CheckoutLinesAddedLine = Readonly<{
  lineId: string;
  quantity: number;
  unit: CheckoutUnit;
}>;

export type CheckoutLinesAddedPayload = Readonly<{
  /** All lines in the checkout */
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
}>;

export type CheckoutLinesAdded = CreateEventType<
  typeof CheckoutEventTypes.CheckoutLinesAdded,
  CheckoutLinesAddedPayload,
  CheckoutCommandMetadata
>;

export type CheckoutLinesUpdatedPayload = Readonly<{
  /** All lines in the checkout after update */
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
}>;

export type CheckoutLinesUpdated = CreateEventType<
  typeof CheckoutEventTypes.CheckoutLinesUpdated,
  CheckoutLinesUpdatedPayload,
  CheckoutCommandMetadata
>;

export type CheckoutLinesDeletedPayload = Readonly<{
  /** All remaining lines in the checkout after deletion */
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
}>;

export type CheckoutLinesDeleted = CreateEventType<
  typeof CheckoutEventTypes.CheckoutLinesDeleted,
  CheckoutLinesDeletedPayload,
  CheckoutCommandMetadata
>;

export type CheckoutLinesClearedPayload = Readonly<{
  /** Empty lines after clearing */
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
}>;

export type CheckoutLinesCleared = CreateEventType<
  typeof CheckoutEventTypes.CheckoutLinesCleared,
  CheckoutLinesClearedPayload,
  CheckoutCommandMetadata
>;

// New events for extended functionality
export type CheckoutCustomerIdentityUpdatedPayload = Readonly<{
  email?: string | null;
  customerId?: string | null;
  phone?: string | null;
  countryCode?: string | null;
}>;

export type CheckoutCustomerIdentityUpdated = CreateEventType<
  typeof CheckoutEventTypes.CheckoutCustomerIdentityUpdated,
  CheckoutCustomerIdentityUpdatedPayload,
  CheckoutCommandMetadata
>;

export type CheckoutCustomerNoteUpdatedPayload = Readonly<{
  note: string | null;
}>;

export type CheckoutCustomerNoteUpdated = CreateEventType<
  typeof CheckoutEventTypes.CheckoutCustomerNoteUpdated,
  CheckoutCustomerNoteUpdatedPayload,
  CheckoutCommandMetadata
>;

export type CheckoutLanguageCodeUpdatedPayload = Readonly<{
  localeCode: string;
}>;

export type CheckoutLanguageCodeUpdated = CreateEventType<
  typeof CheckoutEventTypes.CheckoutLanguageCodeUpdated,
  CheckoutLanguageCodeUpdatedPayload,
  CheckoutCommandMetadata
>;

export type CheckoutCurrencyCodeUpdatedPayload = Readonly<{
  currencyCode: string;
}>;

export type CheckoutCurrencyCodeUpdated = CreateEventType<
  typeof CheckoutEventTypes.CheckoutCurrencyCodeUpdated,
  CheckoutCurrencyCodeUpdatedPayload,
  CheckoutCommandMetadata
>;

export type CheckoutDeliveryAddress = Readonly<{
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

// Removed: CheckoutDeliveryMethodUpdated (use group-level method update)

export type CheckoutPromoCodeAddedPayload = Readonly<{
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
  appliedDiscounts: Array<AppliedDiscountSnapshot>;
}>;

export type CheckoutPromoCodeAdded = CreateEventType<
  typeof CheckoutEventTypes.CheckoutPromoCodeAdded,
  CheckoutPromoCodeAddedPayload,
  CheckoutCommandMetadata
>;

export type CheckoutPromoCodeRemovedPayload = Readonly<{
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
  appliedDiscounts: Array<AppliedDiscountSnapshot>;
}>;

export type CheckoutPromoCodeRemoved = CreateEventType<
  typeof CheckoutEventTypes.CheckoutPromoCodeRemoved,
  CheckoutPromoCodeRemovedPayload,
  CheckoutCommandMetadata
>;

// Delivery Groups events
// Deprecated in v3: delivery groups are embedded into CheckoutLinesAdded

export type CheckoutDeliveryGroupAddressUpdatedPayload = Readonly<{
  deliveryGroupId: string;
  address: {
    id: string;
    address1: string;
    address2?: string | null;
    city: string;
    countryCode: string;
    provinceCode?: string | null;
    postalCode?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    data?: any;
  };
}>;

export type CheckoutDeliveryGroupAddressUpdated = CreateEventType<
  typeof CheckoutEventTypes.CheckoutDeliveryGroupAddressUpdated,
  CheckoutDeliveryGroupAddressUpdatedPayload,
  CheckoutCommandMetadata
>;

export type CheckoutDeliveryGroupAddressClearedPayload = Readonly<{
  deliveryGroupId: string;
  addressId: string;
}>;

export type CheckoutDeliveryGroupAddressCleared = CreateEventType<
  typeof CheckoutEventTypes.CheckoutDeliveryGroupAddressCleared,
  CheckoutDeliveryGroupAddressClearedPayload,
  CheckoutCommandMetadata
>;

export type CheckoutDeliveryGroupMethodUpdatedPayload = Readonly<{
  deliveryGroupId: string;
  deliveryMethod: {
    code: string;
    provider: string;
    deliveryMethodType: DeliveryMethodType;
    shippingPaymentModel: ShippingPaymentModel;
    estimatedDeliveryDays?: number | null;
    shippingCost?: {
      amount: Money;
      paymentModel: ShippingPaymentModel;
    } | null;
  };
  // Updated totals when shipping cost changes
  shippingTotal?: bigint | null; // Only MERCHANT_COLLECTED costs
}>;

export type CheckoutDeliveryGroupMethodUpdated = CreateEventType<
  typeof CheckoutEventTypes.CheckoutDeliveryGroupMethodUpdated,
  CheckoutDeliveryGroupMethodUpdatedPayload,
  CheckoutCommandMetadata
>;

export type CheckoutDeliveryGroupRemovedPayload = Readonly<{
  deliveryGroupId: string;
  // Updated totals after group removal
  shippingTotal?: bigint | null;
}>;

export type CheckoutDeliveryGroupRemoved = CreateEventType<
  typeof CheckoutEventTypes.CheckoutDeliveryGroupRemoved,
  CheckoutDeliveryGroupRemovedPayload,
  CheckoutCommandMetadata
>;

export type CheckoutEvent =
  | CheckoutCreated
  | CheckoutLinesAdded
  | CheckoutLinesUpdated
  | CheckoutLinesDeleted
  | CheckoutLinesCleared
  | CheckoutCustomerIdentityUpdated
  | CheckoutCustomerNoteUpdated
  | CheckoutLanguageCodeUpdated
  | CheckoutCurrencyCodeUpdated
  | CheckoutPromoCodeAdded
  | CheckoutPromoCodeRemoved
  | CheckoutDeliveryGroupAddressUpdated
  | CheckoutDeliveryGroupAddressCleared
  | CheckoutDeliveryGroupMethodUpdated
  | CheckoutDeliveryGroupRemoved;

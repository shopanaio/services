import { CheckoutCommandMetadata } from "@src/domain/checkout/commands";
import { Money } from "@shopana/shared-money";
import { DiscountCondition, DiscountType } from "@shopana/pricing-plugin-sdk";
import {
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/shipping-plugin-sdk";
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

export type CheckoutCreatedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutCreated;
  data: CheckoutCreatedPayload;
  metadata: CheckoutCommandMetadata;
}>;

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

export type CheckoutLinesAddedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutLinesAdded;
  data: CheckoutLinesAddedPayload;
  metadata: CheckoutCommandMetadata;
}>;

export type CheckoutLinesUpdatedPayload = Readonly<{
  /** All lines in the checkout after update */
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
}>;

export type CheckoutLinesUpdatedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutLinesUpdated;
  data: CheckoutLinesUpdatedPayload;
  metadata: CheckoutCommandMetadata;
}>;

export type CheckoutLinesDeletedPayload = Readonly<{
  /** All remaining lines in the checkout after deletion */
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
}>;

export type CheckoutLinesDeletedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutLinesDeleted;
  data: CheckoutLinesDeletedPayload;
  metadata: CheckoutCommandMetadata;
}>;

export type CheckoutLinesClearedPayload = Readonly<{
  /** Empty lines after clearing */
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
}>;

export type CheckoutLinesClearedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutLinesCleared;
  data: CheckoutLinesClearedPayload;
  metadata: CheckoutCommandMetadata;
}>;

// New events for extended functionality
export type CheckoutCustomerIdentityUpdatedPayload = Readonly<{
  email?: string | null;
  customerId?: string | null;
  phone?: string | null;
  countryCode?: string | null;
}>;

export type CheckoutCustomerIdentityUpdatedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutCustomerIdentityUpdated;
  data: CheckoutCustomerIdentityUpdatedPayload;
  metadata: CheckoutCommandMetadata;
}>;

export type CheckoutCustomerNoteUpdatedPayload = Readonly<{
  note: string | null;
}>;

export type CheckoutCustomerNoteUpdatedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutCustomerNoteUpdated;
  data: CheckoutCustomerNoteUpdatedPayload;
  metadata: CheckoutCommandMetadata;
}>;

export type CheckoutLanguageCodeUpdatedPayload = Readonly<{
  localeCode: string;
}>;

export type CheckoutLanguageCodeUpdatedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutLanguageCodeUpdated;
  data: CheckoutLanguageCodeUpdatedPayload;
  metadata: CheckoutCommandMetadata;
}>;

export type CheckoutCurrencyCodeUpdatedPayload = Readonly<{
  currencyCode: string;
}>;

export type CheckoutCurrencyCodeUpdatedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutCurrencyCodeUpdated;
  data: CheckoutCurrencyCodeUpdatedPayload;
  metadata: CheckoutCommandMetadata;
}>;

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

export type CheckoutPromoCodeAddedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutPromoCodeAdded;
  data: CheckoutPromoCodeAddedPayload;
  metadata: CheckoutCommandMetadata;
}>;

export type CheckoutPromoCodeRemovedPayload = Readonly<{
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
  appliedDiscounts: Array<AppliedDiscountSnapshot>;
}>;

export type CheckoutPromoCodeRemovedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutPromoCodeRemoved;
  data: CheckoutPromoCodeRemovedPayload;
  metadata: CheckoutCommandMetadata;
}>;

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

export type CheckoutDeliveryGroupAddressUpdatedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutDeliveryGroupAddressUpdated;
  data: CheckoutDeliveryGroupAddressUpdatedPayload;
  metadata: CheckoutCommandMetadata;
}>;

export type CheckoutDeliveryGroupAddressClearedPayload = Readonly<{
  deliveryGroupId: string;
  addressId: string;
}>;

export type CheckoutDeliveryGroupAddressClearedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutDeliveryGroupAddressCleared;
  data: CheckoutDeliveryGroupAddressClearedPayload;
  metadata: CheckoutCommandMetadata;
}>;

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

export type CheckoutDeliveryGroupMethodUpdatedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutDeliveryGroupMethodUpdated;
  data: CheckoutDeliveryGroupMethodUpdatedPayload;
  metadata: CheckoutCommandMetadata;
}>;

export type CheckoutDeliveryGroupRemovedPayload = Readonly<{
  deliveryGroupId: string;
  // Updated totals after group removal
  shippingTotal?: bigint | null;
}>;

export type CheckoutDeliveryGroupRemovedDto = Readonly<{
  type: typeof CheckoutEventTypes.CheckoutDeliveryGroupRemoved;
  data: CheckoutDeliveryGroupRemovedPayload;
  metadata: CheckoutCommandMetadata;
}>;

export type CheckoutDto =
  | CheckoutCreatedDto
  | CheckoutLinesAddedDto
  | CheckoutLinesUpdatedDto
  | CheckoutLinesDeletedDto
  | CheckoutLinesClearedDto
  | CheckoutCustomerIdentityUpdatedDto
  | CheckoutCustomerNoteUpdatedDto
  | CheckoutLanguageCodeUpdatedDto
  | CheckoutCurrencyCodeUpdatedDto
  | CheckoutPromoCodeAddedDto
  | CheckoutPromoCodeRemovedDto
  | CheckoutDeliveryGroupAddressUpdatedDto
  | CheckoutDeliveryGroupAddressClearedDto
  | CheckoutDeliveryGroupMethodUpdatedDto
  | CheckoutDeliveryGroupRemovedDto;

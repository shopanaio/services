import { Money } from "@shopana/shared-money";
import {
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/plugin-sdk/shipping";
import type {
  CheckoutLineCostSnapshot,
  CheckoutTotalsSnapshot,
} from "@src/domain/checkout/cost";
import { AppliedDiscountSnapshot } from "@src/domain/checkout/discount";
import { PaymentFlow } from "@shopana/plugin-sdk/payment";
import { ChildPriceType } from "./types";

type CheckoutMetadataDto = {
  apiKey: string;
  aggregateId: string;
  contractVersion: number;
  projectId: string;
  userId?: string;
  now: Date;
};

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
  paymentMethods: Array<{
    code: string;
    provider: string;
    flow: PaymentFlow;
    metadata: Record<string, unknown> | null;
    constraints: Record<string, unknown> | null;
    customerInput?: Record<string, unknown> | null;
  }>;
  tags: Array<{
    id: string;
    slug: string;
    isUnique: boolean;
  }>;
}>;

export type CheckoutCreatedDto = Readonly<{
  data: CheckoutCreatedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutUnit = Readonly<{
  id: string;
  price: Money;
  /** Original price before any adjustments */
  originalPrice: Money;
  compareAtPrice: Money | null;
  title: string;
  imageUrl: string | null;
  sku: string | null;
  snapshot: Record<string, unknown> | null;
}>;

export type CheckoutLinesAddedLine = Readonly<{
  lineId: string;
  /** Parent line ID for child items (null for parent/standalone items) */
  parentLineId: string | null;
  /** Price adjustment type for child items */
  priceType: ChildPriceType | null;
  /** Amount in minor units for DISCOUNT_AMOUNT, MARKUP_AMOUNT, OVERRIDE (always positive) */
  priceAmount: number | null;
  /** Percentage for DISCOUNT_PERCENT, MARKUP_PERCENT (always positive) */
  pricePercent: number | null;
  quantity: number;
  tagId: string | null;
  unit: CheckoutUnit;
}>;

export type CheckoutLinesAddedPayload = Readonly<{
  /** All lines in the checkout */
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
}>;

export type CheckoutLinesAddedDto = Readonly<{
  data: CheckoutLinesAddedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutLinesUpdatedPayload = Readonly<{
  /** All lines in the checkout after update */
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
}>;

export type CheckoutLinesUpdatedDto = Readonly<{
  data: CheckoutLinesUpdatedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutLinesDeletedPayload = Readonly<{
  /** All remaining lines in the checkout after deletion */
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
}>;

export type CheckoutLinesDeletedDto = Readonly<{
  data: CheckoutLinesDeletedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutLinesClearedPayload = Readonly<{
  /** Empty lines after clearing */
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
}>;

export type CheckoutLinesClearedDto = Readonly<{
  data: CheckoutLinesClearedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutTagCreatedPayload = Readonly<{
  tag: {
    id: string;
    slug: string;
    isUnique: boolean;
  };
}>;

export type CheckoutTagCreatedDto = Readonly<{
  data: CheckoutTagCreatedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutTagUpdatedPayload = Readonly<{
  tagId: string;
  slug?: string;
  isUnique?: boolean;
}>;

export type CheckoutTagUpdatedDto = Readonly<{
  data: CheckoutTagUpdatedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutTagDeletedPayload = Readonly<{
  tagId: string;
}>;

export type CheckoutTagDeletedDto = Readonly<{
  data: CheckoutTagDeletedPayload;
  metadata: CheckoutMetadataDto;
}>;

// New events for extended functionality
export type CheckoutCustomerIdentityUpdatedPayload = Readonly<{
  email?: string | null;
  customerId?: string | null;
  phone?: string | null;
  countryCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
}>;

export type CheckoutCustomerIdentityUpdatedDto = Readonly<{
  data: CheckoutCustomerIdentityUpdatedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutCustomerNoteUpdatedPayload = Readonly<{
  note: string | null;
}>;

export type CheckoutCustomerNoteUpdatedDto = Readonly<{
  data: CheckoutCustomerNoteUpdatedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutLanguageCodeUpdatedPayload = Readonly<{
  localeCode: string;
}>;

export type CheckoutLanguageCodeUpdatedDto = Readonly<{
  data: CheckoutLanguageCodeUpdatedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutCurrencyCodeUpdatedPayload = Readonly<{
  currencyCode: string;
}>;

export type CheckoutCurrencyCodeUpdatedDto = Readonly<{
  data: CheckoutCurrencyCodeUpdatedPayload;
  metadata: CheckoutMetadataDto;
}>;

import type { CheckoutDeliveryAddress } from "./types";

// Removed: CheckoutDeliveryMethodUpdated (use group-level method update)

export type CheckoutPromoCodeAddedPayload = Readonly<{
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
  appliedDiscounts: Array<AppliedDiscountSnapshot>;
}>;

export type CheckoutPromoCodeAddedDto = Readonly<{
  data: CheckoutPromoCodeAddedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutPromoCodeRemovedPayload = Readonly<{
  checkoutLines: Array<CheckoutLinesAddedLine>;
  checkoutLinesCost: Record<string, CheckoutLineCostSnapshot>;
  checkoutCost: CheckoutTotalsSnapshot;
  appliedDiscounts: Array<AppliedDiscountSnapshot>;
}>;

export type CheckoutPromoCodeRemovedDto = Readonly<{
  data: CheckoutPromoCodeRemovedPayload;
  metadata: CheckoutMetadataDto;
}>;

// Delivery Groups events
// Deprecated in v3: delivery groups are embedded into CheckoutLinesAdded

export type CheckoutDeliveryGroupAddressUpdatedPayload = Readonly<{
  deliveryGroupId: string;
  address: {
    id: string;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    countryCode?: string | null;
    provinceCode?: string | null;
    postalCode?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    middleName?: string | null;
    email?: string | null;
    phone?: string | null;
    data?: any;
  };
}>;

export type CheckoutDeliveryGroupAddressUpdatedDto = Readonly<{
  data: CheckoutDeliveryGroupAddressUpdatedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutDeliveryGroupAddressClearedPayload = Readonly<{
  deliveryGroupId: string;
  addressId: string;
}>;

export type CheckoutDeliveryGroupAddressClearedDto = Readonly<{
  data: CheckoutDeliveryGroupAddressClearedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutDeliveryGroupMethodUpdatedPayload = Readonly<{
  deliveryGroupId: string;
  deliveryMethod: {
    code: string;
    provider: string;
    deliveryMethodType: DeliveryMethodType;
    shippingPaymentModel: ShippingPaymentModel;
    customerInput?: Record<string, unknown> | null;
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
  data: CheckoutDeliveryGroupMethodUpdatedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutDeliveryGroupRemovedPayload = Readonly<{
  deliveryGroupId: string;
  // Updated totals after group removal
  shippingTotal?: bigint | null;
}>;

export type CheckoutDeliveryGroupRemovedDto = Readonly<{
  data: CheckoutDeliveryGroupRemovedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutPaymentMethodUpdatedPayload = Readonly<{
  paymentMethod: {
    code: string;
    provider: string;
    flow: PaymentFlow;
    metadata: Record<string, unknown> | null;
    constraints?: Record<string, unknown> | null;
    customerInput?: Record<string, unknown> | null;
  };
  payableAmount: Money;
}>;

export type CheckoutPaymentMethodUpdatedDto = Readonly<{
  data: CheckoutPaymentMethodUpdatedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutDeliveryGroupRecipientUpdatedPayload = Readonly<{
  deliveryGroupId: string;
  recipient: {
    firstName?: string | null;
    lastName?: string | null;
    middleName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
}>;

export type CheckoutDeliveryGroupRecipientUpdatedDto = Readonly<{
  data: CheckoutDeliveryGroupRecipientUpdatedPayload;
  metadata: CheckoutMetadataDto;
}>;

export type CheckoutDeliveryGroupRecipientClearedPayload = Readonly<{
  deliveryGroupId: string;
}>;

export type CheckoutDeliveryGroupRecipientClearedDto = Readonly<{
  data: CheckoutDeliveryGroupRecipientClearedPayload;
  metadata: CheckoutMetadataDto;
}>;

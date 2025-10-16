import type { CheckoutContext } from "@src/context/index.js";

export type { CheckoutContext };

export type CreateCheckoutInput = {
  currencyCode: string;
  idempotencyKey: string; // computed from request hash on server
  salesChannel?: string | null;
  externalSource?: string | null;
  externalId?: string | null;
  localeCode?: string | null;
} & CheckoutContext;

export type CheckoutLinesAddInput = {
  checkoutId: string;
  lines: Array<{
    purchasableId: string;
    quantity: number;
    purchasableSnapshot: {
      title: string;
      imageUrl?: string | null;
      sku?: string | null;
      data?: Record<string, unknown>;
    } | null;
  }>;
} & CheckoutContext;

export type CheckoutLinesUpdateInput = {
  checkoutId: string;
  lines: Array<{
    lineId: string;
    quantity: number; // 0 = remove
  }>;
} & CheckoutContext;

export type CheckoutLinesDeleteInput = {
  checkoutId: string;
  lineIds: string[];
} & CheckoutContext;

export type CheckoutLinesClearInput = {
  checkoutId: string;
} & CheckoutContext;

export type CheckoutLinesReplaceInput = {
  checkoutId: string;
  lines: Array<{
    lineId: string; // source line id
    purchasableId: string; // target purchasable id
    quantity?: number; // if not provided, move full quantity from source line
  }>;
} & CheckoutContext;

// New types for extended functionality
export type CheckoutCustomerIdentityUpdateInput = {
  checkoutId: string;
  email?: string | null;
  customerId?: string | null;
  phone?: string | null;
  countryCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
} & CheckoutContext;

export type CheckoutCustomerNoteUpdateInput = {
  checkoutId: string;
  note?: string | null;
} & CheckoutContext;

export type CheckoutLanguageCodeUpdateInput = {
  checkoutId: string;
  localeCode: string;
} & CheckoutContext;

export type CheckoutCurrencyCodeUpdateInput = {
  checkoutId: string;
  currencyCode: string;
} & CheckoutContext;

export type CheckoutDeliveryMethodUpdateInput = {
  checkoutId: string;
  shippingMethodCode: string;
  provider: string;
  deliveryGroupId: string;
  data?: Record<string, unknown>;
} & CheckoutContext;

export type CheckoutPaymentMethodUpdateInput = {
  checkoutId: string;
  paymentMethodCode: string;
  provider: string;
  data?: Record<string, unknown>;
} & CheckoutContext;

export type CheckoutDeliveryAddressAddInput = {
  checkoutId: string;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  countryCode?: string | null;
  provinceCode?: string | null;
  postalCode?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  data?: any;
} & CheckoutContext;

export type CheckoutDeliveryGroupAddressUpdateInput = {
  checkoutId: string;
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
} & CheckoutContext;

export type CheckoutDeliveryAddressUpdateInput = {
  checkoutId: string;
  addressId: string;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  countryCode?: string | null;
  provinceCode?: string | null;
  postalCode?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  data?: any;
} & CheckoutContext;

export type CheckoutDeliveryAddressRemoveInput = {
  checkoutId: string;
  addressId: string;
} & CheckoutContext;

export type CheckoutPromoCodeAddInput = {
  checkoutId: string;
  code: string;
} & CheckoutContext;

export type CheckoutPromoCodeRemoveInput = {
  checkoutId: string;
  code: string;
} & CheckoutContext;

export type CheckoutDeliveryGroupRecipientUpdateInput = {
  checkoutId: string;
  deliveryGroupId: string;
  recipient: {
    firstName?: string | null;
    lastName?: string | null;
    middleName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
} & CheckoutContext;

export type CheckoutDeliveryGroupRecipientRemoveInput = {
  checkoutId: string;
  deliveryGroupId: string;
} & CheckoutContext;

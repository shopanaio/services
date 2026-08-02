import type { CheckoutContext } from "@src/context/index.js";
import type { CheckoutPipelineJsonObject } from "../pipeline/contracts/index.js";

export type { CheckoutContext };

export type CreateCheckoutInput = {
  currencyCode: string;
  idempotencyKey: string;
  channelCode: string;
  externalSource?: string | null;
  externalId?: string | null;
  localeCode?: string | null;
  tags?: CheckoutTagInput[];
  items: CheckoutLineCreateCommand[];
} & CheckoutContext;

export type CheckoutLinePurchase =
  | { type: "ONE_TIME"; sellingPlanId: null }
  | { type: "SUBSCRIPTION"; sellingPlanId: string };

export type CheckoutLineCommand = {
  lineId: string;
  variantId: string;
  quantity: number;
  purchase: CheckoutLinePurchase;
  attributes: CheckoutPipelineJsonObject;
  tagSlug?: string | null;
  children?: CheckoutChildLineInput[] | null;
};

export type CheckoutLineCreateCommand = Omit<
  CheckoutLineCommand,
  "lineId" | "children"
> & {
  children?: Array<Omit<CheckoutChildLineInput, "lineId">> | null;
};

export type CheckoutTagInput = {
  slug: string;
  isUnique: boolean;
};

/**
 * Input for a child item in a bundle.
 * Price configuration is automatically taken from ProductGroup in the database.
 * The purchasableId must be a variant that exists in parent product's groups.
 */
export type CheckoutChildLineInput = {
  lineId: string;
  componentItemId: string;
  variantId: string;
  quantity: number;
  purchase: CheckoutLinePurchase;
  attributes: CheckoutPipelineJsonObject;
};

export type CheckoutLinesAddInput = {
  checkoutId: string;
  lines: CheckoutLineCommand[];
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
    variantId: string;
    quantity?: number; // if not provided, move full quantity from source line
  }>;
} & CheckoutContext;

export type CheckoutTagCreateInput = {
  checkoutId: string;
  tag: CheckoutTagInput;
} & CheckoutContext;

export type CheckoutTagUpdateInput = {
  checkoutId: string;
  tagId: string;
  slug?: string;
  isUnique?: boolean;
} & CheckoutContext;

export type CheckoutTagDeleteInput = {
  checkoutId: string;
  tagId: string;
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
  deliveryGroupId: string;
  optionHandle: string;
  customerInput?: CheckoutPipelineJsonObject;
} & CheckoutContext;

export type CheckoutPaymentMethodUpdateInput = {
  checkoutId: string;
  methodHandle: string;
  customerInput?: CheckoutPipelineJsonObject;
} & CheckoutContext;

export type CheckoutDeliveryAddressAddInput = {
  checkoutId: string;
  addresses: CheckoutDeliveryAddressFields[];
} & CheckoutContext;

export type CheckoutDeliveryAddressFields = {
  id: string;
  checkoutLineIds: string[];
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
  data?: CheckoutPipelineJsonObject | null;
};

export type CheckoutDeliveryAddressUpdateInput = {
  checkoutId: string;
  updates: Array<{ addressId: string; address: Omit<CheckoutDeliveryAddressFields, "id" | "checkoutLineIds"> }>;
} & CheckoutContext;

export type CheckoutDeliveryAddressRemoveInput = {
  checkoutId: string;
  addressIds: string[];
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
  updates: Array<{ deliveryGroupId: string; recipient: {
    firstName?: string | null;
    lastName?: string | null;
    middleName?: string | null;
    email?: string | null;
    phone?: string | null;
  } }>;
} & CheckoutContext;

export type CheckoutDeliveryGroupRecipientRemoveInput = {
  checkoutId: string;
  deliveryGroupIds: string[];
} & CheckoutContext;

import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from "graphql";
import { GraphQLContext } from "./context.js";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  BigInt: { input: string; output: string };
  /** A CSS color represented as a hexadecimal string. */
  Color: { input: any; output: any };
  /** An opaque cursor used for pagination. */
  Cursor: { input: any; output: any };
  /** An ISO 8601-encoded date and time string. */
  DateTime: { input: any; output: any };
  /** An arbitrary-precision signed decimal number. */
  Decimal: { input: any; output: any };
  /** An email address. */
  Email: { input: any; output: any };
  /** A string containing HTML code. */
  HTML: { input: any; output: any };
  /** An ISO 8601-encoded date and time string. */
  ISO8601DateTime: { input: any; output: any };
  /** A JSON-serializable value. */
  JSON: { input: unknown; output: unknown };
  /** An RFC 3986 and RFC 3987 compliant URI string. */
  URL: { input: any; output: any };
  /** An unsigned 64-bit integer serialized as a decimal string. */
  UnsignedInt64: { input: any; output: any };
};

/** A checkout with multiple items. */
export type ApiCheckout = ApiNode & {
  __typename?: "Checkout";
  /** Applied promo codes for the checkout. */
  appliedPromoCodes: Array<ApiCheckoutPromoCode>;
  /** Billing address used by payment providers and the resulting order. */
  billingAddress: Maybe<ApiCheckoutBillingAddress>;
  /** Canonical sales channel used by pricing and eligibility rules. */
  channelCode: Scalars["String"]["output"];
  /** All cost calculations for the checkout. */
  cost: ApiCheckoutCost;
  /** When this checkout was first created. */
  createdAt: Scalars["DateTime"]["output"];
  /** Display and settlement currency of this checkout snapshot. */
  currencyCode: ApiCurrencyCode;
  /** Customer identity associated with the checkout. */
  customerIdentity: ApiCheckoutCustomerIdentity;
  /** Customer note or special instructions for the checkout. */
  customerNote: Maybe<Scalars["String"]["output"]>;
  /** Delivery groups. */
  deliveryGroups: Array<ApiCheckoutDeliveryGroup>;
  /** Deadline after which an OPEN or READY checkout becomes EXPIRED. */
  expiresAt: Scalars["DateTime"]["output"];
  /** A globally-unique ID. */
  id: Scalars["ID"]["output"];
  /** Ordered issues emitted by the checkout pipeline. */
  issues: Array<ApiCheckoutIssue>;
  /**
   * Ordered root items in the checkout. Bundle components are exposed through
   * CheckoutLine.children.
   */
  lines: Array<ApiCheckoutLine>;
  /** Locale used by checkout calculation and customer-facing messages. */
  localeCode: ApiLocaleCode;
  /** Loyalty points selected as tender after the final Pricing quote. */
  loyaltyRedemption: Maybe<ApiCheckoutLoyaltyRedemption>;
  /** Reward entitlement selected and validated for this checkout. */
  loyaltyRewardEntitlementId: Maybe<Scalars["ID"]["output"]>;
  /** Notifications for the user regarding the checkout. */
  notifications: Array<ApiCheckoutNotification>;
  /** Payment aggregate for this checkout. */
  payment: ApiCheckoutPayment;
  /** Lifecycle state persisted by checkout, not inferred by the client. */
  status: ApiCheckoutLifecycleStatus;
  /** Tags that can be used to organize checkout lines. */
  tags: Array<ApiCheckoutTag>;
  /** Quantity of the item being purchased. */
  totalQuantity: Scalars["Int"]["output"];
  /** When this checkout was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
  /** Whether the committed checkout is ready according to validation. */
  valid: Scalars["Boolean"]["output"];
};

/**
 * A normalized international billing address captured independently from
 * delivery destinations. Payment-provider-specific fields belong to data.
 */
export type ApiCheckoutBillingAddress = {
  __typename?: "CheckoutBillingAddress";
  address1: Maybe<Scalars["String"]["output"]>;
  address2: Maybe<Scalars["String"]["output"]>;
  city: Maybe<Scalars["String"]["output"]>;
  company: Maybe<Scalars["String"]["output"]>;
  country: Maybe<Scalars["String"]["output"]>;
  countryCode: Maybe<ApiCountryCode>;
  /** Payment-provider-specific billing-address extension data. */
  data: Maybe<Scalars["JSON"]["output"]>;
  firstName: Maybe<Scalars["String"]["output"]>;
  formatted: Array<Scalars["String"]["output"]>;
  formattedArea: Maybe<Scalars["String"]["output"]>;
  lastName: Maybe<Scalars["String"]["output"]>;
  name: Scalars["String"]["output"];
  phone: Maybe<Scalars["String"]["output"]>;
  province: Maybe<Scalars["String"]["output"]>;
  provinceCode: Maybe<Scalars["String"]["output"]>;
  zip: Maybe<Scalars["String"]["output"]>;
};

/**
 * Portable international postal fields for a checkout billing address.
 * Payment-provider-specific fields belong to data.
 */
export type ApiCheckoutBillingAddressInput = {
  address1: InputMaybe<Scalars["String"]["input"]>;
  address2: InputMaybe<Scalars["String"]["input"]>;
  city: InputMaybe<Scalars["String"]["input"]>;
  company: InputMaybe<Scalars["String"]["input"]>;
  countryCode: InputMaybe<ApiCountryCode>;
  /** Payment-provider-specific billing-address extension data. */
  data: InputMaybe<Scalars["JSON"]["input"]>;
  firstName: InputMaybe<Scalars["String"]["input"]>;
  lastName: InputMaybe<Scalars["String"]["input"]>;
  phone: InputMaybe<Scalars["String"]["input"]>;
  provinceCode: InputMaybe<Scalars["String"]["input"]>;
  zip: InputMaybe<Scalars["String"]["input"]>;
};

/** Input for replacing or clearing the checkout billing address. */
export type ApiCheckoutBillingAddressUpdateInput = {
  /** New address. Passing null clears the current billing address. */
  billingAddress: InputMaybe<ApiCheckoutBillingAddressInput>;
  checkoutId: Scalars["ID"]["input"];
};

/**
 * Input data for a child item in a bundle.
 * Price configuration is automatically taken from ProductGroup in the database.
 */
export type ApiCheckoutChildLineInput = {
  /** Checkout-owned attributes passed to the pipeline. */
  attributes: InputMaybe<Scalars["JSON"]["input"]>;
  /** ID of the exact component item selected in the parent configuration. */
  componentItemId: Scalars["ID"]["input"];
  /**
   * ID of the purchasable for child item.
   * Must be a variant that exists in parent product's groups.
   */
  purchasableId: Scalars["ID"]["input"];
  /** Purchase intent for the child variant. */
  purchase: InputMaybe<ApiCheckoutLinePurchaseInput>;
  /** Quantity of the child item. */
  quantity: Scalars["Int"]["input"];
};

/** All monetary calculations related to the checkout. */
export type ApiCheckoutCost = {
  __typename?: "CheckoutCost";
  /** Total value of items before any discounts. */
  subtotalAmount: ApiMoney;
  /** Final amount to be paid, including item cost, shipping, and taxes. */
  totalAmount: ApiMoney;
  /** Total reduction from promotions and an applied loyalty redemption. */
  totalDiscountAmount: ApiMoney;
  /** Total shipping cost (only MERCHANT_COLLECTED payments). */
  totalShippingAmount: ApiMoney;
  /** Total tax amount applied to the checkout. */
  totalTaxAmount: ApiMoney;
};

/** Input data for creating a new checkout. */
export type ApiCheckoutCreateInput = {
  /** Canonical sales channel used by pricing and eligibility rules. */
  channelCode: Scalars["String"]["input"];
  /** Display currency code for all items. ISO 4217 (3 letters, e.g., "USD", "EUR") */
  currencyCode: ApiCurrencyCode;
  /** ID of the external source for the checkout. */
  externalId: InputMaybe<Scalars["String"]["input"]>;
  /** Source of sales for the checkout. */
  externalSource: InputMaybe<Scalars["String"]["input"]>;
  /** Initial items to add to the new checkout. */
  items: Array<ApiCheckoutLineAddInput>;
  /** Locale code for the checkout. ISO 639-1 (2 letters, e.g., "en", "ru") */
  localeCode: ApiLocaleCode;
  /** Optional tag definitions to initialize for this checkout. */
  tags: InputMaybe<Array<ApiCheckoutTagInput>>;
};

/** Input data for updating the display currency of the checkout. */
export type ApiCheckoutCurrencyCodeUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars["ID"]["input"];
  /** Currency code according to ISO 4217 (e.g., "USD", "EUR"). */
  currencyCode: ApiCurrencyCode;
};

export type ApiCheckoutCustomerIdentity = {
  __typename?: "CheckoutCustomerIdentity";
  /** Country code of the customer. */
  countryCode: Maybe<ApiCountryCode>;
  /** Customer associated with the checkout. */
  customer: Maybe<ApiCustomer>;
  /** Customer email address associated with the checkout. */
  email: Maybe<Scalars["Email"]["output"]>;
  /** First name of the customer. */
  firstName: Maybe<Scalars["String"]["output"]>;
  /** Last name of the customer. */
  lastName: Maybe<Scalars["String"]["output"]>;
  /** Middle name of the customer. */
  middleName: Maybe<Scalars["String"]["output"]>;
  /** Phone number of the customer. */
  phone: Maybe<Scalars["String"]["output"]>;
};

/** Input data for updating customer identification data associated with the checkout. */
export type ApiCheckoutCustomerIdentityUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars["ID"]["input"];
  /**
   * Country code of the customer.
   * ISO 3166-1 alpha-2.
   */
  countryCode: InputMaybe<ApiCountryCode>;
  /** Customer's email address. If specified, will be linked to the checkout. */
  email: InputMaybe<Scalars["Email"]["input"]>;
  /** First name of the customer. */
  firstName: InputMaybe<Scalars["String"]["input"]>;
  /** Last name of the customer. */
  lastName: InputMaybe<Scalars["String"]["input"]>;
  /** Middle name of the customer. */
  middleName: InputMaybe<Scalars["String"]["input"]>;
  /** Phone number of the customer. */
  phone: InputMaybe<Scalars["String"]["input"]>;
};

/** Input data for updating the customer note attached to the checkout. */
export type ApiCheckoutCustomerNoteUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars["ID"]["input"];
  /**
   * Text of the customer note (delivery instructions, etc.).
   * Empty value clears the note.
   */
  note: InputMaybe<Scalars["String"]["input"]>;
};

/** A normalized international delivery address associated with a checkout. */
export type ApiCheckoutDeliveryAddress = {
  __typename?: "CheckoutDeliveryAddress";
  /** Primary address line. */
  address1: Maybe<Scalars["String"]["output"]>;
  /** Secondary address line. */
  address2: Maybe<Scalars["String"]["output"]>;
  /** City name. */
  city: Maybe<Scalars["String"]["output"]>;
  /** Company or organization receiving the delivery. */
  company: Maybe<Scalars["String"]["output"]>;
  /** Localized country or territory name. */
  country: Maybe<Scalars["String"]["output"]>;
  /** Country code (ISO 3166-1 alpha-2). */
  countryCode: Maybe<ApiCountryCode>;
  /** Carrier-specific address extension data. */
  data: Maybe<Scalars["JSON"]["output"]>;
  /** Recipient first name captured with this destination. */
  firstName: Maybe<Scalars["String"]["output"]>;
  /** Address lines formatted for the active storefront locale. */
  formatted: Array<Scalars["String"]["output"]>;
  /** Compact city, region, and country representation. */
  formattedArea: Maybe<Scalars["String"]["output"]>;
  /** Unique identifier for the delivery address. */
  id: Maybe<Scalars["ID"]["output"]>;
  /** Recipient last name captured with this destination. */
  lastName: Maybe<Scalars["String"]["output"]>;
  /** Recipient name formatted for the active storefront locale. */
  name: Scalars["String"]["output"];
  /** Contact phone captured with this destination. */
  phone: Maybe<Scalars["String"]["output"]>;
  /** Localized region, state, or province name. */
  province: Maybe<Scalars["String"]["output"]>;
  /** Province code. */
  provinceCode: Maybe<Scalars["String"]["output"]>;
  /** Postal or ZIP code. */
  zip: Maybe<Scalars["String"]["output"]>;
};

/**
 * Portable international postal fields for a checkout delivery address.
 *
 * Carrier-specific fields such as a Nova Poshta settlement, warehouse, or branch
 * identifier belong to data and are validated by the selected delivery option's
 * customerInputContract.
 */
export type ApiCheckoutDeliveryAddressInput = {
  /** Primary address line. */
  address1: InputMaybe<Scalars["String"]["input"]>;
  /** Secondary address line. */
  address2: InputMaybe<Scalars["String"]["input"]>;
  /** City name. */
  city: InputMaybe<Scalars["String"]["input"]>;
  /** Company or organization receiving the delivery. */
  company: InputMaybe<Scalars["String"]["input"]>;
  /** Country code (ISO 3166-1 alpha-2). */
  countryCode: InputMaybe<ApiCountryCode>;
  /**
   * Carrier-specific address extension data. The shape is defined by the
   * selected delivery option's customerInputContract.
   */
  data: InputMaybe<Scalars["JSON"]["input"]>;
  /** Recipient's first name. */
  firstName: InputMaybe<Scalars["String"]["input"]>;
  /** Recipient's last name. */
  lastName: InputMaybe<Scalars["String"]["input"]>;
  /** Phone number for delivery. */
  phone: InputMaybe<Scalars["String"]["input"]>;
  /** Province code. */
  provinceCode: InputMaybe<Scalars["String"]["input"]>;
  /** Postal or ZIP code. */
  zip: InputMaybe<Scalars["String"]["input"]>;
};

/** Delivery address update element: which address to update and with what data. */
export type ApiCheckoutDeliveryAddressUpdateInput = {
  /** New postal address values. */
  address: ApiCheckoutDeliveryAddressInput;
  /** Identifier of the existing delivery address in the checkout. */
  addressId: Scalars["ID"]["input"];
};

/**
 * Input data for adding one or more delivery addresses to the checkout.
 * Supports multi-shipping.
 */
export type ApiCheckoutDeliveryAddressesAddInput = {
  /** List of delivery addresses to be added. */
  addresses: Array<ApiCheckoutDeliveryDestinationInput>;
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars["ID"]["input"];
};

/** Input data for removing one or more delivery addresses from the checkout. */
export type ApiCheckoutDeliveryAddressesRemoveInput = {
  /** Identifiers of delivery addresses to be removed. */
  addressIds: Array<Scalars["ID"]["input"]>;
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars["ID"]["input"];
};

/** Input data for batch updating previously added delivery addresses. */
export type ApiCheckoutDeliveryAddressesUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars["ID"]["input"];
  /** List of updates for delivery addresses. */
  updates: Array<ApiCheckoutDeliveryAddressUpdateInput>;
};

export type ApiCheckoutDeliveryDestinationInput = {
  address: ApiCheckoutDeliveryAddressInput;
  /** Checkout lines assigned to this destination. */
  checkoutLineIds: Array<Scalars["ID"]["input"]>;
};

/** Delivery group for one or more checkout lines. */
export type ApiCheckoutDeliveryGroup = {
  __typename?: "CheckoutDeliveryGroup";
  /** Checkout lines associated with the delivery group. */
  checkoutLines: Array<ApiCheckoutLine>;
  /** Delivery address associated with the delivery group. */
  deliveryAddress: Maybe<ApiCheckoutDeliveryAddress>;
  /** Unique identifier for the delivery group. */
  id: Scalars["ID"]["output"];
  options: Array<ApiCheckoutDeliveryOption>;
  /** Recipient associated with the delivery group. */
  recipient: Maybe<ApiCheckoutRecipient>;
  selection: ApiCheckoutDeliveryOptionSelection;
};

export enum ApiCheckoutDeliveryMethodType {
  Local = "LOCAL",
  None = "NONE",
  PickupPoint = "PICKUP_POINT",
  PickUp = "PICK_UP",
  Retail = "RETAIL",
  Shipping = "SHIPPING",
}

/**
 * Input data for selecting/changing delivery method.
 * Can be applied to the entire checkout or to a specific delivery address.
 */
export type ApiCheckoutDeliveryMethodUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars["ID"]["input"];
  /**
   * Arbitrary customer-provided data for the selected delivery method.
   * It remains private selection intent and is never returned by Storefront API.
   */
  customerInput: InputMaybe<Scalars["JSON"]["input"]>;
  /** Identifier of the delivery group for which the delivery method is selected. */
  deliveryGroupId: Scalars["ID"]["input"];
  /** Opaque handle returned by the current checkout snapshot. */
  optionHandle: Scalars["String"]["input"];
};

export type ApiCheckoutDeliveryOption = {
  __typename?: "CheckoutDeliveryOption";
  carrierCode: Maybe<Scalars["String"]["output"]>;
  code: Scalars["String"]["output"];
  cost: ApiMoney;
  customerInputContract: Maybe<Scalars["JSON"]["output"]>;
  deliveryMethodType: ApiCheckoutDeliveryMethodType;
  description: Maybe<Scalars["String"]["output"]>;
  estimatedMaxDeliveryAt: Maybe<Scalars["DateTime"]["output"]>;
  estimatedMinDeliveryAt: Maybe<Scalars["DateTime"]["output"]>;
  handle: Scalars["String"]["output"];
  phoneRequired: Scalars["Boolean"]["output"];
  publicData: Scalars["JSON"]["output"];
  title: Scalars["String"]["output"];
};

export type ApiCheckoutDeliveryOptionSelection = {
  __typename?: "CheckoutDeliveryOptionSelection";
  option: Maybe<ApiCheckoutDeliveryOption>;
  previousOptionHandle: Maybe<Scalars["String"]["output"]>;
  resetReason: Maybe<ApiCheckoutSelectionResetReason>;
  status: ApiCheckoutSelectionStatus;
};

/** Recipient update element: which delivery group's recipient to update and with what data. */
export type ApiCheckoutDeliveryRecipientUpdateInput = {
  /** Identifier of the delivery group in the checkout. */
  deliveryGroupId: Scalars["ID"]["input"];
  /** New recipient values. */
  recipient: ApiCheckoutRecipientInput;
};

/** Input data for adding recipients for delivery groups. */
export type ApiCheckoutDeliveryRecipientsAddInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars["ID"]["input"];
  /** List of recipients to be added for delivery groups. */
  recipients: Array<ApiCheckoutDeliveryRecipientUpdateInput>;
};

/** Input data for removing recipients associated with delivery groups. */
export type ApiCheckoutDeliveryRecipientsRemoveInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars["ID"]["input"];
  /** Identifiers of delivery groups whose recipients should be removed. */
  deliveryGroupIds: Array<Scalars["ID"]["input"]>;
};

/** Input data for batch updating recipients for delivery groups. */
export type ApiCheckoutDeliveryRecipientsUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars["ID"]["input"];
  /** List of updates for recipients. */
  updates: Array<ApiCheckoutDeliveryRecipientUpdateInput>;
};

export type ApiCheckoutIssue = {
  __typename?: "CheckoutIssue";
  code: Scalars["String"]["output"];
  effect: ApiCheckoutIssueEffect;
  field: Array<Scalars["String"]["output"]>;
  lineId: Maybe<Scalars["ID"]["output"]>;
  message: Scalars["String"]["output"];
  retryable: Scalars["Boolean"]["output"];
  severity: ApiCheckoutIssueSeverity;
};

export enum ApiCheckoutIssueEffect {
  Continue = "CONTINUE",
  Stop = "STOP",
}

export enum ApiCheckoutIssueSeverity {
  Error = "ERROR",
  Warning = "WARNING",
}

/** Input data for updating the language/locale code of the checkout. */
export type ApiCheckoutLanguageCodeUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars["ID"]["input"];
  /**
   * Language/locale code (ISO 639-1, BCP 47 if necessary), e.g. "en", "ru", "uk".
   * Affects localization and formatting.
   */
  localeCode: Scalars["String"]["input"];
};

export enum ApiCheckoutLifecycleStatus {
  Abandoned = "ABANDONED",
  Expired = "EXPIRED",
  Open = "OPEN",
  Placed = "PLACED",
  Ready = "READY",
}

/** A single item in a checkout. */
export type ApiCheckoutLine = ApiNode & {
  __typename?: "CheckoutLine";
  /** Customer-visible checkout attributes captured for this line. */
  attributes: Scalars["JSON"]["output"];
  /** A list of components that make up this checkout line, such as individual products in a bundle. */
  children: Array<ApiCheckoutLine>;
  /** Exact component item selected for this child line. Null for root lines. */
  componentItemId: Maybe<Scalars["ID"]["output"]>;
  /** Cost calculations for this checkout item. */
  cost: ApiCheckoutLineCost;
  /** Global unique identifier for the checkout line. */
  id: Scalars["ID"]["output"];
  /** Image of the purchasable resolved by the Media subgraph. */
  image: Maybe<ApiMediaImage>;
  /** Original price before any adjustments (e.g., child price config). */
  originalPrice: ApiMoney;
  /** Parent bundle line. Null for a root checkout line. */
  parent: Maybe<ApiCheckoutLine>;
  /** Price adjustment applied to this line (for child items in bundles). */
  priceConfig: Maybe<ApiCheckoutLinePriceConfig>;
  /** Federated catalog object represented by purchasableId. */
  purchasable: ApiPurchasable;
  /** ID of the purchasable. */
  purchasableId: Scalars["ID"]["output"];
  /** Purchase mode and selected selling plan captured for this line. */
  purchase: ApiCheckoutLinePurchase;
  /** Quantity of the item being purchased. */
  quantity: Scalars["Int"]["output"];
  /** SKU of the purchasable. */
  sku: Maybe<Scalars["String"]["output"]>;
  /** Optional tag assigned to this checkout line. */
  tag: Maybe<ApiCheckoutTag>;
  /** Title of the purchasable. */
  title: Scalars["String"]["output"];
};

/** Input data for a single item in the checkout. */
export type ApiCheckoutLineAddInput = {
  /** Checkout-owned attributes passed to the pipeline. */
  attributes: InputMaybe<Scalars["JSON"]["input"]>;
  /** Child items for this line. If provided, this line becomes a parent. */
  children: InputMaybe<Array<ApiCheckoutChildLineInput>>;
  /** ID of the product to add or update. */
  purchasableId: Scalars["ID"]["input"];
  /** Purchase intent for the variant. */
  purchase: InputMaybe<ApiCheckoutLinePurchaseInput>;
  /** Quantity of the product in the checkout. */
  quantity: Scalars["Int"]["input"];
  /** Optional tag slug to associate with this line. */
  tagSlug: InputMaybe<Scalars["String"]["input"]>;
};

/** Detailed breakdown of costs for a checkout line item */
export type ApiCheckoutLineCost = {
  __typename?: "CheckoutLineCost";
  /** The original list price per unit before any discounts. */
  compareAtUnitPrice: ApiMoney;
  /** Discount amount applied to a line. */
  discountAmount: ApiMoney;
  /** Total cost of all units before discounts. */
  subtotalAmount: ApiMoney;
  /** Total tax amount applied to the checkout line. */
  taxAmount: ApiMoney;
  /** Total cost of this line (all units), after discounts and taxes. */
  totalAmount: ApiMoney;
  /** The current price per unit before discounts are applied (may differ from compareAt price if on sale). */
  unitPrice: ApiMoney;
};

/** Price adjustment configuration applied to a child line item. */
export type ApiCheckoutLinePriceConfig = {
  __typename?: "CheckoutLinePriceConfig";
  /** Amount in minor units (always positive). Used for DISCOUNT_AMOUNT, MARKUP_AMOUNT, OVERRIDE. */
  amount: Maybe<Scalars["Int"]["output"]>;
  /** Percentage (always positive). Used for DISCOUNT_PERCENT, MARKUP_PERCENT. */
  percent: Maybe<Scalars["Float"]["output"]>;
  /** Type of price adjustment. */
  type: ApiChildPriceType;
};

/** Purchase mode captured in the committed checkout snapshot. */
export type ApiCheckoutLinePurchase = {
  __typename?: "CheckoutLinePurchase";
  type: ApiCheckoutLinePurchaseType;
};

export type ApiCheckoutLinePurchaseInput = {
  type: ApiCheckoutLinePurchaseType;
};

export enum ApiCheckoutLinePurchaseType {
  OneTime = "ONE_TIME",
}

/** Single replacement operation. */
export type ApiCheckoutLineReplaceInput = {
  /** Source line ID to replace (quantity will be moved from this line). */
  lineId: Scalars["ID"]["input"];
  /** Target purchasable ID to receive the quantity. */
  purchasableId: Scalars["ID"]["input"];
  /**
   * Quantity to move; if not set, moves full quantity from source line.
   * Must be greater than 0 if provided.
   */
  quantity: InputMaybe<Scalars["Int"]["input"]>;
};

/** Input data for updating the quantity of a specific checkout item. */
export type ApiCheckoutLineUpdateInput = {
  /** ID of the checkout item to update. */
  lineId: Scalars["ID"]["input"];
  /**
   * New quantity for the checkout item.
   * If set to 0, the item will be removed.
   */
  quantity: Scalars["Int"]["input"];
};

/** Input data for adding an item to an existing checkout. */
export type ApiCheckoutLinesAddInput = {
  /** ID of the checkout. */
  checkoutId: Scalars["ID"]["input"];
  /** List of checkout items to add. */
  lines: Array<ApiCheckoutLineAddInput>;
};

/** Input data for clearing all items from a checkout. */
export type ApiCheckoutLinesClearInput = {
  /** ID of the checkout to clear. */
  checkoutId: Scalars["ID"]["input"];
};

/** Input data for removing one or more items from the checkout. */
export type ApiCheckoutLinesDeleteInput = {
  /** ID of the checkout. */
  checkoutId: Scalars["ID"]["input"];
  /** IDs of the lines to remove. */
  lineIds: Array<Scalars["ID"]["input"]>;
};

/**
 * Input data for replacing one or more checkout lines.
 * Each replacement moves quantity from source line to target line.
 * If quantity is not provided, full quantity from the source line will be moved.
 */
export type ApiCheckoutLinesReplaceInput = {
  /** ID of the checkout. */
  checkoutId: Scalars["ID"]["input"];
  /** List of replacement operations to apply. */
  lines: Array<ApiCheckoutLineReplaceInput>;
};

/** Input data for updating the quantity of a specific checkout item. */
export type ApiCheckoutLinesUpdateInput = {
  /** ID of the checkout. */
  checkoutId: Scalars["ID"]["input"];
  /** List of checkout items to update. */
  lines: Array<ApiCheckoutLineUpdateInput>;
};

export type ApiCheckoutLoyaltyRedemption = {
  __typename?: "CheckoutLoyaltyRedemption";
  accountId: Scalars["ID"]["output"];
  availablePoints: Scalars["BigInt"]["output"];
  discount: ApiMoney;
  expiresAt: Scalars["DateTime"]["output"];
  payableAfterLoyalty: ApiMoney;
  programCode: Scalars["String"]["output"];
  programId: Scalars["ID"]["output"];
  programVersion: Scalars["Int"]["output"];
  quoteId: Scalars["String"]["output"];
  redeemablePoints: Scalars["BigInt"]["output"];
  requestedPoints: Maybe<Scalars["BigInt"]["output"]>;
  revision: Scalars["String"]["output"];
};

export type ApiCheckoutLoyaltyRedemptionRemoveInput = {
  checkoutId: Scalars["ID"]["input"];
};

export type ApiCheckoutLoyaltyRedemptionUpdateInput = {
  checkoutId: Scalars["ID"]["input"];
  programId: InputMaybe<Scalars["ID"]["input"]>;
  /** Whether points should be redeemed in addition to a selected reward. */
  redeemPoints: Scalars["Boolean"]["input"];
  requestedPoints: InputMaybe<Scalars["BigInt"]["input"]>;
  /** Issued loyalty reward entitlement to reserve for this checkout. */
  rewardEntitlementId: InputMaybe<Scalars["ID"]["input"]>;
};

/** Uniform result returned by every mutation that changes a checkout. */
export type ApiCheckoutMutationPayload = {
  __typename?: "CheckoutMutationPayload";
  /** The committed checkout snapshot, or null when the mutation failed. */
  checkout: Maybe<ApiCheckout>;
  /** Validation, concurrency, and business errors produced by the operation. */
  userErrors: Array<ApiCheckoutUserError>;
};

/** A non-blocking warning generated by checkout operations. */
export type ApiCheckoutNotification = {
  __typename?: "CheckoutNotification";
  /** Code categorizing the warning. */
  code: ApiCheckoutNotificationCode;
  /** A globally-unique ID. */
  id: Scalars["ID"]["output"];
  /** Whether the warning has been acknowledged by the user. */
  isDismissed: Scalars["Boolean"]["output"];
  /** Importance level of the warning. */
  severity: ApiNotificationSeverity;
};

/**
 * Codes for warnings that may be returned with Checkout mutations,
 * indicating non-blocking adjustments or issues in the checkout.
 */
export enum ApiCheckoutNotificationCode {
  /** An item in the checkout is no longer available for sale. */
  ItemUnavailable = "ITEM_UNAVAILABLE",
  /**
   * The requested quantity exceeds available stock;
   * quantity was automatically reduced to the maximum available.
   */
  NotEnoughStock = "NOT_ENOUGH_STOCK",
  /** The requested item is completely out of stock and has been removed from the checkout. */
  OutOfStock = "OUT_OF_STOCK",
  /** The price of one or more items has changed since they were added to the checkout. */
  PriceChanged = "PRICE_CHANGED",
}

/** Payment aggregate for a checkout. */
export type ApiCheckoutPayment = {
  __typename?: "CheckoutPayment";
  /** Available payment methods for this checkout context. */
  methods: Array<ApiCheckoutPaymentMethod>;
  /**
   * Amount payable to the merchant via the selected method.
   * This excludes SHIPPING_CARRIER components (CARRIER_DIRECT).
   */
  payableAmount: ApiMoney;
  selection: ApiCheckoutPaymentMethodSelection;
};

/** Payment method available/selected for checkout. */
export type ApiCheckoutPaymentMethod = {
  __typename?: "CheckoutPaymentMethod";
  code: Scalars["String"]["output"];
  flow: ApiPaymentFlow;
  handle: Scalars["String"]["output"];
  providerCode: Scalars["String"]["output"];
  title: Scalars["String"]["output"];
};

export type ApiCheckoutPaymentMethodSelection = {
  __typename?: "CheckoutPaymentMethodSelection";
  method: Maybe<ApiCheckoutPaymentMethod>;
  previousMethodHandle: Maybe<Scalars["String"]["output"]>;
  resetReason: Maybe<ApiCheckoutSelectionResetReason>;
  status: ApiCheckoutSelectionStatus;
};

/** Select or change payment method for the checkout. */
export type ApiCheckoutPaymentMethodUpdateInput = {
  /** Checkout identifier. */
  checkoutId: Scalars["ID"]["input"];
  /**
   * Arbitrary customer-provided data for the selected payment method.
   * It remains private selection intent and is never returned by Storefront API.
   */
  customerInput: InputMaybe<Scalars["JSON"]["input"]>;
  /** Opaque handle returned by the current checkout snapshot. */
  methodHandle: Scalars["String"]["input"];
};

export enum ApiCheckoutPlacementState {
  Claimed = "CLAIMED",
  Failed = "FAILED",
  OrderCreated = "ORDER_CREATED",
  PaymentCreated = "PAYMENT_CREATED",
  Placed = "PLACED",
  ResourcesReserved = "RESOURCES_RESERVED",
}

/** Applied promo code for a checkout. */
export type ApiCheckoutPromoCode = {
  __typename?: "CheckoutPromoCode";
  /** When this promo code was applied. */
  appliedAt: Scalars["DateTime"]["output"];
  /** Promo code text. */
  code: Scalars["String"]["output"];
  /** Discount conditions. */
  conditions: Maybe<Scalars["JSON"]["output"]>;
  /** Discount type (percentage). */
  discountType: Scalars["String"]["output"];
  /** Discount provider. */
  provider: Scalars["String"]["output"];
  /** Discount value (percentage as number). */
  value: Scalars["Int"]["output"];
};

/** Input data for applying a promo code to the checkout. */
export type ApiCheckoutPromoCodeAddInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars["ID"]["input"];
  /** Text code of the coupon/promo code. */
  code: Scalars["String"]["input"];
};

/** Input data for removing a previously applied promo code from the checkout. */
export type ApiCheckoutPromoCodeRemoveInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars["ID"]["input"];
  /** Text code of the coupon/promo code to be cancelled. */
  code: Scalars["String"]["input"];
};

/** Recipient details for the delivery group. */
export type ApiCheckoutRecipient = {
  __typename?: "CheckoutRecipient";
  /** Email of the recipient. */
  email: Maybe<Scalars["Email"]["output"]>;
  /** First name of the recipient. */
  firstName: Maybe<Scalars["String"]["output"]>;
  /** Last name of the recipient. */
  lastName: Maybe<Scalars["String"]["output"]>;
  /** Middle name of the recipient. */
  middleName: Maybe<Scalars["String"]["output"]>;
  /** Phone of the recipient. */
  phone: Maybe<Scalars["String"]["output"]>;
};

/** Input fields for recipient details. */
export type ApiCheckoutRecipientInput = {
  /** Email of the recipient. */
  email: InputMaybe<Scalars["Email"]["input"]>;
  /** First name of the recipient. */
  firstName: InputMaybe<Scalars["String"]["input"]>;
  /** Last name of the recipient. */
  lastName: InputMaybe<Scalars["String"]["input"]>;
  /** Middle name of the recipient. */
  middleName: InputMaybe<Scalars["String"]["input"]>;
  /** Phone of the recipient. */
  phone: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiCheckoutSelectionResetReason = {
  __typename?: "CheckoutSelectionResetReason";
  code: Scalars["String"]["output"];
  message: Scalars["String"]["output"];
};

export enum ApiCheckoutSelectionStatus {
  None = "NONE",
  Reset = "RESET",
  Selected = "SELECTED",
}

/** A tag that can be attached to checkout lines. */
export type ApiCheckoutTag = ApiNode & {
  __typename?: "CheckoutTag";
  /** Tag creation timestamp. */
  createdAt: Scalars["DateTime"]["output"];
  /** Global identifier of the tag. */
  id: Scalars["ID"]["output"];
  /** Slug identifier (a-zA-Z0-9). */
  slug: Scalars["String"]["output"];
  /** Whether the tag enforces uniqueness for checkout lines. */
  unique: Scalars["Boolean"]["output"];
  /** Last update timestamp. */
  updatedAt: Scalars["DateTime"]["output"];
};

/** Input payload for checkoutTagCreate mutation. */
export type ApiCheckoutTagCreateInput = {
  /** Checkout identifier. */
  checkoutId: Scalars["ID"]["input"];
  /** Tag configuration. */
  tag: ApiCheckoutTagInput;
};

/** Input payload for checkoutTagDelete mutation. */
export type ApiCheckoutTagDeleteInput = {
  /** Checkout identifier. */
  checkoutId: Scalars["ID"]["input"];
  /** Tag identifier (global ID). */
  tagId: Scalars["ID"]["input"];
};

/** Tag definition used when initializing or mutating checkout tags. */
export type ApiCheckoutTagInput = {
  /** Slug identifier consisting of alphanumeric characters. */
  slug: Scalars["String"]["input"];
  /** Whether this tag enforces uniqueness for checkout lines. */
  unique: Scalars["Boolean"]["input"];
};

/** Input payload for checkoutTagUpdate mutation. */
export type ApiCheckoutTagUpdateInput = {
  /** Checkout identifier. */
  checkoutId: Scalars["ID"]["input"];
  /** New slug, if tag needs to be renamed. */
  slug: InputMaybe<Scalars["String"]["input"]>;
  /** Tag identifier (global ID). */
  tagId: Scalars["ID"]["input"];
  /** Updated uniqueness flag. */
  unique: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** A customer-facing checkout mutation error safe to display in storefronts. */
export type ApiCheckoutUserError = ApiDisplayableError & {
  __typename?: "CheckoutUserError";
  /** Stable machine-readable error code. */
  code: Scalars["String"]["output"];
  /** Path to the input field associated with the error, when available. */
  field: Maybe<Array<Scalars["String"]["output"]>>;
  /** Human-readable error message. */
  message: Scalars["String"]["output"];
  /** Whether retrying the same request may succeed without changing input. */
  retryable: Scalars["Boolean"]["output"];
};

/**
 * Price adjustment type for child items in a bundle.
 * Values are always positive - the type determines the operation.
 */
export enum ApiChildPriceType {
  /** Use original price without adjustments */
  Base = "BASE",
  /** Subtract fixed amount from original price */
  DiscountAmount = "DISCOUNT_AMOUNT",
  /** Subtract percentage from original price */
  DiscountPercent = "DISCOUNT_PERCENT",
  /** Item is free (price = 0) */
  Free = "FREE",
  /** Add fixed amount to original price */
  MarkupAmount = "MARKUP_AMOUNT",
  /** Add percentage to original price */
  MarkupPercent = "MARKUP_PERCENT",
  /** Override with fixed price */
  Override = "OVERRIDE",
}

/** Shared fields exposed by every Relay-style connection. */
export type ApiConnection = {
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

/** Supported country codes. */
export enum ApiCountryCode {
  Ac = "AC",
  Ad = "AD",
  Ae = "AE",
  Af = "AF",
  Ag = "AG",
  Ai = "AI",
  Al = "AL",
  Am = "AM",
  An = "AN",
  Ao = "AO",
  Ar = "AR",
  At = "AT",
  Au = "AU",
  Aw = "AW",
  Ax = "AX",
  Az = "AZ",
  Ba = "BA",
  Bb = "BB",
  Bd = "BD",
  Be = "BE",
  Bf = "BF",
  Bg = "BG",
  Bh = "BH",
  Bi = "BI",
  Bj = "BJ",
  Bl = "BL",
  Bm = "BM",
  Bn = "BN",
  Bo = "BO",
  Bq = "BQ",
  Br = "BR",
  Bs = "BS",
  Bt = "BT",
  Bv = "BV",
  Bw = "BW",
  By = "BY",
  Bz = "BZ",
  Ca = "CA",
  Cc = "CC",
  Cd = "CD",
  Cf = "CF",
  Cg = "CG",
  Ch = "CH",
  Ci = "CI",
  Ck = "CK",
  Cl = "CL",
  Cm = "CM",
  Cn = "CN",
  Co = "CO",
  Cr = "CR",
  Cu = "CU",
  Cv = "CV",
  Cw = "CW",
  Cx = "CX",
  Cy = "CY",
  Cz = "CZ",
  De = "DE",
  Dj = "DJ",
  Dk = "DK",
  Dm = "DM",
  Do = "DO",
  Dz = "DZ",
  Ec = "EC",
  Ee = "EE",
  Eg = "EG",
  Eh = "EH",
  Er = "ER",
  Es = "ES",
  Et = "ET",
  Fi = "FI",
  Fj = "FJ",
  Fk = "FK",
  Fm = "FM",
  Fo = "FO",
  Fr = "FR",
  Ga = "GA",
  Gb = "GB",
  Gd = "GD",
  Ge = "GE",
  Gf = "GF",
  Gg = "GG",
  Gh = "GH",
  Gi = "GI",
  Gl = "GL",
  Gm = "GM",
  Gn = "GN",
  Gp = "GP",
  Gq = "GQ",
  Gr = "GR",
  Gs = "GS",
  Gt = "GT",
  Gw = "GW",
  Gy = "GY",
  Hk = "HK",
  Hm = "HM",
  Hn = "HN",
  Hr = "HR",
  Ht = "HT",
  Hu = "HU",
  Id = "ID",
  Ie = "IE",
  Il = "IL",
  Im = "IM",
  In = "IN",
  Io = "IO",
  Iq = "IQ",
  Ir = "IR",
  Is = "IS",
  It = "IT",
  Je = "JE",
  Jm = "JM",
  Jo = "JO",
  Jp = "JP",
  Ke = "KE",
  Kg = "KG",
  Kh = "KH",
  Ki = "KI",
  Km = "KM",
  Kn = "KN",
  Kp = "KP",
  Kr = "KR",
  Kw = "KW",
  Ky = "KY",
  Kz = "KZ",
  La = "LA",
  Lb = "LB",
  Lc = "LC",
  Li = "LI",
  Lk = "LK",
  Lr = "LR",
  Ls = "LS",
  Lt = "LT",
  Lu = "LU",
  Lv = "LV",
  Ly = "LY",
  Ma = "MA",
  Mc = "MC",
  Md = "MD",
  Me = "ME",
  Mf = "MF",
  Mg = "MG",
  Mh = "MH",
  Mk = "MK",
  Ml = "ML",
  Mm = "MM",
  Mn = "MN",
  Mo = "MO",
  Mq = "MQ",
  Mr = "MR",
  Ms = "MS",
  Mt = "MT",
  Mu = "MU",
  Mv = "MV",
  Mw = "MW",
  Mx = "MX",
  My = "MY",
  Mz = "MZ",
  Na = "NA",
  Nc = "NC",
  Ne = "NE",
  Nf = "NF",
  Ng = "NG",
  Ni = "NI",
  Nl = "NL",
  No = "NO",
  Np = "NP",
  Nr = "NR",
  Nu = "NU",
  Nz = "NZ",
  Om = "OM",
  Pa = "PA",
  Pe = "PE",
  Pf = "PF",
  Pg = "PG",
  Ph = "PH",
  Pk = "PK",
  Pl = "PL",
  Pm = "PM",
  Pn = "PN",
  Ps = "PS",
  Pt = "PT",
  Pw = "PW",
  Py = "PY",
  Qa = "QA",
  Re = "RE",
  Ro = "RO",
  Rs = "RS",
  Ru = "RU",
  Rw = "RW",
  Sa = "SA",
  Sb = "SB",
  Sc = "SC",
  Sd = "SD",
  Se = "SE",
  Sg = "SG",
  Sh = "SH",
  Si = "SI",
  Sj = "SJ",
  Sk = "SK",
  Sl = "SL",
  Sm = "SM",
  Sn = "SN",
  So = "SO",
  Sr = "SR",
  Ss = "SS",
  St = "ST",
  Sv = "SV",
  Sx = "SX",
  Sy = "SY",
  Sz = "SZ",
  Ta = "TA",
  Tc = "TC",
  Td = "TD",
  Tf = "TF",
  Tg = "TG",
  Th = "TH",
  Tj = "TJ",
  Tk = "TK",
  Tl = "TL",
  Tm = "TM",
  Tn = "TN",
  To = "TO",
  Tr = "TR",
  Tt = "TT",
  Tv = "TV",
  Tw = "TW",
  Tz = "TZ",
  Ua = "UA",
  Ug = "UG",
  Um = "UM",
  Us = "US",
  Uy = "UY",
  Uz = "UZ",
  Va = "VA",
  Vc = "VC",
  Ve = "VE",
  Vg = "VG",
  Vi = "VI",
  Vn = "VN",
  Vu = "VU",
  Wf = "WF",
  Ws = "WS",
  Xk = "XK",
  Ye = "YE",
  Yt = "YT",
  Za = "ZA",
  Zm = "ZM",
  Zw = "ZW",
  Zz = "ZZ",
}

/** Currency codes according to ISO 4217 */
export enum ApiCurrencyCode {
  /** UAE Dirham (United Arab Emirates) - 2 decimals */
  Aed = "AED",
  /** Afghan Afghani (Afghanistan) - 0 decimals */
  Afn = "AFN",
  /** Albanian Lek (Albania) - 0 decimals */
  All = "ALL",
  /** Armenian Dram (Armenia) - 2 decimals */
  Amd = "AMD",
  /** Netherlands Antillean Guilder - 2 decimals */
  Ang = "ANG",
  /** Angolan Kwanza (Angola) - 2 decimals */
  Aoa = "AOA",
  /** Argentine Peso (Argentina) - 2 decimals */
  Ars = "ARS",
  /** Australian Dollar (Australia) - 2 decimals */
  Aud = "AUD",
  /** Aruban Florin (Aruba) - 2 decimals */
  Awg = "AWG",
  /** Azerbaijani Manat (Azerbaijan) - 2 decimals */
  Azn = "AZN",
  /** Bosnia-Herzegovina Convertible Mark - 2 decimals */
  Bam = "BAM",
  /** Barbadian Dollar (Barbados) - 2 decimals */
  Bbd = "BBD",
  /** Bangladeshi Taka (Bangladesh) - 2 decimals */
  Bdt = "BDT",
  /** Bulgarian Lev (Bulgaria) - 2 decimals */
  Bgn = "BGN",
  /** Bahraini Dinar (Bahrain) - 3 decimals */
  Bhd = "BHD",
  /** Burundian Franc (Burundi) - 0 decimals */
  Bif = "BIF",
  /** Bermudian Dollar (Bermuda) - 2 decimals */
  Bmd = "BMD",
  /** Brunei Dollar (Brunei) - 2 decimals */
  Bnd = "BND",
  /** Bolivian Boliviano (Bolivia) - 2 decimals */
  Bob = "BOB",
  /** Brazilian Real (Brazil) - 2 decimals */
  Brl = "BRL",
  /** Bahamian Dollar (Bahamas) - 2 decimals */
  Bsd = "BSD",
  /** Bhutanese Ngultrum (Bhutan) - 2 decimals */
  Btn = "BTN",
  /** Botswana Pula (Botswana) - 2 decimals */
  Bwp = "BWP",
  /** Belarusian Ruble (Belarus) - 2 decimals */
  Byn = "BYN",
  /** Belize Dollar (Belize) - 2 decimals */
  Bzd = "BZD",
  /** Canadian Dollar (Canada) - 2 decimals */
  Cad = "CAD",
  /** Congolese Franc (DR Congo) - 2 decimals */
  Cdf = "CDF",
  /** Swiss Franc (Switzerland) - 2 decimals */
  Chf = "CHF",
  /** Chilean Peso (Chile) - 0 decimals */
  Clp = "CLP",
  /** Chinese Yuan (China) - 2 decimals */
  Cny = "CNY",
  /** Colombian Peso (Colombia) - 2 decimals */
  Cop = "COP",
  /** Costa Rican Colon (Costa Rica) - 2 decimals */
  Crc = "CRC",
  /** Cuban Peso (Cuba) - 2 decimals */
  Cup = "CUP",
  /** Cape Verdean Escudo (Cape Verde) - 2 decimals */
  Cve = "CVE",
  /** Czech Koruna (Czech Republic) - 2 decimals */
  Czk = "CZK",
  /** Djiboutian Franc (Djibouti) - 0 decimals */
  Djf = "DJF",
  /** Danish Krone (Denmark) - 2 decimals */
  Dkk = "DKK",
  /** Dominican Peso (Dominican Republic) - 2 decimals */
  Dop = "DOP",
  /** Algerian Dinar (Algeria) - 2 decimals */
  Dzd = "DZD",
  /** Egyptian Pound (Egypt) - 2 decimals */
  Egp = "EGP",
  /** Eritrean Nakfa (Eritrea) - 2 decimals */
  Ern = "ERN",
  /** Ethiopian Birr (Ethiopia) - 2 decimals */
  Etb = "ETB",
  /** Euro (European Union) - 2 decimals */
  Eur = "EUR",
  /** Fijian Dollar (Fiji) - 2 decimals */
  Fjd = "FJD",
  /** Falkland Islands Pound - 2 decimals */
  Fkp = "FKP",
  /** Faroese Króna (Faroe Islands) - 2 decimals */
  Fok = "FOK",
  /** Pound Sterling (United Kingdom) - 2 decimals */
  Gbp = "GBP",
  /** Georgian Lari (Georgia) - 2 decimals */
  Gel = "GEL",
  /** Guernsey Pound (Guernsey) - 2 decimals */
  Ggp = "GGP",
  /** Ghanaian Cedi (Ghana) - 2 decimals */
  Ghs = "GHS",
  /** Gibraltar Pound (Gibraltar) - 2 decimals */
  Gip = "GIP",
  /** Gambian Dalasi (Gambia) - 2 decimals */
  Gmd = "GMD",
  /** Guinean Franc (Guinea) - 0 decimals */
  Gnf = "GNF",
  /** Guatemalan Quetzal (Guatemala) - 2 decimals */
  Gtq = "GTQ",
  /** Guyanese Dollar (Guyana) - 2 decimals */
  Gyd = "GYD",
  /** Hong Kong Dollar (Hong Kong) - 2 decimals */
  Hkd = "HKD",
  /** Honduran Lempira (Honduras) - 2 decimals */
  Hnl = "HNL",
  /** Croatian Kuna (Croatia) - 2 decimals */
  Hrk = "HRK",
  /** Haitian Gourde (Haiti) - 2 decimals */
  Htg = "HTG",
  /** Hungarian Forint (Hungary) - 2 decimals */
  Huf = "HUF",
  /** Indonesian Rupiah (Indonesia) - 0 decimals */
  Idr = "IDR",
  /** Israeli New Shekel (Israel) - 2 decimals */
  Ils = "ILS",
  /** Isle of Man Pound - 2 decimals */
  Imp = "IMP",
  /** Indian Rupee (India) - 2 decimals */
  Inr = "INR",
  /** Iraqi Dinar (Iraq) - 3 decimals */
  Iqd = "IQD",
  /** Iranian Rial (Iran) - 2 decimals */
  Irr = "IRR",
  /** Icelandic Króna (Iceland) - 0 decimals */
  Isk = "ISK",
  /** Jersey Pound (Jersey) - 2 decimals */
  Jep = "JEP",
  /** Jamaican Dollar (Jamaica) - 2 decimals */
  Jmd = "JMD",
  /** Jordanian Dinar (Jordan) - 3 decimals */
  Jod = "JOD",
  /** Japanese Yen (Japan) - 0 decimals */
  Jpy = "JPY",
  /** Kenyan Shilling (Kenya) - 2 decimals */
  Kes = "KES",
  /** Kyrgyzstani Som (Kyrgyzstan) - 2 decimals */
  Kgs = "KGS",
  /** Cambodian Riel (Cambodia) - 2 decimals */
  Khr = "KHR",
  /** Comorian Franc (Comoros) - 2 decimals */
  Kmf = "KMF",
  /** North Korean Won (North Korea) - 2 decimals */
  Kpw = "KPW",
  /** South Korean Won (South Korea) - 0 decimals */
  Krw = "KRW",
  /** Kuwaiti Dinar (Kuwait) - 3 decimals */
  Kwd = "KWD",
  /** Cayman Islands Dollar - 2 decimals */
  Kyd = "KYD",
  /** Kazakhstani Tenge (Kazakhstan) - 2 decimals */
  Kzt = "KZT",
  /** Lao Kip (Laos) - 2 decimals */
  Lak = "LAK",
  /** Lebanese Pound (Lebanon) - 2 decimals */
  Lbp = "LBP",
  /** Sri Lankan Rupee (Sri Lanka) - 2 decimals */
  Lkr = "LKR",
  /** Liberian Dollar (Liberia) - 2 decimals */
  Lrd = "LRD",
  /** Lesotho Loti (Lesotho) - 2 decimals */
  Lsl = "LSL",
  /** Libyan Dinar (Libya) - 3 decimals */
  Lyd = "LYD",
  /** Moroccan Dirham (Morocco) - 2 decimals */
  Mad = "MAD",
  /** Moldovan Leu (Moldova) - 2 decimals */
  Mdl = "MDL",
  /** Malagasy Ariary (Madagascar) - 2 decimals */
  Mga = "MGA",
  /** Macedonian Denar (North Macedonia) - 2 decimals */
  Mkd = "MKD",
  /** Burmese Kyat (Myanmar) - 2 decimals */
  Mmk = "MMK",
  /** Mongolian Tögrög (Mongolia) - 2 decimals */
  Mnt = "MNT",
  /** Macanese Pataca (Macau) - 2 decimals */
  Mop = "MOP",
  /** Mauritanian Ouguiya (Mauritania) - 2 decimals */
  Mru = "MRU",
  /** Mauritian Rupee (Mauritius) - 2 decimals */
  Mur = "MUR",
  /** Maldivian Rufiyaa (Maldives) - 2 decimals */
  Mvr = "MVR",
  /** Malawian Kwacha (Malawi) - 2 decimals */
  Mwk = "MWK",
  /** Mexican Peso (Mexico) - 2 decimals */
  Mxn = "MXN",
  /** Malaysian Ringgit (Malaysia) - 2 decimals */
  Myr = "MYR",
  /** Mozambican Metical (Mozambique) - 2 decimals */
  Mzn = "MZN",
  /** Namibian Dollar (Namibia) - 2 decimals */
  Nad = "NAD",
  /** Nigerian Naira (Nigeria) - 2 decimals */
  Ngn = "NGN",
  /** Nicaraguan Córdoba (Nicaragua) - 2 decimals */
  Nio = "NIO",
  /** Norwegian Krone (Norway) - 2 decimals */
  Nok = "NOK",
  /** Nepalese Rupee (Nepal) - 2 decimals */
  Npr = "NPR",
  /** New Zealand Dollar (New Zealand) - 2 decimals */
  Nzd = "NZD",
  /** Omani Rial (Oman) - 3 decimals */
  Omr = "OMR",
  /** Panamanian Balboa (Panama) - 2 decimals */
  Pab = "PAB",
  /** Peruvian Sol (Peru) - 2 decimals */
  Pen = "PEN",
  /** Papua New Guinean Kina - 2 decimals */
  Pgk = "PGK",
  /** Philippine Peso (Philippines) - 2 decimals */
  Php = "PHP",
  /** Pakistani Rupee (Pakistan) - 2 decimals */
  Pkr = "PKR",
  /** Polish Zloty (Poland) - 2 decimals */
  Pln = "PLN",
  /** Paraguayan Guaraní (Paraguay) - 0 decimals */
  Pyg = "PYG",
  /** Qatari Riyal (Qatar) - 2 decimals */
  Qar = "QAR",
  /** Romanian Leu (Romania) - 2 decimals */
  Ron = "RON",
  /** Serbian Dinar (Serbia) - 2 decimals */
  Rsd = "RSD",
  /** Russian Ruble (Russia) - 2 decimals */
  Rub = "RUB",
  /** Rwandan Franc (Rwanda) - 0 decimals */
  Rwf = "RWF",
  /** Saudi Riyal (Saudi Arabia) - 2 decimals */
  Sar = "SAR",
  /** Solomon Islands Dollar - 2 decimals */
  Sbd = "SBD",
  /** Seychelles Rupee (Seychelles) - 2 decimals */
  Scr = "SCR",
  /** Sudanese Pound (Sudan) - 2 decimals */
  Sdg = "SDG",
  /** Swedish Krona (Sweden) - 2 decimals */
  Sek = "SEK",
  /** Singapore Dollar (Singapore) - 2 decimals */
  Sgd = "SGD",
  /** Saint Helena Pound - 2 decimals */
  Shp = "SHP",
  /** Sierra Leonean Leone - 2 decimals */
  Sle = "SLE",
  /** Somali Shilling (Somalia) - 2 decimals */
  Sos = "SOS",
  /** Surinamese Dollar (Suriname) - 2 decimals */
  Srd = "SRD",
  /** South Sudanese Pound - 2 decimals */
  Ssp = "SSP",
  /** São Tomé and Príncipe Dobra - 2 decimals */
  Stn = "STN",
  /** Salvadoran Colón (El Salvador) - 2 decimals */
  Svc = "SVC",
  /** Syrian Pound (Syria) - 2 decimals */
  Syp = "SYP",
  /** Eswatini Lilangeni (Eswatini) - 2 decimals */
  Szl = "SZL",
  /** Thai Baht (Thailand) - 2 decimals */
  Thb = "THB",
  /** Tajikistani Somoni (Tajikistan) - 2 decimals */
  Tjs = "TJS",
  /** Turkmenistani Manat (Turkmenistan) - 2 decimals */
  Tmt = "TMT",
  /** Tunisian Dinar (Tunisia) - 3 decimals */
  Tnd = "TND",
  /** Tongan Paʻanga (Tonga) - 2 decimals */
  Top = "TOP",
  /** Turkish Lira (Turkey) - 2 decimals */
  Try = "TRY",
  /** Trinidad and Tobago Dollar - 2 decimals */
  Ttd = "TTD",
  /** New Taiwan Dollar (Taiwan) - 2 decimals */
  Twd = "TWD",
  /** Tanzanian Shilling (Tanzania) - 2 decimals */
  Tzs = "TZS",
  /** Ukrainian Hryvnia (Ukraine) - 2 decimals */
  Uah = "UAH",
  /** Ugandan Shilling (Uganda) - 0 decimals */
  Ugx = "UGX",
  /** United States Dollar (USA) - 2 decimals */
  Usd = "USD",
  /** Uruguayan Peso (Uruguay) - 2 decimals */
  Uyu = "UYU",
  /** Uzbekistani Som (Uzbekistan) - 2 decimals */
  Uzs = "UZS",
  /** Venezuelan Bolívar (Venezuela) - 2 decimals */
  Ves = "VES",
  /** Vietnamese Dong (Vietnam) - 0 decimals */
  Vnd = "VND",
  /** Vanuatu Vatu (Vanuatu) - 0 decimals */
  Vuv = "VUV",
  /** Samoan Tala (Samoa) - 2 decimals */
  Wst = "WST",
  /** Central African CFA Franc - 0 decimals */
  Xaf = "XAF",
  /** East Caribbean Dollar - 2 decimals */
  Xcd = "XCD",
  /** Special Drawing Rights (IMF) - 0 decimals */
  Xdr = "XDR",
  /** West African CFA Franc - 0 decimals */
  Xof = "XOF",
  /** CFP Franc - 0 decimals */
  Xpf = "XPF",
  /** Yemeni Rial (Yemen) - 2 decimals */
  Yer = "YER",
  /** South African Rand (South Africa) - 2 decimals */
  Zar = "ZAR",
  /** Zambian Kwacha (Zambia) - 2 decimals */
  Zmw = "ZMW",
  /** Zimbabwean Dollar (Zimbabwe) - 2 decimals */
  Zwl = "ZWL",
}

/** A canonical storefront customer owned by the Customers subgraph. */
export type ApiCustomer = {
  __typename?: "Customer";
  id: Scalars["ID"]["output"];
};

/** Dimension (length) measurement units */
export enum ApiDimensionUnit {
  /** Centimeter */
  Cm = "cm",
  /** Foot */
  Ft = "ft",
  /** Inch */
  In = "in",
  /** Meter */
  M = "m",
  /** Millimeter */
  Mm = "mm",
}

/** Physical dimensions expressed in a common length unit. */
export type ApiDimensions = {
  __typename?: "Dimensions";
  height: Scalars["Float"]["output"];
  length: Scalars["Float"]["output"];
  unit: ApiDimensionUnit;
  width: Scalars["Float"]["output"];
};

/** Represents an error in the input of a mutation. */
export type ApiDisplayableError = {
  field: Maybe<Array<Scalars["String"]["output"]>>;
  message: Scalars["String"]["output"];
};

/** Language/Locale codes based on ISO 639-1 and BCP 47 */
export enum ApiLocaleCode {
  /** Akan */
  Ak = "ak",
  /** Amharic */
  Am = "am",
  /** Arabic */
  Ar = "ar",
  /** Assamese */
  As = "as",
  /** Azerbaijani */
  Az = "az",
  /** Belarusian */
  Be = "be",
  /** Bulgarian */
  Bg = "bg",
  /** Bambara */
  Bm = "bm",
  /** Bangla */
  Bn = "bn",
  /** Tibetan */
  Bo = "bo",
  /** Breton */
  Br = "br",
  /** Bosnian */
  Bs = "bs",
  /** Catalan */
  Ca = "ca",
  /** Chechen */
  Ce = "ce",
  /** Central Kurdish */
  Ckb = "ckb",
  /** Czech */
  Cs = "cs",
  /** Welsh */
  Cy = "cy",
  /** Danish */
  Da = "da",
  /** German */
  De = "de",
  /** Dzongkha */
  Dz = "dz",
  /** Ewe */
  Ee = "ee",
  /** Greek */
  El = "el",
  /** English */
  En = "en",
  /** Esperanto */
  Eo = "eo",
  /** Spanish */
  Es = "es",
  /** Estonian */
  Et = "et",
  /** Basque */
  Eu = "eu",
  /** Persian */
  Fa = "fa",
  /** Fulah */
  Ff = "ff",
  /** Finnish */
  Fi = "fi",
  /** Filipino */
  Fil = "fil",
  /** Faroese */
  Fo = "fo",
  /** French */
  Fr = "fr",
  /** Western Frisian */
  Fy = "fy",
  /** Irish */
  Ga = "ga",
  /** Scottish Gaelic */
  Gd = "gd",
  /** Galician */
  Gl = "gl",
  /** Gujarati */
  Gu = "gu",
  /** Manx */
  Gv = "gv",
  /** Hausa */
  Ha = "ha",
  /** Hebrew */
  He = "he",
  /** Hindi */
  Hi = "hi",
  /** Croatian */
  Hr = "hr",
  /** Hungarian */
  Hu = "hu",
  /** Armenian */
  Hy = "hy",
  /** Interlingua */
  Ia = "ia",
  /** Indonesian */
  Id = "id",
  /** Igbo */
  Ig = "ig",
  /** Sichuan Yi */
  Ii = "ii",
  /** Icelandic */
  Is = "is",
  /** Italian */
  It = "it",
  /** Japanese */
  Ja = "ja",
  /** Javanese */
  Jv = "jv",
  /** Georgian */
  Ka = "ka",
  /** Kikuyu */
  Ki = "ki",
  /** Kazakh */
  Kk = "kk",
  /** Kalaallisut */
  Kl = "kl",
  /** Khmer */
  Km = "km",
  /** Kannada */
  Kn = "kn",
  /** Korean */
  Ko = "ko",
  /** Kashmiri */
  Ks = "ks",
  /** Kurdish */
  Ku = "ku",
  /** Cornish */
  Kw = "kw",
  /** Kyrgyz */
  Ky = "ky",
  /** Luxembourgish */
  Lb = "lb",
  /** Ganda */
  Lg = "lg",
  /** Lingala */
  Ln = "ln",
  /** Lao */
  Lo = "lo",
  /** Lithuanian */
  Lt = "lt",
  /** Luba-Katanga */
  Lu = "lu",
  /** Latvian */
  Lv = "lv",
  /** Malagasy */
  Mg = "mg",
  /** Māori */
  Mi = "mi",
  /** Macedonian */
  Mk = "mk",
  /** Malayalam */
  Ml = "ml",
  /** Mongolian */
  Mn = "mn",
  /** Marathi */
  Mr = "mr",
  /** Malay */
  Ms = "ms",
  /** Maltese */
  Mt = "mt",
  /** Burmese */
  My = "my",
  /** Norwegian Bokmål */
  Nb = "nb",
  /** North Ndebele */
  Nd = "nd",
  /** Nepali */
  Ne = "ne",
  /** Dutch */
  Nl = "nl",
  /** Norwegian Nynorsk */
  Nn = "nn",
  /** Norwegian */
  No = "no",
  /** Oromo */
  Om = "om",
  /** Odia */
  Or = "or",
  /** Ossetic */
  Os = "os",
  /** Punjabi */
  Pa = "pa",
  /** Polish */
  Pl = "pl",
  /** Pashto */
  Ps = "ps",
  /** Portuguese (Brazil) */
  PtBr = "pt_BR",
  /** Portuguese (Portugal) */
  PtPt = "pt_PT",
  /** Quechua */
  Qu = "qu",
  /** Romansh */
  Rm = "rm",
  /** Rundi */
  Rn = "rn",
  /** Romanian */
  Ro = "ro",
  /** Russian */
  Ru = "ru",
  /** Kinyarwanda */
  Rw = "rw",
  /** Sanskrit */
  Sa = "sa",
  /** Sardinian */
  Sc = "sc",
  /** Sindhi */
  Sd = "sd",
  /** Northern Sami */
  Se = "se",
  /** Sango */
  Sg = "sg",
  /** Sinhala */
  Si = "si",
  /** Slovak */
  Sk = "sk",
  /** Slovenian */
  Sl = "sl",
  /** Shona */
  Sn = "sn",
  /** Somali */
  So = "so",
  /** Albanian */
  Sq = "sq",
  /** Serbian */
  Sr = "sr",
  /** Sundanese */
  Su = "su",
  /** Swedish */
  Sv = "sv",
  /** Swahili */
  Sw = "sw",
  /** Tamil */
  Ta = "ta",
  /** Telugu */
  Te = "te",
  /** Tajik */
  Tg = "tg",
  /** Thai */
  Th = "th",
  /** Tigrinya */
  Ti = "ti",
  /** Turkmen */
  Tk = "tk",
  /** Tongan */
  To = "to",
  /** Turkish */
  Tr = "tr",
  /** Tatar */
  Tt = "tt",
  /** Uyghur */
  Ug = "ug",
  /** Ukrainian */
  Uk = "uk",
  /** Urdu */
  Ur = "ur",
  /** Uzbek */
  Uz = "uz",
  /** Vietnamese */
  Vi = "vi",
  /** Wolof */
  Wo = "wo",
  /** Xhosa */
  Xh = "xh",
  /** Yiddish */
  Yi = "yi",
  /** Yoruba */
  Yo = "yo",
  /** Chinese (Simplified) */
  ZhCn = "zh_CN",
  /** Chinese (Traditional) */
  ZhTw = "zh_TW",
  /** Zulu */
  Zu = "zu",
}

/** An image owned and resolved by the Media subgraph. */
export type ApiMediaImage = {
  __typename?: "MediaImage";
  id: Scalars["ID"]["output"];
};

/** A precise monetary value with its associated currency. */
export type ApiMoney = {
  __typename?: "Money";
  amount: Scalars["Decimal"]["output"];
  currencyCode: ApiCurrencyCode;
};

export type ApiMutation = {
  __typename?: "Mutation";
  /** Sets, replaces, or clears the billing address for the checkout. */
  checkoutBillingAddressUpdate: ApiCheckoutMutationPayload;
  /** Creates a new checkout. */
  checkoutCreate: ApiCheckoutMutationPayload;
  /** Updates the display currency of the checkout (ISO 4217, e.g. "USD", "EUR"). */
  checkoutCurrencyCodeUpdate: ApiCheckoutMutationPayload;
  /**
   * Updates customer identification data associated with the checkout
   * while authenticated customer ownership is resolved from trusted context.
   */
  checkoutCustomerIdentityUpdate: ApiCheckoutMutationPayload;
  /** Updates the customer note attached to the checkout (delivery instructions, etc.). */
  checkoutCustomerNoteUpdate: ApiCheckoutMutationPayload;
  /** Adds one or more delivery addresses to the checkout (supports multi-shipping). */
  checkoutDeliveryAddressesAdd: ApiCheckoutMutationPayload;
  /** Removes one or more delivery addresses previously attached to the checkout. */
  checkoutDeliveryAddressesRemove: ApiCheckoutMutationPayload;
  /** Updates previously added delivery addresses (e.g., correcting postal code or city). */
  checkoutDeliveryAddressesUpdate: ApiCheckoutMutationPayload;
  /** Selects or changes the delivery method for the entire checkout or specific address. */
  checkoutDeliveryMethodUpdate: ApiCheckoutMutationPayload;
  /** Adds recipients to delivery groups. */
  checkoutDeliveryRecipientsAdd: ApiCheckoutMutationPayload;
  /** Removes recipients from delivery groups. */
  checkoutDeliveryRecipientsRemove: ApiCheckoutMutationPayload;
  /** Updates recipients for delivery groups. */
  checkoutDeliveryRecipientsUpdate: ApiCheckoutMutationPayload;
  /** Updates the language/locale of the checkout (affects localization and formatting). */
  checkoutLanguageCodeUpdate: ApiCheckoutMutationPayload;
  /** Adds an item to an existing checkout. */
  checkoutLinesAdd: ApiCheckoutMutationPayload;
  /** Clears all items from a checkout. */
  checkoutLinesClear: ApiCheckoutMutationPayload;
  /** Removes a single item from the checkout. */
  checkoutLinesDelete: ApiCheckoutMutationPayload;
  /** Replaces one checkout line with another by merging quantities and removing the source line. */
  checkoutLinesReplace: ApiCheckoutMutationPayload;
  /** Updates the quantity of a specific checkout item. */
  checkoutLinesUpdate: ApiCheckoutMutationPayload;
  /** Removes the loyalty redemption selection from this checkout. */
  checkoutLoyaltyRedemptionRemove: ApiCheckoutMutationPayload;
  /** Selects loyalty points, an issued reward entitlement, or both. */
  checkoutLoyaltyRedemptionUpdate: ApiCheckoutMutationPayload;
  /** Selects or changes the payment method for the checkout. */
  checkoutPaymentMethodUpdate: ApiCheckoutMutationPayload;
  /** Applies a promo code/coupon to the checkout. */
  checkoutPromoCodeAdd: ApiCheckoutMutationPayload;
  /** Removes a previously applied promo code/coupon from the checkout. */
  checkoutPromoCodeRemove: ApiCheckoutMutationPayload;
  /** Creates a new checkout tag. */
  checkoutTagCreate: ApiCheckoutMutationPayload;
  /** Deletes a checkout tag. */
  checkoutTagDelete: ApiCheckoutMutationPayload;
  /** Updates a checkout tag. */
  checkoutTagUpdate: ApiCheckoutMutationPayload;
  /**
   * Places a committed checkout through the durable order placement workflow.
   * Repeating the same request with the same idempotency key returns the same result.
   */
  placeOrder: ApiPlaceOrderPayload;
};

export type ApiMutationCheckoutBillingAddressUpdateArgs = {
  input: ApiCheckoutBillingAddressUpdateInput;
};

export type ApiMutationCheckoutCreateArgs = {
  input: ApiCheckoutCreateInput;
};

export type ApiMutationCheckoutCurrencyCodeUpdateArgs = {
  input: ApiCheckoutCurrencyCodeUpdateInput;
};

export type ApiMutationCheckoutCustomerIdentityUpdateArgs = {
  input: ApiCheckoutCustomerIdentityUpdateInput;
};

export type ApiMutationCheckoutCustomerNoteUpdateArgs = {
  input: ApiCheckoutCustomerNoteUpdateInput;
};

export type ApiMutationCheckoutDeliveryAddressesAddArgs = {
  input: ApiCheckoutDeliveryAddressesAddInput;
};

export type ApiMutationCheckoutDeliveryAddressesRemoveArgs = {
  input: ApiCheckoutDeliveryAddressesRemoveInput;
};

export type ApiMutationCheckoutDeliveryAddressesUpdateArgs = {
  input: ApiCheckoutDeliveryAddressesUpdateInput;
};

export type ApiMutationCheckoutDeliveryMethodUpdateArgs = {
  input: ApiCheckoutDeliveryMethodUpdateInput;
};

export type ApiMutationCheckoutDeliveryRecipientsAddArgs = {
  input: ApiCheckoutDeliveryRecipientsAddInput;
};

export type ApiMutationCheckoutDeliveryRecipientsRemoveArgs = {
  input: ApiCheckoutDeliveryRecipientsRemoveInput;
};

export type ApiMutationCheckoutDeliveryRecipientsUpdateArgs = {
  input: ApiCheckoutDeliveryRecipientsUpdateInput;
};

export type ApiMutationCheckoutLanguageCodeUpdateArgs = {
  input: ApiCheckoutLanguageCodeUpdateInput;
};

export type ApiMutationCheckoutLinesAddArgs = {
  input: ApiCheckoutLinesAddInput;
};

export type ApiMutationCheckoutLinesClearArgs = {
  input: ApiCheckoutLinesClearInput;
};

export type ApiMutationCheckoutLinesDeleteArgs = {
  input: ApiCheckoutLinesDeleteInput;
};

export type ApiMutationCheckoutLinesReplaceArgs = {
  input: ApiCheckoutLinesReplaceInput;
};

export type ApiMutationCheckoutLinesUpdateArgs = {
  input: ApiCheckoutLinesUpdateInput;
};

export type ApiMutationCheckoutLoyaltyRedemptionRemoveArgs = {
  input: ApiCheckoutLoyaltyRedemptionRemoveInput;
};

export type ApiMutationCheckoutLoyaltyRedemptionUpdateArgs = {
  input: ApiCheckoutLoyaltyRedemptionUpdateInput;
};

export type ApiMutationCheckoutPaymentMethodUpdateArgs = {
  input: ApiCheckoutPaymentMethodUpdateInput;
};

export type ApiMutationCheckoutPromoCodeAddArgs = {
  input: ApiCheckoutPromoCodeAddInput;
};

export type ApiMutationCheckoutPromoCodeRemoveArgs = {
  input: ApiCheckoutPromoCodeRemoveInput;
};

export type ApiMutationCheckoutTagCreateArgs = {
  input: ApiCheckoutTagCreateInput;
};

export type ApiMutationCheckoutTagDeleteArgs = {
  input: ApiCheckoutTagDeleteInput;
};

export type ApiMutationCheckoutTagUpdateArgs = {
  input: ApiCheckoutTagUpdateInput;
};

export type ApiMutationPlaceOrderArgs = {
  input: ApiPlaceOrderInput;
};

/** Enables global object identification following the Relay specification. */
export type ApiNode = {
  id: Scalars["ID"]["output"];
};

/** Severity levels for checkout warnings. */
export enum ApiNotificationSeverity {
  /** Informational notice; does not indicate any change in checkout data. */
  Info = "INFO",
  /** Notification about automatic adjustments (e.g., quantity reduced). */
  Warning = "WARNING",
}

/** Returns information about pagination in a connection. */
export type ApiPageInfo = {
  __typename?: "PageInfo";
  endCursor: Maybe<Scalars["Cursor"]["output"]>;
  hasNextPage: Scalars["Boolean"]["output"];
  hasPreviousPage: Scalars["Boolean"]["output"];
  startCursor: Maybe<Scalars["Cursor"]["output"]>;
};

/** Payment flow for the method. */
export enum ApiPaymentFlow {
  /** Customer pays offline via provider (QR code, display code, etc). */
  Offline = "OFFLINE",
  /** Customer pays online via provider (redirect/app flow handled externally). */
  Online = "ONLINE",
  /** Customer pays later/on delivery or by invoice (offline instructions). */
  OnDelivery = "ON_DELIVERY",
}

/** Customer interaction required to continue payment. */
export type ApiPlaceOrderCustomerAction = {
  __typename?: "PlaceOrderCustomerAction";
  data: Maybe<Scalars["JSON"]["output"]>;
  expiresAt: Maybe<Scalars["DateTime"]["output"]>;
  instructions: Maybe<Scalars["String"]["output"]>;
  title: Maybe<Scalars["String"]["output"]>;
  type: ApiPlaceOrderCustomerActionType;
  url: Maybe<Scalars["String"]["output"]>;
};

export enum ApiPlaceOrderCustomerActionType {
  Instructions = "INSTRUCTIONS",
  Redirect = "REDIRECT",
}

/** Input used to place one immutable checkout snapshot. */
export type ApiPlaceOrderInput = {
  /** Checkout identifier. */
  checkoutId: Scalars["ID"]["input"];
  /**
   * Client-generated key identifying this payment/order attempt. Reuse the same
   * key with identical input when retrying after a timeout or connection failure.
   */
  idempotencyKey: Scalars["String"]["input"];
  /** HTTPS URL to which an online payment provider may return the customer. */
  returnUrl: InputMaybe<Scalars["String"]["input"]>;
};

/** Result of the durable place-order workflow. */
export type ApiPlaceOrderPayload = {
  __typename?: "PlaceOrderPayload";
  /** Checkout snapshot committed by this placement. */
  checkoutId: Maybe<Scalars["ID"]["output"]>;
  customerAction: Maybe<ApiPlaceOrderCustomerAction>;
  orderId: Maybe<Scalars["ID"]["output"]>;
  paymentCollectionId: Maybe<Scalars["ID"]["output"]>;
  paymentFailure: Maybe<ApiPlaceOrderPaymentFailure>;
  paymentOperationId: Maybe<Scalars["ID"]["output"]>;
  paymentSessionId: Maybe<Scalars["ID"]["output"]>;
  /** Durable placement identifier used by Query.checkoutPlacement. */
  placementId: Maybe<Scalars["ID"]["output"]>;
  /** Persisted orchestration state used for recovery and reconciliation. */
  placementState: Maybe<ApiCheckoutPlacementState>;
  status: Maybe<ApiPlaceOrderStatus>;
  /** Validation, stale-snapshot, and business errors produced before placement. */
  userErrors: Array<ApiCheckoutUserError>;
};

/** Normalized terminal or retryable payment failure. */
export type ApiPlaceOrderPaymentFailure = {
  __typename?: "PlaceOrderPaymentFailure";
  category: ApiPlaceOrderPaymentFailureCategory;
  code: Scalars["String"]["output"];
  message: Scalars["String"]["output"];
  providerCode: Maybe<Scalars["String"]["output"]>;
  retryable: Scalars["Boolean"]["output"];
};

export enum ApiPlaceOrderPaymentFailureCategory {
  Authentication = "AUTHENTICATION",
  Configuration = "CONFIGURATION",
  Conflict = "CONFLICT",
  Declined = "DECLINED",
  FraudSuspected = "FRAUD_SUSPECTED",
  InvalidRequest = "INVALID_REQUEST",
  NotSupported = "NOT_SUPPORTED",
  ProviderUnavailable = "PROVIDER_UNAVAILABLE",
  RateLimited = "RATE_LIMITED",
  Timeout = "TIMEOUT",
  Unknown = "UNKNOWN",
}

export enum ApiPlaceOrderStatus {
  Authorized = "AUTHORIZED",
  Paid = "PAID",
  PaymentFailed = "PAYMENT_FAILED",
  PaymentNotRequired = "PAYMENT_NOT_REQUIRED",
  PaymentPending = "PAYMENT_PENDING",
  RequiresAction = "REQUIRES_ACTION",
  RequiresConfirmation = "REQUIRES_CONFIRMATION",
}

/** Direction in which a price adjustment changes the base price. */
export enum ApiPriceAdjustmentOperation {
  /** Subtract the calculated value from the base price. */
  Decrease = "DECREASE",
  /** Add the calculated value to the base price. */
  Increase = "INCREASE",
}

/** Representation used to calculate a price adjustment. */
export enum ApiPriceAdjustmentValueType {
  /** Use a monetary value expressed in minor currency units. */
  FixedAmount = "FIXED_AMOUNT",
  /** Calculate the value from basis points where 10000 equals 100%. */
  Percentage = "PERCENTAGE",
}

/** A purchasable product variant owned by the Catalog subgraph. */
export type ApiProductVariant = {
  __typename?: "ProductVariant";
  id: Scalars["ID"]["output"];
};

/** The catalog entity purchased by a checkout line. */
export type ApiPurchasable = ApiProductVariant;

export type ApiQuery = {
  __typename?: "Query";
  /** Get a checkout by its ID. */
  checkout: Maybe<ApiCheckout>;
  /**
   * Returns the latest durable result of a checkout placement.
   *
   * This query is suitable for restoring state after a payment-provider redirect
   * and for polling asynchronous payment completion.
   */
  checkoutPlacement: Maybe<ApiPlaceOrderPayload>;
};

export type ApiQueryCheckoutArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiQueryCheckoutPlacementArgs = {
  id: Scalars["ID"]["input"];
};

/** Localized rich text in plain text, HTML, and structured JSON formats. */
export type ApiRichText = {
  __typename?: "RichText";
  html: Scalars["HTML"]["output"];
  json: Scalars["JSON"]["output"];
  text: Scalars["String"]["output"];
};

/** Represents a generic error in the input of a mutation. */
export type ApiUserError = ApiDisplayableError & {
  __typename?: "UserError";
  field: Maybe<Array<Scalars["String"]["output"]>>;
  message: Scalars["String"]["output"];
};

/** A weight measurement expressed in a supported unit. */
export type ApiWeight = {
  __typename?: "Weight";
  unit: ApiWeightUnit;
  value: Scalars["Float"]["output"];
};

/** Weight measurement units */
export enum ApiWeightUnit {
  /** Gram */
  G = "g",
  /** Kilogram */
  Kg = "kg",
  /** Pound */
  Lb = "lb",
  /** Ounce */
  Oz = "oz",
}

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = {},
  TContext = {},
  TArgs = {},
> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo,
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo,
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

/** Mapping of union types */
export type ApiResolversUnionTypes<_RefType extends Record<string, unknown>> = {
  Purchasable: ApiProductVariant;
};

/** Mapping of interface types */
export type ApiResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  Connection: never;
  DisplayableError: ApiCheckoutUserError | ApiUserError;
  Node:
    | (Omit<ApiCheckout, "deliveryGroups" | "lines"> & {
        deliveryGroups: Array<_RefType["CheckoutDeliveryGroup"]>;
        lines: Array<_RefType["CheckoutLine"]>;
      })
    | (Omit<ApiCheckoutLine, "children" | "cost" | "parent" | "purchasable"> & {
        children: Array<_RefType["CheckoutLine"]>;
        cost: _RefType["CheckoutLineCost"];
        parent: Maybe<_RefType["CheckoutLine"]>;
        purchasable: _RefType["Purchasable"];
      })
    | ApiCheckoutTag;
};

/** Mapping between all available schema types and the resolvers types */
export type ApiResolversTypes = {
  BigInt: ResolverTypeWrapper<Scalars["BigInt"]["output"]>;
  Boolean: ResolverTypeWrapper<Scalars["Boolean"]["output"]>;
  Checkout: ResolverTypeWrapper<
    Omit<ApiCheckout, "deliveryGroups" | "lines"> & {
      deliveryGroups: Array<ApiResolversTypes["CheckoutDeliveryGroup"]>;
      lines: Array<ApiResolversTypes["CheckoutLine"]>;
    }
  >;
  CheckoutBillingAddress: ResolverTypeWrapper<ApiCheckoutBillingAddress>;
  CheckoutBillingAddressInput: ApiCheckoutBillingAddressInput;
  CheckoutBillingAddressUpdateInput: ApiCheckoutBillingAddressUpdateInput;
  CheckoutChildLineInput: ApiCheckoutChildLineInput;
  CheckoutCost: ResolverTypeWrapper<ApiCheckoutCost>;
  CheckoutCreateInput: ApiCheckoutCreateInput;
  CheckoutCurrencyCodeUpdateInput: ApiCheckoutCurrencyCodeUpdateInput;
  CheckoutCustomerIdentity: ResolverTypeWrapper<ApiCheckoutCustomerIdentity>;
  CheckoutCustomerIdentityUpdateInput: ApiCheckoutCustomerIdentityUpdateInput;
  CheckoutCustomerNoteUpdateInput: ApiCheckoutCustomerNoteUpdateInput;
  CheckoutDeliveryAddress: ResolverTypeWrapper<ApiCheckoutDeliveryAddress>;
  CheckoutDeliveryAddressInput: ApiCheckoutDeliveryAddressInput;
  CheckoutDeliveryAddressUpdateInput: ApiCheckoutDeliveryAddressUpdateInput;
  CheckoutDeliveryAddressesAddInput: ApiCheckoutDeliveryAddressesAddInput;
  CheckoutDeliveryAddressesRemoveInput: ApiCheckoutDeliveryAddressesRemoveInput;
  CheckoutDeliveryAddressesUpdateInput: ApiCheckoutDeliveryAddressesUpdateInput;
  CheckoutDeliveryDestinationInput: ApiCheckoutDeliveryDestinationInput;
  CheckoutDeliveryGroup: ResolverTypeWrapper<
    Omit<ApiCheckoutDeliveryGroup, "checkoutLines"> & {
      checkoutLines: Array<ApiResolversTypes["CheckoutLine"]>;
    }
  >;
  CheckoutDeliveryMethodType: ApiCheckoutDeliveryMethodType;
  CheckoutDeliveryMethodUpdateInput: ApiCheckoutDeliveryMethodUpdateInput;
  CheckoutDeliveryOption: ResolverTypeWrapper<ApiCheckoutDeliveryOption>;
  CheckoutDeliveryOptionSelection: ResolverTypeWrapper<ApiCheckoutDeliveryOptionSelection>;
  CheckoutDeliveryRecipientUpdateInput: ApiCheckoutDeliveryRecipientUpdateInput;
  CheckoutDeliveryRecipientsAddInput: ApiCheckoutDeliveryRecipientsAddInput;
  CheckoutDeliveryRecipientsRemoveInput: ApiCheckoutDeliveryRecipientsRemoveInput;
  CheckoutDeliveryRecipientsUpdateInput: ApiCheckoutDeliveryRecipientsUpdateInput;
  CheckoutIssue: ResolverTypeWrapper<ApiCheckoutIssue>;
  CheckoutIssueEffect: ApiCheckoutIssueEffect;
  CheckoutIssueSeverity: ApiCheckoutIssueSeverity;
  CheckoutLanguageCodeUpdateInput: ApiCheckoutLanguageCodeUpdateInput;
  CheckoutLifecycleStatus: ApiCheckoutLifecycleStatus;
  CheckoutLine: ResolverTypeWrapper<
    Omit<ApiCheckoutLine, "children" | "cost" | "parent" | "purchasable"> & {
      children: Array<ApiResolversTypes["CheckoutLine"]>;
      cost: ApiResolversTypes["CheckoutLineCost"];
      parent: Maybe<ApiResolversTypes["CheckoutLine"]>;
      purchasable: ApiResolversTypes["Purchasable"];
    }
  >;
  CheckoutLineAddInput: ApiCheckoutLineAddInput;
  CheckoutLineCost: ResolverTypeWrapper<ApiCheckoutLineCost>;
  CheckoutLinePriceConfig: ResolverTypeWrapper<ApiCheckoutLinePriceConfig>;
  CheckoutLinePurchase: ResolverTypeWrapper<ApiCheckoutLinePurchase>;
  CheckoutLinePurchaseInput: ApiCheckoutLinePurchaseInput;
  CheckoutLinePurchaseType: ApiCheckoutLinePurchaseType;
  CheckoutLineReplaceInput: ApiCheckoutLineReplaceInput;
  CheckoutLineUpdateInput: ApiCheckoutLineUpdateInput;
  CheckoutLinesAddInput: ApiCheckoutLinesAddInput;
  CheckoutLinesClearInput: ApiCheckoutLinesClearInput;
  CheckoutLinesDeleteInput: ApiCheckoutLinesDeleteInput;
  CheckoutLinesReplaceInput: ApiCheckoutLinesReplaceInput;
  CheckoutLinesUpdateInput: ApiCheckoutLinesUpdateInput;
  CheckoutLoyaltyRedemption: ResolverTypeWrapper<ApiCheckoutLoyaltyRedemption>;
  CheckoutLoyaltyRedemptionRemoveInput: ApiCheckoutLoyaltyRedemptionRemoveInput;
  CheckoutLoyaltyRedemptionUpdateInput: ApiCheckoutLoyaltyRedemptionUpdateInput;
  CheckoutMutationPayload: ResolverTypeWrapper<
    Omit<ApiCheckoutMutationPayload, "checkout"> & {
      checkout: Maybe<ApiResolversTypes["Checkout"]>;
    }
  >;
  CheckoutNotification: ResolverTypeWrapper<ApiCheckoutNotification>;
  CheckoutNotificationCode: ApiCheckoutNotificationCode;
  CheckoutPayment: ResolverTypeWrapper<ApiCheckoutPayment>;
  CheckoutPaymentMethod: ResolverTypeWrapper<ApiCheckoutPaymentMethod>;
  CheckoutPaymentMethodSelection: ResolverTypeWrapper<ApiCheckoutPaymentMethodSelection>;
  CheckoutPaymentMethodUpdateInput: ApiCheckoutPaymentMethodUpdateInput;
  CheckoutPlacementState: ApiCheckoutPlacementState;
  CheckoutPromoCode: ResolverTypeWrapper<ApiCheckoutPromoCode>;
  CheckoutPromoCodeAddInput: ApiCheckoutPromoCodeAddInput;
  CheckoutPromoCodeRemoveInput: ApiCheckoutPromoCodeRemoveInput;
  CheckoutRecipient: ResolverTypeWrapper<ApiCheckoutRecipient>;
  CheckoutRecipientInput: ApiCheckoutRecipientInput;
  CheckoutSelectionResetReason: ResolverTypeWrapper<ApiCheckoutSelectionResetReason>;
  CheckoutSelectionStatus: ApiCheckoutSelectionStatus;
  CheckoutTag: ResolverTypeWrapper<ApiCheckoutTag>;
  CheckoutTagCreateInput: ApiCheckoutTagCreateInput;
  CheckoutTagDeleteInput: ApiCheckoutTagDeleteInput;
  CheckoutTagInput: ApiCheckoutTagInput;
  CheckoutTagUpdateInput: ApiCheckoutTagUpdateInput;
  CheckoutUserError: ResolverTypeWrapper<ApiCheckoutUserError>;
  ChildPriceType: ApiChildPriceType;
  Color: ResolverTypeWrapper<Scalars["Color"]["output"]>;
  Connection: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>["Connection"]>;
  CountryCode: ApiCountryCode;
  CurrencyCode: ApiCurrencyCode;
  Cursor: ResolverTypeWrapper<Scalars["Cursor"]["output"]>;
  Customer: ResolverTypeWrapper<ApiCustomer>;
  DateTime: ResolverTypeWrapper<Scalars["DateTime"]["output"]>;
  Decimal: ResolverTypeWrapper<Scalars["Decimal"]["output"]>;
  DimensionUnit: ApiDimensionUnit;
  Dimensions: ResolverTypeWrapper<ApiDimensions>;
  DisplayableError: ResolverTypeWrapper<
    ApiResolversInterfaceTypes<ApiResolversTypes>["DisplayableError"]
  >;
  Email: ResolverTypeWrapper<Scalars["Email"]["output"]>;
  Float: ResolverTypeWrapper<Scalars["Float"]["output"]>;
  HTML: ResolverTypeWrapper<Scalars["HTML"]["output"]>;
  ID: ResolverTypeWrapper<Scalars["ID"]["output"]>;
  ISO8601DateTime: ResolverTypeWrapper<Scalars["ISO8601DateTime"]["output"]>;
  Int: ResolverTypeWrapper<Scalars["Int"]["output"]>;
  JSON: ResolverTypeWrapper<Scalars["JSON"]["output"]>;
  LocaleCode: ApiLocaleCode;
  MediaImage: ResolverTypeWrapper<ApiMediaImage>;
  Money: ResolverTypeWrapper<ApiMoney>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>["Node"]>;
  NotificationSeverity: ApiNotificationSeverity;
  PageInfo: ResolverTypeWrapper<ApiPageInfo>;
  PaymentFlow: ApiPaymentFlow;
  PlaceOrderCustomerAction: ResolverTypeWrapper<ApiPlaceOrderCustomerAction>;
  PlaceOrderCustomerActionType: ApiPlaceOrderCustomerActionType;
  PlaceOrderInput: ApiPlaceOrderInput;
  PlaceOrderPayload: ResolverTypeWrapper<ApiPlaceOrderPayload>;
  PlaceOrderPaymentFailure: ResolverTypeWrapper<ApiPlaceOrderPaymentFailure>;
  PlaceOrderPaymentFailureCategory: ApiPlaceOrderPaymentFailureCategory;
  PlaceOrderStatus: ApiPlaceOrderStatus;
  PriceAdjustmentOperation: ApiPriceAdjustmentOperation;
  PriceAdjustmentValueType: ApiPriceAdjustmentValueType;
  ProductVariant: ResolverTypeWrapper<ApiProductVariant>;
  Purchasable: ResolverTypeWrapper<ApiResolversUnionTypes<ApiResolversTypes>["Purchasable"]>;
  Query: ResolverTypeWrapper<{}>;
  RichText: ResolverTypeWrapper<ApiRichText>;
  String: ResolverTypeWrapper<Scalars["String"]["output"]>;
  URL: ResolverTypeWrapper<Scalars["URL"]["output"]>;
  UnsignedInt64: ResolverTypeWrapper<Scalars["UnsignedInt64"]["output"]>;
  UserError: ResolverTypeWrapper<ApiUserError>;
  Weight: ResolverTypeWrapper<ApiWeight>;
  WeightUnit: ApiWeightUnit;
};

/** Mapping between all available schema types and the resolvers parents */
export type ApiResolversParentTypes = {
  BigInt: Scalars["BigInt"]["output"];
  Boolean: Scalars["Boolean"]["output"];
  Checkout: Omit<ApiCheckout, "deliveryGroups" | "lines"> & {
    deliveryGroups: Array<ApiResolversParentTypes["CheckoutDeliveryGroup"]>;
    lines: Array<ApiResolversParentTypes["CheckoutLine"]>;
  };
  CheckoutBillingAddress: ApiCheckoutBillingAddress;
  CheckoutBillingAddressInput: ApiCheckoutBillingAddressInput;
  CheckoutBillingAddressUpdateInput: ApiCheckoutBillingAddressUpdateInput;
  CheckoutChildLineInput: ApiCheckoutChildLineInput;
  CheckoutCost: ApiCheckoutCost;
  CheckoutCreateInput: ApiCheckoutCreateInput;
  CheckoutCurrencyCodeUpdateInput: ApiCheckoutCurrencyCodeUpdateInput;
  CheckoutCustomerIdentity: ApiCheckoutCustomerIdentity;
  CheckoutCustomerIdentityUpdateInput: ApiCheckoutCustomerIdentityUpdateInput;
  CheckoutCustomerNoteUpdateInput: ApiCheckoutCustomerNoteUpdateInput;
  CheckoutDeliveryAddress: ApiCheckoutDeliveryAddress;
  CheckoutDeliveryAddressInput: ApiCheckoutDeliveryAddressInput;
  CheckoutDeliveryAddressUpdateInput: ApiCheckoutDeliveryAddressUpdateInput;
  CheckoutDeliveryAddressesAddInput: ApiCheckoutDeliveryAddressesAddInput;
  CheckoutDeliveryAddressesRemoveInput: ApiCheckoutDeliveryAddressesRemoveInput;
  CheckoutDeliveryAddressesUpdateInput: ApiCheckoutDeliveryAddressesUpdateInput;
  CheckoutDeliveryDestinationInput: ApiCheckoutDeliveryDestinationInput;
  CheckoutDeliveryGroup: Omit<ApiCheckoutDeliveryGroup, "checkoutLines"> & {
    checkoutLines: Array<ApiResolversParentTypes["CheckoutLine"]>;
  };
  CheckoutDeliveryMethodUpdateInput: ApiCheckoutDeliveryMethodUpdateInput;
  CheckoutDeliveryOption: ApiCheckoutDeliveryOption;
  CheckoutDeliveryOptionSelection: ApiCheckoutDeliveryOptionSelection;
  CheckoutDeliveryRecipientUpdateInput: ApiCheckoutDeliveryRecipientUpdateInput;
  CheckoutDeliveryRecipientsAddInput: ApiCheckoutDeliveryRecipientsAddInput;
  CheckoutDeliveryRecipientsRemoveInput: ApiCheckoutDeliveryRecipientsRemoveInput;
  CheckoutDeliveryRecipientsUpdateInput: ApiCheckoutDeliveryRecipientsUpdateInput;
  CheckoutIssue: ApiCheckoutIssue;
  CheckoutLanguageCodeUpdateInput: ApiCheckoutLanguageCodeUpdateInput;
  CheckoutLine: Omit<ApiCheckoutLine, "children" | "cost" | "parent" | "purchasable"> & {
    children: Array<ApiResolversParentTypes["CheckoutLine"]>;
    cost: ApiResolversParentTypes["CheckoutLineCost"];
    parent: Maybe<ApiResolversParentTypes["CheckoutLine"]>;
    purchasable: ApiResolversParentTypes["Purchasable"];
  };
  CheckoutLineAddInput: ApiCheckoutLineAddInput;
  CheckoutLineCost: ApiCheckoutLineCost;
  CheckoutLinePriceConfig: ApiCheckoutLinePriceConfig;
  CheckoutLinePurchase: ApiCheckoutLinePurchase;
  CheckoutLinePurchaseInput: ApiCheckoutLinePurchaseInput;
  CheckoutLineReplaceInput: ApiCheckoutLineReplaceInput;
  CheckoutLineUpdateInput: ApiCheckoutLineUpdateInput;
  CheckoutLinesAddInput: ApiCheckoutLinesAddInput;
  CheckoutLinesClearInput: ApiCheckoutLinesClearInput;
  CheckoutLinesDeleteInput: ApiCheckoutLinesDeleteInput;
  CheckoutLinesReplaceInput: ApiCheckoutLinesReplaceInput;
  CheckoutLinesUpdateInput: ApiCheckoutLinesUpdateInput;
  CheckoutLoyaltyRedemption: ApiCheckoutLoyaltyRedemption;
  CheckoutLoyaltyRedemptionRemoveInput: ApiCheckoutLoyaltyRedemptionRemoveInput;
  CheckoutLoyaltyRedemptionUpdateInput: ApiCheckoutLoyaltyRedemptionUpdateInput;
  CheckoutMutationPayload: Omit<ApiCheckoutMutationPayload, "checkout"> & {
    checkout: Maybe<ApiResolversParentTypes["Checkout"]>;
  };
  CheckoutNotification: ApiCheckoutNotification;
  CheckoutPayment: ApiCheckoutPayment;
  CheckoutPaymentMethod: ApiCheckoutPaymentMethod;
  CheckoutPaymentMethodSelection: ApiCheckoutPaymentMethodSelection;
  CheckoutPaymentMethodUpdateInput: ApiCheckoutPaymentMethodUpdateInput;
  CheckoutPromoCode: ApiCheckoutPromoCode;
  CheckoutPromoCodeAddInput: ApiCheckoutPromoCodeAddInput;
  CheckoutPromoCodeRemoveInput: ApiCheckoutPromoCodeRemoveInput;
  CheckoutRecipient: ApiCheckoutRecipient;
  CheckoutRecipientInput: ApiCheckoutRecipientInput;
  CheckoutSelectionResetReason: ApiCheckoutSelectionResetReason;
  CheckoutTag: ApiCheckoutTag;
  CheckoutTagCreateInput: ApiCheckoutTagCreateInput;
  CheckoutTagDeleteInput: ApiCheckoutTagDeleteInput;
  CheckoutTagInput: ApiCheckoutTagInput;
  CheckoutTagUpdateInput: ApiCheckoutTagUpdateInput;
  CheckoutUserError: ApiCheckoutUserError;
  Color: Scalars["Color"]["output"];
  Connection: ApiResolversInterfaceTypes<ApiResolversParentTypes>["Connection"];
  Cursor: Scalars["Cursor"]["output"];
  Customer: ApiCustomer;
  DateTime: Scalars["DateTime"]["output"];
  Decimal: Scalars["Decimal"]["output"];
  Dimensions: ApiDimensions;
  DisplayableError: ApiResolversInterfaceTypes<ApiResolversParentTypes>["DisplayableError"];
  Email: Scalars["Email"]["output"];
  Float: Scalars["Float"]["output"];
  HTML: Scalars["HTML"]["output"];
  ID: Scalars["ID"]["output"];
  ISO8601DateTime: Scalars["ISO8601DateTime"]["output"];
  Int: Scalars["Int"]["output"];
  JSON: Scalars["JSON"]["output"];
  MediaImage: ApiMediaImage;
  Money: ApiMoney;
  Mutation: {};
  Node: ApiResolversInterfaceTypes<ApiResolversParentTypes>["Node"];
  PageInfo: ApiPageInfo;
  PlaceOrderCustomerAction: ApiPlaceOrderCustomerAction;
  PlaceOrderInput: ApiPlaceOrderInput;
  PlaceOrderPayload: ApiPlaceOrderPayload;
  PlaceOrderPaymentFailure: ApiPlaceOrderPaymentFailure;
  ProductVariant: ApiProductVariant;
  Purchasable: ApiResolversUnionTypes<ApiResolversParentTypes>["Purchasable"];
  Query: {};
  RichText: ApiRichText;
  String: Scalars["String"]["output"];
  URL: Scalars["URL"]["output"];
  UnsignedInt64: Scalars["UnsignedInt64"]["output"];
  UserError: ApiUserError;
  Weight: ApiWeight;
};

export interface ApiBigIntScalarConfig extends GraphQLScalarTypeConfig<
  ApiResolversTypes["BigInt"],
  any
> {
  name: "BigInt";
}

export type ApiCheckoutResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["Checkout"] = ApiResolversParentTypes["Checkout"],
> = {
  appliedPromoCodes: Resolver<
    Array<ApiResolversTypes["CheckoutPromoCode"]>,
    ParentType,
    ContextType
  >;
  billingAddress: Resolver<
    Maybe<ApiResolversTypes["CheckoutBillingAddress"]>,
    ParentType,
    ContextType
  >;
  channelCode: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  cost: Resolver<ApiResolversTypes["CheckoutCost"], ParentType, ContextType>;
  createdAt: Resolver<ApiResolversTypes["DateTime"], ParentType, ContextType>;
  currencyCode: Resolver<ApiResolversTypes["CurrencyCode"], ParentType, ContextType>;
  customerIdentity: Resolver<
    ApiResolversTypes["CheckoutCustomerIdentity"],
    ParentType,
    ContextType
  >;
  customerNote: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  deliveryGroups: Resolver<
    Array<ApiResolversTypes["CheckoutDeliveryGroup"]>,
    ParentType,
    ContextType
  >;
  expiresAt: Resolver<ApiResolversTypes["DateTime"], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes["ID"], ParentType, ContextType>;
  issues: Resolver<Array<ApiResolversTypes["CheckoutIssue"]>, ParentType, ContextType>;
  lines: Resolver<Array<ApiResolversTypes["CheckoutLine"]>, ParentType, ContextType>;
  localeCode: Resolver<ApiResolversTypes["LocaleCode"], ParentType, ContextType>;
  loyaltyRedemption: Resolver<
    Maybe<ApiResolversTypes["CheckoutLoyaltyRedemption"]>,
    ParentType,
    ContextType
  >;
  loyaltyRewardEntitlementId: Resolver<Maybe<ApiResolversTypes["ID"]>, ParentType, ContextType>;
  notifications: Resolver<
    Array<ApiResolversTypes["CheckoutNotification"]>,
    ParentType,
    ContextType
  >;
  payment: Resolver<ApiResolversTypes["CheckoutPayment"], ParentType, ContextType>;
  status: Resolver<ApiResolversTypes["CheckoutLifecycleStatus"], ParentType, ContextType>;
  tags: Resolver<Array<ApiResolversTypes["CheckoutTag"]>, ParentType, ContextType>;
  totalQuantity: Resolver<ApiResolversTypes["Int"], ParentType, ContextType>;
  updatedAt: Resolver<ApiResolversTypes["DateTime"], ParentType, ContextType>;
  valid: Resolver<ApiResolversTypes["Boolean"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutBillingAddressResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutBillingAddress"] =
    ApiResolversParentTypes["CheckoutBillingAddress"],
> = {
  address1: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  address2: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  city: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  company: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  country: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  countryCode: Resolver<Maybe<ApiResolversTypes["CountryCode"]>, ParentType, ContextType>;
  data: Resolver<Maybe<ApiResolversTypes["JSON"]>, ParentType, ContextType>;
  firstName: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  formatted: Resolver<Array<ApiResolversTypes["String"]>, ParentType, ContextType>;
  formattedArea: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  lastName: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  name: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  phone: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  province: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  provinceCode: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  zip: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutCostResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutCost"] =
    ApiResolversParentTypes["CheckoutCost"],
> = {
  subtotalAmount: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  totalAmount: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  totalDiscountAmount: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  totalShippingAmount: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  totalTaxAmount: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutCustomerIdentityResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutCustomerIdentity"] =
    ApiResolversParentTypes["CheckoutCustomerIdentity"],
> = {
  countryCode: Resolver<Maybe<ApiResolversTypes["CountryCode"]>, ParentType, ContextType>;
  customer: Resolver<Maybe<ApiResolversTypes["Customer"]>, ParentType, ContextType>;
  email: Resolver<Maybe<ApiResolversTypes["Email"]>, ParentType, ContextType>;
  firstName: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  lastName: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  middleName: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  phone: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutDeliveryAddressResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutDeliveryAddress"] =
    ApiResolversParentTypes["CheckoutDeliveryAddress"],
> = {
  address1: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  address2: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  city: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  company: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  country: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  countryCode: Resolver<Maybe<ApiResolversTypes["CountryCode"]>, ParentType, ContextType>;
  data: Resolver<Maybe<ApiResolversTypes["JSON"]>, ParentType, ContextType>;
  firstName: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  formatted: Resolver<Array<ApiResolversTypes["String"]>, ParentType, ContextType>;
  formattedArea: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  id: Resolver<Maybe<ApiResolversTypes["ID"]>, ParentType, ContextType>;
  lastName: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  name: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  phone: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  province: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  provinceCode: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  zip: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutDeliveryGroupResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutDeliveryGroup"] =
    ApiResolversParentTypes["CheckoutDeliveryGroup"],
> = {
  checkoutLines: Resolver<Array<ApiResolversTypes["CheckoutLine"]>, ParentType, ContextType>;
  deliveryAddress: Resolver<
    Maybe<ApiResolversTypes["CheckoutDeliveryAddress"]>,
    ParentType,
    ContextType
  >;
  id: Resolver<ApiResolversTypes["ID"], ParentType, ContextType>;
  options: Resolver<Array<ApiResolversTypes["CheckoutDeliveryOption"]>, ParentType, ContextType>;
  recipient: Resolver<Maybe<ApiResolversTypes["CheckoutRecipient"]>, ParentType, ContextType>;
  selection: Resolver<
    ApiResolversTypes["CheckoutDeliveryOptionSelection"],
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutDeliveryOptionResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutDeliveryOption"] =
    ApiResolversParentTypes["CheckoutDeliveryOption"],
> = {
  carrierCode: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  code: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  cost: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  customerInputContract: Resolver<Maybe<ApiResolversTypes["JSON"]>, ParentType, ContextType>;
  deliveryMethodType: Resolver<
    ApiResolversTypes["CheckoutDeliveryMethodType"],
    ParentType,
    ContextType
  >;
  description: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  estimatedMaxDeliveryAt: Resolver<Maybe<ApiResolversTypes["DateTime"]>, ParentType, ContextType>;
  estimatedMinDeliveryAt: Resolver<Maybe<ApiResolversTypes["DateTime"]>, ParentType, ContextType>;
  handle: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  phoneRequired: Resolver<ApiResolversTypes["Boolean"], ParentType, ContextType>;
  publicData: Resolver<ApiResolversTypes["JSON"], ParentType, ContextType>;
  title: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutDeliveryOptionSelectionResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutDeliveryOptionSelection"] =
    ApiResolversParentTypes["CheckoutDeliveryOptionSelection"],
> = {
  option: Resolver<Maybe<ApiResolversTypes["CheckoutDeliveryOption"]>, ParentType, ContextType>;
  previousOptionHandle: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  resetReason: Resolver<
    Maybe<ApiResolversTypes["CheckoutSelectionResetReason"]>,
    ParentType,
    ContextType
  >;
  status: Resolver<ApiResolversTypes["CheckoutSelectionStatus"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutIssueResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutIssue"] =
    ApiResolversParentTypes["CheckoutIssue"],
> = {
  code: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  effect: Resolver<ApiResolversTypes["CheckoutIssueEffect"], ParentType, ContextType>;
  field: Resolver<Array<ApiResolversTypes["String"]>, ParentType, ContextType>;
  lineId: Resolver<Maybe<ApiResolversTypes["ID"]>, ParentType, ContextType>;
  message: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  retryable: Resolver<ApiResolversTypes["Boolean"], ParentType, ContextType>;
  severity: Resolver<ApiResolversTypes["CheckoutIssueSeverity"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLineResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutLine"] =
    ApiResolversParentTypes["CheckoutLine"],
> = {
  attributes: Resolver<ApiResolversTypes["JSON"], ParentType, ContextType>;
  children: Resolver<Array<ApiResolversTypes["CheckoutLine"]>, ParentType, ContextType>;
  componentItemId: Resolver<Maybe<ApiResolversTypes["ID"]>, ParentType, ContextType>;
  cost: Resolver<ApiResolversTypes["CheckoutLineCost"], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes["ID"], ParentType, ContextType>;
  image: Resolver<Maybe<ApiResolversTypes["MediaImage"]>, ParentType, ContextType>;
  originalPrice: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  parent: Resolver<Maybe<ApiResolversTypes["CheckoutLine"]>, ParentType, ContextType>;
  priceConfig: Resolver<
    Maybe<ApiResolversTypes["CheckoutLinePriceConfig"]>,
    ParentType,
    ContextType
  >;
  purchasable: Resolver<ApiResolversTypes["Purchasable"], ParentType, ContextType>;
  purchasableId: Resolver<ApiResolversTypes["ID"], ParentType, ContextType>;
  purchase: Resolver<ApiResolversTypes["CheckoutLinePurchase"], ParentType, ContextType>;
  quantity: Resolver<ApiResolversTypes["Int"], ParentType, ContextType>;
  sku: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  tag: Resolver<Maybe<ApiResolversTypes["CheckoutTag"]>, ParentType, ContextType>;
  title: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLineCostResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutLineCost"] =
    ApiResolversParentTypes["CheckoutLineCost"],
> = {
  compareAtUnitPrice: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  discountAmount: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  subtotalAmount: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  taxAmount: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  totalAmount: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  unitPrice: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLinePriceConfigResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutLinePriceConfig"] =
    ApiResolversParentTypes["CheckoutLinePriceConfig"],
> = {
  amount: Resolver<Maybe<ApiResolversTypes["Int"]>, ParentType, ContextType>;
  percent: Resolver<Maybe<ApiResolversTypes["Float"]>, ParentType, ContextType>;
  type: Resolver<ApiResolversTypes["ChildPriceType"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLinePurchaseResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutLinePurchase"] =
    ApiResolversParentTypes["CheckoutLinePurchase"],
> = {
  type: Resolver<ApiResolversTypes["CheckoutLinePurchaseType"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLoyaltyRedemptionResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutLoyaltyRedemption"] =
    ApiResolversParentTypes["CheckoutLoyaltyRedemption"],
> = {
  accountId: Resolver<ApiResolversTypes["ID"], ParentType, ContextType>;
  availablePoints: Resolver<ApiResolversTypes["BigInt"], ParentType, ContextType>;
  discount: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  expiresAt: Resolver<ApiResolversTypes["DateTime"], ParentType, ContextType>;
  payableAfterLoyalty: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  programCode: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  programId: Resolver<ApiResolversTypes["ID"], ParentType, ContextType>;
  programVersion: Resolver<ApiResolversTypes["Int"], ParentType, ContextType>;
  quoteId: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  redeemablePoints: Resolver<ApiResolversTypes["BigInt"], ParentType, ContextType>;
  requestedPoints: Resolver<Maybe<ApiResolversTypes["BigInt"]>, ParentType, ContextType>;
  revision: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutMutationPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutMutationPayload"] =
    ApiResolversParentTypes["CheckoutMutationPayload"],
> = {
  checkout: Resolver<Maybe<ApiResolversTypes["Checkout"]>, ParentType, ContextType>;
  userErrors: Resolver<Array<ApiResolversTypes["CheckoutUserError"]>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutNotificationResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutNotification"] =
    ApiResolversParentTypes["CheckoutNotification"],
> = {
  code: Resolver<ApiResolversTypes["CheckoutNotificationCode"], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes["ID"], ParentType, ContextType>;
  isDismissed: Resolver<ApiResolversTypes["Boolean"], ParentType, ContextType>;
  severity: Resolver<ApiResolversTypes["NotificationSeverity"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutPaymentResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutPayment"] =
    ApiResolversParentTypes["CheckoutPayment"],
> = {
  methods: Resolver<Array<ApiResolversTypes["CheckoutPaymentMethod"]>, ParentType, ContextType>;
  payableAmount: Resolver<ApiResolversTypes["Money"], ParentType, ContextType>;
  selection: Resolver<ApiResolversTypes["CheckoutPaymentMethodSelection"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutPaymentMethodResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutPaymentMethod"] =
    ApiResolversParentTypes["CheckoutPaymentMethod"],
> = {
  code: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  flow: Resolver<ApiResolversTypes["PaymentFlow"], ParentType, ContextType>;
  handle: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  providerCode: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  title: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutPaymentMethodSelectionResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutPaymentMethodSelection"] =
    ApiResolversParentTypes["CheckoutPaymentMethodSelection"],
> = {
  method: Resolver<Maybe<ApiResolversTypes["CheckoutPaymentMethod"]>, ParentType, ContextType>;
  previousMethodHandle: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  resetReason: Resolver<
    Maybe<ApiResolversTypes["CheckoutSelectionResetReason"]>,
    ParentType,
    ContextType
  >;
  status: Resolver<ApiResolversTypes["CheckoutSelectionStatus"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutPromoCodeResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutPromoCode"] =
    ApiResolversParentTypes["CheckoutPromoCode"],
> = {
  appliedAt: Resolver<ApiResolversTypes["DateTime"], ParentType, ContextType>;
  code: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  conditions: Resolver<Maybe<ApiResolversTypes["JSON"]>, ParentType, ContextType>;
  discountType: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  provider: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  value: Resolver<ApiResolversTypes["Int"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutRecipientResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutRecipient"] =
    ApiResolversParentTypes["CheckoutRecipient"],
> = {
  email: Resolver<Maybe<ApiResolversTypes["Email"]>, ParentType, ContextType>;
  firstName: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  lastName: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  middleName: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  phone: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutSelectionResetReasonResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutSelectionResetReason"] =
    ApiResolversParentTypes["CheckoutSelectionResetReason"],
> = {
  code: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  message: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutTagResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutTag"] =
    ApiResolversParentTypes["CheckoutTag"],
> = {
  createdAt: Resolver<ApiResolversTypes["DateTime"], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes["ID"], ParentType, ContextType>;
  slug: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  unique: Resolver<ApiResolversTypes["Boolean"], ParentType, ContextType>;
  updatedAt: Resolver<ApiResolversTypes["DateTime"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutUserErrorResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["CheckoutUserError"] =
    ApiResolversParentTypes["CheckoutUserError"],
> = {
  code: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  field: Resolver<Maybe<Array<ApiResolversTypes["String"]>>, ParentType, ContextType>;
  message: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  retryable: Resolver<ApiResolversTypes["Boolean"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiColorScalarConfig extends GraphQLScalarTypeConfig<
  ApiResolversTypes["Color"],
  any
> {
  name: "Color";
}

export type ApiConnectionResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["Connection"] = ApiResolversParentTypes["Connection"],
> = {
  __resolveType: TypeResolveFn<null, ParentType, ContextType>;
  pageInfo: Resolver<ApiResolversTypes["PageInfo"], ParentType, ContextType>;
  totalCount: Resolver<ApiResolversTypes["Int"], ParentType, ContextType>;
};

export interface ApiCursorScalarConfig extends GraphQLScalarTypeConfig<
  ApiResolversTypes["Cursor"],
  any
> {
  name: "Cursor";
}

export type ApiCustomerResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["Customer"] = ApiResolversParentTypes["Customer"],
> = {
  id: Resolver<ApiResolversTypes["ID"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiDateTimeScalarConfig extends GraphQLScalarTypeConfig<
  ApiResolversTypes["DateTime"],
  any
> {
  name: "DateTime";
}

export interface ApiDecimalScalarConfig extends GraphQLScalarTypeConfig<
  ApiResolversTypes["Decimal"],
  any
> {
  name: "Decimal";
}

export type ApiDimensionsResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["Dimensions"] = ApiResolversParentTypes["Dimensions"],
> = {
  height: Resolver<ApiResolversTypes["Float"], ParentType, ContextType>;
  length: Resolver<ApiResolversTypes["Float"], ParentType, ContextType>;
  unit: Resolver<ApiResolversTypes["DimensionUnit"], ParentType, ContextType>;
  width: Resolver<ApiResolversTypes["Float"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiDisplayableErrorResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["DisplayableError"] =
    ApiResolversParentTypes["DisplayableError"],
> = {
  __resolveType: TypeResolveFn<"CheckoutUserError" | "UserError", ParentType, ContextType>;
  field: Resolver<Maybe<Array<ApiResolversTypes["String"]>>, ParentType, ContextType>;
  message: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
};

export interface ApiEmailScalarConfig extends GraphQLScalarTypeConfig<
  ApiResolversTypes["Email"],
  any
> {
  name: "Email";
}

export interface ApiHtmlScalarConfig extends GraphQLScalarTypeConfig<
  ApiResolversTypes["HTML"],
  any
> {
  name: "HTML";
}

export interface ApiIso8601DateTimeScalarConfig extends GraphQLScalarTypeConfig<
  ApiResolversTypes["ISO8601DateTime"],
  any
> {
  name: "ISO8601DateTime";
}

export interface ApiJsonScalarConfig extends GraphQLScalarTypeConfig<
  ApiResolversTypes["JSON"],
  any
> {
  name: "JSON";
}

export type ApiMediaImageResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["MediaImage"] = ApiResolversParentTypes["MediaImage"],
> = {
  id: Resolver<ApiResolversTypes["ID"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiMoneyResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["Money"] = ApiResolversParentTypes["Money"],
> = {
  amount: Resolver<ApiResolversTypes["Decimal"], ParentType, ContextType>;
  currencyCode: Resolver<ApiResolversTypes["CurrencyCode"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiMutationResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["Mutation"] = ApiResolversParentTypes["Mutation"],
> = {
  checkoutBillingAddressUpdate: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutBillingAddressUpdateArgs, "input">
  >;
  checkoutCreate: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutCreateArgs, "input">
  >;
  checkoutCurrencyCodeUpdate: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutCurrencyCodeUpdateArgs, "input">
  >;
  checkoutCustomerIdentityUpdate: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutCustomerIdentityUpdateArgs, "input">
  >;
  checkoutCustomerNoteUpdate: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutCustomerNoteUpdateArgs, "input">
  >;
  checkoutDeliveryAddressesAdd: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutDeliveryAddressesAddArgs, "input">
  >;
  checkoutDeliveryAddressesRemove: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutDeliveryAddressesRemoveArgs, "input">
  >;
  checkoutDeliveryAddressesUpdate: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutDeliveryAddressesUpdateArgs, "input">
  >;
  checkoutDeliveryMethodUpdate: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutDeliveryMethodUpdateArgs, "input">
  >;
  checkoutDeliveryRecipientsAdd: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutDeliveryRecipientsAddArgs, "input">
  >;
  checkoutDeliveryRecipientsRemove: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutDeliveryRecipientsRemoveArgs, "input">
  >;
  checkoutDeliveryRecipientsUpdate: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutDeliveryRecipientsUpdateArgs, "input">
  >;
  checkoutLanguageCodeUpdate: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutLanguageCodeUpdateArgs, "input">
  >;
  checkoutLinesAdd: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutLinesAddArgs, "input">
  >;
  checkoutLinesClear: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutLinesClearArgs, "input">
  >;
  checkoutLinesDelete: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutLinesDeleteArgs, "input">
  >;
  checkoutLinesReplace: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutLinesReplaceArgs, "input">
  >;
  checkoutLinesUpdate: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutLinesUpdateArgs, "input">
  >;
  checkoutLoyaltyRedemptionRemove: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutLoyaltyRedemptionRemoveArgs, "input">
  >;
  checkoutLoyaltyRedemptionUpdate: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutLoyaltyRedemptionUpdateArgs, "input">
  >;
  checkoutPaymentMethodUpdate: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutPaymentMethodUpdateArgs, "input">
  >;
  checkoutPromoCodeAdd: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutPromoCodeAddArgs, "input">
  >;
  checkoutPromoCodeRemove: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutPromoCodeRemoveArgs, "input">
  >;
  checkoutTagCreate: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutTagCreateArgs, "input">
  >;
  checkoutTagDelete: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutTagDeleteArgs, "input">
  >;
  checkoutTagUpdate: Resolver<
    ApiResolversTypes["CheckoutMutationPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationCheckoutTagUpdateArgs, "input">
  >;
  placeOrder: Resolver<
    ApiResolversTypes["PlaceOrderPayload"],
    ParentType,
    ContextType,
    RequireFields<ApiMutationPlaceOrderArgs, "input">
  >;
};

export type ApiNodeResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["Node"] = ApiResolversParentTypes["Node"],
> = {
  __resolveType: TypeResolveFn<
    "Checkout" | "CheckoutLine" | "CheckoutTag",
    ParentType,
    ContextType
  >;
  id: Resolver<ApiResolversTypes["ID"], ParentType, ContextType>;
};

export type ApiPageInfoResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["PageInfo"] = ApiResolversParentTypes["PageInfo"],
> = {
  endCursor: Resolver<Maybe<ApiResolversTypes["Cursor"]>, ParentType, ContextType>;
  hasNextPage: Resolver<ApiResolversTypes["Boolean"], ParentType, ContextType>;
  hasPreviousPage: Resolver<ApiResolversTypes["Boolean"], ParentType, ContextType>;
  startCursor: Resolver<Maybe<ApiResolversTypes["Cursor"]>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiPlaceOrderCustomerActionResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["PlaceOrderCustomerAction"] =
    ApiResolversParentTypes["PlaceOrderCustomerAction"],
> = {
  data: Resolver<Maybe<ApiResolversTypes["JSON"]>, ParentType, ContextType>;
  expiresAt: Resolver<Maybe<ApiResolversTypes["DateTime"]>, ParentType, ContextType>;
  instructions: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  title: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  type: Resolver<ApiResolversTypes["PlaceOrderCustomerActionType"], ParentType, ContextType>;
  url: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiPlaceOrderPayloadResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["PlaceOrderPayload"] =
    ApiResolversParentTypes["PlaceOrderPayload"],
> = {
  checkoutId: Resolver<Maybe<ApiResolversTypes["ID"]>, ParentType, ContextType>;
  customerAction: Resolver<
    Maybe<ApiResolversTypes["PlaceOrderCustomerAction"]>,
    ParentType,
    ContextType
  >;
  orderId: Resolver<Maybe<ApiResolversTypes["ID"]>, ParentType, ContextType>;
  paymentCollectionId: Resolver<Maybe<ApiResolversTypes["ID"]>, ParentType, ContextType>;
  paymentFailure: Resolver<
    Maybe<ApiResolversTypes["PlaceOrderPaymentFailure"]>,
    ParentType,
    ContextType
  >;
  paymentOperationId: Resolver<Maybe<ApiResolversTypes["ID"]>, ParentType, ContextType>;
  paymentSessionId: Resolver<Maybe<ApiResolversTypes["ID"]>, ParentType, ContextType>;
  placementId: Resolver<Maybe<ApiResolversTypes["ID"]>, ParentType, ContextType>;
  placementState: Resolver<
    Maybe<ApiResolversTypes["CheckoutPlacementState"]>,
    ParentType,
    ContextType
  >;
  status: Resolver<Maybe<ApiResolversTypes["PlaceOrderStatus"]>, ParentType, ContextType>;
  userErrors: Resolver<Array<ApiResolversTypes["CheckoutUserError"]>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiPlaceOrderPaymentFailureResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["PlaceOrderPaymentFailure"] =
    ApiResolversParentTypes["PlaceOrderPaymentFailure"],
> = {
  category: Resolver<
    ApiResolversTypes["PlaceOrderPaymentFailureCategory"],
    ParentType,
    ContextType
  >;
  code: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  message: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  providerCode: Resolver<Maybe<ApiResolversTypes["String"]>, ParentType, ContextType>;
  retryable: Resolver<ApiResolversTypes["Boolean"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiProductVariantResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["ProductVariant"] =
    ApiResolversParentTypes["ProductVariant"],
> = {
  id: Resolver<ApiResolversTypes["ID"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiPurchasableResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["Purchasable"] =
    ApiResolversParentTypes["Purchasable"],
> = {
  __resolveType: TypeResolveFn<"ProductVariant", ParentType, ContextType>;
};

export type ApiQueryResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["Query"] = ApiResolversParentTypes["Query"],
> = {
  checkout: Resolver<
    Maybe<ApiResolversTypes["Checkout"]>,
    ParentType,
    ContextType,
    RequireFields<ApiQueryCheckoutArgs, "id">
  >;
  checkoutPlacement: Resolver<
    Maybe<ApiResolversTypes["PlaceOrderPayload"]>,
    ParentType,
    ContextType,
    RequireFields<ApiQueryCheckoutPlacementArgs, "id">
  >;
};

export type ApiRichTextResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["RichText"] = ApiResolversParentTypes["RichText"],
> = {
  html: Resolver<ApiResolversTypes["HTML"], ParentType, ContextType>;
  json: Resolver<ApiResolversTypes["JSON"], ParentType, ContextType>;
  text: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiUrlScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes["URL"], any> {
  name: "URL";
}

export interface ApiUnsignedInt64ScalarConfig extends GraphQLScalarTypeConfig<
  ApiResolversTypes["UnsignedInt64"],
  any
> {
  name: "UnsignedInt64";
}

export type ApiUserErrorResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["UserError"] = ApiResolversParentTypes["UserError"],
> = {
  field: Resolver<Maybe<Array<ApiResolversTypes["String"]>>, ParentType, ContextType>;
  message: Resolver<ApiResolversTypes["String"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiWeightResolvers<
  ContextType = GraphQLContext,
  ParentType extends ApiResolversParentTypes["Weight"] = ApiResolversParentTypes["Weight"],
> = {
  unit: Resolver<ApiResolversTypes["WeightUnit"], ParentType, ContextType>;
  value: Resolver<ApiResolversTypes["Float"], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiResolvers<ContextType = GraphQLContext> = {
  BigInt: GraphQLScalarType;
  Checkout: ApiCheckoutResolvers<ContextType>;
  CheckoutBillingAddress: ApiCheckoutBillingAddressResolvers<ContextType>;
  CheckoutCost: ApiCheckoutCostResolvers<ContextType>;
  CheckoutCustomerIdentity: ApiCheckoutCustomerIdentityResolvers<ContextType>;
  CheckoutDeliveryAddress: ApiCheckoutDeliveryAddressResolvers<ContextType>;
  CheckoutDeliveryGroup: ApiCheckoutDeliveryGroupResolvers<ContextType>;
  CheckoutDeliveryOption: ApiCheckoutDeliveryOptionResolvers<ContextType>;
  CheckoutDeliveryOptionSelection: ApiCheckoutDeliveryOptionSelectionResolvers<ContextType>;
  CheckoutIssue: ApiCheckoutIssueResolvers<ContextType>;
  CheckoutLine: ApiCheckoutLineResolvers<ContextType>;
  CheckoutLineCost: ApiCheckoutLineCostResolvers<ContextType>;
  CheckoutLinePriceConfig: ApiCheckoutLinePriceConfigResolvers<ContextType>;
  CheckoutLinePurchase: ApiCheckoutLinePurchaseResolvers<ContextType>;
  CheckoutLoyaltyRedemption: ApiCheckoutLoyaltyRedemptionResolvers<ContextType>;
  CheckoutMutationPayload: ApiCheckoutMutationPayloadResolvers<ContextType>;
  CheckoutNotification: ApiCheckoutNotificationResolvers<ContextType>;
  CheckoutPayment: ApiCheckoutPaymentResolvers<ContextType>;
  CheckoutPaymentMethod: ApiCheckoutPaymentMethodResolvers<ContextType>;
  CheckoutPaymentMethodSelection: ApiCheckoutPaymentMethodSelectionResolvers<ContextType>;
  CheckoutPromoCode: ApiCheckoutPromoCodeResolvers<ContextType>;
  CheckoutRecipient: ApiCheckoutRecipientResolvers<ContextType>;
  CheckoutSelectionResetReason: ApiCheckoutSelectionResetReasonResolvers<ContextType>;
  CheckoutTag: ApiCheckoutTagResolvers<ContextType>;
  CheckoutUserError: ApiCheckoutUserErrorResolvers<ContextType>;
  Color: GraphQLScalarType;
  Connection: ApiConnectionResolvers<ContextType>;
  Cursor: GraphQLScalarType;
  Customer: ApiCustomerResolvers<ContextType>;
  DateTime: GraphQLScalarType;
  Decimal: GraphQLScalarType;
  Dimensions: ApiDimensionsResolvers<ContextType>;
  DisplayableError: ApiDisplayableErrorResolvers<ContextType>;
  Email: GraphQLScalarType;
  HTML: GraphQLScalarType;
  ISO8601DateTime: GraphQLScalarType;
  JSON: GraphQLScalarType;
  MediaImage: ApiMediaImageResolvers<ContextType>;
  Money: ApiMoneyResolvers<ContextType>;
  Mutation: ApiMutationResolvers<ContextType>;
  Node: ApiNodeResolvers<ContextType>;
  PageInfo: ApiPageInfoResolvers<ContextType>;
  PlaceOrderCustomerAction: ApiPlaceOrderCustomerActionResolvers<ContextType>;
  PlaceOrderPayload: ApiPlaceOrderPayloadResolvers<ContextType>;
  PlaceOrderPaymentFailure: ApiPlaceOrderPaymentFailureResolvers<ContextType>;
  ProductVariant: ApiProductVariantResolvers<ContextType>;
  Purchasable: ApiPurchasableResolvers<ContextType>;
  Query: ApiQueryResolvers<ContextType>;
  RichText: ApiRichTextResolvers<ContextType>;
  URL: GraphQLScalarType;
  UnsignedInt64: GraphQLScalarType;
  UserError: ApiUserErrorResolvers<ContextType>;
  Weight: ApiWeightResolvers<ContextType>;
};

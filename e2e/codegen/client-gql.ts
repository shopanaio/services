export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: any; output: any; }
  Cursor: { input: string; output: string; }
  DateTime: { input: string; output: string; }
  Decimal: { input: number; output: number; }
  Email: { input: string; output: string; }
  JSON: { input: object; output: object; }
  TransportOptions: { input: any; output: any; }
};

export type ApiCheckout = {
  __typename?: 'Checkout';
  /** Payment aggregate for this checkout. */
  payment: ApiCheckoutPayment;
};

/**
 * Input data for a child item in a bundle.
 * Price configuration is automatically taken from ProductGroup in the database.
 */
export type ApiCheckoutChildLineInput = {
  /**
   * ID of the purchasable for child item.
   * Must be a variant that exists in parent product's groups.
   */
  purchasableId: Scalars['ID']['input'];
  /** Snapshot data for child purchasable. */
  purchasableSnapshot?: InputMaybe<ApiPurchasableSnapshotInput>;
  /** Quantity of the child item. */
  quantity: Scalars['Int']['input'];
};

/** All monetary calculations related to the checkout. */
export type ApiCheckoutCost = {
  __typename?: 'CheckoutCost';
  /** Total value of items before any discounts. */
  subtotalAmount: ApiMoney;
  /** Final amount to be paid, including item cost, shipping, and taxes. */
  totalAmount: ApiMoney;
  /** Total discount from both item-level and checkout-level promotions. */
  totalDiscountAmount: ApiMoney;
  /** Total shipping cost (only MERCHANT_COLLECTED payments). */
  totalShippingAmount: ApiMoney;
  /** Total tax amount applied to the checkout. */
  totalTaxAmount: ApiMoney;
};

/** Input data for creating a new checkout. */
export type ApiCheckoutCreateInput = {
  /** Display currency code for all items. ISO 4217 (3 letters, e.g., "USD", "EUR") */
  currencyCode: CurrencyCode;
  /** ID of the external source for the checkout. */
  externalId?: InputMaybe<Scalars['String']['input']>;
  /** Source of sales for the checkout. */
  externalSource?: InputMaybe<Scalars['String']['input']>;
  /** Initial items to add to the new checkout. */
  items: Array<ApiCheckoutLineAddInput>;
  /** Locale code for the checkout. ISO 639-1 (2 letters, e.g., "en", "ru") */
  localeCode: Scalars['String']['input'];
  /** Optional tag definitions to initialize for this checkout. */
  tags?: InputMaybe<Array<ApiCheckoutTagInput>>;
};

/** Payload returned after creating a checkout. */
export type ApiCheckoutCreatePayload = {
  __typename?: 'CheckoutCreatePayload';
  /** The newly created checkout. */
  checkout?: Maybe<ApiCheckout>;
  /** List of field-specific or general errors. */
  errors?: Maybe<Array<ApiCheckoutFieldError>>;
};

/** Input data for updating the display currency of the checkout. */
export type ApiCheckoutCurrencyCodeUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
  /** Currency code according to ISO 4217 (e.g., "USD", "EUR"). */
  currencyCode: CurrencyCode;
};

export type ApiCheckoutCustomerIdentity = {
  __typename?: 'CheckoutCustomerIdentity';
  /** Country code of the customer. */
  countryCode?: Maybe<CountryCode>;
  /** Customer associated with the checkout. */
  customer?: Maybe<ApiUser>;
  /** Customer email address associated with the checkout. */
  email?: Maybe<Scalars['Email']['output']>;
  /** First name of the customer. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** Last name of the customer. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** Middle name of the customer. */
  middleName?: Maybe<Scalars['String']['output']>;
  /** Phone number of the customer. */
  phone?: Maybe<Scalars['String']['output']>;
};

/** Input data for updating customer identification data associated with the checkout. */
export type ApiCheckoutCustomerIdentityUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
  /**
   * Country code of the customer.
   * ISO 3166-1 alpha-2.
   */
  countryCode?: InputMaybe<CountryCode>;
  /**
   * Customer identifier in external/internal system.
   * Used to link the checkout with an existing customer.
   */
  customerId?: InputMaybe<Scalars['ID']['input']>;
  /** Customer's email address. If specified, will be linked to the checkout. */
  email?: InputMaybe<Scalars['Email']['input']>;
  /** First name of the customer. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** Last name of the customer. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** Middle name of the customer. */
  middleName?: InputMaybe<Scalars['String']['input']>;
  /** Phone number of the customer. */
  phone?: InputMaybe<Scalars['String']['input']>;
};

/** Input data for updating the customer note attached to the checkout. */
export type ApiCheckoutCustomerNoteUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
  /**
   * Text of the customer note (delivery instructions, etc.).
   * Empty value clears the note.
   */
  note?: InputMaybe<Scalars['String']['input']>;
};

/** Delivery address associated with a checkout. */
export type ApiCheckoutDeliveryAddress = {
  __typename?: 'CheckoutDeliveryAddress';
  /** Primary address line. */
  address1?: Maybe<Scalars['String']['output']>;
  /** Secondary address line. */
  address2?: Maybe<Scalars['String']['output']>;
  /** City name. */
  city?: Maybe<Scalars['String']['output']>;
  /** Country code (ISO 3166-1 alpha-2). */
  countryCode?: Maybe<CountryCode>;
  /** Data associated with the delivery address. */
  data?: Maybe<Scalars['JSON']['output']>;
  /** Unique identifier for the delivery address. */
  id?: Maybe<Scalars['ID']['output']>;
  /** Postal code. */
  postalCode?: Maybe<Scalars['String']['output']>;
  /** Province code. */
  provinceCode?: Maybe<Scalars['String']['output']>;
};

export type ApiCheckoutDeliveryAddressInput = {
  /** Primary address line. */
  address1?: InputMaybe<Scalars['String']['input']>;
  /** Secondary address line. */
  address2?: InputMaybe<Scalars['String']['input']>;
  /** City name. */
  city?: InputMaybe<Scalars['String']['input']>;
  /** Country code (ISO 3166-1 alpha-2). */
  countryCode?: InputMaybe<CountryCode>;
  /** Data associated with the delivery address. */
  data?: InputMaybe<Scalars['JSON']['input']>;
  /** Email address for this delivery address. */
  email?: InputMaybe<Scalars['Email']['input']>;
  /** First name for delivery. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** Last name for delivery. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** Postal code. */
  postalCode?: InputMaybe<Scalars['String']['input']>;
  /** Province code. */
  provinceCode?: InputMaybe<Scalars['String']['input']>;
};

/** Delivery address update element: which address to update and with what data. */
export type ApiCheckoutDeliveryAddressUpdateInput = {
  /** New postal address values. */
  address: ApiCheckoutDeliveryAddressInput;
  /** Identifier of the existing delivery address in the checkout. */
  addressId: Scalars['ID']['input'];
};

/**
 * Input data for adding one or more delivery addresses to the checkout.
 * Supports multi-shipping.
 */
export type ApiCheckoutDeliveryAddressesAddInput = {
  /** List of delivery addresses to be added. */
  addresses: Array<ApiCheckoutDeliveryAddressInput>;
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
};

/** Input data for removing one or more delivery addresses from the checkout. */
export type ApiCheckoutDeliveryAddressesRemoveInput = {
  /** Identifiers of delivery addresses to be removed. */
  addressIds: Array<Scalars['ID']['input']>;
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
};

/** Input data for batch updating previously added delivery addresses. */
export type ApiCheckoutDeliveryAddressesUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
  /** List of updates for delivery addresses. */
  updates: Array<ApiCheckoutDeliveryAddressUpdateInput>;
};

/** Delivery group for one or more checkout lines. */
export type ApiCheckoutDeliveryGroup = {
  __typename?: 'CheckoutDeliveryGroup';
  /** Checkout lines associated with the delivery group. */
  checkoutLines: Array<ApiCheckoutLine>;
  /** Delivery address associated with the delivery group. */
  deliveryAddress?: Maybe<ApiCheckoutDeliveryAddress>;
  /** Delivery methods associated with the delivery group. */
  deliveryMethods: Array<ApiCheckoutDeliveryMethod>;
  /** Estimated cost of the delivery group. */
  estimatedCost?: Maybe<ApiDeliveryCost>;
  /** Unique identifier for the delivery group. */
  id: Scalars['ID']['output'];
  /** Recipient associated with the delivery group. */
  recipient?: Maybe<ApiCheckoutRecipient>;
  /** Selected delivery method associated with the delivery group. */
  selectedDeliveryMethod?: Maybe<ApiCheckoutDeliveryMethod>;
};

export type ApiCheckoutDeliveryMethod = {
  __typename?: 'CheckoutDeliveryMethod';
  /** Code of the shipping method (e.g., "standard", "express", "courier"). */
  code: Scalars['String']['output'];
  /**
   * Arbitrary customer-provided data for the selected delivery method.
   * Will be stored in checkout_delivery_methods.customer_input.
   */
  data: Scalars['JSON']['output'];
  /** Delivery method type associated with the delivery option. */
  deliveryMethodType: CheckoutDeliveryMethodType;
  /** Provider data associated with the delivery method. */
  provider: ApiCheckoutDeliveryProvider;
};

export type CheckoutDeliveryMethodType =
  /** Pickup delivery method. */
  | 'PICKUP'
  /** Shipping delivery method. */
  | 'SHIPPING';

/**
 * Input data for selecting/changing delivery method.
 * Can be applied to the entire checkout or to a specific delivery address.
 */
export type ApiCheckoutDeliveryMethodUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
  /**
   * Arbitrary customer-provided data for the selected delivery method.
   * Will be stored in checkout_delivery_methods.customer_input.
   */
  data?: InputMaybe<Scalars['JSON']['input']>;
  /** Identifier of the delivery group for which the delivery method is selected. */
  deliveryGroupId: Scalars['ID']['input'];
  /** Provider code (e.g., "novaposhta", "ups", "fedex", "dhl", "usps"). */
  provider: Scalars['String']['input'];
  /** Code of the delivery method available for this checkout/address. */
  shippingMethodCode: Scalars['String']['input'];
};

export type ApiCheckoutDeliveryProvider = {
  __typename?: 'CheckoutDeliveryProvider';
  /** Code of the provider (e.g., "novaposhta", "ups", "fedex", "dhl", "usps"). */
  code: Scalars['String']['output'];
};

/** Recipient update element: which delivery group's recipient to update and with what data. */
export type ApiCheckoutDeliveryRecipientUpdateInput = {
  /** Identifier of the delivery group in the checkout. */
  deliveryGroupId: Scalars['ID']['input'];
  /** New recipient values. */
  recipient: ApiCheckoutRecipientInput;
};

/** Input data for adding recipients for delivery groups. */
export type ApiCheckoutDeliveryRecipientsAddInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
  /** List of recipients to be added for delivery groups. */
  recipients: Array<ApiCheckoutDeliveryRecipientUpdateInput>;
};

/** Input data for removing recipients associated with delivery groups. */
export type ApiCheckoutDeliveryRecipientsRemoveInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
  /** Identifiers of delivery groups whose recipients should be removed. */
  deliveryGroupIds: Array<Scalars['ID']['input']>;
};

/** Input data for batch updating recipients for delivery groups. */
export type ApiCheckoutDeliveryRecipientsUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
  /** List of updates for recipients. */
  updates: Array<ApiCheckoutDeliveryRecipientUpdateInput>;
};

export type ApiCheckoutFieldError = {
  __typename?: 'CheckoutFieldError';
  /** The field that caused the error. */
  field: Scalars['String']['output'];
  /** The error message. */
  message: Scalars['String']['output'];
};

/** Input data for updating the language/locale code of the checkout. */
export type ApiCheckoutLanguageCodeUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
  /**
   * Language/locale code (ISO 639-1, BCP 47 if necessary), e.g. "en", "ru", "uk".
   * Affects localization and formatting.
   */
  localeCode: Scalars['String']['input'];
};

/** A single item in a checkout. */
export type ApiCheckoutLine = ApiNode & {
  __typename?: 'CheckoutLine';
  /** A list of components that make up this checkout line, such as individual products in a bundle. */
  children: Array<ApiCheckoutLine>;
  /** Cost calculations for this checkout item. */
  cost: ApiCheckoutLineCost;
  /** Global unique identifier for the checkout line. */
  id: Scalars['ID']['output'];
  /** Image URL of the purchasable. */
  imageSrc?: Maybe<Scalars['String']['output']>;
  /** Original price before any adjustments (e.g., child price config). */
  originalPrice: ApiMoney;
  /** Price adjustment applied to this line (for child items in bundles). */
  priceConfig?: Maybe<ApiCheckoutLinePriceConfig>;
  /** ID of the purchasable. */
  purchasableId: Scalars['ID']['output'];
  /** Purchasable snapshot data at the time of adding to checkout. */
  purchasableSnapshot: Scalars['JSON']['output'];
  /** Quantity of the item being purchased. */
  quantity: Scalars['Int']['output'];
  /** SKU of the purchasable. */
  sku?: Maybe<Scalars['String']['output']>;
  /** Optional tag assigned to this checkout line. */
  tag?: Maybe<ApiCheckoutTag>;
  /** Title of the purchasable. */
  title: Scalars['String']['output'];
};

/** Input data for a single item in the checkout. */
export type ApiCheckoutLineAddInput = {
  /** Child items for this line. If provided, this line becomes a parent. */
  children?: InputMaybe<Array<ApiCheckoutChildLineInput>>;
  /** ID of the product to add or update. */
  purchasableId: Scalars['ID']['input'];
  /** ID of the purchasable snapshot to add or update. */
  purchasableSnapshot?: InputMaybe<ApiPurchasableSnapshotInput>;
  /** Quantity of the product in the checkout. */
  quantity: Scalars['Int']['input'];
  /** Optional tag slug to associate with this line. */
  tagSlug?: InputMaybe<Scalars['String']['input']>;
};

/** Detailed breakdown of costs for a checkout line item */
export type ApiCheckoutLineCost = {
  __typename?: 'CheckoutLineCost';
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
  __typename?: 'CheckoutLinePriceConfig';
  /** Amount in minor units (always positive). Used for DISCOUNT_AMOUNT, MARKUP_AMOUNT, OVERRIDE. */
  amount?: Maybe<Scalars['Int']['output']>;
  /** Percentage (always positive). Used for DISCOUNT_PERCENT, MARKUP_PERCENT. */
  percent?: Maybe<Scalars['Float']['output']>;
  /** Type of price adjustment. */
  type: ChildPriceType;
};

/** Single replacement operation. */
export type ApiCheckoutLineReplaceInput = {
  /** Source line ID to replace (quantity will be moved from this line). */
  lineId: Scalars['ID']['input'];
  /** Target purchasable ID to receive the quantity. */
  purchasableId: Scalars['ID']['input'];
  /**
   * Quantity to move; if not set, moves full quantity from source line.
   * Must be greater than 0 if provided.
   */
  quantity?: InputMaybe<Scalars['Int']['input']>;
};

/** Input data for updating the quantity of a specific checkout item. */
export type ApiCheckoutLineUpdateInput = {
  /** ID of the checkout item to update. */
  lineId: Scalars['ID']['input'];
  /**
   * New quantity for the checkout item.
   * If set to 0, the item will be removed.
   */
  quantity: Scalars['Int']['input'];
};

/** Input data for adding an item to an existing checkout. */
export type ApiCheckoutLinesAddInput = {
  /** ID of the checkout. */
  checkoutId: Scalars['ID']['input'];
  /** List of checkout items to add. */
  lines: Array<ApiCheckoutLineAddInput>;
};

/** Payload returned after adding an item to the checkout. */
export type ApiCheckoutLinesAddPayload = {
  __typename?: 'CheckoutLinesAddPayload';
  /** The updated checkout. */
  checkout?: Maybe<ApiCheckout>;
  /** List of field-specific or general errors. */
  errors?: Maybe<Array<ApiCheckoutFieldError>>;
};

/** Input data for clearing all items from a checkout. */
export type ApiCheckoutLinesClearInput = {
  /** ID of the checkout to clear. */
  checkoutId: Scalars['ID']['input'];
};

/** Payload returned after clearing all items from the checkout. */
export type ApiCheckoutLinesClearPayload = {
  __typename?: 'CheckoutLinesClearPayload';
  /** The updated (now empty) checkout. */
  checkout?: Maybe<ApiCheckout>;
  /** List of field-specific or general errors. */
  errors?: Maybe<Array<ApiCheckoutFieldError>>;
};

/** Input data for removing one or more items from the checkout. */
export type ApiCheckoutLinesDeleteInput = {
  /** ID of the checkout. */
  checkoutId: Scalars['ID']['input'];
  /** IDs of the lines to remove. */
  lineIds: Array<Scalars['ID']['input']>;
};

/** Payload returned after removing an item from the checkout. */
export type ApiCheckoutLinesDeletePayload = {
  __typename?: 'CheckoutLinesDeletePayload';
  /** The updated checkout. */
  checkout?: Maybe<ApiCheckout>;
  /** List of field-specific or general errors. */
  errors?: Maybe<Array<ApiCheckoutFieldError>>;
};

/**
 * Input data for replacing one or more checkout lines.
 * Each replacement moves quantity from source line to target line.
 * If quantity is not provided, full quantity from the source line will be moved.
 */
export type ApiCheckoutLinesReplaceInput = {
  /** ID of the checkout. */
  checkoutId: Scalars['ID']['input'];
  /** List of replacement operations to apply. */
  lines: Array<ApiCheckoutLineReplaceInput>;
};

/** Payload returned after replacing one checkout line with another. */
export type ApiCheckoutLinesReplacePayload = {
  __typename?: 'CheckoutLinesReplacePayload';
  /** The updated checkout. */
  checkout?: Maybe<ApiCheckout>;
  /** List of field-specific or general errors. */
  errors?: Maybe<Array<ApiCheckoutFieldError>>;
};

/** Input data for updating the quantity of a specific checkout item. */
export type ApiCheckoutLinesUpdateInput = {
  /** ID of the checkout. */
  checkoutId: Scalars['ID']['input'];
  /** List of checkout items to update. */
  lines: Array<ApiCheckoutLineUpdateInput>;
};

/** Payload returned after updating a checkout item's quantity. */
export type ApiCheckoutLinesUpdatePayload = {
  __typename?: 'CheckoutLinesUpdatePayload';
  /** The updated checkout. */
  checkout?: Maybe<ApiCheckout>;
  /** List of field-specific or general errors. */
  errors?: Maybe<Array<ApiCheckoutFieldError>>;
};

export type ApiCheckoutMutation = {
  __typename?: 'CheckoutMutation';
  /** Selects or changes the payment method for the checkout. */
  checkoutPaymentMethodUpdate: ApiCheckout;
};


export type ApiCheckoutMutationCheckoutPaymentMethodUpdateArgs = {
  input: ApiCheckoutPaymentMethodUpdateInput;
};

/** A non-blocking warning generated by checkout operations. */
export type ApiCheckoutNotification = {
  __typename?: 'CheckoutNotification';
  /** Code categorizing the warning. */
  code: CheckoutNotificationCode;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** Whether the warning has been acknowledged by the user. */
  isDismissed: Scalars['Boolean']['output'];
  /** Importance level of the warning. */
  severity: NotificationSeverity;
};

/**
 * Codes for warnings that may be returned with Checkout mutations,
 * indicating non-blocking adjustments or issues in the checkout.
 */
export type CheckoutNotificationCode =
  /** An item in the checkout is no longer available for sale. */
  | 'ITEM_UNAVAILABLE'
  /**
   * The requested quantity exceeds available stock;
   * quantity was automatically reduced to the maximum available.
   */
  | 'NOT_ENOUGH_STOCK'
  /** The requested item is completely out of stock and has been removed from the checkout. */
  | 'OUT_OF_STOCK'
  /** The price of one or more items has changed since they were added to the checkout. */
  | 'PRICE_CHANGED';

/** Payment aggregate for a checkout. */
export type ApiCheckoutPayment = {
  __typename?: 'CheckoutPayment';
  /**
   * Amount payable to the merchant via the selected method.
   * This excludes SHIPPING_CARRIER components (CARRIER_DIRECT).
   */
  payableAmount: ApiMoney;
  /** Available payment methods for this checkout context. */
  paymentMethods: Array<ApiCheckoutPaymentMethod>;
  /** Selected payment method, if any. */
  selectedPaymentMethod?: Maybe<ApiCheckoutPaymentMethod>;
};

/** Payment method available/selected for checkout. */
export type ApiCheckoutPaymentMethod = {
  __typename?: 'CheckoutPaymentMethod';
  /** Method code (e.g., "card", "apple_pay", "bank_transfer", "cod"). */
  code: Scalars['String']['output'];
  /**
   * Arbitrary customer-provided data for the selected payment method.
   * Will be stored in checkout_payment_methods.customer_input.
   */
  data: Scalars['JSON']['output'];
  /** Payment flow (ONLINE vs ON_DELIVERY). */
  flow: PaymentFlow;
  /** Provider data associated with the payment method. */
  provider: ApiCheckoutPaymentProvider;
};

/** Constraints for payment method availability (from payment-plugin-sdk). */
export type ApiCheckoutPaymentMethodConstraints = {
  __typename?: 'CheckoutPaymentMethodConstraints';
  /**
   * Limit to specific shipping method codes. If empty, all shipping methods are allowed.
   * Code includes shipping provider code.
   */
  shippingMethods: Array<Scalars['String']['output']>;
};

/** Select or change payment method for the checkout. */
export type ApiCheckoutPaymentMethodUpdateInput = {
  /** Checkout identifier. */
  checkoutId: Scalars['ID']['input'];
  /**
   * Arbitrary customer-provided data for the selected payment method.
   * Will be stored in checkout_payment_methods.customer_input.
   */
  data?: InputMaybe<Scalars['JSON']['input']>;
  /** Code of the payment method available for this checkout. */
  paymentMethodCode: Scalars['String']['input'];
  /** Provider code (e.g., "stripe", "liqpay", "monobank", "paypal"). */
  provider: Scalars['String']['input'];
};

export type ApiCheckoutPaymentProvider = {
  __typename?: 'CheckoutPaymentProvider';
  /** Code of the provider (e.g., "stripe", "liqpay", "monobank", "paypal"). */
  code: Scalars['String']['output'];
};

/** Applied promo code for a checkout. */
export type ApiCheckoutPromoCode = {
  __typename?: 'CheckoutPromoCode';
  /** When this promo code was applied. */
  appliedAt: Scalars['DateTime']['output'];
  /** Promo code text. */
  code: Scalars['String']['output'];
  /** Discount conditions. */
  conditions?: Maybe<Scalars['JSON']['output']>;
  /** Discount type (percentage). */
  discountType: Scalars['String']['output'];
  /** Discount provider. */
  provider: Scalars['String']['output'];
  /** Discount value (percentage as number). */
  value: Scalars['Int']['output'];
};

/** Input data for applying a promo code to the checkout. */
export type ApiCheckoutPromoCodeAddInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
  /** Text code of the coupon/promo code. */
  code: Scalars['String']['input'];
};

/** Input data for removing a previously applied promo code from the checkout. */
export type ApiCheckoutPromoCodeRemoveInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
  /** Text code of the coupon/promo code to be cancelled. */
  code: Scalars['String']['input'];
};

export type ApiCheckoutQuery = {
  __typename?: 'CheckoutQuery';
  /** Get a checkout by its ID. */
  checkout?: Maybe<ApiCheckout>;
};


export type ApiCheckoutQueryCheckoutArgs = {
  id: Scalars['ID']['input'];
};

/** Recipient details for the delivery group. */
export type ApiCheckoutRecipient = {
  __typename?: 'CheckoutRecipient';
  /** Email of the recipient. */
  email?: Maybe<Scalars['Email']['output']>;
  /** First name of the recipient. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** Last name of the recipient. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** Middle name of the recipient. */
  middleName?: Maybe<Scalars['String']['output']>;
  /** Phone of the recipient. */
  phone?: Maybe<Scalars['String']['output']>;
};

/** Input fields for recipient details. */
export type ApiCheckoutRecipientInput = {
  /** Email of the recipient. */
  email?: InputMaybe<Scalars['Email']['input']>;
  /** First name of the recipient. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** Last name of the recipient. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** Middle name of the recipient. */
  middleName?: InputMaybe<Scalars['String']['input']>;
  /** Phone of the recipient. */
  phone?: InputMaybe<Scalars['String']['input']>;
};

/** A tag that can be attached to checkout lines. */
export type ApiCheckoutTag = ApiNode & {
  __typename?: 'CheckoutTag';
  /** Tag creation timestamp. */
  createdAt: Scalars['DateTime']['output'];
  /** Global identifier of the tag. */
  id: Scalars['ID']['output'];
  /** Slug identifier (a-zA-Z0-9). */
  slug: Scalars['String']['output'];
  /** Whether the tag enforces uniqueness for checkout lines. */
  unique: Scalars['Boolean']['output'];
  /** Last update timestamp. */
  updatedAt: Scalars['DateTime']['output'];
};

/** Input payload for checkoutTagCreate mutation. */
export type ApiCheckoutTagCreateInput = {
  /** Checkout identifier. */
  checkoutId: Scalars['ID']['input'];
  /** Tag configuration. */
  tag: ApiCheckoutTagInput;
};

/** Input payload for checkoutTagDelete mutation. */
export type ApiCheckoutTagDeleteInput = {
  /** Checkout identifier. */
  checkoutId: Scalars['ID']['input'];
  /** Tag identifier (global ID). */
  tagId: Scalars['ID']['input'];
};

/** Tag definition used when initializing or mutating checkout tags. */
export type ApiCheckoutTagInput = {
  /** Slug identifier consisting of alphanumeric characters. */
  slug: Scalars['String']['input'];
  /** Whether this tag enforces uniqueness for checkout lines. */
  unique: Scalars['Boolean']['input'];
};

/** Input payload for checkoutTagUpdate mutation. */
export type ApiCheckoutTagUpdateInput = {
  /** Checkout identifier. */
  checkoutId: Scalars['ID']['input'];
  /** New slug, if tag needs to be renamed. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** Tag identifier (global ID). */
  tagId: Scalars['ID']['input'];
  /** Updated uniqueness flag. */
  unique?: InputMaybe<Scalars['Boolean']['input']>;
};

/**
 * Price adjustment type for child items in a bundle.
 * Values are always positive - the type determines the operation.
 */
export type ChildPriceType =
  /** Use original price without adjustments */
  | 'BASE'
  /** Subtract fixed amount from original price */
  | 'DISCOUNT_AMOUNT'
  /** Subtract percentage from original price */
  | 'DISCOUNT_PERCENT'
  /** Item is free (price = 0) */
  | 'FREE'
  /** Add fixed amount to original price */
  | 'MARKUP_AMOUNT'
  /** Add percentage to original price */
  | 'MARKUP_PERCENT'
  /** Override with fixed price */
  | 'OVERRIDE';

export type CountryCode =
  /** Andorra */
  | 'AD'
  /** United Arab Emirates */
  | 'AE'
  /** Afghanistan */
  | 'AF'
  /** Antigua and Barbuda */
  | 'AG'
  /** Albania */
  | 'AL'
  /** Armenia */
  | 'AM'
  /** Angola */
  | 'AO'
  /** Argentina */
  | 'AR'
  /** Austria */
  | 'AT'
  /** Australia */
  | 'AU'
  /** Aruba */
  | 'AW'
  /** Åland Islands */
  | 'AX'
  /** Azerbaijan */
  | 'AZ'
  /** Bosnia and Herzegovina */
  | 'BA'
  /** Barbados */
  | 'BB'
  /** Bangladesh */
  | 'BD'
  /** Belgium */
  | 'BE'
  /** Burkina Faso */
  | 'BF'
  /** Bulgaria */
  | 'BG'
  /** Bahrain */
  | 'BH'
  /** Burundi */
  | 'BI'
  /** Benin */
  | 'BJ'
  /** Bermuda */
  | 'BM'
  /** Brunei */
  | 'BN'
  /** Bolivia */
  | 'BO'
  /** Brazil */
  | 'BR'
  /** Bahamas */
  | 'BS'
  /** Bhutan */
  | 'BT'
  /** Botswana */
  | 'BW'
  /** Belarus */
  | 'BY'
  /** Belize */
  | 'BZ'
  /** Canada */
  | 'CA'
  /** Democratic Republic of the Congo */
  | 'CD'
  /** Central African Republic */
  | 'CF'
  /** Republic of the Congo */
  | 'CG'
  /** Switzerland */
  | 'CH'
  /** Ivory Coast */
  | 'CI'
  /** Chile */
  | 'CL'
  /** Cameroon */
  | 'CM'
  /** China */
  | 'CN'
  /** Colombia */
  | 'CO'
  /** Costa Rica */
  | 'CR'
  /** Cuba */
  | 'CU'
  /** Cape Verde */
  | 'CV'
  /** Curaçao */
  | 'CW'
  /** Cyprus */
  | 'CY'
  /** Czech Republic */
  | 'CZ'
  /** Germany */
  | 'DE'
  /** Djibouti */
  | 'DJ'
  /** Denmark */
  | 'DK'
  /** Dominica */
  | 'DM'
  /** Dominican Republic */
  | 'DO'
  /** Algeria */
  | 'DZ'
  /** Ecuador */
  | 'EC'
  /** Estonia */
  | 'EE'
  /** Egypt */
  | 'EG'
  /** Western Sahara */
  | 'EH'
  /** Eritrea */
  | 'ER'
  /** Spain */
  | 'ES'
  /** Ethiopia */
  | 'ET'
  /** Finland */
  | 'FI'
  /** Fiji */
  | 'FJ'
  /** Micronesia */
  | 'FM'
  /** Faroe Islands */
  | 'FO'
  /** France */
  | 'FR'
  /** Gabon */
  | 'GA'
  /** United Kingdom */
  | 'GB'
  /** Grenada */
  | 'GD'
  /** Georgia */
  | 'GE'
  /** Guernsey */
  | 'GG'
  /** Ghana */
  | 'GH'
  /** Greenland */
  | 'GL'
  /** Gambia */
  | 'GM'
  /** Guinea */
  | 'GN'
  /** Equatorial Guinea */
  | 'GQ'
  /** Greece */
  | 'GR'
  /** Guatemala */
  | 'GT'
  /** Guinea-Bissau */
  | 'GW'
  /** Guyana */
  | 'GY'
  /** Honduras */
  | 'HN'
  /** Croatia */
  | 'HR'
  /** Haiti */
  | 'HT'
  /** Hungary */
  | 'HU'
  /** Indonesia */
  | 'ID'
  /** Ireland */
  | 'IE'
  /** Israel */
  | 'IL'
  /** Isle of Man */
  | 'IM'
  /** India */
  | 'IN'
  /** Iraq */
  | 'IQ'
  /** Iran */
  | 'IR'
  /** Iceland */
  | 'IS'
  /** Italy */
  | 'IT'
  /** Jersey */
  | 'JE'
  /** Jamaica */
  | 'JM'
  /** Jordan */
  | 'JO'
  /** Japan */
  | 'JP'
  /** Kenya */
  | 'KE'
  /** Kyrgyzstan */
  | 'KG'
  /** Cambodia */
  | 'KH'
  /** Comoros */
  | 'KM'
  /** Saint Kitts and Nevis */
  | 'KN'
  /** North Korea */
  | 'KP'
  /** South Korea */
  | 'KR'
  /** Kuwait */
  | 'KW'
  /** Kazakhstan */
  | 'KZ'
  /** Laos */
  | 'LA'
  /** Lebanon */
  | 'LB'
  /** Saint Lucia */
  | 'LC'
  /** Liechtenstein */
  | 'LI'
  /** Sri Lanka */
  | 'LK'
  /** Liberia */
  | 'LR'
  /** Lesotho */
  | 'LS'
  /** Lithuania */
  | 'LT'
  /** Luxembourg */
  | 'LU'
  /** Latvia */
  | 'LV'
  /** Morocco */
  | 'MA'
  /** Monaco */
  | 'MC'
  /** Moldova */
  | 'MD'
  /** Montenegro */
  | 'ME'
  /** Madagascar */
  | 'MG'
  /** Marshall Islands */
  | 'MH'
  /** North Macedonia */
  | 'MK'
  /** Mali */
  | 'ML'
  /** Myanmar */
  | 'MM'
  /** Mongolia */
  | 'MN'
  /** Mauritania */
  | 'MR'
  /** Malta */
  | 'MT'
  /** Mauritius */
  | 'MU'
  /** Maldives */
  | 'MV'
  /** Malawi */
  | 'MW'
  /** Mexico */
  | 'MX'
  /** Malaysia */
  | 'MY'
  /** Mozambique */
  | 'MZ'
  /** Namibia */
  | 'NA'
  /** New Caledonia */
  | 'NC'
  /** Niger */
  | 'NE'
  /** Nigeria */
  | 'NG'
  /** Nicaragua */
  | 'NI'
  /** Netherlands */
  | 'NL'
  /** Norway */
  | 'NO'
  /** Nepal */
  | 'NP'
  /** New Zealand */
  | 'NZ'
  /** Oman */
  | 'OM'
  /** Panama */
  | 'PA'
  /** Peru */
  | 'PE'
  /** Papua New Guinea */
  | 'PG'
  /** Philippines */
  | 'PH'
  /** Pakistan */
  | 'PK'
  /** Poland */
  | 'PL'
  /** Palestine */
  | 'PS'
  /** Portugal */
  | 'PT'
  /** Palau */
  | 'PW'
  /** Paraguay */
  | 'PY'
  /** Qatar */
  | 'QA'
  /** Romania */
  | 'RO'
  /** Serbia */
  | 'RS'
  /** Russia */
  | 'RU'
  /** Rwanda */
  | 'RW'
  /** Saudi Arabia */
  | 'SA'
  /** Solomon Islands */
  | 'SB'
  /** Seychelles */
  | 'SC'
  /** Sudan */
  | 'SD'
  /** Sweden */
  | 'SE'
  /** Singapore */
  | 'SG'
  /** Slovenia */
  | 'SI'
  /** Slovakia */
  | 'SK'
  /** Sierra Leone */
  | 'SL'
  /** San Marino */
  | 'SM'
  /** Senegal */
  | 'SN'
  /** Suriname */
  | 'SR'
  /** South Sudan */
  | 'SS'
  /** El Salvador */
  | 'SV'
  /** Syria */
  | 'SY'
  /** Swaziland (Eswatini) */
  | 'SZ'
  /** Chad */
  | 'TD'
  /** Togo */
  | 'TG'
  /** Thailand */
  | 'TH'
  /** Tajikistan */
  | 'TJ'
  /** Timor-Leste (East Timor) */
  | 'TL'
  /** Turkmenistan */
  | 'TM'
  /** Tunisia */
  | 'TN'
  /** Tonga */
  | 'TO'
  /** Turkey */
  | 'TR'
  /** Trinidad and Tobago */
  | 'TT'
  /** Tanzania */
  | 'TZ'
  /** Ukraine */
  | 'UA'
  /** Uganda */
  | 'UG'
  /** United States */
  | 'US'
  /** Uruguay */
  | 'UY'
  /** Uzbekistan */
  | 'UZ'
  /** Vatican City */
  | 'VA'
  /** Saint Vincent and the Grenadines */
  | 'VC'
  /** Venezuela */
  | 'VE'
  /** British Virgin Islands */
  | 'VG'
  /** US Virgin Islands */
  | 'VI'
  /** Vietnam */
  | 'VN'
  /** Vanuatu */
  | 'VU'
  /** Samoa */
  | 'WS'
  /** Kosovo */
  | 'XK'
  /** Yemen */
  | 'YE'
  /** South Africa */
  | 'ZA'
  /** Zambia */
  | 'ZM'
  /** Zimbabwe */
  | 'ZW';

export type ApiCreateOrderInput = {
  /** ID of the checkout. */
  checkoutId: Scalars['ID']['input'];
};

/** Currency codes according to ISO 4217 */
export type CurrencyCode =
  /** UAE Dirham (United Arab Emirates) - 2 decimals */
  | 'AED'
  /** Afghan Afghani (Afghanistan) - 0 decimals */
  | 'AFN'
  /** Albanian Lek (Albania) - 0 decimals */
  | 'ALL'
  /** Armenian Dram (Armenia) - 2 decimals */
  | 'AMD'
  /** Netherlands Antillean Guilder - 2 decimals */
  | 'ANG'
  /** Angolan Kwanza (Angola) - 2 decimals */
  | 'AOA'
  /** Argentine Peso (Argentina) - 2 decimals */
  | 'ARS'
  /** Australian Dollar (Australia) - 2 decimals */
  | 'AUD'
  /** Aruban Florin (Aruba) - 2 decimals */
  | 'AWG'
  /** Azerbaijani Manat (Azerbaijan) - 2 decimals */
  | 'AZN'
  /** Bosnia-Herzegovina Convertible Mark - 2 decimals */
  | 'BAM'
  /** Barbadian Dollar (Barbados) - 2 decimals */
  | 'BBD'
  /** Bangladeshi Taka (Bangladesh) - 2 decimals */
  | 'BDT'
  /** Bulgarian Lev (Bulgaria) - 2 decimals */
  | 'BGN'
  /** Bahraini Dinar (Bahrain) - 3 decimals */
  | 'BHD'
  /** Burundian Franc (Burundi) - 0 decimals */
  | 'BIF'
  /** Bermudian Dollar (Bermuda) - 2 decimals */
  | 'BMD'
  /** Brunei Dollar (Brunei) - 2 decimals */
  | 'BND'
  /** Bolivian Boliviano (Bolivia) - 2 decimals */
  | 'BOB'
  /** Brazilian Real (Brazil) - 2 decimals */
  | 'BRL'
  /** Bahamian Dollar (Bahamas) - 2 decimals */
  | 'BSD'
  /** Bhutanese Ngultrum (Bhutan) - 2 decimals */
  | 'BTN'
  /** Botswana Pula (Botswana) - 2 decimals */
  | 'BWP'
  /** Belarusian Ruble (Belarus) - 2 decimals */
  | 'BYN'
  /** Belize Dollar (Belize) - 2 decimals */
  | 'BZD'
  /** Canadian Dollar (Canada) - 2 decimals */
  | 'CAD'
  /** Congolese Franc (DR Congo) - 2 decimals */
  | 'CDF'
  /** Swiss Franc (Switzerland) - 2 decimals */
  | 'CHF'
  /** Chilean Peso (Chile) - 0 decimals */
  | 'CLP'
  /** Chinese Yuan (China) - 2 decimals */
  | 'CNY'
  /** Colombian Peso (Colombia) - 2 decimals */
  | 'COP'
  /** Costa Rican Colon (Costa Rica) - 2 decimals */
  | 'CRC'
  /** Cuban Peso (Cuba) - 2 decimals */
  | 'CUP'
  /** Cape Verdean Escudo (Cape Verde) - 2 decimals */
  | 'CVE'
  /** Czech Koruna (Czech Republic) - 2 decimals */
  | 'CZK'
  /** Djiboutian Franc (Djibouti) - 0 decimals */
  | 'DJF'
  /** Danish Krone (Denmark) - 2 decimals */
  | 'DKK'
  /** Dominican Peso (Dominican Republic) - 2 decimals */
  | 'DOP'
  /** Algerian Dinar (Algeria) - 2 decimals */
  | 'DZD'
  /** Egyptian Pound (Egypt) - 2 decimals */
  | 'EGP'
  /** Eritrean Nakfa (Eritrea) - 2 decimals */
  | 'ERN'
  /** Ethiopian Birr (Ethiopia) - 2 decimals */
  | 'ETB'
  /** Euro (European Union) - 2 decimals */
  | 'EUR'
  /** Fijian Dollar (Fiji) - 2 decimals */
  | 'FJD'
  /** Falkland Islands Pound - 2 decimals */
  | 'FKP'
  /** Faroese Króna (Faroe Islands) - 2 decimals */
  | 'FOK'
  /** Pound Sterling (United Kingdom) - 2 decimals */
  | 'GBP'
  /** Georgian Lari (Georgia) - 2 decimals */
  | 'GEL'
  /** Guernsey Pound (Guernsey) - 2 decimals */
  | 'GGP'
  /** Ghanaian Cedi (Ghana) - 2 decimals */
  | 'GHS'
  /** Gibraltar Pound (Gibraltar) - 2 decimals */
  | 'GIP'
  /** Gambian Dalasi (Gambia) - 2 decimals */
  | 'GMD'
  /** Guinean Franc (Guinea) - 0 decimals */
  | 'GNF'
  /** Guatemalan Quetzal (Guatemala) - 2 decimals */
  | 'GTQ'
  /** Guyanese Dollar (Guyana) - 2 decimals */
  | 'GYD'
  /** Hong Kong Dollar (Hong Kong) - 2 decimals */
  | 'HKD'
  /** Honduran Lempira (Honduras) - 2 decimals */
  | 'HNL'
  /** Croatian Kuna (Croatia) - 2 decimals */
  | 'HRK'
  /** Haitian Gourde (Haiti) - 2 decimals */
  | 'HTG'
  /** Hungarian Forint (Hungary) - 2 decimals */
  | 'HUF'
  /** Indonesian Rupiah (Indonesia) - 0 decimals */
  | 'IDR'
  /** Israeli New Shekel (Israel) - 2 decimals */
  | 'ILS'
  /** Isle of Man Pound - 2 decimals */
  | 'IMP'
  /** Indian Rupee (India) - 2 decimals */
  | 'INR'
  /** Iraqi Dinar (Iraq) - 3 decimals */
  | 'IQD'
  /** Iranian Rial (Iran) - 2 decimals */
  | 'IRR'
  /** Icelandic Króna (Iceland) - 0 decimals */
  | 'ISK'
  /** Jersey Pound (Jersey) - 2 decimals */
  | 'JEP'
  /** Jamaican Dollar (Jamaica) - 2 decimals */
  | 'JMD'
  /** Jordanian Dinar (Jordan) - 3 decimals */
  | 'JOD'
  /** Japanese Yen (Japan) - 0 decimals */
  | 'JPY'
  /** Kenyan Shilling (Kenya) - 2 decimals */
  | 'KES'
  /** Kyrgyzstani Som (Kyrgyzstan) - 2 decimals */
  | 'KGS'
  /** Cambodian Riel (Cambodia) - 2 decimals */
  | 'KHR'
  /** Comorian Franc (Comoros) - 2 decimals */
  | 'KMF'
  /** North Korean Won (North Korea) - 2 decimals */
  | 'KPW'
  /** South Korean Won (South Korea) - 0 decimals */
  | 'KRW'
  /** Kuwaiti Dinar (Kuwait) - 3 decimals */
  | 'KWD'
  /** Cayman Islands Dollar - 2 decimals */
  | 'KYD'
  /** Kazakhstani Tenge (Kazakhstan) - 2 decimals */
  | 'KZT'
  /** Lao Kip (Laos) - 2 decimals */
  | 'LAK'
  /** Lebanese Pound (Lebanon) - 2 decimals */
  | 'LBP'
  /** Sri Lankan Rupee (Sri Lanka) - 2 decimals */
  | 'LKR'
  /** Liberian Dollar (Liberia) - 2 decimals */
  | 'LRD'
  /** Lesotho Loti (Lesotho) - 2 decimals */
  | 'LSL'
  /** Libyan Dinar (Libya) - 3 decimals */
  | 'LYD'
  /** Moroccan Dirham (Morocco) - 2 decimals */
  | 'MAD'
  /** Moldovan Leu (Moldova) - 2 decimals */
  | 'MDL'
  /** Malagasy Ariary (Madagascar) - 2 decimals */
  | 'MGA'
  /** Macedonian Denar (North Macedonia) - 2 decimals */
  | 'MKD'
  /** Burmese Kyat (Myanmar) - 2 decimals */
  | 'MMK'
  /** Mongolian Tögrög (Mongolia) - 2 decimals */
  | 'MNT'
  /** Macanese Pataca (Macau) - 2 decimals */
  | 'MOP'
  /** Mauritanian Ouguiya (Mauritania) - 2 decimals */
  | 'MRU'
  /** Mauritian Rupee (Mauritius) - 2 decimals */
  | 'MUR'
  /** Maldivian Rufiyaa (Maldives) - 2 decimals */
  | 'MVR'
  /** Malawian Kwacha (Malawi) - 2 decimals */
  | 'MWK'
  /** Mexican Peso (Mexico) - 2 decimals */
  | 'MXN'
  /** Malaysian Ringgit (Malaysia) - 2 decimals */
  | 'MYR'
  /** Mozambican Metical (Mozambique) - 2 decimals */
  | 'MZN'
  /** Namibian Dollar (Namibia) - 2 decimals */
  | 'NAD'
  /** Nigerian Naira (Nigeria) - 2 decimals */
  | 'NGN'
  /** Nicaraguan Córdoba (Nicaragua) - 2 decimals */
  | 'NIO'
  /** Norwegian Krone (Norway) - 2 decimals */
  | 'NOK'
  /** Nepalese Rupee (Nepal) - 2 decimals */
  | 'NPR'
  /** New Zealand Dollar (New Zealand) - 2 decimals */
  | 'NZD'
  /** Omani Rial (Oman) - 3 decimals */
  | 'OMR'
  /** Panamanian Balboa (Panama) - 2 decimals */
  | 'PAB'
  /** Peruvian Sol (Peru) - 2 decimals */
  | 'PEN'
  /** Papua New Guinean Kina - 2 decimals */
  | 'PGK'
  /** Philippine Peso (Philippines) - 2 decimals */
  | 'PHP'
  /** Pakistani Rupee (Pakistan) - 2 decimals */
  | 'PKR'
  /** Polish Zloty (Poland) - 2 decimals */
  | 'PLN'
  /** Paraguayan Guaraní (Paraguay) - 0 decimals */
  | 'PYG'
  /** Qatari Riyal (Qatar) - 2 decimals */
  | 'QAR'
  /** Romanian Leu (Romania) - 2 decimals */
  | 'RON'
  /** Serbian Dinar (Serbia) - 2 decimals */
  | 'RSD'
  /** Russian Ruble (Russia) - 2 decimals */
  | 'RUB'
  /** Rwandan Franc (Rwanda) - 0 decimals */
  | 'RWF'
  /** Saudi Riyal (Saudi Arabia) - 2 decimals */
  | 'SAR'
  /** Solomon Islands Dollar - 2 decimals */
  | 'SBD'
  /** Seychelles Rupee (Seychelles) - 2 decimals */
  | 'SCR'
  /** Sudanese Pound (Sudan) - 2 decimals */
  | 'SDG'
  /** Swedish Krona (Sweden) - 2 decimals */
  | 'SEK'
  /** Singapore Dollar (Singapore) - 2 decimals */
  | 'SGD'
  /** Saint Helena Pound - 2 decimals */
  | 'SHP'
  /** Sierra Leonean Leone - 2 decimals */
  | 'SLE'
  /** Somali Shilling (Somalia) - 2 decimals */
  | 'SOS'
  /** Surinamese Dollar (Suriname) - 2 decimals */
  | 'SRD'
  /** South Sudanese Pound - 2 decimals */
  | 'SSP'
  /** São Tomé and Príncipe Dobra - 2 decimals */
  | 'STN'
  /** Salvadoran Colón (El Salvador) - 2 decimals */
  | 'SVC'
  /** Syrian Pound (Syria) - 2 decimals */
  | 'SYP'
  /** Eswatini Lilangeni (Eswatini) - 2 decimals */
  | 'SZL'
  /** Thai Baht (Thailand) - 2 decimals */
  | 'THB'
  /** Tajikistani Somoni (Tajikistan) - 2 decimals */
  | 'TJS'
  /** Turkmenistani Manat (Turkmenistan) - 2 decimals */
  | 'TMT'
  /** Tunisian Dinar (Tunisia) - 3 decimals */
  | 'TND'
  /** Tongan Paʻanga (Tonga) - 2 decimals */
  | 'TOP'
  /** Turkish Lira (Turkey) - 2 decimals */
  | 'TRY'
  /** Trinidad and Tobago Dollar - 2 decimals */
  | 'TTD'
  /** New Taiwan Dollar (Taiwan) - 2 decimals */
  | 'TWD'
  /** Tanzanian Shilling (Tanzania) - 2 decimals */
  | 'TZS'
  /** Ukrainian Hryvnia (Ukraine) - 2 decimals */
  | 'UAH'
  /** Ugandan Shilling (Uganda) - 0 decimals */
  | 'UGX'
  /** United States Dollar (USA) - 2 decimals */
  | 'USD'
  /** Uruguayan Peso (Uruguay) - 2 decimals */
  | 'UYU'
  /** Uzbekistani Som (Uzbekistan) - 2 decimals */
  | 'UZS'
  /** Venezuelan Bolívar (Venezuela) - 2 decimals */
  | 'VES'
  /** Vietnamese Dong (Vietnam) - 0 decimals */
  | 'VND'
  /** Vanuatu Vatu (Vanuatu) - 0 decimals */
  | 'VUV'
  /** Samoan Tala (Samoa) - 2 decimals */
  | 'WST'
  /** Central African CFA Franc - 0 decimals */
  | 'XAF'
  /** East Caribbean Dollar - 2 decimals */
  | 'XCD'
  /** Special Drawing Rights (IMF) - 0 decimals */
  | 'XDR'
  /** West African CFA Franc - 0 decimals */
  | 'XOF'
  /** CFP Franc - 0 decimals */
  | 'XPF'
  /** Yemeni Rial (Yemen) - 2 decimals */
  | 'YER'
  /** South African Rand (South Africa) - 2 decimals */
  | 'ZAR'
  /** Zambian Kwacha (Zambia) - 2 decimals */
  | 'ZMW'
  /** Zimbabwean Dollar (Zimbabwe) - 2 decimals */
  | 'ZWL';

/** Delivery cost with payment model */
export type ApiDeliveryCost = {
  __typename?: 'DeliveryCost';
  /** Delivery amount */
  amount: ApiMoney;
  /** Shipping payment model */
  paymentModel: ShippingPaymentModel;
};

/** Dimension (length) measurement units */
export type DimensionUnit =
  /** Centimeter */
  | 'cm'
  /** Foot */
  | 'ft'
  /** Inch */
  | 'in'
  /** Meter */
  | 'm'
  /** Millimeter */
  | 'mm';

/** Language/Locale codes based on ISO 639-1 and BCP 47 */
export type LocaleCode =
  /** Akan */
  | 'ak'
  /** Amharic */
  | 'am'
  /** Arabic */
  | 'ar'
  /** Assamese */
  | 'as'
  /** Azerbaijani */
  | 'az'
  /** Belarusian */
  | 'be'
  /** Bulgarian */
  | 'bg'
  /** Bambara */
  | 'bm'
  /** Bangla */
  | 'bn'
  /** Tibetan */
  | 'bo'
  /** Breton */
  | 'br'
  /** Bosnian */
  | 'bs'
  /** Catalan */
  | 'ca'
  /** Chechen */
  | 'ce'
  /** Central Kurdish */
  | 'ckb'
  /** Czech */
  | 'cs'
  /** Welsh */
  | 'cy'
  /** Danish */
  | 'da'
  /** German */
  | 'de'
  /** Dzongkha */
  | 'dz'
  /** Ewe */
  | 'ee'
  /** Greek */
  | 'el'
  /** English */
  | 'en'
  /** Esperanto */
  | 'eo'
  /** Spanish */
  | 'es'
  /** Estonian */
  | 'et'
  /** Basque */
  | 'eu'
  /** Persian */
  | 'fa'
  /** Fulah */
  | 'ff'
  /** Finnish */
  | 'fi'
  /** Filipino */
  | 'fil'
  /** Faroese */
  | 'fo'
  /** French */
  | 'fr'
  /** Western Frisian */
  | 'fy'
  /** Irish */
  | 'ga'
  /** Scottish Gaelic */
  | 'gd'
  /** Galician */
  | 'gl'
  /** Gujarati */
  | 'gu'
  /** Manx */
  | 'gv'
  /** Hausa */
  | 'ha'
  /** Hebrew */
  | 'he'
  /** Hindi */
  | 'hi'
  /** Croatian */
  | 'hr'
  /** Hungarian */
  | 'hu'
  /** Armenian */
  | 'hy'
  /** Interlingua */
  | 'ia'
  /** Indonesian */
  | 'id'
  /** Igbo */
  | 'ig'
  /** Sichuan Yi */
  | 'ii'
  /** Icelandic */
  | 'is'
  /** Italian */
  | 'it'
  /** Japanese */
  | 'ja'
  /** Javanese */
  | 'jv'
  /** Georgian */
  | 'ka'
  /** Kikuyu */
  | 'ki'
  /** Kazakh */
  | 'kk'
  /** Kalaallisut */
  | 'kl'
  /** Khmer */
  | 'km'
  /** Kannada */
  | 'kn'
  /** Korean */
  | 'ko'
  /** Kashmiri */
  | 'ks'
  /** Kurdish */
  | 'ku'
  /** Cornish */
  | 'kw'
  /** Kyrgyz */
  | 'ky'
  /** Luxembourgish */
  | 'lb'
  /** Ganda */
  | 'lg'
  /** Lingala */
  | 'ln'
  /** Lao */
  | 'lo'
  /** Lithuanian */
  | 'lt'
  /** Luba-Katanga */
  | 'lu'
  /** Latvian */
  | 'lv'
  /** Malagasy */
  | 'mg'
  /** Māori */
  | 'mi'
  /** Macedonian */
  | 'mk'
  /** Malayalam */
  | 'ml'
  /** Mongolian */
  | 'mn'
  /** Marathi */
  | 'mr'
  /** Malay */
  | 'ms'
  /** Maltese */
  | 'mt'
  /** Burmese */
  | 'my'
  /** Norwegian Bokmål */
  | 'nb'
  /** North Ndebele */
  | 'nd'
  /** Nepali */
  | 'ne'
  /** Dutch */
  | 'nl'
  /** Norwegian Nynorsk */
  | 'nn'
  /** Norwegian */
  | 'no'
  /** Oromo */
  | 'om'
  /** Odia */
  | 'or'
  /** Ossetic */
  | 'os'
  /** Punjabi */
  | 'pa'
  /** Polish */
  | 'pl'
  /** Pashto */
  | 'ps'
  /** Portuguese (Brazil) */
  | 'pt_BR'
  /** Portuguese (Portugal) */
  | 'pt_PT'
  /** Quechua */
  | 'qu'
  /** Romansh */
  | 'rm'
  /** Rundi */
  | 'rn'
  /** Romanian */
  | 'ro'
  /** Russian */
  | 'ru'
  /** Kinyarwanda */
  | 'rw'
  /** Sanskrit */
  | 'sa'
  /** Sardinian */
  | 'sc'
  /** Sindhi */
  | 'sd'
  /** Northern Sami */
  | 'se'
  /** Sango */
  | 'sg'
  /** Sinhala */
  | 'si'
  /** Slovak */
  | 'sk'
  /** Slovenian */
  | 'sl'
  /** Shona */
  | 'sn'
  /** Somali */
  | 'so'
  /** Albanian */
  | 'sq'
  /** Serbian */
  | 'sr'
  /** Sundanese */
  | 'su'
  /** Swedish */
  | 'sv'
  /** Swahili */
  | 'sw'
  /** Tamil */
  | 'ta'
  /** Telugu */
  | 'te'
  /** Tajik */
  | 'tg'
  /** Thai */
  | 'th'
  /** Tigrinya */
  | 'ti'
  /** Turkmen */
  | 'tk'
  /** Tongan */
  | 'to'
  /** Turkish */
  | 'tr'
  /** Tatar */
  | 'tt'
  /** Uyghur */
  | 'ug'
  /** Ukrainian */
  | 'uk'
  /** Urdu */
  | 'ur'
  /** Uzbek */
  | 'uz'
  /** Vietnamese */
  | 'vi'
  /** Wolof */
  | 'wo'
  /** Xhosa */
  | 'xh'
  /** Yiddish */
  | 'yi'
  /** Yoruba */
  | 'yo'
  /** Chinese (Simplified) */
  | 'zh_CN'
  /** Chinese (Traditional) */
  | 'zh_TW'
  /** Zulu */
  | 'zu';

export type ApiMoney = {
  __typename?: 'Money';
  /** The amount of money */
  amount: Scalars['Decimal']['output'];
  /** The currency code */
  currencyCode: CurrencyCode;
};

export type ApiMutation = {
  __typename?: 'Mutation';
  checkoutMutation: ApiCheckoutMutation;
  orderMutation: ApiOrderMutation;
};

export type ApiNode = {
  id: Scalars['ID']['output'];
};

/** Severity levels for checkout warnings. */
export type NotificationSeverity =
  /** Informational notice; does not indicate any change in checkout data. */
  | 'INFO'
  /** Notification about automatic adjustments (e.g., quantity reduced). */
  | 'WARNING';

export type ApiOrder = {
  __typename?: 'Order';
  /** Cost breakdown for the order. */
  cost: ApiOrderCost;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** Order items. */
  lines: Array<ApiOrderLine>;
  /** A unique numeric identifier for the order for use by shop owner and customer. */
  number: Scalars['BigInt']['output'];
  /** Order status. */
  status: OrderStatus;
};

export type ApiOrderCost = {
  __typename?: 'OrderCost';
  /** Total value of items before any discounts. */
  subtotalAmount: ApiMoney;
  /** Final amount to be paid, including item cost, shipping, and taxes. */
  totalAmount: ApiMoney;
  /** Total discount from both item-level and checkout-level promotions. */
  totalDiscountAmount: ApiMoney;
  /** Total shipping cost (only MERCHANT_COLLECTED payments). */
  totalShippingAmount: ApiMoney;
  /** Total tax amount applied to the checkout. */
  totalTaxAmount: ApiMoney;
};

export type ApiOrderLine = {
  __typename?: 'OrderLine';
  /** Cost breakdown for the order line. */
  cost: ApiOrderLineCost;
  /** Creation date. */
  createdAt: Scalars['DateTime']['output'];
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** ID of the purchasable. */
  purchasableId: Scalars['ID']['output'];
  /** Purchasable snapshot data at the time of adding to checkout. */
  purchasableSnapshot: Scalars['JSON']['output'];
  /** Quantity of the item being purchased. */
  quantity: Scalars['Int']['output'];
  /** Last updated date. */
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiOrderLineCost = {
  __typename?: 'OrderLineCost';
  /** Discount amount applied to a line. */
  discountAmount: ApiMoney;
  /** Total cost of all units before discounts. */
  subtotalAmount: ApiMoney;
  /** Total tax amount applied to the checkout line. */
  taxAmount: ApiMoney;
  /** Total cost of this line (all units), after discounts and taxes. */
  totalAmount: ApiMoney;
  /** The original list price per unit before any discounts. */
  unitCompareAtPrice: ApiMoney;
  /** The current price per unit before discounts are applied (may differ from compareAt price if on sale). */
  unitPrice: ApiMoney;
};

export type ApiOrderMutation = {
  __typename?: 'OrderMutation';
  orderCreate: ApiOrder;
};


export type ApiOrderMutationOrderCreateArgs = {
  input: ApiCreateOrderInput;
};

export type OrderStatus =
  | 'ACTIVE'
  | 'CANCELLED'
  | 'CLOSED'
  | 'DRAFT';

/** Payment flow for the method, aligned with payment-plugin-sdk. */
export type PaymentFlow =
  /** Customer pays offline via provider (QR code, display code, etc). */
  | 'OFFLINE'
  /** Customer pays online via provider (redirect/app flow handled externally). */
  | 'ONLINE'
  /** Customer pays later/on delivery or by invoice (offline instructions). */
  | 'ON_DELIVERY';

export type ApiPurchasableSnapshotInput = {
  /** JSON data of the purchasable snapshot. */
  data?: InputMaybe<Scalars['JSON']['input']>;
  /** Image URL of the purchasable snapshot. */
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  /** SKU of the purchasable snapshot. */
  sku?: InputMaybe<Scalars['String']['input']>;
  /** Title of the purchasable snapshot. */
  title: Scalars['String']['input'];
};

export type ApiQuery = {
  __typename?: 'Query';
  checkoutQuery: ApiCheckoutQuery;
};

/** Shipping payment model */
export type ShippingPaymentModel =
  /** Customer pays carrier directly, NOT included in grandTotal */
  | 'CARRIER_DIRECT'
  /** Customer pays merchant, included in grandTotal */
  | 'MERCHANT_COLLECTED';

export type ApiUser = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
  /** List of the user's orders. */
  orders: Array<ApiOrder>;
};

/** Weight measurement units */
export type WeightUnit =
  /** Gram */
  | 'g'
  /** Kilogram */
  | 'kg'
  /** Pound */
  | 'lb'
  /** Ounce */
  | 'oz';

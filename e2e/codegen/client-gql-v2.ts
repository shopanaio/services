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

export enum CheckoutDeliveryMethodType {
  /** Pickup delivery method. */
  Pickup = 'PICKUP',
  /** Shipping delivery method. */
  Shipping = 'SHIPPING'
}

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
export enum CheckoutNotificationCode {
  /** An item in the checkout is no longer available for sale. */
  ItemUnavailable = 'ITEM_UNAVAILABLE',
  /**
   * The requested quantity exceeds available stock;
   * quantity was automatically reduced to the maximum available.
   */
  NotEnoughStock = 'NOT_ENOUGH_STOCK',
  /** The requested item is completely out of stock and has been removed from the checkout. */
  OutOfStock = 'OUT_OF_STOCK',
  /** The price of one or more items has changed since they were added to the checkout. */
  PriceChanged = 'PRICE_CHANGED'
}

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
export enum ChildPriceType {
  /** Use original price without adjustments */
  Base = 'BASE',
  /** Subtract fixed amount from original price */
  DiscountAmount = 'DISCOUNT_AMOUNT',
  /** Subtract percentage from original price */
  DiscountPercent = 'DISCOUNT_PERCENT',
  /** Item is free (price = 0) */
  Free = 'FREE',
  /** Add fixed amount to original price */
  MarkupAmount = 'MARKUP_AMOUNT',
  /** Add percentage to original price */
  MarkupPercent = 'MARKUP_PERCENT',
  /** Override with fixed price */
  Override = 'OVERRIDE'
}

export enum CountryCode {
  /** Andorra */
  Ad = 'AD',
  /** United Arab Emirates */
  Ae = 'AE',
  /** Afghanistan */
  Af = 'AF',
  /** Antigua and Barbuda */
  Ag = 'AG',
  /** Albania */
  Al = 'AL',
  /** Armenia */
  Am = 'AM',
  /** Angola */
  Ao = 'AO',
  /** Argentina */
  Ar = 'AR',
  /** Austria */
  At = 'AT',
  /** Australia */
  Au = 'AU',
  /** Aruba */
  Aw = 'AW',
  /** Åland Islands */
  Ax = 'AX',
  /** Azerbaijan */
  Az = 'AZ',
  /** Bosnia and Herzegovina */
  Ba = 'BA',
  /** Barbados */
  Bb = 'BB',
  /** Bangladesh */
  Bd = 'BD',
  /** Belgium */
  Be = 'BE',
  /** Burkina Faso */
  Bf = 'BF',
  /** Bulgaria */
  Bg = 'BG',
  /** Bahrain */
  Bh = 'BH',
  /** Burundi */
  Bi = 'BI',
  /** Benin */
  Bj = 'BJ',
  /** Bermuda */
  Bm = 'BM',
  /** Brunei */
  Bn = 'BN',
  /** Bolivia */
  Bo = 'BO',
  /** Brazil */
  Br = 'BR',
  /** Bahamas */
  Bs = 'BS',
  /** Bhutan */
  Bt = 'BT',
  /** Botswana */
  Bw = 'BW',
  /** Belarus */
  By = 'BY',
  /** Belize */
  Bz = 'BZ',
  /** Canada */
  Ca = 'CA',
  /** Democratic Republic of the Congo */
  Cd = 'CD',
  /** Central African Republic */
  Cf = 'CF',
  /** Republic of the Congo */
  Cg = 'CG',
  /** Switzerland */
  Ch = 'CH',
  /** Ivory Coast */
  Ci = 'CI',
  /** Chile */
  Cl = 'CL',
  /** Cameroon */
  Cm = 'CM',
  /** China */
  Cn = 'CN',
  /** Colombia */
  Co = 'CO',
  /** Costa Rica */
  Cr = 'CR',
  /** Cuba */
  Cu = 'CU',
  /** Cape Verde */
  Cv = 'CV',
  /** Curaçao */
  Cw = 'CW',
  /** Cyprus */
  Cy = 'CY',
  /** Czech Republic */
  Cz = 'CZ',
  /** Germany */
  De = 'DE',
  /** Djibouti */
  Dj = 'DJ',
  /** Denmark */
  Dk = 'DK',
  /** Dominica */
  Dm = 'DM',
  /** Dominican Republic */
  Do = 'DO',
  /** Algeria */
  Dz = 'DZ',
  /** Ecuador */
  Ec = 'EC',
  /** Estonia */
  Ee = 'EE',
  /** Egypt */
  Eg = 'EG',
  /** Western Sahara */
  Eh = 'EH',
  /** Eritrea */
  Er = 'ER',
  /** Spain */
  Es = 'ES',
  /** Ethiopia */
  Et = 'ET',
  /** Finland */
  Fi = 'FI',
  /** Fiji */
  Fj = 'FJ',
  /** Micronesia */
  Fm = 'FM',
  /** Faroe Islands */
  Fo = 'FO',
  /** France */
  Fr = 'FR',
  /** Gabon */
  Ga = 'GA',
  /** United Kingdom */
  Gb = 'GB',
  /** Grenada */
  Gd = 'GD',
  /** Georgia */
  Ge = 'GE',
  /** Guernsey */
  Gg = 'GG',
  /** Ghana */
  Gh = 'GH',
  /** Greenland */
  Gl = 'GL',
  /** Gambia */
  Gm = 'GM',
  /** Guinea */
  Gn = 'GN',
  /** Equatorial Guinea */
  Gq = 'GQ',
  /** Greece */
  Gr = 'GR',
  /** Guatemala */
  Gt = 'GT',
  /** Guinea-Bissau */
  Gw = 'GW',
  /** Guyana */
  Gy = 'GY',
  /** Honduras */
  Hn = 'HN',
  /** Croatia */
  Hr = 'HR',
  /** Haiti */
  Ht = 'HT',
  /** Hungary */
  Hu = 'HU',
  /** Indonesia */
  Id = 'ID',
  /** Ireland */
  Ie = 'IE',
  /** Israel */
  Il = 'IL',
  /** Isle of Man */
  Im = 'IM',
  /** India */
  In = 'IN',
  /** Iraq */
  Iq = 'IQ',
  /** Iran */
  Ir = 'IR',
  /** Iceland */
  Is = 'IS',
  /** Italy */
  It = 'IT',
  /** Jersey */
  Je = 'JE',
  /** Jamaica */
  Jm = 'JM',
  /** Jordan */
  Jo = 'JO',
  /** Japan */
  Jp = 'JP',
  /** Kenya */
  Ke = 'KE',
  /** Kyrgyzstan */
  Kg = 'KG',
  /** Cambodia */
  Kh = 'KH',
  /** Comoros */
  Km = 'KM',
  /** Saint Kitts and Nevis */
  Kn = 'KN',
  /** North Korea */
  Kp = 'KP',
  /** South Korea */
  Kr = 'KR',
  /** Kuwait */
  Kw = 'KW',
  /** Kazakhstan */
  Kz = 'KZ',
  /** Laos */
  La = 'LA',
  /** Lebanon */
  Lb = 'LB',
  /** Saint Lucia */
  Lc = 'LC',
  /** Liechtenstein */
  Li = 'LI',
  /** Sri Lanka */
  Lk = 'LK',
  /** Liberia */
  Lr = 'LR',
  /** Lesotho */
  Ls = 'LS',
  /** Lithuania */
  Lt = 'LT',
  /** Luxembourg */
  Lu = 'LU',
  /** Latvia */
  Lv = 'LV',
  /** Morocco */
  Ma = 'MA',
  /** Monaco */
  Mc = 'MC',
  /** Moldova */
  Md = 'MD',
  /** Montenegro */
  Me = 'ME',
  /** Madagascar */
  Mg = 'MG',
  /** Marshall Islands */
  Mh = 'MH',
  /** North Macedonia */
  Mk = 'MK',
  /** Mali */
  Ml = 'ML',
  /** Myanmar */
  Mm = 'MM',
  /** Mongolia */
  Mn = 'MN',
  /** Mauritania */
  Mr = 'MR',
  /** Malta */
  Mt = 'MT',
  /** Mauritius */
  Mu = 'MU',
  /** Maldives */
  Mv = 'MV',
  /** Malawi */
  Mw = 'MW',
  /** Mexico */
  Mx = 'MX',
  /** Malaysia */
  My = 'MY',
  /** Mozambique */
  Mz = 'MZ',
  /** Namibia */
  Na = 'NA',
  /** New Caledonia */
  Nc = 'NC',
  /** Niger */
  Ne = 'NE',
  /** Nigeria */
  Ng = 'NG',
  /** Nicaragua */
  Ni = 'NI',
  /** Netherlands */
  Nl = 'NL',
  /** Norway */
  No = 'NO',
  /** Nepal */
  Np = 'NP',
  /** New Zealand */
  Nz = 'NZ',
  /** Oman */
  Om = 'OM',
  /** Panama */
  Pa = 'PA',
  /** Peru */
  Pe = 'PE',
  /** Papua New Guinea */
  Pg = 'PG',
  /** Philippines */
  Ph = 'PH',
  /** Pakistan */
  Pk = 'PK',
  /** Poland */
  Pl = 'PL',
  /** Palestine */
  Ps = 'PS',
  /** Portugal */
  Pt = 'PT',
  /** Palau */
  Pw = 'PW',
  /** Paraguay */
  Py = 'PY',
  /** Qatar */
  Qa = 'QA',
  /** Romania */
  Ro = 'RO',
  /** Serbia */
  Rs = 'RS',
  /** Russia */
  Ru = 'RU',
  /** Rwanda */
  Rw = 'RW',
  /** Saudi Arabia */
  Sa = 'SA',
  /** Solomon Islands */
  Sb = 'SB',
  /** Seychelles */
  Sc = 'SC',
  /** Sudan */
  Sd = 'SD',
  /** Sweden */
  Se = 'SE',
  /** Singapore */
  Sg = 'SG',
  /** Slovenia */
  Si = 'SI',
  /** Slovakia */
  Sk = 'SK',
  /** Sierra Leone */
  Sl = 'SL',
  /** San Marino */
  Sm = 'SM',
  /** Senegal */
  Sn = 'SN',
  /** Suriname */
  Sr = 'SR',
  /** South Sudan */
  Ss = 'SS',
  /** El Salvador */
  Sv = 'SV',
  /** Syria */
  Sy = 'SY',
  /** Swaziland (Eswatini) */
  Sz = 'SZ',
  /** Chad */
  Td = 'TD',
  /** Togo */
  Tg = 'TG',
  /** Thailand */
  Th = 'TH',
  /** Tajikistan */
  Tj = 'TJ',
  /** Timor-Leste (East Timor) */
  Tl = 'TL',
  /** Turkmenistan */
  Tm = 'TM',
  /** Tunisia */
  Tn = 'TN',
  /** Tonga */
  To = 'TO',
  /** Turkey */
  Tr = 'TR',
  /** Trinidad and Tobago */
  Tt = 'TT',
  /** Tanzania */
  Tz = 'TZ',
  /** Ukraine */
  Ua = 'UA',
  /** Uganda */
  Ug = 'UG',
  /** United States */
  Us = 'US',
  /** Uruguay */
  Uy = 'UY',
  /** Uzbekistan */
  Uz = 'UZ',
  /** Vatican City */
  Va = 'VA',
  /** Saint Vincent and the Grenadines */
  Vc = 'VC',
  /** Venezuela */
  Ve = 'VE',
  /** British Virgin Islands */
  Vg = 'VG',
  /** US Virgin Islands */
  Vi = 'VI',
  /** Vietnam */
  Vn = 'VN',
  /** Vanuatu */
  Vu = 'VU',
  /** Samoa */
  Ws = 'WS',
  /** Kosovo */
  Xk = 'XK',
  /** Yemen */
  Ye = 'YE',
  /** South Africa */
  Za = 'ZA',
  /** Zambia */
  Zm = 'ZM',
  /** Zimbabwe */
  Zw = 'ZW'
}

export type ApiCreateOrderInput = {
  /** ID of the checkout. */
  checkoutId: Scalars['ID']['input'];
};

/** Currency codes according to ISO 4217 */
export enum CurrencyCode {
  /** UAE Dirham (United Arab Emirates) - 2 decimals */
  Aed = 'AED',
  /** Afghan Afghani (Afghanistan) - 0 decimals */
  Afn = 'AFN',
  /** Albanian Lek (Albania) - 0 decimals */
  All = 'ALL',
  /** Armenian Dram (Armenia) - 2 decimals */
  Amd = 'AMD',
  /** Netherlands Antillean Guilder - 2 decimals */
  Ang = 'ANG',
  /** Angolan Kwanza (Angola) - 2 decimals */
  Aoa = 'AOA',
  /** Argentine Peso (Argentina) - 2 decimals */
  Ars = 'ARS',
  /** Australian Dollar (Australia) - 2 decimals */
  Aud = 'AUD',
  /** Aruban Florin (Aruba) - 2 decimals */
  Awg = 'AWG',
  /** Azerbaijani Manat (Azerbaijan) - 2 decimals */
  Azn = 'AZN',
  /** Bosnia-Herzegovina Convertible Mark - 2 decimals */
  Bam = 'BAM',
  /** Barbadian Dollar (Barbados) - 2 decimals */
  Bbd = 'BBD',
  /** Bangladeshi Taka (Bangladesh) - 2 decimals */
  Bdt = 'BDT',
  /** Bulgarian Lev (Bulgaria) - 2 decimals */
  Bgn = 'BGN',
  /** Bahraini Dinar (Bahrain) - 3 decimals */
  Bhd = 'BHD',
  /** Burundian Franc (Burundi) - 0 decimals */
  Bif = 'BIF',
  /** Bermudian Dollar (Bermuda) - 2 decimals */
  Bmd = 'BMD',
  /** Brunei Dollar (Brunei) - 2 decimals */
  Bnd = 'BND',
  /** Bolivian Boliviano (Bolivia) - 2 decimals */
  Bob = 'BOB',
  /** Brazilian Real (Brazil) - 2 decimals */
  Brl = 'BRL',
  /** Bahamian Dollar (Bahamas) - 2 decimals */
  Bsd = 'BSD',
  /** Bhutanese Ngultrum (Bhutan) - 2 decimals */
  Btn = 'BTN',
  /** Botswana Pula (Botswana) - 2 decimals */
  Bwp = 'BWP',
  /** Belarusian Ruble (Belarus) - 2 decimals */
  Byn = 'BYN',
  /** Belize Dollar (Belize) - 2 decimals */
  Bzd = 'BZD',
  /** Canadian Dollar (Canada) - 2 decimals */
  Cad = 'CAD',
  /** Congolese Franc (DR Congo) - 2 decimals */
  Cdf = 'CDF',
  /** Swiss Franc (Switzerland) - 2 decimals */
  Chf = 'CHF',
  /** Chilean Peso (Chile) - 0 decimals */
  Clp = 'CLP',
  /** Chinese Yuan (China) - 2 decimals */
  Cny = 'CNY',
  /** Colombian Peso (Colombia) - 2 decimals */
  Cop = 'COP',
  /** Costa Rican Colon (Costa Rica) - 2 decimals */
  Crc = 'CRC',
  /** Cuban Peso (Cuba) - 2 decimals */
  Cup = 'CUP',
  /** Cape Verdean Escudo (Cape Verde) - 2 decimals */
  Cve = 'CVE',
  /** Czech Koruna (Czech Republic) - 2 decimals */
  Czk = 'CZK',
  /** Djiboutian Franc (Djibouti) - 0 decimals */
  Djf = 'DJF',
  /** Danish Krone (Denmark) - 2 decimals */
  Dkk = 'DKK',
  /** Dominican Peso (Dominican Republic) - 2 decimals */
  Dop = 'DOP',
  /** Algerian Dinar (Algeria) - 2 decimals */
  Dzd = 'DZD',
  /** Egyptian Pound (Egypt) - 2 decimals */
  Egp = 'EGP',
  /** Eritrean Nakfa (Eritrea) - 2 decimals */
  Ern = 'ERN',
  /** Ethiopian Birr (Ethiopia) - 2 decimals */
  Etb = 'ETB',
  /** Euro (European Union) - 2 decimals */
  Eur = 'EUR',
  /** Fijian Dollar (Fiji) - 2 decimals */
  Fjd = 'FJD',
  /** Falkland Islands Pound - 2 decimals */
  Fkp = 'FKP',
  /** Faroese Króna (Faroe Islands) - 2 decimals */
  Fok = 'FOK',
  /** Pound Sterling (United Kingdom) - 2 decimals */
  Gbp = 'GBP',
  /** Georgian Lari (Georgia) - 2 decimals */
  Gel = 'GEL',
  /** Guernsey Pound (Guernsey) - 2 decimals */
  Ggp = 'GGP',
  /** Ghanaian Cedi (Ghana) - 2 decimals */
  Ghs = 'GHS',
  /** Gibraltar Pound (Gibraltar) - 2 decimals */
  Gip = 'GIP',
  /** Gambian Dalasi (Gambia) - 2 decimals */
  Gmd = 'GMD',
  /** Guinean Franc (Guinea) - 0 decimals */
  Gnf = 'GNF',
  /** Guatemalan Quetzal (Guatemala) - 2 decimals */
  Gtq = 'GTQ',
  /** Guyanese Dollar (Guyana) - 2 decimals */
  Gyd = 'GYD',
  /** Hong Kong Dollar (Hong Kong) - 2 decimals */
  Hkd = 'HKD',
  /** Honduran Lempira (Honduras) - 2 decimals */
  Hnl = 'HNL',
  /** Croatian Kuna (Croatia) - 2 decimals */
  Hrk = 'HRK',
  /** Haitian Gourde (Haiti) - 2 decimals */
  Htg = 'HTG',
  /** Hungarian Forint (Hungary) - 2 decimals */
  Huf = 'HUF',
  /** Indonesian Rupiah (Indonesia) - 0 decimals */
  Idr = 'IDR',
  /** Israeli New Shekel (Israel) - 2 decimals */
  Ils = 'ILS',
  /** Isle of Man Pound - 2 decimals */
  Imp = 'IMP',
  /** Indian Rupee (India) - 2 decimals */
  Inr = 'INR',
  /** Iraqi Dinar (Iraq) - 3 decimals */
  Iqd = 'IQD',
  /** Iranian Rial (Iran) - 2 decimals */
  Irr = 'IRR',
  /** Icelandic Króna (Iceland) - 0 decimals */
  Isk = 'ISK',
  /** Jersey Pound (Jersey) - 2 decimals */
  Jep = 'JEP',
  /** Jamaican Dollar (Jamaica) - 2 decimals */
  Jmd = 'JMD',
  /** Jordanian Dinar (Jordan) - 3 decimals */
  Jod = 'JOD',
  /** Japanese Yen (Japan) - 0 decimals */
  Jpy = 'JPY',
  /** Kenyan Shilling (Kenya) - 2 decimals */
  Kes = 'KES',
  /** Kyrgyzstani Som (Kyrgyzstan) - 2 decimals */
  Kgs = 'KGS',
  /** Cambodian Riel (Cambodia) - 2 decimals */
  Khr = 'KHR',
  /** Comorian Franc (Comoros) - 2 decimals */
  Kmf = 'KMF',
  /** North Korean Won (North Korea) - 2 decimals */
  Kpw = 'KPW',
  /** South Korean Won (South Korea) - 0 decimals */
  Krw = 'KRW',
  /** Kuwaiti Dinar (Kuwait) - 3 decimals */
  Kwd = 'KWD',
  /** Cayman Islands Dollar - 2 decimals */
  Kyd = 'KYD',
  /** Kazakhstani Tenge (Kazakhstan) - 2 decimals */
  Kzt = 'KZT',
  /** Lao Kip (Laos) - 2 decimals */
  Lak = 'LAK',
  /** Lebanese Pound (Lebanon) - 2 decimals */
  Lbp = 'LBP',
  /** Sri Lankan Rupee (Sri Lanka) - 2 decimals */
  Lkr = 'LKR',
  /** Liberian Dollar (Liberia) - 2 decimals */
  Lrd = 'LRD',
  /** Lesotho Loti (Lesotho) - 2 decimals */
  Lsl = 'LSL',
  /** Libyan Dinar (Libya) - 3 decimals */
  Lyd = 'LYD',
  /** Moroccan Dirham (Morocco) - 2 decimals */
  Mad = 'MAD',
  /** Moldovan Leu (Moldova) - 2 decimals */
  Mdl = 'MDL',
  /** Malagasy Ariary (Madagascar) - 2 decimals */
  Mga = 'MGA',
  /** Macedonian Denar (North Macedonia) - 2 decimals */
  Mkd = 'MKD',
  /** Burmese Kyat (Myanmar) - 2 decimals */
  Mmk = 'MMK',
  /** Mongolian Tögrög (Mongolia) - 2 decimals */
  Mnt = 'MNT',
  /** Macanese Pataca (Macau) - 2 decimals */
  Mop = 'MOP',
  /** Mauritanian Ouguiya (Mauritania) - 2 decimals */
  Mru = 'MRU',
  /** Mauritian Rupee (Mauritius) - 2 decimals */
  Mur = 'MUR',
  /** Maldivian Rufiyaa (Maldives) - 2 decimals */
  Mvr = 'MVR',
  /** Malawian Kwacha (Malawi) - 2 decimals */
  Mwk = 'MWK',
  /** Mexican Peso (Mexico) - 2 decimals */
  Mxn = 'MXN',
  /** Malaysian Ringgit (Malaysia) - 2 decimals */
  Myr = 'MYR',
  /** Mozambican Metical (Mozambique) - 2 decimals */
  Mzn = 'MZN',
  /** Namibian Dollar (Namibia) - 2 decimals */
  Nad = 'NAD',
  /** Nigerian Naira (Nigeria) - 2 decimals */
  Ngn = 'NGN',
  /** Nicaraguan Córdoba (Nicaragua) - 2 decimals */
  Nio = 'NIO',
  /** Norwegian Krone (Norway) - 2 decimals */
  Nok = 'NOK',
  /** Nepalese Rupee (Nepal) - 2 decimals */
  Npr = 'NPR',
  /** New Zealand Dollar (New Zealand) - 2 decimals */
  Nzd = 'NZD',
  /** Omani Rial (Oman) - 3 decimals */
  Omr = 'OMR',
  /** Panamanian Balboa (Panama) - 2 decimals */
  Pab = 'PAB',
  /** Peruvian Sol (Peru) - 2 decimals */
  Pen = 'PEN',
  /** Papua New Guinean Kina - 2 decimals */
  Pgk = 'PGK',
  /** Philippine Peso (Philippines) - 2 decimals */
  Php = 'PHP',
  /** Pakistani Rupee (Pakistan) - 2 decimals */
  Pkr = 'PKR',
  /** Polish Zloty (Poland) - 2 decimals */
  Pln = 'PLN',
  /** Paraguayan Guaraní (Paraguay) - 0 decimals */
  Pyg = 'PYG',
  /** Qatari Riyal (Qatar) - 2 decimals */
  Qar = 'QAR',
  /** Romanian Leu (Romania) - 2 decimals */
  Ron = 'RON',
  /** Serbian Dinar (Serbia) - 2 decimals */
  Rsd = 'RSD',
  /** Russian Ruble (Russia) - 2 decimals */
  Rub = 'RUB',
  /** Rwandan Franc (Rwanda) - 0 decimals */
  Rwf = 'RWF',
  /** Saudi Riyal (Saudi Arabia) - 2 decimals */
  Sar = 'SAR',
  /** Solomon Islands Dollar - 2 decimals */
  Sbd = 'SBD',
  /** Seychelles Rupee (Seychelles) - 2 decimals */
  Scr = 'SCR',
  /** Sudanese Pound (Sudan) - 2 decimals */
  Sdg = 'SDG',
  /** Swedish Krona (Sweden) - 2 decimals */
  Sek = 'SEK',
  /** Singapore Dollar (Singapore) - 2 decimals */
  Sgd = 'SGD',
  /** Saint Helena Pound - 2 decimals */
  Shp = 'SHP',
  /** Sierra Leonean Leone - 2 decimals */
  Sle = 'SLE',
  /** Somali Shilling (Somalia) - 2 decimals */
  Sos = 'SOS',
  /** Surinamese Dollar (Suriname) - 2 decimals */
  Srd = 'SRD',
  /** South Sudanese Pound - 2 decimals */
  Ssp = 'SSP',
  /** São Tomé and Príncipe Dobra - 2 decimals */
  Stn = 'STN',
  /** Salvadoran Colón (El Salvador) - 2 decimals */
  Svc = 'SVC',
  /** Syrian Pound (Syria) - 2 decimals */
  Syp = 'SYP',
  /** Eswatini Lilangeni (Eswatini) - 2 decimals */
  Szl = 'SZL',
  /** Thai Baht (Thailand) - 2 decimals */
  Thb = 'THB',
  /** Tajikistani Somoni (Tajikistan) - 2 decimals */
  Tjs = 'TJS',
  /** Turkmenistani Manat (Turkmenistan) - 2 decimals */
  Tmt = 'TMT',
  /** Tunisian Dinar (Tunisia) - 3 decimals */
  Tnd = 'TND',
  /** Tongan Paʻanga (Tonga) - 2 decimals */
  Top = 'TOP',
  /** Turkish Lira (Turkey) - 2 decimals */
  Try = 'TRY',
  /** Trinidad and Tobago Dollar - 2 decimals */
  Ttd = 'TTD',
  /** New Taiwan Dollar (Taiwan) - 2 decimals */
  Twd = 'TWD',
  /** Tanzanian Shilling (Tanzania) - 2 decimals */
  Tzs = 'TZS',
  /** Ukrainian Hryvnia (Ukraine) - 2 decimals */
  Uah = 'UAH',
  /** Ugandan Shilling (Uganda) - 0 decimals */
  Ugx = 'UGX',
  /** United States Dollar (USA) - 2 decimals */
  Usd = 'USD',
  /** Uruguayan Peso (Uruguay) - 2 decimals */
  Uyu = 'UYU',
  /** Uzbekistani Som (Uzbekistan) - 2 decimals */
  Uzs = 'UZS',
  /** Venezuelan Bolívar (Venezuela) - 2 decimals */
  Ves = 'VES',
  /** Vietnamese Dong (Vietnam) - 0 decimals */
  Vnd = 'VND',
  /** Vanuatu Vatu (Vanuatu) - 0 decimals */
  Vuv = 'VUV',
  /** Samoan Tala (Samoa) - 2 decimals */
  Wst = 'WST',
  /** Central African CFA Franc - 0 decimals */
  Xaf = 'XAF',
  /** East Caribbean Dollar - 2 decimals */
  Xcd = 'XCD',
  /** Special Drawing Rights (IMF) - 0 decimals */
  Xdr = 'XDR',
  /** West African CFA Franc - 0 decimals */
  Xof = 'XOF',
  /** CFP Franc - 0 decimals */
  Xpf = 'XPF',
  /** Yemeni Rial (Yemen) - 2 decimals */
  Yer = 'YER',
  /** South African Rand (South Africa) - 2 decimals */
  Zar = 'ZAR',
  /** Zambian Kwacha (Zambia) - 2 decimals */
  Zmw = 'ZMW',
  /** Zimbabwean Dollar (Zimbabwe) - 2 decimals */
  Zwl = 'ZWL'
}

/** Delivery cost with payment model */
export type ApiDeliveryCost = {
  __typename?: 'DeliveryCost';
  /** Delivery amount */
  amount: ApiMoney;
  /** Shipping payment model */
  paymentModel: ShippingPaymentModel;
};

/** Dimension (length) measurement units */
export enum DimensionUnit {
  /** Centimeter */
  Cm = 'cm',
  /** Foot */
  Ft = 'ft',
  /** Inch */
  In = 'in',
  /** Meter */
  M = 'm',
  /** Millimeter */
  Mm = 'mm'
}

/** Language/Locale codes based on ISO 639-1 and BCP 47 */
export enum LocaleCode {
  /** Akan */
  Ak = 'ak',
  /** Amharic */
  Am = 'am',
  /** Arabic */
  Ar = 'ar',
  /** Assamese */
  As = 'as',
  /** Azerbaijani */
  Az = 'az',
  /** Belarusian */
  Be = 'be',
  /** Bulgarian */
  Bg = 'bg',
  /** Bambara */
  Bm = 'bm',
  /** Bangla */
  Bn = 'bn',
  /** Tibetan */
  Bo = 'bo',
  /** Breton */
  Br = 'br',
  /** Bosnian */
  Bs = 'bs',
  /** Catalan */
  Ca = 'ca',
  /** Chechen */
  Ce = 'ce',
  /** Central Kurdish */
  Ckb = 'ckb',
  /** Czech */
  Cs = 'cs',
  /** Welsh */
  Cy = 'cy',
  /** Danish */
  Da = 'da',
  /** German */
  De = 'de',
  /** Dzongkha */
  Dz = 'dz',
  /** Ewe */
  Ee = 'ee',
  /** Greek */
  El = 'el',
  /** English */
  En = 'en',
  /** Esperanto */
  Eo = 'eo',
  /** Spanish */
  Es = 'es',
  /** Estonian */
  Et = 'et',
  /** Basque */
  Eu = 'eu',
  /** Persian */
  Fa = 'fa',
  /** Fulah */
  Ff = 'ff',
  /** Finnish */
  Fi = 'fi',
  /** Filipino */
  Fil = 'fil',
  /** Faroese */
  Fo = 'fo',
  /** French */
  Fr = 'fr',
  /** Western Frisian */
  Fy = 'fy',
  /** Irish */
  Ga = 'ga',
  /** Scottish Gaelic */
  Gd = 'gd',
  /** Galician */
  Gl = 'gl',
  /** Gujarati */
  Gu = 'gu',
  /** Manx */
  Gv = 'gv',
  /** Hausa */
  Ha = 'ha',
  /** Hebrew */
  He = 'he',
  /** Hindi */
  Hi = 'hi',
  /** Croatian */
  Hr = 'hr',
  /** Hungarian */
  Hu = 'hu',
  /** Armenian */
  Hy = 'hy',
  /** Interlingua */
  Ia = 'ia',
  /** Indonesian */
  Id = 'id',
  /** Igbo */
  Ig = 'ig',
  /** Sichuan Yi */
  Ii = 'ii',
  /** Icelandic */
  Is = 'is',
  /** Italian */
  It = 'it',
  /** Japanese */
  Ja = 'ja',
  /** Javanese */
  Jv = 'jv',
  /** Georgian */
  Ka = 'ka',
  /** Kikuyu */
  Ki = 'ki',
  /** Kazakh */
  Kk = 'kk',
  /** Kalaallisut */
  Kl = 'kl',
  /** Khmer */
  Km = 'km',
  /** Kannada */
  Kn = 'kn',
  /** Korean */
  Ko = 'ko',
  /** Kashmiri */
  Ks = 'ks',
  /** Kurdish */
  Ku = 'ku',
  /** Cornish */
  Kw = 'kw',
  /** Kyrgyz */
  Ky = 'ky',
  /** Luxembourgish */
  Lb = 'lb',
  /** Ganda */
  Lg = 'lg',
  /** Lingala */
  Ln = 'ln',
  /** Lao */
  Lo = 'lo',
  /** Lithuanian */
  Lt = 'lt',
  /** Luba-Katanga */
  Lu = 'lu',
  /** Latvian */
  Lv = 'lv',
  /** Malagasy */
  Mg = 'mg',
  /** Māori */
  Mi = 'mi',
  /** Macedonian */
  Mk = 'mk',
  /** Malayalam */
  Ml = 'ml',
  /** Mongolian */
  Mn = 'mn',
  /** Marathi */
  Mr = 'mr',
  /** Malay */
  Ms = 'ms',
  /** Maltese */
  Mt = 'mt',
  /** Burmese */
  My = 'my',
  /** Norwegian Bokmål */
  Nb = 'nb',
  /** North Ndebele */
  Nd = 'nd',
  /** Nepali */
  Ne = 'ne',
  /** Dutch */
  Nl = 'nl',
  /** Norwegian Nynorsk */
  Nn = 'nn',
  /** Norwegian */
  No = 'no',
  /** Oromo */
  Om = 'om',
  /** Odia */
  Or = 'or',
  /** Ossetic */
  Os = 'os',
  /** Punjabi */
  Pa = 'pa',
  /** Polish */
  Pl = 'pl',
  /** Pashto */
  Ps = 'ps',
  /** Portuguese (Brazil) */
  PtBr = 'pt_BR',
  /** Portuguese (Portugal) */
  PtPt = 'pt_PT',
  /** Quechua */
  Qu = 'qu',
  /** Romansh */
  Rm = 'rm',
  /** Rundi */
  Rn = 'rn',
  /** Romanian */
  Ro = 'ro',
  /** Russian */
  Ru = 'ru',
  /** Kinyarwanda */
  Rw = 'rw',
  /** Sanskrit */
  Sa = 'sa',
  /** Sardinian */
  Sc = 'sc',
  /** Sindhi */
  Sd = 'sd',
  /** Northern Sami */
  Se = 'se',
  /** Sango */
  Sg = 'sg',
  /** Sinhala */
  Si = 'si',
  /** Slovak */
  Sk = 'sk',
  /** Slovenian */
  Sl = 'sl',
  /** Shona */
  Sn = 'sn',
  /** Somali */
  So = 'so',
  /** Albanian */
  Sq = 'sq',
  /** Serbian */
  Sr = 'sr',
  /** Sundanese */
  Su = 'su',
  /** Swedish */
  Sv = 'sv',
  /** Swahili */
  Sw = 'sw',
  /** Tamil */
  Ta = 'ta',
  /** Telugu */
  Te = 'te',
  /** Tajik */
  Tg = 'tg',
  /** Thai */
  Th = 'th',
  /** Tigrinya */
  Ti = 'ti',
  /** Turkmen */
  Tk = 'tk',
  /** Tongan */
  To = 'to',
  /** Turkish */
  Tr = 'tr',
  /** Tatar */
  Tt = 'tt',
  /** Uyghur */
  Ug = 'ug',
  /** Ukrainian */
  Uk = 'uk',
  /** Urdu */
  Ur = 'ur',
  /** Uzbek */
  Uz = 'uz',
  /** Vietnamese */
  Vi = 'vi',
  /** Wolof */
  Wo = 'wo',
  /** Xhosa */
  Xh = 'xh',
  /** Yiddish */
  Yi = 'yi',
  /** Yoruba */
  Yo = 'yo',
  /** Chinese (Simplified) */
  ZhCn = 'zh_CN',
  /** Chinese (Traditional) */
  ZhTw = 'zh_TW',
  /** Zulu */
  Zu = 'zu'
}

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
export enum NotificationSeverity {
  /** Informational notice; does not indicate any change in checkout data. */
  Info = 'INFO',
  /** Notification about automatic adjustments (e.g., quantity reduced). */
  Warning = 'WARNING'
}

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

export enum OrderStatus {
  Active = 'ACTIVE',
  Cancelled = 'CANCELLED',
  Closed = 'CLOSED',
  Draft = 'DRAFT'
}

/** Payment flow for the method, aligned with payment-plugin-sdk. */
export enum PaymentFlow {
  /** Customer pays offline via provider (QR code, display code, etc). */
  Offline = 'OFFLINE',
  /** Customer pays online via provider (redirect/app flow handled externally). */
  Online = 'ONLINE',
  /** Customer pays later/on delivery or by invoice (offline instructions). */
  OnDelivery = 'ON_DELIVERY'
}

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
export enum ShippingPaymentModel {
  /** Customer pays carrier directly, NOT included in grandTotal */
  CarrierDirect = 'CARRIER_DIRECT',
  /** Customer pays merchant, included in grandTotal */
  MerchantCollected = 'MERCHANT_COLLECTED'
}

export type ApiUser = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
  /** List of the user's orders. */
  orders: Array<ApiOrder>;
};

/** Weight measurement units */
export enum WeightUnit {
  /** Gram */
  G = 'g',
  /** Kilogram */
  Kg = 'kg',
  /** Pound */
  Lb = 'lb',
  /** Ounce */
  Oz = 'oz'
}

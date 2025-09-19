import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from '@src/interfaces/gql-storefront-api/context.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: number; output: number; }
  CountryCode: { input: any; output: any; }
  CurrencyCode: { input: string; output: string; }
  Cursor: { input: any; output: any; }
  DateTime: { input: any; output: any; }
  Decimal: { input: any; output: any; }
  Email: { input: any; output: any; }
  JSON: { input: unknown; output: unknown; }
  Uuid: { input: any; output: any; }
};

/** A checkout with multiple items. */
export type ApiCheckout = ApiNode & {
  __typename?: 'Checkout';
  /** Applied promo codes for the checkout. */
  appliedPromoCodes: Array<ApiCheckoutPromoCode>;
  /** All cost calculations for the checkout. */
  cost: ApiCheckoutCost;
  /** When this checkout was first created. */
  createdAt: Scalars['DateTime']['output'];
  /** Customer identity associated with the checkout. */
  customerIdentity: ApiCheckoutCustomerIdentity;
  /** Customer note or special instructions for the checkout. */
  customerNote: Maybe<Scalars['String']['output']>;
  /** Delivery groups. */
  deliveryGroups: Array<ApiCheckoutDeliveryGroup>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** List of items in the checkout (paginated). */
  lines: Array<ApiCheckoutLine>;
  /** Notifications for the user regarding the checkout. */
  notifications: Array<ApiCheckoutNotification>;
  /** Quantity of the item being purchased. */
  totalQuantity: Scalars['Int']['output'];
  /** When this checkout was last updated. */
  updatedAt: Scalars['DateTime']['output'];
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
  currencyCode: Scalars['CurrencyCode']['input'];
  /** ID of the external source for the checkout. */
  externalId: InputMaybe<Scalars['String']['input']>;
  /** Source of sales for the checkout. */
  externalSource: InputMaybe<Scalars['String']['input']>;
  /** Unique idempotency key for the checkout. */
  idempotency: Scalars['String']['input'];
  /** Initial items to add to the new checkout. */
  items: Array<ApiCheckoutLineInput>;
  /** Locale code for the checkout. ISO 639-1 (2 letters, e.g., "en", "ru") */
  localeCode: Scalars['String']['input'];
};

/** Payload returned after creating a checkout. */
export type ApiCheckoutCreatePayload = {
  __typename?: 'CheckoutCreatePayload';
  /** The newly created checkout. */
  checkout: Maybe<ApiCheckout>;
  /** List of field-specific or general errors. */
  errors: Maybe<Array<ApiFieldError>>;
};

/** Input data for updating the checkout's display currency. */
export type ApiCheckoutCurrencyCodeUpdateInput = {
  /** Identifier of the checkout being operated on. */
  checkoutId: Scalars['ID']['input'];
  /** Currency code according to ISO 4217 (e.g., "USD", "EUR"). */
  currencyCode: Scalars['CurrencyCode']['input'];
};

export type ApiCheckoutCustomerIdentity = {
  __typename?: 'CheckoutCustomerIdentity';
  /** Country code of the customer. */
  countryCode: Maybe<Scalars['CountryCode']['output']>;
  /** Customer associated with the checkout. */
  customer: Maybe<ApiCustomer>;
  /** Customer email address associated with the checkout. */
  email: Maybe<Scalars['Email']['output']>;
  /** Phone number of the customer. */
  phone: Maybe<Scalars['String']['output']>;
};

/** Input data for updating customer identity data associated with the checkout. */
export type ApiCheckoutCustomerIdentityUpdateInput = {
  /** Identifier of the checkout being operated on. */
  checkoutId: Scalars['ID']['input'];
  /**
   * Country code of the customer.
   * ISO 3166-1 alpha-2.
   */
  countryCode: InputMaybe<Scalars['CountryCode']['input']>;
  /**
   * Customer identifier in external/internal system.
   * Used to link the checkout to an existing customer.
   */
  customerId: InputMaybe<Scalars['ID']['input']>;
  /** Customer email address. If specified, will be linked to the checkout. */
  email: InputMaybe<Scalars['Email']['input']>;
  /** Phone number of the customer. */
  phone: InputMaybe<Scalars['String']['input']>;
};

/** Input data for updating the customer note attached to the checkout. */
export type ApiCheckoutCustomerNoteUpdateInput = {
  /** Identifier of the checkout being operated on. */
  checkoutId: Scalars['ID']['input'];
  /**
   * Customer note text (delivery instructions, etc.).
   * Empty value clears the note.
   */
  note: InputMaybe<Scalars['String']['input']>;
};

/** Delivery address associated with a checkout. */
export type ApiCheckoutDeliveryAddress = {
  __typename?: 'CheckoutDeliveryAddress';
  /** Primary address line. */
  address1: Scalars['String']['output'];
  /** Secondary address line. */
  address2: Maybe<Scalars['String']['output']>;
  /** City name. */
  city: Scalars['String']['output'];
  /** Country code (ISO 3166-1 alpha-2). */
  countryCode: Scalars['CountryCode']['output'];
  /** Data associated with the delivery address. */
  data: Maybe<Scalars['JSON']['output']>;
  /** Email address for this delivery address. */
  email: Maybe<Scalars['Email']['output']>;
  /** First name for delivery. */
  firstName: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the delivery address. */
  id: Scalars['ID']['output'];
  /** Last name for delivery. */
  lastName: Maybe<Scalars['String']['output']>;
  /** Postal code. */
  postalCode: Maybe<Scalars['String']['output']>;
  /** Province code. */
  provinceCode: Maybe<Scalars['String']['output']>;
};

export type ApiCheckoutDeliveryAddressInput = {
  /** Primary address line. */
  address1: Scalars['String']['input'];
  /** Secondary address line. */
  address2: InputMaybe<Scalars['String']['input']>;
  /** City name. */
  city: Scalars['String']['input'];
  /** Country code (ISO 3166-1 alpha-2). */
  countryCode: Scalars['CountryCode']['input'];
  /** Data associated with the delivery address. */
  data: InputMaybe<Scalars['JSON']['input']>;
  /** Email address for this delivery address. */
  email: InputMaybe<Scalars['Email']['input']>;
  /** First name for delivery. */
  firstName: InputMaybe<Scalars['String']['input']>;
  /** Last name for delivery. */
  lastName: InputMaybe<Scalars['String']['input']>;
  /** Postal code. */
  postalCode: InputMaybe<Scalars['String']['input']>;
  /** Province code. */
  provinceCode: InputMaybe<Scalars['String']['input']>;
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
  /** List of delivery addresses to add. */
  addresses: Array<ApiCheckoutDeliveryAddressInput>;
  /** Identifier of the checkout being operated on. */
  checkoutId: Scalars['ID']['input'];
};

/** Input data for removing one or more delivery addresses from the checkout. */
export type ApiCheckoutDeliveryAddressesRemoveInput = {
  /** Identifiers of delivery addresses that should be removed. */
  addressIds: Array<Scalars['ID']['input']>;
  /** Identifier of the checkout being operated on. */
  checkoutId: Scalars['ID']['input'];
};

/** Input data for batch updating previously added delivery addresses. */
export type ApiCheckoutDeliveryAddressesUpdateInput = {
  /** Identifier of the checkout being operated on. */
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
  deliveryAddress: Maybe<ApiCheckoutDeliveryAddress>;
  /** Delivery methods associated with the delivery group. */
  deliveryMethods: Array<ApiCheckoutDeliveryMethod>;
  /** Estimated cost of the delivery group. */
  estimatedCost: Maybe<ApiDeliveryCost>;
  /** Unique identifier for the delivery group. */
  id: Scalars['ID']['output'];
  /** Selected delivery method associated with the delivery group. */
  selectedDeliveryMethod: Maybe<ApiCheckoutDeliveryMethod>;
};

export type ApiCheckoutDeliveryMethod = {
  __typename?: 'CheckoutDeliveryMethod';
  /** Code of the shipping method (e.g., "standard", "express", "courier"). */
  code: Scalars['String']['output'];
  /** Delivery method type associated with the delivery option. */
  deliveryMethodType: ApiCheckoutDeliveryMethodType;
  /** Provider data associated with the delivery method. */
  provider: ApiCheckoutDeliveryProvider;
};

export type ApiCheckoutDeliveryMethodType =
  /** Pickup delivery method. */
  | 'PICKUP'
  /** Shipping delivery method. */
  | 'SHIPPING';

/**
 * Input data for selecting/changing delivery method.
 * Can be applied to the entire checkout or to a specific delivery address.
 */
export type ApiCheckoutDeliveryMethodUpdateInput = {
  /**
   * Optional delivery address identifier if the method is selected for a specific address.
   * If not specified, the method applies to the entire checkout.
   */
  addressId: InputMaybe<Scalars['ID']['input']>;
  /** Identifier of the checkout being operated on. */
  checkoutId: Scalars['ID']['input'];
  /** Identifier of the shipping method available for this checkout/address. */
  shippingMethodId: Scalars['ID']['input'];
};

export type ApiCheckoutDeliveryProvider = {
  __typename?: 'CheckoutDeliveryProvider';
  /** Code of the provider (e.g., "novaposhta", "ups", "fedex", "dhl", "usps"). */
  code: Scalars['String']['output'];
  /** Data associated with the provider. */
  data: Scalars['JSON']['output'];
};

/** Input data for updating the checkout's language/locale code. */
export type ApiCheckoutLanguageCodeUpdateInput = {
  /** Identifier of the checkout being operated on. */
  checkoutId: Scalars['ID']['input'];
  /**
   * Language/locale code (ISO 639-1, BCP 47 when necessary), e.g. "en", "ru", "uk".
   * Affects localization and formatting.
   */
  localeCode: Scalars['String']['input'];
};

/** A single item in a checkout. */
export type ApiCheckoutLine = ApiNode & {
  __typename?: 'CheckoutLine';
  /** A list of components that make up this checkout line, such as individual products in a bundle. */
  children: Array<Maybe<ApiCheckoutLine>>;
  /** Cost calculations for this checkout item. */
  cost: ApiCheckoutLineCost;
  /** Global unique identifier for the checkout line. */
  id: Scalars['ID']['output'];
  /** Image URL of the purchasable. */
  imageSrc: Maybe<Scalars['String']['output']>;
  /** ID of the purchasable. */
  purchasableId: Scalars['ID']['output'];
  /** Purchasable snapshot saved at the time the line was added. */
  purchasableSnapshot: Maybe<Scalars['JSON']['output']>;
  /** Quantity of the item being purchased. */
  quantity: Scalars['Int']['output'];
  /** SKU of the purchasable. */
  sku: Maybe<Scalars['String']['output']>;
  /** Title of the purchasable. */
  title: Scalars['String']['output'];
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

/** Input data for a single item in the checkout. */
export type ApiCheckoutLineInput = {
  /** ID of the product to add or update. */
  purchasableId: Scalars['ID']['input'];
  /** ID of the purchasable snapshot to add or update. */
  purchasableSnapshot: InputMaybe<ApiPurchasableSnapshotInput>;
  /** Quantity of the product in the checkout. */
  quantity: Scalars['Int']['input'];
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
  lines: Array<ApiCheckoutLineInput>;
};

/** Payload returned after adding an item to the checkout. */
export type ApiCheckoutLinesAddPayload = {
  __typename?: 'CheckoutLinesAddPayload';
  /** The updated checkout. */
  checkout: Maybe<ApiCheckout>;
  /** List of field-specific or general errors. */
  errors: Maybe<Array<ApiFieldError>>;
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
  checkout: Maybe<ApiCheckout>;
  /** List of field-specific or general errors. */
  errors: Maybe<Array<ApiFieldError>>;
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
  checkout: Maybe<ApiCheckout>;
  /** List of field-specific or general errors. */
  errors: Maybe<Array<ApiFieldError>>;
};

/** Input data for adding an item to an existing checkout line. */
export type ApiCheckoutLinesLineAddInput = {
  /** ID of the purchasable to add. */
  purchasableId: Scalars['ID']['input'];
  /** Quantity to add; must be greater than 0. */
  quantity: Scalars['Int']['input'];
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
  checkout: Maybe<ApiCheckout>;
  /** List of field-specific or general errors. */
  errors: Maybe<Array<ApiFieldError>>;
};

export type ApiCheckoutMutation = {
  __typename?: 'CheckoutMutation';
  /** Creates a new checkout. */
  checkoutCreate: ApiCheckout;
  /** Updates the checkout's display currency (ISO 4217, e.g. "USD", "EUR"). */
  checkoutCurrencyCodeUpdate: ApiCheckout;
  /**
   * Updates customer identity data associated with the checkout
   * (email, customerId and country/language for calculations when necessary).
   */
  checkoutCustomerIdentityUpdate: ApiCheckout;
  /** Updates the customer note attached to the checkout (delivery instructions, etc.). */
  checkoutCustomerNoteUpdate: ApiCheckout;
  /** Adds one or more delivery addresses to the checkout (supports multi-shipping). */
  checkoutDeliveryAddressesAdd: ApiCheckout;
  /** Removes one or more delivery addresses previously linked to the checkout. */
  checkoutDeliveryAddressesRemove: ApiCheckout;
  /** Updates previously added delivery addresses (e.g., correcting postal code or city). */
  checkoutDeliveryAddressesUpdate: ApiCheckout;
  /** Selects or changes the delivery method for the entire checkout or a specific address. */
  checkoutDeliveryMethodUpdate: ApiCheckout;
  /** Updates the checkout's language/locale (affects localization and formatting). */
  checkoutLanguageCodeUpdate: ApiCheckout;
  /** Adds an item to an existing checkout. */
  checkoutLinesAdd: ApiCheckoutLinesAddPayload;
  /** Clears all items from a checkout. */
  checkoutLinesClear: ApiCheckoutLinesClearPayload;
  /** Removes a single item from the checkout. */
  checkoutLinesDelete: ApiCheckoutLinesDeletePayload;
  /** Updates the quantity of a specific checkout item. */
  checkoutLinesUpdate: ApiCheckoutLinesUpdatePayload;
  /** Applies a promo code/coupon to the checkout. */
  checkoutPromoCodeAdd: ApiCheckout;
  /** Removes a previously applied promo code/coupon from the checkout. */
  checkoutPromoCodeRemove: ApiCheckout;
};


export type ApiCheckoutMutationCheckoutCreateArgs = {
  input: ApiCheckoutCreateInput;
};


export type ApiCheckoutMutationCheckoutCurrencyCodeUpdateArgs = {
  input: ApiCheckoutCurrencyCodeUpdateInput;
};


export type ApiCheckoutMutationCheckoutCustomerIdentityUpdateArgs = {
  input: ApiCheckoutCustomerIdentityUpdateInput;
};


export type ApiCheckoutMutationCheckoutCustomerNoteUpdateArgs = {
  input: ApiCheckoutCustomerNoteUpdateInput;
};


export type ApiCheckoutMutationCheckoutDeliveryAddressesAddArgs = {
  input: ApiCheckoutDeliveryAddressesAddInput;
};


export type ApiCheckoutMutationCheckoutDeliveryAddressesRemoveArgs = {
  input: ApiCheckoutDeliveryAddressesRemoveInput;
};


export type ApiCheckoutMutationCheckoutDeliveryAddressesUpdateArgs = {
  input: ApiCheckoutDeliveryAddressesUpdateInput;
};


export type ApiCheckoutMutationCheckoutDeliveryMethodUpdateArgs = {
  input: ApiCheckoutDeliveryMethodUpdateInput;
};


export type ApiCheckoutMutationCheckoutLanguageCodeUpdateArgs = {
  input: ApiCheckoutLanguageCodeUpdateInput;
};


export type ApiCheckoutMutationCheckoutLinesAddArgs = {
  input: ApiCheckoutLinesAddInput;
};


export type ApiCheckoutMutationCheckoutLinesClearArgs = {
  input: ApiCheckoutLinesClearInput;
};


export type ApiCheckoutMutationCheckoutLinesDeleteArgs = {
  input: ApiCheckoutLinesDeleteInput;
};


export type ApiCheckoutMutationCheckoutLinesUpdateArgs = {
  input: ApiCheckoutLinesUpdateInput;
};


export type ApiCheckoutMutationCheckoutPromoCodeAddArgs = {
  input: ApiCheckoutPromoCodeAddInput;
};


export type ApiCheckoutMutationCheckoutPromoCodeRemoveArgs = {
  input: ApiCheckoutPromoCodeRemoveInput;
};

/** A non-blocking warning generated by checkout operations. */
export type ApiCheckoutNotification = {
  __typename?: 'CheckoutNotification';
  /** Code categorizing the warning. */
  code: ApiCheckoutNotificationCode;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** Whether the warning has been acknowledged by the user. */
  isDismissed: Scalars['Boolean']['output'];
  /** Importance level of the warning. */
  severity: ApiNotificationSeverity;
};

/**
 * Codes for warnings that may be returned with Checkout mutations,
 * indicating non-blocking adjustments or issues in the checkout.
 */
export type ApiCheckoutNotificationCode =
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

/** Applied promo code for a checkout. */
export type ApiCheckoutPromoCode = {
  __typename?: 'CheckoutPromoCode';
  /** When this promo code was applied. */
  appliedAt: Scalars['DateTime']['output'];
  /** Promo code text. */
  code: Scalars['String']['output'];
  /** Discount type (percentage). */
  discountType: Scalars['String']['output'];
  /** Discount value (percentage as number). */
  value: Scalars['Int']['output'];
  /** Discount provider. */
  provider: Scalars['String']['output'];
  /** Discount conditions. */
  conditions: Maybe<Scalars['JSON']['output']>;
};

/** Input data for applying a promo code to the checkout. */
export type ApiCheckoutPromoCodeAddInput = {
  /** Identifier of the checkout being operated on. */
  checkoutId: Scalars['ID']['input'];
  /** Text code of the coupon/promo code. */
  code: Scalars['String']['input'];
};

/** Input data for removing a previously applied promo code from the checkout. */
export type ApiCheckoutPromoCodeRemoveInput = {
  /** Identifier of the checkout being operated on. */
  checkoutId: Scalars['ID']['input'];
  /** Text code of the coupon/promo code that needs to be cancelled. */
  code: Scalars['String']['input'];
};

export type ApiCheckoutQuery = {
  __typename?: 'CheckoutQuery';
  /** Get a checkout by its ID. */
  checkout: Maybe<ApiCheckout>;
};


export type ApiCheckoutQueryCheckoutArgs = {
  id: Scalars['ID']['input'];
};

export type ApiCustomer = {
  __typename?: 'Customer';
  id: Scalars['ID']['output'];
};

/** Delivery cost with payment model */
export type ApiDeliveryCost = {
  __typename?: 'DeliveryCost';
  /** Delivery amount */
  amount: ApiMoney;
  /** Delivery payment model */
  paymentModel: ApiShippingPaymentModel;
};

export type ApiFieldError = {
  __typename?: 'FieldError';
  /** The field that caused the error. */
  field: Scalars['String']['output'];
  /** The error message. */
  message: Scalars['String']['output'];
};

export type ApiMoney = {
  __typename?: 'Money';
  /** The amount of money */
  amount: Scalars['Decimal']['output'];
  /** The currency code */
  currencyCode: Scalars['CurrencyCode']['output'];
};

export type ApiMutation = {
  __typename?: 'Mutation';
  checkoutMutation: ApiCheckoutMutation;
};

export type ApiNode = {
  id: Scalars['ID']['output'];
};

/** Severity levels for checkout warnings. */
export type ApiNotificationSeverity =
  /** Informational notice; does not indicate any change in checkout data. */
  | 'INFO'
  /** Notification about automatic adjustments (e.g., quantity reduced). */
  | 'WARNING';

export type ApiProductVariant = {
  __typename?: 'ProductVariant';
  id: Scalars['ID']['output'];
};

export type ApiPurchasable = ApiProductVariant;

export type ApiPurchasableSnapshotInput = {
  /** JSON data of the purchasable snapshot. */
  data: InputMaybe<Scalars['JSON']['input']>;
  /** Image URL of the purchasable snapshot. */
  imageUrl: InputMaybe<Scalars['String']['input']>;
  /** SKU of the purchasable snapshot. */
  sku: InputMaybe<Scalars['String']['input']>;
  /** Title of the purchasable snapshot. */
  title: Scalars['String']['input'];
};

export type ApiQuery = {
  __typename?: 'Query';
  checkoutQuery: ApiCheckoutQuery;
};

/** Delivery payment model */
export type ApiShippingPaymentModel =
  /** Customer pays carrier directly, NOT included in grandTotal */
  | 'CARRIER_DIRECT'
  /** Customer pays merchant, included in grandTotal */
  | 'MERCHANT_COLLECTED';



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
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

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping of union types */
export type ApiResolversUnionTypes<_RefType extends Record<string, unknown>> = {
  Purchasable: ( ApiProductVariant );
};

/** Mapping of interface types */
export type ApiResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  Node: ( ApiCheckout ) | ( ApiCheckoutLine );
};

/** Mapping between all available schema types and the resolvers types */
export type ApiResolversTypes = {
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Checkout: ResolverTypeWrapper<ApiCheckout>;
  CheckoutCost: ResolverTypeWrapper<ApiCheckoutCost>;
  CheckoutCreateInput: ApiCheckoutCreateInput;
  CheckoutCreatePayload: ResolverTypeWrapper<ApiCheckoutCreatePayload>;
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
  CheckoutDeliveryGroup: ResolverTypeWrapper<ApiCheckoutDeliveryGroup>;
  CheckoutDeliveryMethod: ResolverTypeWrapper<ApiCheckoutDeliveryMethod>;
  CheckoutDeliveryMethodType: ApiCheckoutDeliveryMethodType;
  CheckoutDeliveryMethodUpdateInput: ApiCheckoutDeliveryMethodUpdateInput;
  CheckoutDeliveryProvider: ResolverTypeWrapper<ApiCheckoutDeliveryProvider>;
  CheckoutLanguageCodeUpdateInput: ApiCheckoutLanguageCodeUpdateInput;
  CheckoutLine: ResolverTypeWrapper<ApiCheckoutLine>;
  CheckoutLineCost: ResolverTypeWrapper<ApiCheckoutLineCost>;
  CheckoutLineInput: ApiCheckoutLineInput;
  CheckoutLineUpdateInput: ApiCheckoutLineUpdateInput;
  CheckoutLinesAddInput: ApiCheckoutLinesAddInput;
  CheckoutLinesAddPayload: ResolverTypeWrapper<ApiCheckoutLinesAddPayload>;
  CheckoutLinesClearInput: ApiCheckoutLinesClearInput;
  CheckoutLinesClearPayload: ResolverTypeWrapper<ApiCheckoutLinesClearPayload>;
  CheckoutLinesDeleteInput: ApiCheckoutLinesDeleteInput;
  CheckoutLinesDeletePayload: ResolverTypeWrapper<ApiCheckoutLinesDeletePayload>;
  CheckoutLinesLineAddInput: ApiCheckoutLinesLineAddInput;
  CheckoutLinesUpdateInput: ApiCheckoutLinesUpdateInput;
  CheckoutLinesUpdatePayload: ResolverTypeWrapper<ApiCheckoutLinesUpdatePayload>;
  CheckoutMutation: ResolverTypeWrapper<ApiCheckoutMutation>;
  CheckoutNotification: ResolverTypeWrapper<ApiCheckoutNotification>;
  CheckoutNotificationCode: ApiCheckoutNotificationCode;
  CheckoutPromoCode: ResolverTypeWrapper<ApiCheckoutPromoCode>;
  CheckoutPromoCodeAddInput: ApiCheckoutPromoCodeAddInput;
  CheckoutPromoCodeRemoveInput: ApiCheckoutPromoCodeRemoveInput;
  CheckoutQuery: ResolverTypeWrapper<ApiCheckoutQuery>;
  CountryCode: ResolverTypeWrapper<Scalars['CountryCode']['output']>;
  CurrencyCode: ResolverTypeWrapper<Scalars['CurrencyCode']['output']>;
  Cursor: ResolverTypeWrapper<Scalars['Cursor']['output']>;
  Customer: ResolverTypeWrapper<ApiCustomer>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Decimal: ResolverTypeWrapper<Scalars['Decimal']['output']>;
  DeliveryCost: ResolverTypeWrapper<ApiDeliveryCost>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  FieldError: ResolverTypeWrapper<ApiFieldError>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Money: ResolverTypeWrapper<ApiMoney>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>['Node']>;
  NotificationSeverity: ApiNotificationSeverity;
  ProductVariant: ResolverTypeWrapper<ApiProductVariant>;
  Purchasable: ResolverTypeWrapper<ApiResolversUnionTypes<ApiResolversTypes>['Purchasable']>;
  PurchasableSnapshotInput: ApiPurchasableSnapshotInput;
  Query: ResolverTypeWrapper<{}>;
  ShippingPaymentModel: ApiShippingPaymentModel;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Uuid: ResolverTypeWrapper<Scalars['Uuid']['output']>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ApiResolversParentTypes = {
  BigInt: Scalars['BigInt']['output'];
  Boolean: Scalars['Boolean']['output'];
  Checkout: ApiCheckout;
  CheckoutCost: ApiCheckoutCost;
  CheckoutCreateInput: ApiCheckoutCreateInput;
  CheckoutCreatePayload: ApiCheckoutCreatePayload;
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
  CheckoutDeliveryGroup: ApiCheckoutDeliveryGroup;
  CheckoutDeliveryMethod: ApiCheckoutDeliveryMethod;
  CheckoutDeliveryMethodUpdateInput: ApiCheckoutDeliveryMethodUpdateInput;
  CheckoutDeliveryProvider: ApiCheckoutDeliveryProvider;
  CheckoutLanguageCodeUpdateInput: ApiCheckoutLanguageCodeUpdateInput;
  CheckoutLine: ApiCheckoutLine;
  CheckoutLineCost: ApiCheckoutLineCost;
  CheckoutLineInput: ApiCheckoutLineInput;
  CheckoutLineUpdateInput: ApiCheckoutLineUpdateInput;
  CheckoutLinesAddInput: ApiCheckoutLinesAddInput;
  CheckoutLinesAddPayload: ApiCheckoutLinesAddPayload;
  CheckoutLinesClearInput: ApiCheckoutLinesClearInput;
  CheckoutLinesClearPayload: ApiCheckoutLinesClearPayload;
  CheckoutLinesDeleteInput: ApiCheckoutLinesDeleteInput;
  CheckoutLinesDeletePayload: ApiCheckoutLinesDeletePayload;
  CheckoutLinesLineAddInput: ApiCheckoutLinesLineAddInput;
  CheckoutLinesUpdateInput: ApiCheckoutLinesUpdateInput;
  CheckoutLinesUpdatePayload: ApiCheckoutLinesUpdatePayload;
  CheckoutMutation: ApiCheckoutMutation;
  CheckoutNotification: ApiCheckoutNotification;
  CheckoutPromoCode: ApiCheckoutPromoCode;
  CheckoutPromoCodeAddInput: ApiCheckoutPromoCodeAddInput;
  CheckoutPromoCodeRemoveInput: ApiCheckoutPromoCodeRemoveInput;
  CheckoutQuery: ApiCheckoutQuery;
  CountryCode: Scalars['CountryCode']['output'];
  CurrencyCode: Scalars['CurrencyCode']['output'];
  Cursor: Scalars['Cursor']['output'];
  Customer: ApiCustomer;
  DateTime: Scalars['DateTime']['output'];
  Decimal: Scalars['Decimal']['output'];
  DeliveryCost: ApiDeliveryCost;
  Email: Scalars['Email']['output'];
  FieldError: ApiFieldError;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  Money: ApiMoney;
  Mutation: {};
  Node: ApiResolversInterfaceTypes<ApiResolversParentTypes>['Node'];
  ProductVariant: ApiProductVariant;
  Purchasable: ApiResolversUnionTypes<ApiResolversParentTypes>['Purchasable'];
  PurchasableSnapshotInput: ApiPurchasableSnapshotInput;
  Query: {};
  String: Scalars['String']['output'];
  Uuid: Scalars['Uuid']['output'];
};

export interface ApiBigIntScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type ApiCheckoutResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Checkout'] = ApiResolversParentTypes['Checkout']> = {
  appliedPromoCodes: Resolver<Array<ApiResolversTypes['CheckoutPromoCode']>, ParentType, ContextType>;
  cost: Resolver<ApiResolversTypes['CheckoutCost'], ParentType, ContextType>;
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  customerIdentity: Resolver<ApiResolversTypes['CheckoutCustomerIdentity'], ParentType, ContextType>;
  customerNote: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  deliveryGroups: Resolver<Array<ApiResolversTypes['CheckoutDeliveryGroup']>, ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lines: Resolver<Array<ApiResolversTypes['CheckoutLine']>, ParentType, ContextType>;
  notifications: Resolver<Array<ApiResolversTypes['CheckoutNotification']>, ParentType, ContextType>;
  totalQuantity: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  updatedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutCostResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutCost'] = ApiResolversParentTypes['CheckoutCost']> = {
  subtotalAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalDiscountAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalShippingAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalTaxAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutCreatePayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutCreatePayload'] = ApiResolversParentTypes['CheckoutCreatePayload']> = {
  checkout: Resolver<Maybe<ApiResolversTypes['Checkout']>, ParentType, ContextType>;
  errors: Resolver<Maybe<Array<ApiResolversTypes['FieldError']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutCustomerIdentityResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutCustomerIdentity'] = ApiResolversParentTypes['CheckoutCustomerIdentity']> = {
  countryCode: Resolver<Maybe<ApiResolversTypes['CountryCode']>, ParentType, ContextType>;
  customer: Resolver<Maybe<ApiResolversTypes['Customer']>, ParentType, ContextType>;
  email: Resolver<Maybe<ApiResolversTypes['Email']>, ParentType, ContextType>;
  phone: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutDeliveryAddressResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutDeliveryAddress'] = ApiResolversParentTypes['CheckoutDeliveryAddress']> = {
  address1: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  address2: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  city: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  countryCode: Resolver<ApiResolversTypes['CountryCode'], ParentType, ContextType>;
  data: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  email: Resolver<Maybe<ApiResolversTypes['Email']>, ParentType, ContextType>;
  firstName: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lastName: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  postalCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  provinceCode: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutDeliveryGroupResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutDeliveryGroup'] = ApiResolversParentTypes['CheckoutDeliveryGroup']> = {
  checkoutLines: Resolver<Array<ApiResolversTypes['CheckoutLine']>, ParentType, ContextType>;
  deliveryAddress: Resolver<Maybe<ApiResolversTypes['CheckoutDeliveryAddress']>, ParentType, ContextType>;
  deliveryMethods: Resolver<Array<ApiResolversTypes['CheckoutDeliveryMethod']>, ParentType, ContextType>;
  estimatedCost: Resolver<Maybe<ApiResolversTypes['DeliveryCost']>, ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  selectedDeliveryMethod: Resolver<Maybe<ApiResolversTypes['CheckoutDeliveryMethod']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutDeliveryMethodResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutDeliveryMethod'] = ApiResolversParentTypes['CheckoutDeliveryMethod']> = {
  code: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  deliveryMethodType: Resolver<ApiResolversTypes['CheckoutDeliveryMethodType'], ParentType, ContextType>;
  provider: Resolver<ApiResolversTypes['CheckoutDeliveryProvider'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutDeliveryProviderResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutDeliveryProvider'] = ApiResolversParentTypes['CheckoutDeliveryProvider']> = {
  code: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  data: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutLine'] = ApiResolversParentTypes['CheckoutLine']> = {
  children: Resolver<Array<Maybe<ApiResolversTypes['CheckoutLine']>>, ParentType, ContextType>;
  cost: Resolver<ApiResolversTypes['CheckoutLineCost'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  imageSrc: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  purchasableId: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  purchasableSnapshot: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  quantity: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  sku: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  title: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLineCostResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutLineCost'] = ApiResolversParentTypes['CheckoutLineCost']> = {
  compareAtUnitPrice: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  discountAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  subtotalAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  taxAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  unitPrice: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLinesAddPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutLinesAddPayload'] = ApiResolversParentTypes['CheckoutLinesAddPayload']> = {
  checkout: Resolver<Maybe<ApiResolversTypes['Checkout']>, ParentType, ContextType>;
  errors: Resolver<Maybe<Array<ApiResolversTypes['FieldError']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLinesClearPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutLinesClearPayload'] = ApiResolversParentTypes['CheckoutLinesClearPayload']> = {
  checkout: Resolver<Maybe<ApiResolversTypes['Checkout']>, ParentType, ContextType>;
  errors: Resolver<Maybe<Array<ApiResolversTypes['FieldError']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLinesDeletePayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutLinesDeletePayload'] = ApiResolversParentTypes['CheckoutLinesDeletePayload']> = {
  checkout: Resolver<Maybe<ApiResolversTypes['Checkout']>, ParentType, ContextType>;
  errors: Resolver<Maybe<Array<ApiResolversTypes['FieldError']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLinesUpdatePayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutLinesUpdatePayload'] = ApiResolversParentTypes['CheckoutLinesUpdatePayload']> = {
  checkout: Resolver<Maybe<ApiResolversTypes['Checkout']>, ParentType, ContextType>;
  errors: Resolver<Maybe<Array<ApiResolversTypes['FieldError']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutMutationResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutMutation'] = ApiResolversParentTypes['CheckoutMutation']> = {
  checkoutCreate: Resolver<ApiResolversTypes['Checkout'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutCreateArgs, 'input'>>;
  checkoutCurrencyCodeUpdate: Resolver<ApiResolversTypes['Checkout'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutCurrencyCodeUpdateArgs, 'input'>>;
  checkoutCustomerIdentityUpdate: Resolver<ApiResolversTypes['Checkout'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutCustomerIdentityUpdateArgs, 'input'>>;
  checkoutCustomerNoteUpdate: Resolver<ApiResolversTypes['Checkout'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutCustomerNoteUpdateArgs, 'input'>>;
  checkoutDeliveryAddressesAdd: Resolver<ApiResolversTypes['Checkout'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutDeliveryAddressesAddArgs, 'input'>>;
  checkoutDeliveryAddressesRemove: Resolver<ApiResolversTypes['Checkout'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutDeliveryAddressesRemoveArgs, 'input'>>;
  checkoutDeliveryAddressesUpdate: Resolver<ApiResolversTypes['Checkout'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutDeliveryAddressesUpdateArgs, 'input'>>;
  checkoutDeliveryMethodUpdate: Resolver<ApiResolversTypes['Checkout'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutDeliveryMethodUpdateArgs, 'input'>>;
  checkoutLanguageCodeUpdate: Resolver<ApiResolversTypes['Checkout'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutLanguageCodeUpdateArgs, 'input'>>;
  checkoutLinesAdd: Resolver<ApiResolversTypes['CheckoutLinesAddPayload'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutLinesAddArgs, 'input'>>;
  checkoutLinesClear: Resolver<ApiResolversTypes['CheckoutLinesClearPayload'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutLinesClearArgs, 'input'>>;
  checkoutLinesDelete: Resolver<ApiResolversTypes['CheckoutLinesDeletePayload'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutLinesDeleteArgs, 'input'>>;
  checkoutLinesUpdate: Resolver<ApiResolversTypes['CheckoutLinesUpdatePayload'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutLinesUpdateArgs, 'input'>>;
  checkoutPromoCodeAdd: Resolver<ApiResolversTypes['Checkout'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutPromoCodeAddArgs, 'input'>>;
  checkoutPromoCodeRemove: Resolver<ApiResolversTypes['Checkout'], ParentType, ContextType, RequireFields<ApiCheckoutMutationCheckoutPromoCodeRemoveArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutNotificationResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutNotification'] = ApiResolversParentTypes['CheckoutNotification']> = {
  code: Resolver<ApiResolversTypes['CheckoutNotificationCode'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  iid: Resolver<ApiResolversTypes['Uuid'], ParentType, ContextType>;
  isDismissed: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  severity: Resolver<ApiResolversTypes['NotificationSeverity'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutPromoCodeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutPromoCode'] = ApiResolversParentTypes['CheckoutPromoCode']> = {
  appliedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  code: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  discountType: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  value: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  provider: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  conditions: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutQueryResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutQuery'] = ApiResolversParentTypes['CheckoutQuery']> = {
  checkout: Resolver<Maybe<ApiResolversTypes['Checkout']>, ParentType, ContextType, RequireFields<ApiCheckoutQueryCheckoutArgs, 'id'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiCountryCodeScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['CountryCode'], any> {
  name: 'CountryCode';
}

export interface ApiCurrencyCodeScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['CurrencyCode'], any> {
  name: 'CurrencyCode';
}

export interface ApiCursorScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Cursor'], any> {
  name: 'Cursor';
}

export type ApiCustomerResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Customer'] = ApiResolversParentTypes['Customer']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiDateTimeScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface ApiDecimalScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Decimal'], any> {
  name: 'Decimal';
}

export type ApiDeliveryCostResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['DeliveryCost'] = ApiResolversParentTypes['DeliveryCost']> = {
  amount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  paymentModel: Resolver<ApiResolversTypes['ShippingPaymentModel'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiEmailScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Email'], any> {
  name: 'Email';
}

export type ApiFieldErrorResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['FieldError'] = ApiResolversParentTypes['FieldError']> = {
  field: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  message: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiJsonScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type ApiMoneyResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Money'] = ApiResolversParentTypes['Money']> = {
  amount: Resolver<ApiResolversTypes['Decimal'], ParentType, ContextType>;
  currencyCode: Resolver<ApiResolversTypes['CurrencyCode'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiMutationResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Mutation'] = ApiResolversParentTypes['Mutation']> = {
  checkoutMutation: Resolver<ApiResolversTypes['CheckoutMutation'], ParentType, ContextType>;
};

export type ApiNodeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Node'] = ApiResolversParentTypes['Node']> = {
  __resolveType: TypeResolveFn<'Checkout' | 'CheckoutLine', ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
};

export type ApiProductVariantResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['ProductVariant'] = ApiResolversParentTypes['ProductVariant']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiPurchasableResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Purchasable'] = ApiResolversParentTypes['Purchasable']> = {
  __resolveType: TypeResolveFn<'ProductVariant', ParentType, ContextType>;
};

export type ApiQueryResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Query'] = ApiResolversParentTypes['Query']> = {
  checkoutQuery: Resolver<ApiResolversTypes['CheckoutQuery'], ParentType, ContextType>;
};

export interface ApiUuidScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Uuid'], any> {
  name: 'Uuid';
}

export type ApiResolvers<ContextType = GraphQLContext> = {
  BigInt: GraphQLScalarType;
  Checkout: ApiCheckoutResolvers<ContextType>;
  CheckoutCost: ApiCheckoutCostResolvers<ContextType>;
  CheckoutCreatePayload: ApiCheckoutCreatePayloadResolvers<ContextType>;
  CheckoutCustomerIdentity: ApiCheckoutCustomerIdentityResolvers<ContextType>;
  CheckoutDeliveryAddress: ApiCheckoutDeliveryAddressResolvers<ContextType>;
  CheckoutDeliveryGroup: ApiCheckoutDeliveryGroupResolvers<ContextType>;
  CheckoutDeliveryMethod: ApiCheckoutDeliveryMethodResolvers<ContextType>;
  CheckoutDeliveryProvider: ApiCheckoutDeliveryProviderResolvers<ContextType>;
  CheckoutLine: ApiCheckoutLineResolvers<ContextType>;
  CheckoutLineCost: ApiCheckoutLineCostResolvers<ContextType>;
  CheckoutLinesAddPayload: ApiCheckoutLinesAddPayloadResolvers<ContextType>;
  CheckoutLinesClearPayload: ApiCheckoutLinesClearPayloadResolvers<ContextType>;
  CheckoutLinesDeletePayload: ApiCheckoutLinesDeletePayloadResolvers<ContextType>;
  CheckoutLinesUpdatePayload: ApiCheckoutLinesUpdatePayloadResolvers<ContextType>;
  CheckoutMutation: ApiCheckoutMutationResolvers<ContextType>;
  CheckoutNotification: ApiCheckoutNotificationResolvers<ContextType>;
  CheckoutPromoCode: ApiCheckoutPromoCodeResolvers<ContextType>;
  CheckoutQuery: ApiCheckoutQueryResolvers<ContextType>;
  CountryCode: GraphQLScalarType;
  CurrencyCode: GraphQLScalarType;
  Cursor: GraphQLScalarType;
  Customer: ApiCustomerResolvers<ContextType>;
  DateTime: GraphQLScalarType;
  Decimal: GraphQLScalarType;
  DeliveryCost: ApiDeliveryCostResolvers<ContextType>;
  Email: GraphQLScalarType;
  FieldError: ApiFieldErrorResolvers<ContextType>;
  JSON: GraphQLScalarType;
  Money: ApiMoneyResolvers<ContextType>;
  Mutation: ApiMutationResolvers<ContextType>;
  Node: ApiNodeResolvers<ContextType>;
  ProductVariant: ApiProductVariantResolvers<ContextType>;
  Purchasable: ApiPurchasableResolvers<ContextType>;
  Query: ApiQueryResolvers<ContextType>;
  Uuid: GraphQLScalarType;
};

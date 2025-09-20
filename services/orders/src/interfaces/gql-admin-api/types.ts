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

/** A order with multiple items. */
export type ApiOrder = ApiNode & {
  __typename?: 'Order';
  /** Applied promo codes for the order. */
  appliedPromoCodes: Array<ApiOrderPromoCode>;
  /** All cost calculations for the order. */
  cost: ApiOrderCost;
  /** When this order was first created. */
  createdAt: Scalars['DateTime']['output'];
  /** Customer identity associated with the order. */
  customerIdentity: ApiOrderCustomerIdentity;
  /** Customer note or special instructions for the order. */
  customerNote: Maybe<Scalars['String']['output']>;
  /** Delivery groups. */
  deliveryGroups: Array<ApiOrderDeliveryGroup>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** List of items in the order (paginated). */
  lines: Array<ApiOrderLine>;
  /** Notifications for the user regarding the order. */
  notifications: Array<ApiOrderNotification>;
  /** Quantity of the item being purchased. */
  totalQuantity: Scalars['Int']['output'];
  /** When this order was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** All monetary calculations related to the order. */
export type ApiOrderCost = {
  __typename?: 'OrderCost';
  /** Total value of items before any discounts. */
  subtotalAmount: ApiMoney;
  /** Final amount to be paid, including item cost, shipping, and taxes. */
  totalAmount: ApiMoney;
  /** Total discount from both item-level and order-level promotions. */
  totalDiscountAmount: ApiMoney;
  /** Total shipping cost (only MERCHANT_COLLECTED payments). */
  totalShippingAmount: ApiMoney;
  /** Total tax amount applied to the order. */
  totalTaxAmount: ApiMoney;
};

/** Input data for creating a new order. */
export type ApiOrderCreateInput = {
  /** Display currency code for all items. ISO 4217 (3 letters, e.g., "USD", "EUR") */
  currencyCode: Scalars['CurrencyCode']['input'];
  /** ID of the external source for the order. */
  externalId: InputMaybe<Scalars['String']['input']>;
  /** Source of sales for the order. */
  externalSource: InputMaybe<Scalars['String']['input']>;
  /** Unique idempotency key for the order. */
  idempotency: Scalars['String']['input'];
  /** Initial items to add to the new order. */
  items: Array<ApiOrderLineInput>;
  /** Locale code for the order. ISO 639-1 (2 letters, e.g., "en", "ru") */
  localeCode: Scalars['String']['input'];
};

/** Payload returned after creating a order. */
export type ApiOrderCreatePayload = {
  __typename?: 'OrderCreatePayload';
  /** The newly created order. */
  order: Maybe<ApiOrder>;
  /** List of field-specific or general errors. */
  errors: Maybe<Array<ApiFieldError>>;
};

/** Input data for updating the order's display currency. */
export type ApiOrderCurrencyCodeUpdateInput = {
  /** Identifier of the order being operated on. */
  orderId: Scalars['ID']['input'];
  /** Currency code according to ISO 4217 (e.g., "USD", "EUR"). */
  currencyCode: Scalars['CurrencyCode']['input'];
};

export type ApiOrderCustomerIdentity = {
  __typename?: 'OrderCustomerIdentity';
  /** Country code of the customer. */
  countryCode: Maybe<Scalars['CountryCode']['output']>;
  /** Customer associated with the order. */
  customer: Maybe<ApiCustomer>;
  /** Customer email address associated with the order. */
  email: Maybe<Scalars['Email']['output']>;
  /** Phone number of the customer. */
  phone: Maybe<Scalars['String']['output']>;
};

/** Input data for updating customer identity data associated with the order. */
export type ApiOrderCustomerIdentityUpdateInput = {
  /** Identifier of the order being operated on. */
  orderId: Scalars['ID']['input'];
  /**
   * Country code of the customer.
   * ISO 3166-1 alpha-2.
   */
  countryCode: InputMaybe<Scalars['CountryCode']['input']>;
  /**
   * Customer identifier in external/internal system.
   * Used to link the order to an existing customer.
   */
  customerId: InputMaybe<Scalars['ID']['input']>;
  /** Customer email address. If specified, will be linked to the order. */
  email: InputMaybe<Scalars['Email']['input']>;
  /** Phone number of the customer. */
  phone: InputMaybe<Scalars['String']['input']>;
};

/** Input data for updating the customer note attached to the order. */
export type ApiOrderCustomerNoteUpdateInput = {
  /** Identifier of the order being operated on. */
  orderId: Scalars['ID']['input'];
  /**
   * Customer note text (delivery instructions, etc.).
   * Empty value clears the note.
   */
  note: InputMaybe<Scalars['String']['input']>;
};

/** Delivery address associated with a order. */
export type ApiOrderDeliveryAddress = {
  __typename?: 'OrderDeliveryAddress';
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

export type ApiOrderDeliveryAddressInput = {
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
export type ApiOrderDeliveryAddressUpdateInput = {
  /** New postal address values. */
  address: ApiOrderDeliveryAddressInput;
  /** Identifier of the existing delivery address in the order. */
  addressId: Scalars['ID']['input'];
};

/**
 * Input data for adding one or more delivery addresses to the order.
 * Supports multi-shipping.
 */
export type ApiOrderDeliveryAddressesAddInput = {
  /** List of delivery addresses to add. */
  addresses: Array<ApiOrderDeliveryAddressInput>;
  /** Identifier of the order being operated on. */
  orderId: Scalars['ID']['input'];
};

/** Input data for removing one or more delivery addresses from the order. */
export type ApiOrderDeliveryAddressesRemoveInput = {
  /** Identifiers of delivery addresses that should be removed. */
  addressIds: Array<Scalars['ID']['input']>;
  /** Identifier of the order being operated on. */
  orderId: Scalars['ID']['input'];
};

/** Input data for batch updating previously added delivery addresses. */
export type ApiOrderDeliveryAddressesUpdateInput = {
  /** Identifier of the order being operated on. */
  orderId: Scalars['ID']['input'];
  /** List of updates for delivery addresses. */
  updates: Array<ApiOrderDeliveryAddressUpdateInput>;
};

/** Delivery group for one or more order lines. */
export type ApiOrderDeliveryGroup = {
  __typename?: 'OrderDeliveryGroup';
  /** Order lines associated with the delivery group. */
  orderLines: Array<ApiOrderLine>;
  /** Delivery address associated with the delivery group. */
  deliveryAddress: Maybe<ApiOrderDeliveryAddress>;
  /** Delivery methods associated with the delivery group. */
  deliveryMethods: Array<ApiOrderDeliveryMethod>;
  /** Estimated cost of the delivery group. */
  estimatedCost: Maybe<ApiDeliveryCost>;
  /** Unique identifier for the delivery group. */
  id: Scalars['ID']['output'];
  /** Selected delivery method associated with the delivery group. */
  selectedDeliveryMethod: Maybe<ApiOrderDeliveryMethod>;
};

export type ApiOrderDeliveryMethod = {
  __typename?: 'OrderDeliveryMethod';
  /** Code of the shipping method (e.g., "standard", "express", "courier"). */
  code: Scalars['String']['output'];
  /** Delivery method type associated with the delivery option. */
  deliveryMethodType: ApiOrderDeliveryMethodType;
  /** Provider data associated with the delivery method. */
  provider: ApiOrderDeliveryProvider;
};

export type ApiOrderDeliveryMethodType =
  /** Pickup delivery method. */
  | 'PICKUP'
  /** Shipping delivery method. */
  | 'SHIPPING';

/**
 * Input data for selecting/changing delivery method.
 * Can be applied to the entire order or to a specific delivery address.
 */
export type ApiOrderDeliveryMethodUpdateInput = {
  /**
   * Optional delivery address identifier if the method is selected for a specific address.
   * If not specified, the method applies to the entire order.
   */
  addressId: InputMaybe<Scalars['ID']['input']>;
  /** Identifier of the order being operated on. */
  orderId: Scalars['ID']['input'];
  /** Identifier of the shipping method available for this order/address. */
  shippingMethodId: Scalars['ID']['input'];
};

export type ApiOrderDeliveryProvider = {
  __typename?: 'OrderDeliveryProvider';
  /** Code of the provider (e.g., "novaposhta", "ups", "fedex", "dhl", "usps"). */
  code: Scalars['String']['output'];
  /** Data associated with the provider. */
  data: Scalars['JSON']['output'];
};

/** Input data for updating the order's language/locale code. */
export type ApiOrderLanguageCodeUpdateInput = {
  /** Identifier of the order being operated on. */
  orderId: Scalars['ID']['input'];
  /**
   * Language/locale code (ISO 639-1, BCP 47 when necessary), e.g. "en", "ru", "uk".
   * Affects localization and formatting.
   */
  localeCode: Scalars['String']['input'];
};

/** A single item in a order. */
export type ApiOrderLine = ApiNode & {
  __typename?: 'OrderLine';
  /** A list of components that make up this order line, such as individual products in a bundle. */
  children: Array<Maybe<ApiOrderLine>>;
  /** Cost calculations for this order item. */
  cost: ApiOrderLineCost;
  /** Global unique identifier for the order line. */
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

/** Detailed breakdown of costs for a order line item */
export type ApiOrderLineCost = {
  __typename?: 'OrderLineCost';
  /** The original list price per unit before any discounts. */
  compareAtUnitPrice: ApiMoney;
  /** Discount amount applied to a line. */
  discountAmount: ApiMoney;
  /** Total cost of all units before discounts. */
  subtotalAmount: ApiMoney;
  /** Total tax amount applied to the order line. */
  taxAmount: ApiMoney;
  /** Total cost of this line (all units), after discounts and taxes. */
  totalAmount: ApiMoney;
  /** The current price per unit before discounts are applied (may differ from compareAt price if on sale). */
  unitPrice: ApiMoney;
};

/** Input data for a single item in the order. */
export type ApiOrderLineInput = {
  /** ID of the product to add or update. */
  purchasableId: Scalars['ID']['input'];
  /** ID of the purchasable snapshot to add or update. */
  purchasableSnapshot: InputMaybe<ApiPurchasableSnapshotInput>;
  /** Quantity of the product in the order. */
  quantity: Scalars['Int']['input'];
};

/** Input data for updating the quantity of a specific order item. */
export type ApiOrderLineUpdateInput = {
  /** ID of the order item to update. */
  lineId: Scalars['ID']['input'];
  /**
   * New quantity for the order item.
   * If set to 0, the item will be removed.
   */
  quantity: Scalars['Int']['input'];
};

/** Input data for adding an item to an existing order. */
export type ApiOrderLinesAddInput = {
  /** ID of the order. */
  orderId: Scalars['ID']['input'];
  /** List of order items to add. */
  lines: Array<ApiOrderLineInput>;
};

/** Payload returned after adding an item to the order. */
export type ApiOrderLinesAddPayload = {
  __typename?: 'OrderLinesAddPayload';
  /** The updated order. */
  order: Maybe<ApiOrder>;
  /** List of field-specific or general errors. */
  errors: Maybe<Array<ApiFieldError>>;
};

/** Input data for clearing all items from a order. */
export type ApiOrderLinesClearInput = {
  /** ID of the order to clear. */
  orderId: Scalars['ID']['input'];
};

/** Payload returned after clearing all items from the order. */
export type ApiOrderLinesClearPayload = {
  __typename?: 'OrderLinesClearPayload';
  /** The updated (now empty) order. */
  order: Maybe<ApiOrder>;
  /** List of field-specific or general errors. */
  errors: Maybe<Array<ApiFieldError>>;
};

/** Input data for removing one or more items from the order. */
export type ApiOrderLinesDeleteInput = {
  /** ID of the order. */
  orderId: Scalars['ID']['input'];
  /** IDs of the lines to remove. */
  lineIds: Array<Scalars['ID']['input']>;
};

/** Payload returned after removing an item from the order. */
export type ApiOrderLinesDeletePayload = {
  __typename?: 'OrderLinesDeletePayload';
  /** The updated order. */
  order: Maybe<ApiOrder>;
  /** List of field-specific or general errors. */
  errors: Maybe<Array<ApiFieldError>>;
};

/** Input data for adding an item to an existing order line. */
export type ApiOrderLinesLineAddInput = {
  /** ID of the purchasable to add. */
  purchasableId: Scalars['ID']['input'];
  /** Quantity to add; must be greater than 0. */
  quantity: Scalars['Int']['input'];
};

/** Input data for updating the quantity of a specific order item. */
export type ApiOrderLinesUpdateInput = {
  /** ID of the order. */
  orderId: Scalars['ID']['input'];
  /** List of order items to update. */
  lines: Array<ApiOrderLineUpdateInput>;
};

/** Payload returned after updating a order item's quantity. */
export type ApiOrderLinesUpdatePayload = {
  __typename?: 'OrderLinesUpdatePayload';
  /** The updated order. */
  order: Maybe<ApiOrder>;
  /** List of field-specific or general errors. */
  errors: Maybe<Array<ApiFieldError>>;
};

export type ApiOrderMutation = {
  __typename?: 'OrderMutation';
  /** Creates a new order. */
  orderCreate: ApiOrder;
  /** Updates the order's display currency (ISO 4217, e.g. "USD", "EUR"). */
  orderCurrencyCodeUpdate: ApiOrder;
  /**
   * Updates customer identity data associated with the order
   * (email, customerId and country/language for calculations when necessary).
   */
  orderCustomerIdentityUpdate: ApiOrder;
  /** Updates the customer note attached to the order (delivery instructions, etc.). */
  orderCustomerNoteUpdate: ApiOrder;
  /** Adds one or more delivery addresses to the order (supports multi-shipping). */
  orderDeliveryAddressesAdd: ApiOrder;
  /** Removes one or more delivery addresses previously linked to the order. */
  orderDeliveryAddressesRemove: ApiOrder;
  /** Updates previously added delivery addresses (e.g., correcting postal code or city). */
  orderDeliveryAddressesUpdate: ApiOrder;
  /** Selects or changes the delivery method for the entire order or a specific address. */
  orderDeliveryMethodUpdate: ApiOrder;
  /** Updates the order's language/locale (affects localization and formatting). */
  orderLanguageCodeUpdate: ApiOrder;
  /** Adds an item to an existing order. */
  orderLinesAdd: ApiOrderLinesAddPayload;
  /** Clears all items from a order. */
  orderLinesClear: ApiOrderLinesClearPayload;
  /** Removes a single item from the order. */
  orderLinesDelete: ApiOrderLinesDeletePayload;
  /** Updates the quantity of a specific order item. */
  orderLinesUpdate: ApiOrderLinesUpdatePayload;
  /** Applies a promo code/coupon to the order. */
  orderPromoCodeAdd: ApiOrder;
  /** Removes a previously applied promo code/coupon from the order. */
  orderPromoCodeRemove: ApiOrder;
};


export type ApiOrderMutationOrderCreateArgs = {
  input: ApiOrderCreateInput;
};


export type ApiOrderMutationOrderCurrencyCodeUpdateArgs = {
  input: ApiOrderCurrencyCodeUpdateInput;
};


export type ApiOrderMutationOrderCustomerIdentityUpdateArgs = {
  input: ApiOrderCustomerIdentityUpdateInput;
};


export type ApiOrderMutationOrderCustomerNoteUpdateArgs = {
  input: ApiOrderCustomerNoteUpdateInput;
};


export type ApiOrderMutationOrderDeliveryAddressesAddArgs = {
  input: ApiOrderDeliveryAddressesAddInput;
};


export type ApiOrderMutationOrderDeliveryAddressesRemoveArgs = {
  input: ApiOrderDeliveryAddressesRemoveInput;
};


export type ApiOrderMutationOrderDeliveryAddressesUpdateArgs = {
  input: ApiOrderDeliveryAddressesUpdateInput;
};


export type ApiOrderMutationOrderDeliveryMethodUpdateArgs = {
  input: ApiOrderDeliveryMethodUpdateInput;
};


export type ApiOrderMutationOrderLanguageCodeUpdateArgs = {
  input: ApiOrderLanguageCodeUpdateInput;
};


export type ApiOrderMutationOrderLinesAddArgs = {
  input: ApiOrderLinesAddInput;
};


export type ApiOrderMutationOrderLinesClearArgs = {
  input: ApiOrderLinesClearInput;
};


export type ApiOrderMutationOrderLinesDeleteArgs = {
  input: ApiOrderLinesDeleteInput;
};


export type ApiOrderMutationOrderLinesUpdateArgs = {
  input: ApiOrderLinesUpdateInput;
};


export type ApiOrderMutationOrderPromoCodeAddArgs = {
  input: ApiOrderPromoCodeAddInput;
};


export type ApiOrderMutationOrderPromoCodeRemoveArgs = {
  input: ApiOrderPromoCodeRemoveInput;
};

/** A non-blocking warning generated by order operations. */
export type ApiOrderNotification = {
  __typename?: 'OrderNotification';
  /** Code categorizing the warning. */
  code: ApiOrderNotificationCode;
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
 * Codes for warnings that may be returned with Order mutations,
 * indicating non-blocking adjustments or issues in the order.
 */
export type ApiOrderNotificationCode =
  /** An item in the order is no longer available for sale. */
  | 'ITEM_UNAVAILABLE'
  /**
   * The requested quantity exceeds available stock;
   * quantity was automatically reduced to the maximum available.
   */
  | 'NOT_ENOUGH_STOCK'
  /** The requested item is completely out of stock and has been removed from the order. */
  | 'OUT_OF_STOCK'
  /** The price of one or more items has changed since they were added to the order. */
  | 'PRICE_CHANGED';

/** Applied promo code for a order. */
export type ApiOrderPromoCode = {
  __typename?: 'OrderPromoCode';
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

/** Input data for applying a promo code to the order. */
export type ApiOrderPromoCodeAddInput = {
  /** Identifier of the order being operated on. */
  orderId: Scalars['ID']['input'];
  /** Text code of the coupon/promo code. */
  code: Scalars['String']['input'];
};

/** Input data for removing a previously applied promo code from the order. */
export type ApiOrderPromoCodeRemoveInput = {
  /** Identifier of the order being operated on. */
  orderId: Scalars['ID']['input'];
  /** Text code of the coupon/promo code that needs to be cancelled. */
  code: Scalars['String']['input'];
};

export type ApiOrderQuery = {
  __typename?: 'OrderQuery';
  /** Get a order by its ID. */
  order: Maybe<ApiOrder>;
};


export type ApiOrderQueryOrderArgs = {
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
  orderMutation: ApiOrderMutation;
};

export type ApiNode = {
  id: Scalars['ID']['output'];
};

/** Severity levels for order warnings. */
export type ApiNotificationSeverity =
  /** Informational notice; does not indicate any change in order data. */
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
  orderQuery: ApiOrderQuery;
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
  Node: ( ApiOrder ) | ( ApiOrderLine );
};

/** Mapping between all available schema types and the resolvers types */
export type ApiResolversTypes = {
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Order: ResolverTypeWrapper<ApiOrder>;
  OrderCost: ResolverTypeWrapper<ApiOrderCost>;
  OrderCreateInput: ApiOrderCreateInput;
  OrderCreatePayload: ResolverTypeWrapper<ApiOrderCreatePayload>;
  OrderCurrencyCodeUpdateInput: ApiOrderCurrencyCodeUpdateInput;
  OrderCustomerIdentity: ResolverTypeWrapper<ApiOrderCustomerIdentity>;
  OrderCustomerIdentityUpdateInput: ApiOrderCustomerIdentityUpdateInput;
  OrderCustomerNoteUpdateInput: ApiOrderCustomerNoteUpdateInput;
  OrderDeliveryAddress: ResolverTypeWrapper<ApiOrderDeliveryAddress>;
  OrderDeliveryAddressInput: ApiOrderDeliveryAddressInput;
  OrderDeliveryAddressUpdateInput: ApiOrderDeliveryAddressUpdateInput;
  OrderDeliveryAddressesAddInput: ApiOrderDeliveryAddressesAddInput;
  OrderDeliveryAddressesRemoveInput: ApiOrderDeliveryAddressesRemoveInput;
  OrderDeliveryAddressesUpdateInput: ApiOrderDeliveryAddressesUpdateInput;
  OrderDeliveryGroup: ResolverTypeWrapper<ApiOrderDeliveryGroup>;
  OrderDeliveryMethod: ResolverTypeWrapper<ApiOrderDeliveryMethod>;
  OrderDeliveryMethodType: ApiOrderDeliveryMethodType;
  OrderDeliveryMethodUpdateInput: ApiOrderDeliveryMethodUpdateInput;
  OrderDeliveryProvider: ResolverTypeWrapper<ApiOrderDeliveryProvider>;
  OrderLanguageCodeUpdateInput: ApiOrderLanguageCodeUpdateInput;
  OrderLine: ResolverTypeWrapper<ApiOrderLine>;
  OrderLineCost: ResolverTypeWrapper<ApiOrderLineCost>;
  OrderLineInput: ApiOrderLineInput;
  OrderLineUpdateInput: ApiOrderLineUpdateInput;
  OrderLinesAddInput: ApiOrderLinesAddInput;
  OrderLinesAddPayload: ResolverTypeWrapper<ApiOrderLinesAddPayload>;
  OrderLinesClearInput: ApiOrderLinesClearInput;
  OrderLinesClearPayload: ResolverTypeWrapper<ApiOrderLinesClearPayload>;
  OrderLinesDeleteInput: ApiOrderLinesDeleteInput;
  OrderLinesDeletePayload: ResolverTypeWrapper<ApiOrderLinesDeletePayload>;
  OrderLinesLineAddInput: ApiOrderLinesLineAddInput;
  OrderLinesUpdateInput: ApiOrderLinesUpdateInput;
  OrderLinesUpdatePayload: ResolverTypeWrapper<ApiOrderLinesUpdatePayload>;
  OrderMutation: ResolverTypeWrapper<ApiOrderMutation>;
  OrderNotification: ResolverTypeWrapper<ApiOrderNotification>;
  OrderNotificationCode: ApiOrderNotificationCode;
  OrderPromoCode: ResolverTypeWrapper<ApiOrderPromoCode>;
  OrderPromoCodeAddInput: ApiOrderPromoCodeAddInput;
  OrderPromoCodeRemoveInput: ApiOrderPromoCodeRemoveInput;
  OrderQuery: ResolverTypeWrapper<ApiOrderQuery>;
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
  Order: ApiOrder;
  OrderCost: ApiOrderCost;
  OrderCreateInput: ApiOrderCreateInput;
  OrderCreatePayload: ApiOrderCreatePayload;
  OrderCurrencyCodeUpdateInput: ApiOrderCurrencyCodeUpdateInput;
  OrderCustomerIdentity: ApiOrderCustomerIdentity;
  OrderCustomerIdentityUpdateInput: ApiOrderCustomerIdentityUpdateInput;
  OrderCustomerNoteUpdateInput: ApiOrderCustomerNoteUpdateInput;
  OrderDeliveryAddress: ApiOrderDeliveryAddress;
  OrderDeliveryAddressInput: ApiOrderDeliveryAddressInput;
  OrderDeliveryAddressUpdateInput: ApiOrderDeliveryAddressUpdateInput;
  OrderDeliveryAddressesAddInput: ApiOrderDeliveryAddressesAddInput;
  OrderDeliveryAddressesRemoveInput: ApiOrderDeliveryAddressesRemoveInput;
  OrderDeliveryAddressesUpdateInput: ApiOrderDeliveryAddressesUpdateInput;
  OrderDeliveryGroup: ApiOrderDeliveryGroup;
  OrderDeliveryMethod: ApiOrderDeliveryMethod;
  OrderDeliveryMethodUpdateInput: ApiOrderDeliveryMethodUpdateInput;
  OrderDeliveryProvider: ApiOrderDeliveryProvider;
  OrderLanguageCodeUpdateInput: ApiOrderLanguageCodeUpdateInput;
  OrderLine: ApiOrderLine;
  OrderLineCost: ApiOrderLineCost;
  OrderLineInput: ApiOrderLineInput;
  OrderLineUpdateInput: ApiOrderLineUpdateInput;
  OrderLinesAddInput: ApiOrderLinesAddInput;
  OrderLinesAddPayload: ApiOrderLinesAddPayload;
  OrderLinesClearInput: ApiOrderLinesClearInput;
  OrderLinesClearPayload: ApiOrderLinesClearPayload;
  OrderLinesDeleteInput: ApiOrderLinesDeleteInput;
  OrderLinesDeletePayload: ApiOrderLinesDeletePayload;
  OrderLinesLineAddInput: ApiOrderLinesLineAddInput;
  OrderLinesUpdateInput: ApiOrderLinesUpdateInput;
  OrderLinesUpdatePayload: ApiOrderLinesUpdatePayload;
  OrderMutation: ApiOrderMutation;
  OrderNotification: ApiOrderNotification;
  OrderPromoCode: ApiOrderPromoCode;
  OrderPromoCodeAddInput: ApiOrderPromoCodeAddInput;
  OrderPromoCodeRemoveInput: ApiOrderPromoCodeRemoveInput;
  OrderQuery: ApiOrderQuery;
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

export type ApiOrderResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Order'] = ApiResolversParentTypes['Order']> = {
  appliedPromoCodes: Resolver<Array<ApiResolversTypes['OrderPromoCode']>, ParentType, ContextType>;
  cost: Resolver<ApiResolversTypes['OrderCost'], ParentType, ContextType>;
  createdAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  customerIdentity: Resolver<ApiResolversTypes['OrderCustomerIdentity'], ParentType, ContextType>;
  customerNote: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  deliveryGroups: Resolver<Array<ApiResolversTypes['OrderDeliveryGroup']>, ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  lines: Resolver<Array<ApiResolversTypes['OrderLine']>, ParentType, ContextType>;
  notifications: Resolver<Array<ApiResolversTypes['OrderNotification']>, ParentType, ContextType>;
  totalQuantity: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  updatedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderCostResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderCost'] = ApiResolversParentTypes['OrderCost']> = {
  subtotalAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalDiscountAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalShippingAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalTaxAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderCreatePayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderCreatePayload'] = ApiResolversParentTypes['OrderCreatePayload']> = {
  order: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  errors: Resolver<Maybe<Array<ApiResolversTypes['FieldError']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderCustomerIdentityResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderCustomerIdentity'] = ApiResolversParentTypes['OrderCustomerIdentity']> = {
  countryCode: Resolver<Maybe<ApiResolversTypes['CountryCode']>, ParentType, ContextType>;
  customer: Resolver<Maybe<ApiResolversTypes['Customer']>, ParentType, ContextType>;
  email: Resolver<Maybe<ApiResolversTypes['Email']>, ParentType, ContextType>;
  phone: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderDeliveryAddressResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderDeliveryAddress'] = ApiResolversParentTypes['OrderDeliveryAddress']> = {
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

export type ApiOrderDeliveryGroupResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderDeliveryGroup'] = ApiResolversParentTypes['OrderDeliveryGroup']> = {
  orderLines: Resolver<Array<ApiResolversTypes['OrderLine']>, ParentType, ContextType>;
  deliveryAddress: Resolver<Maybe<ApiResolversTypes['OrderDeliveryAddress']>, ParentType, ContextType>;
  deliveryMethods: Resolver<Array<ApiResolversTypes['OrderDeliveryMethod']>, ParentType, ContextType>;
  estimatedCost: Resolver<Maybe<ApiResolversTypes['DeliveryCost']>, ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  selectedDeliveryMethod: Resolver<Maybe<ApiResolversTypes['OrderDeliveryMethod']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderDeliveryMethodResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderDeliveryMethod'] = ApiResolversParentTypes['OrderDeliveryMethod']> = {
  code: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  deliveryMethodType: Resolver<ApiResolversTypes['OrderDeliveryMethodType'], ParentType, ContextType>;
  provider: Resolver<ApiResolversTypes['OrderDeliveryProvider'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderDeliveryProviderResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderDeliveryProvider'] = ApiResolversParentTypes['OrderDeliveryProvider']> = {
  code: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  data: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLine'] = ApiResolversParentTypes['OrderLine']> = {
  children: Resolver<Array<Maybe<ApiResolversTypes['OrderLine']>>, ParentType, ContextType>;
  cost: Resolver<ApiResolversTypes['OrderLineCost'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  imageSrc: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  purchasableId: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  purchasableSnapshot: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  quantity: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  sku: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  title: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderLineCostResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLineCost'] = ApiResolversParentTypes['OrderLineCost']> = {
  compareAtUnitPrice: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  discountAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  subtotalAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  taxAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  totalAmount: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  unitPrice: Resolver<ApiResolversTypes['Money'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderLinesAddPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLinesAddPayload'] = ApiResolversParentTypes['OrderLinesAddPayload']> = {
  order: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  errors: Resolver<Maybe<Array<ApiResolversTypes['FieldError']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderLinesClearPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLinesClearPayload'] = ApiResolversParentTypes['OrderLinesClearPayload']> = {
  order: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  errors: Resolver<Maybe<Array<ApiResolversTypes['FieldError']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderLinesDeletePayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLinesDeletePayload'] = ApiResolversParentTypes['OrderLinesDeletePayload']> = {
  order: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  errors: Resolver<Maybe<Array<ApiResolversTypes['FieldError']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderLinesUpdatePayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderLinesUpdatePayload'] = ApiResolversParentTypes['OrderLinesUpdatePayload']> = {
  order: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType>;
  errors: Resolver<Maybe<Array<ApiResolversTypes['FieldError']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderMutationResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderMutation'] = ApiResolversParentTypes['OrderMutation']> = {
  orderCreate: Resolver<ApiResolversTypes['Order'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderCreateArgs, 'input'>>;
  orderCurrencyCodeUpdate: Resolver<ApiResolversTypes['Order'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderCurrencyCodeUpdateArgs, 'input'>>;
  orderCustomerIdentityUpdate: Resolver<ApiResolversTypes['Order'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderCustomerIdentityUpdateArgs, 'input'>>;
  orderCustomerNoteUpdate: Resolver<ApiResolversTypes['Order'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderCustomerNoteUpdateArgs, 'input'>>;
  orderDeliveryAddressesAdd: Resolver<ApiResolversTypes['Order'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderDeliveryAddressesAddArgs, 'input'>>;
  orderDeliveryAddressesRemove: Resolver<ApiResolversTypes['Order'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderDeliveryAddressesRemoveArgs, 'input'>>;
  orderDeliveryAddressesUpdate: Resolver<ApiResolversTypes['Order'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderDeliveryAddressesUpdateArgs, 'input'>>;
  orderDeliveryMethodUpdate: Resolver<ApiResolversTypes['Order'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderDeliveryMethodUpdateArgs, 'input'>>;
  orderLanguageCodeUpdate: Resolver<ApiResolversTypes['Order'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderLanguageCodeUpdateArgs, 'input'>>;
  orderLinesAdd: Resolver<ApiResolversTypes['OrderLinesAddPayload'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderLinesAddArgs, 'input'>>;
  orderLinesClear: Resolver<ApiResolversTypes['OrderLinesClearPayload'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderLinesClearArgs, 'input'>>;
  orderLinesDelete: Resolver<ApiResolversTypes['OrderLinesDeletePayload'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderLinesDeleteArgs, 'input'>>;
  orderLinesUpdate: Resolver<ApiResolversTypes['OrderLinesUpdatePayload'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderLinesUpdateArgs, 'input'>>;
  orderPromoCodeAdd: Resolver<ApiResolversTypes['Order'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderPromoCodeAddArgs, 'input'>>;
  orderPromoCodeRemove: Resolver<ApiResolversTypes['Order'], ParentType, ContextType, RequireFields<ApiOrderMutationOrderPromoCodeRemoveArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderNotificationResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderNotification'] = ApiResolversParentTypes['OrderNotification']> = {
  code: Resolver<ApiResolversTypes['OrderNotificationCode'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  iid: Resolver<ApiResolversTypes['Uuid'], ParentType, ContextType>;
  isDismissed: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  severity: Resolver<ApiResolversTypes['NotificationSeverity'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderPromoCodeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderPromoCode'] = ApiResolversParentTypes['OrderPromoCode']> = {
  appliedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  code: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  discountType: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  value: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  provider: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  conditions: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiOrderQueryResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['OrderQuery'] = ApiResolversParentTypes['OrderQuery']> = {
  order: Resolver<Maybe<ApiResolversTypes['Order']>, ParentType, ContextType, RequireFields<ApiOrderQueryOrderArgs, 'id'>>;
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
  orderMutation: Resolver<ApiResolversTypes['OrderMutation'], ParentType, ContextType>;
};

export type ApiNodeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Node'] = ApiResolversParentTypes['Node']> = {
  __resolveType: TypeResolveFn<'Order' | 'OrderLine', ParentType, ContextType>;
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
  orderQuery: Resolver<ApiResolversTypes['OrderQuery'], ParentType, ContextType>;
};

export interface ApiUuidScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['Uuid'], any> {
  name: 'Uuid';
}

export type ApiResolvers<ContextType = GraphQLContext> = {
  BigInt: GraphQLScalarType;
  Order: ApiOrderResolvers<ContextType>;
  OrderCost: ApiOrderCostResolvers<ContextType>;
  OrderCreatePayload: ApiOrderCreatePayloadResolvers<ContextType>;
  OrderCustomerIdentity: ApiOrderCustomerIdentityResolvers<ContextType>;
  OrderDeliveryAddress: ApiOrderDeliveryAddressResolvers<ContextType>;
  OrderDeliveryGroup: ApiOrderDeliveryGroupResolvers<ContextType>;
  OrderDeliveryMethod: ApiOrderDeliveryMethodResolvers<ContextType>;
  OrderDeliveryProvider: ApiOrderDeliveryProviderResolvers<ContextType>;
  OrderLine: ApiOrderLineResolvers<ContextType>;
  OrderLineCost: ApiOrderLineCostResolvers<ContextType>;
  OrderLinesAddPayload: ApiOrderLinesAddPayloadResolvers<ContextType>;
  OrderLinesClearPayload: ApiOrderLinesClearPayloadResolvers<ContextType>;
  OrderLinesDeletePayload: ApiOrderLinesDeletePayloadResolvers<ContextType>;
  OrderLinesUpdatePayload: ApiOrderLinesUpdatePayloadResolvers<ContextType>;
  OrderMutation: ApiOrderMutationResolvers<ContextType>;
  OrderNotification: ApiOrderNotificationResolvers<ContextType>;
  OrderPromoCode: ApiOrderPromoCodeResolvers<ContextType>;
  OrderQuery: ApiOrderQueryResolvers<ContextType>;
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

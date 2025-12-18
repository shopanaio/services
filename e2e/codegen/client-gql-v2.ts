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
  Phone: { input: string; output: string; }
  Uuid: { input: string; output: string; }
};

/**
 * A postal address.
 * Implements the Node interface.
 */
export type ApiAddress = ApiNode & {
  __typename?: 'Address';
  /** The first line of the street address (e.g., house number and street name). */
  addressLine1: Scalars['String']['output'];
  /** The second line of the street address (e.g., apartment, suite, unit). */
  addressLine2?: Maybe<Scalars['String']['output']>;
  /** City where the address is located. */
  city: Scalars['String']['output'];
  /** ISO 3166-1 alpha-2 country code (e.g., "US" for United States). */
  countryCode: CountryCode;
  /** Contact email for this address. */
  email?: Maybe<Scalars['String']['output']>;
  /** Recipient’s first name. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** Recipient’s last name. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** Latitude coordinate of the address location. */
  latitude?: Maybe<Scalars['Float']['output']>;
  /** Longitude coordinate of the address location. */
  longitude?: Maybe<Scalars['Float']['output']>;
  /** Arbitrary metadata as JSON (e.g., delivery instructions). */
  metadata?: Maybe<Scalars['JSON']['output']>;
  /** Recipient’s middle name. */
  middleName?: Maybe<Scalars['String']['output']>;
  /** Contact phone number for this address. */
  phone?: Maybe<Scalars['String']['output']>;
  /** Postal or ZIP code. */
  postalCode?: Maybe<Scalars['String']['output']>;
  /** Province, state or region code (e.g., "CA" for California). */
  provinceCode?: Maybe<Scalars['String']['output']>;
};

/**
 * Input type for creating or updating an Address.
 * Maps to Go model portal/project/storage/address/dto.Input.
 */
export type ApiAddressInput = {
  /** The first line of the street address (e.g., house number and street name). */
  addressLine1: Scalars['String']['input'];
  /** The second line of the street address (e.g., apartment, suite, unit). */
  addressLine2?: InputMaybe<Scalars['String']['input']>;
  /** City where the address is located. */
  city: Scalars['String']['input'];
  /** ISO 3166-1 alpha-2 country code (e.g., "US" for United States). */
  countryCode: CountryCode;
  /** Contact email for this address. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Recipient’s first name. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** Recipient’s last name. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** Latitude coordinate of the address location. */
  latitude?: InputMaybe<Scalars['Float']['input']>;
  /** Longitude coordinate of the address location. */
  longitude?: InputMaybe<Scalars['Float']['input']>;
  /** Arbitrary metadata as JSON (e.g., delivery instructions). */
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  /** Recipient’s middle name. */
  middleName?: InputMaybe<Scalars['String']['input']>;
  /** Contact phone number for this address. */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** Postal or ZIP code. */
  postalCode?: InputMaybe<Scalars['String']['input']>;
  /** Province, state or region code (e.g., "CA" for California). */
  provinceCode?: InputMaybe<Scalars['String']['input']>;
};

/** A content article. */
export type ApiArticle = ApiNode & {
  __typename?: 'Article';
  /** The type of the article. */
  articleType: Scalars['String']['output'];
  /** The cover image for the article. */
  cover?: Maybe<ApiFile>;
  /** The date and time when the article was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The full description of the article. */
  description: Scalars['String']['output'];
  /** A short excerpt of the article. */
  excerpt: Scalars['String']['output'];
  /** Gallery of additional images with cursor-based pagination. */
  gallery: ApiGalleryConnection;
  /** Unique human-readable slug. */
  handle: Scalars['String']['output'];
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** The article’s title. */
  title: Scalars['String']['output'];
  /** The date and time when the article was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};


/** A content article. */
export type ApiArticleGalleryArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Connection type for articles. */
export type ApiArticleConnection = {
  __typename?: 'ArticleConnection';
  /** List of article edges. */
  edges: Array<ApiArticleEdge>;
  /** Pagination details. */
  pageInfo: ApiPageInfo;
  /** The total number of items. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in the paginated list of articles. */
export type ApiArticleEdge = {
  __typename?: 'ArticleEdge';
  /** Cursor for pagination. */
  cursor: Scalars['Cursor']['output'];
  /** The article node. */
  node: ApiArticle;
};

export enum ArticleSort {
  CreatedAtAsc = 'CREATED_AT_ASC',
  CreatedAtDesc = 'CREATED_AT_DESC',
  TitleAsc = 'TITLE_ASC',
  TitleDesc = 'TITLE_DESC',
  UpdatedAtAsc = 'UPDATED_AT_ASC',
  UpdatedAtDesc = 'UPDATED_AT_DESC'
}

export type ApiCategory = ApiNode & {
  __typename?: 'Category';
  /** Breadcrumbs from the root category to this category (inclusive). */
  breadcrumbs: Array<ApiCategory>;
  /** Child categories using Relay-style pagination. */
  children: ApiCategoryConnection;
  /** The cover image file for the category. */
  cover?: Maybe<ApiFile>;
  /** DateTime when the category was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The category description in the language specified by the Accept-Language header. */
  description: Scalars['String']['output'];
  /** A short excerpt of the category in the language specified by the Accept-Language header. */
  excerpt: Scalars['String']['output'];
  /** Gallery images using Relay-style pagination. */
  gallery: ApiGalleryConnection;
  /** A unique human-readable identifier for the category. */
  handle: Scalars['String']['output'];
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** A preview listing with filters, sorting, and pagination. */
  listing: ApiListingConnection;
  /** The listing mode for this category (SMART, STANDARD, CONTAINER). */
  listingType: ListingType;
  /** SEO description for the category page. */
  seoDescription?: Maybe<Scalars['String']['output']>;
  /** SEO title for the category page. */
  seoTitle?: Maybe<Scalars['String']['output']>;
  /** The category title in the language specified by the Accept-Language header. */
  title: Scalars['String']['output'];
  /** DateTime when the category was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};


export type ApiCategoryChildrenArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<CategorySort>;
};


export type ApiCategoryGalleryArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiCategoryListingArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  filters?: InputMaybe<Array<ApiFilterInput>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ListingSort>;
};

export type ApiCategoryConnection = {
  __typename?: 'CategoryConnection';
  /** List of category edges (each contains a node and a cursor). */
  edges: Array<ApiCategoryEdge>;
  /** Pagination metadata (hasNextPage, endCursor, etc.). */
  pageInfo: ApiPageInfo;
  /** The total number of items. */
  totalCount: Scalars['Int']['output'];
};

export type ApiCategoryEdge = {
  __typename?: 'CategoryEdge';
  /** Cursor for Relay-style pagination. */
  cursor: Scalars['Cursor']['output'];
  /** Node containing the category data. */
  node: ApiCategory;
};

export enum CategorySort {
  CreatedAtAsc = 'CREATED_AT_ASC',
  CreatedAtDesc = 'CREATED_AT_DESC',
  TitleAsc = 'TITLE_ASC',
  TitleDesc = 'TITLE_DESC',
  UpdatedAtAsc = 'UPDATED_AT_ASC',
  UpdatedAtDesc = 'UPDATED_AT_DESC'
}

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
  customerNote?: Maybe<Scalars['String']['output']>;
  /** Delivery groups. */
  deliveryGroups: Array<ApiCheckoutDeliveryGroup>;
  /** A globally-unique ID. */
  id: Scalars['ID']['output'];
  /** List of items in the checkout (paginated). */
  lines: Array<ApiCheckoutLine>;
  /** Notifications for the user regarding the checkout. */
  notifications: Array<ApiCheckoutNotification>;
  /** Payment aggregate for this checkout. */
  payment: ApiCheckoutPayment;
  /** Tags that can be used to organize checkout lines. */
  tags: Array<ApiCheckoutTag>;
  /** Quantity of the item being purchased. */
  totalQuantity: Scalars['Int']['output'];
  /** When this checkout was last updated. */
  updatedAt: Scalars['DateTime']['output'];
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
  purchasable: ApiProductVariant;
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
  /** Creates a new checkout. */
  checkoutCreate: ApiCheckout;
  /** Updates the display currency of the checkout (ISO 4217, e.g. "USD", "EUR"). */
  checkoutCurrencyCodeUpdate: ApiCheckout;
  /**
   * Updates customer identification data associated with the checkout
   * (email, customerId and if necessary country/language for calculations).
   */
  checkoutCustomerIdentityUpdate: ApiCheckout;
  /** Updates the customer note attached to the checkout (delivery instructions, etc.). */
  checkoutCustomerNoteUpdate: ApiCheckout;
  /** Adds one or more delivery addresses to the checkout (supports multi-shipping). */
  checkoutDeliveryAddressesAdd: ApiCheckout;
  /** Removes one or more delivery addresses previously attached to the checkout. */
  checkoutDeliveryAddressesRemove: ApiCheckout;
  /** Updates previously added delivery addresses (e.g., correcting postal code or city). */
  checkoutDeliveryAddressesUpdate: ApiCheckout;
  /** Selects or changes the delivery method for the entire checkout or specific address. */
  checkoutDeliveryMethodUpdate: ApiCheckout;
  /** Adds recipients to delivery groups. */
  checkoutDeliveryRecipientsAdd: ApiCheckout;
  /** Removes recipients from delivery groups. */
  checkoutDeliveryRecipientsRemove: ApiCheckout;
  /** Updates recipients for delivery groups. */
  checkoutDeliveryRecipientsUpdate: ApiCheckout;
  /** Updates the language/locale of the checkout (affects localization and formatting). */
  checkoutLanguageCodeUpdate: ApiCheckout;
  /** Adds an item to an existing checkout. */
  checkoutLinesAdd: ApiCheckoutLinesAddPayload;
  /** Clears all items from a checkout. */
  checkoutLinesClear: ApiCheckoutLinesClearPayload;
  /** Removes a single item from the checkout. */
  checkoutLinesDelete: ApiCheckoutLinesDeletePayload;
  /** Replaces one checkout line with another by merging quantities and removing the source line. */
  checkoutLinesReplace: ApiCheckoutLinesReplacePayload;
  /** Updates the quantity of a specific checkout item. */
  checkoutLinesUpdate: ApiCheckoutLinesUpdatePayload;
  /** Selects or changes the payment method for the checkout. */
  checkoutPaymentMethodUpdate: ApiCheckout;
  /** Applies a promo code/coupon to the checkout. */
  checkoutPromoCodeAdd: ApiCheckout;
  /** Removes a previously applied promo code/coupon from the checkout. */
  checkoutPromoCodeRemove: ApiCheckout;
  /** Creates a new checkout tag. */
  checkoutTagCreate: ApiCheckout;
  /** Deletes a checkout tag. */
  checkoutTagDelete: ApiCheckout;
  /** Updates a checkout tag. */
  checkoutTagUpdate: ApiCheckout;
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


export type ApiCheckoutMutationCheckoutDeliveryRecipientsAddArgs = {
  input: ApiCheckoutDeliveryRecipientsAddInput;
};


export type ApiCheckoutMutationCheckoutDeliveryRecipientsRemoveArgs = {
  input: ApiCheckoutDeliveryRecipientsRemoveInput;
};


export type ApiCheckoutMutationCheckoutDeliveryRecipientsUpdateArgs = {
  input: ApiCheckoutDeliveryRecipientsUpdateInput;
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


export type ApiCheckoutMutationCheckoutLinesReplaceArgs = {
  input: ApiCheckoutLinesReplaceInput;
};


export type ApiCheckoutMutationCheckoutLinesUpdateArgs = {
  input: ApiCheckoutLinesUpdateInput;
};


export type ApiCheckoutMutationCheckoutPaymentMethodUpdateArgs = {
  input: ApiCheckoutPaymentMethodUpdateInput;
};


export type ApiCheckoutMutationCheckoutPromoCodeAddArgs = {
  input: ApiCheckoutPromoCodeAddInput;
};


export type ApiCheckoutMutationCheckoutPromoCodeRemoveArgs = {
  input: ApiCheckoutPromoCodeRemoveInput;
};


export type ApiCheckoutMutationCheckoutTagCreateArgs = {
  input: ApiCheckoutTagCreateInput;
};


export type ApiCheckoutMutationCheckoutTagDeleteArgs = {
  input: ApiCheckoutTagDeleteInput;
};


export type ApiCheckoutMutationCheckoutTagUpdateArgs = {
  input: ApiCheckoutTagUpdateInput;
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

/** Input type for submitting a new product review. */
export type ApiCreateReviewInput = {
  /**
   * A summary of key negative points noted by the reviewer.
   * Use commas or semicolons to separate multiple cons.
   */
  cons?: InputMaybe<Scalars['String']['input']>;
  /**
   * The publicly displayed name of the reviewer.
   * This may be a username, nickname, or real name, depending on your policy.
   */
  displayName: Scalars['String']['input'];
  /**
   * An optional list of image IDs uploaded by the reviewer.
   * Images should illustrate product features or usage.
   */
  images?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** The locale or language code. */
  locale?: InputMaybe<LocaleCode>;
  /**
   * The main body of the review.
   * Should capture the reviewer's overall experience and opinions.
   */
  message: Scalars['String']['input'];
  /** The unique identifier of the product to which this review belongs. */
  productId: Scalars['ID']['input'];
  /**
   * A summary of key positive points noted by the reviewer.
   * Use commas or semicolons to separate multiple pros.
   */
  pros?: InputMaybe<Scalars['String']['input']>;
  /**
   * The numerical rating given by the reviewer.
   * Valid values typically range from 1.0 (worst) to 5.0 (best).
   */
  rating: Scalars['Float']['input'];
  /**
   * A brief, descriptive title summarizing the review.
   * For example: "Excellent quality, highly recommend".
   */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Currency codes according to ISO 4217 */
export enum CurrencyCode {
  /** 2 decimals — UAE Dirham (United Arab Emirates) */
  Aed = 'AED',
  /** 2 decimals — Afghan Afghani (Afghanistan) */
  Afn = 'AFN',
  /** 2 decimals — Albanian Lek (Albania) */
  All = 'ALL',
  /** 2 decimals — Armenian Dram (Armenia) */
  Amd = 'AMD',
  /** 2 decimals — Netherlands Antillean Guilder (Netherlands Antilles) */
  Ang = 'ANG',
  /** 2 decimals — Angolan Kwanza (Angola) */
  Aoa = 'AOA',
  /** 2 decimals — Argentine Peso (Argentina) */
  Ars = 'ARS',
  /** 2 decimals — Australian Dollar (Australia) */
  Aud = 'AUD',
  /** 2 decimals — Aruban Florin (Aruba) */
  Awg = 'AWG',
  /** 2 decimals — Azerbaijani Manat (Azerbaijan) */
  Azn = 'AZN',
  /** 2 decimals — Bosnia-Herzegovina Convertible Mark (Bosnia and Herzegovina) */
  Bam = 'BAM',
  /** 2 decimals — Barbadian Dollar (Barbados) */
  Bbd = 'BBD',
  /** 2 decimals — Bangladeshi Taka (Bangladesh) */
  Bdt = 'BDT',
  /** 2 decimals — Bulgarian Lev (Bulgaria) */
  Bgn = 'BGN',
  /** 3 decimals — Bahraini Dinar (Bahrain) */
  Bhd = 'BHD',
  /** 0 decimals — Burundian Franc (Burundi) */
  Bif = 'BIF',
  /** 2 decimals — Bermudian Dollar (Bermuda) */
  Bmd = 'BMD',
  /** 2 decimals — Brunei Dollar (Brunei) */
  Bnd = 'BND',
  /** 2 decimals — Bolivian Boliviano (Bolivia) */
  Bob = 'BOB',
  /** 2 decimals — Brazilian Real (Brazil) */
  Brl = 'BRL',
  /** 2 decimals — Bahamian Dollar (Bahamas) */
  Bsd = 'BSD',
  /** 2 decimals — Bhutanese Ngultrum (Bhutan) */
  Btn = 'BTN',
  /** 2 decimals — Botswana Pula (Botswana) */
  Bwp = 'BWP',
  /** 2 decimals — Belarusian Ruble (Belarus) */
  Byn = 'BYN',
  /** 2 decimals — Belize Dollar (Belize) */
  Bzd = 'BZD',
  /** 2 decimals — Canadian Dollar (Canada) */
  Cad = 'CAD',
  /** 2 decimals — Congolese Franc (Democratic Republic of the Congo) */
  Cdf = 'CDF',
  /** 2 decimals — Swiss Franc (Switzerland) */
  Chf = 'CHF',
  /** 0 decimals — Chilean Peso (Chile) */
  Clp = 'CLP',
  /** 2 decimals — Chinese Yuan (China) */
  Cny = 'CNY',
  /** 2 decimals — Colombian Peso (Colombia) */
  Cop = 'COP',
  /** 2 decimals — Costa Rican Colon (Costa Rica) */
  Crc = 'CRC',
  /** 2 decimals — Cuban Peso (Cuba) */
  Cup = 'CUP',
  /** 2 decimals — Cape Verdean Escudo (Cape Verde) */
  Cve = 'CVE',
  /** 2 decimals — Czech Koruna (Czech Republic) */
  Czk = 'CZK',
  /** 0 decimals — Djiboutian Franc (Djibouti) */
  Djf = 'DJF',
  /** 2 decimals — Danish Krone (Denmark) */
  Dkk = 'DKK',
  /** 2 decimals — Dominican Peso (Dominican Republic) */
  Dop = 'DOP',
  /** 2 decimals — Algerian Dinar (Algeria) */
  Dzd = 'DZD',
  /** 2 decimals — Egyptian Pound (Egypt) */
  Egp = 'EGP',
  /** 2 decimals — Eritrean Nakfa (Eritrea) */
  Ern = 'ERN',
  /** 2 decimals — Ethiopian Birr (Ethiopia) */
  Etb = 'ETB',
  /** 2 decimals — Euro (European Union) */
  Eur = 'EUR',
  /** 2 decimals — Fijian Dollar (Fiji) */
  Fjd = 'FJD',
  /** 2 decimals — Falkland Islands Pound (Falkland Islands) */
  Fkp = 'FKP',
  /** 2 decimals — Faroese Króna (Faroe Islands) */
  Fok = 'FOK',
  /** 2 decimals — Pound Sterling (United Kingdom) */
  Gbp = 'GBP',
  /** 2 decimals — Georgian Lari (Georgia) */
  Gel = 'GEL',
  /** 2 decimals — Guernsey Pound (Guernsey) */
  Ggp = 'GGP',
  /** 2 decimals — Ghanaian Cedi (Ghana) */
  Ghs = 'GHS',
  /** 2 decimals — Gibraltar Pound (Gibraltar) */
  Gip = 'GIP',
  /** 2 decimals — Gambian Dalasi (Gambia) */
  Gmd = 'GMD',
  /** 0 decimals — Guinean Franc (Guinea) */
  Gnf = 'GNF',
  /** 2 decimals — Guatemalan Quetzal (Guatemala) */
  Gtq = 'GTQ',
  /** 2 decimals — Guyanese Dollar (Guyana) */
  Gyd = 'GYD',
  /** 2 decimals — Hong Kong Dollar (Hong Kong) */
  Hkd = 'HKD',
  /** 2 decimals — Honduran Lempira (Honduras) */
  Hnl = 'HNL',
  /** 2 decimals — Croatian Kuna (Croatia) */
  Hrk = 'HRK',
  /** 2 decimals — Haitian Gourde (Haiti) */
  Htg = 'HTG',
  /** 2 decimals — Hungarian Forint (Hungary) */
  Huf = 'HUF',
  /** 0 decimals — Indonesian Rupiah (Indonesia) */
  Idr = 'IDR',
  /** 2 decimals — Israeli New Shekel (Israel) */
  Ils = 'ILS',
  /** 2 decimals — Isle of Man Pound (Isle of Man) */
  Imp = 'IMP',
  /** 2 decimals — Indian Rupee (India) */
  Inr = 'INR',
  /** 3 decimals — Iraqi Dinar (Iraq) */
  Iqd = 'IQD',
  /** 2 decimals — Iranian Rial (Iran) */
  Irr = 'IRR',
  /** 0 decimals — Icelandic Króna (Iceland) */
  Isk = 'ISK',
  /** 2 decimals — Jersey Pound (Jersey) */
  Jep = 'JEP',
  /** 2 decimals — Jamaican Dollar (Jamaica) */
  Jmd = 'JMD',
  /** 3 decimals — Jordanian Dinar (Jordan) */
  Jod = 'JOD',
  /** 0 decimals — Japanese Yen (Japan) */
  Jpy = 'JPY',
  /** 2 decimals — Kenyan Shilling (Kenya) */
  Kes = 'KES',
  /** 2 decimals — Kyrgyzstani Som (Kyrgyzstan) */
  Kgs = 'KGS',
  /** 2 decimals — Cambodian Riel (Cambodia) */
  Khr = 'KHR',
  /** 2 decimals — Comorian Franc (Comoros) */
  Kmf = 'KMF',
  /** 2 decimals — North Korean Won (North Korea) */
  Kpw = 'KPW',
  /** 2 decimals — South Korean Won (South Korea) */
  Krw = 'KRW',
  /** 3 decimals — Kuwaiti Dinar (Kuwait) */
  Kwd = 'KWD',
  /** 2 decimals — Cayman Islands Dollar (Cayman Islands) */
  Kyd = 'KYD',
  /** 2 decimals — Kazakhstani Tenge (Kazakhstan) */
  Kzt = 'KZT',
  /** 2 decimals — Lao Kip (Laos) */
  Lak = 'LAK',
  /** 2 decimals — Lebanese Pound (Lebanon) */
  Lbp = 'LBP',
  /** 2 decimals — Sri Lankan Rupee (Sri Lanka) */
  Lkr = 'LKR',
  /** 3 decimals — Liberian Dollar (Liberia) */
  Lrd = 'LRD',
  /** 3 decimals — Libyan Dinar (Libya) */
  Lyd = 'LYD',
  /** 2 decimals — Moroccan Dirham (Morocco) */
  Mad = 'MAD',
  /** 2 decimals — Moldovan Leu (Moldova) */
  Mdl = 'MDL',
  /** 2 decimals — Malagasy Ariary (Madagascar) */
  Mga = 'MGA',
  /** 2 decimals — Macedonian Denar (North Macedonia) */
  Mkd = 'MKD',
  /** 2 decimals — Burmese Kyat (Myanmar) */
  Mmk = 'MMK',
  /** 2 decimals — Mongolian Tögrög (Mongolia) */
  Mnt = 'MNT',
  /** 2 decimals — Macanese Pataca (Macau) */
  Mop = 'MOP',
  /** 2 decimals — Mauritanian Ouguiya (Mauritania) */
  Mru = 'MRU',
  /** 2 decimals — Mauritian Rupee (Mauritius) */
  Mur = 'MUR',
  /** 2 decimals — Maldivian Rufiyaa (Maldives) */
  Mvr = 'MVR',
  /** 2 decimals — Malawian Kwacha (Malawi) */
  Mwk = 'MWK',
  /** 2 decimals — Mexican Peso (Mexico) */
  Mxn = 'MXN',
  /** 2 decimals — Malaysian Ringgit (Malaysia) */
  Myr = 'MYR',
  /** 2 decimals — Mozambican Metical (Mozambique) */
  Mzn = 'MZN',
  /** 2 decimals — Namibian Dollar (Namibia) */
  Nad = 'NAD',
  /** 2 decimals — Nigerian Naira (Nigeria) */
  Ngn = 'NGN',
  /** 2 decimals — Nicaraguan Córdoba (Nicaragua) */
  Nio = 'NIO',
  /** 2 decimals — Norwegian Krone (Norway) */
  Nok = 'NOK',
  /** 2 decimals — Nepalese Rupee (Nepal) */
  Npr = 'NPR',
  /** 2 decimals — New Zealand Dollar (New Zealand) */
  Nzd = 'NZD',
  /** 2 decimals — Omani Rial (Oman) */
  Omr = 'OMR',
  /** 2 decimals — Panamanian Balboa (Panama) */
  Pab = 'PAB',
  /** 2 decimals — Peruvian Sol (Peru) */
  Pen = 'PEN',
  /** 0 decimals — Papua New Guinean Kina (Papua New Guinea) */
  Pgk = 'PGK',
  /** 2 decimals — Philippine Peso (Philippines) */
  Php = 'PHP',
  /** 2 decimals — Pakistani Rupee (Pakistan) */
  Pkr = 'PKR',
  /** 0 decimals — Polish Zloty (Poland) */
  Pln = 'PLN',
  /** 2 decimals — Paraguayan Guaraní (Paraguay) */
  Pyg = 'PYG',
  /** 2 decimals — Qatari Riyal (Qatar) */
  Qar = 'QAR',
  /** 2 decimals — Romanian Leu (Romania) */
  Ron = 'RON',
  /** 2 decimals — Serbian Dinar (Serbia) */
  Rsd = 'RSD',
  /** 2 decimals — Russian Ruble (Russia) */
  Rub = 'RUB',
  /** 2 decimals — Rwandan Franc (Rwanda) */
  Rwf = 'RWF',
  /** 2 decimals — Saudi Riyal (Saudi Arabia) */
  Sar = 'SAR',
  /** 2 decimals — Solomon Islands Dollar (Solomon Islands) */
  Sbd = 'SBD',
  /** 2 decimals — Seychelles Rupee (Seychelles) */
  Scr = 'SCR',
  /** 2 decimals — Sudanese Pound (Sudan) */
  Sdg = 'SDG',
  /** 2 decimals — Swedish Krona (Sweden) */
  Sek = 'SEK',
  /** 2 decimals — Singapore Dollar (Singapore) */
  Sgd = 'SGD',
  /** 0 decimals — Saint Helena Pound (Saint Helena) */
  Shp = 'SHP',
  /** 2 decimals — Sierra Leonean Leone (Sierra Leone) */
  Sle = 'SLE',
  /** 2 decimals — Somali Shilling (Somalia) */
  Sos = 'SOS',
  /** 2 decimals — Surinamese Dollar (Suriname) */
  Srd = 'SRD',
  /** 2 decimals — South Sudanese Pound (South Sudan) */
  Ssp = 'SSP',
  /** 2 decimals — São Tomé and Príncipe Dobra (São Tomé and Príncipe) */
  Stn = 'STN',
  /** 2 decimals — Salvadoran Colón (El Salvador) */
  Svc = 'SVC',
  /** 2 decimals — Syrian Pound (Syria) */
  Syp = 'SYP',
  /** 2 decimals — Eswatini Lilangeni (Eswatini) */
  Szl = 'SZL',
  /** 2 decimals — Thai Baht (Thailand) */
  Thb = 'THB',
  /** 2 decimals — Tajikistani Somoni (Tajikistan) */
  Tjs = 'TJS',
  /** 2 decimals — Turkmenistani Manat (Turkmenistan) */
  Tmt = 'TMT',
  /** 2 decimals — Tunisian Dinar (Tunisia) */
  Tnd = 'TND',
  /** 2 decimals — Tongan Paʻanga (Tonga) */
  Top = 'TOP',
  /** 2 decimals — Turkish Lira (Türkiye) */
  Try = 'TRY',
  /** 2 decimals — Trinidad and Tobago Dollar (Trinidad and Tobago) */
  Ttd = 'TTD',
  /** 2 decimals — New Taiwan Dollar (Taiwan) */
  Twd = 'TWD',
  /** 0 decimals — Tanzanian Shilling (Tanzania) */
  Tzs = 'TZS',
  /** 2 decimals — Ukrainian Hryvnia (Ukraine) */
  Uah = 'UAH',
  /** 2 decimals — Ugandan Shilling (Uganda) */
  Ugx = 'UGX',
  /** 2 decimals — United States Dollar (United States) */
  Usd = 'USD',
  /** 2 decimals — Uruguayan Peso (Uruguay) */
  Uyu = 'UYU',
  /** 2 decimals — Uzbekistan Som (Uzbekistan) */
  Uzs = 'UZS',
  /** 2 decimals — Venezuelan Bolívar (Venezuela) */
  Ves = 'VES',
  /** 0 decimals — Vietnamese Dong (Vietnam) */
  Vnd = 'VND',
  /** 2 decimals — Vanuatu Vatu (Vanuatu) */
  Vuv = 'VUV',
  /** 2 decimals — Samoan Tala (Samoa) */
  Wst = 'WST',
  /** 2 decimals — Central African CFA Franc (CEMAC) */
  Xaf = 'XAF',
  /** 0 decimals — East Caribbean Dollar (OECS) */
  Xcd = 'XCD',
  /** 0 decimals — Special Drawing Rights (IMF) */
  Xdr = 'XDR',
  /** 0 decimals — West African CFA Franc (UEMOA) */
  Xof = 'XOF',
  /** 0 decimals — CFP Franc (French overseas territories) */
  Xpf = 'XPF',
  /** 2 decimals — Yemeni Rial (Yemen) */
  Yer = 'YER',
  /** 2 decimals — South African Rand (South Africa) */
  Zar = 'ZAR',
  /** 2 decimals — Zambian Kwacha (Zambia) */
  Zmw = 'ZMW',
  /** 2 decimals — Zimbabwean Dollar (Zimbabwe) */
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

/** Error information for a failed field. */
export type ApiFieldError = {
  __typename?: 'FieldError';
  /** Optional machine-readable error code. */
  code?: Maybe<Scalars['String']['output']>;
  /** Name of the field that caused the error. */
  field: Scalars['String']['output'];
  /** Human-readable error message. */
  message: Scalars['String']['output'];
};

/** Represents a file or media resource in the system. */
export type ApiFile = ApiNode & {
  __typename?: 'File';
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** The origin of the media (e.g., URL, YouTube). */
  source: MediaSource;
  /** Direct link to the resource or identifier (for YouTube, the video ID). */
  url: Scalars['String']['output'];
};

export type ApiFilter = {
  /** The handle of the Filter. */
  handle: Scalars['String']['output'];
  /** Global unique identifier. */
  id: Scalars['String']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** Display title for the Filter. */
  title: Scalars['String']['output'];
};

/** Input type for applying a Filter to a listing. */
export type ApiFilterInput = {
  /** The handle of the Filter. */
  handle: Scalars['String']['input'];
  /** The value handles of the Filter. Ranges accept min, max values. */
  values: Array<Scalars['String']['input']>;
};

/** Result of cursor-based pagination for a gallery of files. */
export type ApiGalleryConnection = {
  __typename?: 'GalleryConnection';
  /** List of edges (file nodes with cursors). */
  edges: Array<ApiGalleryEdge>;
  /** Pagination information (hasNextPage, hasPreviousPage, start/end cursors). */
  pageInfo: ApiPageInfo;
  /** The total number of items. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in the gallery connection, containing a file and its cursor. */
export type ApiGalleryEdge = {
  __typename?: 'GalleryEdge';
  /** Cursor for pagination. */
  cursor: Scalars['Cursor']['output'];
  /** The file node. */
  node: ApiFile;
};

export type ApiListFilter = ApiFilter & {
  __typename?: 'ListFilter';
  handle: Scalars['String']['output'];
  id: Scalars['String']['output'];
  iid: Scalars['Uuid']['output'];
  title: Scalars['String']['output'];
  /** List of available categories for filtering. */
  values: Array<ApiListFilterValue>;
};

export type ApiListFilterValue = {
  __typename?: 'ListFilterValue';
  /** Number of products associated with this Filter value. */
  count: Scalars['Int']['output'];
  /** The handle of the Filter. */
  handle: Scalars['String']['output'];
  /** Global unique identifier. */
  id: Scalars['String']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** The swatch of the Filter value. Usually used for color filters. */
  swatch?: Maybe<ApiSwatch>;
  /** Display title for the Filter. */
  title: Scalars['String']['output'];
};

/** A connection object for listings, following the cursor-based pattern. */
export type ApiListingConnection = {
  __typename?: 'ListingConnection';
  /** Show available products first. */
  availabilitySortApplied: Scalars['Boolean']['output'];
  /** A list of edges. */
  edges: Array<ApiListingEdge>;
  /** filters of the listing. */
  filters: Array<ApiFilter>;
  /** Include nested categories. */
  nestedCategoriesIncluded: Scalars['Boolean']['output'];
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The sort order that was applied. */
  sort: ListingSort;
  /** The total number of items. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a listing connection, with the cursor for pagination. */
export type ApiListingEdge = {
  __typename?: 'ListingEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['Cursor']['output'];
  /** The item at the end of this edge. */
  node: ApiListingNode;
};

/** A node in a listing. */
export type ApiListingNode = ApiProductVariant;

/**
 * Defines the available sorting orders for Listings.
 * Maps to Go enum portal/project/entity/listing/listingOrder.Enum.
 */
export enum ListingSort {
  /** Newest first */
  CreatedAtAsc = 'CREATED_AT_ASC',
  /** Oldest first */
  CreatedAtDesc = 'CREATED_AT_DESC',
  /** Recommended order based on the listing settings */
  MostRelevant = 'MOST_RELEVANT',
  /** Price ascending */
  PriceAsc = 'PRICE_ASC',
  /** Price descending */
  PriceDesc = 'PRICE_DESC',
  /** Title ascending */
  TitleAsc = 'TITLE_ASC',
  /** Title descending */
  TitleDesc = 'TITLE_DESC'
}

/** Defines the type of listing, determining how products are selected. */
export enum ListingType {
  /** Aggregates all products from this category and its subcategories recursively. */
  Container = 'CONTAINER',
  /** Automatically generated by applying predefined filters. */
  Smart = 'SMART',
  /** Manually curated: admin selects products and defines their order; */
  Standard = 'STANDARD'
}

/** Language codes based on ISO 639-1 and BCP 47 */
export enum LocaleCode {
  /** Afrikaans */
  Af = 'af',
  /** Amharic */
  Am = 'am',
  /** Arabic */
  Ar = 'ar',
  /** Azerbaijani */
  Az = 'az',
  /** Bulgarian */
  Bg = 'bg',
  /** Bengali */
  Bn = 'bn',
  /** Catalan */
  Ca = 'ca',
  /** Czech */
  Cs = 'cs',
  /** Welsh */
  Cy = 'cy',
  /** Danish */
  Da = 'da',
  /** German */
  De = 'de',
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
  /** Persian (Farsi) */
  Fa = 'fa',
  /** Finnish */
  Fi = 'fi',
  /** Filipino */
  Fil = 'fil',
  /** French */
  Fr = 'fr',
  /** Irish */
  Ga = 'ga',
  /** Scottish Gaelic */
  Gd = 'gd',
  /** Galician */
  Gl = 'gl',
  /** Gujarati */
  Gu = 'gu',
  /** Hebrew */
  He = 'he',
  /** Hindi */
  Hi = 'hi',
  /** Croatian */
  Hr = 'hr',
  /** Haitian Creole */
  Ht = 'ht',
  /** Hungarian */
  Hu = 'hu',
  /** Armenian */
  Hy = 'hy',
  /** Indonesian */
  Id = 'id',
  /** Igbo */
  Ig = 'ig',
  /** Icelandic */
  Is = 'is',
  /** Italian */
  It = 'it',
  /** Japanese */
  Ja = 'ja',
  /** Georgian */
  Ka = 'ka',
  /** Kazakh */
  Kk = 'kk',
  /** Khmer */
  Km = 'km',
  /** Kannada */
  Kn = 'kn',
  /** Korean */
  Ko = 'ko',
  /** Kurdish */
  Ku = 'ku',
  /** Kyrgyz */
  Ky = 'ky',
  /** Latin */
  La = 'la',
  /** Lao */
  Lo = 'lo',
  /** Lithuanian */
  Lt = 'lt',
  /** Latvian */
  Lv = 'lv',
  /** Malagasy */
  Mg = 'mg',
  /** Maori */
  Mi = 'mi',
  /** Malayalam */
  Ml = 'ml',
  /** Mongolian */
  Mn = 'mn',
  /** Marathi */
  Mr = 'mr',
  /** Malay */
  Ms = 'ms',
  /** Burmese */
  My = 'my',
  /** Nepali */
  Ne = 'ne',
  /** Dutch */
  Nl = 'nl',
  /** Norwegian */
  No = 'no',
  /** Punjabi */
  Pa = 'pa',
  /** Polish */
  Pl = 'pl',
  /** Pashto */
  Ps = 'ps',
  /** Portuguese (Portugal/Brazil unified) */
  Pt = 'pt',
  /** Romanian */
  Ro = 'ro',
  /** Russian */
  Ru = 'ru',
  /** Sinhala */
  Si = 'si',
  /** Slovak */
  Sk = 'sk',
  /** Slovenian */
  Sl = 'sl',
  /** Samoan */
  Sm = 'sm',
  /** Serbian */
  Sr = 'sr',
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
  /** Turkmen */
  Tk = 'tk',
  /** Tongan */
  To = 'to',
  /** Turkish */
  Tr = 'tr',
  /** Ukrainian */
  Uk = 'uk',
  /** Uzbek */
  Uz = 'uz',
  /** Vietnamese */
  Vi = 'vi',
  /** Xhosa */
  Xh = 'xh',
  /** Yoruba */
  Yo = 'yo',
  /** Chinese (Simplified, China) */
  ZhCn = 'zh_CN',
  /** Chinese (Traditional, Taiwan) */
  ZhTw = 'zh_TW',
  /** Zulu */
  Zu = 'zu'
}

/** Source of the media file. */
export enum MediaSource {
  /** The file is available at an arbitrary URL. */
  Url = 'URL',
  /** YouTube video (the `url` field contains the YouTube Video ID). */
  Youtube = 'YOUTUBE'
}

/** A menu. */
export type ApiMenu = ApiNode & {
  __typename?: 'Menu';
  /** Human-friendly unique handle. */
  handle: Scalars['String']['output'];
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** Paginated list of menu items. */
  items: ApiMenuItemConnection;
  /** The menu's title. */
  title: Scalars['String']['output'];
};


/** A menu. */
export type ApiMenuItemsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<MenuItemSort>;
};

/** Connection type for menus. */
export type ApiMenuConnection = {
  __typename?: 'MenuConnection';
  /** List of edges. */
  edges: Array<ApiMenuEdge>;
  /** Pagination information. */
  pageInfo: ApiPageInfo;
  /** The total number of items. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in the Menu connection. */
export type ApiMenuEdge = {
  __typename?: 'MenuEdge';
  /** Cursor for pagination. */
  cursor: Scalars['Cursor']['output'];
  /** The menu node. */
  node: ApiMenu;
};

/** A single menu item. */
export type ApiMenuItem = ApiNode & {
  __typename?: 'MenuItem';
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** Paginated list of nested menu items. */
  items: ApiMenuItemConnection;
  /** The referenced node (Product, Category, Page, or URLNode). */
  node: ApiMenuNode;
  /** The item's title. */
  title: Scalars['String']['output'];
};


/** A single menu item. */
export type ApiMenuItemItemsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<MenuItemSort>;
};

/** Connection type for menu items. */
export type ApiMenuItemConnection = {
  __typename?: 'MenuItemConnection';
  /** List of edges. */
  edges: Array<ApiMenuItemEdge>;
  /** Pagination information. */
  pageInfo: ApiPageInfo;
  /** The total number of items. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in the MenuItem connection. */
export type ApiMenuItemEdge = {
  __typename?: 'MenuItemEdge';
  /** Cursor for pagination. */
  cursor: Scalars['Cursor']['output'];
  /** The menu item node. */
  node: ApiMenuItem;
};

export enum MenuItemSort {
  CreatedAtAsc = 'CREATED_AT_ASC',
  CreatedAtDesc = 'CREATED_AT_DESC',
  TitleAsc = 'TITLE_ASC',
  TitleDesc = 'TITLE_DESC',
  UpdatedAtAsc = 'UPDATED_AT_ASC',
  UpdatedAtDesc = 'UPDATED_AT_DESC'
}

/** A menu node: Product, Category, Page, or URL. */
export type ApiMenuNode = ApiCategory | ApiPage | ApiProductVariant | ApiUrlNode;

export enum MenuSort {
  CreatedAtAsc = 'CREATED_AT_ASC',
  CreatedAtDesc = 'CREATED_AT_DESC',
  TitleAsc = 'TITLE_ASC',
  TitleDesc = 'TITLE_DESC',
  UpdatedAtAsc = 'UPDATED_AT_ASC',
  UpdatedAtDesc = 'UPDATED_AT_DESC'
}

export type ApiMoney = {
  __typename?: 'Money';
  /** The amount of money */
  amount: Scalars['Decimal']['output'];
  /** The currency code */
  currencyCode: CurrencyCode;
};

export type ApiMoneyInput = {
  /** The amount of money */
  amount: Scalars['Decimal']['input'];
  /** The currency code */
  currencyCode: CurrencyCode;
};

export type ApiMutation = {
  __typename?: 'Mutation';
  checkoutMutation: ApiCheckoutMutation;
  /** Create a review. */
  createReview: ApiProductReview;
  /** Delete own review. */
  deleteReview: Scalars['Boolean']['output'];
  orderMutation: ApiOrderMutation;
  /** Creates a new session using email and password. */
  passwordSignIn: ApiPasswordSignInPayload;
  /** Registers a new user and returns a session. */
  passwordSignUp: ApiPasswordSignUpPayload;
  /** Report review abuse. */
  reportReviewAbuse: Scalars['Boolean']['output'];
  /** Sends a password recovery email. */
  requestPasswordRecovery: ApiPasswordRecoveryPayload;
  /** Resets the user's password with a recovery token. */
  resetPassword: ApiResetPasswordPayload;
  /** Reply to review as seller. */
  sellerReplyToReview: Scalars['Boolean']['output'];
  /** Signs out the current user. */
  signOut: Scalars['Boolean']['output'];
  /** Updates the authenticated user's password. */
  updatePassword: ApiUpdatePasswordPayload;
  /** Edit own review. */
  updateReview: ApiProductReview;
  /** Updates the authenticated user's profile information. */
  updateUserProfile: ApiUpdateUserProfilePayload;
  /** Confirms a user's email address using a token. */
  verifyEmail: ApiVerifyEmailPayload;
  /** Mark review as helpful / not helpful. */
  voteReviewHelpful: Scalars['Boolean']['output'];
};


export type ApiMutationCreateReviewArgs = {
  input: ApiCreateReviewInput;
};


export type ApiMutationDeleteReviewArgs = {
  id: Scalars['ID']['input'];
};


export type ApiMutationPasswordSignInArgs = {
  input: ApiPasswordSignInInput;
};


export type ApiMutationPasswordSignUpArgs = {
  input: ApiPasswordSignUpInput;
};


export type ApiMutationReportReviewAbuseArgs = {
  reason: Scalars['String']['input'];
  reviewId: Scalars['ID']['input'];
};


export type ApiMutationRequestPasswordRecoveryArgs = {
  input: ApiPasswordRecoveryInput;
};


export type ApiMutationResetPasswordArgs = {
  input: ApiResetPasswordInput;
};


export type ApiMutationSellerReplyToReviewArgs = {
  input: ApiSellerReplyInput;
};


export type ApiMutationUpdatePasswordArgs = {
  input: ApiUpdatePasswordInput;
};


export type ApiMutationUpdateReviewArgs = {
  input: ApiUpdateReviewInput;
};


export type ApiMutationUpdateUserProfileArgs = {
  input: ApiUpdateUserProfileInput;
};


export type ApiMutationVerifyEmailArgs = {
  input: ApiVerifyEmailInput;
};


export type ApiMutationVoteReviewHelpfulArgs = {
  input: ApiVoteReviewHelpfulInput;
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
  purchasable: ApiProductVariant;
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

/** A content page. */
export type ApiPage = ApiNode & {
  __typename?: 'Page';
  /** The cover image for the page. */
  cover?: Maybe<ApiFile>;
  /** The date and time when the page was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The full description of the page. */
  description: Scalars['String']['output'];
  /** A short excerpt of the page. */
  excerpt: Scalars['String']['output'];
  /** Gallery of additional images with cursor-based pagination. */
  gallery: ApiGalleryConnection;
  /** Unique human-readable slug. */
  handle: Scalars['String']['output'];
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** The type of the page (e.g., "page", "article"). */
  pageType: Scalars['String']['output'];
  /** The page’s title. */
  title: Scalars['String']['output'];
  /** The date and time when the page was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};


/** A content page. */
export type ApiPageGalleryArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Connection type for pages. */
export type ApiPageConnection = {
  __typename?: 'PageConnection';
  /** List of page edges. */
  edges: Array<ApiPageEdge>;
  /** Pagination details. */
  pageInfo: ApiPageInfo;
  /** The total number of items. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in the paginated list of pages. */
export type ApiPageEdge = {
  __typename?: 'PageEdge';
  /** Cursor for pagination. */
  cursor: Scalars['Cursor']['output'];
  /** The page node. */
  node: ApiPage;
};

/** Pagination information according to the Relay/Shopify spec. */
export type ApiPageInfo = {
  __typename?: 'PageInfo';
  /** The cursor corresponding to the last node in edges. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor corresponding to the first node in edges. */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export enum PageSort {
  CreatedAtAsc = 'CREATED_AT_ASC',
  CreatedAtDesc = 'CREATED_AT_DESC',
  TitleAsc = 'TITLE_ASC',
  TitleDesc = 'TITLE_DESC',
  UpdatedAtAsc = 'UPDATED_AT_ASC',
  UpdatedAtDesc = 'UPDATED_AT_DESC'
}

/** Input data for requesting a password recovery email. */
export type ApiPasswordRecoveryInput = {
  /** Unique identifier for the client mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** User's email address. */
  email: Scalars['Email']['input'];
};

/** Payload returned after requesting password recovery. */
export type ApiPasswordRecoveryPayload = {
  __typename?: 'PasswordRecoveryPayload';
  /** Unique identifier echoed from the input. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** List of field-specific errors. */
  errors?: Maybe<Array<ApiFieldError>>;
  /** True if the recovery email was sent successfully. */
  success: Scalars['Boolean']['output'];
};

/** Input data for signing in with email and password. */
export type ApiPasswordSignInInput = {
  /** Unique identifier for the client mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** User's email address. */
  email: Scalars['Email']['input'];
  /** User's password. */
  password: Scalars['String']['input'];
};

/** Payload returned after signing in. */
export type ApiPasswordSignInPayload = {
  __typename?: 'PasswordSignInPayload';
  /** Unique identifier echoed from the input. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** List of field-specific errors. */
  errors?: Maybe<Array<ApiFieldError>>;
  /** Newly created session. */
  session?: Maybe<ApiSession>;
};

/** Input data for registering a new user. */
export type ApiPasswordSignUpInput = {
  /** Unique identifier for the client mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** User's email address. */
  email: Scalars['Email']['input'];
  /** User's password. */
  password: Scalars['String']['input'];
};

/** Payload returned after signing up. */
export type ApiPasswordSignUpPayload = {
  __typename?: 'PasswordSignUpPayload';
  /** Unique identifier echoed from the input. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** List of field-specific errors. */
  errors?: Maybe<Array<ApiFieldError>>;
  /** Newly created session. */
  session?: Maybe<ApiSession>;
};

/** Payment flow for the method, aligned with payment-plugin-sdk. */
export enum PaymentFlow {
  /** Customer pays offline via provider (QR code, display code, etc). */
  Offline = 'OFFLINE',
  /** Customer pays online via provider (redirect/app flow handled externally). */
  Online = 'ONLINE',
  /** Customer pays later/on delivery or by invoice (offline instructions). */
  OnDelivery = 'ON_DELIVERY'
}

/** Input type for executing predictive search (autocomplete suggestions). */
export type ApiPredictiveSearchInput = {
  /** The search query string. */
  query: Scalars['String']['input'];
};

/** Result of a predictive search: arrays of matching entities for quick suggestions. */
export type ApiPredictiveSearchResult = {
  __typename?: 'PredictiveSearchResult';
  /** Top matching articles. */
  articles: Array<ApiArticle>;
  /** Top matching categories. */
  categories: Array<ApiCategory>;
  /** Top matching pages. */
  pages: Array<ApiPage>;
  /** Top matching products. */
  products: Array<ApiProductVariant>;
};

/** Filter representing a price range filter. */
export type ApiPriceRangeFilter = ApiFilter & {
  __typename?: 'PriceRangeFilter';
  /** Count of products in the range. */
  count: Scalars['Int']['output'];
  handle: Scalars['String']['output'];
  id: Scalars['String']['output'];
  iid: Scalars['Uuid']['output'];
  /** Maximum price in the range. */
  maxPrice: ApiMoney;
  /** Minimum price in the range. */
  minPrice: ApiMoney;
  title: Scalars['String']['output'];
};

export type ApiProduct = ApiNode & {
  __typename?: 'Product';
  /** Primary category of the product. */
  category?: Maybe<ApiCategory>;
  /** DateTime when the category was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Full description of the product. */
  description: Scalars['String']['output'];
  /** Short excerpt or summary of the product. */
  excerpt: Scalars['String']['output'];
  /** Feature sections and their values. */
  features: Array<ApiProductFeature>;
  /** Groups of related products (e.g., bundles). */
  groups: Array<ApiProductGroup>;
  /** URL-friendly slug for the product. */
  handle: Scalars['String']['output'];
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /**
   * All option groups defined for this product—each group represents a configurable attribute
   * (for example: color, size, material) and includes the full set of possible values.
   */
  options: Array<ApiProductOption>;
  /** Product rating. */
  rating: ApiProductRating;
  /** List of reviews with pagination/filters. */
  reviews: ApiProductReviewConnection;
  /** Seo description for the product page. */
  seoDescription?: Maybe<Scalars['String']['output']>;
  /** Seo title for the product page. */
  seoTitle?: Maybe<Scalars['String']['output']>;
  /** Tags associated with the product. */
  tags: ApiTagConnection;
  /** Name of the product. */
  title: Scalars['String']['output'];
  /** DateTime when the category was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Variants of the product (different option combinations). */
  variants: Array<ApiProductVariant>;
};


export type ApiProductReviewsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ProductReviewSort>;
};


export type ApiProductTagsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<TagSort>;
};

/** A specific feature of a product, such as "Color" or "Size". */
export type ApiProductFeature = ApiNode & {
  __typename?: 'ProductFeature';
  /** Machine-friendly slug for the feature, e.g., "color" or "size". */
  handle: Scalars['String']['output'];
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** Human-readable name of the feature shown to users. */
  title: Scalars['String']['output'];
  /** Available values for this feature. */
  values: Array<ApiProductFeatureValue>;
};

/** A single possible value for a product feature, such as "Red" or "Large". */
export type ApiProductFeatureValue = ApiNode & {
  __typename?: 'ProductFeatureValue';
  /** Machine-friendly slug for the value, e.g., "red" or "large". */
  handle: Scalars['String']['output'];
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** Display name of the value shown to users. */
  title: Scalars['String']['output'];
};

/** A group of related products (e.g., bundled items). */
export type ApiProductGroup = ApiNode & {
  __typename?: 'ProductGroup';
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** Whether multiple items can be selected from this group. */
  isMultiple: Scalars['Boolean']['output'];
  /** Whether at least one item from this group is required. */
  isRequired: Scalars['Boolean']['output'];
  /** List of products in this group. */
  items: Array<ApiProductGroupItem>;
  /** Human-readable title of the group. */
  title: Scalars['String']['output'];
};

/** An item within a product group, with optional quantity and custom pricing. */
export type ApiProductGroupItem = {
  __typename?: 'ProductGroupItem';
  /** Optional quantity for this item in the group. */
  maxQuantity?: Maybe<Scalars['Int']['output']>;
  /** The product included in this group. */
  node: ApiProductGroupNode;
  /** Pricing strategy and override values for this item. */
  price: ApiProductGroupPrice;
};

export type ApiProductGroupNode = ApiProductVariant;

/** Defines how to calculate the price for a grouped item. */
export type ApiProductGroupPrice = {
  __typename?: 'ProductGroupPrice';
  /**
   * Fixed amount to add to the product’s base price.
   * Only used when `type: FIXED`.
   */
  amount?: Maybe<ApiMoney>;
  /**
   * Percentage to add to the product’s base price (e.g. 10.0 adds 10%).
   * Only used when `type: PERCENT`.
   */
  percentage?: Maybe<Scalars['Float']['output']>;
  /** Pricing mode to apply. */
  type: ProductGroupPriceType;
};

/** Available pricing modes for group items. */
export enum ProductGroupPriceType {
  /** Use the product's standard price. */
  Base = 'BASE',
  /** Add a fixed markup (the `amount` field) to the base price. */
  Fixed = 'FIXED',
  /** Include the item free of charge. */
  Free = 'FREE',
  /** Add a percentage markup (the `percentage` field) to the base price. */
  Percent = 'PERCENT'
}

/** A group of product options (e.g., "Color", "Size"). */
export type ApiProductOption = ApiNode & {
  __typename?: 'ProductOption';
  /** The display type (color swatch, image, or control). */
  displayType: ProductOptionDisplayType;
  /** The slug for this group (e.g., "color", "size"). */
  handle: Scalars['String']['output'];
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** The display name of the option group shown to users. */
  title: Scalars['String']['output'];
  /** The selected or available value in this group. */
  values: Array<ApiProductOptionValue>;
};

/** How a product option is displayed in the UI. */
export enum ProductOptionDisplayType {
  /** Apparel size control (e.g., S, M, L, XL). */
  ApparelSize = 'APPAREL_SIZE',
  /** Display options in a dropdown select. */
  Dropdown = 'DROPDOWN',
  /** Display dropdown with variant cover image per value. */
  DropdownVariantCover = 'DROPDOWN_VARIANT_COVER',
  /** Display options as radio buttons with text. */
  Radio = 'RADIO',
  /** Display a swatch (color or image). */
  Swatch = 'SWATCH',
  /** Display an image (e.g., picture or video). */
  VariantCover = 'VARIANT_COVER'
}

/** A single value for a product option (e.g., "Red", "XL", "Patterned"). */
export type ApiProductOptionValue = ApiNode & {
  __typename?: 'ProductOptionValue';
  /** The human-readable slug used in API/URLs. */
  handle: Scalars['String']['output'];
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** Variant cover image. For variant cover display type. */
  image?: Maybe<ApiFile>;
  /** The swatch object. For swatch display type. */
  swatch?: Maybe<ApiSwatch>;
  /** The display name of the value shown to users. */
  title: Scalars['String']['output'];
};

export type ApiProductRating = ApiNode & {
  __typename?: 'ProductRating';
  /** Rating breakdown details. */
  breakdown: Array<ApiRatingBreakdown>;
  /** Number of approved reviews. */
  count: Scalars['Int']['output'];
  /** Global ID of the rating. */
  id: Scalars['ID']['output'];
  /** Internal ID of the rating. (product container id) */
  iid: Scalars['Uuid']['output'];
  /** Average rating. */
  rating: Scalars['Float']['output'];
};

/** ProductReview — user review of a product (Relay-Node). */
export type ApiProductReview = ApiNode & {
  __typename?: 'ProductReview';
  /** Product cons. */
  cons?: Maybe<Scalars['String']['output']>;
  /** Creation date. */
  createdAt: Scalars['DateTime']['output'];
  /** Author's name. */
  displayName: Scalars['String']['output'];
  /** Last edit date. */
  editedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Total "not helpful" votes. */
  helpfulNo: Scalars['Int']['output'];
  /** Total "helpful" votes. */
  helpfulYes: Scalars['Int']['output'];
  /** Global ID of the review. */
  id: Scalars['ID']['output'];
  /** Internal ID of the review. */
  iid: Scalars['Uuid']['output'];
  /** Review language (ISO-639-1). */
  locale?: Maybe<Scalars['String']['output']>;
  /** Did the current user mark the review as helpful? */
  meHelpful: Scalars['Boolean']['output'];
  /** Attached media files. */
  media?: Maybe<Array<ApiFile>>;
  /** Main review text. */
  message: Scalars['String']['output'];
  /** Product pros. */
  pros?: Maybe<Scalars['String']['output']>;
  /** Number of stars (1–5, step 0.5). */
  rating: Scalars['Float']['output'];
  /** Seller reply (if any). */
  sellerReply?: Maybe<ApiReviewComment>;
  /** Publication status. */
  status: ReviewStatus;
  /** Review title. */
  title?: Maybe<Scalars['String']['output']>;
  /** Review author. */
  user: ApiUser;
  /** Whether the product was actually purchased by this user. */
  verifiedPurchase: Scalars['Boolean']['output'];
};

export type ApiProductReviewConnection = {
  __typename?: 'ProductReviewConnection';
  edges: Array<ApiProductReviewEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiProductReviewEdge = {
  __typename?: 'ProductReviewEdge';
  cursor: Scalars['String']['output'];
  node: ApiProductReview;
};

export enum ProductReviewSort {
  CreatedAtAsc = 'CREATED_AT_ASC',
  CreatedAtDesc = 'CREATED_AT_DESC',
  HelpfulYesDesc = 'HELPFUL_YES_DESC',
  RatingDesc = 'RATING_DESC'
}

export type ApiProductVariant = ApiNode & {
  __typename?: 'ProductVariant';
  /** All categories this product [variant] belongs to. */
  categories: ApiCategoryConnection;
  /** Primary category of the product. */
  category?: Maybe<ApiCategory>;
  /** Original or list price when on sale. */
  compareAtPrice?: Maybe<ApiMoney>;
  /** Primary cover image of the product. */
  cover?: Maybe<ApiFile>;
  /** DateTime when the category was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Full description of the product. */
  description: Scalars['String']['output'];
  /** Short excerpt or summary of the product. */
  excerpt: Scalars['String']['output'];
  /** Feature sections and their values. */
  features: Array<ApiProductFeature>;
  /** Gallery of additional images with cursor-based pagination. */
  gallery: ApiGalleryConnection;
  /** Groups of related products (e.g., bundles). */
  groups: Array<ApiProductGroup>;
  /** URL-friendly slug for the product. */
  handle: Scalars['String']['output'];
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /**
   * All option groups defined for this product—each group represents a configurable attribute
   * (for example: color, size, material) and includes the full set of possible values.
   */
  options: Array<ApiProductOption>;
  /** Current price of the product, including currency. */
  price: ApiMoney;
  /** Product that this variant belongs to. */
  product: ApiProduct;
  /** Private field won't be in prod. Used for internal purposes. */
  productId: Scalars['Uuid']['output'];
  /** Product rating. */
  rating: ApiProductRating;
  /** List of reviews with pagination/filters. */
  reviews: ApiProductReviewConnection;
  /**
   * The ordered list of value handles currently applied to this product configuration.
   * Each entry is the `handle` of a selected `ProductOptionValue` (for example: ["red", "m", "patterned"]).
   */
  selectedOptions: Array<Scalars['String']['output']>;
  /** Seo description for the product page. */
  seoDescription?: Maybe<Scalars['String']['output']>;
  /** Seo title for the product page. */
  seoTitle?: Maybe<Scalars['String']['output']>;
  /** Stock keeping unit identifier. */
  sku?: Maybe<Scalars['String']['output']>;
  /** Stock availability information. */
  stockStatus: ApiStockStatus;
  /** Tags associated with the product. */
  tags: ApiTagConnection;
  /** Name of the product. */
  title: Scalars['String']['output'];
  /** DateTime when the category was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Variants of the product (different option combinations). */
  variants: Array<ApiProductVariant>;
};


export type ApiProductVariantCategoriesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<CategorySort>;
};


export type ApiProductVariantGalleryArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiProductVariantReviewsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ProductReviewSort>;
};


export type ApiProductVariantTagsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<TagSort>;
};

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
  /** Retrieve a single article by its slug. */
  article?: Maybe<ApiArticle>;
  /** Retrieve a paginated list of articles (Relay Connection). */
  articles: ApiArticleConnection;
  /** Retrieve a paginated list of categories. */
  categories: ApiCategoryConnection;
  /** Retrieve a single category by its handle. */
  category?: Maybe<ApiCategory>;
  checkoutQuery: ApiCheckoutQuery;
  /** Retrieve a single menu by its handle. */
  menu?: Maybe<ApiMenu>;
  /** Retrieve a paginated list of menus (Relay Connection). */
  menus: ApiMenuConnection;
  node?: Maybe<ApiNode>;
  /** Retrieve a single page by its slug. */
  page?: Maybe<ApiPage>;
  /** Retrieve a paginated list of pages (Relay Connection). */
  pages: ApiPageConnection;
  /** Performs a predictive (autocomplete) search and returns a limited list of entities. */
  predictiveSearch: ApiPredictiveSearchResult;
  /** Fetch a single product by its handle (slug). */
  product?: Maybe<ApiProduct>;
  /** Performs a full search and returns Relay‐style connections for each entity. */
  search: ApiSearchResult;
  /** Retrieves the current authentication session. */
  session?: Maybe<ApiSession>;
  variant?: Maybe<ApiProductVariant>;
  variantBySelectedOptions?: Maybe<ApiProductVariant>;
};


export type ApiQueryArticleArgs = {
  slug: Scalars['String']['input'];
};


export type ApiQueryArticlesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ArticleSort>;
};


export type ApiQueryCategoriesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<CategorySort>;
};


export type ApiQueryCategoryArgs = {
  handle: Scalars['String']['input'];
};


export type ApiQueryMenuArgs = {
  handle: Scalars['String']['input'];
};


export type ApiQueryMenusArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<MenuSort>;
};


export type ApiQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type ApiQueryPageArgs = {
  slug: Scalars['String']['input'];
};


export type ApiQueryPagesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<PageSort>;
};


export type ApiQueryPredictiveSearchArgs = {
  input: ApiPredictiveSearchInput;
};


export type ApiQueryProductArgs = {
  handle: Scalars['String']['input'];
};


export type ApiQuerySearchArgs = {
  input: ApiSearchInput;
};


export type ApiQueryVariantArgs = {
  handle: Scalars['String']['input'];
};


export type ApiQueryVariantBySelectedOptionsArgs = {
  selectedOptions: Array<Scalars['String']['input']>;
};

export type ApiRatingBreakdown = {
  __typename?: 'RatingBreakdown';
  /** Number of approved reviews. */
  count: Scalars['Int']['output'];
  /** Percentage of approved reviews. */
  percentage: Scalars['Float']['output'];
  /** Number of stars (1–5, step 0.5). */
  star: Scalars['Int']['output'];
};

/** Filter representing a rating range filter. */
export type ApiRatingRangeFilter = ApiFilter & {
  __typename?: 'RatingRangeFilter';
  /** Count of products in the range. */
  count: Scalars['Int']['output'];
  handle: Scalars['String']['output'];
  id: Scalars['String']['output'];
  iid: Scalars['Uuid']['output'];
  /** Maximum rating in the range. */
  maxRate: Scalars['Float']['output'];
  /** Minimum rating in the range. */
  minRate: Scalars['Float']['output'];
  title: Scalars['String']['output'];
};

/** Input data for resetting a password using a token. */
export type ApiResetPasswordInput = {
  /** Unique identifier for the client mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** User's email address. */
  email: Scalars['Email']['input'];
  /** New password. */
  password: Scalars['String']['input'];
  /** Password reset token sent to the email. */
  token: Scalars['String']['input'];
};

/** Payload returned after resetting the password. */
export type ApiResetPasswordPayload = {
  __typename?: 'ResetPasswordPayload';
  /** Unique identifier echoed from the input. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** List of field-specific errors. */
  errors?: Maybe<Array<ApiFieldError>>;
  /** True if the password was reset successfully. */
  success: Scalars['Boolean']['output'];
};

/** Comment/reply to a review. */
export type ApiReviewComment = ApiNode & {
  __typename?: 'ReviewComment';
  /** Comment author. */
  author: ApiUser;
  /** Creation date. */
  createdAt: Scalars['DateTime']['output'];
  /** Last edit date. */
  editedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Global unique identifier. */
  id: Scalars['ID']['output'];
  /** Comment message. */
  message: Scalars['String']['output'];
};

/** Review status. */
export enum ReviewStatus {
  Approved = 'APPROVED',
  Pending = 'PENDING',
  Rejected = 'REJECTED'
}

/** Input type for executing full search. */
export type ApiSearchInput = {
  /** The search query string. */
  query: Scalars['String']['input'];
};

/** Result of a full search: a set of Relay connections for various entity types. */
export type ApiSearchResult = {
  __typename?: 'SearchResult';
  /** Relay‐style connection for articles. */
  articles: ApiArticleConnection;
  /** Relay‐style connection for categories. */
  categories: ApiCategoryConnection;
  /** Relay‐style connection for pages. */
  pages: ApiPageConnection;
  /** Relay‐style connection for products. */
  products: ApiListingConnection;
};


/** Result of a full search: a set of Relay connections for various entity types. */
export type ApiSearchResultArticlesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ArticleSort>;
};


/** Result of a full search: a set of Relay connections for various entity types. */
export type ApiSearchResultCategoriesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<CategorySort>;
};


/** Result of a full search: a set of Relay connections for various entity types. */
export type ApiSearchResultPagesArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<PageSort>;
};


/** Result of a full search: a set of Relay connections for various entity types. */
export type ApiSearchResultProductsArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  filters?: InputMaybe<Array<ApiFilterInput>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ListingSort>;
};

export type ApiSellerReplyInput = {
  reviewId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};

/** Represents an authentication session. */
export type ApiSession = {
  __typename?: 'Session';
  /** JWT access token for authenticating subsequent requests. */
  accessToken?: Maybe<Scalars['String']['output']>;
  /** The authenticated user. */
  user: ApiUser;
};

/** Shipping payment model */
export enum ShippingPaymentModel {
  /** Customer pays carrier directly, NOT included in grandTotal */
  CarrierDirect = 'CARRIER_DIRECT',
  /** Customer pays merchant, included in grandTotal */
  MerchantCollected = 'MERCHANT_COLLECTED'
}

/** Stock status of the product. */
export type ApiStockStatus = {
  __typename?: 'StockStatus';
  /** Machine-readable status identifier (e.g., "IN_STOCK", "OUT_OF_STOCK"). */
  handle: Scalars['String']['output'];
  /** Indicates whether the product is available for purchase. */
  isAvailable: Scalars['Boolean']['output'];
};

export type ApiSwatch = {
  __typename?: 'Swatch';
  /** The primary color in HEX format, e.g., "#ff0000". */
  color: Scalars['String']['output'];
  /** An optional secondary color (e.g., for gradients). */
  color2?: Maybe<Scalars['String']['output']>;
  /** The type of swatch. */
  displayType: SwatchDisplayType;
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** The image or video file. */
  image?: Maybe<ApiFile>;
};

export enum SwatchDisplayType {
  Color = 'COLOR',
  ColorDuo = 'COLOR_DUO',
  Image = 'IMAGE'
}

export type ApiTag = ApiNode & {
  __typename?: 'Tag';
  /** Slug is a unique identifier for the Tag in the human-readable format */
  handle: Scalars['String']['output'];
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** The title */
  title: Scalars['String']['output'];
};

export type ApiTagConnection = {
  __typename?: 'TagConnection';
  /** List of category edges (each contains a node and a cursor). */
  edges: Array<ApiTagEdge>;
  /** Pagination metadata (hasNextPage, endCursor, etc.). */
  pageInfo: ApiPageInfo;
  /** The total number of items. */
  totalCount: Scalars['Int']['output'];
};

export type ApiTagEdge = {
  __typename?: 'TagEdge';
  /** Cursor for Relay-style pagination. */
  cursor: Scalars['Cursor']['output'];
  /** Node containing the category data. */
  node: ApiTag;
};

export enum TagSort {
  CreatedAtAsc = 'CREATED_AT_ASC',
  CreatedAtDesc = 'CREATED_AT_DESC',
  TitleAsc = 'TITLE_ASC',
  TitleDesc = 'TITLE_DESC',
  UpdatedAtAsc = 'UPDATED_AT_ASC',
  UpdatedAtDesc = 'UPDATED_AT_DESC'
}

/** A node representing an arbitrary URL. */
export type ApiUrlNode = {
  __typename?: 'URLNode';
  /** The URL string. */
  url: Scalars['String']['output'];
};

/** Input data for changing the password of an authenticated user. */
export type ApiUpdatePasswordInput = {
  /** Unique identifier for the client mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** New password. */
  password: Scalars['String']['input'];
};

/** Payload returned after updating the password. */
export type ApiUpdatePasswordPayload = {
  __typename?: 'UpdatePasswordPayload';
  /** Unique identifier echoed from the input. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** List of field-specific errors. */
  errors?: Maybe<Array<ApiFieldError>>;
  /** True if the password was updated successfully. */
  success: Scalars['Boolean']['output'];
};

export type ApiUpdateReviewInput = {
  cons?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  images?: InputMaybe<Array<Scalars['ID']['input']>>;
  message?: InputMaybe<Scalars['String']['input']>;
  pros?: InputMaybe<Scalars['String']['input']>;
  rating?: InputMaybe<Scalars['Float']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Input data for updating the authenticated user's profile. */
export type ApiUpdateUserProfileInput = {
  /** Unique identifier for the client mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** New email address (optional). */
  email?: InputMaybe<Scalars['Email']['input']>;
  /** Preferred interface language (locale code). */
  language?: InputMaybe<LocaleCode>;
  /** User's full name. */
  name?: InputMaybe<ApiUserNameInput>;
  /** Phone number in E.164 format. */
  phone?: InputMaybe<Scalars['Phone']['input']>;
};

/** Payload returned after updating the user profile. */
export type ApiUpdateUserProfilePayload = {
  __typename?: 'UpdateUserProfilePayload';
  /** Unique identifier echoed from the input. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** List of field-specific errors. */
  errors?: Maybe<Array<ApiFieldError>>;
  /** The updated user object. */
  user?: Maybe<ApiUser>;
};

/** Represents a user in the system. */
export type ApiUser = ApiNode & {
  __typename?: 'User';
  /** User's email address. */
  email: Scalars['Email']['output'];
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** Whether the user's email has been verified. */
  isVerified: Scalars['Boolean']['output'];
  /** Preferred interface language (locale code). */
  language?: Maybe<LocaleCode>;
  /** Full name of the user. */
  name: ApiUserName;
  /** List of the user's orders. */
  orders: Array<ApiOrder>;
  /** Phone number in E.164 format. */
  phone?: Maybe<Scalars['Phone']['output']>;
};

/** Customer's first, middle, and last name. */
export type ApiUserName = {
  __typename?: 'UserName';
  /** First name. */
  first: Scalars['String']['output'];
  /** Last name. */
  last: Scalars['String']['output'];
  /** Middle name (optional). */
  middle?: Maybe<Scalars['String']['output']>;
};

/** Input type for customer's name. */
export type ApiUserNameInput = {
  /** First name. */
  first: Scalars['String']['input'];
  /** Last name. */
  last: Scalars['String']['input'];
  /** Middle name (optional). */
  middle?: InputMaybe<Scalars['String']['input']>;
};

export type ApiVendor = ApiNode & {
  __typename?: 'Vendor';
  /** Slug is a unique identifier for the Vendor in the human-readable format */
  handle: Scalars['String']['output'];
  /** Global unique identifier for the address. */
  id: Scalars['ID']['output'];
  /** Object identifier (Internal). */
  iid: Scalars['Uuid']['output'];
  /** The title */
  title: Scalars['String']['output'];
};

/** Input data for verifying a user's email address. */
export type ApiVerifyEmailInput = {
  /** Unique identifier for the client mutation. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Email address to verify. */
  email: Scalars['Email']['input'];
  /** Verification token sent to the email. */
  token: Scalars['String']['input'];
};

/** Payload returned after email verification. */
export type ApiVerifyEmailPayload = {
  __typename?: 'VerifyEmailPayload';
  /** Unique identifier echoed from the input. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** List of field-specific errors. */
  errors?: Maybe<Array<ApiFieldError>>;
  /** Session created upon successful verification. */
  session?: Maybe<ApiSession>;
};

export type ApiVoteReviewHelpfulInput = {
  helpful: Scalars['Boolean']['input'];
  reviewId: Scalars['ID']['input'];
};

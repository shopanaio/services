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
  DateTime: { input: any; output: any; }
  /** Decimal represented as integer amount and scale internally; serialized as normalized string */
  Decimal: { input: any; output: any; }
  Email: { input: any; output: any; }
  JSON: { input: unknown; output: unknown; }
  _Any: { input: any; output: any; }
  federation__FieldSet: { input: any; output: any; }
  federation__Policy: { input: any; output: any; }
  federation__Scope: { input: any; output: any; }
  link__Import: { input: any; output: any; }
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
  currencyCode: ApiCurrencyCode;
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
  errors: Maybe<Array<ApiCheckoutFieldError>>;
};

/** Input data for updating the display currency of the checkout. */
export type ApiCheckoutCurrencyCodeUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
  /** Currency code according to ISO 4217 (e.g., "USD", "EUR"). */
  currencyCode: ApiCurrencyCode;
};

export type ApiCheckoutCustomerIdentity = {
  __typename?: 'CheckoutCustomerIdentity';
  /** Country code of the customer. */
  countryCode: Maybe<ApiCountryCode>;
  /** Customer associated with the checkout. */
  customer: Maybe<ApiUser>;
  /** Customer email address associated with the checkout. */
  email: Maybe<Scalars['Email']['output']>;
  /** Phone number of the customer. */
  phone: Maybe<Scalars['String']['output']>;
};

/** Input data for updating customer identification data associated with the checkout. */
export type ApiCheckoutCustomerIdentityUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
  /**
   * Country code of the customer.
   * ISO 3166-1 alpha-2.
   */
  countryCode: InputMaybe<ApiCountryCode>;
  /**
   * Customer identifier in external/internal system.
   * Used to link the checkout with an existing customer.
   */
  customerId: InputMaybe<Scalars['ID']['input']>;
  /** Customer's email address. If specified, will be linked to the checkout. */
  email: InputMaybe<Scalars['Email']['input']>;
  /** Phone number of the customer. */
  phone: InputMaybe<Scalars['String']['input']>;
};

/** Input data for updating the customer note attached to the checkout. */
export type ApiCheckoutCustomerNoteUpdateInput = {
  /** Identifier of the checkout on which the operation is performed. */
  checkoutId: Scalars['ID']['input'];
  /**
   * Text of the customer note (delivery instructions, etc.).
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
  countryCode: ApiCountryCode;
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
  countryCode: ApiCountryCode;
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

export enum ApiCheckoutDeliveryMethodType {
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
  /** Identifier of the delivery group for which the delivery method is selected. */
  deliveryGroupId: Scalars['ID']['input'];
  /** Code of the delivery method available for this checkout/address. */
  shippingMethodCode: Scalars['String']['input'];
};

export type ApiCheckoutDeliveryProvider = {
  __typename?: 'CheckoutDeliveryProvider';
  /** Code of the provider (e.g., "novaposhta", "ups", "fedex", "dhl", "usps"). */
  code: Scalars['String']['output'];
  /** Data associated with the provider. */
  data: Scalars['JSON']['output'];
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
  children: Array<Maybe<ApiCheckoutLine>>;
  /** Cost calculations for this checkout item. */
  cost: ApiCheckoutLineCost;
  /** Global unique identifier for the checkout line. */
  id: Scalars['ID']['output'];
  /** Image URL of the purchasable. */
  imageSrc: Maybe<Scalars['String']['output']>;
  /** ID of the purchasable. */
  purchasableId: Scalars['ID']['output'];
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
  errors: Maybe<Array<ApiCheckoutFieldError>>;
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
  errors: Maybe<Array<ApiCheckoutFieldError>>;
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
  errors: Maybe<Array<ApiCheckoutFieldError>>;
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
  errors: Maybe<Array<ApiCheckoutFieldError>>;
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
  /** Updates the language/locale of the checkout (affects localization and formatting). */
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
  /** Whether the warning has been acknowledged by the user. */
  isDismissed: Scalars['Boolean']['output'];
  /** Importance level of the warning. */
  severity: ApiNotificationSeverity;
};

/**
 * Codes for warnings that may be returned with Checkout mutations,
 * indicating non-blocking adjustments or issues in the checkout.
 */
export enum ApiCheckoutNotificationCode {
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

/** Applied promo code for a checkout. */
export type ApiCheckoutPromoCode = {
  __typename?: 'CheckoutPromoCode';
  /** When this promo code was applied. */
  appliedAt: Scalars['DateTime']['output'];
  /** Promo code text. */
  code: Scalars['String']['output'];
  /** Discount conditions. */
  conditions: Maybe<Scalars['JSON']['output']>;
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
  checkout: Maybe<ApiCheckout>;
};


export type ApiCheckoutQueryCheckoutArgs = {
  id: Scalars['ID']['input'];
};

export enum ApiCountryCode {
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

/** Currency codes according to ISO 4217 */
export enum ApiCurrencyCode {
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
  paymentModel: ApiShippingPaymentModel;
};

export type ApiMoney = {
  __typename?: 'Money';
  /** The amount of money */
  amount: Scalars['Decimal']['output'];
  /** The currency code */
  currencyCode: ApiCurrencyCode;
};

export type ApiMutation = {
  __typename?: 'Mutation';
  checkoutMutation: ApiCheckoutMutation;
};

export type ApiNode = {
  id: Scalars['ID']['output'];
};

/** Severity levels for checkout warnings. */
export enum ApiNotificationSeverity {
  /** Informational notice; does not indicate any change in checkout data. */
  Info = 'INFO',
  /** Notification about automatic adjustments (e.g., quantity reduced). */
  Warning = 'WARNING'
}

export type ApiPurchasable = {
  id: Scalars['ID']['output'];
};

export type ApiPurchasableSnapshot = ApiPurchasable & {
  __typename?: 'PurchasableSnapshot';
  id: Scalars['ID']['output'];
  purchasableSnapshot: Scalars['JSON']['output'];
};

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
  _entities: Array<Maybe<Api_Entity>>;
  _service: Api_Service;
  checkoutQuery: ApiCheckoutQuery;
};


export type ApiQuery_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};

/** Shipping payment model */
export enum ApiShippingPaymentModel {
  /** Customer pays carrier directly, NOT included in grandTotal */
  CarrierDirect = 'CARRIER_DIRECT',
  /** Customer pays merchant, included in grandTotal */
  MerchantCollected = 'MERCHANT_COLLECTED'
}

export type ApiUser = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
};

export type Api_Entity = ApiCheckout | ApiCheckoutLine | ApiUser;

export type Api_Service = {
  __typename?: '_Service';
  sdl: Maybe<Scalars['String']['output']>;
};

export enum ApiLink__Purpose {
  /** `EXECUTION` features provide metadata necessary for operation execution. */
  Execution = 'EXECUTION',
  /** `SECURITY` features provide metadata necessary to securely resolve fields. */
  Security = 'SECURITY'
}



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
  _Entity: ( ApiCheckout ) | ( ApiCheckoutLine ) | ( ApiUser );
};

/** Mapping of interface types */
export type ApiResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  Node: ( ApiCheckout ) | ( ApiCheckoutLine );
  Purchasable: ( ApiPurchasableSnapshot );
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
  CheckoutFieldError: ResolverTypeWrapper<ApiCheckoutFieldError>;
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
  CountryCode: ApiCountryCode;
  CurrencyCode: ApiCurrencyCode;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Decimal: ResolverTypeWrapper<Scalars['Decimal']['output']>;
  DeliveryCost: ResolverTypeWrapper<ApiDeliveryCost>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Money: ResolverTypeWrapper<ApiMoney>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>['Node']>;
  NotificationSeverity: ApiNotificationSeverity;
  Purchasable: ResolverTypeWrapper<ApiResolversInterfaceTypes<ApiResolversTypes>['Purchasable']>;
  PurchasableSnapshot: ResolverTypeWrapper<ApiPurchasableSnapshot>;
  PurchasableSnapshotInput: ApiPurchasableSnapshotInput;
  Query: ResolverTypeWrapper<{}>;
  ShippingPaymentModel: ApiShippingPaymentModel;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  User: ResolverTypeWrapper<ApiUser>;
  _Any: ResolverTypeWrapper<Scalars['_Any']['output']>;
  _Entity: ResolverTypeWrapper<ApiResolversUnionTypes<ApiResolversTypes>['_Entity']>;
  _Service: ResolverTypeWrapper<Api_Service>;
  federation__FieldSet: ResolverTypeWrapper<Scalars['federation__FieldSet']['output']>;
  federation__Policy: ResolverTypeWrapper<Scalars['federation__Policy']['output']>;
  federation__Scope: ResolverTypeWrapper<Scalars['federation__Scope']['output']>;
  link__Import: ResolverTypeWrapper<Scalars['link__Import']['output']>;
  link__Purpose: ApiLink__Purpose;
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
  CheckoutFieldError: ApiCheckoutFieldError;
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
  DateTime: Scalars['DateTime']['output'];
  Decimal: Scalars['Decimal']['output'];
  DeliveryCost: ApiDeliveryCost;
  Email: Scalars['Email']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  Money: ApiMoney;
  Mutation: {};
  Node: ApiResolversInterfaceTypes<ApiResolversParentTypes>['Node'];
  Purchasable: ApiResolversInterfaceTypes<ApiResolversParentTypes>['Purchasable'];
  PurchasableSnapshot: ApiPurchasableSnapshot;
  PurchasableSnapshotInput: ApiPurchasableSnapshotInput;
  Query: {};
  String: Scalars['String']['output'];
  User: ApiUser;
  _Any: Scalars['_Any']['output'];
  _Entity: ApiResolversUnionTypes<ApiResolversParentTypes>['_Entity'];
  _Service: Api_Service;
  federation__FieldSet: Scalars['federation__FieldSet']['output'];
  federation__Policy: Scalars['federation__Policy']['output'];
  federation__Scope: Scalars['federation__Scope']['output'];
  link__Import: Scalars['link__Import']['output'];
};

export type ApiExternalDirectiveArgs = {
  reason: Maybe<Scalars['String']['input']>;
};

export type ApiExternalDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiExternalDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiFederation__AuthenticatedDirectiveArgs = { };

export type ApiFederation__AuthenticatedDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiFederation__AuthenticatedDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiFederation__ComposeDirectiveDirectiveArgs = {
  name: Maybe<Scalars['String']['input']>;
};

export type ApiFederation__ComposeDirectiveDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiFederation__ComposeDirectiveDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiFederation__ExtendsDirectiveArgs = { };

export type ApiFederation__ExtendsDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiFederation__ExtendsDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiFederation__InterfaceObjectDirectiveArgs = { };

export type ApiFederation__InterfaceObjectDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiFederation__InterfaceObjectDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiFederation__PolicyDirectiveArgs = {
  policies: Array<Array<Scalars['federation__Policy']['input']>>;
};

export type ApiFederation__PolicyDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiFederation__PolicyDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiFederation__RequiresScopesDirectiveArgs = {
  scopes: Array<Array<Scalars['federation__Scope']['input']>>;
};

export type ApiFederation__RequiresScopesDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiFederation__RequiresScopesDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiFederation__TagDirectiveArgs = {
  name: Scalars['String']['input'];
};

export type ApiFederation__TagDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiFederation__TagDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiInaccessibleDirectiveArgs = { };

export type ApiInaccessibleDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiInaccessibleDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiKeyDirectiveArgs = {
  fields: Scalars['federation__FieldSet']['input'];
  resolvable?: Maybe<Scalars['Boolean']['input']>;
};

export type ApiKeyDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiKeyDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiLinkDirectiveArgs = {
  as: Maybe<Scalars['String']['input']>;
  for: Maybe<ApiLink__Purpose>;
  import: Maybe<Array<Maybe<Scalars['link__Import']['input']>>>;
  url: Maybe<Scalars['String']['input']>;
};

export type ApiLinkDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiLinkDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiOverrideDirectiveArgs = {
  from: Scalars['String']['input'];
  label: Maybe<Scalars['String']['input']>;
};

export type ApiOverrideDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiOverrideDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiProvidesDirectiveArgs = {
  fields: Scalars['federation__FieldSet']['input'];
};

export type ApiProvidesDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiProvidesDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiRequiresDirectiveArgs = {
  fields: Scalars['federation__FieldSet']['input'];
};

export type ApiRequiresDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiRequiresDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiShareableDirectiveArgs = { };

export type ApiShareableDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = ApiShareableDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

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
  errors: Resolver<Maybe<Array<ApiResolversTypes['CheckoutFieldError']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutCustomerIdentityResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutCustomerIdentity'] = ApiResolversParentTypes['CheckoutCustomerIdentity']> = {
  countryCode: Resolver<Maybe<ApiResolversTypes['CountryCode']>, ParentType, ContextType>;
  customer: Resolver<Maybe<ApiResolversTypes['User']>, ParentType, ContextType>;
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

export type ApiCheckoutFieldErrorResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutFieldError'] = ApiResolversParentTypes['CheckoutFieldError']> = {
  field: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  message: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLineResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutLine'] = ApiResolversParentTypes['CheckoutLine']> = {
  children: Resolver<Array<Maybe<ApiResolversTypes['CheckoutLine']>>, ParentType, ContextType>;
  cost: Resolver<ApiResolversTypes['CheckoutLineCost'], ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  imageSrc: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  purchasableId: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
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
  errors: Resolver<Maybe<Array<ApiResolversTypes['CheckoutFieldError']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLinesClearPayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutLinesClearPayload'] = ApiResolversParentTypes['CheckoutLinesClearPayload']> = {
  checkout: Resolver<Maybe<ApiResolversTypes['Checkout']>, ParentType, ContextType>;
  errors: Resolver<Maybe<Array<ApiResolversTypes['CheckoutFieldError']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLinesDeletePayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutLinesDeletePayload'] = ApiResolversParentTypes['CheckoutLinesDeletePayload']> = {
  checkout: Resolver<Maybe<ApiResolversTypes['Checkout']>, ParentType, ContextType>;
  errors: Resolver<Maybe<Array<ApiResolversTypes['CheckoutFieldError']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutLinesUpdatePayloadResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutLinesUpdatePayload'] = ApiResolversParentTypes['CheckoutLinesUpdatePayload']> = {
  checkout: Resolver<Maybe<ApiResolversTypes['Checkout']>, ParentType, ContextType>;
  errors: Resolver<Maybe<Array<ApiResolversTypes['CheckoutFieldError']>>, ParentType, ContextType>;
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
  isDismissed: Resolver<ApiResolversTypes['Boolean'], ParentType, ContextType>;
  severity: Resolver<ApiResolversTypes['NotificationSeverity'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutPromoCodeResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutPromoCode'] = ApiResolversParentTypes['CheckoutPromoCode']> = {
  appliedAt: Resolver<ApiResolversTypes['DateTime'], ParentType, ContextType>;
  code: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  conditions: Resolver<Maybe<ApiResolversTypes['JSON']>, ParentType, ContextType>;
  discountType: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  provider: Resolver<ApiResolversTypes['String'], ParentType, ContextType>;
  value: Resolver<ApiResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiCheckoutQueryResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['CheckoutQuery'] = ApiResolversParentTypes['CheckoutQuery']> = {
  checkout: Resolver<Maybe<ApiResolversTypes['Checkout']>, ParentType, ContextType, RequireFields<ApiCheckoutQueryCheckoutArgs, 'id'>>;
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

export type ApiPurchasableResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Purchasable'] = ApiResolversParentTypes['Purchasable']> = {
  __resolveType: TypeResolveFn<'PurchasableSnapshot', ParentType, ContextType>;
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
};

export type ApiPurchasableSnapshotResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['PurchasableSnapshot'] = ApiResolversParentTypes['PurchasableSnapshot']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  purchasableSnapshot: Resolver<ApiResolversTypes['JSON'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ApiQueryResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['Query'] = ApiResolversParentTypes['Query']> = {
  _entities: Resolver<Array<Maybe<ApiResolversTypes['_Entity']>>, ParentType, ContextType, RequireFields<ApiQuery_EntitiesArgs, 'representations'>>;
  _service: Resolver<ApiResolversTypes['_Service'], ParentType, ContextType>;
  checkoutQuery: Resolver<ApiResolversTypes['CheckoutQuery'], ParentType, ContextType>;
};

export type ApiUserResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['User'] = ApiResolversParentTypes['User']> = {
  id: Resolver<ApiResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface Api_AnyScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['_Any'], any> {
  name: '_Any';
}

export type Api_EntityResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['_Entity'] = ApiResolversParentTypes['_Entity']> = {
  __resolveType: TypeResolveFn<'Checkout' | 'CheckoutLine' | 'User', ParentType, ContextType>;
};

export type Api_ServiceResolvers<ContextType = GraphQLContext, ParentType extends ApiResolversParentTypes['_Service'] = ApiResolversParentTypes['_Service']> = {
  sdl: Resolver<Maybe<ApiResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface ApiFederation__FieldSetScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['federation__FieldSet'], any> {
  name: 'federation__FieldSet';
}

export interface ApiFederation__PolicyScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['federation__Policy'], any> {
  name: 'federation__Policy';
}

export interface ApiFederation__ScopeScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['federation__Scope'], any> {
  name: 'federation__Scope';
}

export interface ApiLink__ImportScalarConfig extends GraphQLScalarTypeConfig<ApiResolversTypes['link__Import'], any> {
  name: 'link__Import';
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
  CheckoutFieldError: ApiCheckoutFieldErrorResolvers<ContextType>;
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
  DateTime: GraphQLScalarType;
  Decimal: GraphQLScalarType;
  DeliveryCost: ApiDeliveryCostResolvers<ContextType>;
  Email: GraphQLScalarType;
  JSON: GraphQLScalarType;
  Money: ApiMoneyResolvers<ContextType>;
  Mutation: ApiMutationResolvers<ContextType>;
  Node: ApiNodeResolvers<ContextType>;
  Purchasable: ApiPurchasableResolvers<ContextType>;
  PurchasableSnapshot: ApiPurchasableSnapshotResolvers<ContextType>;
  Query: ApiQueryResolvers<ContextType>;
  User: ApiUserResolvers<ContextType>;
  _Any: GraphQLScalarType;
  _Entity: Api_EntityResolvers<ContextType>;
  _Service: Api_ServiceResolvers<ContextType>;
  federation__FieldSet: GraphQLScalarType;
  federation__Policy: GraphQLScalarType;
  federation__Scope: GraphQLScalarType;
  link__Import: GraphQLScalarType;
};

export type ApiDirectiveResolvers<ContextType = GraphQLContext> = {
  external: ApiExternalDirectiveResolver<any, any, ContextType>;
  federation__authenticated: ApiFederation__AuthenticatedDirectiveResolver<any, any, ContextType>;
  federation__composeDirective: ApiFederation__ComposeDirectiveDirectiveResolver<any, any, ContextType>;
  federation__extends: ApiFederation__ExtendsDirectiveResolver<any, any, ContextType>;
  federation__interfaceObject: ApiFederation__InterfaceObjectDirectiveResolver<any, any, ContextType>;
  federation__policy: ApiFederation__PolicyDirectiveResolver<any, any, ContextType>;
  federation__requiresScopes: ApiFederation__RequiresScopesDirectiveResolver<any, any, ContextType>;
  federation__tag: ApiFederation__TagDirectiveResolver<any, any, ContextType>;
  inaccessible: ApiInaccessibleDirectiveResolver<any, any, ContextType>;
  key: ApiKeyDirectiveResolver<any, any, ContextType>;
  link: ApiLinkDirectiveResolver<any, any, ContextType>;
  override: ApiOverrideDirectiveResolver<any, any, ContextType>;
  provides: ApiProvidesDirectiveResolver<any, any, ContextType>;
  requires: ApiRequiresDirectiveResolver<any, any, ContextType>;
  shareable: ApiShareableDirectiveResolver<any, any, ContextType>;
};

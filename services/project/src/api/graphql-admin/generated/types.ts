import { CurrencyCode } from '@shopana/shared-references';
import { LocaleCode } from '@shopana/shared-references';
import { WeightUnit } from '@shopana/shared-references';
import { DimensionUnit } from '@shopana/shared-references';
import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { ServiceContext } from '../../../context/types.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type EnumResolverSignature<T, AllowedValues = any> = { [key in keyof T]?: AllowedValues };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** ISO 8601 date-time string */
  DateTime: { input: any; output: any; }
  /** Valid email address */
  Email: { input: any; output: any; }
  /** Unix timestamp in milliseconds */
  Timestamp: { input: any; output: any; }
  _FieldSet: { input: any; output: any; }
};

/** API key for programmatic access to the project */
export type ApiKey = {
  __typename?: 'ApiKey';
  /** Timestamp when the API key was created */
  createdAt: Scalars['DateTime']['output'];
  /** ID of the user who created this API key */
  createdById: Scalars['ID']['output'];
  /** Optional expiration date for the API key */
  dueDate: Maybe<Scalars['DateTime']['output']>;
  /** Unique identifier of the API key */
  id: Scalars['ID']['output'];
  /** Whether the API key has been banned by the system */
  isBanned: Scalars['Boolean']['output'];
  /** The API key value (only shown once upon creation) */
  key: Scalars['String']['output'];
  /** Timestamp of the last API call using this key */
  lastUsedAt: Maybe<Scalars['DateTime']['output']>;
  /** Human-readable name for the API key */
  name: Scalars['String']['output'];
  /** Timestamp when the API key was revoked, null if still active */
  revokedAt: Maybe<Scalars['DateTime']['output']>;
};

/** Payload returned after an API key action (revoke) */
export type ApiKeyActionPayload = {
  __typename?: 'ApiKeyActionPayload';
  /** Whether the action was successful */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during the action */
  userErrors: Array<UserError>;
};

/** Input for creating a new API key */
export type ApiKeyCreateInput = {
  /** Optional expiration date for the API key */
  dueDate?: InputMaybe<Scalars['DateTime']['input']>;
  /** Human-readable name for the API key */
  name: Scalars['String']['input'];
};

/** Payload returned after creating an API key */
export type ApiKeyCreatePayload = {
  __typename?: 'ApiKeyCreatePayload';
  /** The newly created API key, null if creation failed */
  apiKey: Maybe<ApiKey>;
  /** List of errors that occurred during creation */
  userErrors: Array<UserError>;
};

/** Input for deleting an API key */
export type ApiKeyDeleteInput = {
  /** ID of the API key to delete */
  id: Scalars['ID']['input'];
};

/** Payload returned after deleting an API key */
export type ApiKeyDeletePayload = {
  __typename?: 'ApiKeyDeletePayload';
  /** ID of the deleted API key, null if deletion failed */
  deletedApiKeyId: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during deletion */
  userErrors: Array<UserError>;
};

/** Input for revoking an API key */
export type ApiKeyRevokeInput = {
  /** ID of the API key to revoke */
  id: Scalars['ID']['input'];
};

export enum AutomaticFulfillmentMode {
  AllLineItems = 'ALL_LINE_ITEMS',
  Disabled = 'DISABLED',
  GiftCardsOnly = 'GIFT_CARDS_ONLY'
}

export { CurrencyCode };

export enum CurrencyDisplay {
  Code = 'CODE',
  Name = 'NAME',
  NarrowSymbol = 'NARROW_SYMBOL',
  Symbol = 'SYMBOL'
}

export enum CurrencyGrouping {
  Always = 'ALWAYS',
  Auto = 'AUTO',
  Min2 = 'MIN2',
  Never = 'NEVER'
}

export enum CurrencyRoundingMode {
  Ceil = 'CEIL',
  Expand = 'EXPAND',
  Floor = 'FLOOR',
  HalfCeil = 'HALF_CEIL',
  HalfEven = 'HALF_EVEN',
  HalfExpand = 'HALF_EXPAND',
  HalfFloor = 'HALF_FLOOR',
  HalfTrunc = 'HALF_TRUNC',
  Trunc = 'TRUNC'
}

export enum CurrencySign {
  Accounting = 'ACCOUNTING',
  Standard = 'STANDARD'
}

export enum CurrencySignDisplay {
  Always = 'ALWAYS',
  Auto = 'AUTO',
  ExceptZero = 'EXCEPT_ZERO',
  Negative = 'NEGATIVE',
  Never = 'NEVER'
}

export enum CurrencyTrailingZeroDisplay {
  Auto = 'AUTO',
  StripIfInteger = 'STRIP_IF_INTEGER'
}

export { DimensionUnit };

export type File = {
  __typename?: 'File';
  id: Scalars['ID']['output'];
};

/** Generic implementation of UserError */
export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  /** Machine-readable error code */
  code: Maybe<Scalars['String']['output']>;
  /** Path to the field that caused the error */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** Human-readable error message */
  message: Scalars['String']['output'];
};

/** Locale configuration for the project */
export type Locale = {
  __typename?: 'Locale';
  /** BCP 47 locale code */
  code: LocaleCode;
  /** Whether this locale is currently active for the project */
  isActive: Scalars['Boolean']['output'];
  /** Display name of the locale */
  name: Scalars['String']['output'];
};

export { LocaleCode };

/** Input for creating a new locale */
export type LocaleCreateInput = {
  /** BCP 47 locale code to add */
  code: LocaleCode;
  /** Whether the locale should be active upon creation */
  isActive: Scalars['Boolean']['input'];
};

/** Payload returned after creating a locale */
export type LocaleCreatePayload = {
  __typename?: 'LocaleCreatePayload';
  /** The newly created locale, null if creation failed */
  locale: Maybe<Locale>;
  /** List of errors that occurred during creation */
  userErrors: Array<UserError>;
};

/** Input for deleting a locale */
export type LocaleDeleteInput = {
  /** BCP 47 locale code to delete */
  code: LocaleCode;
};

/** Payload returned after deleting a locale */
export type LocaleDeletePayload = {
  __typename?: 'LocaleDeletePayload';
  /** The code of the deleted locale, null if deletion failed */
  deletedLocaleCode: Maybe<LocaleCode>;
  /** List of errors that occurred during deletion */
  userErrors: Array<UserError>;
};

/** Input for setting the default locale */
export type LocaleSetDefaultInput = {
  /** BCP 47 locale code to set as default */
  locale: LocaleCode;
};

/** Payload returned after updating locale settings */
export type LocaleUpdatePayload = {
  __typename?: 'LocaleUpdatePayload';
  /** Whether the update was successful */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during update */
  userErrors: Array<UserError>;
};

export type Membership = {
  __typename?: 'Membership';
  domain: Scalars['String']['output'];
  organizationId: Scalars['ID']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Store-related mutations */
  storeMutation: StoreMutation;
};

export type Organization = {
  __typename?: 'Organization';
  id: Scalars['ID']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Store-related queries */
  storeQuery: StoreQuery;
};

/** A store */
export type Store = {
  __typename?: 'Store';
  /** Customer-visible store address */
  address: Maybe<StoreAddress>;
  /** Store brand assets, colors, copy, and social links */
  brand: StoreBrand;
  /** Store contact details and ordered phone numbers */
  contactDetails: StoreContactDetails;
  /** Timestamp when the store was created */
  createdAt: Scalars['DateTime']['output'];
  /** Currency used by the store */
  currencyCode: CurrencyCode;
  /** Currency and number-formatting settings */
  currencySettings: StoreCurrencySettings;
  /** Default unit for product dimensions */
  defaultDimensionUnit: DimensionUnit;
  /** Default locale for new content */
  defaultLocale: LocaleCode;
  /** Default unit for product weights */
  defaultWeightUnit: WeightUnit;
  /** Regional and measurement defaults */
  defaults: StoreDefaults;
  /** Display name of the store */
  displayName: Scalars['String']['output'];
  /** Contact email address for the store */
  email: Maybe<Scalars['String']['output']>;
  /** Unique identifier of the store */
  id: Scalars['ID']['output'];
  /** List of enabled locale codes for the store */
  locales: Array<LocaleCode>;
  /** Membership info (resolved from IAM by domain) */
  membership: Membership;
  /** URL-friendly unique identifier */
  name: Scalars['String']['output'];
  /** Order numbering and processing behavior */
  orderProcessing: StoreOrderProcessing;
  /** Organization that owns this store (federation reference) */
  organization: Maybe<Organization>;
  /** Optimistic locking revision incremented by each unified update */
  revision: Scalars['Int']['output'];
  /** Current operational status of the store */
  status: StoreStatus;
  /** IANA timezone identifier for the store */
  timezone: Scalars['String']['output'];
  /** Timestamp when the store was last updated */
  updatedAt: Scalars['DateTime']['output'];
};

export type StoreAddress = {
  __typename?: 'StoreAddress';
  addressLine1: Maybe<Scalars['String']['output']>;
  addressLine2: Maybe<Scalars['String']['output']>;
  administrativeArea: Maybe<Scalars['String']['output']>;
  city: Maybe<Scalars['String']['output']>;
  companyName: Maybe<Scalars['String']['output']>;
  countryCode: Scalars['String']['output'];
  postalCode: Maybe<Scalars['String']['output']>;
};

export type StoreAddressUpdateInput = {
  addressLine1?: InputMaybe<Scalars['String']['input']>;
  addressLine2?: InputMaybe<Scalars['String']['input']>;
  administrativeArea?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  companyName?: InputMaybe<Scalars['String']['input']>;
  countryCode: Scalars['String']['input'];
  postalCode?: InputMaybe<Scalars['String']['input']>;
};

export type StoreBrand = {
  __typename?: 'StoreBrand';
  coverImage: Maybe<File>;
  defaultLogo: Maybe<File>;
  primaryColor: Scalars['String']['output'];
  secondaryColor: Scalars['String']['output'];
  shortDescription: Maybe<Scalars['String']['output']>;
  slogan: Maybe<Scalars['String']['output']>;
  socialLinks: Array<StoreSocialLink>;
  squareLogo: Maybe<File>;
};

export type StoreBrandUpdateInput = {
  coverImageId?: InputMaybe<Scalars['ID']['input']>;
  defaultLogoId?: InputMaybe<Scalars['ID']['input']>;
  primaryColor: Scalars['String']['input'];
  secondaryColor: Scalars['String']['input'];
  shortDescription?: InputMaybe<Scalars['String']['input']>;
  slogan?: InputMaybe<Scalars['String']['input']>;
  socialLinks: Array<StoreSocialLinkInput>;
  squareLogoId?: InputMaybe<Scalars['ID']['input']>;
};

export type StoreContactDetails = {
  __typename?: 'StoreContactDetails';
  email: Maybe<Scalars['Email']['output']>;
  name: Scalars['String']['output'];
  phoneNumbers: Array<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
};

export type StoreContactDetailsUpdateInput = {
  email?: InputMaybe<Scalars['Email']['input']>;
  name: Scalars['String']['input'];
  phoneNumbers: Array<Scalars['String']['input']>;
  slug: Scalars['String']['input'];
};

/** Input for creating a new store */
export type StoreCreateInput = {
  /** Currency used by the store */
  currencyCode: CurrencyCode;
  /** Display name of the store */
  displayName: Scalars['String']['input'];
  /** Contact email address */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Initial list of locale codes to enable */
  locales: Array<LocaleCode>;
  /** URL-friendly unique identifier */
  name: Scalars['String']['input'];
  /** ID of the organization where the store will be created */
  organizationId: Scalars['ID']['input'];
  /** Initial status of the store */
  status?: InputMaybe<StoreStatus>;
  /** IANA timezone identifier */
  timezone?: InputMaybe<Scalars['String']['input']>;
};

/** Payload returned after creating a store */
export type StoreCreatePayload = {
  __typename?: 'StoreCreatePayload';
  /** The newly created store, null if creation failed */
  store: Maybe<Store>;
  /** List of errors that occurred during creation */
  userErrors: Array<UserError>;
};

export type StoreCurrencySettings = {
  __typename?: 'StoreCurrencySettings';
  currencyCode: CurrencyCode;
  currencyDisplay: CurrencyDisplay;
  currencySign: CurrencySign;
  grouping: CurrencyGrouping;
  maximumFractionDigits: Scalars['Int']['output'];
  minimumFractionDigits: Scalars['Int']['output'];
  roundingMode: CurrencyRoundingMode;
  signDisplay: CurrencySignDisplay;
  trailingZeroDisplay: CurrencyTrailingZeroDisplay;
};

export type StoreCurrencySettingsUpdateInput = {
  currencyCode: CurrencyCode;
  currencyDisplay: CurrencyDisplay;
  currencySign: CurrencySign;
  grouping: CurrencyGrouping;
  maximumFractionDigits: Scalars['Int']['input'];
  minimumFractionDigits: Scalars['Int']['input'];
  roundingMode: CurrencyRoundingMode;
  signDisplay: CurrencySignDisplay;
  trailingZeroDisplay: CurrencyTrailingZeroDisplay;
};

export type StoreDefaults = {
  __typename?: 'StoreDefaults';
  defaultDimensionUnit: DimensionUnit;
  defaultWeightUnit: WeightUnit;
  timezone: Scalars['String']['output'];
  unitSystem: UnitSystem;
};

export type StoreDefaultsUpdateInput = {
  defaultDimensionUnit: DimensionUnit;
  defaultWeightUnit: WeightUnit;
  timezone: Scalars['String']['input'];
  unitSystem: UnitSystem;
};

/** Input for deleting a store */
export type StoreDeleteInput = {
  /** ID of the store to delete */
  id: Scalars['ID']['input'];
  /** Organization name for authorization context */
  organizationId: Scalars['ID']['input'];
};

/** Payload returned after deleting a store */
export type StoreDeletePayload = {
  __typename?: 'StoreDeletePayload';
  /** ID of the deleted store, null if deletion failed */
  deletedStoreId: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during deletion */
  userErrors: Array<UserError>;
};

/** Mutations for store management */
export type StoreMutation = {
  __typename?: 'StoreMutation';
  /** Create a new API key for programmatic access */
  apiKeyCreate: ApiKeyCreatePayload;
  /** Permanently delete an API key */
  apiKeyDelete: ApiKeyDeletePayload;
  /** Revoke an API key (soft delete) */
  apiKeyRevoke: ApiKeyActionPayload;
  /** Add a new locale to the store */
  localeCreate: LocaleCreatePayload;
  /** Remove a locale from the store */
  localeDelete: LocaleDeletePayload;
  /** Set the default locale for the store */
  localeSetDefault: LocaleUpdatePayload;
  /** Create a new store */
  storeCreate: StoreCreatePayload;
  /** Delete a store */
  storeDelete: StoreDeletePayload;
  /** Unified store update composed from independent settings operations */
  storeUpdate: StoreUpdatePayload;
};


/** Mutations for store management */
export type StoreMutationApiKeyCreateArgs = {
  input: ApiKeyCreateInput;
};


/** Mutations for store management */
export type StoreMutationApiKeyDeleteArgs = {
  input: ApiKeyDeleteInput;
};


/** Mutations for store management */
export type StoreMutationApiKeyRevokeArgs = {
  input: ApiKeyRevokeInput;
};


/** Mutations for store management */
export type StoreMutationLocaleCreateArgs = {
  input: LocaleCreateInput;
};


/** Mutations for store management */
export type StoreMutationLocaleDeleteArgs = {
  input: LocaleDeleteInput;
};


/** Mutations for store management */
export type StoreMutationLocaleSetDefaultArgs = {
  input: LocaleSetDefaultInput;
};


/** Mutations for store management */
export type StoreMutationStoreCreateArgs = {
  input: StoreCreateInput;
};


/** Mutations for store management */
export type StoreMutationStoreDeleteArgs = {
  input: StoreDeleteInput;
};


/** Mutations for store management */
export type StoreMutationStoreUpdateArgs = {
  clientMutationId: Scalars['String']['input'];
  expectedRevision: Scalars['Int']['input'];
  operations?: InputMaybe<StoreUpdateInput>;
  storeId: Scalars['ID']['input'];
};

export type StoreOrderProcessing = {
  __typename?: 'StoreOrderProcessing';
  automaticFulfillmentMode: AutomaticFulfillmentMode;
  automaticallyArchiveOrders: Scalars['Boolean']['output'];
  orderNumberPrefix: Scalars['String']['output'];
  orderNumberSuffix: Maybe<Scalars['String']['output']>;
  requireCheckoutConfirmation: Scalars['Boolean']['output'];
};

export type StoreOrderProcessingUpdateInput = {
  automaticFulfillmentMode: AutomaticFulfillmentMode;
  automaticallyArchiveOrders: Scalars['Boolean']['input'];
  orderNumberPrefix: Scalars['String']['input'];
  orderNumberSuffix?: InputMaybe<Scalars['String']['input']>;
  requireCheckoutConfirmation: Scalars['Boolean']['input'];
};

/** Queries for store management */
export type StoreQuery = {
  __typename?: 'StoreQuery';
  /** Get all API keys for the current store */
  apiKeys: Array<ApiKey>;
  /** Get the current store from context */
  currentStore: Maybe<Store>;
  /** Get all stores accessible to the current user in the organization */
  stores: Array<Store>;
};


/** Queries for store management */
export type StoreQueryStoresArgs = {
  organizationId: Scalars['ID']['input'];
};

export type StoreSocialLink = {
  __typename?: 'StoreSocialLink';
  platform: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type StoreSocialLinkInput = {
  platform: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

/** Status of a store */
export enum StoreStatus {
  /** Store is active and operational */
  Active = 'ACTIVE',
  /** Store is inactive and not processing requests */
  Inactive = 'INACTIVE'
}

/** Independent sections accepted by the unified store update mutation. */
export type StoreUpdateInput = {
  address?: InputMaybe<StoreAddressUpdateInput>;
  brand?: InputMaybe<StoreBrandUpdateInput>;
  contactDetails?: InputMaybe<StoreContactDetailsUpdateInput>;
  currencySettings?: InputMaybe<StoreCurrencySettingsUpdateInput>;
  defaults?: InputMaybe<StoreDefaultsUpdateInput>;
  orderProcessing?: InputMaybe<StoreOrderProcessingUpdateInput>;
};

export type StoreUpdateOperationResult = {
  __typename?: 'StoreUpdateOperationResult';
  applied: Scalars['Boolean']['output'];
  errors: Array<UserError>;
  type: StoreUpdateOperationType;
};

export enum StoreUpdateOperationType {
  AddressUpdate = 'ADDRESS_UPDATE',
  BrandUpdate = 'BRAND_UPDATE',
  ContactDetailsUpdate = 'CONTACT_DETAILS_UPDATE',
  CurrencySettingsUpdate = 'CURRENCY_SETTINGS_UPDATE',
  DefaultsUpdate = 'DEFAULTS_UPDATE',
  OrderProcessingUpdate = 'ORDER_PROCESSING_UPDATE'
}

/** Payload returned after updating a store */
export type StoreUpdatePayload = {
  __typename?: 'StoreUpdatePayload';
  /** Result of every requested operation in deterministic input order */
  operationResults: Array<StoreUpdateOperationResult>;
  /** The updated store, null if update failed */
  store: Maybe<Store>;
  /** Aggregated errors from all operations */
  userErrors: Array<UserError>;
};

export enum UnitSystem {
  Imperial = 'IMPERIAL',
  Metric = 'METRIC'
}

/** Represents a user-facing error */
export type UserError = {
  /** Machine-readable error code */
  code: Maybe<Scalars['String']['output']>;
  /** Path to the field that caused the error */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** Human-readable error message */
  message: Scalars['String']['output'];
};

export { WeightUnit };

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ReferenceResolver<TResult, TReference, TContext> = (
      reference: TReference,
      context: TContext,
      info: GraphQLResolveInfo
    ) => Promise<TResult> | TResult;

      type ScalarCheck<T, S> = S extends true ? T : NullableCheck<T, S>;
      type NullableCheck<T, S> = Maybe<T> extends T ? Maybe<ListCheck<NonNullable<T>, S>> : ListCheck<T, S>;
      type ListCheck<T, S> = T extends (infer U)[] ? NullableCheck<U, S>[] : GraphQLRecursivePick<T, S>;
      export type GraphQLRecursivePick<T, S> = { [K in keyof T & keyof S]: ScalarCheck<T[K], S[K]> };
    

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


/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  ApiKey: ResolverTypeWrapper<ApiKey>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  ApiKeyActionPayload: ResolverTypeWrapper<Omit<ApiKeyActionPayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  ApiKeyCreateInput: ApiKeyCreateInput;
  ApiKeyCreatePayload: ResolverTypeWrapper<Omit<ApiKeyCreatePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  ApiKeyDeleteInput: ApiKeyDeleteInput;
  ApiKeyDeletePayload: ResolverTypeWrapper<Omit<ApiKeyDeletePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  ApiKeyRevokeInput: ApiKeyRevokeInput;
  AutomaticFulfillmentMode: AutomaticFulfillmentMode;
  CurrencyCode: CurrencyCode;
  CurrencyDisplay: CurrencyDisplay;
  CurrencyGrouping: CurrencyGrouping;
  CurrencyRoundingMode: CurrencyRoundingMode;
  CurrencySign: CurrencySign;
  CurrencySignDisplay: CurrencySignDisplay;
  CurrencyTrailingZeroDisplay: CurrencyTrailingZeroDisplay;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DimensionUnit: DimensionUnit;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  File: ResolverTypeWrapper<File>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  Locale: ResolverTypeWrapper<Locale>;
  LocaleCode: LocaleCode;
  LocaleCreateInput: LocaleCreateInput;
  LocaleCreatePayload: ResolverTypeWrapper<Omit<LocaleCreatePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  LocaleDeleteInput: LocaleDeleteInput;
  LocaleDeletePayload: ResolverTypeWrapper<Omit<LocaleDeletePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  LocaleSetDefaultInput: LocaleSetDefaultInput;
  LocaleUpdatePayload: ResolverTypeWrapper<Omit<LocaleUpdatePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  Membership: ResolverTypeWrapper<Membership>;
  Mutation: ResolverTypeWrapper<{}>;
  Organization: ResolverTypeWrapper<Organization>;
  Query: ResolverTypeWrapper<{}>;
  Store: ResolverTypeWrapper<Store>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  StoreAddress: ResolverTypeWrapper<StoreAddress>;
  StoreAddressUpdateInput: StoreAddressUpdateInput;
  StoreBrand: ResolverTypeWrapper<StoreBrand>;
  StoreBrandUpdateInput: StoreBrandUpdateInput;
  StoreContactDetails: ResolverTypeWrapper<StoreContactDetails>;
  StoreContactDetailsUpdateInput: StoreContactDetailsUpdateInput;
  StoreCreateInput: StoreCreateInput;
  StoreCreatePayload: ResolverTypeWrapper<Omit<StoreCreatePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  StoreCurrencySettings: ResolverTypeWrapper<StoreCurrencySettings>;
  StoreCurrencySettingsUpdateInput: StoreCurrencySettingsUpdateInput;
  StoreDefaults: ResolverTypeWrapper<StoreDefaults>;
  StoreDefaultsUpdateInput: StoreDefaultsUpdateInput;
  StoreDeleteInput: StoreDeleteInput;
  StoreDeletePayload: ResolverTypeWrapper<Omit<StoreDeletePayload, 'userErrors'> & { userErrors: Array<ResolversTypes['UserError']> }>;
  StoreMutation: ResolverTypeWrapper<Omit<StoreMutation, 'apiKeyCreate' | 'apiKeyDelete' | 'apiKeyRevoke' | 'localeCreate' | 'localeDelete' | 'localeSetDefault' | 'storeCreate' | 'storeDelete' | 'storeUpdate'> & { apiKeyCreate: ResolversTypes['ApiKeyCreatePayload'], apiKeyDelete: ResolversTypes['ApiKeyDeletePayload'], apiKeyRevoke: ResolversTypes['ApiKeyActionPayload'], localeCreate: ResolversTypes['LocaleCreatePayload'], localeDelete: ResolversTypes['LocaleDeletePayload'], localeSetDefault: ResolversTypes['LocaleUpdatePayload'], storeCreate: ResolversTypes['StoreCreatePayload'], storeDelete: ResolversTypes['StoreDeletePayload'], storeUpdate: ResolversTypes['StoreUpdatePayload'] }>;
  StoreOrderProcessing: ResolverTypeWrapper<StoreOrderProcessing>;
  StoreOrderProcessingUpdateInput: StoreOrderProcessingUpdateInput;
  StoreQuery: ResolverTypeWrapper<StoreQuery>;
  StoreSocialLink: ResolverTypeWrapper<StoreSocialLink>;
  StoreSocialLinkInput: StoreSocialLinkInput;
  StoreStatus: StoreStatus;
  StoreUpdateInput: StoreUpdateInput;
  StoreUpdateOperationResult: ResolverTypeWrapper<Omit<StoreUpdateOperationResult, 'errors'> & { errors: Array<ResolversTypes['UserError']> }>;
  StoreUpdateOperationType: StoreUpdateOperationType;
  StoreUpdatePayload: ResolverTypeWrapper<Omit<StoreUpdatePayload, 'operationResults' | 'userErrors'> & { operationResults: Array<ResolversTypes['StoreUpdateOperationResult']>, userErrors: Array<ResolversTypes['UserError']> }>;
  Timestamp: ResolverTypeWrapper<Scalars['Timestamp']['output']>;
  UnitSystem: UnitSystem;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  ApiKey: ApiKey;
  ID: Scalars['ID']['output'];
  Boolean: Scalars['Boolean']['output'];
  String: Scalars['String']['output'];
  ApiKeyActionPayload: Omit<ApiKeyActionPayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  ApiKeyCreateInput: ApiKeyCreateInput;
  ApiKeyCreatePayload: Omit<ApiKeyCreatePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  ApiKeyDeleteInput: ApiKeyDeleteInput;
  ApiKeyDeletePayload: Omit<ApiKeyDeletePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  ApiKeyRevokeInput: ApiKeyRevokeInput;
  DateTime: Scalars['DateTime']['output'];
  Email: Scalars['Email']['output'];
  File: File;
  GenericUserError: GenericUserError;
  Locale: Locale;
  LocaleCreateInput: LocaleCreateInput;
  LocaleCreatePayload: Omit<LocaleCreatePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  LocaleDeleteInput: LocaleDeleteInput;
  LocaleDeletePayload: Omit<LocaleDeletePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  LocaleSetDefaultInput: LocaleSetDefaultInput;
  LocaleUpdatePayload: Omit<LocaleUpdatePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  Membership: Membership;
  Mutation: {};
  Organization: Organization;
  Query: {};
  Store: Store;
  Int: Scalars['Int']['output'];
  StoreAddress: StoreAddress;
  StoreAddressUpdateInput: StoreAddressUpdateInput;
  StoreBrand: StoreBrand;
  StoreBrandUpdateInput: StoreBrandUpdateInput;
  StoreContactDetails: StoreContactDetails;
  StoreContactDetailsUpdateInput: StoreContactDetailsUpdateInput;
  StoreCreateInput: StoreCreateInput;
  StoreCreatePayload: Omit<StoreCreatePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  StoreCurrencySettings: StoreCurrencySettings;
  StoreCurrencySettingsUpdateInput: StoreCurrencySettingsUpdateInput;
  StoreDefaults: StoreDefaults;
  StoreDefaultsUpdateInput: StoreDefaultsUpdateInput;
  StoreDeleteInput: StoreDeleteInput;
  StoreDeletePayload: Omit<StoreDeletePayload, 'userErrors'> & { userErrors: Array<ResolversParentTypes['UserError']> };
  StoreMutation: Omit<StoreMutation, 'apiKeyCreate' | 'apiKeyDelete' | 'apiKeyRevoke' | 'localeCreate' | 'localeDelete' | 'localeSetDefault' | 'storeCreate' | 'storeDelete' | 'storeUpdate'> & { apiKeyCreate: ResolversParentTypes['ApiKeyCreatePayload'], apiKeyDelete: ResolversParentTypes['ApiKeyDeletePayload'], apiKeyRevoke: ResolversParentTypes['ApiKeyActionPayload'], localeCreate: ResolversParentTypes['LocaleCreatePayload'], localeDelete: ResolversParentTypes['LocaleDeletePayload'], localeSetDefault: ResolversParentTypes['LocaleUpdatePayload'], storeCreate: ResolversParentTypes['StoreCreatePayload'], storeDelete: ResolversParentTypes['StoreDeletePayload'], storeUpdate: ResolversParentTypes['StoreUpdatePayload'] };
  StoreOrderProcessing: StoreOrderProcessing;
  StoreOrderProcessingUpdateInput: StoreOrderProcessingUpdateInput;
  StoreQuery: StoreQuery;
  StoreSocialLink: StoreSocialLink;
  StoreSocialLinkInput: StoreSocialLinkInput;
  StoreUpdateInput: StoreUpdateInput;
  StoreUpdateOperationResult: Omit<StoreUpdateOperationResult, 'errors'> & { errors: Array<ResolversParentTypes['UserError']> };
  StoreUpdatePayload: Omit<StoreUpdatePayload, 'operationResults' | 'userErrors'> & { operationResults: Array<ResolversParentTypes['StoreUpdateOperationResult']>, userErrors: Array<ResolversParentTypes['UserError']> };
  Timestamp: Scalars['Timestamp']['output'];
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
}>;

export type ApiKeyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApiKey'] = ResolversParentTypes['ApiKey']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ApiKey']>, { __typename: 'ApiKey' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdById?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  dueDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isBanned?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastUsedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  revokedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApiKeyActionPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApiKeyActionPayload'] = ResolversParentTypes['ApiKeyActionPayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApiKeyCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApiKeyCreatePayload'] = ResolversParentTypes['ApiKeyCreatePayload']> = ResolversObject<{
  apiKey?: Resolver<Maybe<ResolversTypes['ApiKey']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApiKeyDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApiKeyDeletePayload'] = ResolversParentTypes['ApiKeyDeletePayload']> = ResolversObject<{
  deletedApiKeyId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CurrencyCodeResolvers = EnumResolverSignature<{ AED?: any, AFN?: any, ALL?: any, AMD?: any, ANG?: any, AOA?: any, ARS?: any, AUD?: any, AWG?: any, AZN?: any, BAM?: any, BBD?: any, BDT?: any, BGN?: any, BHD?: any, BIF?: any, BMD?: any, BND?: any, BOB?: any, BRL?: any, BSD?: any, BTN?: any, BWP?: any, BYN?: any, BZD?: any, CAD?: any, CDF?: any, CHF?: any, CLP?: any, CNY?: any, COP?: any, CRC?: any, CUP?: any, CVE?: any, CZK?: any, DJF?: any, DKK?: any, DOP?: any, DZD?: any, EGP?: any, ERN?: any, ETB?: any, EUR?: any, FJD?: any, FKP?: any, FOK?: any, GBP?: any, GEL?: any, GGP?: any, GHS?: any, GIP?: any, GMD?: any, GNF?: any, GTQ?: any, GYD?: any, HKD?: any, HNL?: any, HRK?: any, HTG?: any, HUF?: any, IDR?: any, ILS?: any, IMP?: any, INR?: any, IQD?: any, IRR?: any, ISK?: any, JEP?: any, JMD?: any, JOD?: any, JPY?: any, KES?: any, KGS?: any, KHR?: any, KMF?: any, KPW?: any, KRW?: any, KWD?: any, KYD?: any, KZT?: any, LAK?: any, LBP?: any, LKR?: any, LRD?: any, LSL?: any, LYD?: any, MAD?: any, MDL?: any, MGA?: any, MKD?: any, MMK?: any, MNT?: any, MOP?: any, MRU?: any, MUR?: any, MVR?: any, MWK?: any, MXN?: any, MYR?: any, MZN?: any, NAD?: any, NGN?: any, NIO?: any, NOK?: any, NPR?: any, NZD?: any, OMR?: any, PAB?: any, PEN?: any, PGK?: any, PHP?: any, PKR?: any, PLN?: any, PYG?: any, QAR?: any, RON?: any, RSD?: any, RUB?: any, RWF?: any, SAR?: any, SBD?: any, SCR?: any, SDG?: any, SEK?: any, SGD?: any, SHP?: any, SLE?: any, SOS?: any, SRD?: any, SSP?: any, STN?: any, SVC?: any, SYP?: any, SZL?: any, THB?: any, TJS?: any, TMT?: any, TND?: any, TOP?: any, TRY?: any, TTD?: any, TWD?: any, TZS?: any, UAH?: any, UGX?: any, USD?: any, UYU?: any, UZS?: any, VES?: any, VND?: any, VUV?: any, WST?: any, XAF?: any, XCD?: any, XDR?: any, XOF?: any, XPF?: any, YER?: any, ZAR?: any, ZMW?: any, ZWL?: any }, ResolversTypes['CurrencyCode']>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DimensionUnitResolvers = EnumResolverSignature<{ cm?: any, ft?: any, in?: any, m?: any, mm?: any }, ResolversTypes['DimensionUnit']>;

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type FileResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['File'] = ResolversParentTypes['File']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GenericUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GenericUserError'] = ResolversParentTypes['GenericUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LocaleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Locale'] = ResolversParentTypes['Locale']> = ResolversObject<{
  code?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LocaleCodeResolvers = EnumResolverSignature<{ ak?: any, am?: any, ar?: any, as?: any, az?: any, be?: any, bg?: any, bm?: any, bn?: any, bo?: any, br?: any, bs?: any, ca?: any, ce?: any, ckb?: any, cs?: any, cy?: any, da?: any, de?: any, dz?: any, ee?: any, el?: any, en?: any, eo?: any, es?: any, et?: any, eu?: any, fa?: any, ff?: any, fi?: any, fil?: any, fo?: any, fr?: any, fy?: any, ga?: any, gd?: any, gl?: any, gu?: any, gv?: any, ha?: any, he?: any, hi?: any, hr?: any, hu?: any, hy?: any, ia?: any, id?: any, ig?: any, ii?: any, is?: any, it?: any, ja?: any, jv?: any, ka?: any, ki?: any, kk?: any, kl?: any, km?: any, kn?: any, ko?: any, ks?: any, ku?: any, kw?: any, ky?: any, lb?: any, lg?: any, ln?: any, lo?: any, lt?: any, lu?: any, lv?: any, mg?: any, mi?: any, mk?: any, ml?: any, mn?: any, mr?: any, ms?: any, mt?: any, my?: any, nb?: any, nd?: any, ne?: any, nl?: any, nn?: any, no?: any, om?: any, or?: any, os?: any, pa?: any, pl?: any, ps?: any, pt_BR?: any, pt_PT?: any, qu?: any, rm?: any, rn?: any, ro?: any, ru?: any, rw?: any, sa?: any, sc?: any, sd?: any, se?: any, sg?: any, si?: any, sk?: any, sl?: any, sn?: any, so?: any, sq?: any, sr?: any, su?: any, sv?: any, sw?: any, ta?: any, te?: any, tg?: any, th?: any, ti?: any, tk?: any, to?: any, tr?: any, tt?: any, ug?: any, uk?: any, ur?: any, uz?: any, vi?: any, wo?: any, xh?: any, yi?: any, yo?: any, zh_CN?: any, zh_TW?: any, zu?: any }, ResolversTypes['LocaleCode']>;

export type LocaleCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LocaleCreatePayload'] = ResolversParentTypes['LocaleCreatePayload']> = ResolversObject<{
  locale?: Resolver<Maybe<ResolversTypes['Locale']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LocaleDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LocaleDeletePayload'] = ResolversParentTypes['LocaleDeletePayload']> = ResolversObject<{
  deletedLocaleCode?: Resolver<Maybe<ResolversTypes['LocaleCode']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LocaleUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LocaleUpdatePayload'] = ResolversParentTypes['LocaleUpdatePayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MembershipResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Membership'] = ResolversParentTypes['Membership']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Membership']>, { __typename: 'Membership' } & GraphQLRecursivePick<ParentType, {"domain":true,"organizationId":true}>, ContextType>;


  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  storeMutation?: Resolver<ResolversTypes['StoreMutation'], ParentType, ContextType>;
}>;

export type OrganizationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Organization']>, { __typename: 'Organization' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  storeQuery?: Resolver<ResolversTypes['StoreQuery'], ParentType, ContextType>;
}>;

export type StoreResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Store'] = ResolversParentTypes['Store']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Store']>, { __typename: 'Store' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  address?: Resolver<Maybe<ResolversTypes['StoreAddress']>, ParentType, ContextType>;
  brand?: Resolver<ResolversTypes['StoreBrand'], ParentType, ContextType>;
  contactDetails?: Resolver<ResolversTypes['StoreContactDetails'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  currencyCode?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  currencySettings?: Resolver<ResolversTypes['StoreCurrencySettings'], ParentType, ContextType>;
  defaultDimensionUnit?: Resolver<ResolversTypes['DimensionUnit'], ParentType, ContextType>;
  defaultLocale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  defaultWeightUnit?: Resolver<ResolversTypes['WeightUnit'], ParentType, ContextType>;
  defaults?: Resolver<ResolversTypes['StoreDefaults'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  locales?: Resolver<Array<ResolversTypes['LocaleCode']>, ParentType, ContextType>;
  membership?: Resolver<ResolversTypes['Membership'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  orderProcessing?: Resolver<ResolversTypes['StoreOrderProcessing'], ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['StoreStatus'], ParentType, ContextType>;
  timezone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreAddressResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreAddress'] = ResolversParentTypes['StoreAddress']> = ResolversObject<{
  addressLine1?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  addressLine2?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  administrativeArea?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  city?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  companyName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  countryCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  postalCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreBrandResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreBrand'] = ResolversParentTypes['StoreBrand']> = ResolversObject<{
  coverImage?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  defaultLogo?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  primaryColor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  secondaryColor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  shortDescription?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slogan?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  socialLinks?: Resolver<Array<ResolversTypes['StoreSocialLink']>, ParentType, ContextType>;
  squareLogo?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreContactDetailsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreContactDetails'] = ResolversParentTypes['StoreContactDetails']> = ResolversObject<{
  email?: Resolver<Maybe<ResolversTypes['Email']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phoneNumbers?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreCreatePayload'] = ResolversParentTypes['StoreCreatePayload']> = ResolversObject<{
  store?: Resolver<Maybe<ResolversTypes['Store']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreCurrencySettingsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreCurrencySettings'] = ResolversParentTypes['StoreCurrencySettings']> = ResolversObject<{
  currencyCode?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  currencyDisplay?: Resolver<ResolversTypes['CurrencyDisplay'], ParentType, ContextType>;
  currencySign?: Resolver<ResolversTypes['CurrencySign'], ParentType, ContextType>;
  grouping?: Resolver<ResolversTypes['CurrencyGrouping'], ParentType, ContextType>;
  maximumFractionDigits?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  minimumFractionDigits?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  roundingMode?: Resolver<ResolversTypes['CurrencyRoundingMode'], ParentType, ContextType>;
  signDisplay?: Resolver<ResolversTypes['CurrencySignDisplay'], ParentType, ContextType>;
  trailingZeroDisplay?: Resolver<ResolversTypes['CurrencyTrailingZeroDisplay'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreDefaultsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreDefaults'] = ResolversParentTypes['StoreDefaults']> = ResolversObject<{
  defaultDimensionUnit?: Resolver<ResolversTypes['DimensionUnit'], ParentType, ContextType>;
  defaultWeightUnit?: Resolver<ResolversTypes['WeightUnit'], ParentType, ContextType>;
  timezone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  unitSystem?: Resolver<ResolversTypes['UnitSystem'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreDeletePayload'] = ResolversParentTypes['StoreDeletePayload']> = ResolversObject<{
  deletedStoreId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreMutation'] = ResolversParentTypes['StoreMutation']> = ResolversObject<{
  apiKeyCreate?: Resolver<ResolversTypes['ApiKeyCreatePayload'], ParentType, ContextType, RequireFields<StoreMutationApiKeyCreateArgs, 'input'>>;
  apiKeyDelete?: Resolver<ResolversTypes['ApiKeyDeletePayload'], ParentType, ContextType, RequireFields<StoreMutationApiKeyDeleteArgs, 'input'>>;
  apiKeyRevoke?: Resolver<ResolversTypes['ApiKeyActionPayload'], ParentType, ContextType, RequireFields<StoreMutationApiKeyRevokeArgs, 'input'>>;
  localeCreate?: Resolver<ResolversTypes['LocaleCreatePayload'], ParentType, ContextType, RequireFields<StoreMutationLocaleCreateArgs, 'input'>>;
  localeDelete?: Resolver<ResolversTypes['LocaleDeletePayload'], ParentType, ContextType, RequireFields<StoreMutationLocaleDeleteArgs, 'input'>>;
  localeSetDefault?: Resolver<ResolversTypes['LocaleUpdatePayload'], ParentType, ContextType, RequireFields<StoreMutationLocaleSetDefaultArgs, 'input'>>;
  storeCreate?: Resolver<ResolversTypes['StoreCreatePayload'], ParentType, ContextType, RequireFields<StoreMutationStoreCreateArgs, 'input'>>;
  storeDelete?: Resolver<ResolversTypes['StoreDeletePayload'], ParentType, ContextType, RequireFields<StoreMutationStoreDeleteArgs, 'input'>>;
  storeUpdate?: Resolver<ResolversTypes['StoreUpdatePayload'], ParentType, ContextType, RequireFields<StoreMutationStoreUpdateArgs, 'clientMutationId' | 'expectedRevision' | 'storeId'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreOrderProcessingResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreOrderProcessing'] = ResolversParentTypes['StoreOrderProcessing']> = ResolversObject<{
  automaticFulfillmentMode?: Resolver<ResolversTypes['AutomaticFulfillmentMode'], ParentType, ContextType>;
  automaticallyArchiveOrders?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  orderNumberPrefix?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  orderNumberSuffix?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requireCheckoutConfirmation?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreQuery'] = ResolversParentTypes['StoreQuery']> = ResolversObject<{
  apiKeys?: Resolver<Array<ResolversTypes['ApiKey']>, ParentType, ContextType>;
  currentStore?: Resolver<Maybe<ResolversTypes['Store']>, ParentType, ContextType>;
  stores?: Resolver<Array<ResolversTypes['Store']>, ParentType, ContextType, RequireFields<StoreQueryStoresArgs, 'organizationId'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreSocialLinkResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreSocialLink'] = ResolversParentTypes['StoreSocialLink']> = ResolversObject<{
  platform?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreUpdateOperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreUpdateOperationResult'] = ResolversParentTypes['StoreUpdateOperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['StoreUpdateOperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StoreUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['StoreUpdatePayload'] = ResolversParentTypes['StoreUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['StoreUpdateOperationResult']>, ParentType, ContextType>;
  store?: Resolver<Maybe<ResolversTypes['Store']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface TimestampScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Timestamp'], any> {
  name: 'Timestamp';
}

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type WeightUnitResolvers = EnumResolverSignature<{ g?: any, kg?: any, lb?: any, oz?: any }, ResolversTypes['WeightUnit']>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  ApiKey?: ApiKeyResolvers<ContextType>;
  ApiKeyActionPayload?: ApiKeyActionPayloadResolvers<ContextType>;
  ApiKeyCreatePayload?: ApiKeyCreatePayloadResolvers<ContextType>;
  ApiKeyDeletePayload?: ApiKeyDeletePayloadResolvers<ContextType>;
  CurrencyCode?: CurrencyCodeResolvers;
  DateTime?: GraphQLScalarType;
  DimensionUnit?: DimensionUnitResolvers;
  Email?: GraphQLScalarType;
  File?: FileResolvers<ContextType>;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  Locale?: LocaleResolvers<ContextType>;
  LocaleCode?: LocaleCodeResolvers;
  LocaleCreatePayload?: LocaleCreatePayloadResolvers<ContextType>;
  LocaleDeletePayload?: LocaleDeletePayloadResolvers<ContextType>;
  LocaleUpdatePayload?: LocaleUpdatePayloadResolvers<ContextType>;
  Membership?: MembershipResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Store?: StoreResolvers<ContextType>;
  StoreAddress?: StoreAddressResolvers<ContextType>;
  StoreBrand?: StoreBrandResolvers<ContextType>;
  StoreContactDetails?: StoreContactDetailsResolvers<ContextType>;
  StoreCreatePayload?: StoreCreatePayloadResolvers<ContextType>;
  StoreCurrencySettings?: StoreCurrencySettingsResolvers<ContextType>;
  StoreDefaults?: StoreDefaultsResolvers<ContextType>;
  StoreDeletePayload?: StoreDeletePayloadResolvers<ContextType>;
  StoreMutation?: StoreMutationResolvers<ContextType>;
  StoreOrderProcessing?: StoreOrderProcessingResolvers<ContextType>;
  StoreQuery?: StoreQueryResolvers<ContextType>;
  StoreSocialLink?: StoreSocialLinkResolvers<ContextType>;
  StoreUpdateOperationResult?: StoreUpdateOperationResultResolvers<ContextType>;
  StoreUpdatePayload?: StoreUpdatePayloadResolvers<ContextType>;
  Timestamp?: GraphQLScalarType;
  UserError?: UserErrorResolvers<ContextType>;
  WeightUnit?: WeightUnitResolvers;
}>;


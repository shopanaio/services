export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null;
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
  BigInt: { input: number; output: number; }
  /** Calendar date in ISO 8601 YYYY-MM-DD form. */
  Date: { input: any; output: any; }
  /** ISO 8601 date-time string */
  DateTime: { input: string; output: string; }
  /** Valid email address */
  Email: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  /** Unix timestamp in milliseconds */
  Timestamp: { input: string; output: string; }
  TransportOptions: { input: unknown; output: unknown; }
  Upload: { input: File; output: File; }
  join__FieldSet: { input: any; output: any; }
  link__Import: { input: any; output: any; }
};

/**
 * Action level for permissions.
 * Hierarchy: read < write < admin
 * - admin includes write and read
 * - write includes read
 */
export enum Action {
  Admin = 'admin',
  Read = 'read',
  Write = 'write'
}

/** API key for programmatic access to the project */
export type ApiApiKey = {
  __typename?: 'ApiKey';
  /** Timestamp when the API key was created */
  createdAt: Scalars['DateTime']['output'];
  /** ID of the user who created this API key */
  createdById: Scalars['ID']['output'];
  /** Optional expiration date for the API key */
  dueDate?: Maybe<Scalars['DateTime']['output']>;
  /** Unique identifier of the API key */
  id: Scalars['ID']['output'];
  /** Whether the API key has been banned by the system */
  isBanned: Scalars['Boolean']['output'];
  /** The API key value (only shown once upon creation) */
  key: Scalars['String']['output'];
  /** Timestamp of the last API call using this key */
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Human-readable name for the API key */
  name: Scalars['String']['output'];
  /** Timestamp when the API key was revoked, null if still active */
  revokedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** Payload returned after an API key action (revoke) */
export type ApiApiKeyActionPayload = {
  __typename?: 'ApiKeyActionPayload';
  /** Whether the action was successful */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during the action */
  userErrors: Array<ApiUserError>;
};

/** Input for creating a new API key */
export type ApiApiKeyCreateInput = {
  /** Optional expiration date for the API key */
  dueDate?: InputMaybe<Scalars['DateTime']['input']>;
  /** Human-readable name for the API key */
  name: Scalars['String']['input'];
};

/** Payload returned after creating an API key */
export type ApiApiKeyCreatePayload = {
  __typename?: 'ApiKeyCreatePayload';
  /** The newly created API key, null if creation failed */
  apiKey?: Maybe<ApiApiKey>;
  /** List of errors that occurred during creation */
  userErrors: Array<ApiUserError>;
};

/** Input for deleting an API key */
export type ApiApiKeyDeleteInput = {
  /** ID of the API key to delete */
  id: Scalars['ID']['input'];
};

/** Payload returned after deleting an API key */
export type ApiApiKeyDeletePayload = {
  __typename?: 'ApiKeyDeletePayload';
  /** ID of the deleted API key, null if deletion failed */
  deletedApiKeyId?: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during deletion */
  userErrors: Array<ApiUserError>;
};

/** Input for revoking an API key */
export type ApiApiKeyRevokeInput = {
  /** ID of the API key to revoke */
  id: Scalars['ID']['input'];
};

export type ApiApp = {
  __typename?: 'App';
  code: Scalars['String']['output'];
  meta?: Maybe<Scalars['JSON']['output']>;
  name: Scalars['String']['output'];
};

export type ApiAppsMutation = {
  __typename?: 'AppsMutation';
  /** Install app */
  install: Scalars['Boolean']['output'];
  /** Uninstall app */
  uninstall: Scalars['Boolean']['output'];
};


export type ApiAppsMutationInstallArgs = {
  code: Scalars['String']['input'];
};


export type ApiAppsMutationUninstallArgs = {
  code: Scalars['String']['input'];
};

export type ApiAppsQuery = {
  __typename?: 'AppsQuery';
  /** Get list of available apps for installation */
  apps: Array<ApiApp>;
  /** Get list of installed apps */
  installedApps: Array<ApiInstalledApp>;
};

export type ApiAuthMutation = {
  __typename?: 'AuthMutation';
  signIn: ApiUserSignInPayload;
  signOut: ApiUserSignOutPayload;
  signUp: ApiUserSignUpPayload;
  tokenRefresh: ApiUserTokenRefreshPayload;
};


export type ApiAuthMutationSignInArgs = {
  input: ApiUserSignInInput;
};


export type ApiAuthMutationSignOutArgs = {
  input: ApiUserSignOutInput;
};


export type ApiAuthMutationSignUpArgs = {
  input: ApiUserSignUpInput;
};


export type ApiAuthMutationTokenRefreshArgs = {
  input: ApiUserTokenRefreshInput;
};

/** Authentication tokens. */
export type ApiAuthTokenPayload = {
  __typename?: 'AuthTokenPayload';
  /** Access token for API requests. */
  accessToken: Scalars['String']['output'];
  /** Expiration time in seconds. */
  expiresIn: Scalars['Int']['output'];
  /** Refresh token for obtaining new access tokens. */
  refreshToken: Scalars['String']['output'];
};

/** Input for authorize check. */
export type ApiAuthorizeInput = {
  /** Action to check. */
  action: Scalars['String']['input'];
  /** Domain ("org" for organization, or "store:{uuid}"). */
  domain: Scalars['String']['input'];
  /** Organization ID. */
  organizationId: Scalars['ID']['input'];
  /** Resource to check. */
  resource: Scalars['String']['input'];
};

export type ApiAuthorizePayload = {
  __typename?: 'AuthorizePayload';
  /** Whether access is allowed. */
  allowed: Scalars['Boolean']['output'];
  /** Reason for denial (if denied). */
  deniedReason?: Maybe<Scalars['String']['output']>;
};

/** Input for uploading avatar or logo. */
export type ApiAvatarUploadInput = {
  /** The file to upload. */
  file: Scalars['Upload']['input'];
  /**
   * Owner ID (User or Organization global ID).
   * The asset group will be resolved by this ID.
   */
  ownerId: Scalars['ID']['input'];
};

/** Payload for avatar/logo upload. */
export type ApiAvatarUploadPayload = {
  __typename?: 'AvatarUploadPayload';
  /** The uploaded file. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

export type ApiBigIntFilter = {
  _between?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  _eq?: InputMaybe<Scalars['BigInt']['input']>;
  _gt?: InputMaybe<Scalars['BigInt']['input']>;
  _gte?: InputMaybe<Scalars['BigInt']['input']>;
  _in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['BigInt']['input']>;
  _lte?: InputMaybe<Scalars['BigInt']['input']>;
  _neq?: InputMaybe<Scalars['BigInt']['input']>;
  _notIn?: InputMaybe<Array<Scalars['BigInt']['input']>>;
};

/** Filter operators for Boolean fields */
export type ApiBooleanFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A bucket represents an S3 storage bucket for a project. */
export type ApiBucket = {
  __typename?: 'Bucket';
  /** S3 bucket name. */
  bucketName: Scalars['String']['output'];
  /** The date and time when the bucket was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Custom endpoint URL (for S3-compatible storage). */
  endpointUrl?: Maybe<Scalars['String']['output']>;
  /** The globally unique ID of the bucket. */
  id: Scalars['ID']['output'];
  /** Priority for bucket selection. */
  priority: Scalars['Int']['output'];
  /** AWS region. */
  region: Scalars['String']['output'];
  /** Bucket status (active, archived, etc). */
  status: Scalars['String']['output'];
  /** The date and time when the bucket was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** Input for creating a bucket. */
export type ApiBucketCreateInput = {
  /** S3 bucket name (must be unique). */
  bucketName: Scalars['String']['input'];
  /** Custom endpoint URL (for S3-compatible storage). */
  endpointUrl?: InputMaybe<Scalars['String']['input']>;
  /** Priority for bucket selection (default: 0). */
  priority?: InputMaybe<Scalars['Int']['input']>;
  /** AWS region (default: us-east-1). */
  region?: InputMaybe<Scalars['String']['input']>;
  /** Bucket status (default: active). */
  status?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for bucket creation. */
export type ApiBucketCreatePayload = {
  __typename?: 'BucketCreatePayload';
  /** The created bucket. */
  bucket?: Maybe<ApiBucket>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

export enum BulkUpdateCancelReason {
  Superseded = 'SUPERSEDED',
  System = 'SYSTEM',
  User = 'USER'
}

/** Single operation in bulk update job. */
export type ApiBulkUpdateItem = {
  __typename?: 'BulkUpdateItem';
  /** Cancel reason (only for CANCELLED/SUPERSEDED). */
  cancelReason?: Maybe<BulkUpdateCancelReason>;
  /** Execution errors. */
  errors: Array<ApiBulkUpdateUserError>;
  /** When finished. */
  finishedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Item ID. */
  id: Scalars['ID']['output'];
  /** Order within product. */
  opIndex: Scalars['Int']['output'];
  /** Operation type. */
  opType: BulkUpdateOpType;
  /** Product ID. */
  productId: Scalars['ID']['output'];
  /** When started. */
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Current status. */
  status: BulkUpdateItemStatus;
  /** Job that superseded this item. */
  supersededByJobId?: Maybe<Scalars['ID']['output']>;
  /** Variant ID (null for product-level operations). */
  variantId?: Maybe<Scalars['ID']['output']>;
};

export type ApiBulkUpdateItemConnection = {
  __typename?: 'BulkUpdateItemConnection';
  edges: Array<ApiBulkUpdateItemEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiBulkUpdateItemEdge = {
  __typename?: 'BulkUpdateItemEdge';
  cursor: Scalars['String']['output'];
  node: ApiBulkUpdateItem;
};

export enum BulkUpdateItemStatus {
  Cancelled = 'CANCELLED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Running = 'RUNNING',
  Succeeded = 'SUCCEEDED',
  Superseded = 'SUPERSEDED'
}

/** Job progress. All counters computed from items. */
export type ApiBulkUpdateJobProgress = {
  __typename?: 'BulkUpdateJobProgress';
  /** Cancelled. */
  cancelled: Scalars['Int']['output'];
  /** Done (succeeded + failed + cancelled + superseded). */
  done: Scalars['Int']['output'];
  /** Failed. */
  failed: Scalars['Int']['output'];
  /** Pending execution. */
  pending: Scalars['Int']['output'];
  /** Currently running. */
  running: Scalars['Int']['output'];
  /** Successfully applied. */
  succeeded: Scalars['Int']['output'];
  /** Superseded by another job. */
  superseded: Scalars['Int']['output'];
  /** Total operations. */
  total: Scalars['Int']['output'];
};

export enum BulkUpdateJobStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Queued = 'QUEUED',
  Running = 'RUNNING'
}

export enum BulkUpdateOpType {
  ProductCategoryUpdate = 'PRODUCT_CATEGORY_UPDATE',
  ProductTagUpdate = 'PRODUCT_TAG_UPDATE',
  ProductUpdate = 'PRODUCT_UPDATE',
  VariantCreate = 'VARIANT_CREATE',
  VariantDelete = 'VARIANT_DELETE',
  VariantUpdate = 'VARIANT_UPDATE'
}

/** Bulk update error with operation context. */
export type ApiBulkUpdateUserError = ApiUserError & {
  __typename?: 'BulkUpdateUserError';
  /** Error code. */
  code?: Maybe<Scalars['String']['output']>;
  /** Input field path. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** Error message. */
  message: Scalars['String']['output'];
  /** Operation that failed. */
  operation?: Maybe<Scalars['String']['output']>;
  /** Product ID. */
  productId?: Maybe<Scalars['ID']['output']>;
  /** Variant ID. */
  variantId?: Maybe<Scalars['ID']['output']>;
};

export type ApiBundle = ApiListing & ApiNode & {
  __typename?: 'Bundle';
  /** Category assignments with relationship metadata. */
  categoryAssignments: Array<ApiProductCategoryAssignment>;
  /** All bundle configurations for this bundle. */
  configurations: Array<ApiBundleConfiguration>;
  /** The date and time when the bundle was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the bundle was deleted (soft delete). */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Bundle description. */
  description?: Maybe<ApiRichText>;
  /** Configurator display style. */
  displayStyle: BundleDisplayStyle;
  /** Short excerpt. */
  excerpt?: Maybe<ApiRichText>;
  /** The features of this bundle. */
  features: Array<ApiProductFeature>;
  /** The URL-friendly handle for the bundle. */
  handle: Scalars['String']['output'];
  /** The Product global ID of the bundle sellable item. */
  id: Scalars['ID']['output'];
  /** Whether the bundle is currently published. */
  isPublished: Scalars['Boolean']['output'];
  /** Product discriminator. Always BUNDLE for this type. */
  kind: ProductKind;
  /** Media registered on this bundle. */
  media: Array<ApiProductMediaItem>;
  /** The options available for this bundle. */
  options: Array<ApiProductOption>;
  /** Current bundle price range in the selected currency. */
  priceRange?: Maybe<ApiProductPriceRange>;
  /** The primary category assigned to this bundle. */
  primaryCategory?: Maybe<ApiCategory>;
  /** The date and time when the bundle was published, or null if unpublished. */
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Optimistic locking revision number. Incremented on each update. */
  revision: Scalars['Int']['output'];
  /** SEO and Open Graph metadata. */
  seo?: Maybe<ApiProductSeo>;
  /** The tags associated with this bundle. */
  tags: Array<ApiTag>;
  /** Bundle title. */
  title: Scalars['String']['output'];
  /** High-level bundle type. */
  type?: Maybe<BundleType>;
  /** The date and time when the bundle was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** The variants of this bundle. */
  variants: ApiVariantConnection;
  /** The total number of variants for this bundle. */
  variantsCount: Scalars['Int']['output'];
  /** The vendor associated with this bundle. */
  vendor?: Maybe<ApiVendor>;
};


export type ApiBundleVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiBundleBasePriceRule = ApiBundlePriceRule & ApiNode & {
  __typename?: 'BundleBasePriceRule';
  /** The globally unique ID of the price rule. */
  id: Scalars['ID']['output'];
  /** Pricing strategy. */
  priceType: BundlePriceType;
};

export type ApiBundleBundlesMetaInput = {
  categoriesScope?: InputMaybe<ApiProductCategoriesScopeInput>;
};

export type ApiBundleCondition = ApiNode & {
  __typename?: 'BundleCondition';
  /** Condition category. */
  category: BundleConditionCategory;
  /** The globally unique ID of the condition. */
  id: Scalars['ID']['output'];
  /** Condition operator. */
  operator: BundleConditionOperator;
  /** Sort order within the condition group. */
  sortIndex: Scalars['Int']['output'];
  /** Condition subject. */
  subject: BundleConditionSubject;
  /** Target ID. Points to an item, group, or the parent bundle product. */
  targetId: Scalars['ID']['output'];
  /** Target type. */
  targetType: BundleDependencyTargetType;
  /** Numeric value for numeric conditions. */
  value?: Maybe<Scalars['Int']['output']>;
};

export enum BundleConditionCategory {
  Numeric = 'NUMERIC',
  StateCheck = 'STATE_CHECK'
}

export type ApiBundleConditionGroup = ApiNode & {
  __typename?: 'BundleConditionGroup';
  /** Conditions in this group. */
  conditions: Array<ApiBundleCondition>;
  /** The globally unique ID of the condition group. */
  id: Scalars['ID']['output'];
  /** How conditions are combined. */
  logicOperator: BundleLogicOperator;
  /** Sort order within the rule. */
  sortIndex: Scalars['Int']['output'];
};

export type ApiBundleConditionGroupSyncItemInput = {
  /** Complete list of conditions. */
  conditions: Array<ApiBundleConditionSyncItemInput>;
  /** Existing condition group ID. Null creates a new group. */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** How conditions are combined. */
  logicOperator: BundleLogicOperator;
  /** Sort order within the rule. */
  sortIndex: Scalars['Int']['input'];
};

export enum BundleConditionOperator {
  Eq = 'EQ',
  Gte = 'GTE',
  IsNotSelected = 'IS_NOT_SELECTED',
  IsSelected = 'IS_SELECTED',
  Lte = 'LTE'
}

export enum BundleConditionSubject {
  GroupTotalQty = 'GROUP_TOTAL_QTY',
  ItemQty = 'ITEM_QTY',
  ItemSelected = 'ITEM_SELECTED'
}

export type ApiBundleConditionSyncItemInput = {
  /** Condition category. */
  category: BundleConditionCategory;
  /** Existing condition ID. Null creates a new condition. */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Condition operator. */
  operator: BundleConditionOperator;
  /** Sort order within the condition group. */
  sortIndex: Scalars['Int']['input'];
  /** Condition subject. */
  subject: BundleConditionSubject;
  /** Target ID. Points to an item, group, or the parent bundle product. */
  targetId: Scalars['ID']['input'];
  /** Target type. */
  targetType: BundleDependencyTargetType;
  /** Numeric value for numeric conditions. */
  value?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiBundleConfiguration = ApiNode & {
  __typename?: 'BundleConfiguration';
  /** The bundle root this configuration belongs to. */
  bundle: ApiBundle;
  /** The Product global ID of the bundle this configuration belongs to. */
  bundleId: Scalars['ID']['output'];
  /** The date and time when the configuration was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Dependency rules in priority order. */
  dependencyRules: Array<ApiBundleDependencyRule>;
  /** Groups in configurator order. */
  groups: Array<ApiBundleGroup>;
  /** The globally unique ID of the configuration. */
  id: Scalars['ID']['output'];
  /** Configuration name. */
  name: Scalars['String']['output'];
  /** Reusable pricing templates. */
  pricingTemplates: Array<ApiBundlePricingTemplate>;
  /** The date and time when the configuration was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Variants that use this configuration. */
  variants: Array<ApiVariant>;
};

export type ApiBundleConfigurationCreateInput = {
  /** Product global ID of the bundle. */
  bundleId: Scalars['ID']['input'];
  /** Expected parent bundle product revision. Required for optimistic locking. */
  expectedRevision: Scalars['Int']['input'];
  /** Configuration name. */
  name: Scalars['String']['input'];
};

export type ApiBundleConfigurationDeleteInput = {
  expectedRevision: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
};

export type ApiBundleConfigurationDeletePayload = {
  __typename?: 'BundleConfigurationDeletePayload';
  bundle?: Maybe<ApiBundle>;
  deletedConfigurationId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiBundleConfigurationPayload = {
  __typename?: 'BundleConfigurationPayload';
  configuration?: Maybe<ApiBundleConfiguration>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiBundleConfigurationUpdateInput = {
  expectedRevision: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

/** A connection to a list of Bundle items. */
export type ApiBundleConnection = {
  __typename?: 'BundleConnection';
  /** A list of edges. */
  edges: Array<ApiBundleEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of bundles. */
  totalCount: Scalars['Int']['output'];
};

export type ApiBundleCreateInput = {
  /** Bundle description. */
  description?: InputMaybe<ApiRichTextInput>;
  /** Configurator display style. */
  displayStyle?: InputMaybe<BundleDisplayStyle>;
  /** Short excerpt in multiple formats. */
  excerpt?: InputMaybe<ApiRichTextInput>;
  /** URL-friendly handle for the bundle. */
  handle: Scalars['String']['input'];
  /** Inventory tracking settings for the bundle. */
  inventoryItem?: InputMaybe<ApiInventoryItemInput>;
  /** File IDs for bundle media (already uploaded via mediaMutation.fileUpload). */
  mediaFileIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Bundle options. */
  options?: InputMaybe<Array<ApiProductCreateOptionInput>>;
  /** Bundle title. */
  title: Scalars['String']['input'];
  /** High-level bundle type. */
  type?: InputMaybe<BundleType>;
  /** Bundle variants to create. */
  variants?: InputMaybe<Array<ApiProductCreateVariantInput>>;
  /** Vendor ID to associate with the bundle. */
  vendorId?: InputMaybe<Scalars['ID']['input']>;
};

export type ApiBundleCreatePayload = {
  __typename?: 'BundleCreatePayload';
  bundle?: Maybe<ApiBundle>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiBundleDependencyAction = ApiNode & {
  __typename?: 'BundleDependencyAction';
  /** Action type. */
  actionType: BundleDependencyActionType;
  /** The globally unique ID of the action. */
  id: Scalars['ID']['output'];
  /** Price rule for ADJUST_PRICE. */
  priceRule?: Maybe<ApiBundlePriceRule>;
  /** Required value for SET_REQUIRED. */
  requiredValue?: Maybe<Scalars['Boolean']['output']>;
  /** Sort order within the rule. */
  sortIndex: Scalars['Int']['output'];
  /** Whether this action can stack with other matching actions. */
  stackable: Scalars['Boolean']['output'];
  /** Target ID. Null is allowed when targetType is BUNDLE. */
  targetId?: Maybe<Scalars['ID']['output']>;
  /** Target type. */
  targetType: BundleDependencyTargetType;
};

export type ApiBundleDependencyActionSyncItemInput = {
  /** Action type. */
  actionType: BundleDependencyActionType;
  /** Existing action ID. Null creates a new action. */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Price rule for ADJUST_PRICE. */
  priceRule?: InputMaybe<ApiBundlePriceRuleInput>;
  /** Required value for SET_REQUIRED. */
  requiredValue?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort order within the rule. */
  sortIndex: Scalars['Int']['input'];
  /** Whether this action can stack with other matching actions. */
  stackable: Scalars['Boolean']['input'];
  /** Target ID. Null is allowed when targetType is BUNDLE. */
  targetId?: InputMaybe<Scalars['ID']['input']>;
  /** Target type. */
  targetType: BundleDependencyTargetType;
};

export enum BundleDependencyActionType {
  AdjustPrice = 'ADJUST_PRICE',
  Hide = 'HIDE',
  SetRequired = 'SET_REQUIRED',
  Show = 'SHOW'
}

export type ApiBundleDependencyRule = ApiNode & {
  __typename?: 'BundleDependencyRule';
  /** Actions applied when conditions match. */
  actions: Array<ApiBundleDependencyAction>;
  /** Condition groups. */
  conditionGroups: Array<ApiBundleConditionGroup>;
  /** The date and time when the rule was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Whether the rule is enabled. */
  enabled: Scalars['Boolean']['output'];
  /** The globally unique ID of the dependency rule. */
  id: Scalars['ID']['output'];
  /** How condition groups are combined. */
  logicOperator: BundleLogicOperator;
  /** Rule name. */
  name: Scalars['String']['output'];
  /** Rule priority. Lower values are evaluated first. */
  priority: Scalars['Int']['output'];
  /** The date and time when the rule was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiBundleDependencyRuleSyncItemInput = {
  /** Complete list of actions. */
  actions: Array<ApiBundleDependencyActionSyncItemInput>;
  /** Complete list of condition groups. */
  conditionGroups: Array<ApiBundleConditionGroupSyncItemInput>;
  /** Whether the rule is enabled. */
  enabled: Scalars['Boolean']['input'];
  /**
   * Existing dependency rule ID. Null creates a new rule.
   * Existing rules in this configuration but missing from
   * BundleDependencyRulesSyncInput.dependencyRules are deleted.
   */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** How condition groups are combined. */
  logicOperator: BundleLogicOperator;
  /** Rule name. */
  name: Scalars['String']['input'];
  /** Rule priority. */
  priority: Scalars['Int']['input'];
};

export type ApiBundleDependencyRulesSyncInput = {
  configurationId: Scalars['ID']['input'];
  /**
   * Complete list of dependency rules for this configuration.
   * Rules not present in this list are deleted.
   */
  dependencyRules: Array<ApiBundleDependencyRuleSyncItemInput>;
  expectedRevision: Scalars['Int']['input'];
};

export type ApiBundleDependencyRulesSyncPayload = {
  __typename?: 'BundleDependencyRulesSyncPayload';
  configuration?: Maybe<ApiBundleConfiguration>;
  dependencyRules: Array<ApiBundleDependencyRule>;
  userErrors: Array<ApiGenericUserError>;
};

export enum BundleDependencyTargetType {
  Bundle = 'BUNDLE',
  Group = 'GROUP',
  Item = 'ITEM'
}

export type ApiBundleDiscountFixedPriceRule = ApiBundlePriceRule & ApiNode & {
  __typename?: 'BundleDiscountFixedPriceRule';
  /** Money values for DISCOUNT_FIXED rules. */
  amounts: Array<ApiBundlePriceRuleAmount>;
  /** The globally unique ID of the price rule. */
  id: Scalars['ID']['output'];
  /** Pricing strategy. */
  priceType: BundlePriceType;
};

export type ApiBundleDiscountPercentPriceRule = ApiBundlePriceRule & ApiNode & {
  __typename?: 'BundleDiscountPercentPriceRule';
  /** The globally unique ID of the price rule. */
  id: Scalars['ID']['output'];
  /** Percent row for DISCOUNT_PERCENT rules. */
  percent: ApiBundlePriceRulePercent;
  /** Pricing strategy. */
  priceType: BundlePriceType;
};

export enum BundleDisplayStyle {
  Accordion = 'ACCORDION',
  Flat = 'FLAT',
  Tabs = 'TABS',
  Wizard = 'WIZARD'
}

/** An edge in a Bundle connection. */
export type ApiBundleEdge = {
  __typename?: 'BundleEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiBundle;
};

export type ApiBundleFixedPriceRule = ApiBundlePriceRule & ApiNode & {
  __typename?: 'BundleFixedPriceRule';
  /** Money values for FIXED rules. */
  amounts: Array<ApiBundlePriceRuleAmount>;
  /** The globally unique ID of the price rule. */
  id: Scalars['ID']['output'];
  /** Pricing strategy. */
  priceType: BundlePriceType;
};

export type ApiBundleFreePriceRule = ApiBundlePriceRule & ApiNode & {
  __typename?: 'BundleFreePriceRule';
  /** The globally unique ID of the price rule. */
  id: Scalars['ID']['output'];
  /** Pricing strategy. */
  priceType: BundlePriceType;
};

export type ApiBundleGroup = ApiNode & {
  __typename?: 'BundleGroup';
  /** The date and time when the group was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The globally unique ID of the group. */
  id: Scalars['ID']['output'];
  /** Items in group order. */
  items: Array<ApiBundleItem>;
  /** Maximum selected items in this group. Null means no maximum. */
  maxSelection?: Maybe<Scalars['Int']['output']>;
  /** Minimum selected items in this group. Null means no minimum. */
  minSelection?: Maybe<Scalars['Int']['output']>;
  /** Sort order within the configuration. */
  sortIndex: Scalars['Int']['output'];
  /** Display title from current locale. */
  title: Scalars['String']['output'];
  /** The date and time when the group was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiBundleGroupSyncItemInput = {
  /**
   * Existing group ID. Null creates a new group.
   * Existing groups in this configuration but missing from BundleGroupsSyncInput.groups are deleted.
   */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Complete list of items inside this group. */
  items: Array<ApiBundleItemSyncItemInput>;
  maxSelection?: InputMaybe<Scalars['Int']['input']>;
  minSelection?: InputMaybe<Scalars['Int']['input']>;
  /** Sort order within the configuration. */
  sortIndex: Scalars['Int']['input'];
  /** Localized title for current locale. */
  title: Scalars['String']['input'];
};

export type ApiBundleGroupsSyncInput = {
  configurationId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  /**
   * Complete list of groups for this configuration.
   * Groups not present in this list are deleted.
   */
  groups: Array<ApiBundleGroupSyncItemInput>;
};

export type ApiBundleGroupsSyncPayload = {
  __typename?: 'BundleGroupsSyncPayload';
  configuration?: Maybe<ApiBundleConfiguration>;
  groups: Array<ApiBundleGroup>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiBundleItem = ApiNode & {
  __typename?: 'BundleItem';
  /** The date and time when the item was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Default quantity. */
  defaultQty?: Maybe<Scalars['Int']['output']>;
  /** Featured image override. */
  featuredImage?: Maybe<ApiFile>;
  /** The group this item belongs to. */
  group: ApiBundleGroup;
  /** The group ID. */
  groupId: Scalars['ID']['output'];
  /** The globally unique ID of the item. */
  id: Scalars['ID']['output'];
  /** Whether the item references a product or a concrete variant. */
  itemType: BundleItemType;
  /** Maximum selectable quantity. Null means unlimited. */
  maxQty?: Maybe<Scalars['Int']['output']>;
  /** Minimum selectable quantity. */
  minQty?: Maybe<Scalars['Int']['output']>;
  /** Allowed option/value selections for PRODUCT items. */
  optionSelections: Array<ApiBundleItemOptionSelection>;
  /** Inline price rule. Null when pricingTemplate is used. */
  priceRule?: Maybe<ApiBundlePriceRule>;
  /** Reusable pricing template. Null when inline priceRule is used. */
  pricingTemplate?: Maybe<ApiBundlePricingTemplate>;
  /** Referenced product for PRODUCT items. */
  refProduct?: Maybe<ApiProduct>;
  /** Referenced product ID for PRODUCT items. */
  refProductId?: Maybe<Scalars['ID']['output']>;
  /** Referenced variant for VARIANT items. */
  refVariant?: Maybe<ApiVariant>;
  /** Referenced variant ID for VARIANT items. */
  refVariantId?: Maybe<Scalars['ID']['output']>;
  /** Whether item is selected by default. */
  selected: Scalars['Boolean']['output'];
  /** Sort order within the group. */
  sortIndex: Scalars['Int']['output'];
  /** Optional display title override from current locale. */
  title?: Maybe<Scalars['String']['output']>;
  /** The date and time when the item was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Whether item is visible in the configurator. */
  visible: Scalars['Boolean']['output'];
};

export type ApiBundleItemOptionSelection = ApiNode & {
  __typename?: 'BundleItemOptionSelection';
  /** The globally unique ID of the option selection. */
  id: Scalars['ID']['output'];
  /** Referenced product option. */
  option: ApiProductOption;
  /** Referenced product option ID. */
  optionId: Scalars['ID']['output'];
  /** Parent option for dependent option trees. */
  parentOption?: Maybe<ApiProductOption>;
  /** Parent option ID. */
  parentOptionId?: Maybe<Scalars['ID']['output']>;
  /** Sort order within item option selections. */
  sortIndex: Scalars['Int']['output'];
  /** Allowed values for this option. */
  values: Array<ApiBundleItemOptionValueSelection>;
};

export type ApiBundleItemOptionSelectionSyncItemInput = {
  /** Existing option selection ID. Null creates a new option selection. */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Referenced product option ID. */
  optionId: Scalars['ID']['input'];
  /** Parent option ID for dependent option trees. */
  parentOptionId?: InputMaybe<Scalars['ID']['input']>;
  /** Sort order within option selections. */
  sortIndex: Scalars['Int']['input'];
  /** Complete list of option value selections. */
  values: Array<ApiBundleItemOptionValueSelectionSyncItemInput>;
};

export type ApiBundleItemOptionValueSelection = ApiNode & {
  __typename?: 'BundleItemOptionValueSelection';
  /** The globally unique ID of the option value selection. */
  id: Scalars['ID']['output'];
  /** Referenced product option value. Null when the value is unavailable. */
  optionValue?: Maybe<ApiProductOptionValue>;
  /** Referenced product option value ID. */
  optionValueId?: Maybe<Scalars['ID']['output']>;
  /** Sort order within option values. */
  sortIndex: Scalars['Int']['output'];
  /** Selection status. */
  status: BundleItemOptionValueSelectionStatus;
  /** Stable value copy for displaying stale/unavailable values. */
  value: Scalars['String']['output'];
};

export enum BundleItemOptionValueSelectionStatus {
  Deselected = 'DESELECTED',
  New = 'NEW',
  Selected = 'SELECTED',
  Unavailable = 'UNAVAILABLE'
}

export type ApiBundleItemOptionValueSelectionSyncItemInput = {
  /** Existing value selection ID. Null creates a new value selection. */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Referenced product option value ID. */
  optionValueId?: InputMaybe<Scalars['ID']['input']>;
  /** Sort order within option values. */
  sortIndex: Scalars['Int']['input'];
  /** Selection status. */
  status: BundleItemOptionValueSelectionStatus;
  /** Stable value copy for displaying stale/unavailable values. */
  value: Scalars['String']['input'];
};

export type ApiBundleItemSyncItemInput = {
  /** Default quantity. */
  defaultQty?: InputMaybe<Scalars['Int']['input']>;
  /** Featured image override. */
  featuredImageId?: InputMaybe<Scalars['ID']['input']>;
  /**
   * Existing item ID. Null creates a new item.
   * Existing items in this group but missing from BundleGroupSyncItemInput.items are deleted.
   */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Whether the item references a product or a concrete variant. */
  itemType: BundleItemType;
  /** Maximum selectable quantity. */
  maxQty?: InputMaybe<Scalars['Int']['input']>;
  /** Minimum selectable quantity. */
  minQty?: InputMaybe<Scalars['Int']['input']>;
  /** Allowed option/value selections for PRODUCT items. */
  optionSelections?: InputMaybe<Array<ApiBundleItemOptionSelectionSyncItemInput>>;
  /** Inline price rule. Cannot be used together with pricingTemplateId. */
  priceRule?: InputMaybe<ApiBundlePriceRuleInput>;
  /** Reusable pricing template ID. Cannot be used together with priceRule. */
  pricingTemplateId?: InputMaybe<Scalars['ID']['input']>;
  /** Referenced product ID for PRODUCT items. */
  refProductId?: InputMaybe<Scalars['ID']['input']>;
  /** Referenced variant ID for VARIANT items. */
  refVariantId?: InputMaybe<Scalars['ID']['input']>;
  /** Whether item is selected by default. */
  selected: Scalars['Boolean']['input'];
  /** Sort order within the group. */
  sortIndex: Scalars['Int']['input'];
  /** Optional localized title override for current locale. */
  title?: InputMaybe<Scalars['String']['input']>;
  /** Whether item is visible in the configurator. */
  visible: Scalars['Boolean']['input'];
};

export enum BundleItemType {
  Product = 'PRODUCT',
  Variant = 'VARIANT'
}

export enum BundleLogicOperator {
  And = 'AND',
  Or = 'OR'
}

/** Ordering configuration for Bundle */
export type ApiBundleOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: BundleOrderField;
};

/** Fields available for sorting Bundle */
export enum BundleOrderField {
  /** Sort by brandName */
  BrandName = 'brandName',
  /** Sort by bundleType */
  BundleType = 'bundleType',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by currency */
  Currency = 'currency',
  /** Sort by handle */
  Handle = 'handle',
  /** Sort by id */
  Id = 'id',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by maxAmountMinor */
  MaxAmountMinor = 'maxAmountMinor',
  /** Sort by maxPriceMinor */
  MaxPriceMinor = 'maxPriceMinor',
  /** Sort by minAmountMinor */
  MinAmountMinor = 'minAmountMinor',
  /** Sort by minPriceMinor */
  MinPriceMinor = 'minPriceMinor',
  /** Sort by name */
  Name = 'name',
  /** Sort by primaryCategoryId */
  PrimaryCategoryId = 'primaryCategoryId',
  /** Sort by primaryCategoryName */
  PrimaryCategoryName = 'primaryCategoryName',
  /** Sort by publishedAt */
  PublishedAt = 'publishedAt',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by vendorId */
  VendorId = 'vendorId'
}

export type ApiBundlePriceRule = {
  /** The globally unique ID of the price rule. */
  id: Scalars['ID']['output'];
  /** Pricing strategy. */
  priceType: BundlePriceType;
};

export type ApiBundlePriceRuleAmount = {
  __typename?: 'BundlePriceRuleAmount';
  /** Amount in minor units. */
  amountMinor: Scalars['BigInt']['output'];
  /** The currency code. */
  currency: CurrencyCode;
};

export type ApiBundlePriceRuleAmountInput = {
  /** Amount in minor units. */
  amountMinor: Scalars['BigInt']['input'];
  /** The currency code. */
  currency: CurrencyCode;
};

export type ApiBundlePriceRuleInput = {
  /** Money values for FIXED and DISCOUNT_FIXED rules. */
  amounts?: InputMaybe<Array<ApiBundlePriceRuleAmountInput>>;
  /** Existing price rule ID. Null creates a new price rule. */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Percent value for DISCOUNT_PERCENT rules. */
  percent?: InputMaybe<ApiBundlePriceRulePercentInput>;
  /** Pricing strategy. */
  priceType: BundlePriceType;
};

export type ApiBundlePriceRulePercent = {
  __typename?: 'BundlePriceRulePercent';
  /** Percent value, 0..100. */
  value: Scalars['Int']['output'];
};

export type ApiBundlePriceRulePercentInput = {
  /** Percent value, 0..100. */
  value: Scalars['Int']['input'];
};

export enum BundlePriceType {
  Base = 'BASE',
  DiscountFixed = 'DISCOUNT_FIXED',
  DiscountPercent = 'DISCOUNT_PERCENT',
  Fixed = 'FIXED',
  Free = 'FREE'
}

export type ApiBundlePricingTemplate = ApiNode & {
  __typename?: 'BundlePricingTemplate';
  /** The globally unique ID of the pricing template. */
  id: Scalars['ID']['output'];
  /** Template name. */
  name: Scalars['String']['output'];
  /** Reusable price rule. */
  priceRule: ApiBundlePriceRule;
  /** Sort order within configuration. */
  sortIndex: Scalars['Int']['output'];
};

export type ApiBundlePricingTemplateSyncItemInput = {
  /**
   * Existing pricing template ID. Null creates a new template.
   * Existing templates in this configuration but missing from
   * BundlePricingTemplatesSyncInput.pricingTemplates are deleted.
   */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Template name. */
  name: Scalars['String']['input'];
  /** Reusable price rule. */
  priceRule: ApiBundlePriceRuleInput;
  /** Sort order within configuration. */
  sortIndex: Scalars['Int']['input'];
};

export type ApiBundlePricingTemplatesSyncInput = {
  configurationId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  /**
   * Complete list of pricing templates for this configuration.
   * Templates not present in this list are deleted.
   */
  pricingTemplates: Array<ApiBundlePricingTemplateSyncItemInput>;
};

export type ApiBundlePricingTemplatesSyncPayload = {
  __typename?: 'BundlePricingTemplatesSyncPayload';
  configuration?: Maybe<ApiBundleConfiguration>;
  pricingTemplates: Array<ApiBundlePricingTemplate>;
  userErrors: Array<ApiGenericUserError>;
};

export enum BundleType {
  Custom = 'CUSTOM',
  Fixed = 'FIXED',
  MixAndMatch = 'MIX_AND_MATCH',
  Multipack = 'MULTIPACK'
}

export type ApiBundleUpdateInput = {
  /** Bundle category assignment operations. */
  categories?: InputMaybe<Array<ApiProductCategoryOperationInput>>;
  /** Bundle content (description, excerpt). */
  content?: InputMaybe<ApiProductContentInput>;
  /** Configurator display style. */
  displayStyle?: InputMaybe<BundleDisplayStyle>;
  /** The URL-friendly handle for the bundle. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** Bundle media. */
  media?: InputMaybe<ApiProductMediaInput>;
  /** SEO and Open Graph metadata. */
  seo?: InputMaybe<ApiProductSeoInput>;
  /** Bundle status: DRAFT or PUBLISHED. */
  status?: InputMaybe<ProductStatus>;
  /** Bundle tag assignment operations. */
  tags?: InputMaybe<Array<ApiProductTagOperationInput>>;
  /** Bundle title. */
  title?: InputMaybe<Scalars['String']['input']>;
  /** High-level bundle type. */
  type?: InputMaybe<BundleType>;
  /** Variant create, update, and delete operations. */
  variants?: InputMaybe<Array<ApiVariantOperationInput>>;
  /** Vendor ID to associate with the bundle. Pass null to clear. */
  vendorId?: InputMaybe<Scalars['ID']['input']>;
};

export type ApiBundleUpdatePayload = {
  __typename?: 'BundleUpdatePayload';
  bundle?: Maybe<ApiBundle>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for Bundle */
export type ApiBundleWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiBundleWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiBundleWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiBundleWhereInput>>;
  /** Filter by brandName */
  brandName?: InputMaybe<ApiStringFilter>;
  /** Filter by bundleType */
  bundleType?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by currency */
  currency?: InputMaybe<ApiStringFilter>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by maxAmountMinor */
  maxAmountMinor?: InputMaybe<ApiIntFilter>;
  /** Filter by maxPriceMinor */
  maxPriceMinor?: InputMaybe<ApiIntFilter>;
  /** Filter by minAmountMinor */
  minAmountMinor?: InputMaybe<ApiIntFilter>;
  /** Filter by minPriceMinor */
  minPriceMinor?: InputMaybe<ApiIntFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by primaryCategoryId */
  primaryCategoryId?: InputMaybe<ApiIdFilter>;
  /** Filter by primaryCategoryName */
  primaryCategoryName?: InputMaybe<ApiStringFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by vendorId */
  vendorId?: InputMaybe<ApiIdFilter>;
};

export type ApiCatalogMutation = {
  __typename?: 'CatalogMutation';
  /** Create one bundle configuration. */
  bundleConfigurationCreate: ApiBundleConfigurationPayload;
  /** Delete one bundle configuration with optimistic locking. */
  bundleConfigurationDelete: ApiBundleConfigurationDeletePayload;
  /** Update configuration metadata. */
  bundleConfigurationUpdate: ApiBundleConfigurationPayload;
  /** Create a new bundle sellable item. */
  bundleCreate: ApiBundleCreatePayload;
  /** Sync all dependency rules for one bundle configuration. */
  bundleDependencyRulesSync: ApiBundleDependencyRulesSyncPayload;
  /** Sync all groups/items for one bundle configuration. */
  bundleGroupsSync: ApiBundleGroupsSyncPayload;
  /** Sync all reusable pricing templates for one bundle configuration. */
  bundlePricingTemplatesSync: ApiBundlePricingTemplatesSyncPayload;
  /** Unified bundle update with optimistic locking. */
  bundleUpdate: ApiBundleUpdatePayload;
  /** Create a new category */
  categoryCreate: ApiCategoryCreatePayload;
  /** Delete a category */
  categoryDelete: ApiCategoryDeletePayload;
  /** Move a category to a new parent or position */
  categoryMove: ApiCategoryMovePayload;
  /** Rebalance category tree positions */
  categoryRebalance: ApiCategoryRebalancePayload;
  /** Unified category update with optimistic locking. */
  categoryUpdate: ApiCategoryUpdatePayload;
  /** Add products to a collection */
  collectionAddProducts: ApiCollectionAddProductsPayload;
  /** Create a new collection */
  collectionCreate: ApiCollectionCreatePayload;
  /** Delete a collection */
  collectionDelete: ApiCollectionDeletePayload;
  /** Move a product within a collection */
  collectionMoveProduct: ApiCollectionMoveProductPayload;
  /** Remove products from a collection */
  collectionRemoveProducts: ApiCollectionRemoveProductsPayload;
  /** Update an existing collection */
  collectionUpdate: ApiCollectionUpdatePayload;
  /** Update collection rules for automatic product inclusion */
  collectionUpdateRules: ApiCollectionUpdateRulesPayload;
  /**
   * Start async bulk update.
   * Requires X-Idempotency-Key header.
   */
  productBulkUpdate: ApiProductBulkUpdatePayload;
  /** Create a new product */
  productCreate: ApiProductCreatePayload;
  /** Delete an existing product */
  productDelete: ApiProductDeletePayload;
  /**
   * Unified product update with optimistic locking.
   * Supports product and variant updates in a single request.
   */
  productUpdate: ApiProductUpdatePayload;
  /** Create a new tag */
  tagCreate: ApiTagCreatePayload;
  /** Delete a tag */
  tagDelete: ApiTagDeletePayload;
  /** Update an existing tag */
  tagUpdate: ApiTagUpdatePayload;
  /** Create a new vendor */
  vendorCreate: ApiVendorCreatePayload;
};


export type ApiCatalogMutationBundleConfigurationCreateArgs = {
  input: ApiBundleConfigurationCreateInput;
};


export type ApiCatalogMutationBundleConfigurationDeleteArgs = {
  input: ApiBundleConfigurationDeleteInput;
};


export type ApiCatalogMutationBundleConfigurationUpdateArgs = {
  input: ApiBundleConfigurationUpdateInput;
};


export type ApiCatalogMutationBundleCreateArgs = {
  input: ApiBundleCreateInput;
};


export type ApiCatalogMutationBundleDependencyRulesSyncArgs = {
  input: ApiBundleDependencyRulesSyncInput;
};


export type ApiCatalogMutationBundleGroupsSyncArgs = {
  input: ApiBundleGroupsSyncInput;
};


export type ApiCatalogMutationBundlePricingTemplatesSyncArgs = {
  input: ApiBundlePricingTemplatesSyncInput;
};


export type ApiCatalogMutationBundleUpdateArgs = {
  bundleId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  operations?: InputMaybe<ApiBundleUpdateInput>;
};


export type ApiCatalogMutationCategoryCreateArgs = {
  input: ApiCategoryCreateInput;
};


export type ApiCatalogMutationCategoryDeleteArgs = {
  input: ApiCategoryDeleteInput;
};


export type ApiCatalogMutationCategoryMoveArgs = {
  input: ApiCategoryMoveInput;
};


export type ApiCatalogMutationCategoryRebalanceArgs = {
  input: ApiCategoryRebalanceInput;
};


export type ApiCatalogMutationCategoryUpdateArgs = {
  categoryId: Scalars['ID']['input'];
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  operations?: InputMaybe<ApiCategoryUpdateInput>;
};


export type ApiCatalogMutationCollectionAddProductsArgs = {
  input: ApiCollectionAddProductsInput;
};


export type ApiCatalogMutationCollectionCreateArgs = {
  input: ApiCollectionCreateInput;
};


export type ApiCatalogMutationCollectionDeleteArgs = {
  input: ApiCollectionDeleteInput;
};


export type ApiCatalogMutationCollectionMoveProductArgs = {
  input: ApiCollectionMoveProductInput;
};


export type ApiCatalogMutationCollectionRemoveProductsArgs = {
  input: ApiCollectionRemoveProductsInput;
};


export type ApiCatalogMutationCollectionUpdateArgs = {
  input: ApiCollectionUpdateInput;
};


export type ApiCatalogMutationCollectionUpdateRulesArgs = {
  input: ApiCollectionUpdateRulesInput;
};


export type ApiCatalogMutationProductBulkUpdateArgs = {
  input: ApiProductBulkUpdateInput;
};


export type ApiCatalogMutationProductCreateArgs = {
  input: ApiProductCreateInput;
};


export type ApiCatalogMutationProductDeleteArgs = {
  input: ApiProductDeleteInput;
};


export type ApiCatalogMutationProductUpdateArgs = {
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  operations?: InputMaybe<ApiProductUpdateInput>;
  productId: Scalars['ID']['input'];
};


export type ApiCatalogMutationTagCreateArgs = {
  input: ApiTagCreateInput;
};


export type ApiCatalogMutationTagDeleteArgs = {
  input: ApiTagDeleteInput;
};


export type ApiCatalogMutationTagUpdateArgs = {
  input: ApiTagUpdateInput;
};


export type ApiCatalogMutationVendorCreateArgs = {
  input: ApiVendorCreateInput;
};

export type ApiCatalogQuery = {
  __typename?: 'CatalogQuery';
  /** Get a bundle by Product global ID. The product must have kind = BUNDLE. */
  bundle?: Maybe<ApiBundle>;
  /** Get bundles with Relay-style pagination. */
  bundles: ApiBundleConnection;
  /** Get categories with Relay-style pagination */
  categories: ApiCategoryConnection;
  /** Get a category by ID */
  category?: Maybe<ApiCategory>;
  /** Get a collection by ID */
  collection?: Maybe<ApiCollection>;
  /** Get a collection by its handle */
  collectionByHandle?: Maybe<ApiCollection>;
  /** Preview count of products matching collection rules */
  collectionRulesPreviewCount: Scalars['Int']['output'];
  /** Get collections with Relay-style pagination */
  collections: ApiCollectionConnection;
  /** Get a node by its global ID */
  node?: Maybe<ApiNode>;
  /** Get multiple nodes by their global IDs */
  nodes: Array<Maybe<ApiNode>>;
  /** Get a product by ID */
  product?: Maybe<ApiProduct>;
  /** Get bulk update job by ID. */
  productBulkUpdateJob?: Maybe<ApiProductBulkUpdateJob>;
  /**
   * Get product bulk update jobs for the current store.
   * Defaults to active jobs when statusFilter is omitted.
   */
  productBulkUpdateJobs: ApiProductBulkUpdateJobConnection;
  /** Get products with Relay-style pagination */
  products: ApiProductConnection;
  /** Get a tag by ID */
  tag?: Maybe<ApiTag>;
  /** Get tags with Relay-style pagination */
  tags: ApiTagConnection;
  /** Get a variant by ID */
  variant?: Maybe<ApiVariant>;
  /** Get variants with Relay-style pagination */
  variants: ApiVariantConnection;
  /** Get a vendor by ID */
  vendor?: Maybe<ApiVendor>;
  /** Get vendors with Relay-style pagination */
  vendors: ApiVendorConnection;
};


export type ApiCatalogQueryBundleArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCatalogQueryBundlesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ApiBundleBundlesMetaInput>;
  orderBy?: InputMaybe<Array<ApiBundleOrderByInput>>;
  where?: InputMaybe<ApiBundleWhereInput>;
};


export type ApiCatalogQueryCategoriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ApiCategoryCategoriesMetaInput>;
  orderBy?: InputMaybe<Array<ApiCategoryOrderByInput>>;
  where?: InputMaybe<ApiCategoryWhereInput>;
};


export type ApiCatalogQueryCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCatalogQueryCollectionArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCatalogQueryCollectionByHandleArgs = {
  handle: Scalars['String']['input'];
};


export type ApiCatalogQueryCollectionRulesPreviewCountArgs = {
  rules: Array<ApiCollectionRuleInput>;
};


export type ApiCatalogQueryCollectionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiCatalogQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCatalogQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiCatalogQueryProductArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCatalogQueryProductBulkUpdateJobArgs = {
  jobId: Scalars['ID']['input'];
};


export type ApiCatalogQueryProductBulkUpdateJobsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  statusFilter?: InputMaybe<Array<BulkUpdateJobStatus>>;
};


export type ApiCatalogQueryProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ApiProductProductsMetaInput>;
  orderBy?: InputMaybe<Array<ApiProductOrderByInput>>;
  where?: InputMaybe<ApiProductWhereInput>;
};


export type ApiCatalogQueryTagArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCatalogQueryTagsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiTagOrderByInput>>;
  where?: InputMaybe<ApiTagWhereInput>;
};


export type ApiCatalogQueryVariantArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCatalogQueryVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiVariantOrderByInput>>;
  where?: InputMaybe<ApiVariantWhereInput>;
};


export type ApiCatalogQueryVendorArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCatalogQueryVendorsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiVendorOrderByInput>>;
  where?: InputMaybe<ApiVendorWhereInput>;
};

/** A category represents a hierarchical grouping of products. */
export type ApiCategory = ApiNode & {
  __typename?: 'Category';
  /** All ancestor categories from root to parent. */
  ancestors: Array<ApiCategory>;
  /** Direct child categories. */
  children: Array<ApiCategory>;
  /** The date and time when the category was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Default product sort for this category PLP. */
  defaultSort: ProductSortBy;
  /** Default sort direction for this category PLP. */
  defaultSortDirection: SortDirection;
  /** The date and time when the category was deleted (soft delete). */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The depth of this category in the hierarchy (0 for root). */
  depth: Scalars['Int']['output'];
  /** The category description. */
  description?: Maybe<ApiRichText>;
  /** Short category excerpt. */
  excerpt?: Maybe<ApiRichText>;
  /** The URL-friendly handle for the category. */
  handle: Scalars['String']['output'];
  /** The globally unique ID of the category. */
  id: Scalars['ID']['output'];
  /** Whether the category is currently published. */
  isPublished: Scalars['Boolean']['output'];
  /** Media files associated with this category. */
  media: Array<ApiCategoryMediaItem>;
  /** The display name of the category. */
  name: Scalars['String']['output'];
  /** The parent category, if any. */
  parent?: Maybe<ApiCategory>;
  /** The materialized path for this category. */
  path: Scalars['String']['output'];
  /** The total number of products in this category. */
  productsCount: Scalars['Int']['output'];
  /** The date and time when the category was published, or null if unpublished. */
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Optimistic locking revision number. Incremented on each update. */
  revision: Scalars['Int']['output'];
  /** SEO metadata. */
  seo?: Maybe<ApiSeo>;
  /** The date and time when the category was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiCategoryCategoriesMetaInput = {
  hierarchyScope?: InputMaybe<ApiCategoryHierarchyScopeInput>;
  productsScope?: InputMaybe<ApiCategoryProductsScopeInput>;
};

/** A connection to a list of Category items. */
export type ApiCategoryConnection = {
  __typename?: 'CategoryConnection';
  /** A list of edges. */
  edges: Array<ApiCategoryEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of categories. */
  totalCount: Scalars['Int']['output'];
};

export type ApiCategoryContentInput = {
  /** The category description. */
  description?: InputMaybe<ApiRichTextInput>;
  /** The short category excerpt. */
  excerpt?: InputMaybe<ApiRichTextInput>;
};

/** Input for creating a category. */
export type ApiCategoryCreateInput = {
  /** Optional description. */
  description?: InputMaybe<ApiRichTextInput>;
  /** Optional short excerpt. */
  excerpt?: InputMaybe<ApiRichTextInput>;
  /** The URL-friendly handle for the category. */
  handle: Scalars['String']['input'];
  /** File IDs for category media. */
  mediaFileIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** The display name of the category. */
  name: Scalars['String']['input'];
  /** Optional parent category ID. */
  parentId?: InputMaybe<Scalars['ID']['input']>;
  /** Whether to publish immediately. */
  publish?: InputMaybe<Scalars['Boolean']['input']>;
  /** SEO metadata. */
  seo?: InputMaybe<ApiSeoInput>;
};

/** Payload for category creation. */
export type ApiCategoryCreatePayload = {
  __typename?: 'CategoryCreatePayload';
  /** The created category. */
  category?: Maybe<ApiCategory>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for deleting a category. */
export type ApiCategoryDeleteInput = {
  /** The ID of the category to delete. */
  id: Scalars['ID']['input'];
  /** Whether to permanently delete (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for category deletion. */
export type ApiCategoryDeletePayload = {
  __typename?: 'CategoryDeletePayload';
  /** The ID of the deleted category. */
  deletedCategoryId?: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in a Category connection. */
export type ApiCategoryEdge = {
  __typename?: 'CategoryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiCategory;
};

export type ApiCategoryHierarchyInput = {
  /** The new parent category ID, or null for root. */
  parentId?: InputMaybe<Scalars['ID']['input']>;
};

export enum CategoryHierarchyScopeDirection {
  Ancestors = 'ANCESTORS',
  Descendants = 'DESCENDANTS'
}

export type ApiCategoryHierarchyScopeInput = {
  direction: CategoryHierarchyScopeDirection;
  includeReference?: InputMaybe<Scalars['Boolean']['input']>;
  mode: CategoryHierarchyScopeMode;
  referenceId: Scalars['ID']['input'];
};

export enum CategoryHierarchyScopeMode {
  Exclude = 'EXCLUDE',
  Include = 'INCLUDE'
}

export type ApiCategoryMediaInput = {
  /** File IDs for category media. */
  fileIds: Array<Scalars['ID']['input']>;
};

/** A media item for a category. */
export type ApiCategoryMediaItem = {
  __typename?: 'CategoryMediaItem';
  /** The file reference. */
  file: ApiFile;
  /** The sort index for ordering. */
  sortIndex: Scalars['Int']['output'];
};

/** Input for moving a category in the hierarchy. */
export type ApiCategoryMoveInput = {
  /** The ID of the category to move. */
  id: Scalars['ID']['input'];
  /** The new parent category ID, or null for root. */
  newParentId?: InputMaybe<Scalars['ID']['input']>;
};

/** Payload for category move. */
export type ApiCategoryMovePayload = {
  __typename?: 'CategoryMovePayload';
  /** The moved category. */
  category?: Maybe<ApiCategory>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Ordering configuration for Category */
export type ApiCategoryOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CategoryOrderField;
};

/** Fields available for sorting Category */
export enum CategoryOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by defaultSort */
  DefaultSort = 'defaultSort',
  /** Sort by defaultSortDirection */
  DefaultSortDirection = 'defaultSortDirection',
  /** Sort by depth */
  Depth = 'depth',
  /** Sort by handle */
  Handle = 'handle',
  /** Sort by id */
  Id = 'id',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by name */
  Name = 'name',
  /** Sort by parentId */
  ParentId = 'parentId',
  /** Sort by path */
  Path = 'path',
  /** Sort by productsCount */
  ProductsCount = 'productsCount',
  /** Sort by publishedAt */
  PublishedAt = 'publishedAt',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type ApiCategoryProductsScopeInput = {
  mode: CategoryHierarchyScopeMode;
  referenceIds: Array<Scalars['ID']['input']>;
};

export type ApiCategoryRebalanceInput = {
  categoryId: Scalars['ID']['input'];
};

export type ApiCategoryRebalancePayload = {
  __typename?: 'CategoryRebalancePayload';
  category?: Maybe<ApiCategory>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCategorySortInput = {
  /** Default product sort for this category PLP. */
  defaultSort: ProductSortBy;
  /** Default sort direction for this category PLP. */
  defaultSortDirection: SortDirection;
};

export enum CategoryStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED'
}

/** Input for updating a category through section-based operations. */
export type ApiCategoryUpdateInput = {
  /** Translated content. */
  content?: InputMaybe<ApiCategoryContentInput>;
  /** The URL-friendly handle for the category. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** Hierarchy move. */
  hierarchy?: InputMaybe<ApiCategoryHierarchyInput>;
  /** Category media replacement. */
  media?: InputMaybe<ApiCategoryMediaInput>;
  /** The display name of the category. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** SEO metadata. */
  seo?: InputMaybe<ApiSeoInput>;
  /** PLP sort preferences. */
  sort?: InputMaybe<ApiCategorySortInput>;
  /** Category status. */
  status?: InputMaybe<CategoryStatus>;
};

/** Payload for category update. */
export type ApiCategoryUpdatePayload = {
  __typename?: 'CategoryUpdatePayload';
  /** The updated category. */
  category?: Maybe<ApiCategory>;
  /** Results of requested category update operations. */
  operationResults: Array<ApiOperationResult>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for Category */
export type ApiCategoryWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCategoryWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCategoryWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCategoryWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by defaultSort */
  defaultSort?: InputMaybe<ApiStringFilter>;
  /** Filter by defaultSortDirection */
  defaultSortDirection?: InputMaybe<ApiStringFilter>;
  /** Filter by depth */
  depth?: InputMaybe<ApiIntFilter>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by parentId */
  parentId?: InputMaybe<ApiIdFilter>;
  /** Filter by path */
  path?: InputMaybe<ApiStringFilter>;
  /** Filter by productsCount */
  productsCount?: InputMaybe<ApiIntFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiCollection = ApiNode & {
  __typename?: 'Collection';
  activeFrom?: Maybe<Scalars['DateTime']['output']>;
  activeTo?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  defaultSort: ProductSortBy;
  defaultSortDirection: SortDirection;
  description?: Maybe<ApiRichText>;
  excerpt?: Maybe<ApiRichText>;
  handle?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isPublished: Scalars['Boolean']['output'];
  media: Array<ApiCollectionMediaItem>;
  name: Scalars['String']['output'];
  products: ApiCollectionProductConnection;
  productsCount: Scalars['Int']['output'];
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  rules: Array<ApiCollectionRule>;
  seo?: Maybe<ApiSeo>;
  type: CollectionType;
  updatedAt: Scalars['DateTime']['output'];
};


export type ApiCollectionProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ApiProductSortInput>;
};

export type ApiCollectionAddProductsInput = {
  collectionId: Scalars['ID']['input'];
  productIds: Array<Scalars['ID']['input']>;
};

export type ApiCollectionAddProductsPayload = {
  __typename?: 'CollectionAddProductsPayload';
  collection?: Maybe<ApiCollection>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCollectionConnection = {
  __typename?: 'CollectionConnection';
  edges: Array<ApiCollectionEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCollectionCreateInput = {
  activeFrom?: InputMaybe<Scalars['DateTime']['input']>;
  activeTo?: InputMaybe<Scalars['DateTime']['input']>;
  defaultSort?: InputMaybe<ProductSortBy>;
  defaultSortDirection?: InputMaybe<SortDirection>;
  description?: InputMaybe<ApiRichTextInput>;
  excerpt?: InputMaybe<ApiRichTextInput>;
  handle?: InputMaybe<Scalars['String']['input']>;
  media?: InputMaybe<Array<ApiCollectionMediaInput>>;
  name: Scalars['String']['input'];
  publish?: InputMaybe<Scalars['Boolean']['input']>;
  seo?: InputMaybe<ApiSeoInput>;
  type: CollectionType;
};

export type ApiCollectionCreatePayload = {
  __typename?: 'CollectionCreatePayload';
  collection?: Maybe<ApiCollection>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCollectionDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiCollectionDeletePayload = {
  __typename?: 'CollectionDeletePayload';
  deletedCollectionId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCollectionEdge = {
  __typename?: 'CollectionEdge';
  cursor: Scalars['String']['output'];
  node: ApiCollection;
};

export type ApiCollectionMediaInput = {
  fileId: Scalars['ID']['input'];
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiCollectionMediaItem = {
  __typename?: 'CollectionMediaItem';
  file: ApiFile;
  sortIndex: Scalars['Int']['output'];
};

export type ApiCollectionMeta = {
  __typename?: 'CollectionMeta';
  count: Scalars['Int']['output'];
  page: Scalars['Int']['output'];
  pageCount: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type ApiCollectionMoveProductInput = {
  afterProductId?: InputMaybe<Scalars['ID']['input']>;
  beforeProductId?: InputMaybe<Scalars['ID']['input']>;
  collectionId: Scalars['ID']['input'];
  productId: Scalars['ID']['input'];
};

export type ApiCollectionMoveProductPayload = {
  __typename?: 'CollectionMoveProductPayload';
  collection?: Maybe<ApiCollection>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCollectionProductConnection = {
  __typename?: 'CollectionProductConnection';
  edges: Array<ApiCollectionProductEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCollectionProductEdge = {
  __typename?: 'CollectionProductEdge';
  cursor: Scalars['String']['output'];
  node: ApiProduct;
};

export type ApiCollectionRemoveProductsInput = {
  collectionId: Scalars['ID']['input'];
  productIds: Array<Scalars['ID']['input']>;
};

export type ApiCollectionRemoveProductsPayload = {
  __typename?: 'CollectionRemoveProductsPayload';
  collection?: Maybe<ApiCollection>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCollectionRule = {
  __typename?: 'CollectionRule';
  field: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  operator: Scalars['String']['output'];
  sortIndex: Scalars['Int']['output'];
  value: Scalars['JSON']['output'];
};

export type ApiCollectionRuleInput = {
  field: Scalars['String']['input'];
  operator: Scalars['String']['input'];
  value: Scalars['JSON']['input'];
};

export enum CollectionType {
  Manual = 'MANUAL',
  Rule = 'RULE'
}

export type ApiCollectionUpdateInput = {
  activeFrom?: InputMaybe<Scalars['DateTime']['input']>;
  activeTo?: InputMaybe<Scalars['DateTime']['input']>;
  defaultSort?: InputMaybe<ProductSortBy>;
  defaultSortDirection?: InputMaybe<SortDirection>;
  description?: InputMaybe<ApiRichTextInput>;
  excerpt?: InputMaybe<ApiRichTextInput>;
  handle?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  media?: InputMaybe<Array<ApiCollectionMediaInput>>;
  name?: InputMaybe<Scalars['String']['input']>;
  publish?: InputMaybe<Scalars['Boolean']['input']>;
  seo?: InputMaybe<ApiSeoInput>;
};

export type ApiCollectionUpdatePayload = {
  __typename?: 'CollectionUpdatePayload';
  collection?: Maybe<ApiCollection>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCollectionUpdateRulesInput = {
  collectionId: Scalars['ID']['input'];
  rules: Array<ApiCollectionRuleInput>;
};

export type ApiCollectionUpdateRulesPayload = {
  __typename?: 'CollectionUpdateRulesPayload';
  collection?: Maybe<ApiCollection>;
  userErrors: Array<ApiGenericUserError>;
};

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

/** Currency configuration for the project */
export type ApiCurrency = {
  __typename?: 'Currency';
  /** ISO 4217 currency code */
  code: CurrencyCode;
  /** Exchange rate relative to the base currency */
  exchangeRate: ApiExchangeRate;
  /** Whether this currency is currently active for the project */
  isActive: Scalars['Boolean']['output'];
  /** Display name of the currency */
  name: Scalars['String']['output'];
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

/** Input for creating a new currency */
export type ApiCurrencyCreateInput = {
  /** ISO 4217 currency code to add */
  code: CurrencyCode;
  /** Whether the currency should be active upon creation */
  isActive: Scalars['Boolean']['input'];
};

/** Payload returned after creating a currency */
export type ApiCurrencyCreatePayload = {
  __typename?: 'CurrencyCreatePayload';
  /** The newly created currency, null if creation failed */
  currency?: Maybe<ApiCurrency>;
  /** List of errors that occurred during creation */
  userErrors: Array<ApiUserError>;
};

/** Input for deleting a currency */
export type ApiCurrencyDeleteInput = {
  /** ISO 4217 currency code to delete */
  code: CurrencyCode;
};

/** Payload returned after deleting a currency */
export type ApiCurrencyDeletePayload = {
  __typename?: 'CurrencyDeletePayload';
  /** The code of the deleted currency, null if deletion failed */
  deletedCurrencyCode?: Maybe<CurrencyCode>;
  /** List of errors that occurred during deletion */
  userErrors: Array<ApiUserError>;
};

/** Input for setting the default currency */
export type ApiCurrencySetDefaultInput = {
  /** ISO 4217 currency code to set as default */
  currency: CurrencyCode;
};

/** Payload returned after updating currency settings */
export type ApiCurrencyUpdatePayload = {
  __typename?: 'CurrencyUpdatePayload';
  /** Whether the update was successful */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during update */
  userErrors: Array<ApiUserError>;
};

/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomer = ApiNode & {
  __typename?: 'Customer';
  accountStatus: CustomerAccountStatus;
  addresses: ApiCustomerAddressConnection;
  /** Reason the customer is currently blocked. Null for other lifecycle states. */
  blockedReason?: Maybe<Scalars['String']['output']>;
  companyName?: Maybe<Scalars['String']['output']>;
  /** At most one current consent record per channel. */
  consents: Array<ApiCustomerConsent>;
  createdAt: Scalars['DateTime']['output'];
  createdByUserId?: Maybe<Scalars['String']['output']>;
  dateOfBirth?: Maybe<Scalars['Date']['output']>;
  defaultBillingAddress?: Maybe<ApiCustomerAddress>;
  defaultShippingAddress?: Maybe<ApiCustomerAddress>;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  displayName: Scalars['String']['output'];
  email?: Maybe<Scalars['Email']['output']>;
  emailVerified: Scalars['Boolean']['output'];
  firstName?: Maybe<Scalars['String']['output']>;
  gender?: Maybe<Scalars['String']['output']>;
  groupMemberships: ApiCustomerGroupMembershipConnection;
  /** Opaque IAM principal identifier. Null for guests and imported profiles. */
  iamPrincipalId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  jobTitle?: Maybe<Scalars['String']['output']>;
  lastActivityAt?: Maybe<Scalars['DateTime']['output']>;
  lastName?: Maybe<Scalars['String']['output']>;
  lifecycleStatus: CustomerLifecycleStatus;
  mergedInto?: Maybe<ApiCustomer>;
  middleName?: Maybe<Scalars['String']['output']>;
  /** Internal moderation context visible only to administrators. */
  moderationNote?: Maybe<Scalars['String']['output']>;
  monetaryStatistics: ApiCustomerMonetaryStatisticsConnection;
  note?: Maybe<Scalars['String']['output']>;
  phoneE164?: Maybe<Scalars['String']['output']>;
  phoneVerified: Scalars['Boolean']['output'];
  preferredLocale?: Maybe<Scalars['String']['output']>;
  prefix?: Maybe<Scalars['String']['output']>;
  redactedAt?: Maybe<Scalars['DateTime']['output']>;
  revision: Scalars['Int']['output'];
  segmentMemberships: ApiCustomerSegmentMembershipConnection;
  source: Scalars['String']['output'];
  statistics?: Maybe<ApiCustomerStatistics>;
  suffix?: Maybe<Scalars['String']['output']>;
  tagAssignments: ApiCustomerTagAssignmentConnection;
  taxExemptions: ApiCustomerTaxExemptionConnection;
  taxIdentifiers: ApiCustomerTaxIdentifierConnection;
  updatedAt: Scalars['DateTime']['output'];
};


/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomerAddressesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerAddressOrderByInput>>;
  where?: InputMaybe<ApiCustomerAddressWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomerGroupMembershipsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerGroupMembershipOrderByInput>>;
  where?: InputMaybe<ApiCustomerGroupMembershipWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomerMonetaryStatisticsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerMonetaryStatisticsOrderByInput>>;
  where?: InputMaybe<ApiCustomerMonetaryStatisticsWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomerSegmentMembershipsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerSegmentMembershipOrderByInput>>;
  where?: InputMaybe<ApiCustomerSegmentMembershipWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomerTagAssignmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerTagAssignmentOrderByInput>>;
  where?: InputMaybe<ApiCustomerTagAssignmentWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomerTaxExemptionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerTaxExemptionOrderByInput>>;
  where?: InputMaybe<ApiCustomerTaxExemptionWhereInput>;
};


/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomerTaxIdentifiersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerTaxIdentifierOrderByInput>>;
  where?: InputMaybe<ApiCustomerTaxIdentifierWhereInput>;
};

export enum CustomerAccountStatus {
  Guest = 'GUEST',
  Invited = 'INVITED',
  Registered = 'REGISTERED'
}

export type ApiCustomerAccountStatusFilter = {
  _eq?: InputMaybe<CustomerAccountStatus>;
  _in?: InputMaybe<Array<CustomerAccountStatus>>;
  _neq?: InputMaybe<CustomerAccountStatus>;
  _notIn?: InputMaybe<Array<CustomerAccountStatus>>;
};

export type ApiCustomerAddress = ApiNode & {
  __typename?: 'CustomerAddress';
  address1: Scalars['String']['output'];
  address2?: Maybe<Scalars['String']['output']>;
  city: Scalars['String']['output'];
  companyName?: Maybe<Scalars['String']['output']>;
  /** Uppercase ISO 3166-1 alpha-2 code. */
  countryCode: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  customer: ApiCustomer;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isDefaultBilling: Scalars['Boolean']['output'];
  isDefaultShipping: Scalars['Boolean']['output'];
  label?: Maybe<Scalars['String']['output']>;
  lastName?: Maybe<Scalars['String']['output']>;
  latitude?: Maybe<Scalars['Float']['output']>;
  longitude?: Maybe<Scalars['Float']['output']>;
  middleName?: Maybe<Scalars['String']['output']>;
  phoneE164?: Maybe<Scalars['String']['output']>;
  postalCode?: Maybe<Scalars['String']['output']>;
  prefix?: Maybe<Scalars['String']['output']>;
  regionCode?: Maybe<Scalars['String']['output']>;
  regionName?: Maybe<Scalars['String']['output']>;
  suffix?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  validatedAt?: Maybe<Scalars['DateTime']['output']>;
  validationStatus: CustomerAddressValidationStatus;
};

export type ApiCustomerAddressConnection = {
  __typename?: 'CustomerAddressConnection';
  edges: Array<ApiCustomerAddressEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCustomerAddressCreateInput = {
  address1: Scalars['String']['input'];
  address2?: InputMaybe<Scalars['String']['input']>;
  city: Scalars['String']['input'];
  companyName?: InputMaybe<Scalars['String']['input']>;
  countryCode: Scalars['String']['input'];
  customerId: Scalars['ID']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  isDefaultBilling?: InputMaybe<Scalars['Boolean']['input']>;
  isDefaultShipping?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  phoneE164?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  regionCode?: InputMaybe<Scalars['String']['input']>;
  regionName?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
};

/** Address values used inside the atomic customerUpdate operation. */
export type ApiCustomerAddressCreateOperationInput = {
  address1: Scalars['String']['input'];
  address2?: InputMaybe<Scalars['String']['input']>;
  city: Scalars['String']['input'];
  companyName?: InputMaybe<Scalars['String']['input']>;
  countryCode: Scalars['String']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  isDefaultBilling?: InputMaybe<Scalars['Boolean']['input']>;
  isDefaultShipping?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  phoneE164?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  regionCode?: InputMaybe<Scalars['String']['input']>;
  regionName?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCustomerAddressCreatePayload = {
  __typename?: 'CustomerAddressCreatePayload';
  address?: Maybe<ApiCustomerAddress>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerAddressDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiCustomerAddressDeletePayload = {
  __typename?: 'CustomerAddressDeletePayload';
  deletedAddressId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerAddressEdge = {
  __typename?: 'CustomerAddressEdge';
  cursor: Scalars['String']['output'];
  node: ApiCustomerAddress;
};

/** Ordering configuration for CustomerAddress */
export type ApiCustomerAddressOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerAddressOrderField;
};

/** Fields available for sorting CustomerAddress */
export enum CustomerAddressOrderField {
  /** Sort by city */
  City = 'city',
  /** Sort by countryCode */
  CountryCode = 'countryCode',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by firstName */
  FirstName = 'firstName',
  /** Sort by id */
  Id = 'id',
  /** Sort by isDefaultBilling */
  IsDefaultBilling = 'isDefaultBilling',
  /** Sort by isDefaultShipping */
  IsDefaultShipping = 'isDefaultShipping',
  /** Sort by label */
  Label = 'label',
  /** Sort by lastName */
  LastName = 'lastName',
  /** Sort by postalCode */
  PostalCode = 'postalCode',
  /** Sort by regionCode */
  RegionCode = 'regionCode',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by validationStatus */
  ValidationStatus = 'validationStatus'
}

export type ApiCustomerAddressUpdateInput = {
  address1?: InputMaybe<Scalars['String']['input']>;
  address2?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  companyName?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** Set or clear this address as the customer's billing default. */
  isDefaultBilling?: InputMaybe<Scalars['Boolean']['input']>;
  /** Set or clear this address as the customer's shipping default. */
  isDefaultShipping?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  phoneE164?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  regionCode?: InputMaybe<Scalars['String']['input']>;
  regionName?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCustomerAddressUpdateOperationInput = {
  addressId: Scalars['ID']['input'];
  operations: ApiCustomerAddressUpdateInput;
};

export type ApiCustomerAddressUpdatePayload = {
  __typename?: 'CustomerAddressUpdatePayload';
  address?: Maybe<ApiCustomerAddress>;
  operationResults: Array<ApiCustomerOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

export enum CustomerAddressValidationStatus {
  Invalid = 'INVALID',
  Unvalidated = 'UNVALIDATED',
  Valid = 'VALID'
}

export type ApiCustomerAddressValidationStatusFilter = {
  _eq?: InputMaybe<CustomerAddressValidationStatus>;
  _in?: InputMaybe<Array<CustomerAddressValidationStatus>>;
  _neq?: InputMaybe<CustomerAddressValidationStatus>;
  _notIn?: InputMaybe<Array<CustomerAddressValidationStatus>>;
};

/** Filter conditions for CustomerAddress */
export type ApiCustomerAddressWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerAddressWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerAddressWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerAddressWhereInput>>;
  /** Filter by city */
  city?: InputMaybe<ApiStringFilter>;
  /** Filter by companyName */
  companyName?: InputMaybe<ApiStringFilter>;
  /** Filter by countryCode */
  countryCode?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by firstName */
  firstName?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isDefaultBilling */
  isDefaultBilling?: InputMaybe<ApiBooleanFilter>;
  /** Filter by isDefaultShipping */
  isDefaultShipping?: InputMaybe<ApiBooleanFilter>;
  /** Filter by label */
  label?: InputMaybe<ApiStringFilter>;
  /** Filter by lastName */
  lastName?: InputMaybe<ApiStringFilter>;
  /** Filter by phoneE164 */
  phoneE164?: InputMaybe<ApiStringFilter>;
  /** Filter by postalCode */
  postalCode?: InputMaybe<ApiStringFilter>;
  /** Filter by regionCode */
  regionCode?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by validationStatus */
  validationStatus?: InputMaybe<ApiCustomerAddressValidationStatusFilter>;
};

/** Atomic address changes scoped to the customer being updated. */
export type ApiCustomerAddressesUpdateInput = {
  create?: InputMaybe<Array<ApiCustomerAddressCreateOperationInput>>;
  /** Existing address ID to make the default. Explicit null clears the default. */
  defaultBillingAddressId?: InputMaybe<Scalars['ID']['input']>;
  /** Existing address ID to make the default. Explicit null clears the default. */
  defaultShippingAddressId?: InputMaybe<Scalars['ID']['input']>;
  deleteIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  update?: InputMaybe<Array<ApiCustomerAddressUpdateOperationInput>>;
};

/** Lifecycle states that a merchant administrator may select directly. */
export enum CustomerAdminLifecycleStatus {
  Active = 'ACTIVE',
  Blocked = 'BLOCKED',
  Disabled = 'DISABLED'
}

export enum CustomerAssignmentSource {
  Import = 'IMPORT',
  Manual = 'MANUAL',
  Rule = 'RULE',
  System = 'SYSTEM'
}

export type ApiCustomerAssignmentSourceFilter = {
  _eq?: InputMaybe<CustomerAssignmentSource>;
  _in?: InputMaybe<Array<CustomerAssignmentSource>>;
  _neq?: InputMaybe<CustomerAssignmentSource>;
  _notIn?: InputMaybe<Array<CustomerAssignmentSource>>;
};

/** Company fields in the unified customer update. */
export type ApiCustomerCompanyUpdateInput = {
  companyName?: InputMaybe<Scalars['String']['input']>;
  jobTitle?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCustomerConnection = {
  __typename?: 'CustomerConnection';
  edges: Array<ApiCustomerEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Current consent state for one customer and channel. */
export type ApiCustomerConsent = ApiNode & {
  __typename?: 'CustomerConsent';
  channel: CustomerConsentChannel;
  consentedAt?: Maybe<Scalars['DateTime']['output']>;
  contactPoint: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  customer: ApiCustomer;
  events: ApiCustomerConsentEventConnection;
  id: Scalars['ID']['output'];
  optInLevel: CustomerConsentOptInLevel;
  source: Scalars['String']['output'];
  sourceIp?: Maybe<Scalars['String']['output']>;
  sourceLocationId?: Maybe<Scalars['ID']['output']>;
  state: CustomerConsentState;
  updatedAt: Scalars['DateTime']['output'];
  userAgent?: Maybe<Scalars['String']['output']>;
  withdrawnAt?: Maybe<Scalars['DateTime']['output']>;
};


/** Current consent state for one customer and channel. */
export type ApiCustomerConsentEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerConsentEventOrderByInput>>;
};

/** Consent states that a merchant administrator may set explicitly. */
export enum CustomerConsentAdminState {
  NotSubscribed = 'NOT_SUBSCRIBED',
  Pending = 'PENDING',
  Subscribed = 'SUBSCRIBED',
  Unsubscribed = 'UNSUBSCRIBED'
}

export enum CustomerConsentChannel {
  Email = 'EMAIL',
  Push = 'PUSH',
  Sms = 'SMS',
  Whatsapp = 'WHATSAPP'
}

export type ApiCustomerConsentCreateInput = {
  channel: CustomerConsentChannel;
  contactPoint: Scalars['String']['input'];
  customerId: Scalars['ID']['input'];
  evidence?: InputMaybe<Scalars['JSON']['input']>;
  /** Defaults to UNKNOWN when omitted. */
  optInLevel?: InputMaybe<CustomerConsentOptInLevel>;
  sourceLocationId?: InputMaybe<Scalars['ID']['input']>;
  state: CustomerConsentAdminState;
};

export type ApiCustomerConsentCreatePayload = {
  __typename?: 'CustomerConsentCreatePayload';
  consent?: Maybe<ApiCustomerConsent>;
  event?: Maybe<ApiCustomerConsentEvent>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerConsentDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiCustomerConsentDeletePayload = {
  __typename?: 'CustomerConsentDeletePayload';
  deletedConsentId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

/** Immutable evidence record for a consent transition. */
export type ApiCustomerConsentEvent = ApiNode & {
  __typename?: 'CustomerConsentEvent';
  actorId?: Maybe<Scalars['String']['output']>;
  actorType: Scalars['String']['output'];
  channel: CustomerConsentChannel;
  consent: ApiCustomerConsent;
  contactPoint: Scalars['String']['output'];
  customer: ApiCustomer;
  evidence: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  idempotencyKey?: Maybe<Scalars['String']['output']>;
  newState: CustomerConsentState;
  occurredAt: Scalars['DateTime']['output'];
  optInLevel: CustomerConsentOptInLevel;
  previousState?: Maybe<CustomerConsentState>;
  requestId?: Maybe<Scalars['String']['output']>;
  source: Scalars['String']['output'];
  sourceIp?: Maybe<Scalars['String']['output']>;
  sourceLocationId?: Maybe<Scalars['ID']['output']>;
  userAgent?: Maybe<Scalars['String']['output']>;
};

export type ApiCustomerConsentEventConnection = {
  __typename?: 'CustomerConsentEventConnection';
  edges: Array<ApiCustomerConsentEventEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCustomerConsentEventEdge = {
  __typename?: 'CustomerConsentEventEdge';
  cursor: Scalars['String']['output'];
  node: ApiCustomerConsentEvent;
};

/** Ordering configuration for CustomerConsentEvent */
export type ApiCustomerConsentEventOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerConsentEventOrderField;
};

/** Fields available for sorting CustomerConsentEvent */
export enum CustomerConsentEventOrderField {
  /** Sort by actorType */
  ActorType = 'actorType',
  /** Sort by channel */
  Channel = 'channel',
  /** Sort by id */
  Id = 'id',
  /** Sort by newState */
  NewState = 'newState',
  /** Sort by occurredAt */
  OccurredAt = 'occurredAt',
  /** Sort by source */
  Source = 'source'
}

export enum CustomerConsentOptInLevel {
  ConfirmedOptIn = 'CONFIRMED_OPT_IN',
  SingleOptIn = 'SINGLE_OPT_IN',
  Unknown = 'UNKNOWN'
}

export enum CustomerConsentState {
  Invalid = 'INVALID',
  NotSubscribed = 'NOT_SUBSCRIBED',
  Pending = 'PENDING',
  Redacted = 'REDACTED',
  Subscribed = 'SUBSCRIBED',
  Unsubscribed = 'UNSUBSCRIBED'
}

export type ApiCustomerConsentStateFilter = {
  _eq?: InputMaybe<CustomerConsentState>;
  _in?: InputMaybe<Array<CustomerConsentState>>;
  _neq?: InputMaybe<CustomerConsentState>;
  _notIn?: InputMaybe<Array<CustomerConsentState>>;
};

/**
 * Consent update fields. A state transition appends an immutable evidence event;
 * customerId can move the relation before any evidence has been recorded.
 */
export type ApiCustomerConsentUpdateInput = {
  channel?: InputMaybe<CustomerConsentChannel>;
  contactPoint?: InputMaybe<Scalars['String']['input']>;
  customerId?: InputMaybe<Scalars['ID']['input']>;
  evidence?: InputMaybe<Scalars['JSON']['input']>;
  optInLevel?: InputMaybe<CustomerConsentOptInLevel>;
  sourceLocationId?: InputMaybe<Scalars['ID']['input']>;
  state?: InputMaybe<CustomerConsentAdminState>;
};

/** Consent transition scoped to the customer being updated. */
export type ApiCustomerConsentUpdateOperationInput = {
  channel: CustomerConsentChannel;
  contactPoint: Scalars['String']['input'];
  evidence?: InputMaybe<Scalars['JSON']['input']>;
  /** Defaults to UNKNOWN when omitted. */
  optInLevel?: InputMaybe<CustomerConsentOptInLevel>;
  sourceLocationId?: InputMaybe<Scalars['ID']['input']>;
  state: CustomerConsentAdminState;
};

export type ApiCustomerConsentUpdatePayload = {
  __typename?: 'CustomerConsentUpdatePayload';
  consent?: Maybe<ApiCustomerConsent>;
  event?: Maybe<ApiCustomerConsentEvent>;
  operationResults: Array<ApiCustomerOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Atomic consent transitions keyed by channel. */
export type ApiCustomerConsentsUpdateInput = {
  set: Array<ApiCustomerConsentUpdateOperationInput>;
};

/** Contact projections in the unified customer update. */
export type ApiCustomerContactUpdateInput = {
  email?: InputMaybe<Scalars['Email']['input']>;
  phoneE164?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCustomerCreateInput = {
  companyName?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['Date']['input']>;
  email?: InputMaybe<Scalars['Email']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  jobTitle?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  moderationNote?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  phoneE164?: InputMaybe<Scalars['String']['input']>;
  preferredLocale?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCustomerCreatePayload = {
  __typename?: 'CustomerCreatePayload';
  customer?: Maybe<ApiCustomer>;
  userErrors: Array<ApiGenericUserError>;
};

/** Auditable privacy access, export, correction or erasure workflow. */
export type ApiCustomerDataRequest = ApiNode & {
  __typename?: 'CustomerDataRequest';
  customer: ApiCustomer;
  dueAt?: Maybe<Scalars['DateTime']['output']>;
  finishedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  idempotencyKey: Scalars['String']['output'];
  legalBasis?: Maybe<Scalars['String']['output']>;
  rejectionReason?: Maybe<Scalars['String']['output']>;
  requestMetadata: Scalars['JSON']['output'];
  requestedAt: Scalars['DateTime']['output'];
  requestedById?: Maybe<Scalars['String']['output']>;
  requestedByType: Scalars['String']['output'];
  resultFile?: Maybe<ApiFile>;
  resultFileId?: Maybe<Scalars['ID']['output']>;
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  status: CustomerDataRequestStatus;
  type: CustomerDataRequestType;
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiCustomerDataRequestCancelOperationInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCustomerDataRequestConnection = {
  __typename?: 'CustomerDataRequestConnection';
  edges: Array<ApiCustomerDataRequestEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCustomerDataRequestCreateInput = {
  customerId: Scalars['ID']['input'];
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  legalBasis?: InputMaybe<Scalars['String']['input']>;
  requestMetadata?: InputMaybe<Scalars['JSON']['input']>;
  type: CustomerDataRequestType;
};

export type ApiCustomerDataRequestCreatePayload = {
  __typename?: 'CustomerDataRequestCreatePayload';
  dataRequest?: Maybe<ApiCustomerDataRequest>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerDataRequestDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiCustomerDataRequestDeletePayload = {
  __typename?: 'CustomerDataRequestDeletePayload';
  deletedDataRequestId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerDataRequestEdge = {
  __typename?: 'CustomerDataRequestEdge';
  cursor: Scalars['String']['output'];
  node: ApiCustomerDataRequest;
};

/** Ordering configuration for CustomerDataRequest */
export type ApiCustomerDataRequestOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerDataRequestOrderField;
};

/** Fields available for sorting CustomerDataRequest */
export enum CustomerDataRequestOrderField {
  /** Sort by dueAt */
  DueAt = 'dueAt',
  /** Sort by finishedAt */
  FinishedAt = 'finishedAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by requestedAt */
  RequestedAt = 'requestedAt',
  /** Sort by startedAt */
  StartedAt = 'startedAt',
  /** Sort by status */
  Status = 'status',
  /** Sort by type */
  Type = 'type',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export enum CustomerDataRequestStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Rejected = 'REJECTED'
}

export type ApiCustomerDataRequestStatusFilter = {
  _eq?: InputMaybe<CustomerDataRequestStatus>;
  _in?: InputMaybe<Array<CustomerDataRequestStatus>>;
  _neq?: InputMaybe<CustomerDataRequestStatus>;
  _notIn?: InputMaybe<Array<CustomerDataRequestStatus>>;
};

export enum CustomerDataRequestType {
  Access = 'ACCESS',
  Correction = 'CORRECTION',
  Erasure = 'ERASURE',
  Export = 'EXPORT'
}

export type ApiCustomerDataRequestTypeFilter = {
  _eq?: InputMaybe<CustomerDataRequestType>;
  _in?: InputMaybe<Array<CustomerDataRequestType>>;
  _neq?: InputMaybe<CustomerDataRequestType>;
  _notIn?: InputMaybe<Array<CustomerDataRequestType>>;
};

/** Update request metadata, its customer relation, or cancel the workflow. */
export type ApiCustomerDataRequestUpdateInput = {
  cancel?: InputMaybe<ApiCustomerDataRequestCancelOperationInput>;
  customerId?: InputMaybe<Scalars['ID']['input']>;
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  legalBasis?: InputMaybe<Scalars['String']['input']>;
  requestMetadata?: InputMaybe<Scalars['JSON']['input']>;
  type?: InputMaybe<CustomerDataRequestType>;
};

export type ApiCustomerDataRequestUpdatePayload = {
  __typename?: 'CustomerDataRequestUpdatePayload';
  dataRequest?: Maybe<ApiCustomerDataRequest>;
  operationResults: Array<ApiCustomerOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for CustomerDataRequest */
export type ApiCustomerDataRequestWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerDataRequestWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerDataRequestWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerDataRequestWhereInput>>;
  /** Filter by customerId */
  customerId?: InputMaybe<ApiIdFilter>;
  /** Filter by dueAt */
  dueAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by finishedAt */
  finishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by legalBasis */
  legalBasis?: InputMaybe<ApiStringFilter>;
  /** Filter by requestedAt */
  requestedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by requestedById */
  requestedById?: InputMaybe<ApiStringFilter>;
  /** Filter by requestedByType */
  requestedByType?: InputMaybe<ApiStringFilter>;
  /** Filter by startedAt */
  startedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiCustomerDataRequestStatusFilter>;
  /** Filter by type */
  type?: InputMaybe<ApiCustomerDataRequestTypeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiCustomerDeleteInput = {
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
};

export type ApiCustomerDeletePayload = {
  __typename?: 'CustomerDeletePayload';
  deletedCustomerId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerEdge = {
  __typename?: 'CustomerEdge';
  cursor: Scalars['String']['output'];
  node: ApiCustomer;
};

export type ApiCustomerGroup = ApiNode & {
  __typename?: 'CustomerGroup';
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  customerMemberships: ApiCustomerGroupMembershipConnection;
  customersCount: Scalars['Int']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isDefault: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};


export type ApiCustomerGroupCustomerMembershipsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerGroupMembershipOrderByInput>>;
  where?: InputMaybe<ApiCustomerGroupMembershipWhereInput>;
};

export type ApiCustomerGroupConnection = {
  __typename?: 'CustomerGroupConnection';
  edges: Array<ApiCustomerGroupEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCustomerGroupCreateInput = {
  code: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};

export type ApiCustomerGroupCreatePayload = {
  __typename?: 'CustomerGroupCreatePayload';
  group?: Maybe<ApiCustomerGroup>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerGroupDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiCustomerGroupDeletePayload = {
  __typename?: 'CustomerGroupDeletePayload';
  deletedGroupId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerGroupEdge = {
  __typename?: 'CustomerGroupEdge';
  cursor: Scalars['String']['output'];
  node: ApiCustomerGroup;
};

export type ApiCustomerGroupMembership = ApiNode & {
  __typename?: 'CustomerGroupMembership';
  assignedAt: Scalars['DateTime']['output'];
  assignedById?: Maybe<Scalars['String']['output']>;
  customer: ApiCustomer;
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  group: ApiCustomerGroup;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isPrimary: Scalars['Boolean']['output'];
  source: CustomerAssignmentSource;
};

export type ApiCustomerGroupMembershipConnection = {
  __typename?: 'CustomerGroupMembershipConnection';
  edges: Array<ApiCustomerGroupMembershipEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCustomerGroupMembershipEdge = {
  __typename?: 'CustomerGroupMembershipEdge';
  cursor: Scalars['String']['output'];
  node: ApiCustomerGroupMembership;
};

/** Ordering configuration for CustomerGroupMembership */
export type ApiCustomerGroupMembershipOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerGroupMembershipOrderField;
};

/** Fields available for sorting CustomerGroupMembership */
export enum CustomerGroupMembershipOrderField {
  /** Sort by assignedAt */
  AssignedAt = 'assignedAt',
  /** Sort by expiresAt */
  ExpiresAt = 'expiresAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by isPrimary */
  IsPrimary = 'isPrimary',
  /** Sort by source */
  Source = 'source'
}

/** Create a customer's membership in this group. */
export type ApiCustomerGroupMembershipRelationCreateInput = {
  customerId: Scalars['ID']['input'];
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ApiCustomerGroupMembershipRelationUpdateInput = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  membershipId: Scalars['ID']['input'];
};

export type ApiCustomerGroupMembershipRelationsUpdateInput = {
  create?: InputMaybe<Array<ApiCustomerGroupMembershipRelationCreateInput>>;
  deleteIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  update?: InputMaybe<Array<ApiCustomerGroupMembershipRelationUpdateInput>>;
};

/** One group membership used by the unified customer update. */
export type ApiCustomerGroupMembershipUpdateOperationInput = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  groupId: Scalars['ID']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Filter conditions for CustomerGroupMembership */
export type ApiCustomerGroupMembershipWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerGroupMembershipWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerGroupMembershipWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerGroupMembershipWhereInput>>;
  /** Filter by assignedAt */
  assignedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by customerId */
  customerId?: InputMaybe<ApiIdFilter>;
  /** Filter by expiresAt */
  expiresAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by groupId */
  groupId?: InputMaybe<ApiIdFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isPrimary */
  isPrimary?: InputMaybe<ApiBooleanFilter>;
  /** Filter by source */
  source?: InputMaybe<ApiCustomerAssignmentSourceFilter>;
};

/** Replace all manual group memberships for the customer. */
export type ApiCustomerGroupMembershipsUpdateInput = {
  memberships: Array<ApiCustomerGroupMembershipUpdateOperationInput>;
};

/** Ordering configuration for CustomerGroup */
export type ApiCustomerGroupOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerGroupOrderField;
};

/** Fields available for sorting CustomerGroup */
export enum CustomerGroupOrderField {
  /** Sort by code */
  Code = 'code',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by isActive */
  IsActive = 'isActive',
  /** Sort by isDefault */
  IsDefault = 'isDefault',
  /** Sort by name */
  Name = 'name',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type ApiCustomerGroupUpdateInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  /** Create, update, or delete customer memberships in this group. */
  memberships?: InputMaybe<ApiCustomerGroupMembershipRelationsUpdateInput>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCustomerGroupUpdatePayload = {
  __typename?: 'CustomerGroupUpdatePayload';
  group?: Maybe<ApiCustomerGroup>;
  operationResults: Array<ApiCustomerOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for CustomerGroup */
export type ApiCustomerGroupWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerGroupWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerGroupWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerGroupWhereInput>>;
  /** Filter by code */
  code?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isActive */
  isActive?: InputMaybe<ApiBooleanFilter>;
  /** Filter by isDefault */
  isDefault?: InputMaybe<ApiBooleanFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export enum CustomerLifecycleStatus {
  Active = 'ACTIVE',
  Blocked = 'BLOCKED',
  Disabled = 'DISABLED',
  Merged = 'MERGED',
  Redacted = 'REDACTED'
}

export type ApiCustomerLifecycleStatusFilter = {
  _eq?: InputMaybe<CustomerLifecycleStatus>;
  _in?: InputMaybe<Array<CustomerLifecycleStatus>>;
  _neq?: InputMaybe<CustomerLifecycleStatus>;
  _notIn?: InputMaybe<Array<CustomerLifecycleStatus>>;
};

/** Idempotent workflow that merges one customer profile into another. */
export type ApiCustomerMerge = ApiNode & {
  __typename?: 'CustomerMerge';
  errorCode?: Maybe<Scalars['String']['output']>;
  errorMessage?: Maybe<Scalars['String']['output']>;
  finishedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  idempotencyKey: Scalars['String']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  requestedAt: Scalars['DateTime']['output'];
  requestedById?: Maybe<Scalars['String']['output']>;
  requestedByType: Scalars['String']['output'];
  resolution: Scalars['JSON']['output'];
  sourceCustomer: ApiCustomer;
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  status: CustomerMergeStatus;
  targetCustomer: ApiCustomer;
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiCustomerMergeConnection = {
  __typename?: 'CustomerMergeConnection';
  edges: Array<ApiCustomerMergeEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCustomerMergeCreateInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
  sourceCustomerId: Scalars['ID']['input'];
  targetCustomerId: Scalars['ID']['input'];
};

export type ApiCustomerMergeCreatePayload = {
  __typename?: 'CustomerMergeCreatePayload';
  merge?: Maybe<ApiCustomerMerge>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerMergeDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiCustomerMergeDeletePayload = {
  __typename?: 'CustomerMergeDeletePayload';
  deletedMergeId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerMergeEdge = {
  __typename?: 'CustomerMergeEdge';
  cursor: Scalars['String']['output'];
  node: ApiCustomerMerge;
};

/** Ordering configuration for CustomerMerge */
export type ApiCustomerMergeOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerMergeOrderField;
};

/** Fields available for sorting CustomerMerge */
export enum CustomerMergeOrderField {
  /** Sort by finishedAt */
  FinishedAt = 'finishedAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by requestedAt */
  RequestedAt = 'requestedAt',
  /** Sort by startedAt */
  StartedAt = 'startedAt',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export enum CustomerMergeStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  InProgress = 'IN_PROGRESS',
  Requested = 'REQUESTED'
}

export type ApiCustomerMergeStatusFilter = {
  _eq?: InputMaybe<CustomerMergeStatus>;
  _in?: InputMaybe<Array<CustomerMergeStatus>>;
  _neq?: InputMaybe<CustomerMergeStatus>;
  _notIn?: InputMaybe<Array<CustomerMergeStatus>>;
};

/** Update merge metadata or either customer relation before processing starts. */
export type ApiCustomerMergeUpdateInput = {
  reason?: InputMaybe<Scalars['String']['input']>;
  sourceCustomerId?: InputMaybe<Scalars['ID']['input']>;
  targetCustomerId?: InputMaybe<Scalars['ID']['input']>;
};

export type ApiCustomerMergeUpdatePayload = {
  __typename?: 'CustomerMergeUpdatePayload';
  merge?: Maybe<ApiCustomerMerge>;
  operationResults: Array<ApiCustomerOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for CustomerMerge */
export type ApiCustomerMergeWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerMergeWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerMergeWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerMergeWhereInput>>;
  /** Filter by errorCode */
  errorCode?: InputMaybe<ApiStringFilter>;
  /** Filter by finishedAt */
  finishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by idempotencyKey */
  idempotencyKey?: InputMaybe<ApiStringFilter>;
  /** Filter by requestedAt */
  requestedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by requestedById */
  requestedById?: InputMaybe<ApiStringFilter>;
  /** Filter by requestedByType */
  requestedByType?: InputMaybe<ApiStringFilter>;
  /** Filter by sourceCustomerId */
  sourceCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by startedAt */
  startedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiCustomerMergeStatusFilter>;
  /** Filter by targetCustomerId */
  targetCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Internal moderation context independent from the merchant note. */
export type ApiCustomerModerationUpdateInput = {
  moderationNote?: InputMaybe<Scalars['String']['input']>;
};

/** Rebuildable monetary customer projection for one ISO 4217 currency. */
export type ApiCustomerMonetaryStatistics = ApiNode & {
  __typename?: 'CustomerMonetaryStatistics';
  averageOrderValueMinor: Scalars['BigInt']['output'];
  currencyCode: CurrencyCode;
  customer: ApiCustomer;
  id: Scalars['ID']['output'];
  netSpentMinor: Scalars['BigInt']['output'];
  ordersCount: Scalars['Int']['output'];
  totalRefundedMinor: Scalars['BigInt']['output'];
  totalSpentMinor: Scalars['BigInt']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiCustomerMonetaryStatisticsConnection = {
  __typename?: 'CustomerMonetaryStatisticsConnection';
  edges: Array<ApiCustomerMonetaryStatisticsEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCustomerMonetaryStatisticsEdge = {
  __typename?: 'CustomerMonetaryStatisticsEdge';
  cursor: Scalars['String']['output'];
  node: ApiCustomerMonetaryStatistics;
};

/** Ordering configuration for CustomerMonetaryStatistics */
export type ApiCustomerMonetaryStatisticsOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerMonetaryStatisticsOrderField;
};

/** Fields available for sorting CustomerMonetaryStatistics */
export enum CustomerMonetaryStatisticsOrderField {
  /** Sort by averageOrderValueMinor */
  AverageOrderValueMinor = 'averageOrderValueMinor',
  /** Sort by currencyCode */
  CurrencyCode = 'currencyCode',
  /** Sort by id */
  Id = 'id',
  /** Sort by netSpentMinor */
  NetSpentMinor = 'netSpentMinor',
  /** Sort by ordersCount */
  OrdersCount = 'ordersCount',
  /** Sort by totalRefundedMinor */
  TotalRefundedMinor = 'totalRefundedMinor',
  /** Sort by totalSpentMinor */
  TotalSpentMinor = 'totalSpentMinor',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

/** Filter conditions for CustomerMonetaryStatistics */
export type ApiCustomerMonetaryStatisticsWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerMonetaryStatisticsWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerMonetaryStatisticsWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerMonetaryStatisticsWhereInput>>;
  /** Filter by averageOrderValueMinor */
  averageOrderValueMinor?: InputMaybe<ApiBigIntFilter>;
  /** Filter by currencyCode */
  currencyCode?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by netSpentMinor */
  netSpentMinor?: InputMaybe<ApiBigIntFilter>;
  /** Filter by ordersCount */
  ordersCount?: InputMaybe<ApiIntFilter>;
  /** Filter by totalRefundedMinor */
  totalRefundedMinor?: InputMaybe<ApiBigIntFilter>;
  /** Filter by totalSpentMinor */
  totalSpentMinor?: InputMaybe<ApiBigIntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Merchant note in the unified customer update. */
export type ApiCustomerNoteUpdateInput = {
  note?: InputMaybe<Scalars['String']['input']>;
};

/** Result of one operation in a customer-domain update. */
export type ApiCustomerOperationResult = {
  __typename?: 'CustomerOperationResult';
  applied: Scalars['Boolean']['output'];
  errors: Array<ApiGenericUserError>;
  type: CustomerOperationType;
};

export enum CustomerOperationType {
  AddressUpdate = 'ADDRESS_UPDATE',
  CompanyUpdate = 'COMPANY_UPDATE',
  ConsentUpdate = 'CONSENT_UPDATE',
  ContactUpdate = 'CONTACT_UPDATE',
  DataRequestUpdate = 'DATA_REQUEST_UPDATE',
  GroupUpdate = 'GROUP_UPDATE',
  MergeUpdate = 'MERGE_UPDATE',
  ModerationUpdate = 'MODERATION_UPDATE',
  NoteUpdate = 'NOTE_UPDATE',
  ProfileUpdate = 'PROFILE_UPDATE',
  SegmentUpdate = 'SEGMENT_UPDATE',
  StatusUpdate = 'STATUS_UPDATE',
  TagUpdate = 'TAG_UPDATE',
  TaxExemptionUpdate = 'TAX_EXEMPTION_UPDATE',
  TaxIdentifierUpdate = 'TAX_IDENTIFIER_UPDATE'
}

/** Ordering configuration for Customer */
export type ApiCustomerOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerOrderField;
};

/** Fields available for sorting Customer */
export enum CustomerOrderField {
  /** Sort by accountStatus */
  AccountStatus = 'accountStatus',
  /** Sort by companyName */
  CompanyName = 'companyName',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by dateOfBirth */
  DateOfBirth = 'dateOfBirth',
  /** Sort by displayName */
  DisplayName = 'displayName',
  /** Sort by email */
  Email = 'email',
  /** Sort by firstName */
  FirstName = 'firstName',
  /** Sort by id */
  Id = 'id',
  /** Sort by lastActivityAt */
  LastActivityAt = 'lastActivityAt',
  /** Sort by lastName */
  LastName = 'lastName',
  /** Sort by lastOrderAt */
  LastOrderAt = 'lastOrderAt',
  /** Sort by lifecycleStatus */
  LifecycleStatus = 'lifecycleStatus',
  /** Sort by ordersCount */
  OrdersCount = 'ordersCount',
  /** Sort by phoneE164 */
  PhoneE164 = 'phoneE164',
  /** Sort by totalSpentMinor */
  TotalSpentMinor = 'totalSpentMinor',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

/** Personal profile fields in the unified customer update. */
export type ApiCustomerProfileUpdateInput = {
  dateOfBirth?: InputMaybe<Scalars['Date']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  middleName?: InputMaybe<Scalars['String']['input']>;
  preferredLocale?: InputMaybe<Scalars['String']['input']>;
  prefix?: InputMaybe<Scalars['String']['input']>;
  suffix?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCustomerSegment = ApiNode & {
  __typename?: 'CustomerSegment';
  /** Optional merchant-selected #RRGGBB presentation color. */
  color?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdById?: Maybe<Scalars['String']['output']>;
  customerMemberships: ApiCustomerSegmentMembershipConnection;
  customersCount: Scalars['Int']['output'];
  definition: Scalars['JSON']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  query?: Maybe<Scalars['String']['output']>;
  /** Aggregate revision incremented by definition and membership changes. */
  revision: Scalars['Int']['output'];
  status: CustomerSegmentStatus;
  type: CustomerSegmentType;
  updatedAt: Scalars['DateTime']['output'];
};


export type ApiCustomerSegmentCustomerMembershipsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerSegmentMembershipOrderByInput>>;
  where?: InputMaybe<ApiCustomerSegmentMembershipWhereInput>;
};

export type ApiCustomerSegmentConnection = {
  __typename?: 'CustomerSegmentConnection';
  edges: Array<ApiCustomerSegmentEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCustomerSegmentCreateInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  definition?: InputMaybe<Scalars['JSON']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  query?: InputMaybe<Scalars['String']['input']>;
  /** Defaults to DRAFT when omitted. */
  status?: InputMaybe<CustomerSegmentStatus>;
  type: CustomerSegmentType;
};

export type ApiCustomerSegmentCreatePayload = {
  __typename?: 'CustomerSegmentCreatePayload';
  segment?: Maybe<ApiCustomerSegment>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerSegmentDeleteInput = {
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
};

export type ApiCustomerSegmentDeletePayload = {
  __typename?: 'CustomerSegmentDeletePayload';
  deletedSegmentId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerSegmentEdge = {
  __typename?: 'CustomerSegmentEdge';
  cursor: Scalars['String']['output'];
  node: ApiCustomerSegment;
};

export type ApiCustomerSegmentMembership = ApiNode & {
  __typename?: 'CustomerSegmentMembership';
  customer: ApiCustomer;
  evaluatedAt: Scalars['DateTime']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  segment: ApiCustomerSegment;
  source: CustomerAssignmentSource;
};

export type ApiCustomerSegmentMembershipConnection = {
  __typename?: 'CustomerSegmentMembershipConnection';
  edges: Array<ApiCustomerSegmentMembershipEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCustomerSegmentMembershipEdge = {
  __typename?: 'CustomerSegmentMembershipEdge';
  cursor: Scalars['String']['output'];
  node: ApiCustomerSegmentMembership;
};

/** Ordering configuration for CustomerSegmentMembership */
export type ApiCustomerSegmentMembershipOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerSegmentMembershipOrderField;
};

/** Fields available for sorting CustomerSegmentMembership */
export enum CustomerSegmentMembershipOrderField {
  /** Sort by evaluatedAt */
  EvaluatedAt = 'evaluatedAt',
  /** Sort by expiresAt */
  ExpiresAt = 'expiresAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by source */
  Source = 'source'
}

export type ApiCustomerSegmentMembershipRelationCreateInput = {
  customerId: Scalars['ID']['input'];
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
};

export type ApiCustomerSegmentMembershipRelationUpdateInput = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  membershipId: Scalars['ID']['input'];
};

export type ApiCustomerSegmentMembershipRelationsUpdateInput = {
  create?: InputMaybe<Array<ApiCustomerSegmentMembershipRelationCreateInput>>;
  deleteIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Atomically replace all manual memberships with these customers. */
  setCustomerIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  update?: InputMaybe<Array<ApiCustomerSegmentMembershipRelationUpdateInput>>;
};

/** Filter conditions for CustomerSegmentMembership */
export type ApiCustomerSegmentMembershipWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerSegmentMembershipWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerSegmentMembershipWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerSegmentMembershipWhereInput>>;
  /** Filter by customerId */
  customerId?: InputMaybe<ApiIdFilter>;
  /** Filter by evaluatedAt */
  evaluatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by expiresAt */
  expiresAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by segmentId */
  segmentId?: InputMaybe<ApiIdFilter>;
  /** Filter by source */
  source?: InputMaybe<ApiCustomerAssignmentSourceFilter>;
};

/** Replace all manual segment memberships for the customer. */
export type ApiCustomerSegmentMembershipsUpdateInput = {
  segmentIds: Array<Scalars['ID']['input']>;
};

/** Ordering configuration for CustomerSegment */
export type ApiCustomerSegmentOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerSegmentOrderField;
};

/** Fields available for sorting CustomerSegment */
export enum CustomerSegmentOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by customersCount */
  CustomersCount = 'customersCount',
  /** Sort by id */
  Id = 'id',
  /** Sort by name */
  Name = 'name',
  /** Sort by status */
  Status = 'status',
  /** Sort by type */
  Type = 'type',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export enum CustomerSegmentStatus {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Draft = 'DRAFT'
}

export type ApiCustomerSegmentStatusFilter = {
  _eq?: InputMaybe<CustomerSegmentStatus>;
  _in?: InputMaybe<Array<CustomerSegmentStatus>>;
  _neq?: InputMaybe<CustomerSegmentStatus>;
  _notIn?: InputMaybe<Array<CustomerSegmentStatus>>;
};

export enum CustomerSegmentType {
  Dynamic = 'DYNAMIC',
  Manual = 'MANUAL'
}

export type ApiCustomerSegmentTypeFilter = {
  _eq?: InputMaybe<CustomerSegmentType>;
  _in?: InputMaybe<Array<CustomerSegmentType>>;
  _neq?: InputMaybe<CustomerSegmentType>;
  _notIn?: InputMaybe<Array<CustomerSegmentType>>;
};

export type ApiCustomerSegmentUpdateInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  /** Create, update, delete, or replace manual customer memberships. */
  customers?: InputMaybe<ApiCustomerSegmentMembershipRelationsUpdateInput>;
  definition?: InputMaybe<Scalars['JSON']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<CustomerSegmentStatus>;
  type?: InputMaybe<CustomerSegmentType>;
};

export type ApiCustomerSegmentUpdatePayload = {
  __typename?: 'CustomerSegmentUpdatePayload';
  operationResults: Array<ApiCustomerOperationResult>;
  segment?: Maybe<ApiCustomerSegment>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for CustomerSegment */
export type ApiCustomerSegmentWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerSegmentWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerSegmentWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerSegmentWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by createdById */
  createdById?: InputMaybe<ApiStringFilter>;
  /** Filter by customersCount */
  customersCount?: InputMaybe<ApiIntFilter>;
  /** Filter by description */
  description?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiCustomerSegmentStatusFilter>;
  /** Filter by type */
  type?: InputMaybe<ApiCustomerSegmentTypeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Rebuildable, currency-independent customer activity projection. */
export type ApiCustomerStatistics = {
  __typename?: 'CustomerStatistics';
  cancelledOrdersCount: Scalars['Int']['output'];
  completedOrdersCount: Scalars['Int']['output'];
  customer: ApiCustomer;
  firstOrderAt?: Maybe<Scalars['DateTime']['output']>;
  /** Raw Orders service UUID; Orders Admin type is not a federation entity. */
  firstOrderId?: Maybe<Scalars['ID']['output']>;
  lastCheckoutAt?: Maybe<Scalars['DateTime']['output']>;
  lastOrderAt?: Maybe<Scalars['DateTime']['output']>;
  lastOrderId?: Maybe<Scalars['ID']['output']>;
  ordersCount: Scalars['Int']['output'];
  returnsCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/**
 * Lifecycle fields available to Admin. Merge and redaction remain dedicated
 * workflows and cannot be selected here.
 */
export type ApiCustomerStatusUpdateInput = {
  /** Required for BLOCKED. Omit for ACTIVE and DISABLED. */
  blockedReason?: InputMaybe<Scalars['String']['input']>;
  status: CustomerAdminLifecycleStatus;
};

export type ApiCustomerTag = ApiNode & {
  __typename?: 'CustomerTag';
  createdAt: Scalars['DateTime']['output'];
  customerAssignments: ApiCustomerTagAssignmentConnection;
  customersCount: Scalars['Int']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  normalizedName: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};


export type ApiCustomerTagCustomerAssignmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerTagAssignmentOrderByInput>>;
  where?: InputMaybe<ApiCustomerTagAssignmentWhereInput>;
};

export type ApiCustomerTagAssignment = ApiNode & {
  __typename?: 'CustomerTagAssignment';
  assignedAt: Scalars['DateTime']['output'];
  assignedById?: Maybe<Scalars['String']['output']>;
  customer: ApiCustomer;
  id: Scalars['ID']['output'];
  tag: ApiCustomerTag;
};

export type ApiCustomerTagAssignmentConnection = {
  __typename?: 'CustomerTagAssignmentConnection';
  edges: Array<ApiCustomerTagAssignmentEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCustomerTagAssignmentEdge = {
  __typename?: 'CustomerTagAssignmentEdge';
  cursor: Scalars['String']['output'];
  node: ApiCustomerTagAssignment;
};

/** Ordering configuration for CustomerTagAssignment */
export type ApiCustomerTagAssignmentOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerTagAssignmentOrderField;
};

/** Fields available for sorting CustomerTagAssignment */
export enum CustomerTagAssignmentOrderField {
  /** Sort by assignedAt */
  AssignedAt = 'assignedAt',
  /** Sort by id */
  Id = 'id'
}

export type ApiCustomerTagAssignmentRelationCreateInput = {
  customerId: Scalars['ID']['input'];
};

export type ApiCustomerTagAssignmentRelationsUpdateInput = {
  create?: InputMaybe<Array<ApiCustomerTagAssignmentRelationCreateInput>>;
  deleteIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Filter conditions for CustomerTagAssignment */
export type ApiCustomerTagAssignmentWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerTagAssignmentWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerTagAssignmentWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerTagAssignmentWhereInput>>;
  /** Filter by assignedAt */
  assignedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by assignedById */
  assignedById?: InputMaybe<ApiStringFilter>;
  /** Filter by customerId */
  customerId?: InputMaybe<ApiIdFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by tagId */
  tagId?: InputMaybe<ApiIdFilter>;
};

/** Replace all tag assignments for the customer. */
export type ApiCustomerTagAssignmentsUpdateInput = {
  tagIds: Array<Scalars['ID']['input']>;
};

export type ApiCustomerTagConnection = {
  __typename?: 'CustomerTagConnection';
  edges: Array<ApiCustomerTagEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCustomerTagCreateInput = {
  name: Scalars['String']['input'];
};

export type ApiCustomerTagCreatePayload = {
  __typename?: 'CustomerTagCreatePayload';
  tag?: Maybe<ApiCustomerTag>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerTagDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiCustomerTagDeletePayload = {
  __typename?: 'CustomerTagDeletePayload';
  deletedTagId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerTagEdge = {
  __typename?: 'CustomerTagEdge';
  cursor: Scalars['String']['output'];
  node: ApiCustomerTag;
};

/** Ordering configuration for CustomerTag */
export type ApiCustomerTagOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerTagOrderField;
};

/** Fields available for sorting CustomerTag */
export enum CustomerTagOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by name */
  Name = 'name',
  /** Sort by normalizedName */
  NormalizedName = 'normalizedName',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type ApiCustomerTagUpdateInput = {
  /** Create or delete customer assignments for this tag. */
  assignments?: InputMaybe<ApiCustomerTagAssignmentRelationsUpdateInput>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCustomerTagUpdatePayload = {
  __typename?: 'CustomerTagUpdatePayload';
  operationResults: Array<ApiCustomerOperationResult>;
  tag?: Maybe<ApiCustomerTag>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for CustomerTag */
export type ApiCustomerTagWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerTagWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerTagWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerTagWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by normalizedName */
  normalizedName?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiCustomerTaxExemption = ApiNode & {
  __typename?: 'CustomerTaxExemption';
  certificateFile?: Maybe<ApiFile>;
  certificateFileId?: Maybe<Scalars['ID']['output']>;
  code: Scalars['String']['output'];
  countryCode?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  customer: ApiCustomer;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  regionCode?: Maybe<Scalars['String']['output']>;
  status: CustomerTaxExemptionStatus;
  updatedAt: Scalars['DateTime']['output'];
  validFrom?: Maybe<Scalars['Date']['output']>;
  validTo?: Maybe<Scalars['Date']['output']>;
};

export type ApiCustomerTaxExemptionConnection = {
  __typename?: 'CustomerTaxExemptionConnection';
  edges: Array<ApiCustomerTaxExemptionEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCustomerTaxExemptionCreateInput = {
  certificateFileId?: InputMaybe<Scalars['ID']['input']>;
  code: Scalars['String']['input'];
  countryCode?: InputMaybe<Scalars['String']['input']>;
  customerId: Scalars['ID']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  regionCode?: InputMaybe<Scalars['String']['input']>;
  /** Defaults to ACTIVE when omitted. */
  status?: InputMaybe<CustomerTaxExemptionStatus>;
  validFrom?: InputMaybe<Scalars['Date']['input']>;
  validTo?: InputMaybe<Scalars['Date']['input']>;
};

export type ApiCustomerTaxExemptionCreateOperationInput = {
  certificateFileId?: InputMaybe<Scalars['ID']['input']>;
  code: Scalars['String']['input'];
  countryCode?: InputMaybe<Scalars['String']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  regionCode?: InputMaybe<Scalars['String']['input']>;
  /** Defaults to ACTIVE when omitted. */
  status?: InputMaybe<CustomerTaxExemptionStatus>;
  validFrom?: InputMaybe<Scalars['Date']['input']>;
  validTo?: InputMaybe<Scalars['Date']['input']>;
};

export type ApiCustomerTaxExemptionCreatePayload = {
  __typename?: 'CustomerTaxExemptionCreatePayload';
  taxExemption?: Maybe<ApiCustomerTaxExemption>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerTaxExemptionDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiCustomerTaxExemptionDeletePayload = {
  __typename?: 'CustomerTaxExemptionDeletePayload';
  deletedTaxExemptionId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerTaxExemptionEdge = {
  __typename?: 'CustomerTaxExemptionEdge';
  cursor: Scalars['String']['output'];
  node: ApiCustomerTaxExemption;
};

/** Ordering configuration for CustomerTaxExemption */
export type ApiCustomerTaxExemptionOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerTaxExemptionOrderField;
};

/** Fields available for sorting CustomerTaxExemption */
export enum CustomerTaxExemptionOrderField {
  /** Sort by code */
  Code = 'code',
  /** Sort by countryCode */
  CountryCode = 'countryCode',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by regionCode */
  RegionCode = 'regionCode',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by validFrom */
  ValidFrom = 'validFrom',
  /** Sort by validTo */
  ValidTo = 'validTo'
}

export enum CustomerTaxExemptionStatus {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Revoked = 'REVOKED'
}

export type ApiCustomerTaxExemptionStatusFilter = {
  _eq?: InputMaybe<CustomerTaxExemptionStatus>;
  _in?: InputMaybe<Array<CustomerTaxExemptionStatus>>;
  _neq?: InputMaybe<CustomerTaxExemptionStatus>;
  _notIn?: InputMaybe<Array<CustomerTaxExemptionStatus>>;
};

export type ApiCustomerTaxExemptionUpdateInput = {
  certificateFileId?: InputMaybe<Scalars['ID']['input']>;
  code?: InputMaybe<Scalars['String']['input']>;
  countryCode?: InputMaybe<Scalars['String']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  regionCode?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<CustomerTaxExemptionStatus>;
  validFrom?: InputMaybe<Scalars['Date']['input']>;
  validTo?: InputMaybe<Scalars['Date']['input']>;
};

export type ApiCustomerTaxExemptionUpdateOperationInput = {
  operations: ApiCustomerTaxExemptionUpdateInput;
  taxExemptionId: Scalars['ID']['input'];
};

export type ApiCustomerTaxExemptionUpdatePayload = {
  __typename?: 'CustomerTaxExemptionUpdatePayload';
  operationResults: Array<ApiCustomerOperationResult>;
  taxExemption?: Maybe<ApiCustomerTaxExemption>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for CustomerTaxExemption */
export type ApiCustomerTaxExemptionWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerTaxExemptionWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerTaxExemptionWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerTaxExemptionWhereInput>>;
  /** Filter by code */
  code?: InputMaybe<ApiStringFilter>;
  /** Filter by countryCode */
  countryCode?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by regionCode */
  regionCode?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiCustomerTaxExemptionStatusFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by validFrom */
  validFrom?: InputMaybe<ApiDateFilter>;
  /** Filter by validTo */
  validTo?: InputMaybe<ApiDateFilter>;
};

/** Atomic tax exemption changes scoped to the customer being updated. */
export type ApiCustomerTaxExemptionsUpdateInput = {
  create?: InputMaybe<Array<ApiCustomerTaxExemptionCreateOperationInput>>;
  deleteIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  update?: InputMaybe<Array<ApiCustomerTaxExemptionUpdateOperationInput>>;
};

export type ApiCustomerTaxIdentifier = ApiNode & {
  __typename?: 'CustomerTaxIdentifier';
  countryCode?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  customer: ApiCustomer;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  identifierType: Scalars['String']['output'];
  isPrimary: Scalars['Boolean']['output'];
  normalizedValue: Scalars['String']['output'];
  status: CustomerTaxIdentifierStatus;
  updatedAt: Scalars['DateTime']['output'];
  validFrom?: Maybe<Scalars['Date']['output']>;
  validTo?: Maybe<Scalars['Date']['output']>;
  value: Scalars['String']['output'];
  verifiedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ApiCustomerTaxIdentifierConnection = {
  __typename?: 'CustomerTaxIdentifierConnection';
  edges: Array<ApiCustomerTaxIdentifierEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiCustomerTaxIdentifierCreateInput = {
  countryCode?: InputMaybe<Scalars['String']['input']>;
  customerId: Scalars['ID']['input'];
  identifierType: Scalars['String']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  /** Defaults to UNVERIFIED when omitted. */
  status?: InputMaybe<CustomerTaxIdentifierStatus>;
  validFrom?: InputMaybe<Scalars['Date']['input']>;
  validTo?: InputMaybe<Scalars['Date']['input']>;
  value: Scalars['String']['input'];
};

export type ApiCustomerTaxIdentifierCreateOperationInput = {
  countryCode?: InputMaybe<Scalars['String']['input']>;
  identifierType: Scalars['String']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  /** Defaults to UNVERIFIED when omitted. */
  status?: InputMaybe<CustomerTaxIdentifierStatus>;
  validFrom?: InputMaybe<Scalars['Date']['input']>;
  validTo?: InputMaybe<Scalars['Date']['input']>;
  value: Scalars['String']['input'];
};

export type ApiCustomerTaxIdentifierCreatePayload = {
  __typename?: 'CustomerTaxIdentifierCreatePayload';
  taxIdentifier?: Maybe<ApiCustomerTaxIdentifier>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerTaxIdentifierDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiCustomerTaxIdentifierDeletePayload = {
  __typename?: 'CustomerTaxIdentifierDeletePayload';
  deletedTaxIdentifierId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerTaxIdentifierEdge = {
  __typename?: 'CustomerTaxIdentifierEdge';
  cursor: Scalars['String']['output'];
  node: ApiCustomerTaxIdentifier;
};

/** Ordering configuration for CustomerTaxIdentifier */
export type ApiCustomerTaxIdentifierOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerTaxIdentifierOrderField;
};

/** Fields available for sorting CustomerTaxIdentifier */
export enum CustomerTaxIdentifierOrderField {
  /** Sort by countryCode */
  CountryCode = 'countryCode',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by identifierType */
  IdentifierType = 'identifierType',
  /** Sort by isPrimary */
  IsPrimary = 'isPrimary',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by validFrom */
  ValidFrom = 'validFrom',
  /** Sort by validTo */
  ValidTo = 'validTo'
}

export enum CustomerTaxIdentifierStatus {
  Expired = 'EXPIRED',
  Rejected = 'REJECTED',
  Unverified = 'UNVERIFIED',
  Verified = 'VERIFIED'
}

export type ApiCustomerTaxIdentifierStatusFilter = {
  _eq?: InputMaybe<CustomerTaxIdentifierStatus>;
  _in?: InputMaybe<Array<CustomerTaxIdentifierStatus>>;
  _neq?: InputMaybe<CustomerTaxIdentifierStatus>;
  _notIn?: InputMaybe<Array<CustomerTaxIdentifierStatus>>;
};

export type ApiCustomerTaxIdentifierUpdateInput = {
  countryCode?: InputMaybe<Scalars['String']['input']>;
  identifierType?: InputMaybe<Scalars['String']['input']>;
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<CustomerTaxIdentifierStatus>;
  validFrom?: InputMaybe<Scalars['Date']['input']>;
  validTo?: InputMaybe<Scalars['Date']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCustomerTaxIdentifierUpdateOperationInput = {
  operations: ApiCustomerTaxIdentifierUpdateInput;
  taxIdentifierId: Scalars['ID']['input'];
};

export type ApiCustomerTaxIdentifierUpdatePayload = {
  __typename?: 'CustomerTaxIdentifierUpdatePayload';
  operationResults: Array<ApiCustomerOperationResult>;
  taxIdentifier?: Maybe<ApiCustomerTaxIdentifier>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for CustomerTaxIdentifier */
export type ApiCustomerTaxIdentifierWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerTaxIdentifierWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerTaxIdentifierWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerTaxIdentifierWhereInput>>;
  /** Filter by countryCode */
  countryCode?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by identifierType */
  identifierType?: InputMaybe<ApiStringFilter>;
  /** Filter by isPrimary */
  isPrimary?: InputMaybe<ApiBooleanFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiCustomerTaxIdentifierStatusFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by validFrom */
  validFrom?: InputMaybe<ApiDateFilter>;
  /** Filter by validTo */
  validTo?: InputMaybe<ApiDateFilter>;
  /** Filter by value */
  value?: InputMaybe<ApiStringFilter>;
};

/** Atomic tax identifier changes scoped to the customer being updated. */
export type ApiCustomerTaxIdentifiersUpdateInput = {
  create?: InputMaybe<Array<ApiCustomerTaxIdentifierCreateOperationInput>>;
  deleteIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  update?: InputMaybe<Array<ApiCustomerTaxIdentifierUpdateOperationInput>>;
};

/** Customer-level operations applied atomically by customerUpdate. */
export type ApiCustomerUpdateInput = {
  addresses?: InputMaybe<ApiCustomerAddressesUpdateInput>;
  company?: InputMaybe<ApiCustomerCompanyUpdateInput>;
  consents?: InputMaybe<ApiCustomerConsentsUpdateInput>;
  contact?: InputMaybe<ApiCustomerContactUpdateInput>;
  groups?: InputMaybe<ApiCustomerGroupMembershipsUpdateInput>;
  moderation?: InputMaybe<ApiCustomerModerationUpdateInput>;
  note?: InputMaybe<ApiCustomerNoteUpdateInput>;
  profile?: InputMaybe<ApiCustomerProfileUpdateInput>;
  segments?: InputMaybe<ApiCustomerSegmentMembershipsUpdateInput>;
  status?: InputMaybe<ApiCustomerStatusUpdateInput>;
  tags?: InputMaybe<ApiCustomerTagAssignmentsUpdateInput>;
  taxExemptions?: InputMaybe<ApiCustomerTaxExemptionsUpdateInput>;
  taxIdentifiers?: InputMaybe<ApiCustomerTaxIdentifiersUpdateInput>;
};

export type ApiCustomerUpdatePayload = {
  __typename?: 'CustomerUpdatePayload';
  customer?: Maybe<ApiCustomer>;
  operationResults: Array<ApiCustomerOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for Customer */
export type ApiCustomerWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerWhereInput>>;
  /** Filter by accountStatus */
  accountStatus?: InputMaybe<ApiCustomerAccountStatusFilter>;
  /** Filter by companyName */
  companyName?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by dateOfBirth */
  dateOfBirth?: InputMaybe<ApiDateFilter>;
  /** Filter by defaultShippingCity */
  defaultShippingCity?: InputMaybe<ApiStringFilter>;
  /** Filter by defaultShippingCountryCode */
  defaultShippingCountryCode?: InputMaybe<ApiStringFilter>;
  /** Filter by defaultShippingRegionCode */
  defaultShippingRegionCode?: InputMaybe<ApiStringFilter>;
  /** Filter by displayName */
  displayName?: InputMaybe<ApiStringFilter>;
  /** Filter by email */
  email?: InputMaybe<ApiStringFilter>;
  /** Filter by emailMarketingState */
  emailMarketingState?: InputMaybe<ApiCustomerConsentStateFilter>;
  /** Filter by emailVerified */
  emailVerified?: InputMaybe<ApiBooleanFilter>;
  /** Filter by firstName */
  firstName?: InputMaybe<ApiStringFilter>;
  /** Filter by iamPrincipalId */
  iamPrincipalId?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by lastActivityAt */
  lastActivityAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by lastName */
  lastName?: InputMaybe<ApiStringFilter>;
  /** Filter by lastOrderAt */
  lastOrderAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by lifecycleStatus */
  lifecycleStatus?: InputMaybe<ApiCustomerLifecycleStatusFilter>;
  /** Filter by ordersCount */
  ordersCount?: InputMaybe<ApiIntFilter>;
  /** Filter by phoneE164 */
  phoneE164?: InputMaybe<ApiStringFilter>;
  /** Filter by phoneVerified */
  phoneVerified?: InputMaybe<ApiBooleanFilter>;
  /** Filter by preferredLocale */
  preferredLocale?: InputMaybe<ApiStringFilter>;
  /** Match customers with a current membership in the selected segment IDs. */
  segmentId?: InputMaybe<ApiIdFilter>;
  /** Filter by source */
  source?: InputMaybe<ApiStringFilter>;
  /** Filter by totalSpentMinor */
  totalSpentMinor?: InputMaybe<ApiBigIntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutation = {
  __typename?: 'CustomersMutation';
  customerAddressCreate: ApiCustomerAddressCreatePayload;
  customerAddressDelete: ApiCustomerAddressDeletePayload;
  customerAddressUpdate: ApiCustomerAddressUpdatePayload;
  customerConsentCreate: ApiCustomerConsentCreatePayload;
  customerConsentDelete: ApiCustomerConsentDeletePayload;
  /** Update consent state and append an immutable evidence event. */
  customerConsentUpdate: ApiCustomerConsentUpdatePayload;
  customerCreate: ApiCustomerCreatePayload;
  customerDataRequestCreate: ApiCustomerDataRequestCreatePayload;
  customerDataRequestDelete: ApiCustomerDataRequestDeletePayload;
  customerDataRequestUpdate: ApiCustomerDataRequestUpdatePayload;
  customerDelete: ApiCustomerDeletePayload;
  customerGroupCreate: ApiCustomerGroupCreatePayload;
  customerGroupDelete: ApiCustomerGroupDeletePayload;
  customerGroupUpdate: ApiCustomerGroupUpdatePayload;
  customerMergeCreate: ApiCustomerMergeCreatePayload;
  customerMergeDelete: ApiCustomerMergeDeletePayload;
  customerMergeUpdate: ApiCustomerMergeUpdatePayload;
  customerSegmentCreate: ApiCustomerSegmentCreatePayload;
  customerSegmentDelete: ApiCustomerSegmentDeletePayload;
  customerSegmentUpdate: ApiCustomerSegmentUpdatePayload;
  customerTagCreate: ApiCustomerTagCreatePayload;
  customerTagDelete: ApiCustomerTagDeletePayload;
  customerTagUpdate: ApiCustomerTagUpdatePayload;
  customerTaxExemptionCreate: ApiCustomerTaxExemptionCreatePayload;
  customerTaxExemptionDelete: ApiCustomerTaxExemptionDeletePayload;
  customerTaxExemptionUpdate: ApiCustomerTaxExemptionUpdatePayload;
  customerTaxIdentifierCreate: ApiCustomerTaxIdentifierCreatePayload;
  customerTaxIdentifierDelete: ApiCustomerTaxIdentifierDeletePayload;
  customerTaxIdentifierUpdate: ApiCustomerTaxIdentifierUpdatePayload;
  /** Unified customer profile update with optimistic locking. */
  customerUpdate: ApiCustomerUpdatePayload;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerAddressCreateArgs = {
  input: ApiCustomerAddressCreateInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerAddressDeleteArgs = {
  input: ApiCustomerAddressDeleteInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerAddressUpdateArgs = {
  addressId: Scalars['ID']['input'];
  operations?: InputMaybe<ApiCustomerAddressUpdateInput>;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerConsentCreateArgs = {
  input: ApiCustomerConsentCreateInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerConsentDeleteArgs = {
  input: ApiCustomerConsentDeleteInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerConsentUpdateArgs = {
  consentId: Scalars['ID']['input'];
  operations?: InputMaybe<ApiCustomerConsentUpdateInput>;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerCreateArgs = {
  input: ApiCustomerCreateInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerDataRequestCreateArgs = {
  input: ApiCustomerDataRequestCreateInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerDataRequestDeleteArgs = {
  input: ApiCustomerDataRequestDeleteInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerDataRequestUpdateArgs = {
  dataRequestId: Scalars['ID']['input'];
  operations?: InputMaybe<ApiCustomerDataRequestUpdateInput>;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerDeleteArgs = {
  input: ApiCustomerDeleteInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerGroupCreateArgs = {
  input: ApiCustomerGroupCreateInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerGroupDeleteArgs = {
  input: ApiCustomerGroupDeleteInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerGroupUpdateArgs = {
  groupId: Scalars['ID']['input'];
  operations?: InputMaybe<ApiCustomerGroupUpdateInput>;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerMergeCreateArgs = {
  input: ApiCustomerMergeCreateInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerMergeDeleteArgs = {
  input: ApiCustomerMergeDeleteInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerMergeUpdateArgs = {
  mergeId: Scalars['ID']['input'];
  operations?: InputMaybe<ApiCustomerMergeUpdateInput>;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerSegmentCreateArgs = {
  input: ApiCustomerSegmentCreateInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerSegmentDeleteArgs = {
  input: ApiCustomerSegmentDeleteInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerSegmentUpdateArgs = {
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  operations?: InputMaybe<ApiCustomerSegmentUpdateInput>;
  segmentId: Scalars['ID']['input'];
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerTagCreateArgs = {
  input: ApiCustomerTagCreateInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerTagDeleteArgs = {
  input: ApiCustomerTagDeleteInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerTagUpdateArgs = {
  operations?: InputMaybe<ApiCustomerTagUpdateInput>;
  tagId: Scalars['ID']['input'];
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerTaxExemptionCreateArgs = {
  input: ApiCustomerTaxExemptionCreateInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerTaxExemptionDeleteArgs = {
  input: ApiCustomerTaxExemptionDeleteInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerTaxExemptionUpdateArgs = {
  operations?: InputMaybe<ApiCustomerTaxExemptionUpdateInput>;
  taxExemptionId: Scalars['ID']['input'];
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerTaxIdentifierCreateArgs = {
  input: ApiCustomerTaxIdentifierCreateInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerTaxIdentifierDeleteArgs = {
  input: ApiCustomerTaxIdentifierDeleteInput;
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerTaxIdentifierUpdateArgs = {
  operations?: InputMaybe<ApiCustomerTaxIdentifierUpdateInput>;
  taxIdentifierId: Scalars['ID']['input'];
};


/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerUpdateArgs = {
  customerId: Scalars['ID']['input'];
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  operations?: InputMaybe<ApiCustomerUpdateInput>;
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQuery = {
  __typename?: 'CustomersQuery';
  customer?: Maybe<ApiCustomer>;
  customerAddress?: Maybe<ApiCustomerAddress>;
  customerByEmail?: Maybe<ApiCustomer>;
  customerConsent?: Maybe<ApiCustomerConsent>;
  customerDataRequest?: Maybe<ApiCustomerDataRequest>;
  customerDataRequests: ApiCustomerDataRequestConnection;
  customerGroup?: Maybe<ApiCustomerGroup>;
  customerGroups: ApiCustomerGroupConnection;
  customerMerge?: Maybe<ApiCustomerMerge>;
  customerMerges: ApiCustomerMergeConnection;
  customerSegment?: Maybe<ApiCustomerSegment>;
  customerSegments: ApiCustomerSegmentConnection;
  customerTag?: Maybe<ApiCustomerTag>;
  customerTags: ApiCustomerTagConnection;
  customerTaxExemption?: Maybe<ApiCustomerTaxExemption>;
  customerTaxIdentifier?: Maybe<ApiCustomerTaxIdentifier>;
  customers: ApiCustomerConnection;
  /** Resolve a customer-owned Relay node by global ID. */
  node?: Maybe<ApiNode>;
  /** Resolve customer-owned Relay nodes while preserving input order. */
  nodes: Array<Maybe<ApiNode>>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerAddressArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerByEmailArgs = {
  email: Scalars['Email']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerConsentArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerDataRequestArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerDataRequestsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerDataRequestOrderByInput>>;
  where?: InputMaybe<ApiCustomerDataRequestWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerGroupArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerGroupsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerGroupOrderByInput>>;
  where?: InputMaybe<ApiCustomerGroupWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerMergeArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerMergesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerMergeOrderByInput>>;
  where?: InputMaybe<ApiCustomerMergeWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerSegmentArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerSegmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerSegmentOrderByInput>>;
  where?: InputMaybe<ApiCustomerSegmentWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerTagArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerTagsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerTagOrderByInput>>;
  where?: InputMaybe<ApiCustomerTagWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerTaxExemptionArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerTaxIdentifierArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiCustomerOrderByInput>>;
  where?: InputMaybe<ApiCustomerWhereInput>;
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};

export type ApiDateFilter = {
  _between?: InputMaybe<Array<Scalars['Date']['input']>>;
  _eq?: InputMaybe<Scalars['Date']['input']>;
  _gt?: InputMaybe<Scalars['Date']['input']>;
  _gte?: InputMaybe<Scalars['Date']['input']>;
  _in?: InputMaybe<Array<Scalars['Date']['input']>>;
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Date']['input']>;
  _lte?: InputMaybe<Scalars['Date']['input']>;
  _neq?: InputMaybe<Scalars['Date']['input']>;
  _notIn?: InputMaybe<Array<Scalars['Date']['input']>>;
};

/** Filter operators for DateTime fields */
export type ApiDateTimeFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars['DateTime']['input']>;
  /** Greater than (after) */
  _gt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Greater than or equal (on or after) */
  _gte?: InputMaybe<Scalars['DateTime']['input']>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than (before) */
  _lt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Less than or equal (on or before) */
  _lte?: InputMaybe<Scalars['DateTime']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['DateTime']['input']>;
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

/** Input for setting dimensions (in millimeters). */
export type ApiDimensionsInput = {
  /** Height in millimeters. */
  height: Scalars['Int']['input'];
  /** Length in millimeters. */
  length: Scalars['Int']['input'];
  /** Width in millimeters. */
  width: Scalars['Int']['input'];
};

/** Exchange rate representation using integer arithmetic for precision */
export type ApiExchangeRate = {
  __typename?: 'ExchangeRate';
  /** The exchange rate value as an integer (divide by 10^scale for actual rate) */
  amount: Scalars['Int']['output'];
  /** The number of decimal places in the amount */
  scale: Scalars['Int']['output'];
};

/** External media data (YouTube, Vimeo, etc). */
export type ApiExternalMediaData = {
  __typename?: 'ExternalMediaData';
  /** External ID (YouTube video ID, Vimeo ID, etc). */
  externalId: Scalars['String']['output'];
  /** Provider-specific metadata. */
  providerMeta?: Maybe<Scalars['JSON']['output']>;
};

export type ApiFacet = ApiNode & {
  __typename?: 'Facet';
  facetType: FacetType;
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  lexoRank: Scalars['String']['output'];
  scopes: Array<FacetScopeType>;
  selectionMode: FacetSelectionMode;
  slug: Scalars['String']['output'];
  sources: Array<ApiFacetSource>;
  uiType: FacetUiType;
  values: Array<ApiFacetValue>;
};

export type ApiFacetCreateInput = {
  facetType: FacetType;
  label: Scalars['String']['input'];
  /** Defaults to both SEARCH and CATEGORY when omitted. */
  scopes?: InputMaybe<Array<FacetScopeType>>;
  selectionMode?: InputMaybe<FacetSelectionMode>;
  slug: Scalars['String']['input'];
  sources?: InputMaybe<Array<ApiFacetCreateSourceInput>>;
  uiType?: InputMaybe<FacetUiType>;
  valueCandidates?: InputMaybe<Array<ApiFacetCreateValueCandidateInput>>;
};

export type ApiFacetCreatePayload = {
  __typename?: 'FacetCreatePayload';
  facet?: Maybe<ApiFacet>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetCreateSourceInput = {
  handle: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type ApiFacetCreateValueCandidateInput = {
  handle: Scalars['String']['input'];
  label: Scalars['String']['input'];
  sourceHandle: Scalars['String']['input'];
};

export type ApiFacetDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiFacetDeletePayload = {
  __typename?: 'FacetDeletePayload';
  deletedFacetId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetMoveInput = {
  afterFacetId?: InputMaybe<Scalars['ID']['input']>;
  beforeFacetId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
};

export type ApiFacetMovePayload = {
  __typename?: 'FacetMovePayload';
  facet?: Maybe<ApiFacet>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetRebalanceInput = {
  confirm?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ApiFacetRebalancePayload = {
  __typename?: 'FacetRebalancePayload';
  facets: Array<ApiFacet>;
  userErrors: Array<ApiGenericUserError>;
};

/**
 * Listing contexts where a facet is available.
 *
 * SEARCH applies to listing requests without a category context.
 * CATEGORY applies to every category-scoped listing request.
 */
export enum FacetScopeType {
  Category = 'CATEGORY',
  Search = 'SEARCH'
}

export type ApiFacetScopesUpdateInput = {
  /** Only changed facets need to be included. All updates are applied atomically. */
  updates: Array<ApiFacetScopesUpdateItemInput>;
};

export type ApiFacetScopesUpdateItemInput = {
  id: Scalars['ID']['input'];
  /** Replaces the current scopes. The list cannot be empty. */
  scopes: Array<FacetScopeType>;
};

export type ApiFacetScopesUpdatePayload = {
  __typename?: 'FacetScopesUpdatePayload';
  facets: Array<ApiFacet>;
  userErrors: Array<ApiGenericUserError>;
};

export enum FacetSelectionMode {
  Multi = 'MULTI',
  Single = 'SINGLE'
}

export type ApiFacetSource = {
  __typename?: 'FacetSource';
  handle: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type ApiFacetSourceCandidate = {
  __typename?: 'FacetSourceCandidate';
  facetType: FacetType;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  locale: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type ApiFacetSourceCandidateConnection = {
  __typename?: 'FacetSourceCandidateConnection';
  edges: Array<ApiFacetSourceCandidateEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiFacetSourceCandidateEdge = {
  __typename?: 'FacetSourceCandidateEdge';
  cursor: Scalars['String']['output'];
  node: ApiFacetSourceCandidate;
};

/** Ordering configuration for FacetSourceCandidate */
export type ApiFacetSourceCandidateOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: FacetSourceCandidateOrderField;
};

/** Fields available for sorting FacetSourceCandidate */
export enum FacetSourceCandidateOrderField {
  /** Sort by facetType */
  FacetType = 'facetType',
  /** Sort by handle */
  Handle = 'handle',
  /** Sort by id */
  Id = 'id',
  /** Sort by name */
  Name = 'name',
  /** Sort by sortName */
  SortName = 'sortName',
  /** Sort by sourceSortBucket */
  SourceSortBucket = 'sourceSortBucket'
}

/** Filter conditions for FacetSourceCandidate */
export type ApiFacetSourceCandidateWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiFacetSourceCandidateWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiFacetSourceCandidateWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiFacetSourceCandidateWhereInput>>;
  /** Filter by facetType */
  facetType?: InputMaybe<ApiStringFilter>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by sortName */
  sortName?: InputMaybe<ApiStringFilter>;
  /** Filter by sourceSortBucket */
  sourceSortBucket?: InputMaybe<ApiIntFilter>;
};

export type ApiFacetSwatch = ApiNode & {
  __typename?: 'FacetSwatch';
  colorOne?: Maybe<Scalars['String']['output']>;
  colorTwo?: Maybe<Scalars['String']['output']>;
  file?: Maybe<ApiFile>;
  id: Scalars['ID']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  swatchType: SwatchType;
};

export type ApiFacetSwatchCreateInput = {
  colorOne?: InputMaybe<Scalars['String']['input']>;
  colorTwo?: InputMaybe<Scalars['String']['input']>;
  fileId?: InputMaybe<Scalars['ID']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  swatchType: SwatchType;
};

export type ApiFacetSwatchCreatePayload = {
  __typename?: 'FacetSwatchCreatePayload';
  facetSwatch?: Maybe<ApiFacetSwatch>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetSwatchDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiFacetSwatchDeletePayload = {
  __typename?: 'FacetSwatchDeletePayload';
  deletedFacetSwatchId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetSwatchUpdateInput = {
  colorOne?: InputMaybe<Scalars['String']['input']>;
  colorTwo?: InputMaybe<Scalars['String']['input']>;
  fileId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  swatchType?: InputMaybe<SwatchType>;
};

export type ApiFacetSwatchUpdatePayload = {
  __typename?: 'FacetSwatchUpdatePayload';
  facetSwatch?: Maybe<ApiFacetSwatch>;
  userErrors: Array<ApiGenericUserError>;
};

export enum FacetType {
  Feature = 'FEATURE',
  InStock = 'IN_STOCK',
  Option = 'OPTION',
  Price = 'PRICE',
  Tag = 'TAG'
}

export enum FacetUiType {
  Boolean = 'BOOLEAN',
  Checkbox = 'CHECKBOX',
  Dropdown = 'DROPDOWN',
  Radio = 'RADIO',
  Range = 'RANGE'
}

export type ApiFacetUpdateInput = {
  id: Scalars['ID']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  /** Replaces the current scopes when provided. The list cannot be empty. */
  scopes?: InputMaybe<Array<FacetScopeType>>;
  selectionMode?: InputMaybe<FacetSelectionMode>;
  slug?: InputMaybe<Scalars['String']['input']>;
  uiType?: InputMaybe<FacetUiType>;
};

export type ApiFacetUpdatePayload = {
  __typename?: 'FacetUpdatePayload';
  facet?: Maybe<ApiFacet>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetValue = ApiNode & {
  __typename?: 'FacetValue';
  enabled: Scalars['Boolean']['output'];
  facet: ApiFacet;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kind: FacetValueKind;
  label: Scalars['String']['output'];
  parent?: Maybe<ApiFacetValue>;
  sortIndex: Scalars['Int']['output'];
  sourceValues: Array<ApiFacetValue>;
  swatch?: Maybe<ApiFacetSwatch>;
};

export type ApiFacetValueCandidate = {
  __typename?: 'FacetValueCandidate';
  facetType: FacetType;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  sourceHandle: Scalars['String']['output'];
};

export type ApiFacetValueCandidateConnection = {
  __typename?: 'FacetValueCandidateConnection';
  edges: Array<ApiFacetValueCandidateEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiFacetValueCandidateEdge = {
  __typename?: 'FacetValueCandidateEdge';
  cursor: Scalars['String']['output'];
  node: ApiFacetValueCandidate;
};

/** Ordering configuration for FacetValueCandidate */
export type ApiFacetValueCandidateOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: FacetValueCandidateOrderField;
};

/** Fields available for sorting FacetValueCandidate */
export enum FacetValueCandidateOrderField {
  /** Sort by handle */
  Handle = 'handle',
  /** Sort by id */
  Id = 'id',
  /** Sort by label */
  Label = 'label'
}

export enum FacetValueCandidateType {
  Feature = 'FEATURE',
  Option = 'OPTION',
  Tag = 'TAG'
}

/** Filter conditions for FacetValueCandidate */
export type ApiFacetValueCandidateWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiFacetValueCandidateWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiFacetValueCandidateWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiFacetValueCandidateWhereInput>>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by label */
  label?: InputMaybe<ApiStringFilter>;
};

export type ApiFacetValueCandidatesMetaInput = {
  candidateType: FacetValueCandidateType;
  facetId?: InputMaybe<Scalars['ID']['input']>;
  sourceHandles?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type ApiFacetValueCreateInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  facetId: Scalars['ID']['input'];
  handle: Scalars['String']['input'];
  kind?: InputMaybe<FacetValueKind>;
  label: Scalars['String']['input'];
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  sourceValueIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  swatchId?: InputMaybe<Scalars['ID']['input']>;
};

export type ApiFacetValueCreatePayload = {
  __typename?: 'FacetValueCreatePayload';
  facetValue?: Maybe<ApiFacetValue>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetValueDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiFacetValueDeletePayload = {
  __typename?: 'FacetValueDeletePayload';
  deletedFacetValueId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export enum FacetValueKind {
  Group = 'GROUP',
  Source = 'SOURCE'
}

export type ApiFacetValueMergeInput = {
  facetId: Scalars['ID']['input'];
  sourceValueIds: Array<Scalars['ID']['input']>;
  targetGroupValueId?: InputMaybe<Scalars['ID']['input']>;
  targetHandle?: InputMaybe<Scalars['String']['input']>;
  targetLabel?: InputMaybe<Scalars['String']['input']>;
};

export type ApiFacetValueMergePayload = {
  __typename?: 'FacetValueMergePayload';
  facetValue?: Maybe<ApiFacetValue>;
  sourceValues: Array<ApiFacetValue>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetValueUnmergeInput = {
  sourceValueIds: Array<Scalars['ID']['input']>;
};

export type ApiFacetValueUnmergePayload = {
  __typename?: 'FacetValueUnmergePayload';
  affectedGroupValues: Array<ApiFacetValue>;
  sourceValues: Array<ApiFacetValue>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetValueUpdateInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  handle?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  swatchId?: InputMaybe<Scalars['ID']['input']>;
};

export type ApiFacetValueUpdatePayload = {
  __typename?: 'FacetValueUpdatePayload';
  facetValue?: Maybe<ApiFacetValue>;
  userErrors: Array<ApiGenericUserError>;
};

/** A file represents a stored media asset. */
export type ApiFile = ApiNode & {
  __typename?: 'File';
  /** Alt text for accessibility. */
  altText?: Maybe<Scalars['String']['output']>;
  /** The date and time when the file was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the file was deleted (soft delete). */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Deletion error code, if any. */
  deletionErrorCode?: Maybe<Scalars['String']['output']>;
  /** Current deletion state (ACTIVE, SOFT_DELETED, DELETING). */
  deletionState: Scalars['String']['output'];
  /** Image/video dimensions (null if not applicable). */
  dimensions?: Maybe<ApiMediaDimensions>;
  /** Duration in milliseconds (for video/audio). */
  durationMs?: Maybe<Scalars['Int']['output']>;
  /** File extension. */
  ext?: Maybe<Scalars['String']['output']>;
  /** External media data (for YouTube, Vimeo, etc). */
  externalData?: Maybe<ApiExternalMediaData>;
  /** The date and time when the last deletion error occurred. */
  failedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The globally unique ID of the file. */
  id: Scalars['ID']['output'];
  /** Whether the file has been processed. */
  isProcessed: Scalars['Boolean']['output'];
  /** Last deletion error details. */
  lastDeletionError?: Maybe<Scalars['String']['output']>;
  /** Additional metadata. */
  meta?: Maybe<Scalars['JSON']['output']>;
  /** MIME type. */
  mimeType?: Maybe<Scalars['String']['output']>;
  /** Original filename from upload. */
  originalName?: Maybe<Scalars['String']['output']>;
  /** Provider type (s3, youtube, vimeo, url, local). */
  provider: FileProvider;
  /** S3-specific data (only for S3 provider). */
  s3Data?: Maybe<ApiS3ObjectData>;
  /** Size in bytes (0 for external providers). */
  sizeBytes: Scalars['BigInt']['output'];
  /** Source URL (for files uploaded from URL). */
  sourceUrl?: Maybe<Scalars['String']['output']>;
  /** The date and time when the file was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Public URL to access file. */
  url: Scalars['String']['output'];
  /** Usage summary for this file. */
  usage: ApiFileUsageSummary;
};

export type ApiFileClearErrorInput = {
  /** The ID of the file to clear deletion error for. */
  id: Scalars['ID']['input'];
};

export type ApiFileClearErrorPayload = {
  __typename?: 'FileClearErrorPayload';
  /** The file with cleared deletion error. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** A connection to a list of File items. */
export type ApiFileConnection = {
  __typename?: 'FileConnection';
  /** A list of edges. */
  edges: Array<ApiFileEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of files. */
  totalCount: Scalars['Int']['output'];
};

/** Relay-style pagination input for File */
export type ApiFileConnectionInput = {
  /** Returns items after this cursor */
  after?: InputMaybe<Scalars['String']['input']>;
  /** Returns items before this cursor */
  before?: InputMaybe<Scalars['String']['input']>;
  /** Returns the first n items */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Returns the last n items */
  last?: InputMaybe<Scalars['Int']['input']>;
  /** Sort order */
  orderBy?: InputMaybe<Array<ApiFileOrderByInput>>;
  /** Filter conditions */
  where?: InputMaybe<ApiFileWhereInput>;
};

/**
 * Input for creating an external media file (YouTube, Vimeo, etc).
 * Store context is determined from x-store-name header.
 */
export type ApiFileCreateExternalInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars['String']['input']>;
  /** Duration in milliseconds. */
  durationMs?: InputMaybe<Scalars['Int']['input']>;
  /** External ID (YouTube video ID, Vimeo ID, etc). */
  externalId: Scalars['String']['input'];
  /** Image height in pixels. */
  height?: InputMaybe<Scalars['Int']['input']>;
  /** Idempotency key for deduplication. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  /** Title/name of the media. */
  originalName?: InputMaybe<Scalars['String']['input']>;
  /** Provider type. */
  provider: FileProvider;
  /** Provider-specific metadata. */
  providerMeta?: InputMaybe<Scalars['JSON']['input']>;
  /** Thumbnail URL. */
  thumbnailUrl?: InputMaybe<Scalars['String']['input']>;
  /** Public URL to access the media. */
  url: Scalars['String']['input'];
  /** Image width in pixels. */
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** Payload for external file creation. */
export type ApiFileCreateExternalPayload = {
  __typename?: 'FileCreateExternalPayload';
  /** The created file. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for deleting a file. */
export type ApiFileDeleteInput = {
  /** The ID of the file to delete. */
  id: Scalars['ID']['input'];
  /** Whether to permanently delete the file (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ApiFileDeleteManyInput = {
  /** The IDs of files to delete. */
  ids: Array<Scalars['ID']['input']>;
  /** Whether to permanently delete the files (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ApiFileDeleteManyPayload = {
  __typename?: 'FileDeleteManyPayload';
  /** Files that were eligible and transitioned to SOFT_DELETED. */
  acceptedIds: Array<Scalars['ID']['output']>;
  /** Files for which hard delete workflow was started. */
  startedHardDeleteIds: Array<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Payload for file deletion. */
export type ApiFileDeletePayload = {
  __typename?: 'FileDeletePayload';
  /** The ID of the deleted file. */
  deletedFileId?: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in a File connection. */
export type ApiFileEdge = {
  __typename?: 'FileEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiFile;
};

/** Ordering configuration for File */
export type ApiFileOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: FileOrderField;
};

/** Fields available for sorting File */
export enum FileOrderField {
  /** Sort by altText */
  AltText = 'altText',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by durationMs */
  DurationMs = 'durationMs',
  /** Sort by ext */
  Ext = 'ext',
  /** Sort by height */
  Height = 'height',
  /** Sort by id */
  Id = 'id',
  /** Sort by idempotencyKey */
  IdempotencyKey = 'idempotencyKey',
  /** Sort by isProcessed */
  IsProcessed = 'isProcessed',
  /** Sort by meta */
  Meta = 'meta',
  /** Sort by mimeType */
  MimeType = 'mimeType',
  /** Sort by originalName */
  OriginalName = 'originalName',
  /** Sort by provider */
  Provider = 'provider',
  /** Sort by sizeBytes */
  SizeBytes = 'sizeBytes',
  /** Sort by sourceUrl */
  SourceUrl = 'sourceUrl',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by url */
  Url = 'url',
  /** Sort by width */
  Width = 'width'
}

/** Provider type for files. */
export enum FileProvider {
  /** Local file storage */
  Local = 'LOCAL',
  /** File stored in S3 */
  S3 = 'S3',
  /** External URL */
  Url = 'URL',
  /** Vimeo video */
  Vimeo = 'VIMEO',
  /** YouTube video */
  Youtube = 'YOUTUBE'
}

export type ApiFileRestoreInput = {
  /** The ID of the file to restore. */
  id: Scalars['ID']['input'];
};

export type ApiFileRestoreManyInput = {
  /** The IDs of files to restore. */
  ids: Array<Scalars['ID']['input']>;
};

export type ApiFileRestoreManyPayload = {
  __typename?: 'FileRestoreManyPayload';
  /** Files that were successfully restored. */
  restoredIds: Array<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFileRestorePayload = {
  __typename?: 'FileRestorePayload';
  /** The restored file. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for updating a file. */
export type ApiFileUpdateInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars['String']['input']>;
  /** The file ID. */
  id: Scalars['ID']['input'];
  /** Additional metadata. */
  meta?: InputMaybe<Scalars['JSON']['input']>;
  /** Original name. */
  originalName?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for file update. */
export type ApiFileUpdatePayload = {
  __typename?: 'FileUpdatePayload';
  /** The updated file. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/**
 * Input for uploading a file from URL.
 * Store context is determined from x-store-name header.
 */
export type ApiFileUploadFromUrlInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars['String']['input']>;
  /** Idempotency key for deduplication. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  /** URL to fetch the file from. */
  sourceUrl: Scalars['String']['input'];
};

/**
 * Input for uploading a file via multipart form data.
 * Store context is determined from x-store-name header.
 */
export type ApiFileUploadMultipartInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars['String']['input']>;
  /** The file to upload. */
  file: Scalars['Upload']['input'];
  /** Idempotency key for deduplication. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for file upload. */
export type ApiFileUploadPayload = {
  __typename?: 'FileUploadPayload';
  /** The uploaded file. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFileUsageCount = {
  __typename?: 'FileUsageCount';
  /** Number of unique entities referencing the file. */
  count: Scalars['Int']['output'];
  /** Entity type (variant, user, organization, etc). */
  entityType: Scalars['String']['output'];
};

export type ApiFileUsageSummary = {
  __typename?: 'FileUsageSummary';
  /** Usage breakdown by entity type. */
  byEntity: Array<ApiFileUsageCount>;
  /** Whether the file is active (not soft-deleted). */
  fileActive: Scalars['Boolean']['output'];
  /** Total number of unique entities referencing the file. */
  totalCount: Scalars['Int']['output'];
};

/** Filter conditions for File */
export type ApiFileWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiFileWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiFileWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiFileWhereInput>>;
  /** Filter by altText */
  altText?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by durationMs */
  durationMs?: InputMaybe<ApiIntFilter>;
  /** Filter by ext */
  ext?: InputMaybe<ApiStringFilter>;
  /** Filter by height */
  height?: InputMaybe<ApiIntFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by idempotencyKey */
  idempotencyKey?: InputMaybe<ApiStringFilter>;
  /** Filter by isProcessed */
  isProcessed?: InputMaybe<ApiBooleanFilter>;
  /** Filter by meta */
  meta?: InputMaybe<ApiStringFilter>;
  /** Filter by mimeType */
  mimeType?: InputMaybe<ApiStringFilter>;
  /** Filter by originalName */
  originalName?: InputMaybe<ApiStringFilter>;
  /** Filter by provider */
  provider?: InputMaybe<ApiStringFilter>;
  /** Filter by sizeBytes */
  sizeBytes?: InputMaybe<ApiIntFilter>;
  /** Filter by sourceUrl */
  sourceUrl?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by url */
  url?: InputMaybe<ApiStringFilter>;
  /** Filter by width */
  width?: InputMaybe<ApiIntFilter>;
};

/** Filter operators for Float fields */
export type ApiFloatFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['Float']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['Float']['input']>;
  /** Greater than */
  _gt?: InputMaybe<Scalars['Float']['input']>;
  /** Greater than or equal */
  _gte?: InputMaybe<Scalars['Float']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['Float']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than */
  _lt?: InputMaybe<Scalars['Float']['input']>;
  /** Less than or equal */
  _lte?: InputMaybe<Scalars['Float']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Float']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['Float']['input']>>;
};

/** A generic user error type for mutation responses. */
export type ApiGenericUserError = ApiUserError & {
  __typename?: 'GenericUserError';
  /** Machine-readable error code */
  code?: Maybe<Scalars['String']['output']>;
  /** Path to the field that caused the error */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** Human-readable error message */
  message: Scalars['String']['output'];
};

/** Filter operators for ID fields */
export type ApiIdFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars['ID']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['ID']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type ApiInstalledApp = {
  __typename?: 'InstalledApp';
  appCode: Scalars['String']['output'];
  baseURL: Scalars['String']['output'];
  domain: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  meta?: Maybe<Scalars['JSON']['output']>;
  storeID: Scalars['String']['output'];
};

/** Filter operators for Int fields */
export type ApiIntFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['Int']['input']>;
  /** Greater than */
  _gt?: InputMaybe<Scalars['Int']['input']>;
  /** Greater than or equal */
  _gte?: InputMaybe<Scalars['Int']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than */
  _lt?: InputMaybe<Scalars['Int']['input']>;
  /** Less than or equal */
  _lte?: InputMaybe<Scalars['Int']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Int']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['Int']['input']>>;
};

export type ApiInventoryAlertThreshold = {
  __typename?: 'InventoryAlertThreshold';
  method: ThresholdMethod;
  minimumStock: Scalars['Int']['output'];
};

export type ApiInventoryBackorder = {
  __typename?: 'InventoryBackorder';
  etaAvgDays?: Maybe<Scalars['Float']['output']>;
  quantity: Scalars['Int']['output'];
};

/**
 * InventoryItem represents the inventory-specific data for a variant.
 * Each catalog variant can have a corresponding InventoryItem.
 */
export type ApiInventoryItem = ApiNode & {
  __typename?: 'InventoryItem';
  /** Whether to continue selling when out of stock */
  continueSellingWhenOutOfStock: Scalars['Boolean']['output'];
  /** When this item was created */
  createdAt: Scalars['DateTime']['output'];
  /** Global ID (Relay) */
  id: Scalars['ID']['output'];
  /** SKU code */
  sku?: Maybe<Scalars['String']['output']>;
  /** Stock levels across warehouses */
  stock: Array<ApiWarehouseStock>;
  /** Total quantity available across all warehouses */
  totalAvailable: Scalars['Int']['output'];
  /** Whether to track inventory for this item */
  trackInventory: Scalars['Boolean']['output'];
  /** Current unit cost */
  unitCost?: Maybe<ApiInventoryItemCost>;
  /** When this item was last updated */
  updatedAt: Scalars['DateTime']['output'];
  /** Catalog variant entity */
  variant: ApiVariant;
  /** Reference to Catalog.Variant */
  variantId: Scalars['ID']['output'];
};

export type ApiInventoryItemConnection = {
  __typename?: 'InventoryItemConnection';
  edges: Array<ApiInventoryItemEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiInventoryItemCost = {
  __typename?: 'InventoryItemCost';
  /** Cost in minor units (cents) */
  amountMinor: Scalars['BigInt']['output'];
  /** Currency code */
  currency: Scalars['String']['output'];
  /** Effective from date */
  effectiveFrom: Scalars['DateTime']['output'];
};

export type ApiInventoryItemCostInput = {
  amountMinor: Scalars['BigInt']['input'];
  currency: Scalars['String']['input'];
};

export type ApiInventoryItemEdge = {
  __typename?: 'InventoryItemEdge';
  cursor: Scalars['String']['output'];
  node: ApiInventoryItem;
};

/** Inventory tracking settings for product creation. */
export type ApiInventoryItemInput = {
  /** Allow sales when stock is zero. */
  continueSellingWhenOutOfStock?: InputMaybe<Scalars['Boolean']['input']>;
  /** Stock Keeping Unit. */
  sku?: InputMaybe<Scalars['String']['input']>;
  /** Whether to track inventory for this product. */
  tracked: Scalars['Boolean']['input'];
};

export type ApiInventoryItemInventoryItemsMetaInput = {
  warehouseScope?: InputMaybe<ApiInventoryItemWarehouseScopeInput>;
};

export type ApiInventoryItemOrderByInput = {
  direction: SortDirection;
  field: InventoryItemOrderField;
};

export enum InventoryItemOrderField {
  AvailableForSale = 'availableForSale',
  Id = 'id',
  ProductName = 'productName',
  QuantityOnHand = 'quantityOnHand',
  ReservedQuantity = 'reservedQuantity',
  Sku = 'sku',
  UnavailableQuantity = 'unavailableQuantity',
  UpdatedAt = 'updatedAt',
  VariantId = 'variantId'
}

export type ApiInventoryItemStockInput = {
  onHand: Scalars['Int']['input'];
  unavailable?: InputMaybe<Scalars['Int']['input']>;
  warehouseId: Scalars['ID']['input'];
};

export type ApiInventoryItemUpdateInput = {
  /** Whether to continue selling when out of stock */
  continueSellingWhenOutOfStock?: InputMaybe<Scalars['Boolean']['input']>;
  /** The inventory item ID to update */
  id: Scalars['ID']['input'];
  /** New SKU value */
  sku?: InputMaybe<Scalars['String']['input']>;
  /** Stock update for a specific warehouse */
  stock?: InputMaybe<ApiInventoryItemStockInput>;
  /** Whether to track inventory */
  trackInventory?: InputMaybe<Scalars['Boolean']['input']>;
  /** Unit cost update */
  unitCost?: InputMaybe<ApiInventoryItemCostInput>;
};

export type ApiInventoryItemUpdatePayload = {
  __typename?: 'InventoryItemUpdatePayload';
  /** Updated inventory item */
  inventoryItem?: Maybe<ApiInventoryItem>;
  /** List of errors */
  userErrors: Array<ApiGenericUserError>;
};

export type ApiInventoryItemWarehouseScopeInput = {
  mode: InventoryItemWarehouseScopeMode;
  referenceIds: Array<Scalars['ID']['input']>;
};

export enum InventoryItemWarehouseScopeMode {
  Exclude = 'EXCLUDE',
  Include = 'INCLUDE'
}

export type ApiInventoryItemWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiInventoryItemWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiInventoryItemWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiInventoryItemWhereInput>>;
  /** Filter by available for sale quantity in the selected warehouse scope */
  availableForSale?: InputMaybe<ApiIntFilter>;
  /** Filter by inventory item ID */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by product ID */
  productId?: InputMaybe<ApiIdFilter>;
  /** Filter by product name in the current locale */
  productName?: InputMaybe<ApiStringFilter>;
  /** Filter by quantity on hand in the selected warehouse scope */
  quantityOnHand?: InputMaybe<ApiIntFilter>;
  /** Filter by reserved quantity in the selected warehouse scope */
  reservedQuantity?: InputMaybe<ApiIntFilter>;
  /** Filter by SKU */
  sku?: InputMaybe<ApiStringFilter>;
  /** Filter by trackInventory */
  trackInventory?: InputMaybe<ApiBooleanFilter>;
  /** Filter by unavailable quantity in the selected warehouse scope */
  unavailableQuantity?: InputMaybe<ApiIntFilter>;
  /** Filter by variant ID */
  variantId?: InputMaybe<ApiIdFilter>;
};

export type ApiInventoryMutation = {
  __typename?: 'InventoryMutation';
  warehouseCreate: ApiWarehouseCreatePayload;
  warehouseDelete: ApiWarehouseDeletePayload;
  warehouseStockCreate: ApiWarehouseStockCreatePayload;
  warehouseStockDelete: ApiWarehouseStockDeletePayload;
  warehouseUpdate: ApiWarehouseUpdatePayload;
};


export type ApiInventoryMutationWarehouseCreateArgs = {
  input: ApiWarehouseCreateInput;
};


export type ApiInventoryMutationWarehouseDeleteArgs = {
  input: ApiWarehouseDeleteInput;
};


export type ApiInventoryMutationWarehouseStockCreateArgs = {
  input: ApiWarehouseStockCreateInput;
};


export type ApiInventoryMutationWarehouseStockDeleteArgs = {
  input: ApiWarehouseStockDeleteInput;
};


export type ApiInventoryMutationWarehouseUpdateArgs = {
  input: ApiWarehouseUpdateInput;
};

export type ApiInventoryQuantities = {
  __typename?: 'InventoryQuantities';
  availableForSale: Scalars['Int']['output'];
  onHand: Scalars['Int']['output'];
  reserved: Scalars['Int']['output'];
  unavailable: Scalars['Int']['output'];
};

export type ApiInventoryQuery = {
  __typename?: 'InventoryQuery';
  /** Get an inventory item by ID */
  inventoryItem?: Maybe<ApiInventoryItem>;
  /** Get an inventory item by variant ID */
  inventoryItemByVariant?: Maybe<ApiInventoryItem>;
  /** Get inventory items with Relay-style pagination */
  inventoryItems: ApiInventoryItemConnection;
  /** Get a node by its global ID */
  node?: Maybe<ApiNode>;
  /** Get multiple nodes by their global IDs */
  nodes: Array<Maybe<ApiNode>>;
  /** Get a warehouse by ID */
  warehouse?: Maybe<ApiWarehouse>;
  /** Get variants that can still be assigned to the selected warehouse */
  warehouseAssignableVariants: ApiVariantConnection;
  /** Get all warehouses */
  warehouses: ApiWarehouseConnection;
};


export type ApiInventoryQueryInventoryItemArgs = {
  id: Scalars['ID']['input'];
};


export type ApiInventoryQueryInventoryItemByVariantArgs = {
  variantId: Scalars['ID']['input'];
};


export type ApiInventoryQueryInventoryItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ApiInventoryItemInventoryItemsMetaInput>;
  orderBy?: InputMaybe<Array<ApiInventoryItemOrderByInput>>;
  where?: InputMaybe<ApiInventoryItemWhereInput>;
};


export type ApiInventoryQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type ApiInventoryQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiInventoryQueryWarehouseArgs = {
  id: Scalars['ID']['input'];
};


export type ApiInventoryQueryWarehouseAssignableVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiWarehouseAssignableVariantOrderByInput>>;
  warehouseId: Scalars['ID']['input'];
  where?: InputMaybe<ApiWarehouseAssignableVariantWhereInput>;
};


export type ApiInventoryQueryWarehousesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiWarehouseOrderByInput>>;
  where?: InputMaybe<ApiWarehouseWhereInput>;
};

export type ApiInventorySkuStatus = {
  __typename?: 'InventorySkuStatus';
  backorder: ApiSkuStatusMetric;
  lowStock: ApiSkuStatusMetric;
  outOfStock: ApiSkuStatusMetric;
  total: Scalars['Int']['output'];
};

export type ApiLabel = {
  __typename?: 'Label';
  id: Scalars['ID']['output'];
};

export type ApiListing = {
  /** The global ID of the catalog listing item. */
  id: Scalars['ID']['output'];
};

/** A connection to a mixed list of catalog listing items. */
export type ApiListingConnection = {
  __typename?: 'ListingConnection';
  /** A list of edges. */
  edges: Array<ApiListingEdge>;
  /** Ordered facet items available for the current listing result. */
  facets: Array<ApiListingFacet>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of matched sellable items. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a Listing connection. */
export type ApiListingEdge = {
  __typename?: 'ListingEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiListing;
};

export type ApiListingFacet = {
  __typename?: 'ListingFacet';
  /** Stable listing facet ID. */
  id: Scalars['String']['output'];
  /** Human-readable facet label. */
  label: Scalars['String']['output'];
  /** Facet presentation/selection type. */
  type: ListingFacetType;
  /** Facet UI type. */
  uiType: FacetUiType;
  /** Ordered values for this facet in listing UI order. */
  values: Array<ApiListingFacetValue>;
};

export enum ListingFacetType {
  Boolean = 'BOOLEAN',
  List = 'LIST',
  PriceRange = 'PRICE_RANGE'
}

export type ApiListingFacetValue = {
  __typename?: 'ListingFacetValue';
  /** Number of matched sellable items for this value. */
  count: Scalars['Int']['output'];
  /** Stable listing facet value ID. */
  id: Scalars['String']['output'];
  /**
   * JSON object compatible with ListingProductFilter.
   * This keeps product, vendor, price and availability facets on one contract.
   */
  input: Scalars['JSON']['output'];
  /** Human-readable value label. */
  label: Scalars['String']['output'];
  /** Whether this value was selected in the current request. */
  selected: Scalars['Boolean']['output'];
  /** Swatch metadata for facet values that have one. */
  swatch?: Maybe<ApiFacetSwatch>;
};

export type ApiListingFacetValueFilter = {
  /** Facet stable identifier. */
  facet: Scalars['String']['input'];
  /** Facet value stable identifier. */
  value: Scalars['String']['input'];
};

export type ApiListingMutation = {
  __typename?: 'ListingMutation';
  /** Create a new facet. */
  facetCreate: ApiFacetCreatePayload;
  /** Delete a facet. */
  facetDelete: ApiFacetDeletePayload;
  /** Move a facet before or after another facet. */
  facetMove: ApiFacetMovePayload;
  /** Rebalance facet lexo ranks. */
  facetRebalance: ApiFacetRebalancePayload;
  /**
   * Atomically replace scopes for multiple facets.
   * No updates are applied when any input item is invalid.
   */
  facetScopesUpdate: ApiFacetScopesUpdatePayload;
  /** Create a new facet swatch. */
  facetSwatchCreate: ApiFacetSwatchCreatePayload;
  /** Delete a facet swatch. */
  facetSwatchDelete: ApiFacetSwatchDeletePayload;
  /** Update an existing facet swatch. */
  facetSwatchUpdate: ApiFacetSwatchUpdatePayload;
  /** Update an existing facet. */
  facetUpdate: ApiFacetUpdatePayload;
  /** Create a new facet value. */
  facetValueCreate: ApiFacetValueCreatePayload;
  /** Delete a facet value. */
  facetValueDelete: ApiFacetValueDeletePayload;
  /**
   * Attach source facet values to an existing or newly-created group value.
   * This is the only mutation that merges source values into a group value.
   */
  facetValueMerge: ApiFacetValueMergePayload;
  /**
   * Detach source facet values from their group value and make them root values.
   * This is the only mutation that unmerges source values.
   */
  facetValueUnmerge: ApiFacetValueUnmergePayload;
  /** Update an existing facet value. */
  facetValueUpdate: ApiFacetValueUpdatePayload;
  /** Search configuration mutation namespace. */
  search: ApiListingSearchMutation;
};


export type ApiListingMutationFacetCreateArgs = {
  input: ApiFacetCreateInput;
};


export type ApiListingMutationFacetDeleteArgs = {
  input: ApiFacetDeleteInput;
};


export type ApiListingMutationFacetMoveArgs = {
  input: ApiFacetMoveInput;
};


export type ApiListingMutationFacetRebalanceArgs = {
  input: ApiFacetRebalanceInput;
};


export type ApiListingMutationFacetScopesUpdateArgs = {
  input: ApiFacetScopesUpdateInput;
};


export type ApiListingMutationFacetSwatchCreateArgs = {
  input: ApiFacetSwatchCreateInput;
};


export type ApiListingMutationFacetSwatchDeleteArgs = {
  input: ApiFacetSwatchDeleteInput;
};


export type ApiListingMutationFacetSwatchUpdateArgs = {
  input: ApiFacetSwatchUpdateInput;
};


export type ApiListingMutationFacetUpdateArgs = {
  input: ApiFacetUpdateInput;
};


export type ApiListingMutationFacetValueCreateArgs = {
  input: ApiFacetValueCreateInput;
};


export type ApiListingMutationFacetValueDeleteArgs = {
  input: ApiFacetValueDeleteInput;
};


export type ApiListingMutationFacetValueMergeArgs = {
  input: ApiFacetValueMergeInput;
};


export type ApiListingMutationFacetValueUnmergeArgs = {
  input: ApiFacetValueUnmergeInput;
};


export type ApiListingMutationFacetValueUpdateArgs = {
  input: ApiFacetValueUpdateInput;
};

export type ApiListingOrderByInput = {
  /** Sort key for the listing request. */
  by: ListingSortBy;
  /** Sort direction. Ignored for MANUAL and RELEVANCE. */
  direction?: InputMaybe<ListingSortDirection>;
};

export type ApiListingPriceRangeFilter = {
  /** Maximum price amount in minor units. */
  max?: InputMaybe<Scalars['BigInt']['input']>;
  /** Minimum price amount in minor units. */
  min?: InputMaybe<Scalars['BigInt']['input']>;
};

export type ApiListingProductFilter = {
  /** Filter on if the listing item is available. */
  available?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by product price range. */
  price?: InputMaybe<ApiListingPriceRangeFilter>;
  /** Filter by product-level listing facet value. */
  productFacet?: InputMaybe<ApiListingFacetValueFilter>;
  /** Filter by product vendor. */
  productVendor?: InputMaybe<Scalars['String']['input']>;
  /** Filter by product tag. */
  tag?: InputMaybe<Scalars['String']['input']>;
  /** Filter by variant-level listing facet value. */
  variantFacet?: InputMaybe<ApiListingFacetValueFilter>;
  /** Filter by variant option. */
  variantOption?: InputMaybe<ApiListingVariantOptionFilter>;
};

export type ApiListingQuery = {
  __typename?: 'ListingQuery';
  /** Get a facet by ID. */
  facet?: Maybe<ApiFacet>;
  /** Get available facet source candidates for create flow. */
  facetSourceCandidates: ApiFacetSourceCandidateConnection;
  /** Get a facet swatch by ID. */
  facetSwatch?: Maybe<ApiFacetSwatch>;
  /** Get all facet swatches. */
  facetSwatches: Array<ApiFacetSwatch>;
  /** Get a facet value by ID. */
  facetValue?: Maybe<ApiFacetValue>;
  /** Get available facet source value candidates for create and edit flows. */
  facetValueCandidates: ApiFacetValueCandidateConnection;
  /** Get all facet values for a specific facet. */
  facetValues: Array<ApiFacetValue>;
  /** Get all facets. */
  facets: Array<ApiFacet>;
  /**
   * Get ordered listing structure for Admin.
   *
   * Listing service returns listing-owned order, pagination, counts, aggregates,
   * and canonical entity references only. Entity details are resolved by owning
   * subgraphs through federation.
   */
  listing: ApiListingConnection;
  /** Get a node by its global ID. */
  node?: Maybe<ApiNode>;
  /** Get multiple nodes by their global IDs. */
  nodes: Array<Maybe<ApiNode>>;
  /** Search configuration and diagnostics namespace. */
  search: ApiListingSearchQuery;
};


export type ApiListingQueryFacetArgs = {
  id: Scalars['ID']['input'];
};


export type ApiListingQueryFacetSourceCandidatesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiFacetSourceCandidateOrderByInput>>;
  where?: InputMaybe<ApiFacetSourceCandidateWhereInput>;
};


export type ApiListingQueryFacetSwatchArgs = {
  id: Scalars['ID']['input'];
};


export type ApiListingQueryFacetValueArgs = {
  id: Scalars['ID']['input'];
};


export type ApiListingQueryFacetValueCandidatesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta: ApiFacetValueCandidatesMetaInput;
  orderBy?: InputMaybe<Array<ApiFacetValueCandidateOrderByInput>>;
  where?: InputMaybe<ApiFacetValueCandidateWhereInput>;
};


export type ApiListingQueryFacetValuesArgs = {
  facetId: Scalars['ID']['input'];
};


export type ApiListingQueryListingArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  currency?: InputMaybe<CurrencyCode>;
  facets?: InputMaybe<Array<ApiListingProductFilter>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  locale?: InputMaybe<LocaleCode>;
  orderBy?: InputMaybe<ApiListingOrderByInput>;
  query?: InputMaybe<Scalars['String']['input']>;
  scope?: InputMaybe<ApiListingScopeInput>;
};


export type ApiListingQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type ApiListingQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};

export type ApiListingScopeInput = {
  /** Category global ID. Required when kind is CATEGORY. */
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  /** Scope kind for the listing request. */
  kind: ListingScopeKind;
};

export enum ListingScopeKind {
  Category = 'CATEGORY',
  Search = 'SEARCH'
}

export type ApiListingSearchMutation = {
  __typename?: 'ListingSearchMutation';
  productBoostCreate: ApiSearchProductBoostPayload;
  productBoostDelete: ApiSearchProductBoostPayload;
  productBoostUpdate: ApiSearchProductBoostPayload;
  /** Update the store-level search settings. */
  settingsUpdate: ApiSearchSettingsUpdatePayload;
  synonymGroupCreate: ApiSearchSynonymGroupPayload;
  synonymGroupDelete: ApiSearchSynonymGroupPayload;
  synonymGroupUpdate: ApiSearchSynonymGroupPayload;
};


export type ApiListingSearchMutationProductBoostCreateArgs = {
  input: ApiSearchProductBoostCreateInput;
};


export type ApiListingSearchMutationProductBoostDeleteArgs = {
  input: ApiSearchConfigurationDeleteInput;
};


export type ApiListingSearchMutationProductBoostUpdateArgs = {
  input: ApiSearchProductBoostUpdateInput;
};


export type ApiListingSearchMutationSettingsUpdateArgs = {
  expectedVersion: Scalars['Int']['input'];
  operations: ApiSearchSettingsOperationsInput;
};


export type ApiListingSearchMutationSynonymGroupCreateArgs = {
  input: ApiSearchSynonymGroupCreateInput;
};


export type ApiListingSearchMutationSynonymGroupDeleteArgs = {
  input: ApiSearchConfigurationDeleteInput;
};


export type ApiListingSearchMutationSynonymGroupUpdateArgs = {
  input: ApiSearchSynonymGroupUpdateInput;
};

export type ApiListingSearchQuery = {
  __typename?: 'ListingSearchQuery';
  /** Explain the canonical request-level search plan and its candidate membership. */
  explain: ApiSearchExplain;
  productBoost?: Maybe<ApiSearchProductBoost>;
  productBoosts: ApiSearchProductBoostConnection;
  /** Current search settings for the selected store, if initialized. */
  settings?: Maybe<ApiSearchSettings>;
  synonymGroup?: Maybe<ApiSearchSynonymGroup>;
  synonymGroups: ApiSearchSynonymGroupConnection;
};


export type ApiListingSearchQueryExplainArgs = {
  locale: LocaleCode;
  query: Scalars['String']['input'];
};


export type ApiListingSearchQueryProductBoostArgs = {
  id: Scalars['ID']['input'];
};


export type ApiListingSearchQueryProductBoostsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ApiSearchProductBoostsMetaInput>;
  orderBy?: InputMaybe<Array<ApiSearchProductBoostOrderByInput>>;
  where?: InputMaybe<ApiSearchProductBoostWhereInput>;
};


export type ApiListingSearchQuerySynonymGroupArgs = {
  id: Scalars['ID']['input'];
};


export type ApiListingSearchQuerySynonymGroupsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiSearchSynonymGroupOrderByInput>>;
  where?: InputMaybe<ApiSearchSynonymGroupWhereInput>;
};

export enum ListingSortBy {
  Created = 'CREATED',
  Manual = 'MANUAL',
  Name = 'NAME',
  Newest = 'NEWEST',
  Price = 'PRICE',
  Relevance = 'RELEVANCE'
}

export enum ListingSortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export type ApiListingVariantOptionFilter = {
  /** Variant option name. */
  name: Scalars['String']['input'];
  /** Variant option value. */
  value: Scalars['String']['input'];
};

/** Locale configuration for the project */
export type ApiLocale = {
  __typename?: 'Locale';
  /** BCP 47 locale code */
  code: LocaleCode;
  /** Whether this locale is currently active for the project */
  isActive: Scalars['Boolean']['output'];
  /** Display name of the locale */
  name: Scalars['String']['output'];
};

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

/** Input for creating a new locale */
export type ApiLocaleCreateInput = {
  /** BCP 47 locale code to add */
  code: LocaleCode;
  /** Whether the locale should be active upon creation */
  isActive: Scalars['Boolean']['input'];
};

/** Payload returned after creating a locale */
export type ApiLocaleCreatePayload = {
  __typename?: 'LocaleCreatePayload';
  /** The newly created locale, null if creation failed */
  locale?: Maybe<ApiLocale>;
  /** List of errors that occurred during creation */
  userErrors: Array<ApiUserError>;
};

/** Input for deleting a locale */
export type ApiLocaleDeleteInput = {
  /** BCP 47 locale code to delete */
  code: LocaleCode;
};

/** Payload returned after deleting a locale */
export type ApiLocaleDeletePayload = {
  __typename?: 'LocaleDeletePayload';
  /** The code of the deleted locale, null if deletion failed */
  deletedLocaleCode?: Maybe<LocaleCode>;
  /** List of errors that occurred during deletion */
  userErrors: Array<ApiUserError>;
};

/** Input for setting the default locale */
export type ApiLocaleSetDefaultInput = {
  /** BCP 47 locale code to set as default */
  locale: LocaleCode;
};

/** Payload returned after updating locale settings */
export type ApiLocaleUpdatePayload = {
  __typename?: 'LocaleUpdatePayload';
  /** Whether the update was successful */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during update */
  userErrors: Array<ApiUserError>;
};

/** Image/video dimensions. */
export type ApiMediaDimensions = {
  __typename?: 'MediaDimensions';
  /** Height in pixels. */
  height: Scalars['Int']['output'];
  /** Width in pixels. */
  width: Scalars['Int']['output'];
};

export type ApiMediaMutation = {
  __typename?: 'MediaMutation';
  /**
   * Upload avatar or logo for an entity (user profile or organization).
   * The file is stored in the entity's asset group.
   */
  avatarUpload: ApiAvatarUploadPayload;
  bucketCreate: ApiBucketCreatePayload;
  /** Clear errors for multiple files by ID. */
  fileClearError: ApiFileClearErrorPayload;
  fileCreateExternal: ApiFileCreateExternalPayload;
  fileDelete: ApiFileDeletePayload;
  /** Delete multiple files by ID. */
  fileDeleteMany: ApiFileDeleteManyPayload;
  /** Restore a single deleted file by ID. */
  fileRestore: ApiFileRestorePayload;
  /** Restore multiple deleted files by ID. */
  fileRestoreMany: ApiFileRestoreManyPayload;
  fileUpdate: ApiFileUpdatePayload;
  fileUpload: ApiFileUploadPayload;
  fileUploadFromUrl: ApiFileUploadPayload;
};


export type ApiMediaMutationAvatarUploadArgs = {
  input: ApiAvatarUploadInput;
};


export type ApiMediaMutationBucketCreateArgs = {
  input: ApiBucketCreateInput;
};


export type ApiMediaMutationFileClearErrorArgs = {
  input: ApiFileClearErrorInput;
};


export type ApiMediaMutationFileCreateExternalArgs = {
  input: ApiFileCreateExternalInput;
};


export type ApiMediaMutationFileDeleteArgs = {
  input: ApiFileDeleteInput;
};


export type ApiMediaMutationFileDeleteManyArgs = {
  input: ApiFileDeleteManyInput;
};


export type ApiMediaMutationFileRestoreArgs = {
  input: ApiFileRestoreInput;
};


export type ApiMediaMutationFileRestoreManyArgs = {
  input: ApiFileRestoreManyInput;
};


export type ApiMediaMutationFileUpdateArgs = {
  input: ApiFileUpdateInput;
};


export type ApiMediaMutationFileUploadArgs = {
  input: ApiFileUploadMultipartInput;
};


export type ApiMediaMutationFileUploadFromUrlArgs = {
  input: ApiFileUploadFromUrlInput;
};

export type ApiMediaQuery = {
  __typename?: 'MediaQuery';
  /** Get a file by ID */
  file?: Maybe<ApiFile>;
  /**
   * Get files with Relay-style pagination.
   * Store context is determined from x-store-name header.
   */
  files: ApiFileConnection;
  /** Get a node by its global ID */
  node?: Maybe<ApiNode>;
  /** Get multiple nodes by their global IDs */
  nodes: Array<Maybe<ApiNode>>;
};


export type ApiMediaQueryFileArgs = {
  id: Scalars['ID']['input'];
};


export type ApiMediaQueryFilesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiFileOrderByInput>>;
  where?: InputMaybe<ApiFileWhereInput>;
};


export type ApiMediaQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type ApiMediaQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};

/**
 * Member with role assignment.
 * Used for both org-level (domain = "org") and store-level (domain = "store:uuid").
 */
export type ApiMember = {
  __typename?: 'Member';
  /** When access was granted. */
  grantedAt: Scalars['DateTime']['output'];
  /** User who granted access. */
  grantedBy?: Maybe<ApiUser>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /**
   * Whether this member is the organization owner.
   * Owner bypasses all authorization checks within the organization.
   * Only applicable for org-level membership (domain = "org").
   */
  isOwner: Scalars['Boolean']['output'];
  /** Role name. */
  role: Scalars['String']['output'];
  /** User reference. */
  user: ApiUser;
};

/** Input for removing member's access. */
export type ApiMemberAccessRemoveInput = {
  /** Domain to remove access from. */
  domain: Scalars['String']['input'];
  /** Organization ID where the member belongs. */
  organizationId: Scalars['ID']['input'];
  /** User ID. */
  userId: Scalars['ID']['input'];
};

export type ApiMemberAccessRemovePayload = {
  __typename?: 'MemberAccessRemovePayload';
  success: Scalars['Boolean']['output'];
  userErrors: Array<ApiGenericUserError>;
};

/** Input for inviting a member to organization. */
export type ApiMemberInviteInput = {
  /** Email address of the user to invite. */
  email: Scalars['Email']['input'];
  /** Organization ID to invite the member to. */
  organizationId: Scalars['ID']['input'];
  /** Role assignments (at least one required). */
  roles: Array<ApiRoleAssignment>;
};

export type ApiMemberInvitePayload = {
  __typename?: 'MemberInvitePayload';
  member?: Maybe<ApiMember>;
  userErrors: Array<ApiGenericUserError>;
};

/** Input for removing a member from organization. */
export type ApiMemberRemoveInput = {
  /** Organization ID. */
  organizationId: Scalars['ID']['input'];
  /** User ID of the member to remove. */
  userId: Scalars['ID']['input'];
};

export type ApiMemberRemovePayload = {
  __typename?: 'MemberRemovePayload';
  removedMemberId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

/** Input for changing member's role. */
export type ApiMemberRoleChangeInput = {
  /** Domain ("org" for organization, or "store:{uuid}"). */
  domain: Scalars['String']['input'];
  /** Organization ID where the member belongs. */
  organizationId: Scalars['ID']['input'];
  /** New role name. */
  role: Scalars['String']['input'];
  /** User ID. */
  userId: Scalars['ID']['input'];
};

export type ApiMemberRoleChangePayload = {
  __typename?: 'MemberRoleChangePayload';
  member?: Maybe<ApiMember>;
  userErrors: Array<ApiGenericUserError>;
};

/**
 * Membership — universal container for members and roles.
 * Used for both Organization and Store.
 * Domain determines context: orgId for org-level, storeId for store-level.
 */
export type ApiMembership = {
  __typename?: 'Membership';
  /** Available resources for role editor (org-level only). */
  availableResources?: Maybe<Array<ApiResourceDefinition>>;
  /** Domain identifier ("org" for organization, or "store:uuid"). */
  domain: Scalars['String']['output'];
  /** All members with access to this domain. */
  members: Array<ApiMember>;
  /** Organization ID (required for casbin queries). */
  organizationId: Scalars['ID']['output'];
  /** All roles available in this organization. */
  roles: Array<ApiRole>;
};

export type ApiMutation = {
  __typename?: 'Mutation';
  appsMutation: ApiAppsMutation;
  /** Authentication mutations. */
  authMutation: ApiAuthMutation;
  /** Catalog mutation namespace for product, variant, category, and collection operations */
  catalogMutation: ApiCatalogMutation;
  /** Customers Admin mutation namespace. */
  customersMutation: ApiCustomersMutation;
  /** Inventory mutation namespace for warehouse, stock, and inventory item operations */
  inventoryMutation: ApiInventoryMutation;
  /** Listing mutation namespace. */
  listingMutation: ApiListingMutation;
  mediaMutation: ApiMediaMutation;
  orderMutation: ApiOrderMutation;
  /** Organization management mutations. */
  organizationMutation: ApiOrganizationMutation;
  /** Admin-only Reviews mutation namespace. */
  reviewsMutation: ApiReviewsMutation;
  /** Role management mutations. */
  roleMutation: ApiRoleMutation;
  /** Store-related mutations */
  storeMutation: ApiStoreMutation;
  /** User management mutations. */
  userMutation: ApiUserMutation;
};

/** The Node interface is implemented by all types that have a globally unique ID. */
export type ApiNode = {
  /** The globally unique ID of the object. */
  id: Scalars['ID']['output'];
};

/** Result of a single operation in the unified update. */
export type ApiOperationResult = {
  __typename?: 'OperationResult';
  /** Whether the operation was applied successfully. */
  applied: Scalars['Boolean']['output'];
  /** Per-request client correlation key for create operations. */
  clientMutationId?: Maybe<Scalars['String']['output']>;
  /** Entity affected by this operation. */
  entityId?: Maybe<Scalars['ID']['output']>;
  /** Errors that occurred during this operation. */
  errors: Array<ApiGenericUserError>;
  /** The type of operation. */
  type: OperationType;
};

/** Type of operation in the unified update. */
export enum OperationType {
  CategoryUpdate = 'CATEGORY_UPDATE',
  ProductCategoryUpdate = 'PRODUCT_CATEGORY_UPDATE',
  ProductFeaturesSync = 'PRODUCT_FEATURES_SYNC',
  ProductOptionsSync = 'PRODUCT_OPTIONS_SYNC',
  ProductTagUpdate = 'PRODUCT_TAG_UPDATE',
  ProductUpdate = 'PRODUCT_UPDATE',
  VariantCreate = 'VARIANT_CREATE',
  VariantDelete = 'VARIANT_DELETE',
  VariantUpdate = 'VARIANT_UPDATE'
}

/** Display type for product options in the UI. */
export enum OptionDisplayType {
  Buttons = 'BUTTONS',
  Dropdown = 'DROPDOWN',
  Swatch = 'SWATCH'
}

export type ApiOrder = {
  __typename?: 'Order';
  adminNote?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: ApiOrderActor;
  currencyCode: Scalars['String']['output'];
  customerIdentity: ApiOrderCustomerIdentity;
  customerNote?: Maybe<Scalars['String']['output']>;
  customerStatistic: ApiOrderCustomerStatistic;
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  discountTotal?: Maybe<Scalars['BigInt']['output']>;
  events: Array<ApiOrderEvent>;
  grandTotal: Scalars['BigInt']['output'];
  id: Scalars['ID']['output'];
  labels: Array<ApiLabel>;
  lines: Array<ApiOrderLine>;
  number: Scalars['BigInt']['output'];
  shippingTotal?: Maybe<Scalars['BigInt']['output']>;
  status: OrderStatus;
  subtotal: Scalars['BigInt']['output'];
  tags: Array<ApiTag>;
  taxTotal?: Maybe<Scalars['BigInt']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiOrderActor = ApiApiKey | ApiUser;

export type ApiOrderAdminNoteUpdateInput = {
  note: Scalars['String']['input'];
  orderId: Scalars['ID']['input'];
};

export type ApiOrderCancelInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  orderId: Scalars['ID']['input'];
  reason: OrderCancelReason;
};

export enum OrderCancelReason {
  Customer = 'CUSTOMER',
  Fraud = 'FRAUD',
  Inventory = 'INVENTORY',
  Other = 'OTHER',
  Staff = 'STAFF'
}

export type ApiOrderCloseInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  orderId: Scalars['ID']['input'];
};

export type ApiOrderCommentAddInput = {
  comment: Scalars['String']['input'];
  orderId: Scalars['ID']['input'];
};

export type ApiOrderCustomerIdentity = {
  __typename?: 'OrderCustomerIdentity';
  countryCode?: Maybe<CountryCode>;
  customer?: Maybe<ApiCustomer>;
  data?: Maybe<Scalars['JSON']['output']>;
  email?: Maybe<Scalars['Email']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
};

export type ApiOrderCustomerStatistic = {
  __typename?: 'OrderCustomerStatistic';
  totalAuthorizedOrders: Scalars['Int']['output'];
  totalGuestOrders: Scalars['Int']['output'];
  totalRevenue: Scalars['Int']['output'];
};

export type ApiOrderDeliveryAddress = {
  __typename?: 'OrderDeliveryAddress';
  address1: Scalars['String']['output'];
  address2?: Maybe<Scalars['String']['output']>;
  city: Scalars['String']['output'];
  countryCode: CountryCode;
  data?: Maybe<Scalars['JSON']['output']>;
  email?: Maybe<Scalars['Email']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  postalCode?: Maybe<Scalars['String']['output']>;
  provinceCode?: Maybe<Scalars['String']['output']>;
};

export type ApiOrderEvent = {
  __typename?: 'OrderEvent';
  createdAt: Scalars['DateTime']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  eventType: OrderEventType;
  id: Scalars['String']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  performedBy: ApiOrderActor;
};

export enum OrderEventType {
  OrderCreated = 'ORDER_CREATED'
}

export type ApiOrderLine = {
  __typename?: 'OrderLine';
  createdAt: Scalars['DateTime']['output'];
  discountAmount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  purchasableId: Scalars['ID']['output'];
  quantity: Scalars['Int']['output'];
  subtotalAmount: Scalars['Int']['output'];
  taxAmount?: Maybe<Scalars['Int']['output']>;
  totalAmount: Scalars['Int']['output'];
  unitComparePrice: Scalars['Int']['output'];
  unitPrice: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiOrderMutation = {
  __typename?: 'OrderMutation';
  orderAdminNoteUpdate: Scalars['Boolean']['output'];
  orderCancel: Scalars['Boolean']['output'];
  orderClose: Scalars['Boolean']['output'];
  orderCommentAdd: Scalars['Boolean']['output'];
};


export type ApiOrderMutationOrderAdminNoteUpdateArgs = {
  input: ApiOrderAdminNoteUpdateInput;
};


export type ApiOrderMutationOrderCancelArgs = {
  input: ApiOrderCancelInput;
};


export type ApiOrderMutationOrderCloseArgs = {
  input: ApiOrderCloseInput;
};


export type ApiOrderMutationOrderCommentAddArgs = {
  input: ApiOrderCommentAddInput;
};

export type ApiOrderQuery = {
  __typename?: 'OrderQuery';
  order?: Maybe<ApiOrder>;
  orders: ApiOrdersOutput;
};


export type ApiOrderQueryOrderArgs = {
  id: Scalars['ID']['input'];
};


export type ApiOrderQueryOrdersArgs = {
  input?: InputMaybe<ApiOrdersInput>;
};

export enum OrderStatus {
  Active = 'ACTIVE',
  Cancelled = 'CANCELLED',
  Closed = 'CLOSED',
  Draft = 'DRAFT'
}

export type ApiOrdersInput = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<Scalars['JSON']['input']>;
};

export type ApiOrdersOutput = {
  __typename?: 'OrdersOutput';
  data: Array<ApiOrder>;
  meta: ApiCollectionMeta;
};

/**
 * Organization - top level entity for multi-tenancy.
 * Users belong to organizations, organizations contain stores.
 */
export type ApiOrganization = ApiNode & {
  __typename?: 'Organization';
  /** Timestamp when the organization was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Display name (e.g., "Acme Corp"). */
  displayName: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Organization logo (from Media service). */
  logo?: Maybe<ApiFile>;
  /** Membership info (members + roles). Domain = orgId. */
  membership: ApiMembership;
  /** URL-friendly unique identifier. */
  name: Scalars['String']['output'];
  /** Timestamp when the organization was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** A connection to a list of Organization items. */
export type ApiOrganizationConnection = {
  __typename?: 'OrganizationConnection';
  /** A list of edges. */
  edges: Array<ApiOrganizationEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of organizations. */
  totalCount: Scalars['Int']['output'];
};

/** Input for creating an organization. */
export type ApiOrganizationCreateInput = {
  /** Display name. */
  displayName: Scalars['String']['input'];
  /** URL-friendly unique identifier. */
  name: Scalars['String']['input'];
};

export type ApiOrganizationCreatePayload = {
  __typename?: 'OrganizationCreatePayload';
  organization?: Maybe<ApiOrganization>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiOrganizationDeletePayload = {
  __typename?: 'OrganizationDeletePayload';
  deletedOrganizationId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in an Organization connection. */
export type ApiOrganizationEdge = {
  __typename?: 'OrganizationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiOrganization;
};

/** Organization mutations. */
export type ApiOrganizationMutation = {
  __typename?: 'OrganizationMutation';
  /** Remove member's access from domain. */
  memberAccessRemove: ApiMemberAccessRemovePayload;
  /** Invite member to organization with role assignments. */
  memberInvite: ApiMemberInvitePayload;
  /**
   * Remove member from organization.
   * Requires: org admin or owner.
   * Cannot remove owner (transfer ownership first).
   */
  memberRemove: ApiMemberRemovePayload;
  /**
   * Change role for a member in specific domain.
   * Owner cannot be demoted.
   */
  memberRoleChange: ApiMemberRoleChangePayload;
  /**
   * Create a new organization.
   * Current user becomes the owner.
   */
  organizationCreate: ApiOrganizationCreatePayload;
  /** Delete organization. Requires: org owner only. */
  organizationDelete: ApiOrganizationDeletePayload;
  /**
   * Update organization.
   * Requires: org admin or owner.
   */
  organizationUpdate: ApiOrganizationUpdatePayload;
  /**
   * Transfer organization ownership to another admin.
   * Only the current owner can transfer ownership.
   * New owner must have admin role in the organization.
   * Previous owner retains admin role.
   */
  ownershipTransfer: ApiOwnershipTransferPayload;
};


/** Organization mutations. */
export type ApiOrganizationMutationMemberAccessRemoveArgs = {
  input: ApiMemberAccessRemoveInput;
};


/** Organization mutations. */
export type ApiOrganizationMutationMemberInviteArgs = {
  input: ApiMemberInviteInput;
};


/** Organization mutations. */
export type ApiOrganizationMutationMemberRemoveArgs = {
  input: ApiMemberRemoveInput;
};


/** Organization mutations. */
export type ApiOrganizationMutationMemberRoleChangeArgs = {
  input: ApiMemberRoleChangeInput;
};


/** Organization mutations. */
export type ApiOrganizationMutationOrganizationCreateArgs = {
  input: ApiOrganizationCreateInput;
};


/** Organization mutations. */
export type ApiOrganizationMutationOrganizationDeleteArgs = {
  id: Scalars['ID']['input'];
};


/** Organization mutations. */
export type ApiOrganizationMutationOrganizationUpdateArgs = {
  input: ApiOrganizationUpdateInput;
};


/** Organization mutations. */
export type ApiOrganizationMutationOwnershipTransferArgs = {
  input: ApiOwnershipTransferInput;
};

/** Ordering configuration for Organization */
export type ApiOrganizationOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: OrganizationOrderField;
};

/** Fields available for sorting Organization */
export enum OrganizationOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by displayName */
  DisplayName = 'displayName',
  /** Sort by name */
  Name = 'name',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

/** Organization queries. */
export type ApiOrganizationQuery = {
  __typename?: 'OrganizationQuery';
  /**
   * Get organization by ID or name (if user has access).
   * Provide either id or name, not both.
   */
  organization?: Maybe<ApiOrganization>;
  /**
   * Get all organizations the current user has access to with cursor pagination.
   * Returns empty connection if not authenticated.
   */
  organizations: ApiOrganizationConnection;
};


/** Organization queries. */
export type ApiOrganizationQueryOrganizationArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};


/** Organization queries. */
export type ApiOrganizationQueryOrganizationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiOrganizationOrderByInput>>;
  where?: InputMaybe<ApiOrganizationWhereInput>;
};

/** Input for updating organization. */
export type ApiOrganizationUpdateInput = {
  /** New display name. */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** Organization ID. */
  id: Scalars['ID']['input'];
  /** Media file ID for the logo. Pass null to remove logo. */
  logoId?: InputMaybe<Scalars['ID']['input']>;
  /** New name (URL-friendly identifier). */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type ApiOrganizationUpdatePayload = {
  __typename?: 'OrganizationUpdatePayload';
  organization?: Maybe<ApiOrganization>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for Organization */
export type ApiOrganizationWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiOrganizationWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiOrganizationWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiOrganizationWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by displayName */
  displayName?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Input for transferring organization ownership. */
export type ApiOwnershipTransferInput = {
  /** User ID of the new owner. Must be an admin of the organization. */
  newOwnerId: Scalars['ID']['input'];
  /** Organization ID. */
  organizationId: Scalars['ID']['input'];
};

export type ApiOwnershipTransferPayload = {
  __typename?: 'OwnershipTransferPayload';
  /** Whether the transfer was successful. */
  success: Scalars['Boolean']['output'];
  userErrors: Array<ApiGenericUserError>;
};

/** Information about pagination in a connection. */
export type ApiPageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>;
};

/** Input for pricing widget query. */
export type ApiPricingWidgetInput = {
  /** Pagination: cursor after. */
  after?: InputMaybe<Scalars['String']['input']>;
  /** Currency code to filter by. */
  currency: CurrencyCode;
  /** Pagination: first N items. */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Start of the period (optional, defaults to 30 days ago). */
  from?: InputMaybe<Scalars['DateTime']['input']>;
  /** End of the period (optional, defaults to now). */
  to?: InputMaybe<Scalars['DateTime']['input']>;
  /** The variant ID to get pricing data for. */
  variantId: Scalars['ID']['input'];
};

/** Pricing widget payload with current price, cost, history and statistics. */
export type ApiPricingWidgetPayload = {
  __typename?: 'PricingWidgetPayload';
  /** Current active cost. */
  currentCostPrice?: Maybe<ApiVariantCost>;
  /** Current active price. */
  currentPrice?: Maybe<ApiVariantPrice>;
  /** Price history for the period. */
  history: ApiVariantPriceConnection;
  /** Computed statistics for the period. */
  statistics: ApiVariantPriceHistoryStatistics;
};

/** A product represents an item that can be sold. */
export type ApiProduct = ApiListing & ApiNode & {
  __typename?: 'Product';
  /** Category assignments with relationship metadata. */
  categoryAssignments: Array<ApiProductCategoryAssignment>;
  /** The date and time when the product was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the product was deleted (soft delete). */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Product description. */
  description?: Maybe<ApiRichText>;
  /** Short excerpt. */
  excerpt?: Maybe<ApiRichText>;
  /** The features of this product. */
  features: Array<ApiProductFeature>;
  /** The URL-friendly handle for the product. */
  handle: Scalars['String']['output'];
  /** The Product global ID. */
  id: Scalars['ID']['output'];
  /** Whether the product is currently published. */
  isPublished: Scalars['Boolean']['output'];
  /** Product discriminator. */
  kind: ProductKind;
  /** Media registered on this product. */
  media: Array<ApiProductMediaItem>;
  /** The options available for this product. */
  options: Array<ApiProductOption>;
  /** Current product price range in the selected currency. */
  priceRange?: Maybe<ApiProductPriceRange>;
  /** The primary category assigned to this product. */
  primaryCategory?: Maybe<ApiCategory>;
  /** The date and time when the product was published, or null if unpublished. */
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Optimistic locking revision number. Incremented on each update. */
  revision: Scalars['Int']['output'];
  /** SEO and Open Graph metadata. */
  seo?: Maybe<ApiProductSeo>;
  /** The tags associated with this product. */
  tags: Array<ApiTag>;
  /** Product title. */
  title: Scalars['String']['output'];
  /** The date and time when the product was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** The variants of this product. */
  variants: ApiVariantConnection;
  /** The total number of variants for this product. */
  variantsCount: Scalars['Int']['output'];
  /** The vendor associated with this product. */
  vendor?: Maybe<ApiVendor>;
};


/** A product represents an item that can be sold. */
export type ApiProductVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * Bulk update input - same structure as productUpdate but for multiple products.
 * Max 100 products, 500 operations total.
 */
export type ApiProductBulkUpdateInput = {
  /** List of products to update with their operations. */
  products: Array<ApiProductBulkUpdateItem>;
};

/** A single product's update within a bulk request. */
export type ApiProductBulkUpdateItem = {
  /** Expected revision for optimistic locking. If provided, fails if product was modified. */
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  /** Product-level operations. */
  operations?: InputMaybe<ApiProductUpdateInput>;
  /** The product ID to update. */
  productId: Scalars['ID']['input'];
};

/** Bulk update job with progress. */
export type ApiProductBulkUpdateJob = {
  __typename?: 'ProductBulkUpdateJob';
  /** When created. */
  createdAt: Scalars['DateTime']['output'];
  /** When finished. */
  finishedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Job ID. */
  id: Scalars['ID']['output'];
  /** Items with pagination and filtering. */
  items: ApiBulkUpdateItemConnection;
  /** Progress computed from items. */
  progress: ApiBulkUpdateJobProgress;
  /** When started running. */
  startedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Current status. */
  status: BulkUpdateJobStatus;
  /** Total products in batch. */
  totalProducts: Scalars['Int']['output'];
};


/** Bulk update job with progress. */
export type ApiProductBulkUpdateJobItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  statusFilter?: InputMaybe<Array<BulkUpdateItemStatus>>;
};

export type ApiProductBulkUpdateJobConnection = {
  __typename?: 'ProductBulkUpdateJobConnection';
  edges: Array<ApiProductBulkUpdateJobEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiProductBulkUpdateJobEdge = {
  __typename?: 'ProductBulkUpdateJobEdge';
  cursor: Scalars['String']['output'];
  node: ApiProductBulkUpdateJob;
};

/** Result of bulk update start/cancel. */
export type ApiProductBulkUpdatePayload = {
  __typename?: 'ProductBulkUpdatePayload';
  /** Created or updated job (null on validation error). */
  job?: Maybe<ApiProductBulkUpdateJob>;
  /** Validation/execution errors. */
  userErrors: Array<ApiBulkUpdateUserError>;
};

export type ApiProductCategoriesScopeInput = {
  mode: CategoryHierarchyScopeMode;
  referenceIds: Array<Scalars['ID']['input']>;
};

export type ApiProductCategoryAssignment = {
  __typename?: 'ProductCategoryAssignment';
  category: ApiCategory;
  isPrimary: Scalars['Boolean']['output'];
};

export enum ProductCategoryOperationAction {
  Add = 'ADD',
  Move = 'MOVE',
  Remove = 'REMOVE',
  SetPrimary = 'SET_PRIMARY'
}

/** Product category assignment operation for unified product updates. */
export type ApiProductCategoryOperationInput = {
  /** The assignment action to apply. */
  action: ProductCategoryOperationAction;
  /** Move this product after another product in the category listing. */
  afterProductId?: InputMaybe<Scalars['ID']['input']>;
  /** Move this product before another product in the category listing. */
  beforeProductId?: InputMaybe<Scalars['ID']['input']>;
  /** The category to update for the product. */
  categoryId: Scalars['ID']['input'];
};

/** A connection to a list of Product items. */
export type ApiProductConnection = {
  __typename?: 'ProductConnection';
  /** A list of edges. */
  edges: Array<ApiProductEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of products. */
  totalCount: Scalars['Int']['output'];
};

/** Input for product content (description, excerpt). */
export type ApiProductContentInput = {
  /** Product description in multiple formats. */
  description?: InputMaybe<ApiRichTextInput>;
  /** Short excerpt. */
  excerpt?: InputMaybe<ApiRichTextInput>;
};

/** Input for creating a product with all its data in one request. */
export type ApiProductCreateInput = {
  /** Product description. */
  description?: InputMaybe<ApiRichTextInput>;
  /** Short excerpt in multiple formats. */
  excerpt?: InputMaybe<ApiRichTextInput>;
  /** URL-friendly handle for the product. */
  handle: Scalars['String']['input'];
  /** Inventory tracking settings for the product. */
  inventoryItem?: InputMaybe<ApiInventoryItemInput>;
  /** File IDs for product media (already uploaded via mediaMutation.fileUpload). */
  mediaFileIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Product options (e.g., Color, Size). */
  options?: InputMaybe<Array<ApiProductCreateOptionInput>>;
  /** Product title. */
  title: Scalars['String']['input'];
  /** Variants to create (only enabled ones from UI). */
  variants?: InputMaybe<Array<ApiProductCreateVariantInput>>;
  /** Vendor ID to associate with the product. */
  vendorId?: InputMaybe<Scalars['ID']['input']>;
};

/** Input for creating an option during product creation. */
export type ApiProductCreateOptionInput = {
  /** How to display the option (default: DROPDOWN). */
  displayType?: InputMaybe<Scalars['String']['input']>;
  /** Display name for the option. */
  name: Scalars['String']['input'];
  /** URL-friendly slug for the option. */
  slug: Scalars['String']['input'];
  /** Sort order within the product options list. */
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  /** The values for this option. */
  values: Array<ApiProductCreateOptionValueInput>;
};

/** Input for creating an option value during product creation. */
export type ApiProductCreateOptionValueInput = {
  /** Display name for the value. */
  name: Scalars['String']['input'];
  /** URL-friendly slug for the value. */
  slug: Scalars['String']['input'];
  /** Sort order within the option values list. */
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

/** Payload for product creation. */
export type ApiProductCreatePayload = {
  __typename?: 'ProductCreatePayload';
  /** The created product. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for creating a variant during product creation. */
export type ApiProductCreateVariantInput = {
  /** Handle built from option value slugs (e.g., "red-s"). */
  handle: Scalars['String']['input'];
};

/** Input for deleting a product. */
export type ApiProductDeleteInput = {
  /** The ID of the product to delete. */
  id: Scalars['ID']['input'];
  /** Whether to permanently delete the product (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for product deletion. */
export type ApiProductDeletePayload = {
  __typename?: 'ProductDeletePayload';
  /** The ID of the deleted product. */
  deletedProductId?: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in a Product connection. */
export type ApiProductEdge = {
  __typename?: 'ProductEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiProduct;
};

/** A product feature represents either a group or an attribute. */
export type ApiProductFeature = ApiNode & {
  __typename?: 'ProductFeature';
  /** Child features. Returns empty array for attributes (isGroup = false). */
  children: Array<ApiProductFeature>;
  /** The globally unique ID of the feature. */
  id: Scalars['ID']['output'];
  /** Tree position as array: [0] for root, [0, 1] for child of first group. */
  index: Array<Scalars['Int']['output']>;
  /** Whether this feature is a group (container) or an attribute (leaf). */
  isGroup: Scalars['Boolean']['output'];
  /** Display name (from translations). */
  name: Scalars['String']['output'];
  /** Parent group, if this feature belongs to a group. */
  parent?: Maybe<ApiProductFeature>;
  /** The URL-friendly slug for this feature. */
  slug: Scalars['String']['output'];
  /** Values. Returns empty array for groups (isGroup = true). */
  values: Array<ApiProductFeatureValue>;
};

/** Input for creating a feature on a product. */
export type ApiProductFeatureCreateInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The ID of the product. */
  productId: Scalars['ID']['input'];
  /** The URL-friendly slug for the feature. */
  slug: Scalars['String']['input'];
  /** The values for this feature. */
  values: Array<ApiProductFeatureValueCreateInput>;
};

/** Payload for feature create. */
export type ApiProductFeatureCreatePayload = {
  __typename?: 'ProductFeatureCreatePayload';
  /** The created feature. */
  feature?: Maybe<ApiProductFeature>;
  /** The product with updated features. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for deleting a feature from a product. */
export type ApiProductFeatureDeleteInput = {
  /** The ID of the feature to delete. */
  id: Scalars['ID']['input'];
};

/** Payload for feature delete. */
export type ApiProductFeatureDeletePayload = {
  __typename?: 'ProductFeatureDeletePayload';
  /** The ID of the deleted feature. */
  deletedFeatureId?: Maybe<Scalars['ID']['output']>;
  /** The product with updated features. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for creating a feature during product creation. */
export type ApiProductFeatureInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the feature. */
  slug: Scalars['String']['input'];
  /** The values for this feature. */
  values: Array<ApiProductFeatureValueCreateInput>;
};

export type ApiProductFeatureSyncItemInput = {
  /**
   * Database ID. Null for new records.
   * - If provided: update existing feature
   * - If null/omitted: create new feature (backend generates ID)
   * Features in DB but not in this list will be DELETED.
   */
  id?: InputMaybe<Scalars['ID']['input']>;
  /**
   * Tree position as integer array.
   * - [0], [1], [2] for root items
   * - [0, 0], [0, 1], [1, 0] for children
   * Parent is derived: parent of [0, 1] is [0].
   * Groups must have length 1 (root only).
   */
  index: Array<Scalars['Int']['input']>;
  /** Whether this is a group (true) or attribute (false). */
  isGroup: Scalars['Boolean']['input'];
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for this feature. */
  slug: Scalars['String']['input'];
  /** Values for this feature (only when isGroup = false). */
  values?: InputMaybe<Array<ApiProductFeatureValueSyncInput>>;
};

/** Input for updating a feature. */
export type ApiProductFeatureUpdateInput = {
  /** The ID of the feature to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The URL-friendly slug for the feature. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** Nested value operations. */
  values?: InputMaybe<ApiProductFeatureValuesInput>;
};

/** Payload for feature update. */
export type ApiProductFeatureUpdatePayload = {
  __typename?: 'ProductFeatureUpdatePayload';
  /** The updated feature. */
  feature?: Maybe<ApiProductFeature>;
  /** The product with updated features. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** A value for a product feature. */
export type ApiProductFeatureValue = ApiNode & {
  __typename?: 'ProductFeatureValue';
  /** The globally unique ID of the feature value. */
  id: Scalars['ID']['output'];
  /** Position within the feature's values (0, 1, 2, ...). */
  index: Scalars['Int']['output'];
  /** Display name (from translations). */
  name: Scalars['String']['output'];
  /** The URL-friendly slug for this feature value. */
  slug: Scalars['String']['output'];
};

/** Input for creating a feature value. */
export type ApiProductFeatureValueCreateInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for this feature value. */
  slug: Scalars['String']['input'];
};

export type ApiProductFeatureValueSyncInput = {
  /** Database ID. Null for new records. */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Position within the feature's values (0, 1, 2, ...). */
  index: Scalars['Int']['input'];
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for this feature value. */
  slug: Scalars['String']['input'];
};

/** Input for updating an existing feature value. */
export type ApiProductFeatureValueUpdateInput = {
  /** The ID of the value to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The URL-friendly slug for this value. */
  slug?: InputMaybe<Scalars['String']['input']>;
};

/** Input for nested value operations in feature update. */
export type ApiProductFeatureValuesInput = {
  /** Values to create. */
  create?: InputMaybe<Array<ApiProductFeatureValueCreateInput>>;
  /** IDs of values to delete. */
  delete?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Values to update. */
  update?: InputMaybe<Array<ApiProductFeatureValueUpdateInput>>;
};

/** Sync all product features in a single transaction. */
export type ApiProductFeaturesSyncInput = {
  /** Complete list of features (replaces all existing features). */
  features: Array<ApiProductFeatureSyncItemInput>;
  /** The ID of the product. */
  productId: Scalars['ID']['input'];
};

export type ApiProductFeaturesSyncPayload = {
  __typename?: 'ProductFeaturesSyncPayload';
  /** List of all synced features with their final IDs. */
  features: Array<ApiProductFeature>;
  /** The updated product. */
  product?: Maybe<ApiProduct>;
  /** Any validation errors. */
  userErrors: Array<ApiGenericUserError>;
};

export type ApiProductInventoryWidget = {
  __typename?: 'ProductInventoryWidget';
  alertThreshold: ApiInventoryAlertThreshold;
  availableChange7d: Scalars['Int']['output'];
  backorder: ApiInventoryBackorder;
  quantities: ApiInventoryQuantities;
  skuStatus: ApiInventorySkuStatus;
};

export enum ProductKind {
  Base = 'BASE',
  Bundle = 'BUNDLE'
}

/** Input for product media. */
export type ApiProductMediaInput = {
  /** File IDs for product media. */
  fileIds: Array<Scalars['ID']['input']>;
};

/** Media registered on a product with sort order. */
export type ApiProductMediaItem = {
  __typename?: 'ProductMediaItem';
  /** The file from the Media service. */
  file: ApiFile;
  /** Sort order index (lower = first). */
  sortIndex: Scalars['Int']['output'];
};

/** A product option defines a configurable aspect of a product, such as Size or Color. */
export type ApiProductOption = ApiNode & {
  __typename?: 'ProductOption';
  /** The display type for UI rendering. */
  displayType: OptionDisplayType;
  /** The globally unique ID of the option. */
  id: Scalars['ID']['output'];
  /** Display name. */
  name: Scalars['String']['output'];
  /** The URL-friendly identifier for this option. */
  slug: Scalars['String']['output'];
  /** Sort order within the product options list. */
  sortIndex: Scalars['Int']['output'];
  /** The available values for this option. */
  values: Array<ApiProductOptionValue>;
};

/** Input for creating an option on a product. */
export type ApiProductOptionCreateInput = {
  /** The display type for UI rendering. */
  displayType: OptionDisplayType;
  /** Display name. */
  name: Scalars['String']['input'];
  /** The ID of the product (optional when creating with product). */
  productId?: InputMaybe<Scalars['ID']['input']>;
  /** The URL-friendly slug for the option. */
  slug: Scalars['String']['input'];
  /** Sort order within the product options list. */
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  /** The values for this option. */
  values: Array<ApiProductOptionValueCreateInput>;
};

/** Payload for option create. Returns the product with new variants. */
export type ApiProductOptionCreatePayload = {
  __typename?: 'ProductOptionCreatePayload';
  /** The created option. */
  option?: Maybe<ApiProductOption>;
  /** The product with updated options and variants. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for deleting an option from a product. */
export type ApiProductOptionDeleteInput = {
  /** The ID of the option to delete. */
  id: Scalars['ID']['input'];
};

/** Payload for option delete. */
export type ApiProductOptionDeletePayload = {
  __typename?: 'ProductOptionDeletePayload';
  /** The ID of the deleted option. */
  deletedOptionId?: Maybe<Scalars['ID']['output']>;
  /** The product with updated options and variants. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** A visual swatch for representing an option value. */
export type ApiProductOptionSwatch = ApiNode & {
  __typename?: 'ProductOptionSwatch';
  /** The primary color (hex code or color name). */
  colorOne?: Maybe<Scalars['String']['output']>;
  /** The secondary color for gradients. */
  colorTwo?: Maybe<Scalars['String']['output']>;
  /** The file for image-based swatches. */
  file?: Maybe<ApiFile>;
  /** The globally unique ID of the swatch. */
  id: Scalars['ID']['output'];
  /** Additional metadata for the swatch. */
  metadata?: Maybe<Scalars['JSON']['output']>;
  /** The type of swatch. */
  swatchType: SwatchType;
};

/** Input for creating/updating a swatch. */
export type ApiProductOptionSwatchInput = {
  /** The primary color (hex code or color name). */
  colorOne?: InputMaybe<Scalars['String']['input']>;
  /** The secondary color for gradients. */
  colorTwo?: InputMaybe<Scalars['String']['input']>;
  /** The file ID for image-based swatches. */
  fileId?: InputMaybe<Scalars['ID']['input']>;
  /** Additional metadata. */
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  /** The type of swatch. */
  swatchType: SwatchType;
};

/** Input for syncing a single option. */
export type ApiProductOptionSyncItemInput = {
  /** The display type for UI rendering. */
  displayType: OptionDisplayType;
  /** Existing option ID (null = create new). */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the option. */
  slug: Scalars['String']['input'];
  /** Sort order within the product options list. */
  sortIndex: Scalars['Int']['input'];
  /** The values for this option. */
  values: Array<ApiProductOptionValueSyncInput>;
};

/** Input for updating an option. */
export type ApiProductOptionUpdateInput = {
  /** The new display type. */
  displayType?: InputMaybe<OptionDisplayType>;
  /** The ID of the option to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new slug for the option. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** Sort order within the product options list. */
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  /** Nested value operations. */
  values?: InputMaybe<ApiProductOptionValuesInput>;
};

/** Payload for option update. */
export type ApiProductOptionUpdatePayload = {
  __typename?: 'ProductOptionUpdatePayload';
  /** The updated option. */
  option?: Maybe<ApiProductOption>;
  /** The product with updated options and variants. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** A value for a product option, such as "Red" for Color or "Large" for Size. */
export type ApiProductOptionValue = ApiNode & {
  __typename?: 'ProductOptionValue';
  /** The globally unique ID of the option value. */
  id: Scalars['ID']['output'];
  /** Display name. */
  name: Scalars['String']['output'];
  /** The URL-friendly identifier for this value. */
  slug: Scalars['String']['output'];
  /** Sort order within the option values list. */
  sortIndex: Scalars['Int']['output'];
  /** The visual swatch for this value (if applicable). */
  swatch?: Maybe<ApiProductOptionSwatch>;
};

/** Input for creating an option value. */
export type ApiProductOptionValueCreateInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the value. */
  slug: Scalars['String']['input'];
  /** Sort order within the option values list. */
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  /** The swatch for this value. */
  swatch?: InputMaybe<ApiProductOptionSwatchInput>;
};

/** Input for syncing a single option value. */
export type ApiProductOptionValueSyncInput = {
  /** Existing value ID (null = create new). */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the value. */
  slug: Scalars['String']['input'];
  /** Sort order within the option values list. */
  sortIndex: Scalars['Int']['input'];
  /** The swatch for this value (null to remove). */
  swatch?: InputMaybe<ApiProductOptionSwatchInput>;
};

/** Input for updating an existing option value. */
export type ApiProductOptionValueUpdateInput = {
  /** The ID of the value to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new slug for the value. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** Sort order within the option values list. */
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  /** The swatch for this value. */
  swatch?: InputMaybe<ApiProductOptionSwatchInput>;
};

/** Input for nested value operations in option update. */
export type ApiProductOptionValuesInput = {
  /** Values to create. */
  create?: InputMaybe<Array<ApiProductOptionValueCreateInput>>;
  /** IDs of values to delete. */
  delete?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Values to update. */
  update?: InputMaybe<Array<ApiProductOptionValueUpdateInput>>;
};

/** Input for syncing all product options. */
export type ApiProductOptionsSyncInput = {
  /** Complete list of options (replaces existing). */
  options: Array<ApiProductOptionSyncItemInput>;
  /** The product to sync options for. */
  productId: Scalars['ID']['input'];
};

/** Payload for options sync mutation. */
export type ApiProductOptionsSyncPayload = {
  __typename?: 'ProductOptionsSyncPayload';
  /** All synced options with final IDs. */
  options: Array<ApiProductOption>;
  /** The product with updated options. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred. */
  userErrors: Array<ApiGenericUserError>;
};

/** Ordering configuration for Product */
export type ApiProductOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ProductOrderField;
};

/** Fields available for sorting Product */
export enum ProductOrderField {
  /** Sort by brandName */
  BrandName = 'brandName',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by currency */
  Currency = 'currency',
  /** Sort by handle */
  Handle = 'handle',
  /** Sort by id */
  Id = 'id',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by maxAmountMinor */
  MaxAmountMinor = 'maxAmountMinor',
  /** Sort by maxPriceMinor */
  MaxPriceMinor = 'maxPriceMinor',
  /** Sort by minAmountMinor */
  MinAmountMinor = 'minAmountMinor',
  /** Sort by minPriceMinor */
  MinPriceMinor = 'minPriceMinor',
  /** Sort by name */
  Name = 'name',
  /** Sort by primaryCategoryId */
  PrimaryCategoryId = 'primaryCategoryId',
  /** Sort by primaryCategoryName */
  PrimaryCategoryName = 'primaryCategoryName',
  /** Sort by publishedAt */
  PublishedAt = 'publishedAt',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by vendorId */
  VendorId = 'vendorId'
}

export type ApiProductPriceRange = {
  __typename?: 'ProductPriceRange';
  /** Currency code used for the returned price amounts. */
  currency: CurrencyCode;
  /** Maximum product price amount in minor units. */
  maxPriceAmount: Scalars['BigInt']['output'];
  /** Minimum product price amount in minor units. */
  minPriceAmount: Scalars['BigInt']['output'];
};

export type ApiProductProductsMetaInput = {
  categoriesScope?: InputMaybe<ApiProductCategoriesScopeInput>;
};

export type ApiProductQuestion = ApiNode & ApiReviewContent & {
  __typename?: 'ProductQuestion';
  answerState: ProductQuestionAnswerState;
  answers: ApiProductQuestionAnswerConnection;
  author: ApiReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  externalReferences: ApiReviewContentExternalReferenceConnection;
  id: Scalars['ID']['output'];
  idempotencyKey?: Maybe<Scalars['String']['output']>;
  kind: ReviewContentKind;
  locale: Scalars['String']['output'];
  metrics: ApiReviewContentMetrics;
  moderatedAt?: Maybe<Scalars['DateTime']['output']>;
  moderatedByPrincipalId?: Maybe<Scalars['String']['output']>;
  moderationCases: ApiReviewModerationCaseConnection;
  moderationEvents: ApiReviewModerationEventConnection;
  moderationNote?: Maybe<Scalars['String']['output']>;
  moderationSignals: ApiReviewModerationSignalConnection;
  product: ApiProduct;
  publications: Array<ApiReviewContentPublication>;
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  redactedAt?: Maybe<Scalars['DateTime']['output']>;
  reports: ApiReviewContentReportConnection;
  revision: Scalars['Int']['output'];
  revisions: ApiReviewContentRevisionConnection;
  sourceChannel: Scalars['String']['output'];
  sourceMetadata: Scalars['JSON']['output'];
  status: ReviewContentStatus;
  subscriptions: ApiProductQuestionSubscriptionConnection;
  title?: Maybe<Scalars['String']['output']>;
  translations: Array<ApiReviewContentTranslation>;
  unpublishedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  variant?: Maybe<ApiVariant>;
  votes: ApiReviewContentVoteConnection;
};


export type ApiProductQuestionAnswersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ApiReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ApiProductQuestionAnswerOrderByInput>>;
  where?: InputMaybe<ApiProductQuestionAnswerWhereInput>;
};


export type ApiProductQuestionExternalReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiProductQuestionModerationCasesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiProductQuestionModerationEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiProductQuestionModerationSignalsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiProductQuestionReportsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiProductQuestionRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiProductQuestionSubscriptionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiProductQuestionVotesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiProductQuestionAnswer = ApiNode & ApiReviewContent & {
  __typename?: 'ProductQuestionAnswer';
  author: ApiReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  externalReferences: ApiReviewContentExternalReferenceConnection;
  id: Scalars['ID']['output'];
  idempotencyKey?: Maybe<Scalars['String']['output']>;
  isAccepted: Scalars['Boolean']['output'];
  isOfficial: Scalars['Boolean']['output'];
  kind: ReviewContentKind;
  locale: Scalars['String']['output'];
  metrics: ApiReviewContentMetrics;
  moderatedAt?: Maybe<Scalars['DateTime']['output']>;
  moderatedByPrincipalId?: Maybe<Scalars['String']['output']>;
  moderationCases: ApiReviewModerationCaseConnection;
  moderationEvents: ApiReviewModerationEventConnection;
  moderationNote?: Maybe<Scalars['String']['output']>;
  moderationSignals: ApiReviewModerationSignalConnection;
  publications: Array<ApiReviewContentPublication>;
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  question: ApiProductQuestion;
  redactedAt?: Maybe<Scalars['DateTime']['output']>;
  reports: ApiReviewContentReportConnection;
  revision: Scalars['Int']['output'];
  revisions: ApiReviewContentRevisionConnection;
  sortIndex: Scalars['Int']['output'];
  sourceChannel: Scalars['String']['output'];
  sourceMetadata: Scalars['JSON']['output'];
  status: ReviewContentStatus;
  title?: Maybe<Scalars['String']['output']>;
  translations: Array<ApiReviewContentTranslation>;
  unpublishedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  votes: ApiReviewContentVoteConnection;
};


export type ApiProductQuestionAnswerExternalReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiProductQuestionAnswerModerationCasesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiProductQuestionAnswerModerationEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiProductQuestionAnswerModerationSignalsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiProductQuestionAnswerReportsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiProductQuestionAnswerRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiProductQuestionAnswerVotesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiProductQuestionAnswerConnection = {
  __typename?: 'ProductQuestionAnswerConnection';
  edges: Array<ApiProductQuestionAnswerEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiProductQuestionAnswerCreateInput = {
  content: ApiReviewContentCreateInput;
  isAccepted?: InputMaybe<Scalars['Boolean']['input']>;
  isOfficial?: InputMaybe<Scalars['Boolean']['input']>;
  questionId: Scalars['ID']['input'];
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiProductQuestionAnswerCreatePayload = {
  __typename?: 'ProductQuestionAnswerCreatePayload';
  productQuestionAnswer?: Maybe<ApiProductQuestionAnswer>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiProductQuestionAnswerDeletePayload = {
  __typename?: 'ProductQuestionAnswerDeletePayload';
  deletedProductQuestionAnswerId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiProductQuestionAnswerEdge = {
  __typename?: 'ProductQuestionAnswerEdge';
  cursor: Scalars['String']['output'];
  node: ApiProductQuestionAnswer;
};

/** Ordering configuration for ProductQuestionAnswer */
export type ApiProductQuestionAnswerOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ProductQuestionAnswerOrderField;
};

/** Fields available for sorting ProductQuestionAnswer */
export enum ProductQuestionAnswerOrderField {
  /** Sort by authorType */
  AuthorType = 'authorType',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by deletedAt */
  DeletedAt = 'deletedAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by isAccepted */
  IsAccepted = 'isAccepted',
  /** Sort by isOfficial */
  IsOfficial = 'isOfficial',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by questionId */
  QuestionId = 'questionId',
  /** Sort by revision */
  Revision = 'revision',
  /** Sort by sortIndex */
  SortIndex = 'sortIndex',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type ApiProductQuestionAnswerPropertiesUpdateInput = {
  isAccepted?: InputMaybe<Scalars['Boolean']['input']>;
  isOfficial?: InputMaybe<Scalars['Boolean']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export enum ProductQuestionAnswerState {
  Answered = 'ANSWERED',
  Unanswered = 'UNANSWERED'
}

export type ApiProductQuestionAnswerUpdateInput = {
  /** Text, author, source, moderation, translations, and publications. */
  content?: InputMaybe<ApiReviewContentUpdateInput>;
  properties?: InputMaybe<ApiProductQuestionAnswerPropertiesUpdateInput>;
};

export type ApiProductQuestionAnswerUpdatePayload = {
  __typename?: 'ProductQuestionAnswerUpdatePayload';
  operationResults: Array<ApiReviewsOperationResult>;
  productQuestionAnswer?: Maybe<ApiProductQuestionAnswer>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ProductQuestionAnswer */
export type ApiProductQuestionAnswerWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiProductQuestionAnswerWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiProductQuestionAnswerWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiProductQuestionAnswerWhereInput>>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<ApiStringFilter>;
  /** Filter by body */
  body?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isAccepted */
  isAccepted?: InputMaybe<ApiBooleanFilter>;
  /** Filter by isOfficial */
  isOfficial?: InputMaybe<ApiBooleanFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by questionId */
  questionId?: InputMaybe<ApiIdFilter>;
  /** Filter by revision */
  revision?: InputMaybe<ApiIntFilter>;
  /** Filter by sortIndex */
  sortIndex?: InputMaybe<ApiIntFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiProductQuestionConnection = {
  __typename?: 'ProductQuestionConnection';
  edges: Array<ApiProductQuestionEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiProductQuestionCreateInput = {
  content: ApiReviewContentCreateInput;
  productId: Scalars['ID']['input'];
  variantId?: InputMaybe<Scalars['ID']['input']>;
};

export type ApiProductQuestionCreatePayload = {
  __typename?: 'ProductQuestionCreatePayload';
  productQuestion?: Maybe<ApiProductQuestion>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiProductQuestionDeletePayload = {
  __typename?: 'ProductQuestionDeletePayload';
  deletedProductQuestionId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiProductQuestionEdge = {
  __typename?: 'ProductQuestionEdge';
  cursor: Scalars['String']['output'];
  node: ApiProductQuestion;
};

/** Ordering configuration for ProductQuestion */
export type ApiProductQuestionOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ProductQuestionOrderField;
};

/** Fields available for sorting ProductQuestion */
export enum ProductQuestionOrderField {
  /** Sort by acceptedAnswerCount */
  AcceptedAnswerCount = 'acceptedAnswerCount',
  /** Sort by answerCount */
  AnswerCount = 'answerCount',
  /** Sort by answerState */
  AnswerState = 'answerState',
  /** Sort by authorDisplayName */
  AuthorDisplayName = 'authorDisplayName',
  /** Sort by authorType */
  AuthorType = 'authorType',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by deletedAt */
  DeletedAt = 'deletedAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by officialAnswerCount */
  OfficialAnswerCount = 'officialAnswerCount',
  /** Sort by productId */
  ProductId = 'productId',
  /** Sort by publishedAt */
  PublishedAt = 'publishedAt',
  /** Sort by reportCount */
  ReportCount = 'reportCount',
  /** Sort by revision */
  Revision = 'revision',
  /** Sort by sourceChannel */
  SourceChannel = 'sourceChannel',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by variantId */
  VariantId = 'variantId'
}

export type ApiProductQuestionSubjectUpdateInput = {
  productId?: InputMaybe<Scalars['ID']['input']>;
  variantId?: InputMaybe<Scalars['ID']['input']>;
};

export type ApiProductQuestionSubscription = ApiNode & {
  __typename?: 'ProductQuestionSubscription';
  channel: ReviewNotificationChannel;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lastNotifiedAt?: Maybe<Scalars['DateTime']['output']>;
  locale: Scalars['String']['output'];
  question: ApiProductQuestion;
  status: ProductQuestionSubscriptionStatus;
  subscriberCustomer?: Maybe<ApiCustomer>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiProductQuestionSubscriptionConnection = {
  __typename?: 'ProductQuestionSubscriptionConnection';
  edges: Array<ApiProductQuestionSubscriptionEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiProductQuestionSubscriptionEdge = {
  __typename?: 'ProductQuestionSubscriptionEdge';
  cursor: Scalars['String']['output'];
  node: ApiProductQuestionSubscription;
};

export enum ProductQuestionSubscriptionStatus {
  Active = 'ACTIVE',
  Paused = 'PAUSED',
  Unsubscribed = 'UNSUBSCRIBED'
}

export type ApiProductQuestionSubscriptionUpdateInput = {
  channel?: InputMaybe<ReviewNotificationChannel>;
  locale?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<ProductQuestionSubscriptionStatus>;
};

export type ApiProductQuestionSubscriptionUpdatePayload = {
  __typename?: 'ProductQuestionSubscriptionUpdatePayload';
  operationResults: Array<ApiReviewsOperationResult>;
  subscription?: Maybe<ApiProductQuestionSubscription>;
  userErrors: Array<ApiGenericUserError>;
};

/** Read-only projection over currently published product questions and answers. */
export type ApiProductQuestionSummary = {
  __typename?: 'ProductQuestionSummary';
  answerCount: Scalars['Int']['output'];
  answeredQuestionCount: Scalars['Int']['output'];
  lastAnsweredAt?: Maybe<Scalars['DateTime']['output']>;
  lastQuestionAt?: Maybe<Scalars['DateTime']['output']>;
  officialAnswerCount: Scalars['Int']['output'];
  product: ApiProduct;
  questionCount: Scalars['Int']['output'];
  unansweredQuestionCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiProductQuestionUpdateInput = {
  /** Text, author, source, moderation, translations, and publications. */
  content?: InputMaybe<ApiReviewContentUpdateInput>;
  subject?: InputMaybe<ApiProductQuestionSubjectUpdateInput>;
};

export type ApiProductQuestionUpdatePayload = {
  __typename?: 'ProductQuestionUpdatePayload';
  operationResults: Array<ApiReviewsOperationResult>;
  productQuestion?: Maybe<ApiProductQuestion>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ProductQuestion */
export type ApiProductQuestionWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiProductQuestionWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiProductQuestionWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiProductQuestionWhereInput>>;
  /** Filter by acceptedAnswerCount */
  acceptedAnswerCount?: InputMaybe<ApiIntFilter>;
  /** Filter by answerCount */
  answerCount?: InputMaybe<ApiIntFilter>;
  /** Filter by answerState */
  answerState?: InputMaybe<ApiStringFilter>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by authorDisplayName */
  authorDisplayName?: InputMaybe<ApiStringFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<ApiStringFilter>;
  /** Filter by body */
  body?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by officialAnswerCount */
  officialAnswerCount?: InputMaybe<ApiIntFilter>;
  /** Filter by productId */
  productId?: InputMaybe<ApiIdFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by reportCount */
  reportCount?: InputMaybe<ApiIntFilter>;
  /** Filter by revision */
  revision?: InputMaybe<ApiIntFilter>;
  /** Filter by sourceChannel */
  sourceChannel?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by variantId */
  variantId?: InputMaybe<ApiIdFilter>;
};

export type ApiProductRatingCriterionSummary = {
  __typename?: 'ProductRatingCriterionSummary';
  averageRating: Scalars['Float']['output'];
  criterion: ApiReviewRatingCriterion;
  ratingBreakdown: ApiReviewRatingBreakdown;
  ratingSum: Scalars['BigInt']['output'];
  reviewCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Read-only projection over currently published, non-deleted product reviews. */
export type ApiProductReviewSummary = {
  __typename?: 'ProductReviewSummary';
  averageRating: Scalars['Float']['output'];
  criteria: Array<ApiProductRatingCriterionSummary>;
  lastReviewedAt?: Maybe<Scalars['DateTime']['output']>;
  mediaReviewCount: Scalars['Int']['output'];
  product: ApiProduct;
  ratingBreakdown: ApiReviewRatingBreakdown;
  ratingSum: Scalars['BigInt']['output'];
  reviewCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  verifiedReviewCount: Scalars['Int']['output'];
};

/** SEO and Open Graph metadata for a product. */
export type ApiProductSeo = {
  __typename?: 'ProductSeo';
  ogDescription?: Maybe<Scalars['String']['output']>;
  ogImage?: Maybe<ApiFile>;
  ogTitle?: Maybe<Scalars['String']['output']>;
  seoDescription?: Maybe<Scalars['String']['output']>;
  seoTitle?: Maybe<Scalars['String']['output']>;
};

/** Input for updating product SEO data. */
export type ApiProductSeoInput = {
  ogDescription?: InputMaybe<Scalars['String']['input']>;
  ogImageId?: InputMaybe<Scalars['ID']['input']>;
  ogTitle?: InputMaybe<Scalars['String']['input']>;
  seoDescription?: InputMaybe<Scalars['String']['input']>;
  seoTitle?: InputMaybe<Scalars['String']['input']>;
};

export enum ProductSortBy {
  Manual = 'MANUAL',
  Name = 'NAME',
  Newest = 'NEWEST',
  Price = 'PRICE'
}

export type ApiProductSortInput = {
  by: ProductSortBy;
  direction?: InputMaybe<SortDirection>;
};

export enum ProductStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED'
}

export enum ProductStatusAction {
  Publish = 'PUBLISH',
  Unpublish = 'UNPUBLISH'
}

export enum ProductTagOperationAction {
  Add = 'ADD',
  Remove = 'REMOVE'
}

/** Product tag assignment operation for unified product updates. */
export type ApiProductTagOperationInput = {
  /** The assignment action to apply. */
  action: ProductTagOperationAction;
  /** The tag to update for the product. */
  tagId: Scalars['ID']['input'];
};

/** Input for product-level fields in the unified update. */
export type ApiProductUpdateInput = {
  /** Product category assignment operations. */
  categories?: InputMaybe<Array<ApiProductCategoryOperationInput>>;
  /** Product content (description, excerpt). */
  content?: InputMaybe<ApiProductContentInput>;
  /** Complete feature definition replacement. Empty removes all features. */
  features?: InputMaybe<Array<ApiProductFeatureSyncItemInput>>;
  /** The URL-friendly handle for the product. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** Product media. */
  media?: InputMaybe<ApiProductMediaInput>;
  /** Complete option definition replacement. Empty removes all options. */
  options?: InputMaybe<Array<ApiProductOptionSyncItemInput>>;
  /** SEO and Open Graph metadata. */
  seo?: InputMaybe<ApiProductSeoInput>;
  /** Product status: DRAFT or PUBLISHED. */
  status?: InputMaybe<ProductStatus>;
  /** Product tag assignment operations. */
  tags?: InputMaybe<Array<ApiProductTagOperationInput>>;
  /** Product title. */
  title?: InputMaybe<Scalars['String']['input']>;
  /** Variant create, update, and delete operations. */
  variants?: InputMaybe<Array<ApiVariantOperationInput>>;
  /** Vendor ID to associate with the product. Pass null to clear. */
  vendorId?: InputMaybe<Scalars['ID']['input']>;
};

/** Payload for the unified product update mutation. */
export type ApiProductUpdatePayload = {
  __typename?: 'ProductUpdatePayload';
  /** Results of each operation. */
  operationResults: Array<ApiOperationResult>;
  /** The updated product with new revision. */
  product?: Maybe<ApiProduct>;
  /** All errors from all operations. */
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for Product */
export type ApiProductWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiProductWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiProductWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiProductWhereInput>>;
  /** Filter by brandName */
  brandName?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by currency */
  currency?: InputMaybe<ApiStringFilter>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by maxAmountMinor */
  maxAmountMinor?: InputMaybe<ApiIntFilter>;
  /** Filter by maxPriceMinor */
  maxPriceMinor?: InputMaybe<ApiIntFilter>;
  /** Filter by minAmountMinor */
  minAmountMinor?: InputMaybe<ApiIntFilter>;
  /** Filter by minPriceMinor */
  minPriceMinor?: InputMaybe<ApiIntFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by primaryCategoryId */
  primaryCategoryId?: InputMaybe<ApiIdFilter>;
  /** Filter by primaryCategoryName */
  primaryCategoryName?: InputMaybe<ApiStringFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by vendorId */
  vendorId?: InputMaybe<ApiIdFilter>;
};

export type ApiPurchasable = {
  /** Unique identifier of the purchasable entity. */
  id: Scalars['ID']['output'];
};

export type ApiPurchasableSnapshot = ApiPurchasable & {
  __typename?: 'PurchasableSnapshot';
  id: Scalars['ID']['output'];
  purchasableSnapshot: Scalars['JSON']['output'];
};

export type ApiQuery = {
  __typename?: 'Query';
  appsQuery: ApiAppsQuery;
  /** Catalog query namespace for product, variant, category, and collection operations */
  catalogQuery: ApiCatalogQuery;
  /** Customers Admin query namespace. */
  customersQuery: ApiCustomersQuery;
  /** Inventory query namespace for warehouse, stock, and inventory item operations */
  inventoryQuery: ApiInventoryQuery;
  /** Listing query namespace. */
  listingQuery: ApiListingQuery;
  mediaQuery: ApiMediaQuery;
  orderQuery: ApiOrderQuery;
  /** Organization queries namespace. */
  organizationQuery: ApiOrganizationQuery;
  /** Admin-only Reviews query namespace. */
  reviewsQuery: ApiReviewsQuery;
  /** Store-related queries */
  storeQuery: ApiStoreQuery;
  /** User management queries. */
  userQuery: ApiUserQuery;
  /** Widget query namespace for dashboard widgets */
  widgetQuery: ApiWidgetQuery;
};

/** Resource definition for role editor UI. */
export type ApiResourceDefinition = {
  __typename?: 'ResourceDefinition';
  /** Available actions for resource. */
  actions: Array<Scalars['String']['output']>;
  /** Resource description. */
  description?: Maybe<Scalars['String']['output']>;
  /** Display name. */
  displayName?: Maybe<Scalars['String']['output']>;
  /** Resource name (product, order, etc.). */
  name: Scalars['String']['output'];
};

export type ApiReview = ApiNode & ApiReviewContent & {
  __typename?: 'Review';
  author: ApiReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  externalReferences: ApiReviewContentExternalReferenceConnection;
  id: Scalars['ID']['output'];
  idempotencyKey?: Maybe<Scalars['String']['output']>;
  incentiveDisclosure?: Maybe<Scalars['String']['output']>;
  isIncentivized: Scalars['Boolean']['output'];
  isVerifiedPurchase: Scalars['Boolean']['output'];
  kind: ReviewContentKind;
  locale: Scalars['String']['output'];
  media: Array<ApiReviewMedia>;
  metrics: ApiReviewContentMetrics;
  moderatedAt?: Maybe<Scalars['DateTime']['output']>;
  moderatedByPrincipalId?: Maybe<Scalars['String']['output']>;
  moderationCases: ApiReviewModerationCaseConnection;
  moderationEvents: ApiReviewModerationEventConnection;
  moderationNote?: Maybe<Scalars['String']['output']>;
  moderationSignals: ApiReviewModerationSignalConnection;
  /** Orders is not yet an admin federation entity, so evidence remains a global ID contract. */
  orderId?: Maybe<Scalars['ID']['output']>;
  orderLineId?: Maybe<Scalars['ID']['output']>;
  product: ApiProduct;
  publications: Array<ApiReviewContentPublication>;
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  rating: Scalars['Int']['output'];
  ratings: Array<ApiReviewRating>;
  redactedAt?: Maybe<Scalars['DateTime']['output']>;
  replies: ApiReviewReplyConnection;
  reports: ApiReviewContentReportConnection;
  revision: Scalars['Int']['output'];
  revisions: ApiReviewContentRevisionConnection;
  sourceChannel: Scalars['String']['output'];
  sourceMetadata: Scalars['JSON']['output'];
  status: ReviewContentStatus;
  title?: Maybe<Scalars['String']['output']>;
  translations: Array<ApiReviewContentTranslation>;
  unpublishedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  variant?: Maybe<ApiVariant>;
  verificationMethod?: Maybe<Scalars['String']['output']>;
  verificationStatus: ReviewVerificationStatus;
  verifiedAt?: Maybe<Scalars['DateTime']['output']>;
  votes: ApiReviewContentVoteConnection;
};


export type ApiReviewExternalReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiReviewModerationCasesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiReviewModerationEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiReviewModerationSignalsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiReviewRepliesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ApiReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ApiReviewReplyOrderByInput>>;
  where?: InputMaybe<ApiReviewReplyWhereInput>;
};


export type ApiReviewReportsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiReviewRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiReviewVotesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiReviewConnection = {
  __typename?: 'ReviewConnection';
  edges: Array<ApiReviewEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContent = {
  author: ApiReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  externalReferences: ApiReviewContentExternalReferenceConnection;
  id: Scalars['ID']['output'];
  idempotencyKey?: Maybe<Scalars['String']['output']>;
  kind: ReviewContentKind;
  locale: Scalars['String']['output'];
  metrics: ApiReviewContentMetrics;
  moderatedAt?: Maybe<Scalars['DateTime']['output']>;
  moderatedByPrincipalId?: Maybe<Scalars['String']['output']>;
  moderationCases: ApiReviewModerationCaseConnection;
  moderationEvents: ApiReviewModerationEventConnection;
  moderationNote?: Maybe<Scalars['String']['output']>;
  moderationSignals: ApiReviewModerationSignalConnection;
  publications: Array<ApiReviewContentPublication>;
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  redactedAt?: Maybe<Scalars['DateTime']['output']>;
  reports: ApiReviewContentReportConnection;
  revision: Scalars['Int']['output'];
  revisions: ApiReviewContentRevisionConnection;
  sourceChannel: Scalars['String']['output'];
  sourceMetadata: Scalars['JSON']['output'];
  status: ReviewContentStatus;
  title?: Maybe<Scalars['String']['output']>;
  translations: Array<ApiReviewContentTranslation>;
  unpublishedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  votes: ApiReviewContentVoteConnection;
};


/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContentExternalReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContentModerationCasesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContentModerationEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContentModerationSignalsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContentReportsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContentRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContentVotesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiReviewContentAuthor = {
  __typename?: 'ReviewContentAuthor';
  customer?: Maybe<ApiCustomer>;
  displayName: Scalars['String']['output'];
  /** Snapshot email; null after privacy redaction or when not collected. */
  email?: Maybe<Scalars['Email']['output']>;
  principalId?: Maybe<Scalars['String']['output']>;
  type: ReviewContentAuthorType;
};

export type ApiReviewContentAuthorCreateInput = {
  customerId?: InputMaybe<Scalars['ID']['input']>;
  displayName: Scalars['String']['input'];
  email?: InputMaybe<Scalars['Email']['input']>;
  principalId?: InputMaybe<Scalars['String']['input']>;
  type: ReviewContentAuthorType;
};

export enum ReviewContentAuthorType {
  Customer = 'CUSTOMER',
  External = 'EXTERNAL',
  Guest = 'GUEST',
  Seller = 'SELLER',
  Staff = 'STAFF',
  System = 'SYSTEM'
}

export type ApiReviewContentAuthorUpdateInput = {
  /** Pass null to remove the customer link when the resulting author type allows it. */
  customerId?: InputMaybe<Scalars['ID']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['Email']['input']>;
  principalId?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<ReviewContentAuthorType>;
};

export type ApiReviewContentConnection = {
  __typename?: 'ReviewContentConnection';
  edges: Array<ApiReviewContentEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Repository-enforced visibility controls for moderated content lists. */
export type ApiReviewContentConnectionMetaInput = {
  /** Include soft-deleted content; false by default. */
  includeDeleted?: InputMaybe<Scalars['Boolean']['input']>;
  /** Include privacy-redacted content; true by default for audit workflows. */
  includeRedacted?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ApiReviewContentCreateInput = {
  author: ApiReviewContentAuthorCreateInput;
  body: Scalars['String']['input'];
  locale: Scalars['String']['input'];
  moderationNote?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<ApiReviewContentSourceCreateInput>;
  /** Admin imports may set an initial status; PENDING is the default. */
  status?: InputMaybe<ReviewContentStatus>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ApiReviewContentDeleteInput = {
  expectedRevision: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
  /** Hard deletion is reserved for explicit privacy or retention workflows. */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ApiReviewContentEdge = {
  __typename?: 'ReviewContentEdge';
  cursor: Scalars['String']['output'];
  node: ApiReviewContent;
};

export type ApiReviewContentExternalReference = ApiNode & {
  __typename?: 'ReviewContentExternalReference';
  content: ApiReviewContent;
  contentChecksum?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  direction: ReviewExternalSyncDirection;
  etag?: Maybe<Scalars['String']['output']>;
  externalId: Scalars['String']['output'];
  externalSystem: Scalars['String']['output'];
  externalType: Scalars['String']['output'];
  externalUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastError?: Maybe<Scalars['String']['output']>;
  lastSyncedAt?: Maybe<Scalars['DateTime']['output']>;
  metadata: Scalars['JSON']['output'];
  syncStatus: ReviewExternalSyncStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiReviewContentExternalReferenceConnection = {
  __typename?: 'ReviewContentExternalReferenceConnection';
  edges: Array<ApiReviewContentExternalReferenceEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiReviewContentExternalReferenceCreateInput = {
  contentId: Scalars['ID']['input'];
  direction: ReviewExternalSyncDirection;
  externalId: Scalars['String']['input'];
  externalSystem: Scalars['String']['input'];
  externalType: Scalars['String']['input'];
  externalUrl?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
};

export type ApiReviewContentExternalReferenceCreatePayload = {
  __typename?: 'ReviewContentExternalReferenceCreatePayload';
  externalReference?: Maybe<ApiReviewContentExternalReference>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewContentExternalReferenceDeleteInput = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  id: Scalars['ID']['input'];
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ApiReviewContentExternalReferenceDeletePayload = {
  __typename?: 'ReviewContentExternalReferenceDeletePayload';
  deletedExternalReferenceId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewContentExternalReferenceEdge = {
  __typename?: 'ReviewContentExternalReferenceEdge';
  cursor: Scalars['String']['output'];
  node: ApiReviewContentExternalReference;
};

export type ApiReviewContentExternalReferenceIdentityInput = {
  externalId?: InputMaybe<Scalars['String']['input']>;
  externalSystem?: InputMaybe<Scalars['String']['input']>;
  externalType?: InputMaybe<Scalars['String']['input']>;
  externalUrl?: InputMaybe<Scalars['String']['input']>;
};

/** Ordering configuration for ReviewContentExternalReference */
export type ApiReviewContentExternalReferenceOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewContentExternalReferenceOrderField;
};

/** Fields available for sorting ReviewContentExternalReference */
export enum ReviewContentExternalReferenceOrderField {
  /** Sort by contentId */
  ContentId = 'contentId',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by deletedAt */
  DeletedAt = 'deletedAt',
  /** Sort by direction */
  Direction = 'direction',
  /** Sort by externalId */
  ExternalId = 'externalId',
  /** Sort by externalSystem */
  ExternalSystem = 'externalSystem',
  /** Sort by externalType */
  ExternalType = 'externalType',
  /** Sort by id */
  Id = 'id',
  /** Sort by lastSyncedAt */
  LastSyncedAt = 'lastSyncedAt',
  /** Sort by syncStatus */
  SyncStatus = 'syncStatus',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type ApiReviewContentExternalReferenceSyncInput = {
  contentChecksum?: InputMaybe<Scalars['String']['input']>;
  direction?: InputMaybe<ReviewExternalSyncDirection>;
  etag?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  status?: InputMaybe<ReviewExternalSyncStatus>;
};

export type ApiReviewContentExternalReferenceUpdateInput = {
  identity?: InputMaybe<ApiReviewContentExternalReferenceIdentityInput>;
  sync?: InputMaybe<ApiReviewContentExternalReferenceSyncInput>;
};

export type ApiReviewContentExternalReferenceUpdatePayload = {
  __typename?: 'ReviewContentExternalReferenceUpdatePayload';
  externalReference?: Maybe<ApiReviewContentExternalReference>;
  operationResults: Array<ApiReviewsOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ReviewContentExternalReference */
export type ApiReviewContentExternalReferenceWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewContentExternalReferenceWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewContentExternalReferenceWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewContentExternalReferenceWhereInput>>;
  /** Filter by contentId */
  contentId?: InputMaybe<ApiIdFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by direction */
  direction?: InputMaybe<ApiStringFilter>;
  /** Filter by externalId */
  externalId?: InputMaybe<ApiStringFilter>;
  /** Filter by externalSystem */
  externalSystem?: InputMaybe<ApiStringFilter>;
  /** Filter by externalType */
  externalType?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by lastSyncedAt */
  lastSyncedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by syncStatus */
  syncStatus?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export enum ReviewContentKind {
  ProductQuestion = 'PRODUCT_QUESTION',
  QuestionAnswer = 'QUESTION_ANSWER',
  Review = 'REVIEW',
  ReviewReply = 'REVIEW_REPLY'
}

/** Transactionally maintained counters used by admin filtering and sorting. */
export type ApiReviewContentMetrics = {
  __typename?: 'ReviewContentMetrics';
  acceptedChildCount: Scalars['Int']['output'];
  childCount: Scalars['Int']['output'];
  dislikeCount: Scalars['Int']['output'];
  lastChildAt?: Maybe<Scalars['DateTime']['output']>;
  likeCount: Scalars['Int']['output'];
  mediaCount: Scalars['Int']['output'];
  officialChildCount: Scalars['Int']['output'];
  openReportCount: Scalars['Int']['output'];
  reportCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiReviewContentModerationInput = {
  moderationNote?: InputMaybe<Scalars['String']['input']>;
  status: ReviewContentStatus;
};

/** Ordering configuration for ReviewContent */
export type ApiReviewContentOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewContentOrderField;
};

/** Fields available for sorting ReviewContent */
export enum ReviewContentOrderField {
  /** Sort by authorDisplayName */
  AuthorDisplayName = 'authorDisplayName',
  /** Sort by authorType */
  AuthorType = 'authorType',
  /** Sort by childCount */
  ChildCount = 'childCount',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by deletedAt */
  DeletedAt = 'deletedAt',
  /** Sort by dislikeCount */
  DislikeCount = 'dislikeCount',
  /** Sort by id */
  Id = 'id',
  /** Sort by kind */
  Kind = 'kind',
  /** Sort by likeCount */
  LikeCount = 'likeCount',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by mediaCount */
  MediaCount = 'mediaCount',
  /** Sort by openReportCount */
  OpenReportCount = 'openReportCount',
  /** Sort by publishedAt */
  PublishedAt = 'publishedAt',
  /** Sort by redactedAt */
  RedactedAt = 'redactedAt',
  /** Sort by reportCount */
  ReportCount = 'reportCount',
  /** Sort by revision */
  Revision = 'revision',
  /** Sort by sourceChannel */
  SourceChannel = 'sourceChannel',
  /** Sort by status */
  Status = 'status',
  /** Sort by title */
  Title = 'title',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type ApiReviewContentPublication = ApiNode & {
  __typename?: 'ReviewContentPublication';
  channel: Scalars['String']['output'];
  content: ApiReviewContent;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lastError?: Maybe<Scalars['String']['output']>;
  locale?: Maybe<Scalars['String']['output']>;
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  scheduledAt?: Maybe<Scalars['DateTime']['output']>;
  status: ReviewPublicationStatus;
  unpublishedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiReviewContentPublicationSyncInput = {
  channel: Scalars['String']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
  scheduledAt?: InputMaybe<Scalars['DateTime']['input']>;
  status: ReviewPublicationStatus;
};

export type ApiReviewContentReport = ApiNode & {
  __typename?: 'ReviewContentReport';
  assignedToPrincipalId?: Maybe<Scalars['String']['output']>;
  content: ApiReviewContent;
  createdAt: Scalars['DateTime']['output'];
  details?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  reason: ReviewContentReportReason;
  reporterCustomer?: Maybe<ApiCustomer>;
  resolutionNote?: Maybe<Scalars['String']['output']>;
  resolvedAt?: Maybe<Scalars['DateTime']['output']>;
  resolvedByPrincipalId?: Maybe<Scalars['String']['output']>;
  status: ReviewContentReportStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiReviewContentReportAssignmentInput = {
  assignedToPrincipalId?: InputMaybe<Scalars['String']['input']>;
};

export type ApiReviewContentReportConnection = {
  __typename?: 'ReviewContentReportConnection';
  edges: Array<ApiReviewContentReportEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiReviewContentReportEdge = {
  __typename?: 'ReviewContentReportEdge';
  cursor: Scalars['String']['output'];
  node: ApiReviewContentReport;
};

/** Ordering configuration for ReviewContentReport */
export type ApiReviewContentReportOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewContentReportOrderField;
};

/** Fields available for sorting ReviewContentReport */
export enum ReviewContentReportOrderField {
  /** Sort by assignedToPrincipalId */
  AssignedToPrincipalId = 'assignedToPrincipalId',
  /** Sort by contentId */
  ContentId = 'contentId',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by reason */
  Reason = 'reason',
  /** Sort by reporterCustomerId */
  ReporterCustomerId = 'reporterCustomerId',
  /** Sort by resolvedAt */
  ResolvedAt = 'resolvedAt',
  /** Sort by resolvedByPrincipalId */
  ResolvedByPrincipalId = 'resolvedByPrincipalId',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export enum ReviewContentReportReason {
  ConflictOfInterest = 'CONFLICT_OF_INTEREST',
  FraudOrScam = 'FRAUD_OR_SCAM',
  Harassment = 'HARASSMENT',
  HateSpeech = 'HATE_SPEECH',
  IllegalContent = 'ILLEGAL_CONTENT',
  IntellectualProperty = 'INTELLECTUAL_PROPERTY',
  NotRelevant = 'NOT_RELEVANT',
  Offensive = 'OFFENSIVE',
  Other = 'OTHER',
  PersonalInformation = 'PERSONAL_INFORMATION',
  Spam = 'SPAM'
}

export type ApiReviewContentReportResolutionInput = {
  note?: InputMaybe<Scalars['String']['input']>;
  /** Must be ACTIONED or DISMISSED. */
  status: ReviewContentReportStatus;
};

export enum ReviewContentReportStatus {
  Actioned = 'ACTIONED',
  Dismissed = 'DISMISSED',
  Open = 'OPEN',
  UnderReview = 'UNDER_REVIEW'
}

export type ApiReviewContentReportUpdateInput = {
  assignment?: InputMaybe<ApiReviewContentReportAssignmentInput>;
  resolution?: InputMaybe<ApiReviewContentReportResolutionInput>;
};

export type ApiReviewContentReportUpdatePayload = {
  __typename?: 'ReviewContentReportUpdatePayload';
  contentReport?: Maybe<ApiReviewContentReport>;
  operationResults: Array<ApiReviewsOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ReviewContentReport */
export type ApiReviewContentReportWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewContentReportWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewContentReportWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewContentReportWhereInput>>;
  /** Filter by assignedToPrincipalId */
  assignedToPrincipalId?: InputMaybe<ApiStringFilter>;
  /** Filter by contentId */
  contentId?: InputMaybe<ApiIdFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by reason */
  reason?: InputMaybe<ApiStringFilter>;
  /** Filter by reporterCustomerId */
  reporterCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by resolvedAt */
  resolvedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by resolvedByPrincipalId */
  resolvedByPrincipalId?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Immutable aggregate snapshot used for audit and restore workflows. */
export type ApiReviewContentRevision = ApiNode & {
  __typename?: 'ReviewContentRevision';
  changeReason?: Maybe<Scalars['String']['output']>;
  changedById?: Maybe<Scalars['String']['output']>;
  changedByType: Scalars['String']['output'];
  content: ApiReviewContent;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  revision: Scalars['Int']['output'];
  snapshot: Scalars['JSON']['output'];
};

export type ApiReviewContentRevisionConnection = {
  __typename?: 'ReviewContentRevisionConnection';
  edges: Array<ApiReviewContentRevisionEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiReviewContentRevisionEdge = {
  __typename?: 'ReviewContentRevisionEdge';
  cursor: Scalars['String']['output'];
  node: ApiReviewContentRevision;
};

export type ApiReviewContentSourceCreateInput = {
  channel?: InputMaybe<Scalars['String']['input']>;
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
};

export type ApiReviewContentSourceUpdateInput = {
  channel?: InputMaybe<Scalars['String']['input']>;
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
};

export enum ReviewContentStatus {
  Pending = 'PENDING',
  Published = 'PUBLISHED',
  Rejected = 'REJECTED'
}

export type ApiReviewContentTextUpdateInput = {
  body?: InputMaybe<Scalars['String']['input']>;
  locale?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type ApiReviewContentTranslation = ApiNode & {
  __typename?: 'ReviewContentTranslation';
  body: Scalars['String']['output'];
  content: ApiReviewContent;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  locale: Scalars['String']['output'];
  reviewedAt?: Maybe<Scalars['DateTime']['output']>;
  reviewedByPrincipalId?: Maybe<Scalars['String']['output']>;
  revision: Scalars['Int']['output'];
  source: ReviewTranslationSource;
  status: ReviewContentStatus;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiReviewContentTranslationSyncInput = {
  body: Scalars['String']['input'];
  locale: Scalars['String']['input'];
  source: ReviewTranslationSource;
  status?: InputMaybe<ReviewContentStatus>;
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Common section operations reused by all content aggregate updates. */
export type ApiReviewContentUpdateInput = {
  author?: InputMaybe<ApiReviewContentAuthorUpdateInput>;
  moderation?: InputMaybe<ApiReviewContentModerationInput>;
  /** Complete publication destination replacement when supplied. */
  publications?: InputMaybe<Array<ApiReviewContentPublicationSyncInput>>;
  source?: InputMaybe<ApiReviewContentSourceUpdateInput>;
  text?: InputMaybe<ApiReviewContentTextUpdateInput>;
  /** Complete translation replacement when supplied. Empty removes all translations. */
  translations?: InputMaybe<Array<ApiReviewContentTranslationSyncInput>>;
};

export type ApiReviewContentUpdatePayload = {
  __typename?: 'ReviewContentUpdatePayload';
  content?: Maybe<ApiReviewContent>;
  operationResults: Array<ApiReviewsOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Read-only admin view of a storefront reaction. */
export type ApiReviewContentVote = ApiNode & {
  __typename?: 'ReviewContentVote';
  content: ApiReviewContent;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  type: ReviewContentVoteType;
  updatedAt: Scalars['DateTime']['output'];
  voterCustomer?: Maybe<ApiCustomer>;
};

export type ApiReviewContentVoteConnection = {
  __typename?: 'ReviewContentVoteConnection';
  edges: Array<ApiReviewContentVoteEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiReviewContentVoteEdge = {
  __typename?: 'ReviewContentVoteEdge';
  cursor: Scalars['String']['output'];
  node: ApiReviewContentVote;
};

export enum ReviewContentVoteType {
  Dislike = 'DISLIKE',
  Like = 'LIKE'
}

/** Filter conditions for ReviewContent */
export type ApiReviewContentWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewContentWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewContentWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewContentWhereInput>>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by authorDisplayName */
  authorDisplayName?: InputMaybe<ApiStringFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<ApiStringFilter>;
  /** Filter by body */
  body?: InputMaybe<ApiStringFilter>;
  /** Filter by childCount */
  childCount?: InputMaybe<ApiIntFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by dislikeCount */
  dislikeCount?: InputMaybe<ApiIntFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by kind */
  kind?: InputMaybe<ApiStringFilter>;
  /** Filter by likeCount */
  likeCount?: InputMaybe<ApiIntFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by mediaCount */
  mediaCount?: InputMaybe<ApiIntFilter>;
  /** Filter by openReportCount */
  openReportCount?: InputMaybe<ApiIntFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by redactedAt */
  redactedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by reportCount */
  reportCount?: InputMaybe<ApiIntFilter>;
  /** Filter by revision */
  revision?: InputMaybe<ApiIntFilter>;
  /** Filter by sourceChannel */
  sourceChannel?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by title */
  title?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiReviewCreateInput = {
  content: ApiReviewContentCreateInput;
  incentive?: InputMaybe<ApiReviewIncentiveUpdateInput>;
  media?: InputMaybe<Array<ApiReviewMediaSyncItemInput>>;
  orderId?: InputMaybe<Scalars['ID']['input']>;
  orderLineId?: InputMaybe<Scalars['ID']['input']>;
  productId: Scalars['ID']['input'];
  rating: Scalars['Int']['input'];
  ratings?: InputMaybe<Array<ApiReviewRatingValueInput>>;
  variantId?: InputMaybe<Scalars['ID']['input']>;
  verification?: InputMaybe<ApiReviewVerificationUpdateInput>;
};

export type ApiReviewCreatePayload = {
  __typename?: 'ReviewCreatePayload';
  review?: Maybe<ApiReview>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewDeletePayload = {
  __typename?: 'ReviewDeletePayload';
  deletedReviewId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export enum ReviewDuplicatePolicy {
  AllowMultiple = 'ALLOW_MULTIPLE',
  OnePerOrderLine = 'ONE_PER_ORDER_LINE',
  OnePerProduct = 'ONE_PER_PRODUCT'
}

export type ApiReviewEdge = {
  __typename?: 'ReviewEdge';
  cursor: Scalars['String']['output'];
  node: ApiReview;
};

export enum ReviewExternalSyncDirection {
  Bidirectional = 'BIDIRECTIONAL',
  Export = 'EXPORT',
  Import = 'IMPORT'
}

export enum ReviewExternalSyncStatus {
  Disabled = 'DISABLED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Synced = 'SYNCED'
}

export type ApiReviewIncentiveUpdateInput = {
  disclosure?: InputMaybe<Scalars['String']['input']>;
  isIncentivized: Scalars['Boolean']['input'];
};

export type ApiReviewMedia = ApiNode & {
  __typename?: 'ReviewMedia';
  caption?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  file: ApiFile;
  id: Scalars['ID']['output'];
  moderatedAt?: Maybe<Scalars['DateTime']['output']>;
  moderatedByPrincipalId?: Maybe<Scalars['String']['output']>;
  moderationNote?: Maybe<Scalars['String']['output']>;
  review: ApiReview;
  sortIndex: Scalars['Int']['output'];
  status: ReviewContentStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiReviewMediaSyncItemInput = {
  caption?: InputMaybe<Scalars['String']['input']>;
  fileId: Scalars['ID']['input'];
  moderation?: InputMaybe<ApiReviewContentModerationInput>;
  sortIndex: Scalars['Int']['input'];
};

export enum ReviewModerationAction {
  Assigned = 'ASSIGNED',
  AutoFlagged = 'AUTO_FLAGGED',
  Deleted = 'DELETED',
  Edited = 'EDITED',
  Published = 'PUBLISHED',
  Redacted = 'REDACTED',
  Rejected = 'REJECTED',
  Restored = 'RESTORED',
  Submitted = 'SUBMITTED'
}

export type ApiReviewModerationCase = ApiNode & {
  __typename?: 'ReviewModerationCase';
  assignedToPrincipalId?: Maybe<Scalars['String']['output']>;
  content: ApiReviewContent;
  createdAt: Scalars['DateTime']['output'];
  dueAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  priority: Scalars['Int']['output'];
  reasonCode: Scalars['String']['output'];
  resolutionCode?: Maybe<Scalars['String']['output']>;
  resolutionNote?: Maybe<Scalars['String']['output']>;
  resolvedAt?: Maybe<Scalars['DateTime']['output']>;
  resolvedByPrincipalId?: Maybe<Scalars['String']['output']>;
  status: ReviewModerationCaseStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiReviewModerationCaseConnection = {
  __typename?: 'ReviewModerationCaseConnection';
  edges: Array<ApiReviewModerationCaseEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiReviewModerationCaseCreateInput = {
  assignedToPrincipalId?: InputMaybe<Scalars['String']['input']>;
  contentId: Scalars['ID']['input'];
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  reasonCode: Scalars['String']['input'];
};

export type ApiReviewModerationCaseCreatePayload = {
  __typename?: 'ReviewModerationCaseCreatePayload';
  moderationCase?: Maybe<ApiReviewModerationCase>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewModerationCaseDetailsInput = {
  assignedToPrincipalId?: InputMaybe<Scalars['String']['input']>;
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
  reasonCode?: InputMaybe<Scalars['String']['input']>;
};

export type ApiReviewModerationCaseEdge = {
  __typename?: 'ReviewModerationCaseEdge';
  cursor: Scalars['String']['output'];
  node: ApiReviewModerationCase;
};

/** Ordering configuration for ReviewModerationCase */
export type ApiReviewModerationCaseOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewModerationCaseOrderField;
};

/** Fields available for sorting ReviewModerationCase */
export enum ReviewModerationCaseOrderField {
  /** Sort by assignedToPrincipalId */
  AssignedToPrincipalId = 'assignedToPrincipalId',
  /** Sort by contentId */
  ContentId = 'contentId',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by dueAt */
  DueAt = 'dueAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by priority */
  Priority = 'priority',
  /** Sort by reasonCode */
  ReasonCode = 'reasonCode',
  /** Sort by resolutionCode */
  ResolutionCode = 'resolutionCode',
  /** Sort by resolvedAt */
  ResolvedAt = 'resolvedAt',
  /** Sort by resolvedByPrincipalId */
  ResolvedByPrincipalId = 'resolvedByPrincipalId',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type ApiReviewModerationCaseResolutionInput = {
  resolutionCode?: InputMaybe<Scalars['String']['input']>;
  resolutionNote?: InputMaybe<Scalars['String']['input']>;
  /** Must be RESOLVED or CANCELLED. */
  status: ReviewModerationCaseStatus;
};

export enum ReviewModerationCaseStatus {
  Cancelled = 'CANCELLED',
  InReview = 'IN_REVIEW',
  Open = 'OPEN',
  Resolved = 'RESOLVED'
}

export type ApiReviewModerationCaseUpdateInput = {
  details?: InputMaybe<ApiReviewModerationCaseDetailsInput>;
  resolution?: InputMaybe<ApiReviewModerationCaseResolutionInput>;
};

export type ApiReviewModerationCaseUpdatePayload = {
  __typename?: 'ReviewModerationCaseUpdatePayload';
  moderationCase?: Maybe<ApiReviewModerationCase>;
  operationResults: Array<ApiReviewsOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ReviewModerationCase */
export type ApiReviewModerationCaseWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewModerationCaseWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewModerationCaseWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewModerationCaseWhereInput>>;
  /** Filter by assignedToPrincipalId */
  assignedToPrincipalId?: InputMaybe<ApiStringFilter>;
  /** Filter by contentId */
  contentId?: InputMaybe<ApiIdFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by dueAt */
  dueAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by priority */
  priority?: InputMaybe<ApiIntFilter>;
  /** Filter by reasonCode */
  reasonCode?: InputMaybe<ApiStringFilter>;
  /** Filter by resolutionCode */
  resolutionCode?: InputMaybe<ApiStringFilter>;
  /** Filter by resolvedAt */
  resolvedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by resolvedByPrincipalId */
  resolvedByPrincipalId?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Append-only moderation timeline entry. */
export type ApiReviewModerationEvent = ApiNode & {
  __typename?: 'ReviewModerationEvent';
  action: ReviewModerationAction;
  actorId?: Maybe<Scalars['String']['output']>;
  actorType: Scalars['String']['output'];
  content: ApiReviewContent;
  createdAt: Scalars['DateTime']['output'];
  fromStatus?: Maybe<ReviewContentStatus>;
  id: Scalars['ID']['output'];
  isAutomated: Scalars['Boolean']['output'];
  metadata: Scalars['JSON']['output'];
  moderationCase?: Maybe<ApiReviewModerationCase>;
  note?: Maybe<Scalars['String']['output']>;
  reasonCode?: Maybe<Scalars['String']['output']>;
  toStatus?: Maybe<ReviewContentStatus>;
};

export type ApiReviewModerationEventConnection = {
  __typename?: 'ReviewModerationEventConnection';
  edges: Array<ApiReviewModerationEventEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiReviewModerationEventEdge = {
  __typename?: 'ReviewModerationEventEdge';
  cursor: Scalars['String']['output'];
  node: ApiReviewModerationEvent;
};

export enum ReviewModerationMode {
  Automated = 'AUTOMATED',
  Postmoderation = 'POSTMODERATION',
  Premoderation = 'PREMODERATION'
}

/** Immutable automated moderation evidence; it is not the moderation decision. */
export type ApiReviewModerationSignal = ApiNode & {
  __typename?: 'ReviewModerationSignal';
  content: ApiReviewContent;
  createdAt: Scalars['DateTime']['output'];
  evidence: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  modelVersion?: Maybe<Scalars['String']['output']>;
  provider: Scalars['String']['output'];
  score?: Maybe<Scalars['Float']['output']>;
  signalType: Scalars['String']['output'];
  verdict: ReviewModerationVerdict;
};

export type ApiReviewModerationSignalConnection = {
  __typename?: 'ReviewModerationSignalConnection';
  edges: Array<ApiReviewModerationSignalEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiReviewModerationSignalEdge = {
  __typename?: 'ReviewModerationSignalEdge';
  cursor: Scalars['String']['output'];
  node: ApiReviewModerationSignal;
};

export enum ReviewModerationVerdict {
  Block = 'BLOCK',
  Pass = 'PASS',
  Review = 'REVIEW'
}

export enum ReviewNotificationChannel {
  Email = 'EMAIL',
  InApp = 'IN_APP',
  Push = 'PUSH',
  Sms = 'SMS'
}

/** Ordering configuration for Review */
export type ApiReviewOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewOrderField;
};

/** Fields available for sorting Review */
export enum ReviewOrderField {
  /** Sort by authorDisplayName */
  AuthorDisplayName = 'authorDisplayName',
  /** Sort by authorType */
  AuthorType = 'authorType',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by deletedAt */
  DeletedAt = 'deletedAt',
  /** Sort by dislikeCount */
  DislikeCount = 'dislikeCount',
  /** Sort by id */
  Id = 'id',
  /** Sort by isIncentivized */
  IsIncentivized = 'isIncentivized',
  /** Sort by likeCount */
  LikeCount = 'likeCount',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by mediaCount */
  MediaCount = 'mediaCount',
  /** Sort by openReportCount */
  OpenReportCount = 'openReportCount',
  /** Sort by productId */
  ProductId = 'productId',
  /** Sort by publishedAt */
  PublishedAt = 'publishedAt',
  /** Sort by rating */
  Rating = 'rating',
  /** Sort by reportCount */
  ReportCount = 'reportCount',
  /** Sort by revision */
  Revision = 'revision',
  /** Sort by sourceChannel */
  SourceChannel = 'sourceChannel',
  /** Sort by status */
  Status = 'status',
  /** Sort by title */
  Title = 'title',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by variantId */
  VariantId = 'variantId',
  /** Sort by verificationStatus */
  VerificationStatus = 'verificationStatus'
}

export enum ReviewPublicationStatus {
  Draft = 'DRAFT',
  Failed = 'FAILED',
  Published = 'PUBLISHED',
  Scheduled = 'SCHEDULED',
  Unpublished = 'UNPUBLISHED'
}

export type ApiReviewRating = {
  __typename?: 'ReviewRating';
  createdAt: Scalars['DateTime']['output'];
  criterion: ApiReviewRatingCriterion;
  updatedAt: Scalars['DateTime']['output'];
  value: Scalars['Int']['output'];
};

export type ApiReviewRatingBreakdown = {
  __typename?: 'ReviewRatingBreakdown';
  rating1Count: Scalars['Int']['output'];
  rating2Count: Scalars['Int']['output'];
  rating3Count: Scalars['Int']['output'];
  rating4Count: Scalars['Int']['output'];
  rating5Count: Scalars['Int']['output'];
};

export type ApiReviewRatingCriterion = ApiNode & {
  __typename?: 'ReviewRatingCriterion';
  appliesToAllProducts: Scalars['Boolean']['output'];
  assignments: Array<ApiReviewRatingCriterionAssignment>;
  code: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  defaultDescription?: Maybe<Scalars['String']['output']>;
  defaultTitle: Scalars['String']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isRequired: Scalars['Boolean']['output'];
  sortIndex: Scalars['Int']['output'];
  translations: Array<ApiReviewRatingCriterionTranslation>;
  updatedAt: Scalars['DateTime']['output'];
  weight: Scalars['Float']['output'];
};

export type ApiReviewRatingCriterionApplicabilityInput = {
  appliesToAllProducts: Scalars['Boolean']['input'];
};

export type ApiReviewRatingCriterionAssignment = ApiNode & {
  __typename?: 'ReviewRatingCriterionAssignment';
  createdAt: Scalars['DateTime']['output'];
  criterion: ApiReviewRatingCriterion;
  id: Scalars['ID']['output'];
  isRequiredOverride?: Maybe<Scalars['Boolean']['output']>;
  sortIndexOverride?: Maybe<Scalars['Int']['output']>;
  target: ApiReviewRatingCriterionTarget;
  targetId: Scalars['ID']['output'];
  targetType: ReviewRatingCriterionTargetType;
};

export type ApiReviewRatingCriterionAssignmentInput = {
  isRequiredOverride?: InputMaybe<Scalars['Boolean']['input']>;
  sortIndexOverride?: InputMaybe<Scalars['Int']['input']>;
  targetId: Scalars['ID']['input'];
  targetType: ReviewRatingCriterionTargetType;
};

export type ApiReviewRatingCriterionConnection = {
  __typename?: 'ReviewRatingCriterionConnection';
  edges: Array<ApiReviewRatingCriterionEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiReviewRatingCriterionCreateInput = {
  appliesToAllProducts?: InputMaybe<Scalars['Boolean']['input']>;
  assignments?: InputMaybe<Array<ApiReviewRatingCriterionAssignmentInput>>;
  code: Scalars['String']['input'];
  defaultDescription?: InputMaybe<Scalars['String']['input']>;
  defaultTitle: Scalars['String']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isRequired?: InputMaybe<Scalars['Boolean']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  translations?: InputMaybe<Array<ApiReviewRatingCriterionTranslationInput>>;
  weight?: InputMaybe<Scalars['Float']['input']>;
};

export type ApiReviewRatingCriterionCreatePayload = {
  __typename?: 'ReviewRatingCriterionCreatePayload';
  criterion?: Maybe<ApiReviewRatingCriterion>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewRatingCriterionDefinitionInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  defaultDescription?: InputMaybe<Scalars['String']['input']>;
  defaultTitle?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isRequired?: InputMaybe<Scalars['Boolean']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  weight?: InputMaybe<Scalars['Float']['input']>;
};

export type ApiReviewRatingCriterionDeleteInput = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  id: Scalars['ID']['input'];
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ApiReviewRatingCriterionDeletePayload = {
  __typename?: 'ReviewRatingCriterionDeletePayload';
  deletedCriterionId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewRatingCriterionEdge = {
  __typename?: 'ReviewRatingCriterionEdge';
  cursor: Scalars['String']['output'];
  node: ApiReviewRatingCriterion;
};

/** Ordering configuration for ReviewRatingCriterion */
export type ApiReviewRatingCriterionOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewRatingCriterionOrderField;
};

/** Fields available for sorting ReviewRatingCriterion */
export enum ReviewRatingCriterionOrderField {
  /** Sort by appliesToAllProducts */
  AppliesToAllProducts = 'appliesToAllProducts',
  /** Sort by code */
  Code = 'code',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by defaultTitle */
  DefaultTitle = 'defaultTitle',
  /** Sort by deletedAt */
  DeletedAt = 'deletedAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by isActive */
  IsActive = 'isActive',
  /** Sort by isRequired */
  IsRequired = 'isRequired',
  /** Sort by sortIndex */
  SortIndex = 'sortIndex',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by weight */
  Weight = 'weight'
}

export type ApiReviewRatingCriterionTarget = ApiCategory | ApiProduct;

export enum ReviewRatingCriterionTargetType {
  Category = 'CATEGORY',
  Product = 'PRODUCT'
}

export type ApiReviewRatingCriterionTranslation = {
  __typename?: 'ReviewRatingCriterionTranslation';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  locale: Scalars['String']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiReviewRatingCriterionTranslationInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  locale: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type ApiReviewRatingCriterionUpdateInput = {
  applicability?: InputMaybe<ApiReviewRatingCriterionApplicabilityInput>;
  /** Complete product/category assignment replacement when supplied. */
  assignments?: InputMaybe<Array<ApiReviewRatingCriterionAssignmentInput>>;
  definition?: InputMaybe<ApiReviewRatingCriterionDefinitionInput>;
  /** Complete translation replacement when supplied. */
  translations?: InputMaybe<Array<ApiReviewRatingCriterionTranslationInput>>;
};

export type ApiReviewRatingCriterionUpdatePayload = {
  __typename?: 'ReviewRatingCriterionUpdatePayload';
  criterion?: Maybe<ApiReviewRatingCriterion>;
  operationResults: Array<ApiReviewsOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ReviewRatingCriterion */
export type ApiReviewRatingCriterionWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewRatingCriterionWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewRatingCriterionWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewRatingCriterionWhereInput>>;
  /** Filter by appliesToAllProducts */
  appliesToAllProducts?: InputMaybe<ApiBooleanFilter>;
  /** Filter by code */
  code?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by defaultTitle */
  defaultTitle?: InputMaybe<ApiStringFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isActive */
  isActive?: InputMaybe<ApiBooleanFilter>;
  /** Filter by isRequired */
  isRequired?: InputMaybe<ApiBooleanFilter>;
  /** Filter by sortIndex */
  sortIndex?: InputMaybe<ApiIntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by weight */
  weight?: InputMaybe<ApiFloatFilter>;
};

export type ApiReviewRatingUpdateInput = {
  /** Complete detailed criterion rating replacement when supplied. */
  criteria?: InputMaybe<Array<ApiReviewRatingValueInput>>;
  overall?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiReviewRatingValueInput = {
  criterionId: Scalars['ID']['input'];
  value: Scalars['Int']['input'];
};

export type ApiReviewReply = ApiNode & ApiReviewContent & {
  __typename?: 'ReviewReply';
  author: ApiReviewContentAuthor;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  externalReferences: ApiReviewContentExternalReferenceConnection;
  id: Scalars['ID']['output'];
  idempotencyKey?: Maybe<Scalars['String']['output']>;
  isOfficial: Scalars['Boolean']['output'];
  kind: ReviewContentKind;
  locale: Scalars['String']['output'];
  metrics: ApiReviewContentMetrics;
  moderatedAt?: Maybe<Scalars['DateTime']['output']>;
  moderatedByPrincipalId?: Maybe<Scalars['String']['output']>;
  moderationCases: ApiReviewModerationCaseConnection;
  moderationEvents: ApiReviewModerationEventConnection;
  moderationNote?: Maybe<Scalars['String']['output']>;
  moderationSignals: ApiReviewModerationSignalConnection;
  publications: Array<ApiReviewContentPublication>;
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  redactedAt?: Maybe<Scalars['DateTime']['output']>;
  reports: ApiReviewContentReportConnection;
  review: ApiReview;
  revision: Scalars['Int']['output'];
  revisions: ApiReviewContentRevisionConnection;
  sortIndex: Scalars['Int']['output'];
  sourceChannel: Scalars['String']['output'];
  sourceMetadata: Scalars['JSON']['output'];
  status: ReviewContentStatus;
  title?: Maybe<Scalars['String']['output']>;
  translations: Array<ApiReviewContentTranslation>;
  unpublishedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  votes: ApiReviewContentVoteConnection;
};


export type ApiReviewReplyExternalReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiReviewReplyModerationCasesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiReviewReplyModerationEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiReviewReplyModerationSignalsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiReviewReplyReportsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiReviewReplyRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiReviewReplyVotesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiReviewReplyConnection = {
  __typename?: 'ReviewReplyConnection';
  edges: Array<ApiReviewReplyEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiReviewReplyCreateInput = {
  content: ApiReviewContentCreateInput;
  isOfficial?: InputMaybe<Scalars['Boolean']['input']>;
  reviewId: Scalars['ID']['input'];
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiReviewReplyCreatePayload = {
  __typename?: 'ReviewReplyCreatePayload';
  reviewReply?: Maybe<ApiReviewReply>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewReplyDeletePayload = {
  __typename?: 'ReviewReplyDeletePayload';
  deletedReviewReplyId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewReplyEdge = {
  __typename?: 'ReviewReplyEdge';
  cursor: Scalars['String']['output'];
  node: ApiReviewReply;
};

/** Ordering configuration for ReviewReply */
export type ApiReviewReplyOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewReplyOrderField;
};

/** Fields available for sorting ReviewReply */
export enum ReviewReplyOrderField {
  /** Sort by authorType */
  AuthorType = 'authorType',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by deletedAt */
  DeletedAt = 'deletedAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by isOfficial */
  IsOfficial = 'isOfficial',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by reviewId */
  ReviewId = 'reviewId',
  /** Sort by revision */
  Revision = 'revision',
  /** Sort by sortIndex */
  SortIndex = 'sortIndex',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

export type ApiReviewReplyPropertiesUpdateInput = {
  isOfficial?: InputMaybe<Scalars['Boolean']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiReviewReplyUpdateInput = {
  /** Text, author, source, moderation, translations, and publications. */
  content?: InputMaybe<ApiReviewContentUpdateInput>;
  properties?: InputMaybe<ApiReviewReplyPropertiesUpdateInput>;
};

export type ApiReviewReplyUpdatePayload = {
  __typename?: 'ReviewReplyUpdatePayload';
  operationResults: Array<ApiReviewsOperationResult>;
  reviewReply?: Maybe<ApiReviewReply>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ReviewReply */
export type ApiReviewReplyWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewReplyWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewReplyWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewReplyWhereInput>>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<ApiStringFilter>;
  /** Filter by body */
  body?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isOfficial */
  isOfficial?: InputMaybe<ApiBooleanFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by reviewId */
  reviewId?: InputMaybe<ApiIdFilter>;
  /** Filter by revision */
  revision?: InputMaybe<ApiIntFilter>;
  /** Filter by sortIndex */
  sortIndex?: InputMaybe<ApiIntFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiReviewRequest = ApiNode & {
  __typename?: 'ReviewRequest';
  attemptCount: Scalars['Int']['output'];
  channel: ReviewNotificationChannel;
  createdAt: Scalars['DateTime']['output'];
  customer: ApiCustomer;
  deliveredAt?: Maybe<Scalars['DateTime']['output']>;
  events: ApiReviewRequestEventConnection;
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  lastError?: Maybe<Scalars['String']['output']>;
  locale: Scalars['String']['output'];
  openedAt?: Maybe<Scalars['DateTime']['output']>;
  orderId: Scalars['ID']['output'];
  orderLineId: Scalars['ID']['output'];
  product: ApiProduct;
  providerMessageId?: Maybe<Scalars['String']['output']>;
  review?: Maybe<ApiReview>;
  scheduledAt: Scalars['DateTime']['output'];
  sentAt?: Maybe<Scalars['DateTime']['output']>;
  sourceChannel: Scalars['String']['output'];
  status: ReviewRequestStatus;
  submittedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  variant?: Maybe<ApiVariant>;
};


export type ApiReviewRequestEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiReviewRequestConnection = {
  __typename?: 'ReviewRequestConnection';
  edges: Array<ApiReviewRequestEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiReviewRequestCreateInput = {
  channel: ReviewNotificationChannel;
  customerId: Scalars['ID']['input'];
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  idempotencyKey: Scalars['String']['input'];
  locale: Scalars['String']['input'];
  orderId: Scalars['ID']['input'];
  orderLineId: Scalars['ID']['input'];
  productId: Scalars['ID']['input'];
  scheduledAt: Scalars['DateTime']['input'];
  sourceChannel?: InputMaybe<Scalars['String']['input']>;
  variantId?: InputMaybe<Scalars['ID']['input']>;
};

export type ApiReviewRequestCreatePayload = {
  __typename?: 'ReviewRequestCreatePayload';
  reviewRequest?: Maybe<ApiReviewRequest>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewRequestDeliveryUpdateInput = {
  channel?: InputMaybe<ReviewNotificationChannel>;
  locale?: InputMaybe<Scalars['String']['input']>;
};

export type ApiReviewRequestEdge = {
  __typename?: 'ReviewRequestEdge';
  cursor: Scalars['String']['output'];
  node: ApiReviewRequest;
};

export type ApiReviewRequestEvent = ApiNode & {
  __typename?: 'ReviewRequestEvent';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  metadata: Scalars['JSON']['output'];
  occurredAt: Scalars['DateTime']['output'];
  providerEventId?: Maybe<Scalars['String']['output']>;
  reviewRequest: ApiReviewRequest;
  type: ReviewRequestEventType;
};

export type ApiReviewRequestEventConnection = {
  __typename?: 'ReviewRequestEventConnection';
  edges: Array<ApiReviewRequestEventEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiReviewRequestEventEdge = {
  __typename?: 'ReviewRequestEventEdge';
  cursor: Scalars['String']['output'];
  node: ApiReviewRequestEvent;
};

export enum ReviewRequestEventType {
  Bounced = 'BOUNCED',
  Cancelled = 'CANCELLED',
  Clicked = 'CLICKED',
  Complained = 'COMPLAINED',
  Delivered = 'DELIVERED',
  Expired = 'EXPIRED',
  Failed = 'FAILED',
  Opened = 'OPENED',
  Scheduled = 'SCHEDULED',
  Sent = 'SENT',
  Submitted = 'SUBMITTED'
}

/** Ordering configuration for ReviewRequest */
export type ApiReviewRequestOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewRequestOrderField;
};

/** Fields available for sorting ReviewRequest */
export enum ReviewRequestOrderField {
  /** Sort by attemptCount */
  AttemptCount = 'attemptCount',
  /** Sort by channel */
  Channel = 'channel',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by customerId */
  CustomerId = 'customerId',
  /** Sort by deliveredAt */
  DeliveredAt = 'deliveredAt',
  /** Sort by expiresAt */
  ExpiresAt = 'expiresAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by openedAt */
  OpenedAt = 'openedAt',
  /** Sort by orderId */
  OrderId = 'orderId',
  /** Sort by orderLineId */
  OrderLineId = 'orderLineId',
  /** Sort by productId */
  ProductId = 'productId',
  /** Sort by providerMessageId */
  ProviderMessageId = 'providerMessageId',
  /** Sort by reviewId */
  ReviewId = 'reviewId',
  /** Sort by scheduledAt */
  ScheduledAt = 'scheduledAt',
  /** Sort by sentAt */
  SentAt = 'sentAt',
  /** Sort by sourceChannel */
  SourceChannel = 'sourceChannel',
  /** Sort by status */
  Status = 'status',
  /** Sort by submittedAt */
  SubmittedAt = 'submittedAt',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by variantId */
  VariantId = 'variantId'
}

export type ApiReviewRequestScheduleUpdateInput = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  scheduledAt: Scalars['DateTime']['input'];
};

export enum ReviewRequestStatus {
  Cancelled = 'CANCELLED',
  Delivered = 'DELIVERED',
  Expired = 'EXPIRED',
  Failed = 'FAILED',
  Opened = 'OPENED',
  Scheduled = 'SCHEDULED',
  Sent = 'SENT',
  Submitted = 'SUBMITTED'
}

export enum ReviewRequestTransitionAction {
  Cancel = 'CANCEL',
  Expire = 'EXPIRE',
  Reschedule = 'RESCHEDULE',
  Retry = 'RETRY'
}

export type ApiReviewRequestTransitionInput = {
  action: ReviewRequestTransitionAction;
  reason?: InputMaybe<Scalars['String']['input']>;
};

export type ApiReviewRequestUpdateInput = {
  delivery?: InputMaybe<ApiReviewRequestDeliveryUpdateInput>;
  schedule?: InputMaybe<ApiReviewRequestScheduleUpdateInput>;
  transition?: InputMaybe<ApiReviewRequestTransitionInput>;
};

export type ApiReviewRequestUpdatePayload = {
  __typename?: 'ReviewRequestUpdatePayload';
  operationResults: Array<ApiReviewsOperationResult>;
  reviewRequest?: Maybe<ApiReviewRequest>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ReviewRequest */
export type ApiReviewRequestWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewRequestWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewRequestWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewRequestWhereInput>>;
  /** Filter by attemptCount */
  attemptCount?: InputMaybe<ApiIntFilter>;
  /** Filter by channel */
  channel?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by customerId */
  customerId?: InputMaybe<ApiIdFilter>;
  /** Filter by deliveredAt */
  deliveredAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by expiresAt */
  expiresAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by openedAt */
  openedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by orderId */
  orderId?: InputMaybe<ApiIdFilter>;
  /** Filter by orderLineId */
  orderLineId?: InputMaybe<ApiIdFilter>;
  /** Filter by productId */
  productId?: InputMaybe<ApiIdFilter>;
  /** Filter by providerMessageId */
  providerMessageId?: InputMaybe<ApiStringFilter>;
  /** Filter by reviewId */
  reviewId?: InputMaybe<ApiIdFilter>;
  /** Filter by scheduledAt */
  scheduledAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by sentAt */
  sentAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by sourceChannel */
  sourceChannel?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by submittedAt */
  submittedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by variantId */
  variantId?: InputMaybe<ApiIdFilter>;
};

export type ApiReviewStoreConfiguration = ApiNode & {
  __typename?: 'ReviewStoreConfiguration';
  answerEditWindowHours: Scalars['Int']['output'];
  answerModerationMode: ReviewModerationMode;
  createdAt: Scalars['DateTime']['output'];
  customerAnswersEnabled: Scalars['Boolean']['output'];
  guestQuestionsEnabled: Scalars['Boolean']['output'];
  guestReviewsEnabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  maxAnswersPerQuestion: Scalars['Int']['output'];
  maxReviewMediaCount: Scalars['Int']['output'];
  questionEditWindowHours: Scalars['Int']['output'];
  questionModerationMode: ReviewModerationMode;
  questionsEnabled: Scalars['Boolean']['output'];
  reviewDuplicatePolicy: ReviewDuplicatePolicy;
  reviewEditWindowHours: Scalars['Int']['output'];
  reviewModerationMode: ReviewModerationMode;
  reviewRequestDelayDays: Scalars['Int']['output'];
  reviewRequestExpiryDays: Scalars['Int']['output'];
  reviewRequestsEnabled: Scalars['Boolean']['output'];
  reviewsEnabled: Scalars['Boolean']['output'];
  revision: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  verifiedPurchaseRequired: Scalars['Boolean']['output'];
};

export type ApiReviewStoreConfigurationUpdateInput = {
  answerEditWindowHours?: InputMaybe<Scalars['Int']['input']>;
  answerModerationMode?: InputMaybe<ReviewModerationMode>;
  customerAnswersEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  guestQuestionsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  guestReviewsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  maxAnswersPerQuestion?: InputMaybe<Scalars['Int']['input']>;
  maxReviewMediaCount?: InputMaybe<Scalars['Int']['input']>;
  questionEditWindowHours?: InputMaybe<Scalars['Int']['input']>;
  questionModerationMode?: InputMaybe<ReviewModerationMode>;
  questionsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  reviewDuplicatePolicy?: InputMaybe<ReviewDuplicatePolicy>;
  reviewEditWindowHours?: InputMaybe<Scalars['Int']['input']>;
  reviewModerationMode?: InputMaybe<ReviewModerationMode>;
  reviewRequestDelayDays?: InputMaybe<Scalars['Int']['input']>;
  reviewRequestExpiryDays?: InputMaybe<Scalars['Int']['input']>;
  reviewRequestsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  reviewsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  verifiedPurchaseRequired?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ApiReviewStoreConfigurationUpdatePayload = {
  __typename?: 'ReviewStoreConfigurationUpdatePayload';
  configuration?: Maybe<ApiReviewStoreConfiguration>;
  operationResults: Array<ApiReviewsOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewSubjectUpdateInput = {
  orderId?: InputMaybe<Scalars['ID']['input']>;
  orderLineId?: InputMaybe<Scalars['ID']['input']>;
  productId?: InputMaybe<Scalars['ID']['input']>;
  variantId?: InputMaybe<Scalars['ID']['input']>;
};

export enum ReviewTranslationSource {
  Human = 'HUMAN',
  Import = 'IMPORT',
  Machine = 'MACHINE'
}

/** Section-based aggregate update following Catalog productUpdate semantics. */
export type ApiReviewUpdateInput = {
  /** Text, author, source, moderation, translations, and publications. */
  content?: InputMaybe<ApiReviewContentUpdateInput>;
  incentive?: InputMaybe<ApiReviewIncentiveUpdateInput>;
  /** Complete media replacement when supplied. Empty removes every attachment. */
  media?: InputMaybe<Array<ApiReviewMediaSyncItemInput>>;
  rating?: InputMaybe<ApiReviewRatingUpdateInput>;
  subject?: InputMaybe<ApiReviewSubjectUpdateInput>;
  verification?: InputMaybe<ApiReviewVerificationUpdateInput>;
};

export type ApiReviewUpdatePayload = {
  __typename?: 'ReviewUpdatePayload';
  operationResults: Array<ApiReviewsOperationResult>;
  review?: Maybe<ApiReview>;
  userErrors: Array<ApiGenericUserError>;
};

export enum ReviewVerificationStatus {
  Revoked = 'REVOKED',
  Unverified = 'UNVERIFIED',
  Verified = 'VERIFIED'
}

export type ApiReviewVerificationUpdateInput = {
  method?: InputMaybe<Scalars['String']['input']>;
  status: ReviewVerificationStatus;
  verifiedAt?: InputMaybe<Scalars['DateTime']['input']>;
};

/** Filter conditions for Review */
export type ApiReviewWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewWhereInput>>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by authorDisplayName */
  authorDisplayName?: InputMaybe<ApiStringFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<ApiStringFilter>;
  /** Filter by body */
  body?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by dislikeCount */
  dislikeCount?: InputMaybe<ApiIntFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isIncentivized */
  isIncentivized?: InputMaybe<ApiBooleanFilter>;
  /** Filter by likeCount */
  likeCount?: InputMaybe<ApiIntFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by mediaCount */
  mediaCount?: InputMaybe<ApiIntFilter>;
  /** Filter by openReportCount */
  openReportCount?: InputMaybe<ApiIntFilter>;
  /** Filter by orderId */
  orderId?: InputMaybe<ApiIdFilter>;
  /** Filter by orderLineId */
  orderLineId?: InputMaybe<ApiIdFilter>;
  /** Filter by productId */
  productId?: InputMaybe<ApiIdFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by rating */
  rating?: InputMaybe<ApiIntFilter>;
  /** Filter by reportCount */
  reportCount?: InputMaybe<ApiIntFilter>;
  /** Filter by revision */
  revision?: InputMaybe<ApiIntFilter>;
  /** Filter by sourceChannel */
  sourceChannel?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by title */
  title?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by variantId */
  variantId?: InputMaybe<ApiIdFilter>;
  /** Filter by verificationStatus */
  verificationStatus?: InputMaybe<ApiStringFilter>;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutation = {
  __typename?: 'ReviewsMutation';
  contentExternalReferenceCreate: ApiReviewContentExternalReferenceCreatePayload;
  contentExternalReferenceDelete: ApiReviewContentExternalReferenceDeletePayload;
  contentExternalReferenceUpdate: ApiReviewContentExternalReferenceUpdatePayload;
  contentRedact: ApiReviewContentUpdatePayload;
  contentReportUpdate: ApiReviewContentReportUpdatePayload;
  contentRevisionRestore: ApiReviewContentUpdatePayload;
  moderationCaseCreate: ApiReviewModerationCaseCreatePayload;
  moderationCaseUpdate: ApiReviewModerationCaseUpdatePayload;
  productQuestionAnswerCreate: ApiProductQuestionAnswerCreatePayload;
  productQuestionAnswerDelete: ApiProductQuestionAnswerDeletePayload;
  productQuestionAnswerUpdate: ApiProductQuestionAnswerUpdatePayload;
  productQuestionCreate: ApiProductQuestionCreatePayload;
  productQuestionDelete: ApiProductQuestionDeletePayload;
  productQuestionSubscriptionUpdate: ApiProductQuestionSubscriptionUpdatePayload;
  productQuestionUpdate: ApiProductQuestionUpdatePayload;
  ratingCriterionCreate: ApiReviewRatingCriterionCreatePayload;
  ratingCriterionDelete: ApiReviewRatingCriterionDeletePayload;
  ratingCriterionUpdate: ApiReviewRatingCriterionUpdatePayload;
  reviewCreate: ApiReviewCreatePayload;
  reviewDelete: ApiReviewDeletePayload;
  reviewReplyCreate: ApiReviewReplyCreatePayload;
  reviewReplyDelete: ApiReviewReplyDeletePayload;
  reviewReplyUpdate: ApiReviewReplyUpdatePayload;
  reviewRequestCreate: ApiReviewRequestCreatePayload;
  reviewRequestUpdate: ApiReviewRequestUpdatePayload;
  reviewUpdate: ApiReviewUpdatePayload;
  storeConfigurationUpdate: ApiReviewStoreConfigurationUpdatePayload;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationContentExternalReferenceCreateArgs = {
  input: ApiReviewContentExternalReferenceCreateInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationContentExternalReferenceDeleteArgs = {
  input: ApiReviewContentExternalReferenceDeleteInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationContentExternalReferenceUpdateArgs = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  externalReferenceId: Scalars['ID']['input'];
  operations?: InputMaybe<ApiReviewContentExternalReferenceUpdateInput>;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationContentRedactArgs = {
  contentId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationContentReportUpdateArgs = {
  contentReportId: Scalars['ID']['input'];
  expectedUpdatedAt: Scalars['DateTime']['input'];
  operations?: InputMaybe<ApiReviewContentReportUpdateInput>;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationContentRevisionRestoreArgs = {
  contentId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  revision: Scalars['Int']['input'];
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationModerationCaseCreateArgs = {
  input: ApiReviewModerationCaseCreateInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationModerationCaseUpdateArgs = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  moderationCaseId: Scalars['ID']['input'];
  operations?: InputMaybe<ApiReviewModerationCaseUpdateInput>;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationProductQuestionAnswerCreateArgs = {
  input: ApiProductQuestionAnswerCreateInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationProductQuestionAnswerDeleteArgs = {
  input: ApiReviewContentDeleteInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationProductQuestionAnswerUpdateArgs = {
  expectedRevision: Scalars['Int']['input'];
  operations?: InputMaybe<ApiProductQuestionAnswerUpdateInput>;
  productQuestionAnswerId: Scalars['ID']['input'];
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationProductQuestionCreateArgs = {
  input: ApiProductQuestionCreateInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationProductQuestionDeleteArgs = {
  input: ApiReviewContentDeleteInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationProductQuestionSubscriptionUpdateArgs = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  operations?: InputMaybe<ApiProductQuestionSubscriptionUpdateInput>;
  subscriptionId: Scalars['ID']['input'];
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationProductQuestionUpdateArgs = {
  expectedRevision: Scalars['Int']['input'];
  operations?: InputMaybe<ApiProductQuestionUpdateInput>;
  productQuestionId: Scalars['ID']['input'];
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationRatingCriterionCreateArgs = {
  input: ApiReviewRatingCriterionCreateInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationRatingCriterionDeleteArgs = {
  input: ApiReviewRatingCriterionDeleteInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationRatingCriterionUpdateArgs = {
  criterionId: Scalars['ID']['input'];
  expectedUpdatedAt: Scalars['DateTime']['input'];
  operations?: InputMaybe<ApiReviewRatingCriterionUpdateInput>;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationReviewCreateArgs = {
  input: ApiReviewCreateInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationReviewDeleteArgs = {
  input: ApiReviewContentDeleteInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationReviewReplyCreateArgs = {
  input: ApiReviewReplyCreateInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationReviewReplyDeleteArgs = {
  input: ApiReviewContentDeleteInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationReviewReplyUpdateArgs = {
  expectedRevision: Scalars['Int']['input'];
  operations?: InputMaybe<ApiReviewReplyUpdateInput>;
  reviewReplyId: Scalars['ID']['input'];
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationReviewRequestCreateArgs = {
  input: ApiReviewRequestCreateInput;
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationReviewRequestUpdateArgs = {
  expectedUpdatedAt: Scalars['DateTime']['input'];
  operations?: InputMaybe<ApiReviewRequestUpdateInput>;
  reviewRequestId: Scalars['ID']['input'];
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationReviewUpdateArgs = {
  expectedRevision: Scalars['Int']['input'];
  operations?: InputMaybe<ApiReviewUpdateInput>;
  reviewId: Scalars['ID']['input'];
};


/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationStoreConfigurationUpdateArgs = {
  configurationId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  operations?: InputMaybe<ApiReviewStoreConfigurationUpdateInput>;
};

/** Result for one section of a unified update. */
export type ApiReviewsOperationResult = {
  __typename?: 'ReviewsOperationResult';
  applied: Scalars['Boolean']['output'];
  clientMutationId?: Maybe<Scalars['String']['output']>;
  entityId?: Maybe<Scalars['ID']['output']>;
  errors: Array<ApiGenericUserError>;
  type: ReviewsOperationType;
};

/** Logical sections executed by unified admin update workflows. */
export enum ReviewsOperationType {
  ContentAuthorUpdate = 'CONTENT_AUTHOR_UPDATE',
  ContentExternalReferenceUpdate = 'CONTENT_EXTERNAL_REFERENCE_UPDATE',
  ContentModerationUpdate = 'CONTENT_MODERATION_UPDATE',
  ContentPublicationsSync = 'CONTENT_PUBLICATIONS_SYNC',
  ContentRedact = 'CONTENT_REDACT',
  ContentReportUpdate = 'CONTENT_REPORT_UPDATE',
  ContentRevisionRestore = 'CONTENT_REVISION_RESTORE',
  ContentSourceUpdate = 'CONTENT_SOURCE_UPDATE',
  ContentTranslationsSync = 'CONTENT_TRANSLATIONS_SYNC',
  ContentUpdate = 'CONTENT_UPDATE',
  ModerationCaseUpdate = 'MODERATION_CASE_UPDATE',
  ProductQuestionAnswerUpdate = 'PRODUCT_QUESTION_ANSWER_UPDATE',
  ProductQuestionSubscriptionUpdate = 'PRODUCT_QUESTION_SUBSCRIPTION_UPDATE',
  ProductQuestionUpdate = 'PRODUCT_QUESTION_UPDATE',
  RatingCriterionApplicabilityUpdate = 'RATING_CRITERION_APPLICABILITY_UPDATE',
  RatingCriterionAssignmentsSync = 'RATING_CRITERION_ASSIGNMENTS_SYNC',
  RatingCriterionDefinitionUpdate = 'RATING_CRITERION_DEFINITION_UPDATE',
  RatingCriterionTranslationsSync = 'RATING_CRITERION_TRANSLATIONS_SYNC',
  ReviewIncentiveUpdate = 'REVIEW_INCENTIVE_UPDATE',
  ReviewMediaSync = 'REVIEW_MEDIA_SYNC',
  ReviewRatingUpdate = 'REVIEW_RATING_UPDATE',
  ReviewReplyUpdate = 'REVIEW_REPLY_UPDATE',
  ReviewRequestUpdate = 'REVIEW_REQUEST_UPDATE',
  ReviewSubjectUpdate = 'REVIEW_SUBJECT_UPDATE',
  ReviewVerificationUpdate = 'REVIEW_VERIFICATION_UPDATE',
  StoreConfigurationUpdate = 'STORE_CONFIGURATION_UPDATE'
}

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQuery = {
  __typename?: 'ReviewsQuery';
  /** Any moderated content aggregate owned by Reviews. */
  content?: Maybe<ApiReviewContent>;
  contentExternalReference?: Maybe<ApiReviewContentExternalReference>;
  contentExternalReferences: ApiReviewContentExternalReferenceConnection;
  contentReport?: Maybe<ApiReviewContentReport>;
  contentReports: ApiReviewContentReportConnection;
  contents: ApiReviewContentConnection;
  moderationCase?: Maybe<ApiReviewModerationCase>;
  moderationCases: ApiReviewModerationCaseConnection;
  /** Resolve a Reviews-owned node by global ID. */
  node?: Maybe<ApiNode>;
  /** Resolve multiple Reviews-owned nodes while preserving input order. */
  nodes: Array<Maybe<ApiNode>>;
  productQuestion?: Maybe<ApiProductQuestion>;
  productQuestionAnswer?: Maybe<ApiProductQuestionAnswer>;
  productQuestionAnswers: ApiProductQuestionAnswerConnection;
  productQuestionSummary?: Maybe<ApiProductQuestionSummary>;
  productQuestions: ApiProductQuestionConnection;
  productReviewSummary?: Maybe<ApiProductReviewSummary>;
  ratingCriteria: ApiReviewRatingCriterionConnection;
  ratingCriterion?: Maybe<ApiReviewRatingCriterion>;
  review?: Maybe<ApiReview>;
  reviewReplies: ApiReviewReplyConnection;
  reviewReply?: Maybe<ApiReviewReply>;
  reviewRequest?: Maybe<ApiReviewRequest>;
  reviewRequests: ApiReviewRequestConnection;
  reviews: ApiReviewConnection;
  /** Current store review and Q&A configuration. */
  storeConfiguration?: Maybe<ApiReviewStoreConfiguration>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryContentArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryContentExternalReferenceArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryContentExternalReferencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiReviewContentExternalReferenceOrderByInput>>;
  where?: InputMaybe<ApiReviewContentExternalReferenceWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryContentReportArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryContentReportsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiReviewContentReportOrderByInput>>;
  where?: InputMaybe<ApiReviewContentReportWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryContentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ApiReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ApiReviewContentOrderByInput>>;
  where?: InputMaybe<ApiReviewContentWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryModerationCaseArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryModerationCasesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiReviewModerationCaseOrderByInput>>;
  where?: InputMaybe<ApiReviewModerationCaseWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryProductQuestionArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryProductQuestionAnswerArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryProductQuestionAnswersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ApiReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ApiProductQuestionAnswerOrderByInput>>;
  where?: InputMaybe<ApiProductQuestionAnswerWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryProductQuestionSummaryArgs = {
  productId: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryProductQuestionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ApiReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ApiProductQuestionOrderByInput>>;
  where?: InputMaybe<ApiProductQuestionWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryProductReviewSummaryArgs = {
  productId: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryRatingCriteriaArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiReviewRatingCriterionOrderByInput>>;
  where?: InputMaybe<ApiReviewRatingCriterionWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryRatingCriterionArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryReviewArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryReviewRepliesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ApiReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ApiReviewReplyOrderByInput>>;
  where?: InputMaybe<ApiReviewReplyWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryReviewReplyArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryReviewRequestArgs = {
  id: Scalars['ID']['input'];
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryReviewRequestsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiReviewRequestOrderByInput>>;
  where?: InputMaybe<ApiReviewRequestWhereInput>;
};


/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryReviewsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ApiReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ApiReviewOrderByInput>>;
  where?: InputMaybe<ApiReviewWhereInput>;
};

/** Rich text content in multiple formats. */
export type ApiRichText = {
  __typename?: 'RichText';
  /** HTML content. */
  html: Scalars['String']['output'];
  /** EditorJS JSON content. */
  json: Scalars['JSON']['output'];
  /** Plain text content. */
  text: Scalars['String']['output'];
};

/** Input for rich text content (all fields required). */
export type ApiRichTextInput = {
  /** HTML content. */
  html: Scalars['String']['input'];
  /** EditorJS JSON content. */
  json: Scalars['JSON']['input'];
  /** Plain text content. */
  text: Scalars['String']['input'];
};

/** Role with permissions - universal, can be assigned at any level. */
export type ApiRole = {
  __typename?: 'Role';
  /** Role creation date. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** Role description. */
  description?: Maybe<Scalars['String']['output']>;
  /** Human-readable display name. */
  displayName: Scalars['String']['output'];
  /**
   * Domain scope for this role.
   * - "org" = organization-level role
   * - "store:{uuid}" = store-specific role
   */
  domain: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** System role cannot be deleted or modified. */
  isSystem: Scalars['Boolean']['output'];
  /** Unique role name within organization (e.g.: admin, manager, viewer). */
  name: Scalars['String']['output'];
  /** Role permissions. */
  permissions: Array<ApiRolePermission>;
  /** Role last update date. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** Role assignment - assigns role to user in specific domain. */
export type ApiRoleAssignment = {
  /** Domain ID ("org" for organization, or "store:{uuid}"). */
  domain: Scalars['String']['input'];
  /** Role name. */
  role: Scalars['String']['input'];
};

/** Input for creating a role. */
export type ApiRoleCreateInput = {
  /** Description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Display name. */
  displayName: Scalars['String']['input'];
  /**
   * Domain scope for role.
   * - "org" = organization-level role
   * - "store:{uuid}" = store-specific role
   */
  domain: Scalars['String']['input'];
  /** Unique role name (slug). */
  name: Scalars['String']['input'];
  /** Organization ID where the role will be created. */
  organizationId: Scalars['ID']['input'];
  /** Role permissions. */
  permissions: Array<ApiRolePermissionInput>;
};

export type ApiRoleCreatePayload = {
  __typename?: 'RoleCreatePayload';
  role?: Maybe<ApiRole>;
  userErrors: Array<ApiGenericUserError>;
};

/** Input for deleting a role. */
export type ApiRoleDeleteInput = {
  /** Role ID to delete. */
  id: Scalars['ID']['input'];
  /** Organization ID where the role exists. */
  organizationId: Scalars['ID']['input'];
};

export type ApiRoleDeletePayload = {
  __typename?: 'RoleDeletePayload';
  deletedRoleName?: Maybe<Scalars['String']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

/** Role mutations. */
export type ApiRoleMutation = {
  __typename?: 'RoleMutation';
  /**
   * Create custom role.
   * Requires: project:admin permission.
   */
  roleCreate: ApiRoleCreatePayload;
  /**
   * Delete custom role.
   * Requires: project:admin permission.
   * System roles cannot be deleted.
   * Roles with assigned users cannot be deleted.
   */
  roleDelete: ApiRoleDeletePayload;
  /**
   * Update role.
   * Requires: project:admin permission.
   * System roles cannot be modified.
   */
  roleUpdate: ApiRoleUpdatePayload;
};


/** Role mutations. */
export type ApiRoleMutationRoleCreateArgs = {
  input: ApiRoleCreateInput;
};


/** Role mutations. */
export type ApiRoleMutationRoleDeleteArgs = {
  input: ApiRoleDeleteInput;
};


/** Role mutations. */
export type ApiRoleMutationRoleUpdateArgs = {
  input: ApiRoleUpdateInput;
};

/** Role permission - access to resource with specific actions. */
export type ApiRolePermission = {
  __typename?: 'RolePermission';
  /** Allowed actions (e.g.: create, read, update, delete). */
  actions: Array<Scalars['String']['output']>;
  /** Resource name (e.g.: org.profile, store.members). */
  resource: Scalars['String']['output'];
};

/** Input for role permission. */
export type ApiRolePermissionInput = {
  /** Action level (read, write, admin). Higher levels include lower ones. */
  action: Action;
  /** Resource (e.g.: org.profile, store.members). */
  resource: Scalars['String']['input'];
};

/** Input for updating a role. */
export type ApiRoleUpdateInput = {
  /** New description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** New display name. */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** Role ID to update. */
  id: Scalars['ID']['input'];
  /** Organization ID where the role exists. */
  organizationId: Scalars['ID']['input'];
  /** New permissions (completely replaces existing). */
  permissions?: InputMaybe<Array<ApiRolePermissionInput>>;
};

export type ApiRoleUpdatePayload = {
  __typename?: 'RoleUpdatePayload';
  role?: Maybe<ApiRole>;
  userErrors: Array<ApiGenericUserError>;
};

/** S3-specific file data. */
export type ApiS3ObjectData = {
  __typename?: 'S3ObjectData';
  /** The bucket ID where this file is stored. */
  bucketId: Scalars['ID']['output'];
  /** ETag from S3. */
  etag?: Maybe<Scalars['String']['output']>;
  /** S3 object key (path within bucket). */
  objectKey: Scalars['String']['output'];
  /** Storage class (STANDARD, GLACIER, etc). */
  storageClass: Scalars['String']['output'];
};

export type ApiSearchConfigurationDeleteInput = {
  expectedVersion: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
};

export enum SearchExecutionMode {
  Fuzzy = 'FUZZY',
  Primary = 'PRIMARY'
}

export type ApiSearchExplain = {
  __typename?: 'SearchExplain';
  applicableProductBoostIds: Array<Scalars['ID']['output']>;
  boostOnlyCandidateCount: Scalars['Int']['output'];
  candidateCount: Scalars['Int']['output'];
  locale: LocaleCode;
  matchedSynonymGroupIds: Array<Scalars['ID']['output']>;
  membershipSerializedBytes: Scalars['Int']['output'];
  mode: SearchExecutionMode;
  normalizationContractVersion: Scalars['String']['output'];
  normalizationProfileRevision: Scalars['String']['output'];
  normalizedQuery: Scalars['String']['output'];
  originalQuery: Scalars['String']['output'];
  planFingerprint: Scalars['String']['output'];
  reasons: Array<SearchExplainReason>;
  settings: ApiSearchExplainSettings;
  units: Array<ApiSearchExplainUnit>;
  wholeQueryClauses: Array<ApiSearchExplainClause>;
};

export type ApiSearchExplainClause = {
  __typename?: 'SearchExplainClause';
  alternatives: Array<ApiSearchExplainClause>;
  fields: Array<SearchField>;
  kind: SearchExplainClauseKind;
  lexemes: Array<Scalars['String']['output']>;
  requireSameElement: Scalars['Boolean']['output'];
  synonymGroupId?: Maybe<Scalars['ID']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export enum SearchExplainClauseKind {
  FtsPhrase = 'FTS_PHRASE',
  FtsTerms = 'FTS_TERMS',
  IdentifierExact = 'IDENTIFIER_EXACT',
  IdentifierPrefix = 'IDENTIFIER_PREFIX',
  Synonym = 'SYNONYM'
}

export type ApiSearchExplainFieldWeight = {
  __typename?: 'SearchExplainFieldWeight';
  field: SearchField;
  weight: Scalars['Float']['output'];
};

export enum SearchExplainReason {
  BoostOnlyCandidate = 'BOOST_ONLY_CANDIDATE',
  FuzzyFallback = 'FUZZY_FALLBACK',
  IdentifierExpansion = 'IDENTIFIER_EXPANSION',
  ProductBoost = 'PRODUCT_BOOST',
  StopwordRemoval = 'STOPWORD_REMOVAL',
  SynonymExpansion = 'SYNONYM_EXPANSION',
  TypoExpansion = 'TYPO_EXPANSION'
}

export type ApiSearchExplainSettings = {
  __typename?: 'SearchExplainSettings';
  enabledFields: Array<SearchField>;
  fieldWeights: Array<ApiSearchExplainFieldWeight>;
  outOfStockPolicy: SearchOutOfStockPolicy;
  typoToleranceEnabled: Scalars['Boolean']['output'];
  version: Scalars['Int']['output'];
};

export type ApiSearchExplainTypoAlternative = {
  __typename?: 'SearchExplainTypoAlternative';
  editDistance: Scalars['Int']['output'];
  lexemes: Array<Scalars['String']['output']>;
  trigramSimilarity: Scalars['Float']['output'];
  value: Scalars['String']['output'];
};

export type ApiSearchExplainUnit = {
  __typename?: 'SearchExplainUnit';
  /** Executed clauses; emitted once on the first token of a grouped plan unit. */
  clauses: Array<ApiSearchExplainClause>;
  kind: SearchLexicalUnitKind;
  lexemes: Array<Scalars['String']['output']>;
  normalized: Scalars['String']['output'];
  /** Required plan unit containing this token, or null for a removed stopword. */
  planUnitIndex?: Maybe<Scalars['Int']['output']>;
  removedAsStopword: Scalars['Boolean']['output'];
  source: Scalars['String']['output'];
  typoAlternatives: Array<ApiSearchExplainTypoAlternative>;
};

export enum SearchField {
  CategoryName = 'CATEGORY_NAME',
  ProductTitle = 'PRODUCT_TITLE',
  VariantTitle = 'VARIANT_TITLE',
  VendorName = 'VENDOR_NAME'
}

export type ApiSearchFieldConfiguration = {
  __typename?: 'SearchFieldConfiguration';
  field: SearchField;
  weight: Scalars['Float']['output'];
};

export type ApiSearchFieldConfigurationInput = {
  field: SearchField;
  weight: Scalars['Float']['input'];
};

export enum SearchLexicalUnitKind {
  Code = 'CODE',
  Foreign = 'FOREIGN',
  MixedScript = 'MIXED_SCRIPT',
  Number = 'NUMBER',
  Stopword = 'STOPWORD',
  Text = 'TEXT'
}

export enum SearchOutOfStockPolicy {
  Hide = 'HIDE',
  PlaceLast = 'PLACE_LAST',
  Show = 'SHOW'
}

export type ApiSearchProductBoost = {
  __typename?: 'SearchProductBoost';
  createdAt: Scalars['DateTime']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  locale: LocaleCode;
  name: Scalars['String']['output'];
  phrases: Array<ApiSearchProductBoostPhrase>;
  phrasesCount: Scalars['Int']['output'];
  products: Array<ApiProduct>;
  productsCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  version: Scalars['Int']['output'];
};

export type ApiSearchProductBoostConnection = {
  __typename?: 'SearchProductBoostConnection';
  edges: Array<ApiSearchProductBoostEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiSearchProductBoostCreateInput = {
  clientMutationId: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
  locale: LocaleCode;
  name: Scalars['String']['input'];
  phrases: Array<Scalars['String']['input']>;
  productIds: Array<Scalars['ID']['input']>;
};

export type ApiSearchProductBoostEdge = {
  __typename?: 'SearchProductBoostEdge';
  cursor: Scalars['String']['output'];
  node: ApiSearchProductBoost;
};

/** Ordering configuration for SearchProductBoost */
export type ApiSearchProductBoostOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: SearchProductBoostOrderField;
};

/** Fields available for sorting SearchProductBoost */
export enum SearchProductBoostOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by enabled */
  Enabled = 'enabled',
  /** Sort by id */
  Id = 'id',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by name */
  Name = 'name',
  /** Sort by phrasesCount */
  PhrasesCount = 'phrasesCount',
  /** Sort by productsCount */
  ProductsCount = 'productsCount',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by version */
  Version = 'version'
}

export type ApiSearchProductBoostPayload = {
  __typename?: 'SearchProductBoostPayload';
  productBoost?: Maybe<ApiSearchProductBoost>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiSearchProductBoostPhrase = {
  __typename?: 'SearchProductBoostPhrase';
  phrase: Scalars['String']['output'];
  position: Scalars['Int']['output'];
};

export type ApiSearchProductBoostUpdateInput = {
  enabled: Scalars['Boolean']['input'];
  expectedVersion: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
  locale: LocaleCode;
  name: Scalars['String']['input'];
  phrases: Array<Scalars['String']['input']>;
  productIds: Array<Scalars['ID']['input']>;
};

/** Filter conditions for SearchProductBoost */
export type ApiSearchProductBoostWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiSearchProductBoostWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiSearchProductBoostWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiSearchProductBoostWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by enabled */
  enabled?: InputMaybe<ApiBooleanFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by phrases */
  phrases?: InputMaybe<ApiStringFilter>;
  /** Filter by phrasesCount */
  phrasesCount?: InputMaybe<ApiIntFilter>;
  /** Filter by productsCount */
  productsCount?: InputMaybe<ApiIntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by version */
  version?: InputMaybe<ApiIntFilter>;
};

export type ApiSearchProductBoostsMetaInput = {
  /** Match boosts containing any selected Product global ID. */
  productIds: Array<Scalars['ID']['input']>;
};

export type ApiSearchSettings = {
  __typename?: 'SearchSettings';
  fields: Array<ApiSearchFieldConfiguration>;
  outOfStockPolicy: SearchOutOfStockPolicy;
  typoToleranceEnabled: Scalars['Boolean']['output'];
  updatedAt: Scalars['DateTime']['output'];
  version: Scalars['Int']['output'];
};

export type ApiSearchSettingsOperationResult = {
  __typename?: 'SearchSettingsOperationResult';
  applied: Scalars['Boolean']['output'];
  clientMutationId?: Maybe<Scalars['String']['output']>;
  entityId?: Maybe<Scalars['ID']['output']>;
  errors: Array<ApiGenericUserError>;
  type: SearchSettingsOperationType;
};

export enum SearchSettingsOperationType {
  SettingsUpdate = 'SETTINGS_UPDATE'
}

export type ApiSearchSettingsOperationsInput = {
  /** Main search settings replacement. */
  settings: ApiSearchSettingsValuesInput;
};

export type ApiSearchSettingsUpdatePayload = {
  __typename?: 'SearchSettingsUpdatePayload';
  operationResults: Array<ApiSearchSettingsOperationResult>;
  settings?: Maybe<ApiSearchSettings>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiSearchSettingsValuesInput = {
  fields: Array<ApiSearchFieldConfigurationInput>;
  outOfStockPolicy: SearchOutOfStockPolicy;
  typoToleranceEnabled: Scalars['Boolean']['input'];
};

export type ApiSearchSynonymGroup = {
  __typename?: 'SearchSynonymGroup';
  createdAt: Scalars['DateTime']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  locale: LocaleCode;
  name: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  values: Array<ApiSearchSynonymValue>;
  valuesCount: Scalars['Int']['output'];
  version: Scalars['Int']['output'];
};

export type ApiSearchSynonymGroupConnection = {
  __typename?: 'SearchSynonymGroupConnection';
  edges: Array<ApiSearchSynonymGroupEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ApiSearchSynonymGroupCreateInput = {
  clientMutationId: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
  locale: LocaleCode;
  name: Scalars['String']['input'];
  values: Array<Scalars['String']['input']>;
};

export type ApiSearchSynonymGroupEdge = {
  __typename?: 'SearchSynonymGroupEdge';
  cursor: Scalars['String']['output'];
  node: ApiSearchSynonymGroup;
};

/** Ordering configuration for SearchSynonymGroup */
export type ApiSearchSynonymGroupOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: SearchSynonymGroupOrderField;
};

/** Fields available for sorting SearchSynonymGroup */
export enum SearchSynonymGroupOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by enabled */
  Enabled = 'enabled',
  /** Sort by id */
  Id = 'id',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by name */
  Name = 'name',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by valuesCount */
  ValuesCount = 'valuesCount',
  /** Sort by version */
  Version = 'version'
}

export type ApiSearchSynonymGroupPayload = {
  __typename?: 'SearchSynonymGroupPayload';
  synonymGroup?: Maybe<ApiSearchSynonymGroup>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiSearchSynonymGroupUpdateInput = {
  enabled: Scalars['Boolean']['input'];
  expectedVersion: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
  locale: LocaleCode;
  name: Scalars['String']['input'];
  values: Array<Scalars['String']['input']>;
};

/** Filter conditions for SearchSynonymGroup */
export type ApiSearchSynonymGroupWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiSearchSynonymGroupWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiSearchSynonymGroupWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiSearchSynonymGroupWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by enabled */
  enabled?: InputMaybe<ApiBooleanFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by terms */
  terms?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by valuesCount */
  valuesCount?: InputMaybe<ApiIntFilter>;
  /** Filter by version */
  version?: InputMaybe<ApiIntFilter>;
};

export type ApiSearchSynonymValue = {
  __typename?: 'SearchSynonymValue';
  position: Scalars['Int']['output'];
  value: Scalars['String']['output'];
};

/** Represents a selected option for a variant. */
export type ApiSelectedOption = {
  __typename?: 'SelectedOption';
  /** The option ID. */
  optionId: Scalars['ID']['output'];
  /** The selected value ID. */
  optionValueId: Scalars['ID']['output'];
};

/** Input for selecting an option value for a variant. */
export type ApiSelectedOptionInput = {
  /** The ID of the option. */
  optionId: Scalars['ID']['input'];
  /** The ID of the option value. */
  optionValueId: Scalars['ID']['input'];
};

/** SEO and Open Graph metadata. */
export type ApiSeo = {
  __typename?: 'Seo';
  /** Open Graph description for social media sharing. */
  ogDescription?: Maybe<Scalars['String']['output']>;
  /** Open Graph image for social media sharing. */
  ogImage?: Maybe<ApiFile>;
  /** Open Graph title for social media sharing (max 95 chars). */
  ogTitle?: Maybe<Scalars['String']['output']>;
  /** SEO description for search engines (max 160 chars). */
  seoDescription?: Maybe<Scalars['String']['output']>;
  /** SEO title for search engines (max 70 chars). */
  seoTitle?: Maybe<Scalars['String']['output']>;
};

/** Input for SEO and Open Graph metadata. */
export type ApiSeoInput = {
  /** Open Graph description. */
  ogDescription?: InputMaybe<Scalars['String']['input']>;
  /** Open Graph image file ID. */
  ogImageId?: InputMaybe<Scalars['ID']['input']>;
  /** Open Graph title (max 95 chars). */
  ogTitle?: InputMaybe<Scalars['String']['input']>;
  /** SEO description (max 160 chars). */
  seoDescription?: InputMaybe<Scalars['String']['input']>;
  /** SEO title (max 70 chars). */
  seoTitle?: InputMaybe<Scalars['String']['input']>;
};

/** User session representing an active login. */
export type ApiSession = {
  __typename?: 'Session';
  /** The date and time when the session was created. */
  createdAt: Scalars['DateTime']['output'];
  /** When the session expires. */
  expiresAt: Scalars['DateTime']['output'];
  /** The globally unique ID of the session. */
  id: Scalars['ID']['output'];
  /** IP address from which the session was created. */
  ipAddress?: Maybe<Scalars['String']['output']>;
  /** Whether this is the current session making the request. */
  isCurrent: Scalars['Boolean']['output'];
  /** The date and time when the session was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** User agent string (browser/device info). */
  userAgent?: Maybe<Scalars['String']['output']>;
};

/** Payload for revoking all sessions. */
export type ApiSessionRevokeAllPayload = {
  __typename?: 'SessionRevokeAllPayload';
  /** Number of sessions revoked. */
  revokedCount: Scalars['Int']['output'];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for revoking a specific session. */
export type ApiSessionRevokeInput = {
  /** The ID of the session to revoke. */
  sessionId: Scalars['ID']['input'];
};

/** Payload for session revoke operation. */
export type ApiSessionRevokePayload = {
  __typename?: 'SessionRevokePayload';
  /** Whether the session was successfully revoked. */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

export type ApiSkuStatusMetric = {
  __typename?: 'SkuStatusMetric';
  averageDays?: Maybe<Scalars['Float']['output']>;
  count: Scalars['Int']['output'];
};

/** Sort direction */
export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

/** A store */
export type ApiStore = {
  __typename?: 'Store';
  /** Base currency used for exchange rate calculations */
  baseCurrency: CurrencyCode;
  /** Timestamp when the store was created */
  createdAt: Scalars['DateTime']['output'];
  /** List of enabled currency codes for the store */
  currencies: Array<CurrencyCode>;
  /** Default currency for pricing display */
  defaultCurrency: CurrencyCode;
  /** Default unit for product dimensions */
  defaultDimensionUnit: DimensionUnit;
  /** Default locale for new content */
  defaultLocale: LocaleCode;
  /** Default unit for product weights */
  defaultWeightUnit: WeightUnit;
  /** Display name of the store */
  displayName: Scalars['String']['output'];
  /** Contact email address for the store */
  email?: Maybe<Scalars['String']['output']>;
  /** Unique identifier of the store */
  id: Scalars['ID']['output'];
  /** List of enabled locale codes for the store */
  locales: Array<LocaleCode>;
  /** Membership info (resolved from IAM by domain) */
  membership: ApiMembership;
  /** URL-friendly unique identifier */
  name: Scalars['String']['output'];
  /** Organization that owns this store (federation reference) */
  organization?: Maybe<ApiOrganization>;
  /** Current operational status of the store */
  status: StoreStatus;
  /** IANA timezone identifier for the store */
  timezone: Scalars['String']['output'];
  /** Timestamp when the store was last updated */
  updatedAt: Scalars['DateTime']['output'];
};

/** Input for creating a new store */
export type ApiStoreCreateInput = {
  /** Initial list of currency codes to enable */
  currencies: Array<CurrencyCode>;
  /** Default currency for the store */
  defaultCurrency: CurrencyCode;
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
export type ApiStoreCreatePayload = {
  __typename?: 'StoreCreatePayload';
  /** The newly created store, null if creation failed */
  store?: Maybe<ApiStore>;
  /** List of errors that occurred during creation */
  userErrors: Array<ApiUserError>;
};

/** Input for deleting a store */
export type ApiStoreDeleteInput = {
  /** ID of the store to delete */
  id: Scalars['ID']['input'];
  /** Organization name for authorization context */
  organizationId: Scalars['ID']['input'];
};

/** Payload returned after deleting a store */
export type ApiStoreDeletePayload = {
  __typename?: 'StoreDeletePayload';
  /** ID of the deleted store, null if deletion failed */
  deletedStoreId?: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during deletion */
  userErrors: Array<ApiUserError>;
};

/** Mutations for store management */
export type ApiStoreMutation = {
  __typename?: 'StoreMutation';
  /** Create a new API key for programmatic access */
  apiKeyCreate: ApiApiKeyCreatePayload;
  /** Permanently delete an API key */
  apiKeyDelete: ApiApiKeyDeletePayload;
  /** Revoke an API key (soft delete) */
  apiKeyRevoke: ApiApiKeyActionPayload;
  /** Add a new currency to the store */
  currencyCreate: ApiCurrencyCreatePayload;
  /** Remove a currency from the store */
  currencyDelete: ApiCurrencyDeletePayload;
  /** Set the default currency for the store */
  currencySetDefault: ApiCurrencyUpdatePayload;
  /** Add a new locale to the store */
  localeCreate: ApiLocaleCreatePayload;
  /** Remove a locale from the store */
  localeDelete: ApiLocaleDeletePayload;
  /** Set the default locale for the store */
  localeSetDefault: ApiLocaleUpdatePayload;
  /** Create a new store */
  storeCreate: ApiStoreCreatePayload;
  /** Delete a store */
  storeDelete: ApiStoreDeletePayload;
  /** Update an existing store */
  storeUpdate: ApiStoreUpdatePayload;
};


/** Mutations for store management */
export type ApiStoreMutationApiKeyCreateArgs = {
  input: ApiApiKeyCreateInput;
};


/** Mutations for store management */
export type ApiStoreMutationApiKeyDeleteArgs = {
  input: ApiApiKeyDeleteInput;
};


/** Mutations for store management */
export type ApiStoreMutationApiKeyRevokeArgs = {
  input: ApiApiKeyRevokeInput;
};


/** Mutations for store management */
export type ApiStoreMutationCurrencyCreateArgs = {
  input: ApiCurrencyCreateInput;
};


/** Mutations for store management */
export type ApiStoreMutationCurrencyDeleteArgs = {
  input: ApiCurrencyDeleteInput;
};


/** Mutations for store management */
export type ApiStoreMutationCurrencySetDefaultArgs = {
  input: ApiCurrencySetDefaultInput;
};


/** Mutations for store management */
export type ApiStoreMutationLocaleCreateArgs = {
  input: ApiLocaleCreateInput;
};


/** Mutations for store management */
export type ApiStoreMutationLocaleDeleteArgs = {
  input: ApiLocaleDeleteInput;
};


/** Mutations for store management */
export type ApiStoreMutationLocaleSetDefaultArgs = {
  input: ApiLocaleSetDefaultInput;
};


/** Mutations for store management */
export type ApiStoreMutationStoreCreateArgs = {
  input: ApiStoreCreateInput;
};


/** Mutations for store management */
export type ApiStoreMutationStoreDeleteArgs = {
  input: ApiStoreDeleteInput;
};


/** Mutations for store management */
export type ApiStoreMutationStoreUpdateArgs = {
  input: ApiStoreUpdateInput;
};

/** Queries for store management */
export type ApiStoreQuery = {
  __typename?: 'StoreQuery';
  /** Get all API keys for the current store */
  apiKeys: Array<ApiApiKey>;
  /** Get the current store from context */
  currentStore?: Maybe<ApiStore>;
  /** Get all stores accessible to the current user in the organization */
  stores: Array<ApiStore>;
};


/** Queries for store management */
export type ApiStoreQueryStoresArgs = {
  organizationId: Scalars['ID']['input'];
};

/** Status of a store */
export enum StoreStatus {
  /** Store is active and operational */
  Active = 'ACTIVE',
  /** Store is inactive and not processing requests */
  Inactive = 'INACTIVE'
}

/** Input for updating an existing store */
export type ApiStoreUpdateInput = {
  /** Updated list of enabled currency codes */
  currencies?: InputMaybe<Array<CurrencyCode>>;
  /** New default dimension unit */
  defaultDimensionUnit?: InputMaybe<DimensionUnit>;
  /** New default weight unit */
  defaultWeightUnit?: InputMaybe<WeightUnit>;
  /** New display name */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** New contact email address */
  email?: InputMaybe<Scalars['String']['input']>;
  /** ID of the store to update */
  id: Scalars['ID']['input'];
  /** Updated list of enabled locale codes */
  locales?: InputMaybe<Array<LocaleCode>>;
  /** New display name */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Organization id for authorization context */
  organizationId: Scalars['ID']['input'];
  /** New IANA timezone identifier */
  timezone?: InputMaybe<Scalars['String']['input']>;
};

/** Payload returned after updating a store */
export type ApiStoreUpdatePayload = {
  __typename?: 'StoreUpdatePayload';
  /** The updated store, null if update failed */
  store?: Maybe<ApiStore>;
  /** List of errors that occurred during update */
  userErrors: Array<ApiUserError>;
};

/** Filter operators for String fields */
export type ApiStringFilter = {
  /** Contains substring (case-sensitive) */
  _contains?: InputMaybe<Scalars['String']['input']>;
  /** Contains substring (case-insensitive) */
  _containsi?: InputMaybe<Scalars['String']['input']>;
  /** Equals */
  _eq?: InputMaybe<Scalars['String']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['String']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Starts with (case-sensitive) */
  _startsWith?: InputMaybe<Scalars['String']['input']>;
  /** Starts with (case-insensitive) */
  _startsWithi?: InputMaybe<Scalars['String']['input']>;
};

/** Type of visual swatch for option values. */
export enum SwatchType {
  Color = 'COLOR',
  Gradient = 'GRADIENT',
  Image = 'IMAGE'
}

/** A tag represents a simple label for organizing and filtering products. */
export type ApiTag = ApiNode & {
  __typename?: 'Tag';
  /** The date and time when the tag was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The URL-friendly handle for the tag. */
  handle: Scalars['String']['output'];
  /** The globally unique ID of the tag. */
  id: Scalars['ID']['output'];
  /** The display name of the tag. */
  name: Scalars['String']['output'];
  /** The total number of products with this tag. */
  productsCount: Scalars['Int']['output'];
};

/** A connection to a list of Tag items. */
export type ApiTagConnection = {
  __typename?: 'TagConnection';
  /** A list of edges. */
  edges: Array<ApiTagEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of tags. */
  totalCount: Scalars['Int']['output'];
};

/** Input for creating a tag. */
export type ApiTagCreateInput = {
  /** The URL-friendly handle for the tag. */
  handle: Scalars['String']['input'];
  /** The display name of the tag (optional, defaults to handle). */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for tag creation. */
export type ApiTagCreatePayload = {
  __typename?: 'TagCreatePayload';
  /** The created tag. */
  tag?: Maybe<ApiTag>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for deleting a tag. */
export type ApiTagDeleteInput = {
  /** The ID of the tag to delete. */
  id: Scalars['ID']['input'];
};

/** Payload for tag deletion. */
export type ApiTagDeletePayload = {
  __typename?: 'TagDeletePayload';
  /** The ID of the deleted tag. */
  deletedTagId?: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in a Tag connection. */
export type ApiTagEdge = {
  __typename?: 'TagEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiTag;
};

/** Ordering configuration for Tag */
export type ApiTagOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: TagOrderField;
};

/** Fields available for sorting Tag */
export enum TagOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by handle */
  Handle = 'handle',
  /** Sort by id */
  Id = 'id',
  /** Sort by locale */
  Locale = 'locale',
  /** Sort by name */
  Name = 'name',
  /** Sort by productsCount */
  ProductsCount = 'productsCount',
  /** Sort by storeId */
  StoreId = 'storeId'
}

/** Input for updating a tag. */
export type ApiTagUpdateInput = {
  /** The URL-friendly handle for the tag. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the tag to update. */
  id: Scalars['ID']['input'];
  /** The display name of the tag. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for tag update. */
export type ApiTagUpdatePayload = {
  __typename?: 'TagUpdatePayload';
  /** The updated tag. */
  tag?: Maybe<ApiTag>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for Tag */
export type ApiTagWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiTagWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiTagWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiTagWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by productsCount */
  productsCount?: InputMaybe<ApiIntFilter>;
  /** Filter by storeId */
  storeId?: InputMaybe<ApiIdFilter>;
};

export enum ThresholdMethod {
  ReorderPoint = 'REORDER_POINT',
  SafetyStock = 'SAFETY_STOCK'
}

/** User type representing admin users (CMS/backoffice). */
export type ApiUser = {
  __typename?: 'User';
  /** User's avatar image (from Media service). */
  avatar?: Maybe<ApiFile>;
  /** The date and time when the user was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** User's email address. */
  email: Scalars['Email']['output'];
  /** Whether the email has been verified. */
  emailVerified?: Maybe<Scalars['Boolean']['output']>;
  /** User's first name. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** The globally unique ID of the user. */
  id: Scalars['ID']['output'];
  /** Whether the user has admin privileges. */
  isAdmin?: Maybe<Scalars['Boolean']['output']>;
  /** Whether the user account is deleted. */
  isDeleted?: Maybe<Scalars['Boolean']['output']>;
  /** Whether the user account is forbidden/banned. */
  isForbidden?: Maybe<Scalars['Boolean']['output']>;
  /**
   * Whether the user has completed their profile (firstName and lastName are filled).
   * Used for onboarding flow to ensure required fields are present.
   */
  isProfileComplete: Scalars['Boolean']['output'];
  /** User's last name. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** User's locale/language preference. */
  locale?: Maybe<LocaleCode>;
  /** The date and time when the user was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** A generic user error interface for mutation responses. */
export type ApiUserError = {
  /** An error code for programmatic handling. */
  code?: Maybe<Scalars['String']['output']>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

export type ApiUserMutation = {
  __typename?: 'UserMutation';
  /** Revoke a specific session by ID. */
  sessionRevoke: ApiSessionRevokePayload;
  /** Revoke all sessions except the current one. */
  sessionRevokeAll: ApiSessionRevokeAllPayload;
  userUpdateEmail: ApiUserUpdateEmailPayload;
  userUpdatePassword: ApiUserUpdatePasswordPayload;
  userUpdateProfile: ApiUserUpdateProfilePayload;
};


export type ApiUserMutationSessionRevokeArgs = {
  input: ApiSessionRevokeInput;
};


export type ApiUserMutationUserUpdateEmailArgs = {
  input: ApiUserUpdateEmailInput;
};


export type ApiUserMutationUserUpdatePasswordArgs = {
  input: ApiUserUpdatePasswordInput;
};


export type ApiUserMutationUserUpdateProfileArgs = {
  input: ApiUserUpdateProfileInput;
};

export type ApiUserQuery = {
  __typename?: 'UserQuery';
  /**
   * Check authorization for current user.
   * Used for server-side permission checks.
   * For client-side checks, use project.roles + user.role.
   */
  authorize: ApiAuthorizePayload;
  /** Get current authenticated admin user */
  current?: Maybe<ApiUser>;
  /** Get all active sessions for the current user. */
  mySessions: Array<ApiSession>;
};


export type ApiUserQueryAuthorizeArgs = {
  input: ApiAuthorizeInput;
};

/** Input for admin user authentication. */
export type ApiUserSignInInput = {
  /** Email address. */
  email: Scalars['Email']['input'];
  /** Password. */
  password: Scalars['String']['input'];
};

/** Payload for admin user sign in. */
export type ApiUserSignInPayload = {
  __typename?: 'UserSignInPayload';
  /** Authentication tokens. */
  token?: Maybe<ApiAuthTokenPayload>;
  /** The authenticated user. */
  user?: Maybe<ApiUser>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for admin user sign out. */
export type ApiUserSignOutInput = {
  /** Sign out from all sessions. */
  allSessions?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for admin user sign out. */
export type ApiUserSignOutPayload = {
  __typename?: 'UserSignOutPayload';
  /** Whether sign out was successful. */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for admin user sign up. */
export type ApiUserSignUpInput = {
  /** Email address. */
  email: Scalars['Email']['input'];
  /** Password. */
  password: Scalars['String']['input'];
};

/** Payload for admin user sign up. */
export type ApiUserSignUpPayload = {
  __typename?: 'UserSignUpPayload';
  /** Authentication tokens. */
  token?: Maybe<ApiAuthTokenPayload>;
  /** The created user. */
  user?: Maybe<ApiUser>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for refreshing admin user access token. */
export type ApiUserTokenRefreshInput = {
  /** Refresh token to use for obtaining new access token. */
  refreshToken: Scalars['String']['input'];
};

/** Payload for admin user token refresh. */
export type ApiUserTokenRefreshPayload = {
  __typename?: 'UserTokenRefreshPayload';
  /** New authentication tokens. */
  token?: Maybe<ApiAuthTokenPayload>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for updating user email. */
export type ApiUserUpdateEmailInput = {
  /** New email address. */
  newEmail: Scalars['Email']['input'];
};

/** Payload for user email update. */
export type ApiUserUpdateEmailPayload = {
  __typename?: 'UserUpdateEmailPayload';
  /** The updated user. */
  user?: Maybe<ApiUser>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for updating user password. */
export type ApiUserUpdatePasswordInput = {
  /** Current password. */
  currentPassword: Scalars['String']['input'];
  /** New password. */
  newPassword: Scalars['String']['input'];
};

/** Payload for user password update. */
export type ApiUserUpdatePasswordPayload = {
  __typename?: 'UserUpdatePasswordPayload';
  /** Whether the password was changed successfully. */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for updating user profile. */
export type ApiUserUpdateProfileInput = {
  /** Media file ID for the avatar. Pass null to remove avatar. */
  avatarId?: InputMaybe<Scalars['ID']['input']>;
  /** User's first name. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** User's last name. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** User's locale/language preference. */
  locale?: InputMaybe<LocaleCode>;
};

/** Payload for user profile update. */
export type ApiUserUpdateProfilePayload = {
  __typename?: 'UserUpdateProfilePayload';
  /** The updated user. */
  user?: Maybe<ApiUser>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/**
 * A variant represents a specific version of a product, such as a size or color.
 * Catalog Service owns this type.
 * Inventory fields (sku, dimensions, weight, cost, stock) are resolved by Catalog.
 */
export type ApiVariant = ApiNode & {
  __typename?: 'Variant';
  /** Bundle configuration assigned to this variant. Null for BASE variants. */
  bundleConfiguration?: Maybe<ApiBundleConfiguration>;
  /** The date and time when the variant was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the variant was deleted (soft delete). */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Physical dimensions (stored in millimeters). */
  dimensions?: Maybe<ApiVariantDimensions>;
  /** The external ID in the external system. */
  externalId?: Maybe<Scalars['String']['output']>;
  /** The external system identifier for integration purposes. */
  externalSystem?: Maybe<Scalars['String']['output']>;
  /** The URL-friendly handle for the variant (generated from options). */
  handle: Scalars['String']['output'];
  /** The globally unique ID of the variant. */
  id: Scalars['ID']['output'];
  /** Inventory item associated with this variant. */
  inventoryItem?: Maybe<ApiInventoryItem>;
  /** Whether this is the default variant for the product. */
  isDefault: Scalars['Boolean']['output'];
  /** Variant discriminator. Must match parent product kind. */
  kind: ProductKind;
  /** Media attached to this variant (images, videos). */
  media: Array<ApiVariantMediaItem>;
  /** Current price for this variant. */
  price?: Maybe<ApiVariantPrice>;
  /** Price history for this variant. */
  priceHistory: ApiVariantPriceConnection;
  /** The product this variant belongs to. */
  product: ApiProduct;
  /** The selected option values for this variant. */
  selectedOptions: Array<ApiSelectedOption>;
  /** Variant title. */
  title?: Maybe<Scalars['String']['output']>;
  /** The date and time when the variant was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Physical weight (stored in grams). */
  weight?: Maybe<ApiVariantWeight>;
};


/**
 * A variant represents a specific version of a product, such as a size or color.
 * Catalog Service owns this type.
 * Inventory fields (sku, dimensions, weight, cost, stock) are resolved by Catalog.
 */
export type ApiVariantPriceHistoryArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of Variant items. */
export type ApiVariantConnection = {
  __typename?: 'VariantConnection';
  /** A list of edges. */
  edges: Array<ApiVariantEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of variants. */
  totalCount: Scalars['Int']['output'];
};

/** Represents the cost of a variant. */
export type ApiVariantCost = ApiNode & {
  __typename?: 'VariantCost';
  /** The currency code. */
  currency: CurrencyCode;
  /** When this cost became effective. */
  effectiveFrom: Scalars['DateTime']['output'];
  /** When this cost stopped being effective (null if current). */
  effectiveTo?: Maybe<Scalars['DateTime']['output']>;
  /** The globally unique ID of the cost record. */
  id: Scalars['ID']['output'];
  /** Whether this is the current active cost. */
  isCurrent: Scalars['Boolean']['output'];
  /** When this cost record was created. */
  recordedAt: Scalars['DateTime']['output'];
  /** The unit cost in minor units. */
  unitCostMinor: Scalars['BigInt']['output'];
};

/** A connection to a list of VariantCost items. */
export type ApiVariantCostConnection = {
  __typename?: 'VariantCostConnection';
  /** A list of edges. */
  edges: Array<ApiVariantCostEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of cost records. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a VariantCost connection. */
export type ApiVariantCostEdge = {
  __typename?: 'VariantCostEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiVariantCost;
};

/** Input for creating a variant with a product ID. */
export type ApiVariantCreateInput = {
  /** The ID of the product to add the variant to. */
  productId: Scalars['ID']['input'];
  /** The variant data. */
  variant: ApiVariantInput;
};

/** Payload for variant creation. */
export type ApiVariantCreatePayload = {
  __typename?: 'VariantCreatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The created variant. */
  variant?: Maybe<ApiVariant>;
};

/** Input for deleting a variant. */
export type ApiVariantDeleteInput = {
  /** The ID of the variant to delete. */
  id: Scalars['ID']['input'];
  /** Whether to permanently delete the variant (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for variant deletion. */
export type ApiVariantDeletePayload = {
  __typename?: 'VariantDeletePayload';
  /** The ID of the deleted variant. */
  deletedVariantId?: Maybe<Scalars['ID']['output']>;
  /** The product the variant belonged to. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Physical dimensions of a variant (stored in millimeters). */
export type ApiVariantDimensions = {
  __typename?: 'VariantDimensions';
  /** Height in millimeters. */
  height: Scalars['Int']['output'];
  /** Length in millimeters. */
  length: Scalars['Int']['output'];
  /** Width in millimeters. */
  width: Scalars['Int']['output'];
};

/** Input for variant dimensions in the unified update. */
export type ApiVariantDimensionsOpInput = {
  /** Height in millimeters. */
  height: Scalars['Int']['input'];
  /** Length in millimeters. */
  length: Scalars['Int']['input'];
  /** Width in millimeters. */
  width: Scalars['Int']['input'];
};

/** An edge in a Variant connection. */
export type ApiVariantEdge = {
  __typename?: 'VariantEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiVariant;
};

/** Input for creating a variant. */
export type ApiVariantInput = {
  /** External ID in the external system. */
  externalId?: InputMaybe<Scalars['String']['input']>;
  /** External system identifier. */
  externalSystem?: InputMaybe<Scalars['String']['input']>;
  /** Selected option values for the variant (required). */
  options: Array<ApiSelectedOptionInput>;
  /** Variant title. */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for variant inventory in the unified update. */
export type ApiVariantInventoryOpInput = {
  /** Whether the variant remains sellable without stock. */
  continueSellingWhenOutOfStock?: InputMaybe<Scalars['Boolean']['input']>;
  /** Currency code for unit cost. */
  costCurrency?: InputMaybe<CurrencyCode>;
  /** Quantity on hand. Required together with warehouseId for a stock update. */
  onHand?: InputMaybe<Scalars['Int']['input']>;
  /** SKU code. */
  sku?: InputMaybe<Scalars['String']['input']>;
  /** Whether inventory quantities control availability. */
  trackInventory?: InputMaybe<Scalars['Boolean']['input']>;
  /** Unavailable quantity (reserved, damaged, etc.). */
  unavailable?: InputMaybe<Scalars['Int']['input']>;
  /** Unit cost in minor units (cents). */
  unitCostMinor?: InputMaybe<Scalars['BigInt']['input']>;
  /** The warehouse ID. Required together with onHand for a stock update. */
  warehouseId?: InputMaybe<Scalars['ID']['input']>;
};

/** Media attached to a variant with sort order. */
export type ApiVariantMediaItem = {
  __typename?: 'VariantMediaItem';
  /** The file from the Media service. */
  file: ApiFile;
  /** Sort order index (lower = first). */
  sortIndex: Scalars['Int']['output'];
};

/** Input for variant media in the unified update. */
export type ApiVariantMediaOpInput = {
  /** File IDs for variant media. */
  fileIds: Array<Scalars['ID']['input']>;
};

/** Variant operation action in the unified product update. */
export enum VariantOperationAction {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
}

/** Input for a single variant operation. */
export type ApiVariantOperationInput = {
  /** The operation to apply. */
  action: VariantOperationAction;
  /** Per-request client correlation key for create operations. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Variant dimensions. */
  dimensions?: InputMaybe<ApiVariantDimensionsOpInput>;
  /** Variant inventory item data (stock, SKU, cost). */
  inventory?: InputMaybe<ApiVariantInventoryOpInput>;
  /** Variant media. */
  media?: InputMaybe<ApiVariantMediaOpInput>;
  /** Variant options. */
  options?: InputMaybe<ApiVariantOptionsOpInput>;
  /** Variant pricing. */
  pricing?: InputMaybe<ApiVariantPricingOpInput>;
  /** The variant ID for update/delete operations. */
  variantId?: InputMaybe<Scalars['ID']['input']>;
  /** Variant weight in grams. */
  weight?: InputMaybe<Scalars['Int']['input']>;
};

/** Input for linking a variant to an option value. */
export type ApiVariantOptionLinkInput = {
  /** The option ID. */
  optionId: Scalars['ID']['input'];
  /** The option value ID. */
  optionValueId: Scalars['ID']['input'];
};

/** Input for variant options in the unified update. */
export type ApiVariantOptionsOpInput = {
  /** Option value links to set (replaces existing). */
  set: Array<ApiVariantOptionLinkInput>;
};

/** Ordering configuration for Variant */
export type ApiVariantOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: VariantOrderField;
};

/** Fields available for sorting Variant */
export enum VariantOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by externalId */
  ExternalId = 'externalId',
  /** Sort by externalSystem */
  ExternalSystem = 'externalSystem',
  /** Sort by handle */
  Handle = 'handle',
  /** Sort by id */
  Id = 'id',
  /** Sort by isDefault */
  IsDefault = 'isDefault',
  /** Sort by productId */
  ProductId = 'productId',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

/** Represents a price for a variant. */
export type ApiVariantPrice = ApiNode & {
  __typename?: 'VariantPrice';
  /** The price amount in minor units (cents, kopecks, etc.). */
  amountMinor: Scalars['BigInt']['output'];
  /** The compare-at price in minor units (strikethrough price). */
  compareAtMinor?: Maybe<Scalars['BigInt']['output']>;
  /** The currency code. */
  currency: CurrencyCode;
  /** When this price became effective. */
  effectiveFrom: Scalars['DateTime']['output'];
  /** When this price stopped being effective (null if current). */
  effectiveTo?: Maybe<Scalars['DateTime']['output']>;
  /** The globally unique ID of the price record. */
  id: Scalars['ID']['output'];
  /** Whether this is the current active price. */
  isCurrent: Scalars['Boolean']['output'];
  /** When this price record was created. */
  recordedAt: Scalars['DateTime']['output'];
};

/** A connection to a list of VariantPrice items. */
export type ApiVariantPriceConnection = {
  __typename?: 'VariantPriceConnection';
  /** A list of edges. */
  edges: Array<ApiVariantPriceEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of price records. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a VariantPrice connection. */
export type ApiVariantPriceEdge = {
  __typename?: 'VariantPriceEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiVariantPrice;
};

/** Statistics for variant price history over a period. */
export type ApiVariantPriceHistoryStatistics = {
  __typename?: 'VariantPriceHistoryStatistics';
  /** Average price over the period (minor units). */
  avgPriceMinor: Scalars['BigInt']['output'];
  /** Currency code. */
  currency: CurrencyCode;
  /** Maximum price over the period (minor units). */
  maxPriceMinor: Scalars['BigInt']['output'];
  /** Minimum price over the period (minor units). */
  minPriceMinor: Scalars['BigInt']['output'];
};

/** Input for variant pricing in the unified update. */
export type ApiVariantPricingOpInput = {
  /** The price amount in minor units. */
  amountMinor: Scalars['BigInt']['input'];
  /** The compare-at price in minor units (optional). */
  compareAtMinor?: InputMaybe<Scalars['BigInt']['input']>;
  /** The currency code. */
  currency: CurrencyCode;
};

/** Input for updating variant media (replaces all existing media). */
export type ApiVariantUpdateMediaInput = {
  /** File IDs in desired order (first = primary). Empty array clears all media. */
  fileIds: Array<Scalars['ID']['input']>;
  /** The variant ID. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant update media. */
export type ApiVariantUpdateMediaPayload = {
  __typename?: 'VariantUpdateMediaPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated variant. */
  variant?: Maybe<ApiVariant>;
};

/** Input for updating variant options (option value links). */
export type ApiVariantUpdateOptionsInput = {
  /** The option value links to set (replaces existing links). */
  links: Array<ApiVariantOptionLinkInput>;
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant options update. */
export type ApiVariantUpdateOptionsPayload = {
  __typename?: 'VariantUpdateOptionsPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated variant. */
  variant?: Maybe<ApiVariant>;
};

/** Input for updating a price on a variant. */
export type ApiVariantUpdatePricingInput = {
  /** The price amount in minor units. */
  amountMinor: Scalars['BigInt']['input'];
  /** The compare-at price in minor units (optional). */
  compareAtMinor?: InputMaybe<Scalars['BigInt']['input']>;
  /** The currency code. */
  currency: CurrencyCode;
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant pricing update. */
export type ApiVariantUpdatePricingPayload = {
  __typename?: 'VariantUpdatePricingPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated variant. */
  variant?: Maybe<ApiVariant>;
};

/** Physical weight of a variant (stored in grams). */
export type ApiVariantWeight = {
  __typename?: 'VariantWeight';
  /** Weight in grams. */
  value: Scalars['Int']['output'];
};

/** Filter conditions for Variant */
export type ApiVariantWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiVariantWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiVariantWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiVariantWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by externalId */
  externalId?: InputMaybe<ApiStringFilter>;
  /** Filter by externalSystem */
  externalSystem?: InputMaybe<ApiStringFilter>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isDefault */
  isDefault?: InputMaybe<ApiBooleanFilter>;
  /** Filter by productId */
  productId?: InputMaybe<ApiIdFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** A vendor represents the supplier or brand owner associated with a product. */
export type ApiVendor = ApiNode & {
  __typename?: 'Vendor';
  /** The globally unique ID of the vendor. */
  id: Scalars['ID']['output'];
  /** The display name of the vendor. */
  name: Scalars['String']['output'];
};

/** A connection to a list of Vendor items. */
export type ApiVendorConnection = {
  __typename?: 'VendorConnection';
  /** A list of edges. */
  edges: Array<ApiVendorEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of vendors. */
  totalCount: Scalars['Int']['output'];
};

/** Input for creating a vendor. */
export type ApiVendorCreateInput = {
  /** The display name of the vendor. */
  name: Scalars['String']['input'];
};

/** Payload for vendor creation. */
export type ApiVendorCreatePayload = {
  __typename?: 'VendorCreatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The created vendor. */
  vendor?: Maybe<ApiVendor>;
};

/** An edge in a Vendor connection. */
export type ApiVendorEdge = {
  __typename?: 'VendorEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiVendor;
};

/** Ordering configuration for Vendor */
export type ApiVendorOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: VendorOrderField;
};

/** Fields available for sorting Vendor */
export enum VendorOrderField {
  /** Sort by id */
  Id = 'id',
  /** Sort by name */
  Name = 'name'
}

/** Filter conditions for Vendor */
export type ApiVendorWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiVendorWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiVendorWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiVendorWhereInput>>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
};

/** A warehouse represents a physical location where inventory is stored. */
export type ApiWarehouse = ApiNode & {
  __typename?: 'Warehouse';
  /** The unique code identifying this warehouse. */
  code: Scalars['String']['output'];
  /** The date and time when the warehouse was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The globally unique ID of the warehouse. */
  id: Scalars['ID']['output'];
  /** Whether this is the default warehouse for the project. */
  isDefault: Scalars['Boolean']['output'];
  /** The display name of the warehouse. */
  name: Scalars['String']['output'];
  /** Stock levels for all variants in this warehouse. */
  stock: ApiWarehouseStockConnection;
  /** The date and time when the warehouse was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Total number of variants stocked in this warehouse. */
  variantsCount: Scalars['Int']['output'];
};


/** A warehouse represents a physical location where inventory is stored. */
export type ApiWarehouseStockArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiWarehouseStockOrderByInput>>;
  where?: InputMaybe<ApiWarehouseStockWhereInput>;
};

export type ApiWarehouseAssignableVariantOrderByInput = {
  direction: SortDirection;
  field: WarehouseAssignableVariantOrderField;
};

export enum WarehouseAssignableVariantOrderField {
  CreatedAt = 'createdAt',
  ExternalId = 'externalId',
  ExternalSystem = 'externalSystem',
  Handle = 'handle',
  Id = 'id',
  IsDefault = 'isDefault',
  ProductId = 'productId',
  ProductName = 'productName',
  Sku = 'sku',
  UpdatedAt = 'updatedAt'
}

export type ApiWarehouseAssignableVariantWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiWarehouseAssignableVariantWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiWarehouseAssignableVariantWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiWarehouseAssignableVariantWhereInput>>;
  /** Filter by creation date */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by external ID */
  externalId?: InputMaybe<ApiStringFilter>;
  /** Filter by external system */
  externalSystem?: InputMaybe<ApiStringFilter>;
  /** Filter by variant handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by variant ID */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by default variant flag */
  isDefault?: InputMaybe<ApiBooleanFilter>;
  /** Filter by product ID */
  productId?: InputMaybe<ApiIdFilter>;
  /** Filter by product name in the current locale */
  productName?: InputMaybe<ApiStringFilter>;
  /** Filter by variant SKU */
  sku?: InputMaybe<ApiStringFilter>;
  /** Filter by update date */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** A connection to a list of Warehouse items. */
export type ApiWarehouseConnection = {
  __typename?: 'WarehouseConnection';
  /** A list of edges. */
  edges: Array<ApiWarehouseEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of warehouses. */
  totalCount: Scalars['Int']['output'];
};

/** Relay-style pagination input for Warehouse */
export type ApiWarehouseConnectionInput = {
  /** Returns items after this cursor */
  after?: InputMaybe<Scalars['String']['input']>;
  /** Returns items before this cursor */
  before?: InputMaybe<Scalars['String']['input']>;
  /** Returns the first n items */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Returns the last n items */
  last?: InputMaybe<Scalars['Int']['input']>;
  /** Sort order */
  orderBy?: InputMaybe<Array<ApiWarehouseOrderByInput>>;
  /** Filter conditions */
  where?: InputMaybe<ApiWarehouseWhereInput>;
};

/** Input for creating a warehouse. */
export type ApiWarehouseCreateInput = {
  /** The unique code for the warehouse. */
  code: Scalars['String']['input'];
  /** Whether this should be the default warehouse. */
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  /** The display name for the warehouse. */
  name: Scalars['String']['input'];
};

/** Payload for warehouse creation. */
export type ApiWarehouseCreatePayload = {
  __typename?: 'WarehouseCreatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The created warehouse. */
  warehouse?: Maybe<ApiWarehouse>;
};

/** Input for deleting a warehouse. */
export type ApiWarehouseDeleteInput = {
  /** The ID of the warehouse to delete. */
  id: Scalars['ID']['input'];
};

/** Payload for warehouse deletion. */
export type ApiWarehouseDeletePayload = {
  __typename?: 'WarehouseDeletePayload';
  /** The ID of the deleted warehouse. */
  deletedWarehouseId?: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in a Warehouse connection. */
export type ApiWarehouseEdge = {
  __typename?: 'WarehouseEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiWarehouse;
};

/** Ordering configuration for Warehouse */
export type ApiWarehouseOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: WarehouseOrderField;
};

/** Fields available for sorting Warehouse */
export enum WarehouseOrderField {
  /** Sort by code */
  Code = 'code',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by isDefault */
  IsDefault = 'isDefault',
  /** Sort by name */
  Name = 'name',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

/** Represents stock level for a variant in a specific warehouse. */
export type ApiWarehouseStock = ApiNode & {
  __typename?: 'WarehouseStock';
  /** The quantity available for sale. */
  availableForSale: Scalars['Int']['output'];
  /** The date and time when the stock was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The globally unique ID of the stock record. */
  id: Scalars['ID']['output'];
  /** The quantity currently on hand. */
  quantityOnHand: Scalars['Int']['output'];
  /** The quantity currently reserved. */
  reservedQuantity: Scalars['Int']['output'];
  /** The quantity currently unavailable. */
  unavailableQuantity: Scalars['Int']['output'];
  /** The date and time when the stock was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** The variant this stock record is for. */
  variant: ApiVariant;
  /** The globally unique ID of the variant this stock belongs to. */
  variantId: Scalars['ID']['output'];
  /** The warehouse where this stock is located. */
  warehouse: ApiWarehouse;
  /** The globally unique ID of the warehouse this stock belongs to. */
  warehouseId: Scalars['ID']['output'];
};

/** A connection to a list of WarehouseStock items. */
export type ApiWarehouseStockConnection = {
  __typename?: 'WarehouseStockConnection';
  /** A list of edges. */
  edges: Array<ApiWarehouseStockEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of stock records. */
  totalCount: Scalars['Int']['output'];
};

/** Relay-style pagination input for WarehouseStock */
export type ApiWarehouseStockConnectionInput = {
  /** Returns items after this cursor */
  after?: InputMaybe<Scalars['String']['input']>;
  /** Returns items before this cursor */
  before?: InputMaybe<Scalars['String']['input']>;
  /** Returns the first n items */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Returns the last n items */
  last?: InputMaybe<Scalars['Int']['input']>;
  /** Sort order */
  orderBy?: InputMaybe<Array<ApiWarehouseStockOrderByInput>>;
  /** Filter conditions */
  where?: InputMaybe<ApiWarehouseStockWhereInput>;
};

/** Input for creating variant stock in warehouses. */
export type ApiWarehouseStockCreateInput = {
  /** Stock records to create. */
  items: Array<ApiWarehouseStockCreateItemInput>;
};

/** Item input for creating variant stock in a warehouse. */
export type ApiWarehouseStockCreateItemInput = {
  /** The variant whose stock should be added. */
  variantId: Scalars['ID']['input'];
  /** The warehouse to add stock to. */
  warehouseId: Scalars['ID']['input'];
};

/** Payload for warehouse stock creation. */
export type ApiWarehouseStockCreatePayload = {
  __typename?: 'WarehouseStockCreatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The created warehouse stock records. */
  warehouseStocks: Array<ApiWarehouseStock>;
};

/** Input for deleting variant stock from warehouses. */
export type ApiWarehouseStockDeleteInput = {
  /** Stock records to delete. */
  items: Array<ApiWarehouseStockDeleteItemInput>;
};

/** Item input for deleting variant stock from a warehouse. */
export type ApiWarehouseStockDeleteItemInput = {
  /** The variant whose stock should be removed. */
  variantId: Scalars['ID']['input'];
  /** The warehouse to remove stock from. */
  warehouseId: Scalars['ID']['input'];
};

/** Payload for warehouse stock deletion. */
export type ApiWarehouseStockDeletePayload = {
  __typename?: 'WarehouseStockDeletePayload';
  /** The IDs of the deleted warehouse stock records. */
  deletedWarehouseStockIds: Array<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in a WarehouseStock connection. */
export type ApiWarehouseStockEdge = {
  __typename?: 'WarehouseStockEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiWarehouseStock;
};

/** Ordering configuration for WarehouseStock */
export type ApiWarehouseStockOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: WarehouseStockOrderField;
};

/** Fields available for sorting WarehouseStock */
export enum WarehouseStockOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by quantityOnHand */
  QuantityOnHand = 'quantityOnHand',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by variantId */
  VariantId = 'variantId',
  /** Sort by warehouseId */
  WarehouseId = 'warehouseId'
}

/** Filter conditions for WarehouseStock */
export type ApiWarehouseStockWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiWarehouseStockWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiWarehouseStockWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiWarehouseStockWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by quantityOnHand */
  quantityOnHand?: InputMaybe<ApiIntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by variantId */
  variantId?: InputMaybe<ApiIdFilter>;
  /** Filter by warehouseId */
  warehouseId?: InputMaybe<ApiIdFilter>;
};

/** Input for updating a warehouse. */
export type ApiWarehouseUpdateInput = {
  /** The new code for the warehouse. */
  code?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the warehouse to update. */
  id: Scalars['ID']['input'];
  /** Whether this should be the default warehouse. */
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  /** The new name for the warehouse. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for warehouse update. */
export type ApiWarehouseUpdatePayload = {
  __typename?: 'WarehouseUpdatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated warehouse. */
  warehouse?: Maybe<ApiWarehouse>;
};

/** Filter conditions for Warehouse */
export type ApiWarehouseWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiWarehouseWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiWarehouseWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiWarehouseWhereInput>>;
  /** Filter by code */
  code?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isDefault */
  isDefault?: InputMaybe<ApiBooleanFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiWeight = {
  __typename?: 'Weight';
  unit: WeightUnit;
  weight: Scalars['Float']['output'];
};

/** Input for setting weight (in grams). */
export type ApiWeightInput = {
  /** Weight in grams. */
  value: Scalars['Int']['input'];
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

/** Widget query namespace for dashboard widgets. */
export type ApiWidgetQuery = {
  __typename?: 'WidgetQuery';
  /**
   * Get inventory widget data for a product.
   * Returns aggregated inventory metrics across all variants.
   */
  inventory?: Maybe<ApiProductInventoryWidget>;
  /** Get pricing widget data for a variant. */
  pricing: ApiPricingWidgetPayload;
};


/** Widget query namespace for dashboard widgets. */
export type ApiWidgetQueryInventoryArgs = {
  productId: Scalars['ID']['input'];
};


/** Widget query namespace for dashboard widgets. */
export type ApiWidgetQueryPricingArgs = {
  input: ApiPricingWidgetInput;
};

export enum Join__Graph {
  AppsAdmin = 'APPS_ADMIN',
  CatalogAdmin = 'CATALOG_ADMIN',
  CustomersAdmin = 'CUSTOMERS_ADMIN',
  IamAdmin = 'IAM_ADMIN',
  ListingAdmin = 'LISTING_ADMIN',
  MediaAdmin = 'MEDIA_ADMIN',
  OrdersAdmin = 'ORDERS_ADMIN',
  ProjectAdmin = 'PROJECT_ADMIN',
  ReviewsAdmin = 'REVIEWS_ADMIN'
}

export enum Link__Purpose {
  /** `EXECUTION` features provide metadata necessary for operation execution. */
  Execution = 'EXECUTION',
  /** `SECURITY` features provide metadata necessary to securely resolve fields. */
  Security = 'SECURITY'
}

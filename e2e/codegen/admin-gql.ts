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
  /** ISO 8601 date-time string */
  DateTime: { input: string; output: string; }
  /** Valid email address */
  Email: { input: string; output: string; }
  JSON: { input: object; output: object; }
  /** Unix timestamp in milliseconds */
  Timestamp: { input: string; output: string; }
  TransportOptions: { input: any; output: any; }
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
export type Action =
  | 'admin'
  | 'read'
  | 'write';

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

export type BulkUpdateCancelReason =
  | 'SUPERSEDED'
  | 'SYSTEM'
  | 'USER';

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

export type BulkUpdateItemStatus =
  | 'CANCELLED'
  | 'FAILED'
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'SUPERSEDED';

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

export type BulkUpdateJobStatus =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'QUEUED'
  | 'RUNNING';

export type BulkUpdateOpType =
  | 'PRODUCT_CATEGORY_UPDATE'
  | 'PRODUCT_TAG_UPDATE'
  | 'PRODUCT_UPDATE'
  | 'VARIANT_CREATE'
  | 'VARIANT_DELETE'
  | 'VARIANT_UPDATE';

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
  handle?: Maybe<Scalars['String']['output']>;
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

export type BundleConditionCategory =
  | 'NUMERIC'
  | 'STATE_CHECK';

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

export type BundleConditionOperator =
  | 'EQ'
  | 'GTE'
  | 'IS_NOT_SELECTED'
  | 'IS_SELECTED'
  | 'LTE';

export type BundleConditionSubject =
  | 'GROUP_TOTAL_QTY'
  | 'ITEM_QTY'
  | 'ITEM_SELECTED';

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

export type BundleDependencyActionType =
  | 'ADJUST_PRICE'
  | 'HIDE'
  | 'SET_REQUIRED'
  | 'SHOW';

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

export type BundleDependencyTargetType =
  | 'BUNDLE'
  | 'GROUP'
  | 'ITEM';

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

export type BundleDisplayStyle =
  | 'ACCORDION'
  | 'FLAT'
  | 'TABS'
  | 'WIZARD';

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

export type BundleItemOptionValueSelectionStatus =
  | 'DESELECTED'
  | 'NEW'
  | 'SELECTED'
  | 'UNAVAILABLE';

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

export type BundleItemType =
  | 'PRODUCT'
  | 'VARIANT';

export type BundleLogicOperator =
  | 'AND'
  | 'OR';

export type ApiBundleOrderByInput = {
  direction: SortDirection;
  field: BundleOrderField;
};

export type BundleOrderField =
  | 'brandName'
  | 'createdAt'
  | 'currency'
  | 'handle'
  | 'id'
  | 'locale'
  | 'maxPriceMinor'
  | 'minPriceMinor'
  | 'name'
  | 'primaryCategoryId'
  | 'primaryCategoryName'
  | 'publishedAt'
  | 'updatedAt'
  | 'vendorId';

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

export type BundlePriceType =
  | 'BASE'
  | 'DISCOUNT_FIXED'
  | 'DISCOUNT_PERCENT'
  | 'FIXED'
  | 'FREE';

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

export type BundleType =
  | 'CUSTOM'
  | 'FIXED'
  | 'MIX_AND_MATCH'
  | 'MULTIPACK';

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

export type ApiBundleWhereInput = {
  _and?: InputMaybe<Array<ApiBundleWhereInput>>;
  _not?: InputMaybe<ApiBundleWhereInput>;
  _or?: InputMaybe<Array<ApiBundleWhereInput>>;
  brandName?: InputMaybe<ApiStringFilter>;
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  currency?: InputMaybe<ApiStringFilter>;
  handle?: InputMaybe<ApiStringFilter>;
  id?: InputMaybe<ApiIdFilter>;
  locale?: InputMaybe<ApiStringFilter>;
  maxPriceMinor?: InputMaybe<ApiIntFilter>;
  minPriceMinor?: InputMaybe<ApiIntFilter>;
  name?: InputMaybe<ApiStringFilter>;
  primaryCategoryId?: InputMaybe<ApiIdFilter>;
  primaryCategoryName?: InputMaybe<ApiStringFilter>;
  publishedAt?: InputMaybe<ApiDateTimeFilter>;
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
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
  /** Create a new facet */
  facetCreate: ApiFacetCreatePayload;
  /** Delete a facet */
  facetDelete: ApiFacetDeletePayload;
  /** Create a new facet group */
  facetGroupCreate: ApiFacetGroupCreatePayload;
  /** Delete a facet group */
  facetGroupDelete: ApiFacetGroupDeletePayload;
  /** Update an existing facet group */
  facetGroupUpdate: ApiFacetGroupUpdatePayload;
  /** Create a new facet swatch */
  facetSwatchCreate: ApiFacetSwatchCreatePayload;
  /** Delete a facet swatch */
  facetSwatchDelete: ApiFacetSwatchDeletePayload;
  /** Update an existing facet swatch */
  facetSwatchUpdate: ApiFacetSwatchUpdatePayload;
  /** Update an existing facet */
  facetUpdate: ApiFacetUpdatePayload;
  /** Create a new facet value */
  facetValueCreate: ApiFacetValueCreatePayload;
  /** Delete a facet value */
  facetValueDelete: ApiFacetValueDeletePayload;
  /** Update an existing facet value */
  facetValueUpdate: ApiFacetValueUpdatePayload;
  /**
   * Start async bulk update.
   * Requires X-Idempotency-Key header.
   */
  productBulkUpdate: ApiProductBulkUpdatePayload;
  /** Create a new product */
  productCreate: ApiProductCreatePayload;
  /** Delete an existing product */
  productDelete: ApiProductDeletePayload;
  /** Create a new product feature */
  productFeatureCreate: ApiProductFeatureCreatePayload;
  /** Delete a product feature */
  productFeatureDelete: ApiProductFeatureDeletePayload;
  /** Update an existing product feature */
  productFeatureUpdate: ApiProductFeatureUpdatePayload;
  /** Sync all product features (complete replace operation) */
  productFeaturesSync: ApiProductFeaturesSyncPayload;
  /** Create a new product option (e.g., Size, Color) */
  productOptionCreate: ApiProductOptionCreatePayload;
  /** Delete a product option */
  productOptionDelete: ApiProductOptionDeletePayload;
  /** Update an existing product option */
  productOptionUpdate: ApiProductOptionUpdatePayload;
  /**
   * Sync all product options. This is a complete replace operation.
   * Options not in the input list will be deleted.
   * Does NOT affect variants - only option definitions are synced.
   */
  productOptionsSync: ApiProductOptionsSyncPayload;
  /**
   * Unified product update with optimistic locking.
   * Supports product and variant updates in a single request.
   */
  productUpdate: ApiProductUpdatePayload;
  /** Update product status (active, draft, archived) */
  productUpdateStatus: ApiProductUpdateStatusPayload;
  /** Create a new tag */
  tagCreate: ApiTagCreatePayload;
  /** Delete a tag */
  tagDelete: ApiTagDeletePayload;
  /** Update an existing tag */
  tagUpdate: ApiTagUpdatePayload;
  /** Create a new variant for a product */
  variantCreate: ApiVariantCreatePayload;
  /** Delete a variant */
  variantDelete: ApiVariantDeletePayload;
  /** Update media attachments for a variant */
  variantUpdateMedia: ApiVariantUpdateMediaPayload;
  /** Update variant option values */
  variantUpdateOptions: ApiVariantUpdateOptionsPayload;
  /** Update variant pricing information */
  variantUpdatePricing: ApiVariantUpdatePricingPayload;
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


export type ApiCatalogMutationFacetCreateArgs = {
  input: ApiFacetCreateInput;
};


export type ApiCatalogMutationFacetDeleteArgs = {
  input: ApiFacetDeleteInput;
};


export type ApiCatalogMutationFacetGroupCreateArgs = {
  input: ApiFacetGroupCreateInput;
};


export type ApiCatalogMutationFacetGroupDeleteArgs = {
  input: ApiFacetGroupDeleteInput;
};


export type ApiCatalogMutationFacetGroupUpdateArgs = {
  input: ApiFacetGroupUpdateInput;
};


export type ApiCatalogMutationFacetSwatchCreateArgs = {
  input: ApiFacetSwatchCreateInput;
};


export type ApiCatalogMutationFacetSwatchDeleteArgs = {
  input: ApiFacetSwatchDeleteInput;
};


export type ApiCatalogMutationFacetSwatchUpdateArgs = {
  input: ApiFacetSwatchUpdateInput;
};


export type ApiCatalogMutationFacetUpdateArgs = {
  input: ApiFacetUpdateInput;
};


export type ApiCatalogMutationFacetValueCreateArgs = {
  input: ApiFacetValueCreateInput;
};


export type ApiCatalogMutationFacetValueDeleteArgs = {
  input: ApiFacetValueDeleteInput;
};


export type ApiCatalogMutationFacetValueUpdateArgs = {
  input: ApiFacetValueUpdateInput;
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


export type ApiCatalogMutationProductFeatureCreateArgs = {
  input: ApiProductFeatureCreateInput;
};


export type ApiCatalogMutationProductFeatureDeleteArgs = {
  input: ApiProductFeatureDeleteInput;
};


export type ApiCatalogMutationProductFeatureUpdateArgs = {
  input: ApiProductFeatureUpdateInput;
};


export type ApiCatalogMutationProductFeaturesSyncArgs = {
  input: ApiProductFeaturesSyncInput;
};


export type ApiCatalogMutationProductOptionCreateArgs = {
  input: ApiProductOptionCreateInput;
};


export type ApiCatalogMutationProductOptionDeleteArgs = {
  input: ApiProductOptionDeleteInput;
};


export type ApiCatalogMutationProductOptionUpdateArgs = {
  input: ApiProductOptionUpdateInput;
};


export type ApiCatalogMutationProductOptionsSyncArgs = {
  input: ApiProductOptionsSyncInput;
};


export type ApiCatalogMutationProductUpdateArgs = {
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  operations?: InputMaybe<ApiProductUpdateInput>;
  productId: Scalars['ID']['input'];
};


export type ApiCatalogMutationProductUpdateStatusArgs = {
  input: ApiProductUpdateStatusInput;
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


export type ApiCatalogMutationVariantCreateArgs = {
  input: ApiVariantCreateInput;
};


export type ApiCatalogMutationVariantDeleteArgs = {
  input: ApiVariantDeleteInput;
};


export type ApiCatalogMutationVariantUpdateMediaArgs = {
  input: ApiVariantUpdateMediaInput;
};


export type ApiCatalogMutationVariantUpdateOptionsArgs = {
  input: ApiVariantUpdateOptionsInput;
};


export type ApiCatalogMutationVariantUpdatePricingArgs = {
  input: ApiVariantUpdatePricingInput;
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
  /** Get a facet by ID */
  facet?: Maybe<ApiFacet>;
  /** Get a facet group by ID */
  facetGroup?: Maybe<ApiFacetGroup>;
  /** Get all facet groups */
  facetGroups: Array<ApiFacetGroup>;
  /** Get a facet swatch by ID */
  facetSwatch?: Maybe<ApiFacetSwatch>;
  /** Get all facet swatches */
  facetSwatches: Array<ApiFacetSwatch>;
  /** Get a facet value by ID */
  facetValue?: Maybe<ApiFacetValue>;
  /** Get all facet values for a specific facet */
  facetValues: Array<ApiFacetValue>;
  /** Get all facets */
  facets: Array<ApiFacet>;
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


export type ApiCatalogQueryFacetArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCatalogQueryFacetGroupArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCatalogQueryFacetSwatchArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCatalogQueryFacetValueArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCatalogQueryFacetValuesArgs = {
  facetId: Scalars['ID']['input'];
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
  /** Catalog listing items assigned to this category, including products and bundles. */
  listing: ApiListingConnection;
  /** The total number of listing items in this category. */
  listingCount: Scalars['Int']['output'];
  /** Media files associated with this category. */
  media: Array<ApiCategoryMediaItem>;
  /** The display name of the category. */
  name: Scalars['String']['output'];
  /** The parent category, if any. */
  parent?: Maybe<ApiCategory>;
  /** The materialized path for this category. */
  path: Scalars['String']['output'];
  /** The date and time when the category was published, or null if unpublished. */
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Optimistic locking revision number. Incremented on each update. */
  revision: Scalars['Int']['output'];
  /** SEO metadata. */
  seo?: Maybe<ApiSeo>;
  /** The date and time when the category was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};


/** A category represents a hierarchical grouping of products. */
export type ApiCategoryListingArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiListingOrderByInput>>;
  where?: InputMaybe<ApiListingWhereInput>;
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

export type CategoryHierarchyScopeDirection =
  | 'ANCESTORS'
  | 'DESCENDANTS';

export type ApiCategoryHierarchyScopeInput = {
  direction: CategoryHierarchyScopeDirection;
  includeReference?: InputMaybe<Scalars['Boolean']['input']>;
  mode: CategoryHierarchyScopeMode;
  referenceId: Scalars['ID']['input'];
};

export type CategoryHierarchyScopeMode =
  | 'EXCLUDE'
  | 'INCLUDE';

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
export type CategoryOrderField =
  /** Sort by createdAt */
  | 'createdAt'
  /** Sort by defaultSort */
  | 'defaultSort'
  /** Sort by defaultSortDirection */
  | 'defaultSortDirection'
  /** Sort by depth */
  | 'depth'
  /** Sort by handle */
  | 'handle'
  /** Sort by id */
  | 'id'
  /** Sort by locale */
  | 'locale'
  /** Sort by name */
  | 'name'
  /** Sort by parentId */
  | 'parentId'
  /** Sort by path */
  | 'path'
  /** Sort by productsCount */
  | 'productsCount'
  /** Sort by publishedAt */
  | 'publishedAt'
  /** Sort by updatedAt */
  | 'updatedAt';

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

export type CategoryStatus =
  | 'DRAFT'
  | 'PUBLISHED';

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

export type CollectionType =
  | 'MANUAL'
  | 'RULE';

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

export type ApiCustomer = {
  __typename?: 'Customer';
  id: Scalars['ID']['output'];
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
  group?: Maybe<ApiFacetGroup>;
  id: Scalars['ID']['output'];
  indexable: Scalars['Boolean']['output'];
  label: Scalars['String']['output'];
  maxValuesVisible: Scalars['Int']['output'];
  minValues: Scalars['Int']['output'];
  selectionMode: FacetSelectionMode;
  slug: Scalars['String']['output'];
  sortIndex: Scalars['Int']['output'];
  sourceHandles: Array<Scalars['String']['output']>;
  uiType: FacetUiType;
  valueSort: FacetValueSort;
  values: Array<ApiFacetValue>;
};

export type ApiFacetCreateInput = {
  facetType: FacetType;
  groupId?: InputMaybe<Scalars['ID']['input']>;
  label: Scalars['String']['input'];
  selectionMode?: InputMaybe<FacetSelectionMode>;
  slug: Scalars['String']['input'];
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  uiType?: InputMaybe<FacetUiType>;
};

export type ApiFacetCreatePayload = {
  __typename?: 'FacetCreatePayload';
  facet?: Maybe<ApiFacet>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiFacetDeletePayload = {
  __typename?: 'FacetDeletePayload';
  deletedFacetId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetGroup = ApiNode & {
  __typename?: 'FacetGroup';
  collapsed: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  facets: Array<ApiFacet>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  sortIndex: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ApiFacetGroupCreateInput = {
  collapsed?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiFacetGroupCreatePayload = {
  __typename?: 'FacetGroupCreatePayload';
  facetGroup?: Maybe<ApiFacetGroup>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetGroupDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiFacetGroupDeletePayload = {
  __typename?: 'FacetGroupDeletePayload';
  deletedFacetGroupId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetGroupUpdateInput = {
  collapsed?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type ApiFacetGroupUpdatePayload = {
  __typename?: 'FacetGroupUpdatePayload';
  facetGroup?: Maybe<ApiFacetGroup>;
  userErrors: Array<ApiGenericUserError>;
};

export type FacetSelectionMode =
  | 'MULTI'
  | 'SINGLE';

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

export type FacetType =
  | 'FEATURE'
  | 'IN_STOCK'
  | 'OPTION'
  | 'PRICE'
  | 'TAG';

export type FacetUiType =
  | 'BOOLEAN'
  | 'CHECKBOX'
  | 'DROPDOWN'
  | 'RADIO'
  | 'RANGE';

export type ApiFacetUpdateInput = {
  groupId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
  indexable?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  maxValuesVisible?: InputMaybe<Scalars['Int']['input']>;
  minValues?: InputMaybe<Scalars['Int']['input']>;
  selectionMode?: InputMaybe<FacetSelectionMode>;
  slug?: InputMaybe<Scalars['String']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  uiType?: InputMaybe<FacetUiType>;
  valueSort?: InputMaybe<FacetValueSort>;
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
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  sortIndex: Scalars['Int']['output'];
  sourceHandles: Array<Scalars['String']['output']>;
  swatch?: Maybe<ApiFacetSwatch>;
};

export type ApiFacetValueCreateInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  facetId: Scalars['ID']['input'];
  label: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  sourceHandles?: InputMaybe<Array<Scalars['String']['input']>>;
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

export type FacetValueSort =
  | 'ALPHA'
  | 'COUNT'
  | 'CUSTOM';

export type ApiFacetValueUpdateInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  sourceHandles?: InputMaybe<Array<Scalars['String']['input']>>;
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
export type FileOrderField =
  /** Sort by altText */
  | 'altText'
  /** Sort by createdAt */
  | 'createdAt'
  /** Sort by durationMs */
  | 'durationMs'
  /** Sort by ext */
  | 'ext'
  /** Sort by height */
  | 'height'
  /** Sort by id */
  | 'id'
  /** Sort by idempotencyKey */
  | 'idempotencyKey'
  /** Sort by isProcessed */
  | 'isProcessed'
  /** Sort by meta */
  | 'meta'
  /** Sort by mimeType */
  | 'mimeType'
  /** Sort by originalName */
  | 'originalName'
  /** Sort by provider */
  | 'provider'
  /** Sort by sizeBytes */
  | 'sizeBytes'
  /** Sort by sourceUrl */
  | 'sourceUrl'
  /** Sort by updatedAt */
  | 'updatedAt'
  /** Sort by url */
  | 'url'
  /** Sort by width */
  | 'width';

/** Provider type for files. */
export type FileProvider =
  /** Local file storage */
  | 'LOCAL'
  /** File stored in S3 */
  | 'S3'
  /** External URL */
  | 'URL'
  /** Vimeo video */
  | 'VIMEO'
  /** YouTube video */
  | 'YOUTUBE';

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
  projectID: Scalars['String']['output'];
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

export type InventoryItemOrderField =
  | 'availableForSale'
  | 'id'
  | 'productName'
  | 'quantityOnHand'
  | 'reservedQuantity'
  | 'sku'
  | 'unavailableQuantity'
  | 'updatedAt'
  | 'variantId';

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

export type InventoryItemWarehouseScopeMode =
  | 'EXCLUDE'
  | 'INCLUDE';

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
  /** Update inventory item: stock, SKU, and cost. */
  inventoryItemUpdate: ApiInventoryItemUpdatePayload;
  warehouseCreate: ApiWarehouseCreatePayload;
  warehouseDelete: ApiWarehouseDeletePayload;
  warehouseStockCreate: ApiWarehouseStockCreatePayload;
  warehouseStockDelete: ApiWarehouseStockDeletePayload;
  warehouseUpdate: ApiWarehouseUpdatePayload;
};


export type ApiInventoryMutationInventoryItemUpdateArgs = {
  input: ApiInventoryItemUpdateInput;
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
  /** The URL-friendly handle. */
  handle?: Maybe<Scalars['String']['output']>;
  /** The Product global ID of the catalog listing item. */
  id: Scalars['ID']['output'];
  /** Product discriminator. */
  kind: ProductKind;
  /** Media registered on this listing item. */
  media: Array<ApiProductMediaItem>;
  /** Localized title. */
  title: Scalars['String']['output'];
};

/** A connection to a mixed list of catalog listing items. */
export type ApiListingConnection = {
  __typename?: 'ListingConnection';
  /** A list of edges. */
  edges: Array<ApiListingEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of catalog listing items. */
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

/** Ordering configuration for Listing */
export type ApiListingOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ListingOrderField;
};

/** Fields available for sorting Listing */
export type ListingOrderField =
  /** Sort by brandName */
  | 'brandName'
  /** Sort by createdAt */
  | 'createdAt'
  /** Sort by currency */
  | 'currency'
  /** Sort by handle */
  | 'handle'
  /** Sort by id */
  | 'id'
  /** Sort by kind */
  | 'kind'
  /** Sort by locale */
  | 'locale'
  /** Sort by maxPriceMinor */
  | 'maxPriceMinor'
  /** Sort by minPriceMinor */
  | 'minPriceMinor'
  /** Sort by name */
  | 'name'
  /** Sort by primaryCategoryId */
  | 'primaryCategoryId'
  /** Sort by primaryCategoryName */
  | 'primaryCategoryName'
  /** Sort by publishedAt */
  | 'publishedAt'
  /** Sort by updatedAt */
  | 'updatedAt'
  /** Sort by vendorId */
  | 'vendorId';

/** Filter conditions for Listing */
export type ApiListingWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiListingWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiListingWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiListingWhereInput>>;
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
  /** Filter by kind */
  kind?: InputMaybe<ApiStringFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by maxPriceMinor */
  maxPriceMinor?: InputMaybe<ApiIntFilter>;
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
  /** Inventory mutation namespace for warehouse, stock, and inventory item operations */
  inventoryMutation: ApiInventoryMutation;
  mediaMutation: ApiMediaMutation;
  orderMutation: ApiOrderMutation;
  /** Organization management mutations. */
  organizationMutation: ApiOrganizationMutation;
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
export type OperationType =
  | 'CATEGORY_UPDATE'
  | 'PRODUCT_CATEGORY_UPDATE'
  | 'PRODUCT_TAG_UPDATE'
  | 'PRODUCT_UPDATE'
  | 'VARIANT_CREATE'
  | 'VARIANT_DELETE'
  | 'VARIANT_UPDATE';

/** Display type for product options in the UI. */
export type OptionDisplayType =
  | 'BUTTONS'
  | 'DROPDOWN'
  | 'SWATCH';

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

export type OrderCancelReason =
  | 'CUSTOMER'
  | 'FRAUD'
  | 'INVENTORY'
  | 'OTHER'
  | 'STAFF';

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

export type OrderEventType =
  | 'ORDER_CREATED';

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

export type OrderStatus =
  | 'ACTIVE'
  | 'CANCELLED'
  | 'CLOSED'
  | 'DRAFT';

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
export type OrganizationOrderField =
  /** Sort by createdAt */
  | 'createdAt'
  /** Sort by displayName */
  | 'displayName'
  /** Sort by name */
  | 'name'
  /** Sort by updatedAt */
  | 'updatedAt';

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
  handle?: Maybe<Scalars['String']['output']>;
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

export type ProductCategoryOperationAction =
  | 'ADD'
  | 'MOVE'
  | 'REMOVE'
  | 'SET_PRIMARY';

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

export type ProductKind =
  | 'BASE'
  | 'BUNDLE';

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
export type ProductOrderField =
  /** Sort by brandName */
  | 'brandName'
  /** Sort by createdAt */
  | 'createdAt'
  /** Sort by currency */
  | 'currency'
  /** Sort by handle */
  | 'handle'
  /** Sort by id */
  | 'id'
  /** Sort by locale */
  | 'locale'
  /** Sort by maxPriceMinor */
  | 'maxPriceMinor'
  /** Sort by minPriceMinor */
  | 'minPriceMinor'
  /** Sort by name */
  | 'name'
  /** Sort by primaryCategoryId */
  | 'primaryCategoryId'
  /** Sort by primaryCategoryName */
  | 'primaryCategoryName'
  /** Sort by publishedAt */
  | 'publishedAt'
  /** Sort by updatedAt */
  | 'updatedAt'
  /** Sort by vendorId */
  | 'vendorId';

export type ApiProductProductsMetaInput = {
  categoriesScope?: InputMaybe<ApiProductCategoriesScopeInput>;
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

export type ProductSortBy =
  | 'MANUAL'
  | 'NAME'
  | 'NEWEST'
  | 'PRICE';

export type ApiProductSortInput = {
  by: ProductSortBy;
  direction?: InputMaybe<SortDirection>;
};

export type ProductStatus =
  | 'DRAFT'
  | 'PUBLISHED';

export type ProductStatusAction =
  | 'PUBLISH'
  | 'UNPUBLISH';

export type ProductTagOperationAction =
  | 'ADD'
  | 'REMOVE';

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
  /** The URL-friendly handle for the product. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** Product media. */
  media?: InputMaybe<ApiProductMediaInput>;
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

/**
 * Input for updating product status (publish or unpublish).
 * Reused in bulk operations.
 */
export type ApiProductUpdateStatusInput = {
  /** Action: PUBLISH or UNPUBLISH. */
  action: ProductStatusAction;
  /** Product ID. */
  productId: Scalars['ID']['input'];
};

/** Payload for product update status. */
export type ApiProductUpdateStatusPayload = {
  __typename?: 'ProductUpdateStatusPayload';
  /** The updated product. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
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
  /** Filter by maxPriceMinor */
  maxPriceMinor?: InputMaybe<ApiIntFilter>;
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
  /** Inventory query namespace for warehouse, stock, and inventory item operations */
  inventoryQuery: ApiInventoryQuery;
  mediaQuery: ApiMediaQuery;
  orderQuery: ApiOrderQuery;
  /** Organization queries namespace. */
  organizationQuery: ApiOrganizationQuery;
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
export type SortDirection =
  | 'asc'
  | 'desc';

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
export type StoreStatus =
  /** Store is active and operational */
  | 'ACTIVE'
  /** Store is inactive and not processing requests */
  | 'INACTIVE';

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
export type SwatchType =
  | 'COLOR'
  | 'GRADIENT'
  | 'IMAGE';

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
export type TagOrderField =
  /** Sort by createdAt */
  | 'createdAt'
  /** Sort by handle */
  | 'handle'
  /** Sort by id */
  | 'id'
  /** Sort by locale */
  | 'locale'
  /** Sort by name */
  | 'name'
  /** Sort by productsCount */
  | 'productsCount'
  /** Sort by projectId */
  | 'projectId';

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
  /** Filter by projectId */
  projectId?: InputMaybe<ApiIdFilter>;
};

export type ThresholdMethod =
  | 'REORDER_POINT'
  | 'SAFETY_STOCK';

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
  /** Currency code for unit cost. */
  costCurrency?: InputMaybe<CurrencyCode>;
  /** Quantity on hand. */
  onHand: Scalars['Int']['input'];
  /** SKU code. */
  sku?: InputMaybe<Scalars['String']['input']>;
  /** Unavailable quantity (reserved, damaged, etc.). */
  unavailable?: InputMaybe<Scalars['Int']['input']>;
  /** Unit cost in minor units (cents). */
  unitCostMinor?: InputMaybe<Scalars['BigInt']['input']>;
  /** The warehouse ID. */
  warehouseId: Scalars['ID']['input'];
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
export type VariantOperationAction =
  | 'CREATE'
  | 'DELETE'
  | 'UPDATE';

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
export type VariantOrderField =
  /** Sort by createdAt */
  | 'createdAt'
  /** Sort by externalId */
  | 'externalId'
  /** Sort by externalSystem */
  | 'externalSystem'
  /** Sort by handle */
  | 'handle'
  /** Sort by id */
  | 'id'
  /** Sort by isDefault */
  | 'isDefault'
  /** Sort by productId */
  | 'productId'
  /** Sort by updatedAt */
  | 'updatedAt';

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
export type VendorOrderField =
  /** Sort by id */
  | 'id'
  /** Sort by name */
  | 'name';

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

export type WarehouseAssignableVariantOrderField =
  | 'createdAt'
  | 'externalId'
  | 'externalSystem'
  | 'handle'
  | 'id'
  | 'isDefault'
  | 'productId'
  | 'productName'
  | 'sku'
  | 'updatedAt';

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
export type WarehouseOrderField =
  /** Sort by code */
  | 'code'
  /** Sort by createdAt */
  | 'createdAt'
  /** Sort by id */
  | 'id'
  /** Sort by isDefault */
  | 'isDefault'
  /** Sort by name */
  | 'name'
  /** Sort by updatedAt */
  | 'updatedAt';

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
export type WarehouseStockOrderField =
  /** Sort by createdAt */
  | 'createdAt'
  /** Sort by id */
  | 'id'
  /** Sort by quantityOnHand */
  | 'quantityOnHand'
  /** Sort by updatedAt */
  | 'updatedAt'
  /** Sort by variantId */
  | 'variantId'
  /** Sort by warehouseId */
  | 'warehouseId';

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
export type WeightUnit =
  /** Gram */
  | 'g'
  /** Kilogram */
  | 'kg'
  /** Pound */
  | 'lb'
  /** Ounce */
  | 'oz';

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

export type Join__Graph =
  | 'APPS_ADMIN'
  | 'CATALOG_ADMIN'
  | 'IAM_ADMIN'
  | 'MEDIA_ADMIN'
  | 'ORDERS_ADMIN'
  | 'PROJECT_ADMIN';

export type Link__Purpose =
  /** `EXECUTION` features provide metadata necessary for operation execution. */
  | 'EXECUTION'
  /** `SECURITY` features provide metadata necessary to securely resolve fields. */
  | 'SECURITY';

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
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: string; output: string; }
  DateTime: { input: string; output: string; }
  Email: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  _FieldSet: { input: any; output: any; }
};

/** Filter operators for Boolean fields */
export type BooleanFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Boolean']['input']>;
};

export enum BulkUpdateCancelReason {
  Superseded = 'SUPERSEDED',
  System = 'SYSTEM',
  User = 'USER'
}

/** Single operation in bulk update job. */
export type BulkUpdateItem = {
  __typename?: 'BulkUpdateItem';
  /** Cancel reason (only for CANCELLED/SUPERSEDED). */
  cancelReason: Maybe<BulkUpdateCancelReason>;
  /** Execution errors. */
  errors: Array<BulkUpdateUserError>;
  /** When finished. */
  finishedAt: Maybe<Scalars['DateTime']['output']>;
  /** Item ID. */
  id: Scalars['ID']['output'];
  /** Order within product. */
  opIndex: Scalars['Int']['output'];
  /** Operation type. */
  opType: BulkUpdateOpType;
  /** Product ID. */
  productId: Scalars['ID']['output'];
  /** When started. */
  startedAt: Maybe<Scalars['DateTime']['output']>;
  /** Current status. */
  status: BulkUpdateItemStatus;
  /** Job that superseded this item. */
  supersededByJobId: Maybe<Scalars['ID']['output']>;
  /** Variant ID (null for product-level operations). */
  variantId: Maybe<Scalars['ID']['output']>;
};

export type BulkUpdateItemConnection = {
  __typename?: 'BulkUpdateItemConnection';
  edges: Array<BulkUpdateItemEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type BulkUpdateItemEdge = {
  __typename?: 'BulkUpdateItemEdge';
  cursor: Scalars['String']['output'];
  node: BulkUpdateItem;
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
export type BulkUpdateJobProgress = {
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
export type BulkUpdateUserError = UserError & {
  __typename?: 'BulkUpdateUserError';
  /** Error code. */
  code: Maybe<Scalars['String']['output']>;
  /** Input field path. */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** Error message. */
  message: Scalars['String']['output'];
  /** Operation that failed. */
  operation: Maybe<Scalars['String']['output']>;
  /** Product ID. */
  productId: Maybe<Scalars['ID']['output']>;
  /** Variant ID. */
  variantId: Maybe<Scalars['ID']['output']>;
};

export type Bundle = Listing & Node & {
  __typename?: 'Bundle';
  /** Category assignments with relationship metadata. */
  categoryAssignments: Array<ProductCategoryAssignment>;
  /** All bundle configurations for this bundle. */
  configurations: Array<BundleConfiguration>;
  /** The date and time when the bundle was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the bundle was deleted (soft delete). */
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  /** Bundle description. */
  description: Maybe<RichText>;
  /** Configurator display style. */
  displayStyle: BundleDisplayStyle;
  /** Short excerpt. */
  excerpt: Maybe<RichText>;
  /** The features of this bundle. */
  features: Array<ProductFeature>;
  /** The URL-friendly handle for the bundle. */
  handle: Scalars['String']['output'];
  /** The Product global ID of the bundle sellable item. */
  id: Scalars['ID']['output'];
  /** Whether the bundle is currently published. */
  isPublished: Scalars['Boolean']['output'];
  /** Product discriminator. Always BUNDLE for this type. */
  kind: ProductKind;
  /** Media registered on this bundle. */
  media: Array<ProductMediaItem>;
  /** The options available for this bundle. */
  options: Array<ProductOption>;
  /** Current bundle price range in the selected currency. */
  priceRange: Maybe<ProductPriceRange>;
  /** The primary category assigned to this bundle. */
  primaryCategory: Maybe<Category>;
  /** The date and time when the bundle was published, or null if unpublished. */
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  /** Optimistic locking revision number. Incremented on each update. */
  revision: Scalars['Int']['output'];
  /** SEO and Open Graph metadata. */
  seo: Maybe<ProductSeo>;
  /** The tags associated with this bundle. */
  tags: Array<Tag>;
  /** Bundle title. */
  title: Scalars['String']['output'];
  /** High-level bundle type. */
  type: Maybe<BundleType>;
  /** The date and time when the bundle was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** The variants of this bundle. */
  variants: VariantConnection;
  /** The total number of variants for this bundle. */
  variantsCount: Scalars['Int']['output'];
  /** The vendor associated with this bundle. */
  vendor: Maybe<Vendor>;
};


export type BundleVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type BundleBasePriceRule = BundlePriceRule & Node & {
  __typename?: 'BundleBasePriceRule';
  /** The globally unique ID of the price rule. */
  id: Scalars['ID']['output'];
  /** Pricing strategy. */
  priceType: BundlePriceType;
};

export type BundleBundlesMetaInput = {
  categoriesScope?: InputMaybe<ProductCategoriesScopeInput>;
};

export type BundleCondition = Node & {
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
  value: Maybe<Scalars['Int']['output']>;
};

export enum BundleConditionCategory {
  Numeric = 'NUMERIC',
  StateCheck = 'STATE_CHECK'
}

export type BundleConditionGroup = Node & {
  __typename?: 'BundleConditionGroup';
  /** Conditions in this group. */
  conditions: Array<BundleCondition>;
  /** The globally unique ID of the condition group. */
  id: Scalars['ID']['output'];
  /** How conditions are combined. */
  logicOperator: BundleLogicOperator;
  /** Sort order within the rule. */
  sortIndex: Scalars['Int']['output'];
};

export type BundleConditionGroupSyncItemInput = {
  /** Complete list of conditions. */
  conditions: Array<BundleConditionSyncItemInput>;
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

export type BundleConditionSyncItemInput = {
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

export type BundleConfiguration = Node & {
  __typename?: 'BundleConfiguration';
  /** The bundle root this configuration belongs to. */
  bundle: Bundle;
  /** The Product global ID of the bundle this configuration belongs to. */
  bundleId: Scalars['ID']['output'];
  /** The date and time when the configuration was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Dependency rules in priority order. */
  dependencyRules: Array<BundleDependencyRule>;
  /** Groups in configurator order. */
  groups: Array<BundleGroup>;
  /** The globally unique ID of the configuration. */
  id: Scalars['ID']['output'];
  /** Configuration name. */
  name: Scalars['String']['output'];
  /** Reusable pricing templates. */
  pricingTemplates: Array<BundlePricingTemplate>;
  /** The date and time when the configuration was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Variants that use this configuration. */
  variants: Array<Variant>;
};

export type BundleConfigurationCreateInput = {
  /** Product global ID of the bundle. */
  bundleId: Scalars['ID']['input'];
  /** Expected parent bundle product revision. Required for optimistic locking. */
  expectedRevision: Scalars['Int']['input'];
  /** Configuration name. */
  name: Scalars['String']['input'];
};

export type BundleConfigurationDeleteInput = {
  expectedRevision: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
};

export type BundleConfigurationDeletePayload = {
  __typename?: 'BundleConfigurationDeletePayload';
  bundle: Maybe<Bundle>;
  deletedConfigurationId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type BundleConfigurationPayload = {
  __typename?: 'BundleConfigurationPayload';
  configuration: Maybe<BundleConfiguration>;
  userErrors: Array<GenericUserError>;
};

export type BundleConfigurationUpdateInput = {
  expectedRevision: Scalars['Int']['input'];
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

/** A connection to a list of Bundle items. */
export type BundleConnection = {
  __typename?: 'BundleConnection';
  /** A list of edges. */
  edges: Array<BundleEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of bundles. */
  totalCount: Scalars['Int']['output'];
};

export type BundleCreateInput = {
  /** Bundle description. */
  description?: InputMaybe<RichTextInput>;
  /** Configurator display style. */
  displayStyle?: InputMaybe<BundleDisplayStyle>;
  /** Short excerpt in multiple formats. */
  excerpt?: InputMaybe<RichTextInput>;
  /** URL-friendly handle for the bundle. */
  handle: Scalars['String']['input'];
  /** Inventory tracking settings for the bundle. */
  inventoryItem?: InputMaybe<InventoryItemInput>;
  /** File IDs for bundle media (already uploaded via mediaMutation.fileUpload). */
  mediaFileIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Bundle options. */
  options?: InputMaybe<Array<ProductCreateOptionInput>>;
  /** Bundle title. */
  title: Scalars['String']['input'];
  /** High-level bundle type. */
  type?: InputMaybe<BundleType>;
  /** Bundle variants to create. */
  variants?: InputMaybe<Array<ProductCreateVariantInput>>;
  /** Vendor ID to associate with the bundle. */
  vendorId?: InputMaybe<Scalars['ID']['input']>;
};

export type BundleCreatePayload = {
  __typename?: 'BundleCreatePayload';
  bundle: Maybe<Bundle>;
  userErrors: Array<GenericUserError>;
};

export type BundleDependencyAction = Node & {
  __typename?: 'BundleDependencyAction';
  /** Action type. */
  actionType: BundleDependencyActionType;
  /** The globally unique ID of the action. */
  id: Scalars['ID']['output'];
  /** Price rule for ADJUST_PRICE. */
  priceRule: Maybe<BundlePriceRule>;
  /** Required value for SET_REQUIRED. */
  requiredValue: Maybe<Scalars['Boolean']['output']>;
  /** Sort order within the rule. */
  sortIndex: Scalars['Int']['output'];
  /** Whether this action can stack with other matching actions. */
  stackable: Scalars['Boolean']['output'];
  /** Target ID. Null is allowed when targetType is BUNDLE. */
  targetId: Maybe<Scalars['ID']['output']>;
  /** Target type. */
  targetType: BundleDependencyTargetType;
};

export type BundleDependencyActionSyncItemInput = {
  /** Action type. */
  actionType: BundleDependencyActionType;
  /** Existing action ID. Null creates a new action. */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Price rule for ADJUST_PRICE. */
  priceRule?: InputMaybe<BundlePriceRuleInput>;
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

export type BundleDependencyRule = Node & {
  __typename?: 'BundleDependencyRule';
  /** Actions applied when conditions match. */
  actions: Array<BundleDependencyAction>;
  /** Condition groups. */
  conditionGroups: Array<BundleConditionGroup>;
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

export type BundleDependencyRuleSyncItemInput = {
  /** Complete list of actions. */
  actions: Array<BundleDependencyActionSyncItemInput>;
  /** Complete list of condition groups. */
  conditionGroups: Array<BundleConditionGroupSyncItemInput>;
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

export type BundleDependencyRulesSyncInput = {
  configurationId: Scalars['ID']['input'];
  /**
   * Complete list of dependency rules for this configuration.
   * Rules not present in this list are deleted.
   */
  dependencyRules: Array<BundleDependencyRuleSyncItemInput>;
  expectedRevision: Scalars['Int']['input'];
};

export type BundleDependencyRulesSyncPayload = {
  __typename?: 'BundleDependencyRulesSyncPayload';
  configuration: Maybe<BundleConfiguration>;
  dependencyRules: Array<BundleDependencyRule>;
  userErrors: Array<GenericUserError>;
};

export enum BundleDependencyTargetType {
  Bundle = 'BUNDLE',
  Group = 'GROUP',
  Item = 'ITEM'
}

export type BundleDiscountFixedPriceRule = BundlePriceRule & Node & {
  __typename?: 'BundleDiscountFixedPriceRule';
  /** Money values for DISCOUNT_FIXED rules. */
  amounts: Array<BundlePriceRuleAmount>;
  /** The globally unique ID of the price rule. */
  id: Scalars['ID']['output'];
  /** Pricing strategy. */
  priceType: BundlePriceType;
};

export type BundleDiscountPercentPriceRule = BundlePriceRule & Node & {
  __typename?: 'BundleDiscountPercentPriceRule';
  /** The globally unique ID of the price rule. */
  id: Scalars['ID']['output'];
  /** Percent row for DISCOUNT_PERCENT rules. */
  percent: BundlePriceRulePercent;
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
export type BundleEdge = {
  __typename?: 'BundleEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Bundle;
};

export type BundleFixedPriceRule = BundlePriceRule & Node & {
  __typename?: 'BundleFixedPriceRule';
  /** Money values for FIXED rules. */
  amounts: Array<BundlePriceRuleAmount>;
  /** The globally unique ID of the price rule. */
  id: Scalars['ID']['output'];
  /** Pricing strategy. */
  priceType: BundlePriceType;
};

export type BundleFreePriceRule = BundlePriceRule & Node & {
  __typename?: 'BundleFreePriceRule';
  /** The globally unique ID of the price rule. */
  id: Scalars['ID']['output'];
  /** Pricing strategy. */
  priceType: BundlePriceType;
};

export type BundleGroup = Node & {
  __typename?: 'BundleGroup';
  /** The date and time when the group was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The globally unique ID of the group. */
  id: Scalars['ID']['output'];
  /** Items in group order. */
  items: Array<BundleItem>;
  /** Maximum selected items in this group. Null means no maximum. */
  maxSelection: Maybe<Scalars['Int']['output']>;
  /** Minimum selected items in this group. Null means no minimum. */
  minSelection: Maybe<Scalars['Int']['output']>;
  /** Sort order within the configuration. */
  sortIndex: Scalars['Int']['output'];
  /** Display title from current locale. */
  title: Scalars['String']['output'];
  /** The date and time when the group was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type BundleGroupSyncItemInput = {
  /**
   * Existing group ID. Null creates a new group.
   * Existing groups in this configuration but missing from BundleGroupsSyncInput.groups are deleted.
   */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Complete list of items inside this group. */
  items: Array<BundleItemSyncItemInput>;
  maxSelection?: InputMaybe<Scalars['Int']['input']>;
  minSelection?: InputMaybe<Scalars['Int']['input']>;
  /** Sort order within the configuration. */
  sortIndex: Scalars['Int']['input'];
  /** Localized title for current locale. */
  title: Scalars['String']['input'];
};

export type BundleGroupsSyncInput = {
  configurationId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  /**
   * Complete list of groups for this configuration.
   * Groups not present in this list are deleted.
   */
  groups: Array<BundleGroupSyncItemInput>;
};

export type BundleGroupsSyncPayload = {
  __typename?: 'BundleGroupsSyncPayload';
  configuration: Maybe<BundleConfiguration>;
  groups: Array<BundleGroup>;
  userErrors: Array<GenericUserError>;
};

export type BundleItem = Node & {
  __typename?: 'BundleItem';
  /** The date and time when the item was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Default quantity. */
  defaultQty: Maybe<Scalars['Int']['output']>;
  /** Featured image override. */
  featuredImage: Maybe<File>;
  /** The group this item belongs to. */
  group: BundleGroup;
  /** The group ID. */
  groupId: Scalars['ID']['output'];
  /** The globally unique ID of the item. */
  id: Scalars['ID']['output'];
  /** Whether the item references a product or a concrete variant. */
  itemType: BundleItemType;
  /** Maximum selectable quantity. Null means unlimited. */
  maxQty: Maybe<Scalars['Int']['output']>;
  /** Minimum selectable quantity. */
  minQty: Maybe<Scalars['Int']['output']>;
  /** Allowed option/value selections for PRODUCT items. */
  optionSelections: Array<BundleItemOptionSelection>;
  /** Inline price rule. Null when pricingTemplate is used. */
  priceRule: Maybe<BundlePriceRule>;
  /** Reusable pricing template. Null when inline priceRule is used. */
  pricingTemplate: Maybe<BundlePricingTemplate>;
  /** Referenced product for PRODUCT items. */
  refProduct: Maybe<Product>;
  /** Referenced product ID for PRODUCT items. */
  refProductId: Maybe<Scalars['ID']['output']>;
  /** Referenced variant for VARIANT items. */
  refVariant: Maybe<Variant>;
  /** Referenced variant ID for VARIANT items. */
  refVariantId: Maybe<Scalars['ID']['output']>;
  /** Whether item is selected by default. */
  selected: Scalars['Boolean']['output'];
  /** Sort order within the group. */
  sortIndex: Scalars['Int']['output'];
  /** Optional display title override from current locale. */
  title: Maybe<Scalars['String']['output']>;
  /** The date and time when the item was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Whether item is visible in the configurator. */
  visible: Scalars['Boolean']['output'];
};

export type BundleItemOptionSelection = Node & {
  __typename?: 'BundleItemOptionSelection';
  /** The globally unique ID of the option selection. */
  id: Scalars['ID']['output'];
  /** Referenced product option. */
  option: ProductOption;
  /** Referenced product option ID. */
  optionId: Scalars['ID']['output'];
  /** Parent option for dependent option trees. */
  parentOption: Maybe<ProductOption>;
  /** Parent option ID. */
  parentOptionId: Maybe<Scalars['ID']['output']>;
  /** Sort order within item option selections. */
  sortIndex: Scalars['Int']['output'];
  /** Allowed values for this option. */
  values: Array<BundleItemOptionValueSelection>;
};

export type BundleItemOptionSelectionSyncItemInput = {
  /** Existing option selection ID. Null creates a new option selection. */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Referenced product option ID. */
  optionId: Scalars['ID']['input'];
  /** Parent option ID for dependent option trees. */
  parentOptionId?: InputMaybe<Scalars['ID']['input']>;
  /** Sort order within option selections. */
  sortIndex: Scalars['Int']['input'];
  /** Complete list of option value selections. */
  values: Array<BundleItemOptionValueSelectionSyncItemInput>;
};

export type BundleItemOptionValueSelection = Node & {
  __typename?: 'BundleItemOptionValueSelection';
  /** The globally unique ID of the option value selection. */
  id: Scalars['ID']['output'];
  /** Referenced product option value. Null when the value is unavailable. */
  optionValue: Maybe<ProductOptionValue>;
  /** Referenced product option value ID. */
  optionValueId: Maybe<Scalars['ID']['output']>;
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

export type BundleItemOptionValueSelectionSyncItemInput = {
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

export type BundleItemSyncItemInput = {
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
  optionSelections?: InputMaybe<Array<BundleItemOptionSelectionSyncItemInput>>;
  /** Inline price rule. Cannot be used together with pricingTemplateId. */
  priceRule?: InputMaybe<BundlePriceRuleInput>;
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
export type BundleOrderByInput = {
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

export type BundlePriceRule = {
  /** The globally unique ID of the price rule. */
  id: Scalars['ID']['output'];
  /** Pricing strategy. */
  priceType: BundlePriceType;
};

export type BundlePriceRuleAmount = {
  __typename?: 'BundlePriceRuleAmount';
  /** Amount in minor units. */
  amountMinor: Scalars['BigInt']['output'];
  /** The currency code. */
  currency: CurrencyCode;
};

export type BundlePriceRuleAmountInput = {
  /** Amount in minor units. */
  amountMinor: Scalars['BigInt']['input'];
  /** The currency code. */
  currency: CurrencyCode;
};

export type BundlePriceRuleInput = {
  /** Money values for FIXED and DISCOUNT_FIXED rules. */
  amounts?: InputMaybe<Array<BundlePriceRuleAmountInput>>;
  /** Existing price rule ID. Null creates a new price rule. */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Percent value for DISCOUNT_PERCENT rules. */
  percent?: InputMaybe<BundlePriceRulePercentInput>;
  /** Pricing strategy. */
  priceType: BundlePriceType;
};

export type BundlePriceRulePercent = {
  __typename?: 'BundlePriceRulePercent';
  /** Percent value, 0..100. */
  value: Scalars['Int']['output'];
};

export type BundlePriceRulePercentInput = {
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

export type BundlePricingTemplate = Node & {
  __typename?: 'BundlePricingTemplate';
  /** The globally unique ID of the pricing template. */
  id: Scalars['ID']['output'];
  /** Template name. */
  name: Scalars['String']['output'];
  /** Reusable price rule. */
  priceRule: BundlePriceRule;
  /** Sort order within configuration. */
  sortIndex: Scalars['Int']['output'];
};

export type BundlePricingTemplateSyncItemInput = {
  /**
   * Existing pricing template ID. Null creates a new template.
   * Existing templates in this configuration but missing from
   * BundlePricingTemplatesSyncInput.pricingTemplates are deleted.
   */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Template name. */
  name: Scalars['String']['input'];
  /** Reusable price rule. */
  priceRule: BundlePriceRuleInput;
  /** Sort order within configuration. */
  sortIndex: Scalars['Int']['input'];
};

export type BundlePricingTemplatesSyncInput = {
  configurationId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  /**
   * Complete list of pricing templates for this configuration.
   * Templates not present in this list are deleted.
   */
  pricingTemplates: Array<BundlePricingTemplateSyncItemInput>;
};

export type BundlePricingTemplatesSyncPayload = {
  __typename?: 'BundlePricingTemplatesSyncPayload';
  configuration: Maybe<BundleConfiguration>;
  pricingTemplates: Array<BundlePricingTemplate>;
  userErrors: Array<GenericUserError>;
};

export enum BundleType {
  Custom = 'CUSTOM',
  Fixed = 'FIXED',
  MixAndMatch = 'MIX_AND_MATCH',
  Multipack = 'MULTIPACK'
}

export type BundleUpdateInput = {
  /** Bundle category assignment operations. */
  categories?: InputMaybe<Array<ProductCategoryOperationInput>>;
  /** Bundle content (description, excerpt). */
  content?: InputMaybe<ProductContentInput>;
  /** Configurator display style. */
  displayStyle?: InputMaybe<BundleDisplayStyle>;
  /** The URL-friendly handle for the bundle. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** Bundle media. */
  media?: InputMaybe<ProductMediaInput>;
  /** SEO and Open Graph metadata. */
  seo?: InputMaybe<ProductSeoInput>;
  /** Bundle status: DRAFT or PUBLISHED. */
  status?: InputMaybe<ProductStatus>;
  /** Bundle tag assignment operations. */
  tags?: InputMaybe<Array<ProductTagOperationInput>>;
  /** Bundle title. */
  title?: InputMaybe<Scalars['String']['input']>;
  /** High-level bundle type. */
  type?: InputMaybe<BundleType>;
  /** Variant create, update, and delete operations. */
  variants?: InputMaybe<Array<VariantOperationInput>>;
  /** Vendor ID to associate with the bundle. Pass null to clear. */
  vendorId?: InputMaybe<Scalars['ID']['input']>;
};

export type BundleUpdatePayload = {
  __typename?: 'BundleUpdatePayload';
  bundle: Maybe<Bundle>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for Bundle */
export type BundleWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<BundleWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<BundleWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<BundleWhereInput>>;
  /** Filter by brandName */
  brandName?: InputMaybe<StringFilter>;
  /** Filter by bundleType */
  bundleType?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by currency */
  currency?: InputMaybe<StringFilter>;
  /** Filter by handle */
  handle?: InputMaybe<StringFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<StringFilter>;
  /** Filter by maxAmountMinor */
  maxAmountMinor?: InputMaybe<IntFilter>;
  /** Filter by maxPriceMinor */
  maxPriceMinor?: InputMaybe<IntFilter>;
  /** Filter by minAmountMinor */
  minAmountMinor?: InputMaybe<IntFilter>;
  /** Filter by minPriceMinor */
  minPriceMinor?: InputMaybe<IntFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
  /** Filter by primaryCategoryId */
  primaryCategoryId?: InputMaybe<IdFilter>;
  /** Filter by primaryCategoryName */
  primaryCategoryName?: InputMaybe<StringFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by vendorId */
  vendorId?: InputMaybe<IdFilter>;
};

export type CatalogMutation = {
  __typename?: 'CatalogMutation';
  /** Create one bundle configuration. */
  bundleConfigurationCreate: BundleConfigurationPayload;
  /** Delete one bundle configuration with optimistic locking. */
  bundleConfigurationDelete: BundleConfigurationDeletePayload;
  /** Update configuration metadata. */
  bundleConfigurationUpdate: BundleConfigurationPayload;
  /** Create a new bundle sellable item. */
  bundleCreate: BundleCreatePayload;
  /** Sync all dependency rules for one bundle configuration. */
  bundleDependencyRulesSync: BundleDependencyRulesSyncPayload;
  /** Sync all groups/items for one bundle configuration. */
  bundleGroupsSync: BundleGroupsSyncPayload;
  /** Sync all reusable pricing templates for one bundle configuration. */
  bundlePricingTemplatesSync: BundlePricingTemplatesSyncPayload;
  /** Unified bundle update with optimistic locking. */
  bundleUpdate: BundleUpdatePayload;
  /** Create a new category */
  categoryCreate: CategoryCreatePayload;
  /** Delete a category */
  categoryDelete: CategoryDeletePayload;
  /** Move a category to a new parent or position */
  categoryMove: CategoryMovePayload;
  /** Rebalance category tree positions */
  categoryRebalance: CategoryRebalancePayload;
  /** Unified category update with optimistic locking. */
  categoryUpdate: CategoryUpdatePayload;
  /** Add products to a collection */
  collectionAddProducts: CollectionAddProductsPayload;
  /** Create a new collection */
  collectionCreate: CollectionCreatePayload;
  /** Delete a collection */
  collectionDelete: CollectionDeletePayload;
  /** Move a product within a collection */
  collectionMoveProduct: CollectionMoveProductPayload;
  /** Remove products from a collection */
  collectionRemoveProducts: CollectionRemoveProductsPayload;
  /** Update an existing collection */
  collectionUpdate: CollectionUpdatePayload;
  /** Update collection rules for automatic product inclusion */
  collectionUpdateRules: CollectionUpdateRulesPayload;
  /** Create a new facet */
  facetCreate: FacetCreatePayload;
  /** Delete a facet */
  facetDelete: FacetDeletePayload;
  /** Create a new facet group */
  facetGroupCreate: FacetGroupCreatePayload;
  /** Delete a facet group */
  facetGroupDelete: FacetGroupDeletePayload;
  /** Update an existing facet group */
  facetGroupUpdate: FacetGroupUpdatePayload;
  /** Create a new facet swatch */
  facetSwatchCreate: FacetSwatchCreatePayload;
  /** Delete a facet swatch */
  facetSwatchDelete: FacetSwatchDeletePayload;
  /** Update an existing facet swatch */
  facetSwatchUpdate: FacetSwatchUpdatePayload;
  /** Update an existing facet */
  facetUpdate: FacetUpdatePayload;
  /** Create a new facet value */
  facetValueCreate: FacetValueCreatePayload;
  /** Delete a facet value */
  facetValueDelete: FacetValueDeletePayload;
  /** Update an existing facet value */
  facetValueUpdate: FacetValueUpdatePayload;
  /**
   * Start async bulk update.
   * Requires X-Idempotency-Key header.
   */
  productBulkUpdate: ProductBulkUpdatePayload;
  /** Create a new product */
  productCreate: ProductCreatePayload;
  /** Delete an existing product */
  productDelete: ProductDeletePayload;
  /** Create a new product feature */
  productFeatureCreate: ProductFeatureCreatePayload;
  /** Delete a product feature */
  productFeatureDelete: ProductFeatureDeletePayload;
  /** Update an existing product feature */
  productFeatureUpdate: ProductFeatureUpdatePayload;
  /** Sync all product features (complete replace operation) */
  productFeaturesSync: ProductFeaturesSyncPayload;
  /** Create a new product option (e.g., Size, Color) */
  productOptionCreate: ProductOptionCreatePayload;
  /** Delete a product option */
  productOptionDelete: ProductOptionDeletePayload;
  /** Update an existing product option */
  productOptionUpdate: ProductOptionUpdatePayload;
  /**
   * Sync all product options. This is a complete replace operation.
   * Options not in the input list will be deleted.
   * Does NOT affect variants - only option definitions are synced.
   */
  productOptionsSync: ProductOptionsSyncPayload;
  /**
   * Unified product update with optimistic locking.
   * Supports product and variant updates in a single request.
   */
  productUpdate: ProductUpdatePayload;
  /** Update product status (active, draft, archived) */
  productUpdateStatus: ProductUpdateStatusPayload;
  /** Create a new tag */
  tagCreate: TagCreatePayload;
  /** Delete a tag */
  tagDelete: TagDeletePayload;
  /** Update an existing tag */
  tagUpdate: TagUpdatePayload;
  /** Create a new variant for a product */
  variantCreate: VariantCreatePayload;
  /** Delete a variant */
  variantDelete: VariantDeletePayload;
  /** Update media attachments for a variant */
  variantUpdateMedia: VariantUpdateMediaPayload;
  /** Update variant option values */
  variantUpdateOptions: VariantUpdateOptionsPayload;
  /** Update variant pricing information */
  variantUpdatePricing: VariantUpdatePricingPayload;
  /** Create a new vendor */
  vendorCreate: VendorCreatePayload;
};


export type CatalogMutationBundleConfigurationCreateArgs = {
  input: BundleConfigurationCreateInput;
};


export type CatalogMutationBundleConfigurationDeleteArgs = {
  input: BundleConfigurationDeleteInput;
};


export type CatalogMutationBundleConfigurationUpdateArgs = {
  input: BundleConfigurationUpdateInput;
};


export type CatalogMutationBundleCreateArgs = {
  input: BundleCreateInput;
};


export type CatalogMutationBundleDependencyRulesSyncArgs = {
  input: BundleDependencyRulesSyncInput;
};


export type CatalogMutationBundleGroupsSyncArgs = {
  input: BundleGroupsSyncInput;
};


export type CatalogMutationBundlePricingTemplatesSyncArgs = {
  input: BundlePricingTemplatesSyncInput;
};


export type CatalogMutationBundleUpdateArgs = {
  bundleId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  operations?: InputMaybe<BundleUpdateInput>;
};


export type CatalogMutationCategoryCreateArgs = {
  input: CategoryCreateInput;
};


export type CatalogMutationCategoryDeleteArgs = {
  input: CategoryDeleteInput;
};


export type CatalogMutationCategoryMoveArgs = {
  input: CategoryMoveInput;
};


export type CatalogMutationCategoryRebalanceArgs = {
  input: CategoryRebalanceInput;
};


export type CatalogMutationCategoryUpdateArgs = {
  categoryId: Scalars['ID']['input'];
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  operations?: InputMaybe<CategoryUpdateInput>;
};


export type CatalogMutationCollectionAddProductsArgs = {
  input: CollectionAddProductsInput;
};


export type CatalogMutationCollectionCreateArgs = {
  input: CollectionCreateInput;
};


export type CatalogMutationCollectionDeleteArgs = {
  input: CollectionDeleteInput;
};


export type CatalogMutationCollectionMoveProductArgs = {
  input: CollectionMoveProductInput;
};


export type CatalogMutationCollectionRemoveProductsArgs = {
  input: CollectionRemoveProductsInput;
};


export type CatalogMutationCollectionUpdateArgs = {
  input: CollectionUpdateInput;
};


export type CatalogMutationCollectionUpdateRulesArgs = {
  input: CollectionUpdateRulesInput;
};


export type CatalogMutationFacetCreateArgs = {
  input: FacetCreateInput;
};


export type CatalogMutationFacetDeleteArgs = {
  input: FacetDeleteInput;
};


export type CatalogMutationFacetGroupCreateArgs = {
  input: FacetGroupCreateInput;
};


export type CatalogMutationFacetGroupDeleteArgs = {
  input: FacetGroupDeleteInput;
};


export type CatalogMutationFacetGroupUpdateArgs = {
  input: FacetGroupUpdateInput;
};


export type CatalogMutationFacetSwatchCreateArgs = {
  input: FacetSwatchCreateInput;
};


export type CatalogMutationFacetSwatchDeleteArgs = {
  input: FacetSwatchDeleteInput;
};


export type CatalogMutationFacetSwatchUpdateArgs = {
  input: FacetSwatchUpdateInput;
};


export type CatalogMutationFacetUpdateArgs = {
  input: FacetUpdateInput;
};


export type CatalogMutationFacetValueCreateArgs = {
  input: FacetValueCreateInput;
};


export type CatalogMutationFacetValueDeleteArgs = {
  input: FacetValueDeleteInput;
};


export type CatalogMutationFacetValueUpdateArgs = {
  input: FacetValueUpdateInput;
};


export type CatalogMutationProductBulkUpdateArgs = {
  input: ProductBulkUpdateInput;
};


export type CatalogMutationProductCreateArgs = {
  input: ProductCreateInput;
};


export type CatalogMutationProductDeleteArgs = {
  input: ProductDeleteInput;
};


export type CatalogMutationProductFeatureCreateArgs = {
  input: ProductFeatureCreateInput;
};


export type CatalogMutationProductFeatureDeleteArgs = {
  input: ProductFeatureDeleteInput;
};


export type CatalogMutationProductFeatureUpdateArgs = {
  input: ProductFeatureUpdateInput;
};


export type CatalogMutationProductFeaturesSyncArgs = {
  input: ProductFeaturesSyncInput;
};


export type CatalogMutationProductOptionCreateArgs = {
  input: ProductOptionCreateInput;
};


export type CatalogMutationProductOptionDeleteArgs = {
  input: ProductOptionDeleteInput;
};


export type CatalogMutationProductOptionUpdateArgs = {
  input: ProductOptionUpdateInput;
};


export type CatalogMutationProductOptionsSyncArgs = {
  input: ProductOptionsSyncInput;
};


export type CatalogMutationProductUpdateArgs = {
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  operations?: InputMaybe<ProductUpdateInput>;
  productId: Scalars['ID']['input'];
};


export type CatalogMutationProductUpdateStatusArgs = {
  input: ProductUpdateStatusInput;
};


export type CatalogMutationTagCreateArgs = {
  input: TagCreateInput;
};


export type CatalogMutationTagDeleteArgs = {
  input: TagDeleteInput;
};


export type CatalogMutationTagUpdateArgs = {
  input: TagUpdateInput;
};


export type CatalogMutationVariantCreateArgs = {
  input: VariantCreateInput;
};


export type CatalogMutationVariantDeleteArgs = {
  input: VariantDeleteInput;
};


export type CatalogMutationVariantUpdateMediaArgs = {
  input: VariantUpdateMediaInput;
};


export type CatalogMutationVariantUpdateOptionsArgs = {
  input: VariantUpdateOptionsInput;
};


export type CatalogMutationVariantUpdatePricingArgs = {
  input: VariantUpdatePricingInput;
};


export type CatalogMutationVendorCreateArgs = {
  input: VendorCreateInput;
};

export type CatalogQuery = {
  __typename?: 'CatalogQuery';
  /** Get a bundle by Product global ID. The product must have kind = BUNDLE. */
  bundle: Maybe<Bundle>;
  /** Get bundles with Relay-style pagination. */
  bundles: BundleConnection;
  /** Get categories with Relay-style pagination */
  categories: CategoryConnection;
  /** Get a category by ID */
  category: Maybe<Category>;
  /** Get a collection by ID */
  collection: Maybe<Collection>;
  /** Get a collection by its handle */
  collectionByHandle: Maybe<Collection>;
  /** Preview count of products matching collection rules */
  collectionRulesPreviewCount: Scalars['Int']['output'];
  /** Get collections with Relay-style pagination */
  collections: CollectionConnection;
  /** Get a facet by ID */
  facet: Maybe<Facet>;
  /** Get a facet group by ID */
  facetGroup: Maybe<FacetGroup>;
  /** Get all facet groups */
  facetGroups: Array<FacetGroup>;
  /** Get a facet swatch by ID */
  facetSwatch: Maybe<FacetSwatch>;
  /** Get all facet swatches */
  facetSwatches: Array<FacetSwatch>;
  /** Get a facet value by ID */
  facetValue: Maybe<FacetValue>;
  /** Get all facet values for a specific facet */
  facetValues: Array<FacetValue>;
  /** Get all facets */
  facets: Array<Facet>;
  /** Get a node by its global ID */
  node: Maybe<Node>;
  /** Get multiple nodes by their global IDs */
  nodes: Array<Maybe<Node>>;
  /** Get a product by ID */
  product: Maybe<Product>;
  /** Get bulk update job by ID. */
  productBulkUpdateJob: Maybe<ProductBulkUpdateJob>;
  /**
   * Get product bulk update jobs for the current store.
   * Defaults to active jobs when statusFilter is omitted.
   */
  productBulkUpdateJobs: ProductBulkUpdateJobConnection;
  /** Get products with Relay-style pagination */
  products: ProductConnection;
  /** Get a tag by ID */
  tag: Maybe<Tag>;
  /** Get tags with Relay-style pagination */
  tags: TagConnection;
  /** Get a variant by ID */
  variant: Maybe<Variant>;
  /** Get variants with Relay-style pagination */
  variants: VariantConnection;
  /** Get a vendor by ID */
  vendor: Maybe<Vendor>;
  /** Get vendors with Relay-style pagination */
  vendors: VendorConnection;
};


export type CatalogQueryBundleArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryBundlesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<BundleBundlesMetaInput>;
  orderBy?: InputMaybe<Array<BundleOrderByInput>>;
  where?: InputMaybe<BundleWhereInput>;
};


export type CatalogQueryCategoriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<CategoryCategoriesMetaInput>;
  orderBy?: InputMaybe<Array<CategoryOrderByInput>>;
  where?: InputMaybe<CategoryWhereInput>;
};


export type CatalogQueryCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryCollectionArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryCollectionByHandleArgs = {
  handle: Scalars['String']['input'];
};


export type CatalogQueryCollectionRulesPreviewCountArgs = {
  rules: Array<CollectionRuleInput>;
};


export type CatalogQueryCollectionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type CatalogQueryFacetArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryFacetGroupArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryFacetSwatchArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryFacetValueArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryFacetValuesArgs = {
  facetId: Scalars['ID']['input'];
};


export type CatalogQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type CatalogQueryProductArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryProductBulkUpdateJobArgs = {
  jobId: Scalars['ID']['input'];
};


export type CatalogQueryProductBulkUpdateJobsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  statusFilter?: InputMaybe<Array<BulkUpdateJobStatus>>;
};


export type CatalogQueryProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<ProductProductsMetaInput>;
  orderBy?: InputMaybe<Array<ProductOrderByInput>>;
  where?: InputMaybe<ProductWhereInput>;
};


export type CatalogQueryTagArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryTagsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<TagOrderByInput>>;
  where?: InputMaybe<TagWhereInput>;
};


export type CatalogQueryVariantArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<VariantOrderByInput>>;
  where?: InputMaybe<VariantWhereInput>;
};


export type CatalogQueryVendorArgs = {
  id: Scalars['ID']['input'];
};


export type CatalogQueryVendorsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<VendorOrderByInput>>;
  where?: InputMaybe<VendorWhereInput>;
};

/** A category represents a hierarchical grouping of products. */
export type Category = Node & {
  __typename?: 'Category';
  /** All ancestor categories from root to parent. */
  ancestors: Array<Category>;
  /** Direct child categories. */
  children: Array<Category>;
  /** The date and time when the category was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Default product sort for this category PLP. */
  defaultSort: ProductSortBy;
  /** Default sort direction for this category PLP. */
  defaultSortDirection: SortDirection;
  /** The date and time when the category was deleted (soft delete). */
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  /** The depth of this category in the hierarchy (0 for root). */
  depth: Scalars['Int']['output'];
  /** The category description. */
  description: Maybe<RichText>;
  /** Short category excerpt. */
  excerpt: Maybe<RichText>;
  /** The URL-friendly handle for the category. */
  handle: Scalars['String']['output'];
  /** The globally unique ID of the category. */
  id: Scalars['ID']['output'];
  /** Whether the category is currently published. */
  isPublished: Scalars['Boolean']['output'];
  /** Catalog listing items assigned to this category, including products and bundles. */
  listing: ListingConnection;
  /** Media files associated with this category. */
  media: Array<CategoryMediaItem>;
  /** The display name of the category. */
  name: Scalars['String']['output'];
  /** The parent category, if any. */
  parent: Maybe<Category>;
  /** The materialized path for this category. */
  path: Scalars['String']['output'];
  /** The total number of products in this category. */
  productsCount: Scalars['Int']['output'];
  /** The date and time when the category was published, or null if unpublished. */
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  /** Optimistic locking revision number. Incremented on each update. */
  revision: Scalars['Int']['output'];
  /** SEO metadata. */
  seo: Maybe<Seo>;
  /** The date and time when the category was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};


/** A category represents a hierarchical grouping of products. */
export type CategoryListingArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ListingOrderByInput>>;
  where?: InputMaybe<ListingWhereInput>;
};

export type CategoryCategoriesMetaInput = {
  hierarchyScope?: InputMaybe<CategoryHierarchyScopeInput>;
  productsScope?: InputMaybe<CategoryProductsScopeInput>;
};

/** A connection to a list of Category items. */
export type CategoryConnection = {
  __typename?: 'CategoryConnection';
  /** A list of edges. */
  edges: Array<CategoryEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of categories. */
  totalCount: Scalars['Int']['output'];
};

export type CategoryContentInput = {
  /** The category description. */
  description?: InputMaybe<RichTextInput>;
  /** The short category excerpt. */
  excerpt?: InputMaybe<RichTextInput>;
};

/** Input for creating a category. */
export type CategoryCreateInput = {
  /** Optional description. */
  description?: InputMaybe<RichTextInput>;
  /** Optional short excerpt. */
  excerpt?: InputMaybe<RichTextInput>;
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
  seo?: InputMaybe<SeoInput>;
};

/** Payload for category creation. */
export type CategoryCreatePayload = {
  __typename?: 'CategoryCreatePayload';
  /** The created category. */
  category: Maybe<Category>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for deleting a category. */
export type CategoryDeleteInput = {
  /** The ID of the category to delete. */
  id: Scalars['ID']['input'];
  /** Whether to permanently delete (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for category deletion. */
export type CategoryDeletePayload = {
  __typename?: 'CategoryDeletePayload';
  /** The ID of the deleted category. */
  deletedCategoryId: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** An edge in a Category connection. */
export type CategoryEdge = {
  __typename?: 'CategoryEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Category;
};

export type CategoryHierarchyInput = {
  /** The new parent category ID, or null for root. */
  parentId?: InputMaybe<Scalars['ID']['input']>;
};

export enum CategoryHierarchyScopeDirection {
  Ancestors = 'ANCESTORS',
  Descendants = 'DESCENDANTS'
}

export type CategoryHierarchyScopeInput = {
  direction: CategoryHierarchyScopeDirection;
  includeReference?: InputMaybe<Scalars['Boolean']['input']>;
  mode: CategoryHierarchyScopeMode;
  referenceId: Scalars['ID']['input'];
};

export enum CategoryHierarchyScopeMode {
  Exclude = 'EXCLUDE',
  Include = 'INCLUDE'
}

export type CategoryMediaInput = {
  /** File IDs for category media. */
  fileIds: Array<Scalars['ID']['input']>;
};

/** A media item for a category. */
export type CategoryMediaItem = {
  __typename?: 'CategoryMediaItem';
  /** The file reference. */
  file: File;
  /** The sort index for ordering. */
  sortIndex: Scalars['Int']['output'];
};

/** Input for moving a category in the hierarchy. */
export type CategoryMoveInput = {
  /** The ID of the category to move. */
  id: Scalars['ID']['input'];
  /** The new parent category ID, or null for root. */
  newParentId?: InputMaybe<Scalars['ID']['input']>;
};

/** Payload for category move. */
export type CategoryMovePayload = {
  __typename?: 'CategoryMovePayload';
  /** The moved category. */
  category: Maybe<Category>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Ordering configuration for Category */
export type CategoryOrderByInput = {
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

export type CategoryProductsScopeInput = {
  mode: CategoryHierarchyScopeMode;
  referenceIds: Array<Scalars['ID']['input']>;
};

export type CategoryRebalanceInput = {
  categoryId: Scalars['ID']['input'];
};

export type CategoryRebalancePayload = {
  __typename?: 'CategoryRebalancePayload';
  category: Maybe<Category>;
  userErrors: Array<GenericUserError>;
};

export type CategorySortInput = {
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
export type CategoryUpdateInput = {
  /** Translated content. */
  content?: InputMaybe<CategoryContentInput>;
  /** The URL-friendly handle for the category. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** Hierarchy move. */
  hierarchy?: InputMaybe<CategoryHierarchyInput>;
  /** Category media replacement. */
  media?: InputMaybe<CategoryMediaInput>;
  /** The display name of the category. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** SEO metadata. */
  seo?: InputMaybe<SeoInput>;
  /** PLP sort preferences. */
  sort?: InputMaybe<CategorySortInput>;
  /** Category status. */
  status?: InputMaybe<CategoryStatus>;
};

/** Payload for category update. */
export type CategoryUpdatePayload = {
  __typename?: 'CategoryUpdatePayload';
  /** The updated category. */
  category: Maybe<Category>;
  /** Results of requested category update operations. */
  operationResults: Array<OperationResult>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for Category */
export type CategoryWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<CategoryWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<CategoryWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<CategoryWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by defaultSort */
  defaultSort?: InputMaybe<StringFilter>;
  /** Filter by defaultSortDirection */
  defaultSortDirection?: InputMaybe<StringFilter>;
  /** Filter by depth */
  depth?: InputMaybe<IntFilter>;
  /** Filter by handle */
  handle?: InputMaybe<StringFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<StringFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
  /** Filter by parentId */
  parentId?: InputMaybe<IdFilter>;
  /** Filter by path */
  path?: InputMaybe<StringFilter>;
  /** Filter by productsCount */
  productsCount?: InputMaybe<IntFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

export type Collection = Node & {
  __typename?: 'Collection';
  activeFrom: Maybe<Scalars['DateTime']['output']>;
  activeTo: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  defaultSort: ProductSortBy;
  defaultSortDirection: SortDirection;
  description: Maybe<RichText>;
  excerpt: Maybe<RichText>;
  handle: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isPublished: Scalars['Boolean']['output'];
  media: Array<CollectionMediaItem>;
  name: Scalars['String']['output'];
  products: CollectionProductConnection;
  productsCount: Scalars['Int']['output'];
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  rules: Array<CollectionRule>;
  seo: Maybe<Seo>;
  type: CollectionType;
  updatedAt: Scalars['DateTime']['output'];
};


export type CollectionProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ProductSortInput>;
};

export type CollectionAddProductsInput = {
  collectionId: Scalars['ID']['input'];
  productIds: Array<Scalars['ID']['input']>;
};

export type CollectionAddProductsPayload = {
  __typename?: 'CollectionAddProductsPayload';
  collection: Maybe<Collection>;
  userErrors: Array<GenericUserError>;
};

export type CollectionConnection = {
  __typename?: 'CollectionConnection';
  edges: Array<CollectionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CollectionCreateInput = {
  activeFrom?: InputMaybe<Scalars['DateTime']['input']>;
  activeTo?: InputMaybe<Scalars['DateTime']['input']>;
  defaultSort?: InputMaybe<ProductSortBy>;
  defaultSortDirection?: InputMaybe<SortDirection>;
  description?: InputMaybe<RichTextInput>;
  excerpt?: InputMaybe<RichTextInput>;
  handle?: InputMaybe<Scalars['String']['input']>;
  media?: InputMaybe<Array<CollectionMediaInput>>;
  name: Scalars['String']['input'];
  publish?: InputMaybe<Scalars['Boolean']['input']>;
  seo?: InputMaybe<SeoInput>;
  type: CollectionType;
};

export type CollectionCreatePayload = {
  __typename?: 'CollectionCreatePayload';
  collection: Maybe<Collection>;
  userErrors: Array<GenericUserError>;
};

export type CollectionDeleteInput = {
  id: Scalars['ID']['input'];
};

export type CollectionDeletePayload = {
  __typename?: 'CollectionDeletePayload';
  deletedCollectionId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CollectionEdge = {
  __typename?: 'CollectionEdge';
  cursor: Scalars['String']['output'];
  node: Collection;
};

export type CollectionMediaInput = {
  fileId: Scalars['ID']['input'];
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type CollectionMediaItem = {
  __typename?: 'CollectionMediaItem';
  file: File;
  sortIndex: Scalars['Int']['output'];
};

export type CollectionMoveProductInput = {
  afterProductId?: InputMaybe<Scalars['ID']['input']>;
  beforeProductId?: InputMaybe<Scalars['ID']['input']>;
  collectionId: Scalars['ID']['input'];
  productId: Scalars['ID']['input'];
};

export type CollectionMoveProductPayload = {
  __typename?: 'CollectionMoveProductPayload';
  collection: Maybe<Collection>;
  userErrors: Array<GenericUserError>;
};

export type CollectionProductConnection = {
  __typename?: 'CollectionProductConnection';
  edges: Array<CollectionProductEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CollectionProductEdge = {
  __typename?: 'CollectionProductEdge';
  cursor: Scalars['String']['output'];
  node: Product;
};

export type CollectionRemoveProductsInput = {
  collectionId: Scalars['ID']['input'];
  productIds: Array<Scalars['ID']['input']>;
};

export type CollectionRemoveProductsPayload = {
  __typename?: 'CollectionRemoveProductsPayload';
  collection: Maybe<Collection>;
  userErrors: Array<GenericUserError>;
};

export type CollectionRule = {
  __typename?: 'CollectionRule';
  field: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  operator: Scalars['String']['output'];
  sortIndex: Scalars['Int']['output'];
  value: Scalars['JSON']['output'];
};

export type CollectionRuleInput = {
  field: Scalars['String']['input'];
  operator: Scalars['String']['input'];
  value: Scalars['JSON']['input'];
};

export enum CollectionType {
  Manual = 'MANUAL',
  Rule = 'RULE'
}

export type CollectionUpdateInput = {
  activeFrom?: InputMaybe<Scalars['DateTime']['input']>;
  activeTo?: InputMaybe<Scalars['DateTime']['input']>;
  defaultSort?: InputMaybe<ProductSortBy>;
  defaultSortDirection?: InputMaybe<SortDirection>;
  description?: InputMaybe<RichTextInput>;
  excerpt?: InputMaybe<RichTextInput>;
  handle?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  media?: InputMaybe<Array<CollectionMediaInput>>;
  name?: InputMaybe<Scalars['String']['input']>;
  publish?: InputMaybe<Scalars['Boolean']['input']>;
  seo?: InputMaybe<SeoInput>;
};

export type CollectionUpdatePayload = {
  __typename?: 'CollectionUpdatePayload';
  collection: Maybe<Collection>;
  userErrors: Array<GenericUserError>;
};

export type CollectionUpdateRulesInput = {
  collectionId: Scalars['ID']['input'];
  rules: Array<CollectionRuleInput>;
};

export type CollectionUpdateRulesPayload = {
  __typename?: 'CollectionUpdateRulesPayload';
  collection: Maybe<Collection>;
  userErrors: Array<GenericUserError>;
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

/** Filter operators for DateTime fields */
export type DateTimeFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['DateTime']['input']>;
  /** Greater than (after) */
  _gt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Greater than or equal (on or after) */
  _gte?: InputMaybe<Scalars['DateTime']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['DateTime']['input']>>;
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
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['DateTime']['input']>>;
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
export type DimensionsInput = {
  /** Height in millimeters. */
  height: Scalars['Int']['input'];
  /** Length in millimeters. */
  length: Scalars['Int']['input'];
  /** Width in millimeters. */
  width: Scalars['Int']['input'];
};

export type Facet = Node & {
  __typename?: 'Facet';
  facetType: FacetType;
  group: Maybe<FacetGroup>;
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  selectionMode: FacetSelectionMode;
  slug: Scalars['String']['output'];
  sortIndex: Scalars['Int']['output'];
  sourceHandles: Array<Scalars['String']['output']>;
  uiType: FacetUiType;
  values: Array<FacetValue>;
};

export type FacetCreateInput = {
  facetType: FacetType;
  groupId?: InputMaybe<Scalars['ID']['input']>;
  label: Scalars['String']['input'];
  selectionMode?: InputMaybe<FacetSelectionMode>;
  slug: Scalars['String']['input'];
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  uiType?: InputMaybe<FacetUiType>;
};

export type FacetCreatePayload = {
  __typename?: 'FacetCreatePayload';
  facet: Maybe<Facet>;
  userErrors: Array<GenericUserError>;
};

export type FacetDeleteInput = {
  id: Scalars['ID']['input'];
};

export type FacetDeletePayload = {
  __typename?: 'FacetDeletePayload';
  deletedFacetId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type FacetGroup = Node & {
  __typename?: 'FacetGroup';
  createdAt: Scalars['DateTime']['output'];
  facets: Array<Facet>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  sortIndex: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type FacetGroupCreateInput = {
  name: Scalars['String']['input'];
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type FacetGroupCreatePayload = {
  __typename?: 'FacetGroupCreatePayload';
  facetGroup: Maybe<FacetGroup>;
  userErrors: Array<GenericUserError>;
};

export type FacetGroupDeleteInput = {
  id: Scalars['ID']['input'];
};

export type FacetGroupDeletePayload = {
  __typename?: 'FacetGroupDeletePayload';
  deletedFacetGroupId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type FacetGroupUpdateInput = {
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

export type FacetGroupUpdatePayload = {
  __typename?: 'FacetGroupUpdatePayload';
  facetGroup: Maybe<FacetGroup>;
  userErrors: Array<GenericUserError>;
};

export enum FacetSelectionMode {
  Multi = 'MULTI',
  Single = 'SINGLE'
}

export type FacetSwatch = Node & {
  __typename?: 'FacetSwatch';
  colorOne: Maybe<Scalars['String']['output']>;
  colorTwo: Maybe<Scalars['String']['output']>;
  file: Maybe<File>;
  id: Scalars['ID']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  swatchType: SwatchType;
};

export type FacetSwatchCreateInput = {
  colorOne?: InputMaybe<Scalars['String']['input']>;
  colorTwo?: InputMaybe<Scalars['String']['input']>;
  fileId?: InputMaybe<Scalars['ID']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  swatchType: SwatchType;
};

export type FacetSwatchCreatePayload = {
  __typename?: 'FacetSwatchCreatePayload';
  facetSwatch: Maybe<FacetSwatch>;
  userErrors: Array<GenericUserError>;
};

export type FacetSwatchDeleteInput = {
  id: Scalars['ID']['input'];
};

export type FacetSwatchDeletePayload = {
  __typename?: 'FacetSwatchDeletePayload';
  deletedFacetSwatchId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type FacetSwatchUpdateInput = {
  colorOne?: InputMaybe<Scalars['String']['input']>;
  colorTwo?: InputMaybe<Scalars['String']['input']>;
  fileId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  swatchType?: InputMaybe<SwatchType>;
};

export type FacetSwatchUpdatePayload = {
  __typename?: 'FacetSwatchUpdatePayload';
  facetSwatch: Maybe<FacetSwatch>;
  userErrors: Array<GenericUserError>;
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

export type FacetUpdateInput = {
  groupId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  selectionMode?: InputMaybe<FacetSelectionMode>;
  slug?: InputMaybe<Scalars['String']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  uiType?: InputMaybe<FacetUiType>;
};

export type FacetUpdatePayload = {
  __typename?: 'FacetUpdatePayload';
  facet: Maybe<Facet>;
  userErrors: Array<GenericUserError>;
};

export type FacetValue = Node & {
  __typename?: 'FacetValue';
  enabled: Scalars['Boolean']['output'];
  facet: Facet;
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  sortIndex: Scalars['Int']['output'];
  sourceHandles: Array<Scalars['String']['output']>;
  swatch: Maybe<FacetSwatch>;
};

export type FacetValueCreateInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  facetId: Scalars['ID']['input'];
  label: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  sourceHandles?: InputMaybe<Array<Scalars['String']['input']>>;
  swatchId?: InputMaybe<Scalars['ID']['input']>;
};

export type FacetValueCreatePayload = {
  __typename?: 'FacetValueCreatePayload';
  facetValue: Maybe<FacetValue>;
  userErrors: Array<GenericUserError>;
};

export type FacetValueDeleteInput = {
  id: Scalars['ID']['input'];
};

export type FacetValueDeletePayload = {
  __typename?: 'FacetValueDeletePayload';
  deletedFacetValueId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type FacetValueUpdateInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  sourceHandles?: InputMaybe<Array<Scalars['String']['input']>>;
  swatchId?: InputMaybe<Scalars['ID']['input']>;
};

export type FacetValueUpdatePayload = {
  __typename?: 'FacetValueUpdatePayload';
  facetValue: Maybe<FacetValue>;
  userErrors: Array<GenericUserError>;
};

export type File = {
  __typename?: 'File';
  id: Scalars['ID']['output'];
};

/** Filter operators for Float fields */
export type FloatFilter = {
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
export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  code: Maybe<Scalars['String']['output']>;
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

/** Filter operators for ID fields */
export type IdFilter = {
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

/** Filter operators for Int fields */
export type IntFilter = {
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

export type InventoryAlertThreshold = {
  __typename?: 'InventoryAlertThreshold';
  method: ThresholdMethod;
  minimumStock: Scalars['Int']['output'];
};

export type InventoryBackorder = {
  __typename?: 'InventoryBackorder';
  etaAvgDays: Maybe<Scalars['Float']['output']>;
  quantity: Scalars['Int']['output'];
};

/**
 * InventoryItem represents the inventory-specific data for a variant.
 * Each catalog variant can have a corresponding InventoryItem.
 */
export type InventoryItem = Node & {
  __typename?: 'InventoryItem';
  /** Whether to continue selling when out of stock */
  continueSellingWhenOutOfStock: Scalars['Boolean']['output'];
  /** When this item was created */
  createdAt: Scalars['DateTime']['output'];
  /** Global ID (Relay) */
  id: Scalars['ID']['output'];
  /** SKU code */
  sku: Maybe<Scalars['String']['output']>;
  /** Stock levels across warehouses */
  stock: Array<WarehouseStock>;
  /** Total quantity available across all warehouses */
  totalAvailable: Scalars['Int']['output'];
  /** Whether to track inventory for this item */
  trackInventory: Scalars['Boolean']['output'];
  /** Current unit cost */
  unitCost: Maybe<InventoryItemCost>;
  /** When this item was last updated */
  updatedAt: Scalars['DateTime']['output'];
  /** Catalog variant entity */
  variant: Variant;
  /** Reference to Catalog.Variant */
  variantId: Scalars['ID']['output'];
};

export type InventoryItemConnection = {
  __typename?: 'InventoryItemConnection';
  edges: Array<InventoryItemEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type InventoryItemCost = {
  __typename?: 'InventoryItemCost';
  /** Cost in minor units (cents) */
  amountMinor: Scalars['BigInt']['output'];
  /** Currency code */
  currency: Scalars['String']['output'];
  /** Effective from date */
  effectiveFrom: Scalars['DateTime']['output'];
};

export type InventoryItemCostInput = {
  amountMinor: Scalars['BigInt']['input'];
  currency: Scalars['String']['input'];
};

export type InventoryItemEdge = {
  __typename?: 'InventoryItemEdge';
  cursor: Scalars['String']['output'];
  node: InventoryItem;
};

/** Inventory tracking settings for product creation. */
export type InventoryItemInput = {
  /** Allow sales when stock is zero. */
  continueSellingWhenOutOfStock?: InputMaybe<Scalars['Boolean']['input']>;
  /** Stock Keeping Unit. */
  sku?: InputMaybe<Scalars['String']['input']>;
  /** Whether to track inventory for this product. */
  tracked: Scalars['Boolean']['input'];
};

export type InventoryItemInventoryItemsMetaInput = {
  warehouseScope?: InputMaybe<InventoryItemWarehouseScopeInput>;
};

export type InventoryItemOrderByInput = {
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

export type InventoryItemStockInput = {
  onHand: Scalars['Int']['input'];
  unavailable?: InputMaybe<Scalars['Int']['input']>;
  warehouseId: Scalars['ID']['input'];
};

export type InventoryItemUpdateInput = {
  /** Whether to continue selling when out of stock */
  continueSellingWhenOutOfStock?: InputMaybe<Scalars['Boolean']['input']>;
  /** The inventory item ID to update */
  id: Scalars['ID']['input'];
  /** New SKU value */
  sku?: InputMaybe<Scalars['String']['input']>;
  /** Stock update for a specific warehouse */
  stock?: InputMaybe<InventoryItemStockInput>;
  /** Whether to track inventory */
  trackInventory?: InputMaybe<Scalars['Boolean']['input']>;
  /** Unit cost update */
  unitCost?: InputMaybe<InventoryItemCostInput>;
};

export type InventoryItemUpdatePayload = {
  __typename?: 'InventoryItemUpdatePayload';
  /** Updated inventory item */
  inventoryItem: Maybe<InventoryItem>;
  /** List of errors */
  userErrors: Array<GenericUserError>;
};

export type InventoryItemWarehouseScopeInput = {
  mode: InventoryItemWarehouseScopeMode;
  referenceIds: Array<Scalars['ID']['input']>;
};

export enum InventoryItemWarehouseScopeMode {
  Exclude = 'EXCLUDE',
  Include = 'INCLUDE'
}

export type InventoryItemWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<InventoryItemWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<InventoryItemWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<InventoryItemWhereInput>>;
  /** Filter by available for sale quantity in the selected warehouse scope */
  availableForSale?: InputMaybe<IntFilter>;
  /** Filter by inventory item ID */
  id?: InputMaybe<IdFilter>;
  /** Filter by product ID */
  productId?: InputMaybe<IdFilter>;
  /** Filter by product name in the current locale */
  productName?: InputMaybe<StringFilter>;
  /** Filter by quantity on hand in the selected warehouse scope */
  quantityOnHand?: InputMaybe<IntFilter>;
  /** Filter by reserved quantity in the selected warehouse scope */
  reservedQuantity?: InputMaybe<IntFilter>;
  /** Filter by SKU */
  sku?: InputMaybe<StringFilter>;
  /** Filter by trackInventory */
  trackInventory?: InputMaybe<BooleanFilter>;
  /** Filter by unavailable quantity in the selected warehouse scope */
  unavailableQuantity?: InputMaybe<IntFilter>;
  /** Filter by variant ID */
  variantId?: InputMaybe<IdFilter>;
};

export type InventoryMutation = {
  __typename?: 'InventoryMutation';
  /** Update inventory item: stock, SKU, and cost. */
  inventoryItemUpdate: InventoryItemUpdatePayload;
  warehouseCreate: WarehouseCreatePayload;
  warehouseDelete: WarehouseDeletePayload;
  warehouseStockCreate: WarehouseStockCreatePayload;
  warehouseStockDelete: WarehouseStockDeletePayload;
  warehouseUpdate: WarehouseUpdatePayload;
};


export type InventoryMutationInventoryItemUpdateArgs = {
  input: InventoryItemUpdateInput;
};


export type InventoryMutationWarehouseCreateArgs = {
  input: WarehouseCreateInput;
};


export type InventoryMutationWarehouseDeleteArgs = {
  input: WarehouseDeleteInput;
};


export type InventoryMutationWarehouseStockCreateArgs = {
  input: WarehouseStockCreateInput;
};


export type InventoryMutationWarehouseStockDeleteArgs = {
  input: WarehouseStockDeleteInput;
};


export type InventoryMutationWarehouseUpdateArgs = {
  input: WarehouseUpdateInput;
};

export type InventoryQuantities = {
  __typename?: 'InventoryQuantities';
  availableForSale: Scalars['Int']['output'];
  onHand: Scalars['Int']['output'];
  reserved: Scalars['Int']['output'];
  unavailable: Scalars['Int']['output'];
};

export type InventoryQuery = {
  __typename?: 'InventoryQuery';
  /** Get an inventory item by ID */
  inventoryItem: Maybe<InventoryItem>;
  /** Get an inventory item by variant ID */
  inventoryItemByVariant: Maybe<InventoryItem>;
  /** Get inventory items with Relay-style pagination */
  inventoryItems: InventoryItemConnection;
  /** Get a node by its global ID */
  node: Maybe<Node>;
  /** Get multiple nodes by their global IDs */
  nodes: Array<Maybe<Node>>;
  /** Get a warehouse by ID */
  warehouse: Maybe<Warehouse>;
  /** Get variants that can still be assigned to the selected warehouse */
  warehouseAssignableVariants: VariantConnection;
  /** Get all warehouses */
  warehouses: WarehouseConnection;
};


export type InventoryQueryInventoryItemArgs = {
  id: Scalars['ID']['input'];
};


export type InventoryQueryInventoryItemByVariantArgs = {
  variantId: Scalars['ID']['input'];
};


export type InventoryQueryInventoryItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  meta?: InputMaybe<InventoryItemInventoryItemsMetaInput>;
  orderBy?: InputMaybe<Array<InventoryItemOrderByInput>>;
  where?: InputMaybe<InventoryItemWhereInput>;
};


export type InventoryQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type InventoryQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type InventoryQueryWarehouseArgs = {
  id: Scalars['ID']['input'];
};


export type InventoryQueryWarehouseAssignableVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<WarehouseAssignableVariantOrderByInput>>;
  warehouseId: Scalars['ID']['input'];
  where?: InputMaybe<WarehouseAssignableVariantWhereInput>;
};


export type InventoryQueryWarehousesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<WarehouseOrderByInput>>;
  where?: InputMaybe<WarehouseWhereInput>;
};

export type InventorySkuStatus = {
  __typename?: 'InventorySkuStatus';
  backorder: SkuStatusMetric;
  lowStock: SkuStatusMetric;
  outOfStock: SkuStatusMetric;
  total: Scalars['Int']['output'];
};

export type Listing = {
  /** The URL-friendly handle. */
  handle: Scalars['String']['output'];
  /** The Product global ID of the catalog listing item. */
  id: Scalars['ID']['output'];
  /** Whether the listing item is currently published. */
  isPublished: Scalars['Boolean']['output'];
  /** Product discriminator. */
  kind: ProductKind;
  /** Media registered on this listing item. */
  media: Array<ProductMediaItem>;
  /** Current product price range in the selected currency. */
  priceRange: Maybe<ProductPriceRange>;
  /** Localized title. */
  title: Scalars['String']['output'];
};

/** A connection to a mixed list of catalog listing items. */
export type ListingConnection = {
  __typename?: 'ListingConnection';
  /** A list of edges. */
  edges: Array<ListingEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of catalog listing items. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a Listing connection. */
export type ListingEdge = {
  __typename?: 'ListingEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Listing;
};

/** Ordering configuration for Listing */
export type ListingOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ListingOrderField;
};

/** Fields available for sorting Listing */
export enum ListingOrderField {
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
  /** Sort by kind */
  Kind = 'kind',
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

/** Filter conditions for Listing */
export type ListingWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ListingWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ListingWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ListingWhereInput>>;
  /** Filter by brandName */
  brandName?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by currency */
  currency?: InputMaybe<StringFilter>;
  /** Filter by handle */
  handle?: InputMaybe<StringFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by kind */
  kind?: InputMaybe<StringFilter>;
  /** Filter by locale */
  locale?: InputMaybe<StringFilter>;
  /** Filter by maxAmountMinor */
  maxAmountMinor?: InputMaybe<IntFilter>;
  /** Filter by maxPriceMinor */
  maxPriceMinor?: InputMaybe<IntFilter>;
  /** Filter by minAmountMinor */
  minAmountMinor?: InputMaybe<IntFilter>;
  /** Filter by minPriceMinor */
  minPriceMinor?: InputMaybe<IntFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
  /** Filter by primaryCategoryId */
  primaryCategoryId?: InputMaybe<IdFilter>;
  /** Filter by primaryCategoryName */
  primaryCategoryName?: InputMaybe<StringFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by vendorId */
  vendorId?: InputMaybe<IdFilter>;
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

export type Mutation = {
  __typename?: 'Mutation';
  /** Catalog mutation namespace for product, variant, category, and collection operations */
  catalogMutation: CatalogMutation;
  /** Inventory mutation namespace for warehouse, stock, and inventory item operations */
  inventoryMutation: InventoryMutation;
};

/** The Node interface is implemented by all types that have a globally unique ID. */
export type Node = {
  /** The globally unique ID of the object. */
  id: Scalars['ID']['output'];
};

/** Result of a single operation in the unified update. */
export type OperationResult = {
  __typename?: 'OperationResult';
  /** Whether the operation was applied successfully. */
  applied: Scalars['Boolean']['output'];
  /** Per-request client correlation key for create operations. */
  clientMutationId: Maybe<Scalars['String']['output']>;
  /** Entity affected by this operation. */
  entityId: Maybe<Scalars['ID']['output']>;
  /** Errors that occurred during this operation. */
  errors: Array<GenericUserError>;
  /** The type of operation. */
  type: OperationType;
};

/** Type of operation in the unified update. */
export enum OperationType {
  CategoryUpdate = 'CATEGORY_UPDATE',
  ProductCategoryUpdate = 'PRODUCT_CATEGORY_UPDATE',
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

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor: Maybe<Scalars['String']['output']>;
};

/** Input for pricing widget query. */
export type PricingWidgetInput = {
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
export type PricingWidgetPayload = {
  __typename?: 'PricingWidgetPayload';
  /** Current active cost. */
  currentCostPrice: Maybe<VariantCost>;
  /** Current active price. */
  currentPrice: Maybe<VariantPrice>;
  /** Price history for the period. */
  history: VariantPriceConnection;
  /** Computed statistics for the period. */
  statistics: VariantPriceHistoryStatistics;
};

/** A product represents an item that can be sold. */
export type Product = Listing & Node & {
  __typename?: 'Product';
  /** Category assignments with relationship metadata. */
  categoryAssignments: Array<ProductCategoryAssignment>;
  /** The date and time when the product was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the product was deleted (soft delete). */
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  /** Product description. */
  description: Maybe<RichText>;
  /** Short excerpt. */
  excerpt: Maybe<RichText>;
  /** The features of this product. */
  features: Array<ProductFeature>;
  /** The URL-friendly handle for the product. */
  handle: Scalars['String']['output'];
  /** The Product global ID. */
  id: Scalars['ID']['output'];
  /** Whether the product is currently published. */
  isPublished: Scalars['Boolean']['output'];
  /** Product discriminator. */
  kind: ProductKind;
  /** Media registered on this product. */
  media: Array<ProductMediaItem>;
  /** The options available for this product. */
  options: Array<ProductOption>;
  /** Current product price range in the selected currency. */
  priceRange: Maybe<ProductPriceRange>;
  /** The primary category assigned to this product. */
  primaryCategory: Maybe<Category>;
  /** The date and time when the product was published, or null if unpublished. */
  publishedAt: Maybe<Scalars['DateTime']['output']>;
  /** Optimistic locking revision number. Incremented on each update. */
  revision: Scalars['Int']['output'];
  /** SEO and Open Graph metadata. */
  seo: Maybe<ProductSeo>;
  /** The tags associated with this product. */
  tags: Array<Tag>;
  /** Product title. */
  title: Scalars['String']['output'];
  /** The date and time when the product was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** The variants of this product. */
  variants: VariantConnection;
  /** The total number of variants for this product. */
  variantsCount: Scalars['Int']['output'];
  /** The vendor associated with this product. */
  vendor: Maybe<Vendor>;
};


/** A product represents an item that can be sold. */
export type ProductVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * Bulk update input - same structure as productUpdate but for multiple products.
 * Max 100 products, 500 operations total.
 */
export type ProductBulkUpdateInput = {
  /** List of products to update with their operations. */
  products: Array<ProductBulkUpdateItem>;
};

/** A single product's update within a bulk request. */
export type ProductBulkUpdateItem = {
  /** Expected revision for optimistic locking. If provided, fails if product was modified. */
  expectedRevision?: InputMaybe<Scalars['Int']['input']>;
  /** Product-level operations. */
  operations?: InputMaybe<ProductUpdateInput>;
  /** The product ID to update. */
  productId: Scalars['ID']['input'];
};

/** Bulk update job with progress. */
export type ProductBulkUpdateJob = {
  __typename?: 'ProductBulkUpdateJob';
  /** When created. */
  createdAt: Scalars['DateTime']['output'];
  /** When finished. */
  finishedAt: Maybe<Scalars['DateTime']['output']>;
  /** Job ID. */
  id: Scalars['ID']['output'];
  /** Items with pagination and filtering. */
  items: BulkUpdateItemConnection;
  /** Progress computed from items. */
  progress: BulkUpdateJobProgress;
  /** When started running. */
  startedAt: Maybe<Scalars['DateTime']['output']>;
  /** Current status. */
  status: BulkUpdateJobStatus;
  /** Total products in batch. */
  totalProducts: Scalars['Int']['output'];
};


/** Bulk update job with progress. */
export type ProductBulkUpdateJobItemsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  statusFilter?: InputMaybe<Array<BulkUpdateItemStatus>>;
};

export type ProductBulkUpdateJobConnection = {
  __typename?: 'ProductBulkUpdateJobConnection';
  edges: Array<ProductBulkUpdateJobEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ProductBulkUpdateJobEdge = {
  __typename?: 'ProductBulkUpdateJobEdge';
  cursor: Scalars['String']['output'];
  node: ProductBulkUpdateJob;
};

/** Result of bulk update start/cancel. */
export type ProductBulkUpdatePayload = {
  __typename?: 'ProductBulkUpdatePayload';
  /** Created or updated job (null on validation error). */
  job: Maybe<ProductBulkUpdateJob>;
  /** Validation/execution errors. */
  userErrors: Array<BulkUpdateUserError>;
};

export type ProductCategoriesScopeInput = {
  mode: CategoryHierarchyScopeMode;
  referenceIds: Array<Scalars['ID']['input']>;
};

export type ProductCategoryAssignment = {
  __typename?: 'ProductCategoryAssignment';
  category: Category;
  isPrimary: Scalars['Boolean']['output'];
};

export enum ProductCategoryOperationAction {
  Add = 'ADD',
  Move = 'MOVE',
  Remove = 'REMOVE',
  SetPrimary = 'SET_PRIMARY'
}

/** Product category assignment operation for unified product updates. */
export type ProductCategoryOperationInput = {
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
export type ProductConnection = {
  __typename?: 'ProductConnection';
  /** A list of edges. */
  edges: Array<ProductEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of products. */
  totalCount: Scalars['Int']['output'];
};

/** Input for product content (description, excerpt). */
export type ProductContentInput = {
  /** Product description in multiple formats. */
  description?: InputMaybe<RichTextInput>;
  /** Short excerpt. */
  excerpt?: InputMaybe<RichTextInput>;
};

/** Input for creating a product with all its data in one request. */
export type ProductCreateInput = {
  /** Product description. */
  description?: InputMaybe<RichTextInput>;
  /** Short excerpt in multiple formats. */
  excerpt?: InputMaybe<RichTextInput>;
  /** URL-friendly handle for the product. */
  handle: Scalars['String']['input'];
  /** Inventory tracking settings for the product. */
  inventoryItem?: InputMaybe<InventoryItemInput>;
  /** File IDs for product media (already uploaded via mediaMutation.fileUpload). */
  mediaFileIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Product options (e.g., Color, Size). */
  options?: InputMaybe<Array<ProductCreateOptionInput>>;
  /** Product title. */
  title: Scalars['String']['input'];
  /** Variants to create (only enabled ones from UI). */
  variants?: InputMaybe<Array<ProductCreateVariantInput>>;
  /** Vendor ID to associate with the product. */
  vendorId?: InputMaybe<Scalars['ID']['input']>;
};

/** Input for creating an option during product creation. */
export type ProductCreateOptionInput = {
  /** How to display the option (default: DROPDOWN). */
  displayType?: InputMaybe<Scalars['String']['input']>;
  /** Display name for the option. */
  name: Scalars['String']['input'];
  /** URL-friendly slug for the option. */
  slug: Scalars['String']['input'];
  /** Sort order within the product options list. */
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  /** The values for this option. */
  values: Array<ProductCreateOptionValueInput>;
};

/** Input for creating an option value during product creation. */
export type ProductCreateOptionValueInput = {
  /** Display name for the value. */
  name: Scalars['String']['input'];
  /** URL-friendly slug for the value. */
  slug: Scalars['String']['input'];
  /** Sort order within the option values list. */
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
};

/** Payload for product creation. */
export type ProductCreatePayload = {
  __typename?: 'ProductCreatePayload';
  /** The created product. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for creating a variant during product creation. */
export type ProductCreateVariantInput = {
  /** Handle built from option value slugs (e.g., "red-s"). */
  handle: Scalars['String']['input'];
};

/** Input for deleting a product. */
export type ProductDeleteInput = {
  /** The ID of the product to delete. */
  id: Scalars['ID']['input'];
  /** Whether to permanently delete the product (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for product deletion. */
export type ProductDeletePayload = {
  __typename?: 'ProductDeletePayload';
  /** The ID of the deleted product. */
  deletedProductId: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** An edge in a Product connection. */
export type ProductEdge = {
  __typename?: 'ProductEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Product;
};

/** A product feature represents either a group or an attribute. */
export type ProductFeature = Node & {
  __typename?: 'ProductFeature';
  /** Child features. Returns empty array for attributes (isGroup = false). */
  children: Array<ProductFeature>;
  /** The globally unique ID of the feature. */
  id: Scalars['ID']['output'];
  /** Tree position as array: [0] for root, [0, 1] for child of first group. */
  index: Array<Scalars['Int']['output']>;
  /** Whether this feature is a group (container) or an attribute (leaf). */
  isGroup: Scalars['Boolean']['output'];
  /** Display name (from translations). */
  name: Scalars['String']['output'];
  /** Parent group, if this feature belongs to a group. */
  parent: Maybe<ProductFeature>;
  /** The URL-friendly slug for this feature. */
  slug: Scalars['String']['output'];
  /** Values. Returns empty array for groups (isGroup = true). */
  values: Array<ProductFeatureValue>;
};

/** Input for creating a feature on a product. */
export type ProductFeatureCreateInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The ID of the product. */
  productId: Scalars['ID']['input'];
  /** The URL-friendly slug for the feature. */
  slug: Scalars['String']['input'];
  /** The values for this feature. */
  values: Array<ProductFeatureValueCreateInput>;
};

/** Payload for feature create. */
export type ProductFeatureCreatePayload = {
  __typename?: 'ProductFeatureCreatePayload';
  /** The created feature. */
  feature: Maybe<ProductFeature>;
  /** The product with updated features. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for deleting a feature from a product. */
export type ProductFeatureDeleteInput = {
  /** The ID of the feature to delete. */
  id: Scalars['ID']['input'];
};

/** Payload for feature delete. */
export type ProductFeatureDeletePayload = {
  __typename?: 'ProductFeatureDeletePayload';
  /** The ID of the deleted feature. */
  deletedFeatureId: Maybe<Scalars['ID']['output']>;
  /** The product with updated features. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for creating a feature during product creation. */
export type ProductFeatureInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the feature. */
  slug: Scalars['String']['input'];
  /** The values for this feature. */
  values: Array<ProductFeatureValueCreateInput>;
};

export type ProductFeatureSyncItemInput = {
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
  values?: InputMaybe<Array<ProductFeatureValueSyncInput>>;
};

/** Input for updating a feature. */
export type ProductFeatureUpdateInput = {
  /** The ID of the feature to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The URL-friendly slug for the feature. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** Nested value operations. */
  values?: InputMaybe<ProductFeatureValuesInput>;
};

/** Payload for feature update. */
export type ProductFeatureUpdatePayload = {
  __typename?: 'ProductFeatureUpdatePayload';
  /** The updated feature. */
  feature: Maybe<ProductFeature>;
  /** The product with updated features. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** A value for a product feature. */
export type ProductFeatureValue = Node & {
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
export type ProductFeatureValueCreateInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for this feature value. */
  slug: Scalars['String']['input'];
};

export type ProductFeatureValueSyncInput = {
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
export type ProductFeatureValueUpdateInput = {
  /** The ID of the value to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The URL-friendly slug for this value. */
  slug?: InputMaybe<Scalars['String']['input']>;
};

/** Input for nested value operations in feature update. */
export type ProductFeatureValuesInput = {
  /** Values to create. */
  create?: InputMaybe<Array<ProductFeatureValueCreateInput>>;
  /** IDs of values to delete. */
  delete?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Values to update. */
  update?: InputMaybe<Array<ProductFeatureValueUpdateInput>>;
};

/** Sync all product features in a single transaction. */
export type ProductFeaturesSyncInput = {
  /** Complete list of features (replaces all existing features). */
  features: Array<ProductFeatureSyncItemInput>;
  /** The ID of the product. */
  productId: Scalars['ID']['input'];
};

export type ProductFeaturesSyncPayload = {
  __typename?: 'ProductFeaturesSyncPayload';
  /** List of all synced features with their final IDs. */
  features: Array<ProductFeature>;
  /** The updated product. */
  product: Maybe<Product>;
  /** Any validation errors. */
  userErrors: Array<GenericUserError>;
};

export type ProductInventoryWidget = {
  __typename?: 'ProductInventoryWidget';
  alertThreshold: InventoryAlertThreshold;
  availableChange7d: Scalars['Int']['output'];
  backorder: InventoryBackorder;
  quantities: InventoryQuantities;
  skuStatus: InventorySkuStatus;
};

export enum ProductKind {
  Base = 'BASE',
  Bundle = 'BUNDLE'
}

/** Input for product media. */
export type ProductMediaInput = {
  /** File IDs for product media. */
  fileIds: Array<Scalars['ID']['input']>;
};

/** Media registered on a product with sort order. */
export type ProductMediaItem = {
  __typename?: 'ProductMediaItem';
  /** The file from the Media service. */
  file: File;
  /** Sort order index (lower = first). */
  sortIndex: Scalars['Int']['output'];
};

/** A product option defines a configurable aspect of a product, such as Size or Color. */
export type ProductOption = Node & {
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
  values: Array<ProductOptionValue>;
};

/** Input for creating an option on a product. */
export type ProductOptionCreateInput = {
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
  values: Array<ProductOptionValueCreateInput>;
};

/** Payload for option create. Returns the product with new variants. */
export type ProductOptionCreatePayload = {
  __typename?: 'ProductOptionCreatePayload';
  /** The created option. */
  option: Maybe<ProductOption>;
  /** The product with updated options and variants. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for deleting an option from a product. */
export type ProductOptionDeleteInput = {
  /** The ID of the option to delete. */
  id: Scalars['ID']['input'];
};

/** Payload for option delete. */
export type ProductOptionDeletePayload = {
  __typename?: 'ProductOptionDeletePayload';
  /** The ID of the deleted option. */
  deletedOptionId: Maybe<Scalars['ID']['output']>;
  /** The product with updated options and variants. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** A visual swatch for representing an option value. */
export type ProductOptionSwatch = Node & {
  __typename?: 'ProductOptionSwatch';
  /** The primary color (hex code or color name). */
  colorOne: Maybe<Scalars['String']['output']>;
  /** The secondary color for gradients. */
  colorTwo: Maybe<Scalars['String']['output']>;
  /** The file for image-based swatches. */
  file: Maybe<File>;
  /** The globally unique ID of the swatch. */
  id: Scalars['ID']['output'];
  /** Additional metadata for the swatch. */
  metadata: Maybe<Scalars['JSON']['output']>;
  /** The type of swatch. */
  swatchType: SwatchType;
};

/** Input for creating/updating a swatch. */
export type ProductOptionSwatchInput = {
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
export type ProductOptionSyncItemInput = {
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
  values: Array<ProductOptionValueSyncInput>;
};

/** Input for updating an option. */
export type ProductOptionUpdateInput = {
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
  values?: InputMaybe<ProductOptionValuesInput>;
};

/** Payload for option update. */
export type ProductOptionUpdatePayload = {
  __typename?: 'ProductOptionUpdatePayload';
  /** The updated option. */
  option: Maybe<ProductOption>;
  /** The product with updated options and variants. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** A value for a product option, such as "Red" for Color or "Large" for Size. */
export type ProductOptionValue = Node & {
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
  swatch: Maybe<ProductOptionSwatch>;
};

/** Input for creating an option value. */
export type ProductOptionValueCreateInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the value. */
  slug: Scalars['String']['input'];
  /** Sort order within the option values list. */
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  /** The swatch for this value. */
  swatch?: InputMaybe<ProductOptionSwatchInput>;
};

/** Input for syncing a single option value. */
export type ProductOptionValueSyncInput = {
  /** Existing value ID (null = create new). */
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the value. */
  slug: Scalars['String']['input'];
  /** Sort order within the option values list. */
  sortIndex: Scalars['Int']['input'];
  /** The swatch for this value (null to remove). */
  swatch?: InputMaybe<ProductOptionSwatchInput>;
};

/** Input for updating an existing option value. */
export type ProductOptionValueUpdateInput = {
  /** The ID of the value to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new slug for the value. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** Sort order within the option values list. */
  sortIndex?: InputMaybe<Scalars['Int']['input']>;
  /** The swatch for this value. */
  swatch?: InputMaybe<ProductOptionSwatchInput>;
};

/** Input for nested value operations in option update. */
export type ProductOptionValuesInput = {
  /** Values to create. */
  create?: InputMaybe<Array<ProductOptionValueCreateInput>>;
  /** IDs of values to delete. */
  delete?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Values to update. */
  update?: InputMaybe<Array<ProductOptionValueUpdateInput>>;
};

/** Input for syncing all product options. */
export type ProductOptionsSyncInput = {
  /** Complete list of options (replaces existing). */
  options: Array<ProductOptionSyncItemInput>;
  /** The product to sync options for. */
  productId: Scalars['ID']['input'];
};

/** Payload for options sync mutation. */
export type ProductOptionsSyncPayload = {
  __typename?: 'ProductOptionsSyncPayload';
  /** All synced options with final IDs. */
  options: Array<ProductOption>;
  /** The product with updated options. */
  product: Maybe<Product>;
  /** List of errors that occurred. */
  userErrors: Array<GenericUserError>;
};

/** Ordering configuration for Product */
export type ProductOrderByInput = {
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

export type ProductPriceRange = {
  __typename?: 'ProductPriceRange';
  /** Currency code used for the returned price amounts. */
  currency: CurrencyCode;
  /** Maximum product price amount in minor units. */
  maxPriceAmount: Scalars['BigInt']['output'];
  /** Minimum product price amount in minor units. */
  minPriceAmount: Scalars['BigInt']['output'];
};

export type ProductProductsMetaInput = {
  categoriesScope?: InputMaybe<ProductCategoriesScopeInput>;
};

/** SEO and Open Graph metadata for a product. */
export type ProductSeo = {
  __typename?: 'ProductSeo';
  ogDescription: Maybe<Scalars['String']['output']>;
  ogImage: Maybe<File>;
  ogTitle: Maybe<Scalars['String']['output']>;
  seoDescription: Maybe<Scalars['String']['output']>;
  seoTitle: Maybe<Scalars['String']['output']>;
};

/** Input for updating product SEO data. */
export type ProductSeoInput = {
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

export type ProductSortInput = {
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
export type ProductTagOperationInput = {
  /** The assignment action to apply. */
  action: ProductTagOperationAction;
  /** The tag to update for the product. */
  tagId: Scalars['ID']['input'];
};

/** Input for product-level fields in the unified update. */
export type ProductUpdateInput = {
  /** Product category assignment operations. */
  categories?: InputMaybe<Array<ProductCategoryOperationInput>>;
  /** Product content (description, excerpt). */
  content?: InputMaybe<ProductContentInput>;
  /** The URL-friendly handle for the product. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** Product media. */
  media?: InputMaybe<ProductMediaInput>;
  /** SEO and Open Graph metadata. */
  seo?: InputMaybe<ProductSeoInput>;
  /** Product status: DRAFT or PUBLISHED. */
  status?: InputMaybe<ProductStatus>;
  /** Product tag assignment operations. */
  tags?: InputMaybe<Array<ProductTagOperationInput>>;
  /** Product title. */
  title?: InputMaybe<Scalars['String']['input']>;
  /** Variant create, update, and delete operations. */
  variants?: InputMaybe<Array<VariantOperationInput>>;
  /** Vendor ID to associate with the product. Pass null to clear. */
  vendorId?: InputMaybe<Scalars['ID']['input']>;
};

/** Payload for the unified product update mutation. */
export type ProductUpdatePayload = {
  __typename?: 'ProductUpdatePayload';
  /** Results of each operation. */
  operationResults: Array<OperationResult>;
  /** The updated product with new revision. */
  product: Maybe<Product>;
  /** All errors from all operations. */
  userErrors: Array<GenericUserError>;
};

/**
 * Input for updating product status (publish or unpublish).
 * Reused in bulk operations.
 */
export type ProductUpdateStatusInput = {
  /** Action: PUBLISH or UNPUBLISH. */
  action: ProductStatusAction;
  /** Product ID. */
  productId: Scalars['ID']['input'];
};

/** Payload for product update status. */
export type ProductUpdateStatusPayload = {
  __typename?: 'ProductUpdateStatusPayload';
  /** The updated product. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for Product */
export type ProductWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ProductWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ProductWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ProductWhereInput>>;
  /** Filter by brandName */
  brandName?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by currency */
  currency?: InputMaybe<StringFilter>;
  /** Filter by handle */
  handle?: InputMaybe<StringFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<StringFilter>;
  /** Filter by maxAmountMinor */
  maxAmountMinor?: InputMaybe<IntFilter>;
  /** Filter by maxPriceMinor */
  maxPriceMinor?: InputMaybe<IntFilter>;
  /** Filter by minAmountMinor */
  minAmountMinor?: InputMaybe<IntFilter>;
  /** Filter by minPriceMinor */
  minPriceMinor?: InputMaybe<IntFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
  /** Filter by primaryCategoryId */
  primaryCategoryId?: InputMaybe<IdFilter>;
  /** Filter by primaryCategoryName */
  primaryCategoryName?: InputMaybe<StringFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by vendorId */
  vendorId?: InputMaybe<IdFilter>;
};

export type Query = {
  __typename?: 'Query';
  /** Catalog query namespace for product, variant, category, and collection operations */
  catalogQuery: CatalogQuery;
  /** Inventory query namespace for warehouse, stock, and inventory item operations */
  inventoryQuery: InventoryQuery;
  /** Widget query namespace for dashboard widgets */
  widgetQuery: WidgetQuery;
};

/** Rich text content in multiple formats. */
export type RichText = {
  __typename?: 'RichText';
  /** HTML content. */
  html: Scalars['String']['output'];
  /** EditorJS JSON content. */
  json: Scalars['JSON']['output'];
  /** Plain text content. */
  text: Scalars['String']['output'];
};

/** Input for rich text content (all fields required). */
export type RichTextInput = {
  /** HTML content. */
  html: Scalars['String']['input'];
  /** EditorJS JSON content. */
  json: Scalars['JSON']['input'];
  /** Plain text content. */
  text: Scalars['String']['input'];
};

/** Represents a selected option for a variant. */
export type SelectedOption = {
  __typename?: 'SelectedOption';
  /** The option ID. */
  optionId: Scalars['ID']['output'];
  /** The selected value ID. */
  optionValueId: Scalars['ID']['output'];
};

/** Input for selecting an option value for a variant. */
export type SelectedOptionInput = {
  /** The ID of the option. */
  optionId: Scalars['ID']['input'];
  /** The ID of the option value. */
  optionValueId: Scalars['ID']['input'];
};

/** SEO and Open Graph metadata. */
export type Seo = {
  __typename?: 'Seo';
  /** Open Graph description for social media sharing. */
  ogDescription: Maybe<Scalars['String']['output']>;
  /** Open Graph image for social media sharing. */
  ogImage: Maybe<File>;
  /** Open Graph title for social media sharing (max 95 chars). */
  ogTitle: Maybe<Scalars['String']['output']>;
  /** SEO description for search engines (max 160 chars). */
  seoDescription: Maybe<Scalars['String']['output']>;
  /** SEO title for search engines (max 70 chars). */
  seoTitle: Maybe<Scalars['String']['output']>;
};

/** Input for SEO and Open Graph metadata. */
export type SeoInput = {
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

export type SkuStatusMetric = {
  __typename?: 'SkuStatusMetric';
  averageDays: Maybe<Scalars['Float']['output']>;
  count: Scalars['Int']['output'];
};

/** Sort direction */
export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

/** Filter operators for String fields */
export type StringFilter = {
  /** Contains substring (case-sensitive) */
  _contains?: InputMaybe<Scalars['String']['input']>;
  /** Contains substring (case-insensitive) */
  _containsi?: InputMaybe<Scalars['String']['input']>;
  /** Ends with (case-sensitive) */
  _endsWith?: InputMaybe<Scalars['String']['input']>;
  /** Ends with (case-insensitive) */
  _endsWithi?: InputMaybe<Scalars['String']['input']>;
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
  /** Does not contain substring (case-sensitive) */
  _notContains?: InputMaybe<Scalars['String']['input']>;
  /** Does not contain substring (case-insensitive) */
  _notContainsi?: InputMaybe<Scalars['String']['input']>;
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
export type Tag = Node & {
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
export type TagConnection = {
  __typename?: 'TagConnection';
  /** A list of edges. */
  edges: Array<TagEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of tags. */
  totalCount: Scalars['Int']['output'];
};

/** Input for creating a tag. */
export type TagCreateInput = {
  /** The URL-friendly handle for the tag. */
  handle: Scalars['String']['input'];
  /** The display name of the tag (optional, defaults to handle). */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for tag creation. */
export type TagCreatePayload = {
  __typename?: 'TagCreatePayload';
  /** The created tag. */
  tag: Maybe<Tag>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for deleting a tag. */
export type TagDeleteInput = {
  /** The ID of the tag to delete. */
  id: Scalars['ID']['input'];
};

/** Payload for tag deletion. */
export type TagDeletePayload = {
  __typename?: 'TagDeletePayload';
  /** The ID of the deleted tag. */
  deletedTagId: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** An edge in a Tag connection. */
export type TagEdge = {
  __typename?: 'TagEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Tag;
};

/** Ordering configuration for Tag */
export type TagOrderByInput = {
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
  /** Sort by projectId */
  ProjectId = 'projectId'
}

/** Input for updating a tag. */
export type TagUpdateInput = {
  /** The URL-friendly handle for the tag. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the tag to update. */
  id: Scalars['ID']['input'];
  /** The display name of the tag. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for tag update. */
export type TagUpdatePayload = {
  __typename?: 'TagUpdatePayload';
  /** The updated tag. */
  tag: Maybe<Tag>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for Tag */
export type TagWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<TagWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<TagWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<TagWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by handle */
  handle?: InputMaybe<StringFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<StringFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
  /** Filter by productsCount */
  productsCount?: InputMaybe<IntFilter>;
  /** Filter by projectId */
  projectId?: InputMaybe<IdFilter>;
};

export enum ThresholdMethod {
  ReorderPoint = 'REORDER_POINT',
  SafetyStock = 'SAFETY_STOCK'
}

/** A generic user error interface for mutation responses. */
export type UserError = {
  /** An error code for programmatic handling. */
  code: Maybe<Scalars['String']['output']>;
  /** The path to the input field that caused the error. */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

/**
 * A variant represents a specific version of a product, such as a size or color.
 * Catalog Service owns this type.
 * Inventory fields (sku, dimensions, weight, cost, stock) are resolved by Catalog.
 */
export type Variant = Node & {
  __typename?: 'Variant';
  /** Bundle configuration assigned to this variant. Null for BASE variants. */
  bundleConfiguration: Maybe<BundleConfiguration>;
  /** The date and time when the variant was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the variant was deleted (soft delete). */
  deletedAt: Maybe<Scalars['DateTime']['output']>;
  /** Physical dimensions (stored in millimeters). */
  dimensions: Maybe<VariantDimensions>;
  /** The external ID in the external system. */
  externalId: Maybe<Scalars['String']['output']>;
  /** The external system identifier for integration purposes. */
  externalSystem: Maybe<Scalars['String']['output']>;
  /** The URL-friendly handle for the variant (generated from options). */
  handle: Scalars['String']['output'];
  /** The globally unique ID of the variant. */
  id: Scalars['ID']['output'];
  /** Inventory item associated with this variant. */
  inventoryItem: Maybe<InventoryItem>;
  /** Whether this is the default variant for the product. */
  isDefault: Scalars['Boolean']['output'];
  /** Variant discriminator. Must match parent product kind. */
  kind: ProductKind;
  /** Media attached to this variant (images, videos). */
  media: Array<VariantMediaItem>;
  /** Current price for this variant. */
  price: Maybe<VariantPrice>;
  /** Price history for this variant. */
  priceHistory: VariantPriceConnection;
  /** The product this variant belongs to. */
  product: Product;
  /** The selected option values for this variant. */
  selectedOptions: Array<SelectedOption>;
  /** Variant title. */
  title: Maybe<Scalars['String']['output']>;
  /** The date and time when the variant was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Physical weight (stored in grams). */
  weight: Maybe<VariantWeight>;
};


/**
 * A variant represents a specific version of a product, such as a size or color.
 * Catalog Service owns this type.
 * Inventory fields (sku, dimensions, weight, cost, stock) are resolved by Catalog.
 */
export type VariantPriceHistoryArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of Variant items. */
export type VariantConnection = {
  __typename?: 'VariantConnection';
  /** A list of edges. */
  edges: Array<VariantEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of variants. */
  totalCount: Scalars['Int']['output'];
};

/** Represents the cost of a variant. */
export type VariantCost = Node & {
  __typename?: 'VariantCost';
  /** The currency code. */
  currency: CurrencyCode;
  /** When this cost became effective. */
  effectiveFrom: Scalars['DateTime']['output'];
  /** When this cost stopped being effective (null if current). */
  effectiveTo: Maybe<Scalars['DateTime']['output']>;
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
export type VariantCostConnection = {
  __typename?: 'VariantCostConnection';
  /** A list of edges. */
  edges: Array<VariantCostEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of cost records. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a VariantCost connection. */
export type VariantCostEdge = {
  __typename?: 'VariantCostEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: VariantCost;
};

/** Input for creating a variant with a product ID. */
export type VariantCreateInput = {
  /** The ID of the product to add the variant to. */
  productId: Scalars['ID']['input'];
  /** The variant data. */
  variant: VariantInput;
};

/** Payload for variant creation. */
export type VariantCreatePayload = {
  __typename?: 'VariantCreatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The created variant. */
  variant: Maybe<Variant>;
};

/** Input for deleting a variant. */
export type VariantDeleteInput = {
  /** The ID of the variant to delete. */
  id: Scalars['ID']['input'];
  /** Whether to permanently delete the variant (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for variant deletion. */
export type VariantDeletePayload = {
  __typename?: 'VariantDeletePayload';
  /** The ID of the deleted variant. */
  deletedVariantId: Maybe<Scalars['ID']['output']>;
  /** The product the variant belonged to. */
  product: Maybe<Product>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Physical dimensions of a variant (stored in millimeters). */
export type VariantDimensions = {
  __typename?: 'VariantDimensions';
  /** Height in millimeters. */
  height: Scalars['Int']['output'];
  /** Length in millimeters. */
  length: Scalars['Int']['output'];
  /** Width in millimeters. */
  width: Scalars['Int']['output'];
};

/** Input for variant dimensions in the unified update. */
export type VariantDimensionsOpInput = {
  /** Height in millimeters. */
  height: Scalars['Int']['input'];
  /** Length in millimeters. */
  length: Scalars['Int']['input'];
  /** Width in millimeters. */
  width: Scalars['Int']['input'];
};

/** An edge in a Variant connection. */
export type VariantEdge = {
  __typename?: 'VariantEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Variant;
};

/** Input for creating a variant. */
export type VariantInput = {
  /** External ID in the external system. */
  externalId?: InputMaybe<Scalars['String']['input']>;
  /** External system identifier. */
  externalSystem?: InputMaybe<Scalars['String']['input']>;
  /** Selected option values for the variant (required). */
  options: Array<SelectedOptionInput>;
  /** Variant title. */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for variant inventory in the unified update. */
export type VariantInventoryOpInput = {
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
export type VariantMediaItem = {
  __typename?: 'VariantMediaItem';
  /** The file from the Media service. */
  file: File;
  /** Sort order index (lower = first). */
  sortIndex: Scalars['Int']['output'];
};

/** Input for variant media in the unified update. */
export type VariantMediaOpInput = {
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
export type VariantOperationInput = {
  /** The operation to apply. */
  action: VariantOperationAction;
  /** Per-request client correlation key for create operations. */
  clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Variant dimensions. */
  dimensions?: InputMaybe<VariantDimensionsOpInput>;
  /** Variant inventory item data (stock, SKU, cost). */
  inventory?: InputMaybe<VariantInventoryOpInput>;
  /** Variant media. */
  media?: InputMaybe<VariantMediaOpInput>;
  /** Variant options. */
  options?: InputMaybe<VariantOptionsOpInput>;
  /** Variant pricing. */
  pricing?: InputMaybe<VariantPricingOpInput>;
  /** The variant ID for update/delete operations. */
  variantId?: InputMaybe<Scalars['ID']['input']>;
  /** Variant weight in grams. */
  weight?: InputMaybe<Scalars['Int']['input']>;
};

/** Input for linking a variant to an option value. */
export type VariantOptionLinkInput = {
  /** The option ID. */
  optionId: Scalars['ID']['input'];
  /** The option value ID. */
  optionValueId: Scalars['ID']['input'];
};

/** Input for variant options in the unified update. */
export type VariantOptionsOpInput = {
  /** Option value links to set (replaces existing). */
  set: Array<VariantOptionLinkInput>;
};

/** Ordering configuration for Variant */
export type VariantOrderByInput = {
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
export type VariantPrice = Node & {
  __typename?: 'VariantPrice';
  /** The price amount in minor units (cents, kopecks, etc.). */
  amountMinor: Scalars['BigInt']['output'];
  /** The compare-at price in minor units (strikethrough price). */
  compareAtMinor: Maybe<Scalars['BigInt']['output']>;
  /** The currency code. */
  currency: CurrencyCode;
  /** When this price became effective. */
  effectiveFrom: Scalars['DateTime']['output'];
  /** When this price stopped being effective (null if current). */
  effectiveTo: Maybe<Scalars['DateTime']['output']>;
  /** The globally unique ID of the price record. */
  id: Scalars['ID']['output'];
  /** Whether this is the current active price. */
  isCurrent: Scalars['Boolean']['output'];
  /** When this price record was created. */
  recordedAt: Scalars['DateTime']['output'];
};

/** A connection to a list of VariantPrice items. */
export type VariantPriceConnection = {
  __typename?: 'VariantPriceConnection';
  /** A list of edges. */
  edges: Array<VariantPriceEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of price records. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a VariantPrice connection. */
export type VariantPriceEdge = {
  __typename?: 'VariantPriceEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: VariantPrice;
};

/** Statistics for variant price history over a period. */
export type VariantPriceHistoryStatistics = {
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
export type VariantPricingOpInput = {
  /** The price amount in minor units. */
  amountMinor: Scalars['BigInt']['input'];
  /** The compare-at price in minor units (optional). */
  compareAtMinor?: InputMaybe<Scalars['BigInt']['input']>;
  /** The currency code. */
  currency: CurrencyCode;
};

/** Input for updating variant media (replaces all existing media). */
export type VariantUpdateMediaInput = {
  /** File IDs in desired order (first = primary). Empty array clears all media. */
  fileIds: Array<Scalars['ID']['input']>;
  /** The variant ID. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant update media. */
export type VariantUpdateMediaPayload = {
  __typename?: 'VariantUpdateMediaPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated variant. */
  variant: Maybe<Variant>;
};

/** Input for updating variant options (option value links). */
export type VariantUpdateOptionsInput = {
  /** The option value links to set (replaces existing links). */
  links: Array<VariantOptionLinkInput>;
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant options update. */
export type VariantUpdateOptionsPayload = {
  __typename?: 'VariantUpdateOptionsPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated variant. */
  variant: Maybe<Variant>;
};

/** Input for updating a price on a variant. */
export type VariantUpdatePricingInput = {
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
export type VariantUpdatePricingPayload = {
  __typename?: 'VariantUpdatePricingPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated variant. */
  variant: Maybe<Variant>;
};

/** Physical weight of a variant (stored in grams). */
export type VariantWeight = {
  __typename?: 'VariantWeight';
  /** Weight in grams. */
  value: Scalars['Int']['output'];
};

/** Filter conditions for Variant */
export type VariantWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<VariantWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<VariantWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<VariantWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by externalId */
  externalId?: InputMaybe<StringFilter>;
  /** Filter by externalSystem */
  externalSystem?: InputMaybe<StringFilter>;
  /** Filter by handle */
  handle?: InputMaybe<StringFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by isDefault */
  isDefault?: InputMaybe<BooleanFilter>;
  /** Filter by productId */
  productId?: InputMaybe<IdFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** A vendor represents the supplier or brand owner associated with a product. */
export type Vendor = Node & {
  __typename?: 'Vendor';
  /** The globally unique ID of the vendor. */
  id: Scalars['ID']['output'];
  /** The display name of the vendor. */
  name: Scalars['String']['output'];
};

/** A connection to a list of Vendor items. */
export type VendorConnection = {
  __typename?: 'VendorConnection';
  /** A list of edges. */
  edges: Array<VendorEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of vendors. */
  totalCount: Scalars['Int']['output'];
};

/** Input for creating a vendor. */
export type VendorCreateInput = {
  /** The display name of the vendor. */
  name: Scalars['String']['input'];
};

/** Payload for vendor creation. */
export type VendorCreatePayload = {
  __typename?: 'VendorCreatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The created vendor. */
  vendor: Maybe<Vendor>;
};

/** An edge in a Vendor connection. */
export type VendorEdge = {
  __typename?: 'VendorEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Vendor;
};

/** Ordering configuration for Vendor */
export type VendorOrderByInput = {
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
export type VendorWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<VendorWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<VendorWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<VendorWhereInput>>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
};

/** A warehouse represents a physical location where inventory is stored. */
export type Warehouse = Node & {
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
  stock: WarehouseStockConnection;
  /** The date and time when the warehouse was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Total number of variants stocked in this warehouse. */
  variantsCount: Scalars['Int']['output'];
};


/** A warehouse represents a physical location where inventory is stored. */
export type WarehouseStockArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<WarehouseStockOrderByInput>>;
  where?: InputMaybe<WarehouseStockWhereInput>;
};

export type WarehouseAssignableVariantOrderByInput = {
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

export type WarehouseAssignableVariantWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<WarehouseAssignableVariantWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<WarehouseAssignableVariantWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<WarehouseAssignableVariantWhereInput>>;
  /** Filter by creation date */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by external ID */
  externalId?: InputMaybe<StringFilter>;
  /** Filter by external system */
  externalSystem?: InputMaybe<StringFilter>;
  /** Filter by variant handle */
  handle?: InputMaybe<StringFilter>;
  /** Filter by variant ID */
  id?: InputMaybe<IdFilter>;
  /** Filter by default variant flag */
  isDefault?: InputMaybe<BooleanFilter>;
  /** Filter by product ID */
  productId?: InputMaybe<IdFilter>;
  /** Filter by product name in the current locale */
  productName?: InputMaybe<StringFilter>;
  /** Filter by variant SKU */
  sku?: InputMaybe<StringFilter>;
  /** Filter by update date */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** A connection to a list of Warehouse items. */
export type WarehouseConnection = {
  __typename?: 'WarehouseConnection';
  /** A list of edges. */
  edges: Array<WarehouseEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of warehouses. */
  totalCount: Scalars['Int']['output'];
};

/** Relay-style pagination input for Warehouse */
export type WarehouseConnectionInput = {
  /** Returns items after this cursor */
  after?: InputMaybe<Scalars['String']['input']>;
  /** Returns items before this cursor */
  before?: InputMaybe<Scalars['String']['input']>;
  /** Returns the first n items */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Returns the last n items */
  last?: InputMaybe<Scalars['Int']['input']>;
  /** Sort order */
  orderBy?: InputMaybe<Array<WarehouseOrderByInput>>;
  /** Filter conditions */
  where?: InputMaybe<WarehouseWhereInput>;
};

/** Input for creating a warehouse. */
export type WarehouseCreateInput = {
  /** The unique code for the warehouse. */
  code: Scalars['String']['input'];
  /** Whether this should be the default warehouse. */
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  /** The display name for the warehouse. */
  name: Scalars['String']['input'];
};

/** Payload for warehouse creation. */
export type WarehouseCreatePayload = {
  __typename?: 'WarehouseCreatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The created warehouse. */
  warehouse: Maybe<Warehouse>;
};

/** Input for deleting a warehouse. */
export type WarehouseDeleteInput = {
  /** The ID of the warehouse to delete. */
  id: Scalars['ID']['input'];
};

/** Payload for warehouse deletion. */
export type WarehouseDeletePayload = {
  __typename?: 'WarehouseDeletePayload';
  /** The ID of the deleted warehouse. */
  deletedWarehouseId: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** An edge in a Warehouse connection. */
export type WarehouseEdge = {
  __typename?: 'WarehouseEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Warehouse;
};

/** Ordering configuration for Warehouse */
export type WarehouseOrderByInput = {
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
export type WarehouseStock = Node & {
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
  variant: Variant;
  /** The globally unique ID of the variant this stock belongs to. */
  variantId: Scalars['ID']['output'];
  /** The warehouse where this stock is located. */
  warehouse: Warehouse;
  /** The globally unique ID of the warehouse this stock belongs to. */
  warehouseId: Scalars['ID']['output'];
};

/** A connection to a list of WarehouseStock items. */
export type WarehouseStockConnection = {
  __typename?: 'WarehouseStockConnection';
  /** A list of edges. */
  edges: Array<WarehouseStockEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of stock records. */
  totalCount: Scalars['Int']['output'];
};

/** Relay-style pagination input for WarehouseStock */
export type WarehouseStockConnectionInput = {
  /** Returns items after this cursor */
  after?: InputMaybe<Scalars['String']['input']>;
  /** Returns items before this cursor */
  before?: InputMaybe<Scalars['String']['input']>;
  /** Returns the first n items */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Returns the last n items */
  last?: InputMaybe<Scalars['Int']['input']>;
  /** Sort order */
  orderBy?: InputMaybe<Array<WarehouseStockOrderByInput>>;
  /** Filter conditions */
  where?: InputMaybe<WarehouseStockWhereInput>;
};

/** Input for creating variant stock in warehouses. */
export type WarehouseStockCreateInput = {
  /** Stock records to create. */
  items: Array<WarehouseStockCreateItemInput>;
};

/** Item input for creating variant stock in a warehouse. */
export type WarehouseStockCreateItemInput = {
  /** The variant whose stock should be added. */
  variantId: Scalars['ID']['input'];
  /** The warehouse to add stock to. */
  warehouseId: Scalars['ID']['input'];
};

/** Payload for warehouse stock creation. */
export type WarehouseStockCreatePayload = {
  __typename?: 'WarehouseStockCreatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The created warehouse stock records. */
  warehouseStocks: Array<WarehouseStock>;
};

/** Input for deleting variant stock from warehouses. */
export type WarehouseStockDeleteInput = {
  /** Stock records to delete. */
  items: Array<WarehouseStockDeleteItemInput>;
};

/** Item input for deleting variant stock from a warehouse. */
export type WarehouseStockDeleteItemInput = {
  /** The variant whose stock should be removed. */
  variantId: Scalars['ID']['input'];
  /** The warehouse to remove stock from. */
  warehouseId: Scalars['ID']['input'];
};

/** Payload for warehouse stock deletion. */
export type WarehouseStockDeletePayload = {
  __typename?: 'WarehouseStockDeletePayload';
  /** The IDs of the deleted warehouse stock records. */
  deletedWarehouseStockIds: Array<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** An edge in a WarehouseStock connection. */
export type WarehouseStockEdge = {
  __typename?: 'WarehouseStockEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: WarehouseStock;
};

/** Ordering configuration for WarehouseStock */
export type WarehouseStockOrderByInput = {
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
export type WarehouseStockWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<WarehouseStockWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<WarehouseStockWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<WarehouseStockWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by quantityOnHand */
  quantityOnHand?: InputMaybe<IntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by variantId */
  variantId?: InputMaybe<IdFilter>;
  /** Filter by warehouseId */
  warehouseId?: InputMaybe<IdFilter>;
};

/** Input for updating a warehouse. */
export type WarehouseUpdateInput = {
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
export type WarehouseUpdatePayload = {
  __typename?: 'WarehouseUpdatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
  /** The updated warehouse. */
  warehouse: Maybe<Warehouse>;
};

/** Filter conditions for Warehouse */
export type WarehouseWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<WarehouseWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<WarehouseWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<WarehouseWhereInput>>;
  /** Filter by code */
  code?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by isDefault */
  isDefault?: InputMaybe<BooleanFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Input for setting weight (in grams). */
export type WeightInput = {
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
export type WidgetQuery = {
  __typename?: 'WidgetQuery';
  /**
   * Get inventory widget data for a product.
   * Returns aggregated inventory metrics across all variants.
   */
  inventory: Maybe<ProductInventoryWidget>;
  /** Get pricing widget data for a variant. */
  pricing: PricingWidgetPayload;
};


/** Widget query namespace for dashboard widgets. */
export type WidgetQueryInventoryArgs = {
  productId: Scalars['ID']['input'];
};


/** Widget query namespace for dashboard widgets. */
export type WidgetQueryPricingArgs = {
  input: PricingWidgetInput;
};

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
  BundlePriceRule: ( BundleBasePriceRule ) | ( BundleDiscountFixedPriceRule ) | ( BundleDiscountPercentPriceRule ) | ( BundleFixedPriceRule ) | ( BundleFreePriceRule );
  Listing: ( Omit<Bundle, 'categoryAssignments' | 'configurations' | 'description' | 'excerpt' | 'primaryCategory' | 'variants'> & { categoryAssignments: Array<_RefType['ProductCategoryAssignment']>, configurations: Array<_RefType['BundleConfiguration']>, description?: Maybe<_RefType['RichText']>, excerpt?: Maybe<_RefType['RichText']>, primaryCategory?: Maybe<_RefType['Category']>, variants: _RefType['VariantConnection'] } ) | ( Omit<Product, 'categoryAssignments' | 'description' | 'excerpt' | 'primaryCategory' | 'variants'> & { categoryAssignments: Array<_RefType['ProductCategoryAssignment']>, description?: Maybe<_RefType['RichText']>, excerpt?: Maybe<_RefType['RichText']>, primaryCategory?: Maybe<_RefType['Category']>, variants: _RefType['VariantConnection'] } );
  Node: ( Omit<Bundle, 'categoryAssignments' | 'configurations' | 'description' | 'excerpt' | 'primaryCategory' | 'variants'> & { categoryAssignments: Array<_RefType['ProductCategoryAssignment']>, configurations: Array<_RefType['BundleConfiguration']>, description?: Maybe<_RefType['RichText']>, excerpt?: Maybe<_RefType['RichText']>, primaryCategory?: Maybe<_RefType['Category']>, variants: _RefType['VariantConnection'] } ) | ( BundleBasePriceRule ) | ( BundleCondition ) | ( BundleConditionGroup ) | ( Omit<BundleConfiguration, 'bundle' | 'dependencyRules' | 'groups' | 'pricingTemplates' | 'variants'> & { bundle: _RefType['Bundle'], dependencyRules: Array<_RefType['BundleDependencyRule']>, groups: Array<_RefType['BundleGroup']>, pricingTemplates: Array<_RefType['BundlePricingTemplate']>, variants: Array<_RefType['Variant']> } ) | ( Omit<BundleDependencyAction, 'priceRule'> & { priceRule?: Maybe<_RefType['BundlePriceRule']> } ) | ( Omit<BundleDependencyRule, 'actions'> & { actions: Array<_RefType['BundleDependencyAction']> } ) | ( BundleDiscountFixedPriceRule ) | ( BundleDiscountPercentPriceRule ) | ( BundleFixedPriceRule ) | ( BundleFreePriceRule ) | ( Omit<BundleGroup, 'items'> & { items: Array<_RefType['BundleItem']> } ) | ( Omit<BundleItem, 'group' | 'priceRule' | 'pricingTemplate' | 'refProduct' | 'refVariant'> & { group: _RefType['BundleGroup'], priceRule?: Maybe<_RefType['BundlePriceRule']>, pricingTemplate?: Maybe<_RefType['BundlePricingTemplate']>, refProduct?: Maybe<_RefType['Product']>, refVariant?: Maybe<_RefType['Variant']> } ) | ( BundleItemOptionSelection ) | ( BundleItemOptionValueSelection ) | ( Omit<BundlePricingTemplate, 'priceRule'> & { priceRule: _RefType['BundlePriceRule'] } ) | ( Omit<Category, 'ancestors' | 'children' | 'description' | 'excerpt' | 'listing' | 'parent'> & { ancestors: Array<_RefType['Category']>, children: Array<_RefType['Category']>, description?: Maybe<_RefType['RichText']>, excerpt?: Maybe<_RefType['RichText']>, listing: _RefType['ListingConnection'], parent?: Maybe<_RefType['Category']> } ) | ( Omit<Collection, 'description' | 'excerpt' | 'products'> & { description?: Maybe<_RefType['RichText']>, excerpt?: Maybe<_RefType['RichText']>, products: _RefType['CollectionProductConnection'] } ) | ( Facet ) | ( FacetGroup ) | ( FacetSwatch ) | ( FacetValue ) | ( Omit<InventoryItem, 'stock' | 'variant'> & { stock: Array<_RefType['WarehouseStock']>, variant: _RefType['Variant'] } ) | ( Omit<Product, 'categoryAssignments' | 'description' | 'excerpt' | 'primaryCategory' | 'variants'> & { categoryAssignments: Array<_RefType['ProductCategoryAssignment']>, description?: Maybe<_RefType['RichText']>, excerpt?: Maybe<_RefType['RichText']>, primaryCategory?: Maybe<_RefType['Category']>, variants: _RefType['VariantConnection'] } ) | ( ProductFeature ) | ( ProductFeatureValue ) | ( ProductOption ) | ( ProductOptionSwatch ) | ( ProductOptionValue ) | ( Tag ) | ( Omit<Variant, 'bundleConfiguration' | 'inventoryItem' | 'product'> & { bundleConfiguration?: Maybe<_RefType['BundleConfiguration']>, inventoryItem?: Maybe<_RefType['InventoryItem']>, product: _RefType['Product'] } ) | ( VariantCost ) | ( VariantPrice ) | ( Vendor ) | ( Omit<Warehouse, 'stock'> & { stock: _RefType['WarehouseStockConnection'] } ) | ( Omit<WarehouseStock, 'variant' | 'warehouse'> & { variant: _RefType['Variant'], warehouse: _RefType['Warehouse'] } );
  UserError: ( BulkUpdateUserError ) | ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  BooleanFilter: BooleanFilter;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BulkUpdateCancelReason: BulkUpdateCancelReason;
  BulkUpdateItem: ResolverTypeWrapper<BulkUpdateItem>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  BulkUpdateItemConnection: ResolverTypeWrapper<BulkUpdateItemConnection>;
  BulkUpdateItemEdge: ResolverTypeWrapper<BulkUpdateItemEdge>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  BulkUpdateItemStatus: BulkUpdateItemStatus;
  BulkUpdateJobProgress: ResolverTypeWrapper<BulkUpdateJobProgress>;
  BulkUpdateJobStatus: BulkUpdateJobStatus;
  BulkUpdateOpType: BulkUpdateOpType;
  BulkUpdateUserError: ResolverTypeWrapper<BulkUpdateUserError>;
  Bundle: ResolverTypeWrapper<Omit<Bundle, 'categoryAssignments' | 'configurations' | 'description' | 'excerpt' | 'primaryCategory' | 'variants'> & { categoryAssignments: Array<ResolversTypes['ProductCategoryAssignment']>, configurations: Array<ResolversTypes['BundleConfiguration']>, description?: Maybe<ResolversTypes['RichText']>, excerpt?: Maybe<ResolversTypes['RichText']>, primaryCategory?: Maybe<ResolversTypes['Category']>, variants: ResolversTypes['VariantConnection'] }>;
  BundleBasePriceRule: ResolverTypeWrapper<BundleBasePriceRule>;
  BundleBundlesMetaInput: BundleBundlesMetaInput;
  BundleCondition: ResolverTypeWrapper<BundleCondition>;
  BundleConditionCategory: BundleConditionCategory;
  BundleConditionGroup: ResolverTypeWrapper<BundleConditionGroup>;
  BundleConditionGroupSyncItemInput: BundleConditionGroupSyncItemInput;
  BundleConditionOperator: BundleConditionOperator;
  BundleConditionSubject: BundleConditionSubject;
  BundleConditionSyncItemInput: BundleConditionSyncItemInput;
  BundleConfiguration: ResolverTypeWrapper<Omit<BundleConfiguration, 'bundle' | 'dependencyRules' | 'groups' | 'pricingTemplates' | 'variants'> & { bundle: ResolversTypes['Bundle'], dependencyRules: Array<ResolversTypes['BundleDependencyRule']>, groups: Array<ResolversTypes['BundleGroup']>, pricingTemplates: Array<ResolversTypes['BundlePricingTemplate']>, variants: Array<ResolversTypes['Variant']> }>;
  BundleConfigurationCreateInput: BundleConfigurationCreateInput;
  BundleConfigurationDeleteInput: BundleConfigurationDeleteInput;
  BundleConfigurationDeletePayload: ResolverTypeWrapper<Omit<BundleConfigurationDeletePayload, 'bundle'> & { bundle?: Maybe<ResolversTypes['Bundle']> }>;
  BundleConfigurationPayload: ResolverTypeWrapper<Omit<BundleConfigurationPayload, 'configuration'> & { configuration?: Maybe<ResolversTypes['BundleConfiguration']> }>;
  BundleConfigurationUpdateInput: BundleConfigurationUpdateInput;
  BundleConnection: ResolverTypeWrapper<Omit<BundleConnection, 'edges'> & { edges: Array<ResolversTypes['BundleEdge']> }>;
  BundleCreateInput: BundleCreateInput;
  BundleCreatePayload: ResolverTypeWrapper<Omit<BundleCreatePayload, 'bundle'> & { bundle?: Maybe<ResolversTypes['Bundle']> }>;
  BundleDependencyAction: ResolverTypeWrapper<Omit<BundleDependencyAction, 'priceRule'> & { priceRule?: Maybe<ResolversTypes['BundlePriceRule']> }>;
  BundleDependencyActionSyncItemInput: BundleDependencyActionSyncItemInput;
  BundleDependencyActionType: BundleDependencyActionType;
  BundleDependencyRule: ResolverTypeWrapper<Omit<BundleDependencyRule, 'actions'> & { actions: Array<ResolversTypes['BundleDependencyAction']> }>;
  BundleDependencyRuleSyncItemInput: BundleDependencyRuleSyncItemInput;
  BundleDependencyRulesSyncInput: BundleDependencyRulesSyncInput;
  BundleDependencyRulesSyncPayload: ResolverTypeWrapper<Omit<BundleDependencyRulesSyncPayload, 'configuration' | 'dependencyRules'> & { configuration?: Maybe<ResolversTypes['BundleConfiguration']>, dependencyRules: Array<ResolversTypes['BundleDependencyRule']> }>;
  BundleDependencyTargetType: BundleDependencyTargetType;
  BundleDiscountFixedPriceRule: ResolverTypeWrapper<BundleDiscountFixedPriceRule>;
  BundleDiscountPercentPriceRule: ResolverTypeWrapper<BundleDiscountPercentPriceRule>;
  BundleDisplayStyle: BundleDisplayStyle;
  BundleEdge: ResolverTypeWrapper<Omit<BundleEdge, 'node'> & { node: ResolversTypes['Bundle'] }>;
  BundleFixedPriceRule: ResolverTypeWrapper<BundleFixedPriceRule>;
  BundleFreePriceRule: ResolverTypeWrapper<BundleFreePriceRule>;
  BundleGroup: ResolverTypeWrapper<Omit<BundleGroup, 'items'> & { items: Array<ResolversTypes['BundleItem']> }>;
  BundleGroupSyncItemInput: BundleGroupSyncItemInput;
  BundleGroupsSyncInput: BundleGroupsSyncInput;
  BundleGroupsSyncPayload: ResolverTypeWrapper<Omit<BundleGroupsSyncPayload, 'configuration' | 'groups'> & { configuration?: Maybe<ResolversTypes['BundleConfiguration']>, groups: Array<ResolversTypes['BundleGroup']> }>;
  BundleItem: ResolverTypeWrapper<Omit<BundleItem, 'group' | 'priceRule' | 'pricingTemplate' | 'refProduct' | 'refVariant'> & { group: ResolversTypes['BundleGroup'], priceRule?: Maybe<ResolversTypes['BundlePriceRule']>, pricingTemplate?: Maybe<ResolversTypes['BundlePricingTemplate']>, refProduct?: Maybe<ResolversTypes['Product']>, refVariant?: Maybe<ResolversTypes['Variant']> }>;
  BundleItemOptionSelection: ResolverTypeWrapper<BundleItemOptionSelection>;
  BundleItemOptionSelectionSyncItemInput: BundleItemOptionSelectionSyncItemInput;
  BundleItemOptionValueSelection: ResolverTypeWrapper<BundleItemOptionValueSelection>;
  BundleItemOptionValueSelectionStatus: BundleItemOptionValueSelectionStatus;
  BundleItemOptionValueSelectionSyncItemInput: BundleItemOptionValueSelectionSyncItemInput;
  BundleItemSyncItemInput: BundleItemSyncItemInput;
  BundleItemType: BundleItemType;
  BundleLogicOperator: BundleLogicOperator;
  BundleOrderByInput: BundleOrderByInput;
  BundleOrderField: BundleOrderField;
  BundlePriceRule: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['BundlePriceRule']>;
  BundlePriceRuleAmount: ResolverTypeWrapper<BundlePriceRuleAmount>;
  BundlePriceRuleAmountInput: BundlePriceRuleAmountInput;
  BundlePriceRuleInput: BundlePriceRuleInput;
  BundlePriceRulePercent: ResolverTypeWrapper<BundlePriceRulePercent>;
  BundlePriceRulePercentInput: BundlePriceRulePercentInput;
  BundlePriceType: BundlePriceType;
  BundlePricingTemplate: ResolverTypeWrapper<Omit<BundlePricingTemplate, 'priceRule'> & { priceRule: ResolversTypes['BundlePriceRule'] }>;
  BundlePricingTemplateSyncItemInput: BundlePricingTemplateSyncItemInput;
  BundlePricingTemplatesSyncInput: BundlePricingTemplatesSyncInput;
  BundlePricingTemplatesSyncPayload: ResolverTypeWrapper<Omit<BundlePricingTemplatesSyncPayload, 'configuration' | 'pricingTemplates'> & { configuration?: Maybe<ResolversTypes['BundleConfiguration']>, pricingTemplates: Array<ResolversTypes['BundlePricingTemplate']> }>;
  BundleType: BundleType;
  BundleUpdateInput: BundleUpdateInput;
  BundleUpdatePayload: ResolverTypeWrapper<Omit<BundleUpdatePayload, 'bundle'> & { bundle?: Maybe<ResolversTypes['Bundle']> }>;
  BundleWhereInput: BundleWhereInput;
  CatalogMutation: ResolverTypeWrapper<Omit<CatalogMutation, 'bundleConfigurationCreate' | 'bundleConfigurationDelete' | 'bundleConfigurationUpdate' | 'bundleCreate' | 'bundleDependencyRulesSync' | 'bundleGroupsSync' | 'bundlePricingTemplatesSync' | 'bundleUpdate' | 'categoryCreate' | 'categoryMove' | 'categoryRebalance' | 'categoryUpdate' | 'collectionAddProducts' | 'collectionCreate' | 'collectionMoveProduct' | 'collectionRemoveProducts' | 'collectionUpdate' | 'collectionUpdateRules' | 'productCreate' | 'productFeatureCreate' | 'productFeatureDelete' | 'productFeatureUpdate' | 'productFeaturesSync' | 'productOptionCreate' | 'productOptionDelete' | 'productOptionUpdate' | 'productOptionsSync' | 'productUpdate' | 'productUpdateStatus' | 'variantCreate' | 'variantDelete' | 'variantUpdateMedia' | 'variantUpdateOptions' | 'variantUpdatePricing'> & { bundleConfigurationCreate: ResolversTypes['BundleConfigurationPayload'], bundleConfigurationDelete: ResolversTypes['BundleConfigurationDeletePayload'], bundleConfigurationUpdate: ResolversTypes['BundleConfigurationPayload'], bundleCreate: ResolversTypes['BundleCreatePayload'], bundleDependencyRulesSync: ResolversTypes['BundleDependencyRulesSyncPayload'], bundleGroupsSync: ResolversTypes['BundleGroupsSyncPayload'], bundlePricingTemplatesSync: ResolversTypes['BundlePricingTemplatesSyncPayload'], bundleUpdate: ResolversTypes['BundleUpdatePayload'], categoryCreate: ResolversTypes['CategoryCreatePayload'], categoryMove: ResolversTypes['CategoryMovePayload'], categoryRebalance: ResolversTypes['CategoryRebalancePayload'], categoryUpdate: ResolversTypes['CategoryUpdatePayload'], collectionAddProducts: ResolversTypes['CollectionAddProductsPayload'], collectionCreate: ResolversTypes['CollectionCreatePayload'], collectionMoveProduct: ResolversTypes['CollectionMoveProductPayload'], collectionRemoveProducts: ResolversTypes['CollectionRemoveProductsPayload'], collectionUpdate: ResolversTypes['CollectionUpdatePayload'], collectionUpdateRules: ResolversTypes['CollectionUpdateRulesPayload'], productCreate: ResolversTypes['ProductCreatePayload'], productFeatureCreate: ResolversTypes['ProductFeatureCreatePayload'], productFeatureDelete: ResolversTypes['ProductFeatureDeletePayload'], productFeatureUpdate: ResolversTypes['ProductFeatureUpdatePayload'], productFeaturesSync: ResolversTypes['ProductFeaturesSyncPayload'], productOptionCreate: ResolversTypes['ProductOptionCreatePayload'], productOptionDelete: ResolversTypes['ProductOptionDeletePayload'], productOptionUpdate: ResolversTypes['ProductOptionUpdatePayload'], productOptionsSync: ResolversTypes['ProductOptionsSyncPayload'], productUpdate: ResolversTypes['ProductUpdatePayload'], productUpdateStatus: ResolversTypes['ProductUpdateStatusPayload'], variantCreate: ResolversTypes['VariantCreatePayload'], variantDelete: ResolversTypes['VariantDeletePayload'], variantUpdateMedia: ResolversTypes['VariantUpdateMediaPayload'], variantUpdateOptions: ResolversTypes['VariantUpdateOptionsPayload'], variantUpdatePricing: ResolversTypes['VariantUpdatePricingPayload'] }>;
  CatalogQuery: ResolverTypeWrapper<Omit<CatalogQuery, 'bundle' | 'bundles' | 'categories' | 'category' | 'collection' | 'collectionByHandle' | 'collections' | 'node' | 'nodes' | 'product' | 'products' | 'variant' | 'variants'> & { bundle?: Maybe<ResolversTypes['Bundle']>, bundles: ResolversTypes['BundleConnection'], categories: ResolversTypes['CategoryConnection'], category?: Maybe<ResolversTypes['Category']>, collection?: Maybe<ResolversTypes['Collection']>, collectionByHandle?: Maybe<ResolversTypes['Collection']>, collections: ResolversTypes['CollectionConnection'], node?: Maybe<ResolversTypes['Node']>, nodes: Array<Maybe<ResolversTypes['Node']>>, product?: Maybe<ResolversTypes['Product']>, products: ResolversTypes['ProductConnection'], variant?: Maybe<ResolversTypes['Variant']>, variants: ResolversTypes['VariantConnection'] }>;
  Category: ResolverTypeWrapper<Omit<Category, 'ancestors' | 'children' | 'description' | 'excerpt' | 'listing' | 'parent'> & { ancestors: Array<ResolversTypes['Category']>, children: Array<ResolversTypes['Category']>, description?: Maybe<ResolversTypes['RichText']>, excerpt?: Maybe<ResolversTypes['RichText']>, listing: ResolversTypes['ListingConnection'], parent?: Maybe<ResolversTypes['Category']> }>;
  CategoryCategoriesMetaInput: CategoryCategoriesMetaInput;
  CategoryConnection: ResolverTypeWrapper<Omit<CategoryConnection, 'edges'> & { edges: Array<ResolversTypes['CategoryEdge']> }>;
  CategoryContentInput: CategoryContentInput;
  CategoryCreateInput: CategoryCreateInput;
  CategoryCreatePayload: ResolverTypeWrapper<Omit<CategoryCreatePayload, 'category'> & { category?: Maybe<ResolversTypes['Category']> }>;
  CategoryDeleteInput: CategoryDeleteInput;
  CategoryDeletePayload: ResolverTypeWrapper<CategoryDeletePayload>;
  CategoryEdge: ResolverTypeWrapper<Omit<CategoryEdge, 'node'> & { node: ResolversTypes['Category'] }>;
  CategoryHierarchyInput: CategoryHierarchyInput;
  CategoryHierarchyScopeDirection: CategoryHierarchyScopeDirection;
  CategoryHierarchyScopeInput: CategoryHierarchyScopeInput;
  CategoryHierarchyScopeMode: CategoryHierarchyScopeMode;
  CategoryMediaInput: CategoryMediaInput;
  CategoryMediaItem: ResolverTypeWrapper<CategoryMediaItem>;
  CategoryMoveInput: CategoryMoveInput;
  CategoryMovePayload: ResolverTypeWrapper<Omit<CategoryMovePayload, 'category'> & { category?: Maybe<ResolversTypes['Category']> }>;
  CategoryOrderByInput: CategoryOrderByInput;
  CategoryOrderField: CategoryOrderField;
  CategoryProductsScopeInput: CategoryProductsScopeInput;
  CategoryRebalanceInput: CategoryRebalanceInput;
  CategoryRebalancePayload: ResolverTypeWrapper<Omit<CategoryRebalancePayload, 'category'> & { category?: Maybe<ResolversTypes['Category']> }>;
  CategorySortInput: CategorySortInput;
  CategoryStatus: CategoryStatus;
  CategoryUpdateInput: CategoryUpdateInput;
  CategoryUpdatePayload: ResolverTypeWrapper<Omit<CategoryUpdatePayload, 'category'> & { category?: Maybe<ResolversTypes['Category']> }>;
  CategoryWhereInput: CategoryWhereInput;
  Collection: ResolverTypeWrapper<Omit<Collection, 'description' | 'excerpt' | 'products'> & { description?: Maybe<ResolversTypes['RichText']>, excerpt?: Maybe<ResolversTypes['RichText']>, products: ResolversTypes['CollectionProductConnection'] }>;
  CollectionAddProductsInput: CollectionAddProductsInput;
  CollectionAddProductsPayload: ResolverTypeWrapper<Omit<CollectionAddProductsPayload, 'collection'> & { collection?: Maybe<ResolversTypes['Collection']> }>;
  CollectionConnection: ResolverTypeWrapper<Omit<CollectionConnection, 'edges'> & { edges: Array<ResolversTypes['CollectionEdge']> }>;
  CollectionCreateInput: CollectionCreateInput;
  CollectionCreatePayload: ResolverTypeWrapper<Omit<CollectionCreatePayload, 'collection'> & { collection?: Maybe<ResolversTypes['Collection']> }>;
  CollectionDeleteInput: CollectionDeleteInput;
  CollectionDeletePayload: ResolverTypeWrapper<CollectionDeletePayload>;
  CollectionEdge: ResolverTypeWrapper<Omit<CollectionEdge, 'node'> & { node: ResolversTypes['Collection'] }>;
  CollectionMediaInput: CollectionMediaInput;
  CollectionMediaItem: ResolverTypeWrapper<CollectionMediaItem>;
  CollectionMoveProductInput: CollectionMoveProductInput;
  CollectionMoveProductPayload: ResolverTypeWrapper<Omit<CollectionMoveProductPayload, 'collection'> & { collection?: Maybe<ResolversTypes['Collection']> }>;
  CollectionProductConnection: ResolverTypeWrapper<Omit<CollectionProductConnection, 'edges'> & { edges: Array<ResolversTypes['CollectionProductEdge']> }>;
  CollectionProductEdge: ResolverTypeWrapper<Omit<CollectionProductEdge, 'node'> & { node: ResolversTypes['Product'] }>;
  CollectionRemoveProductsInput: CollectionRemoveProductsInput;
  CollectionRemoveProductsPayload: ResolverTypeWrapper<Omit<CollectionRemoveProductsPayload, 'collection'> & { collection?: Maybe<ResolversTypes['Collection']> }>;
  CollectionRule: ResolverTypeWrapper<CollectionRule>;
  CollectionRuleInput: CollectionRuleInput;
  CollectionType: CollectionType;
  CollectionUpdateInput: CollectionUpdateInput;
  CollectionUpdatePayload: ResolverTypeWrapper<Omit<CollectionUpdatePayload, 'collection'> & { collection?: Maybe<ResolversTypes['Collection']> }>;
  CollectionUpdateRulesInput: CollectionUpdateRulesInput;
  CollectionUpdateRulesPayload: ResolverTypeWrapper<Omit<CollectionUpdateRulesPayload, 'collection'> & { collection?: Maybe<ResolversTypes['Collection']> }>;
  CurrencyCode: CurrencyCode;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DateTimeFilter: DateTimeFilter;
  DimensionUnit: DimensionUnit;
  DimensionsInput: DimensionsInput;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  Facet: ResolverTypeWrapper<Facet>;
  FacetCreateInput: FacetCreateInput;
  FacetCreatePayload: ResolverTypeWrapper<FacetCreatePayload>;
  FacetDeleteInput: FacetDeleteInput;
  FacetDeletePayload: ResolverTypeWrapper<FacetDeletePayload>;
  FacetGroup: ResolverTypeWrapper<FacetGroup>;
  FacetGroupCreateInput: FacetGroupCreateInput;
  FacetGroupCreatePayload: ResolverTypeWrapper<FacetGroupCreatePayload>;
  FacetGroupDeleteInput: FacetGroupDeleteInput;
  FacetGroupDeletePayload: ResolverTypeWrapper<FacetGroupDeletePayload>;
  FacetGroupUpdateInput: FacetGroupUpdateInput;
  FacetGroupUpdatePayload: ResolverTypeWrapper<FacetGroupUpdatePayload>;
  FacetSelectionMode: FacetSelectionMode;
  FacetSwatch: ResolverTypeWrapper<FacetSwatch>;
  FacetSwatchCreateInput: FacetSwatchCreateInput;
  FacetSwatchCreatePayload: ResolverTypeWrapper<FacetSwatchCreatePayload>;
  FacetSwatchDeleteInput: FacetSwatchDeleteInput;
  FacetSwatchDeletePayload: ResolverTypeWrapper<FacetSwatchDeletePayload>;
  FacetSwatchUpdateInput: FacetSwatchUpdateInput;
  FacetSwatchUpdatePayload: ResolverTypeWrapper<FacetSwatchUpdatePayload>;
  FacetType: FacetType;
  FacetUIType: FacetUiType;
  FacetUpdateInput: FacetUpdateInput;
  FacetUpdatePayload: ResolverTypeWrapper<FacetUpdatePayload>;
  FacetValue: ResolverTypeWrapper<FacetValue>;
  FacetValueCreateInput: FacetValueCreateInput;
  FacetValueCreatePayload: ResolverTypeWrapper<FacetValueCreatePayload>;
  FacetValueDeleteInput: FacetValueDeleteInput;
  FacetValueDeletePayload: ResolverTypeWrapper<FacetValueDeletePayload>;
  FacetValueUpdateInput: FacetValueUpdateInput;
  FacetValueUpdatePayload: ResolverTypeWrapper<FacetValueUpdatePayload>;
  File: ResolverTypeWrapper<File>;
  FloatFilter: FloatFilter;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  InventoryAlertThreshold: ResolverTypeWrapper<InventoryAlertThreshold>;
  InventoryBackorder: ResolverTypeWrapper<InventoryBackorder>;
  InventoryItem: ResolverTypeWrapper<Omit<InventoryItem, 'stock' | 'variant'> & { stock: Array<ResolversTypes['WarehouseStock']>, variant: ResolversTypes['Variant'] }>;
  InventoryItemConnection: ResolverTypeWrapper<Omit<InventoryItemConnection, 'edges'> & { edges: Array<ResolversTypes['InventoryItemEdge']> }>;
  InventoryItemCost: ResolverTypeWrapper<InventoryItemCost>;
  InventoryItemCostInput: InventoryItemCostInput;
  InventoryItemEdge: ResolverTypeWrapper<Omit<InventoryItemEdge, 'node'> & { node: ResolversTypes['InventoryItem'] }>;
  InventoryItemInput: InventoryItemInput;
  InventoryItemInventoryItemsMetaInput: InventoryItemInventoryItemsMetaInput;
  InventoryItemOrderByInput: InventoryItemOrderByInput;
  InventoryItemOrderField: InventoryItemOrderField;
  InventoryItemStockInput: InventoryItemStockInput;
  InventoryItemUpdateInput: InventoryItemUpdateInput;
  InventoryItemUpdatePayload: ResolverTypeWrapper<Omit<InventoryItemUpdatePayload, 'inventoryItem'> & { inventoryItem?: Maybe<ResolversTypes['InventoryItem']> }>;
  InventoryItemWarehouseScopeInput: InventoryItemWarehouseScopeInput;
  InventoryItemWarehouseScopeMode: InventoryItemWarehouseScopeMode;
  InventoryItemWhereInput: InventoryItemWhereInput;
  InventoryMutation: ResolverTypeWrapper<Omit<InventoryMutation, 'inventoryItemUpdate' | 'warehouseCreate' | 'warehouseStockCreate' | 'warehouseUpdate'> & { inventoryItemUpdate: ResolversTypes['InventoryItemUpdatePayload'], warehouseCreate: ResolversTypes['WarehouseCreatePayload'], warehouseStockCreate: ResolversTypes['WarehouseStockCreatePayload'], warehouseUpdate: ResolversTypes['WarehouseUpdatePayload'] }>;
  InventoryQuantities: ResolverTypeWrapper<InventoryQuantities>;
  InventoryQuery: ResolverTypeWrapper<Omit<InventoryQuery, 'inventoryItem' | 'inventoryItemByVariant' | 'inventoryItems' | 'node' | 'nodes' | 'warehouse' | 'warehouseAssignableVariants' | 'warehouses'> & { inventoryItem?: Maybe<ResolversTypes['InventoryItem']>, inventoryItemByVariant?: Maybe<ResolversTypes['InventoryItem']>, inventoryItems: ResolversTypes['InventoryItemConnection'], node?: Maybe<ResolversTypes['Node']>, nodes: Array<Maybe<ResolversTypes['Node']>>, warehouse?: Maybe<ResolversTypes['Warehouse']>, warehouseAssignableVariants: ResolversTypes['VariantConnection'], warehouses: ResolversTypes['WarehouseConnection'] }>;
  InventorySkuStatus: ResolverTypeWrapper<InventorySkuStatus>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Listing: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Listing']>;
  ListingConnection: ResolverTypeWrapper<Omit<ListingConnection, 'edges'> & { edges: Array<ResolversTypes['ListingEdge']> }>;
  ListingEdge: ResolverTypeWrapper<Omit<ListingEdge, 'node'> & { node: ResolversTypes['Listing'] }>;
  ListingOrderByInput: ListingOrderByInput;
  ListingOrderField: ListingOrderField;
  ListingWhereInput: ListingWhereInput;
  LocaleCode: LocaleCode;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  OperationResult: ResolverTypeWrapper<OperationResult>;
  OperationType: OperationType;
  OptionDisplayType: OptionDisplayType;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PricingWidgetInput: PricingWidgetInput;
  PricingWidgetPayload: ResolverTypeWrapper<PricingWidgetPayload>;
  Product: ResolverTypeWrapper<Omit<Product, 'categoryAssignments' | 'description' | 'excerpt' | 'primaryCategory' | 'variants'> & { categoryAssignments: Array<ResolversTypes['ProductCategoryAssignment']>, description?: Maybe<ResolversTypes['RichText']>, excerpt?: Maybe<ResolversTypes['RichText']>, primaryCategory?: Maybe<ResolversTypes['Category']>, variants: ResolversTypes['VariantConnection'] }>;
  ProductBulkUpdateInput: ProductBulkUpdateInput;
  ProductBulkUpdateItem: ProductBulkUpdateItem;
  ProductBulkUpdateJob: ResolverTypeWrapper<ProductBulkUpdateJob>;
  ProductBulkUpdateJobConnection: ResolverTypeWrapper<ProductBulkUpdateJobConnection>;
  ProductBulkUpdateJobEdge: ResolverTypeWrapper<ProductBulkUpdateJobEdge>;
  ProductBulkUpdatePayload: ResolverTypeWrapper<ProductBulkUpdatePayload>;
  ProductCategoriesScopeInput: ProductCategoriesScopeInput;
  ProductCategoryAssignment: ResolverTypeWrapper<Omit<ProductCategoryAssignment, 'category'> & { category: ResolversTypes['Category'] }>;
  ProductCategoryOperationAction: ProductCategoryOperationAction;
  ProductCategoryOperationInput: ProductCategoryOperationInput;
  ProductConnection: ResolverTypeWrapper<Omit<ProductConnection, 'edges'> & { edges: Array<ResolversTypes['ProductEdge']> }>;
  ProductContentInput: ProductContentInput;
  ProductCreateInput: ProductCreateInput;
  ProductCreateOptionInput: ProductCreateOptionInput;
  ProductCreateOptionValueInput: ProductCreateOptionValueInput;
  ProductCreatePayload: ResolverTypeWrapper<Omit<ProductCreatePayload, 'product'> & { product?: Maybe<ResolversTypes['Product']> }>;
  ProductCreateVariantInput: ProductCreateVariantInput;
  ProductDeleteInput: ProductDeleteInput;
  ProductDeletePayload: ResolverTypeWrapper<ProductDeletePayload>;
  ProductEdge: ResolverTypeWrapper<Omit<ProductEdge, 'node'> & { node: ResolversTypes['Product'] }>;
  ProductFeature: ResolverTypeWrapper<ProductFeature>;
  ProductFeatureCreateInput: ProductFeatureCreateInput;
  ProductFeatureCreatePayload: ResolverTypeWrapper<Omit<ProductFeatureCreatePayload, 'product'> & { product?: Maybe<ResolversTypes['Product']> }>;
  ProductFeatureDeleteInput: ProductFeatureDeleteInput;
  ProductFeatureDeletePayload: ResolverTypeWrapper<Omit<ProductFeatureDeletePayload, 'product'> & { product?: Maybe<ResolversTypes['Product']> }>;
  ProductFeatureInput: ProductFeatureInput;
  ProductFeatureSyncItemInput: ProductFeatureSyncItemInput;
  ProductFeatureUpdateInput: ProductFeatureUpdateInput;
  ProductFeatureUpdatePayload: ResolverTypeWrapper<Omit<ProductFeatureUpdatePayload, 'product'> & { product?: Maybe<ResolversTypes['Product']> }>;
  ProductFeatureValue: ResolverTypeWrapper<ProductFeatureValue>;
  ProductFeatureValueCreateInput: ProductFeatureValueCreateInput;
  ProductFeatureValueSyncInput: ProductFeatureValueSyncInput;
  ProductFeatureValueUpdateInput: ProductFeatureValueUpdateInput;
  ProductFeatureValuesInput: ProductFeatureValuesInput;
  ProductFeaturesSyncInput: ProductFeaturesSyncInput;
  ProductFeaturesSyncPayload: ResolverTypeWrapper<Omit<ProductFeaturesSyncPayload, 'product'> & { product?: Maybe<ResolversTypes['Product']> }>;
  ProductInventoryWidget: ResolverTypeWrapper<ProductInventoryWidget>;
  ProductKind: ProductKind;
  ProductMediaInput: ProductMediaInput;
  ProductMediaItem: ResolverTypeWrapper<ProductMediaItem>;
  ProductOption: ResolverTypeWrapper<ProductOption>;
  ProductOptionCreateInput: ProductOptionCreateInput;
  ProductOptionCreatePayload: ResolverTypeWrapper<Omit<ProductOptionCreatePayload, 'product'> & { product?: Maybe<ResolversTypes['Product']> }>;
  ProductOptionDeleteInput: ProductOptionDeleteInput;
  ProductOptionDeletePayload: ResolverTypeWrapper<Omit<ProductOptionDeletePayload, 'product'> & { product?: Maybe<ResolversTypes['Product']> }>;
  ProductOptionSwatch: ResolverTypeWrapper<ProductOptionSwatch>;
  ProductOptionSwatchInput: ProductOptionSwatchInput;
  ProductOptionSyncItemInput: ProductOptionSyncItemInput;
  ProductOptionUpdateInput: ProductOptionUpdateInput;
  ProductOptionUpdatePayload: ResolverTypeWrapper<Omit<ProductOptionUpdatePayload, 'product'> & { product?: Maybe<ResolversTypes['Product']> }>;
  ProductOptionValue: ResolverTypeWrapper<ProductOptionValue>;
  ProductOptionValueCreateInput: ProductOptionValueCreateInput;
  ProductOptionValueSyncInput: ProductOptionValueSyncInput;
  ProductOptionValueUpdateInput: ProductOptionValueUpdateInput;
  ProductOptionValuesInput: ProductOptionValuesInput;
  ProductOptionsSyncInput: ProductOptionsSyncInput;
  ProductOptionsSyncPayload: ResolverTypeWrapper<Omit<ProductOptionsSyncPayload, 'product'> & { product?: Maybe<ResolversTypes['Product']> }>;
  ProductOrderByInput: ProductOrderByInput;
  ProductOrderField: ProductOrderField;
  ProductPriceRange: ResolverTypeWrapper<ProductPriceRange>;
  ProductProductsMetaInput: ProductProductsMetaInput;
  ProductSeo: ResolverTypeWrapper<ProductSeo>;
  ProductSeoInput: ProductSeoInput;
  ProductSortBy: ProductSortBy;
  ProductSortInput: ProductSortInput;
  ProductStatus: ProductStatus;
  ProductStatusAction: ProductStatusAction;
  ProductTagOperationAction: ProductTagOperationAction;
  ProductTagOperationInput: ProductTagOperationInput;
  ProductUpdateInput: ProductUpdateInput;
  ProductUpdatePayload: ResolverTypeWrapper<Omit<ProductUpdatePayload, 'product'> & { product?: Maybe<ResolversTypes['Product']> }>;
  ProductUpdateStatusInput: ProductUpdateStatusInput;
  ProductUpdateStatusPayload: ResolverTypeWrapper<Omit<ProductUpdateStatusPayload, 'product'> & { product?: Maybe<ResolversTypes['Product']> }>;
  ProductWhereInput: ProductWhereInput;
  Query: ResolverTypeWrapper<{}>;
  RichText: ResolverTypeWrapper<RichText>;
  RichTextInput: RichTextInput;
  SelectedOption: ResolverTypeWrapper<SelectedOption>;
  SelectedOptionInput: SelectedOptionInput;
  Seo: ResolverTypeWrapper<Seo>;
  SeoInput: SeoInput;
  SkuStatusMetric: ResolverTypeWrapper<SkuStatusMetric>;
  SortDirection: SortDirection;
  StringFilter: StringFilter;
  SwatchType: SwatchType;
  Tag: ResolverTypeWrapper<Tag>;
  TagConnection: ResolverTypeWrapper<TagConnection>;
  TagCreateInput: TagCreateInput;
  TagCreatePayload: ResolverTypeWrapper<TagCreatePayload>;
  TagDeleteInput: TagDeleteInput;
  TagDeletePayload: ResolverTypeWrapper<TagDeletePayload>;
  TagEdge: ResolverTypeWrapper<TagEdge>;
  TagOrderByInput: TagOrderByInput;
  TagOrderField: TagOrderField;
  TagUpdateInput: TagUpdateInput;
  TagUpdatePayload: ResolverTypeWrapper<TagUpdatePayload>;
  TagWhereInput: TagWhereInput;
  ThresholdMethod: ThresholdMethod;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  Variant: ResolverTypeWrapper<Omit<Variant, 'bundleConfiguration' | 'inventoryItem' | 'product'> & { bundleConfiguration?: Maybe<ResolversTypes['BundleConfiguration']>, inventoryItem?: Maybe<ResolversTypes['InventoryItem']>, product: ResolversTypes['Product'] }>;
  VariantConnection: ResolverTypeWrapper<Omit<VariantConnection, 'edges'> & { edges: Array<ResolversTypes['VariantEdge']> }>;
  VariantCost: ResolverTypeWrapper<VariantCost>;
  VariantCostConnection: ResolverTypeWrapper<VariantCostConnection>;
  VariantCostEdge: ResolverTypeWrapper<VariantCostEdge>;
  VariantCreateInput: VariantCreateInput;
  VariantCreatePayload: ResolverTypeWrapper<Omit<VariantCreatePayload, 'variant'> & { variant?: Maybe<ResolversTypes['Variant']> }>;
  VariantDeleteInput: VariantDeleteInput;
  VariantDeletePayload: ResolverTypeWrapper<Omit<VariantDeletePayload, 'product'> & { product?: Maybe<ResolversTypes['Product']> }>;
  VariantDimensions: ResolverTypeWrapper<VariantDimensions>;
  VariantDimensionsOpInput: VariantDimensionsOpInput;
  VariantEdge: ResolverTypeWrapper<Omit<VariantEdge, 'node'> & { node: ResolversTypes['Variant'] }>;
  VariantInput: VariantInput;
  VariantInventoryOpInput: VariantInventoryOpInput;
  VariantMediaItem: ResolverTypeWrapper<VariantMediaItem>;
  VariantMediaOpInput: VariantMediaOpInput;
  VariantOperationAction: VariantOperationAction;
  VariantOperationInput: VariantOperationInput;
  VariantOptionLinkInput: VariantOptionLinkInput;
  VariantOptionsOpInput: VariantOptionsOpInput;
  VariantOrderByInput: VariantOrderByInput;
  VariantOrderField: VariantOrderField;
  VariantPrice: ResolverTypeWrapper<VariantPrice>;
  VariantPriceConnection: ResolverTypeWrapper<VariantPriceConnection>;
  VariantPriceEdge: ResolverTypeWrapper<VariantPriceEdge>;
  VariantPriceHistoryStatistics: ResolverTypeWrapper<VariantPriceHistoryStatistics>;
  VariantPricingOpInput: VariantPricingOpInput;
  VariantUpdateMediaInput: VariantUpdateMediaInput;
  VariantUpdateMediaPayload: ResolverTypeWrapper<Omit<VariantUpdateMediaPayload, 'variant'> & { variant?: Maybe<ResolversTypes['Variant']> }>;
  VariantUpdateOptionsInput: VariantUpdateOptionsInput;
  VariantUpdateOptionsPayload: ResolverTypeWrapper<Omit<VariantUpdateOptionsPayload, 'variant'> & { variant?: Maybe<ResolversTypes['Variant']> }>;
  VariantUpdatePricingInput: VariantUpdatePricingInput;
  VariantUpdatePricingPayload: ResolverTypeWrapper<Omit<VariantUpdatePricingPayload, 'variant'> & { variant?: Maybe<ResolversTypes['Variant']> }>;
  VariantWeight: ResolverTypeWrapper<VariantWeight>;
  VariantWhereInput: VariantWhereInput;
  Vendor: ResolverTypeWrapper<Vendor>;
  VendorConnection: ResolverTypeWrapper<VendorConnection>;
  VendorCreateInput: VendorCreateInput;
  VendorCreatePayload: ResolverTypeWrapper<VendorCreatePayload>;
  VendorEdge: ResolverTypeWrapper<VendorEdge>;
  VendorOrderByInput: VendorOrderByInput;
  VendorOrderField: VendorOrderField;
  VendorWhereInput: VendorWhereInput;
  Warehouse: ResolverTypeWrapper<Omit<Warehouse, 'stock'> & { stock: ResolversTypes['WarehouseStockConnection'] }>;
  WarehouseAssignableVariantOrderByInput: WarehouseAssignableVariantOrderByInput;
  WarehouseAssignableVariantOrderField: WarehouseAssignableVariantOrderField;
  WarehouseAssignableVariantWhereInput: WarehouseAssignableVariantWhereInput;
  WarehouseConnection: ResolverTypeWrapper<Omit<WarehouseConnection, 'edges'> & { edges: Array<ResolversTypes['WarehouseEdge']> }>;
  WarehouseConnectionInput: WarehouseConnectionInput;
  WarehouseCreateInput: WarehouseCreateInput;
  WarehouseCreatePayload: ResolverTypeWrapper<Omit<WarehouseCreatePayload, 'warehouse'> & { warehouse?: Maybe<ResolversTypes['Warehouse']> }>;
  WarehouseDeleteInput: WarehouseDeleteInput;
  WarehouseDeletePayload: ResolverTypeWrapper<WarehouseDeletePayload>;
  WarehouseEdge: ResolverTypeWrapper<Omit<WarehouseEdge, 'node'> & { node: ResolversTypes['Warehouse'] }>;
  WarehouseOrderByInput: WarehouseOrderByInput;
  WarehouseOrderField: WarehouseOrderField;
  WarehouseStock: ResolverTypeWrapper<Omit<WarehouseStock, 'variant' | 'warehouse'> & { variant: ResolversTypes['Variant'], warehouse: ResolversTypes['Warehouse'] }>;
  WarehouseStockConnection: ResolverTypeWrapper<Omit<WarehouseStockConnection, 'edges'> & { edges: Array<ResolversTypes['WarehouseStockEdge']> }>;
  WarehouseStockConnectionInput: WarehouseStockConnectionInput;
  WarehouseStockCreateInput: WarehouseStockCreateInput;
  WarehouseStockCreateItemInput: WarehouseStockCreateItemInput;
  WarehouseStockCreatePayload: ResolverTypeWrapper<Omit<WarehouseStockCreatePayload, 'warehouseStocks'> & { warehouseStocks: Array<ResolversTypes['WarehouseStock']> }>;
  WarehouseStockDeleteInput: WarehouseStockDeleteInput;
  WarehouseStockDeleteItemInput: WarehouseStockDeleteItemInput;
  WarehouseStockDeletePayload: ResolverTypeWrapper<WarehouseStockDeletePayload>;
  WarehouseStockEdge: ResolverTypeWrapper<Omit<WarehouseStockEdge, 'node'> & { node: ResolversTypes['WarehouseStock'] }>;
  WarehouseStockOrderByInput: WarehouseStockOrderByInput;
  WarehouseStockOrderField: WarehouseStockOrderField;
  WarehouseStockWhereInput: WarehouseStockWhereInput;
  WarehouseUpdateInput: WarehouseUpdateInput;
  WarehouseUpdatePayload: ResolverTypeWrapper<Omit<WarehouseUpdatePayload, 'warehouse'> & { warehouse?: Maybe<ResolversTypes['Warehouse']> }>;
  WarehouseWhereInput: WarehouseWhereInput;
  WeightInput: WeightInput;
  WeightUnit: WeightUnit;
  WidgetQuery: ResolverTypeWrapper<WidgetQuery>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BigInt: Scalars['BigInt']['output'];
  BooleanFilter: BooleanFilter;
  Boolean: Scalars['Boolean']['output'];
  BulkUpdateItem: BulkUpdateItem;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  BulkUpdateItemConnection: BulkUpdateItemConnection;
  BulkUpdateItemEdge: BulkUpdateItemEdge;
  String: Scalars['String']['output'];
  BulkUpdateJobProgress: BulkUpdateJobProgress;
  BulkUpdateUserError: BulkUpdateUserError;
  Bundle: Omit<Bundle, 'categoryAssignments' | 'configurations' | 'description' | 'excerpt' | 'primaryCategory' | 'variants'> & { categoryAssignments: Array<ResolversParentTypes['ProductCategoryAssignment']>, configurations: Array<ResolversParentTypes['BundleConfiguration']>, description?: Maybe<ResolversParentTypes['RichText']>, excerpt?: Maybe<ResolversParentTypes['RichText']>, primaryCategory?: Maybe<ResolversParentTypes['Category']>, variants: ResolversParentTypes['VariantConnection'] };
  BundleBasePriceRule: BundleBasePriceRule;
  BundleBundlesMetaInput: BundleBundlesMetaInput;
  BundleCondition: BundleCondition;
  BundleConditionGroup: BundleConditionGroup;
  BundleConditionGroupSyncItemInput: BundleConditionGroupSyncItemInput;
  BundleConditionSyncItemInput: BundleConditionSyncItemInput;
  BundleConfiguration: Omit<BundleConfiguration, 'bundle' | 'dependencyRules' | 'groups' | 'pricingTemplates' | 'variants'> & { bundle: ResolversParentTypes['Bundle'], dependencyRules: Array<ResolversParentTypes['BundleDependencyRule']>, groups: Array<ResolversParentTypes['BundleGroup']>, pricingTemplates: Array<ResolversParentTypes['BundlePricingTemplate']>, variants: Array<ResolversParentTypes['Variant']> };
  BundleConfigurationCreateInput: BundleConfigurationCreateInput;
  BundleConfigurationDeleteInput: BundleConfigurationDeleteInput;
  BundleConfigurationDeletePayload: Omit<BundleConfigurationDeletePayload, 'bundle'> & { bundle?: Maybe<ResolversParentTypes['Bundle']> };
  BundleConfigurationPayload: Omit<BundleConfigurationPayload, 'configuration'> & { configuration?: Maybe<ResolversParentTypes['BundleConfiguration']> };
  BundleConfigurationUpdateInput: BundleConfigurationUpdateInput;
  BundleConnection: Omit<BundleConnection, 'edges'> & { edges: Array<ResolversParentTypes['BundleEdge']> };
  BundleCreateInput: BundleCreateInput;
  BundleCreatePayload: Omit<BundleCreatePayload, 'bundle'> & { bundle?: Maybe<ResolversParentTypes['Bundle']> };
  BundleDependencyAction: Omit<BundleDependencyAction, 'priceRule'> & { priceRule?: Maybe<ResolversParentTypes['BundlePriceRule']> };
  BundleDependencyActionSyncItemInput: BundleDependencyActionSyncItemInput;
  BundleDependencyRule: Omit<BundleDependencyRule, 'actions'> & { actions: Array<ResolversParentTypes['BundleDependencyAction']> };
  BundleDependencyRuleSyncItemInput: BundleDependencyRuleSyncItemInput;
  BundleDependencyRulesSyncInput: BundleDependencyRulesSyncInput;
  BundleDependencyRulesSyncPayload: Omit<BundleDependencyRulesSyncPayload, 'configuration' | 'dependencyRules'> & { configuration?: Maybe<ResolversParentTypes['BundleConfiguration']>, dependencyRules: Array<ResolversParentTypes['BundleDependencyRule']> };
  BundleDiscountFixedPriceRule: BundleDiscountFixedPriceRule;
  BundleDiscountPercentPriceRule: BundleDiscountPercentPriceRule;
  BundleEdge: Omit<BundleEdge, 'node'> & { node: ResolversParentTypes['Bundle'] };
  BundleFixedPriceRule: BundleFixedPriceRule;
  BundleFreePriceRule: BundleFreePriceRule;
  BundleGroup: Omit<BundleGroup, 'items'> & { items: Array<ResolversParentTypes['BundleItem']> };
  BundleGroupSyncItemInput: BundleGroupSyncItemInput;
  BundleGroupsSyncInput: BundleGroupsSyncInput;
  BundleGroupsSyncPayload: Omit<BundleGroupsSyncPayload, 'configuration' | 'groups'> & { configuration?: Maybe<ResolversParentTypes['BundleConfiguration']>, groups: Array<ResolversParentTypes['BundleGroup']> };
  BundleItem: Omit<BundleItem, 'group' | 'priceRule' | 'pricingTemplate' | 'refProduct' | 'refVariant'> & { group: ResolversParentTypes['BundleGroup'], priceRule?: Maybe<ResolversParentTypes['BundlePriceRule']>, pricingTemplate?: Maybe<ResolversParentTypes['BundlePricingTemplate']>, refProduct?: Maybe<ResolversParentTypes['Product']>, refVariant?: Maybe<ResolversParentTypes['Variant']> };
  BundleItemOptionSelection: BundleItemOptionSelection;
  BundleItemOptionSelectionSyncItemInput: BundleItemOptionSelectionSyncItemInput;
  BundleItemOptionValueSelection: BundleItemOptionValueSelection;
  BundleItemOptionValueSelectionSyncItemInput: BundleItemOptionValueSelectionSyncItemInput;
  BundleItemSyncItemInput: BundleItemSyncItemInput;
  BundleOrderByInput: BundleOrderByInput;
  BundlePriceRule: ResolversInterfaceTypes<ResolversParentTypes>['BundlePriceRule'];
  BundlePriceRuleAmount: BundlePriceRuleAmount;
  BundlePriceRuleAmountInput: BundlePriceRuleAmountInput;
  BundlePriceRuleInput: BundlePriceRuleInput;
  BundlePriceRulePercent: BundlePriceRulePercent;
  BundlePriceRulePercentInput: BundlePriceRulePercentInput;
  BundlePricingTemplate: Omit<BundlePricingTemplate, 'priceRule'> & { priceRule: ResolversParentTypes['BundlePriceRule'] };
  BundlePricingTemplateSyncItemInput: BundlePricingTemplateSyncItemInput;
  BundlePricingTemplatesSyncInput: BundlePricingTemplatesSyncInput;
  BundlePricingTemplatesSyncPayload: Omit<BundlePricingTemplatesSyncPayload, 'configuration' | 'pricingTemplates'> & { configuration?: Maybe<ResolversParentTypes['BundleConfiguration']>, pricingTemplates: Array<ResolversParentTypes['BundlePricingTemplate']> };
  BundleUpdateInput: BundleUpdateInput;
  BundleUpdatePayload: Omit<BundleUpdatePayload, 'bundle'> & { bundle?: Maybe<ResolversParentTypes['Bundle']> };
  BundleWhereInput: BundleWhereInput;
  CatalogMutation: Omit<CatalogMutation, 'bundleConfigurationCreate' | 'bundleConfigurationDelete' | 'bundleConfigurationUpdate' | 'bundleCreate' | 'bundleDependencyRulesSync' | 'bundleGroupsSync' | 'bundlePricingTemplatesSync' | 'bundleUpdate' | 'categoryCreate' | 'categoryMove' | 'categoryRebalance' | 'categoryUpdate' | 'collectionAddProducts' | 'collectionCreate' | 'collectionMoveProduct' | 'collectionRemoveProducts' | 'collectionUpdate' | 'collectionUpdateRules' | 'productCreate' | 'productFeatureCreate' | 'productFeatureDelete' | 'productFeatureUpdate' | 'productFeaturesSync' | 'productOptionCreate' | 'productOptionDelete' | 'productOptionUpdate' | 'productOptionsSync' | 'productUpdate' | 'productUpdateStatus' | 'variantCreate' | 'variantDelete' | 'variantUpdateMedia' | 'variantUpdateOptions' | 'variantUpdatePricing'> & { bundleConfigurationCreate: ResolversParentTypes['BundleConfigurationPayload'], bundleConfigurationDelete: ResolversParentTypes['BundleConfigurationDeletePayload'], bundleConfigurationUpdate: ResolversParentTypes['BundleConfigurationPayload'], bundleCreate: ResolversParentTypes['BundleCreatePayload'], bundleDependencyRulesSync: ResolversParentTypes['BundleDependencyRulesSyncPayload'], bundleGroupsSync: ResolversParentTypes['BundleGroupsSyncPayload'], bundlePricingTemplatesSync: ResolversParentTypes['BundlePricingTemplatesSyncPayload'], bundleUpdate: ResolversParentTypes['BundleUpdatePayload'], categoryCreate: ResolversParentTypes['CategoryCreatePayload'], categoryMove: ResolversParentTypes['CategoryMovePayload'], categoryRebalance: ResolversParentTypes['CategoryRebalancePayload'], categoryUpdate: ResolversParentTypes['CategoryUpdatePayload'], collectionAddProducts: ResolversParentTypes['CollectionAddProductsPayload'], collectionCreate: ResolversParentTypes['CollectionCreatePayload'], collectionMoveProduct: ResolversParentTypes['CollectionMoveProductPayload'], collectionRemoveProducts: ResolversParentTypes['CollectionRemoveProductsPayload'], collectionUpdate: ResolversParentTypes['CollectionUpdatePayload'], collectionUpdateRules: ResolversParentTypes['CollectionUpdateRulesPayload'], productCreate: ResolversParentTypes['ProductCreatePayload'], productFeatureCreate: ResolversParentTypes['ProductFeatureCreatePayload'], productFeatureDelete: ResolversParentTypes['ProductFeatureDeletePayload'], productFeatureUpdate: ResolversParentTypes['ProductFeatureUpdatePayload'], productFeaturesSync: ResolversParentTypes['ProductFeaturesSyncPayload'], productOptionCreate: ResolversParentTypes['ProductOptionCreatePayload'], productOptionDelete: ResolversParentTypes['ProductOptionDeletePayload'], productOptionUpdate: ResolversParentTypes['ProductOptionUpdatePayload'], productOptionsSync: ResolversParentTypes['ProductOptionsSyncPayload'], productUpdate: ResolversParentTypes['ProductUpdatePayload'], productUpdateStatus: ResolversParentTypes['ProductUpdateStatusPayload'], variantCreate: ResolversParentTypes['VariantCreatePayload'], variantDelete: ResolversParentTypes['VariantDeletePayload'], variantUpdateMedia: ResolversParentTypes['VariantUpdateMediaPayload'], variantUpdateOptions: ResolversParentTypes['VariantUpdateOptionsPayload'], variantUpdatePricing: ResolversParentTypes['VariantUpdatePricingPayload'] };
  CatalogQuery: Omit<CatalogQuery, 'bundle' | 'bundles' | 'categories' | 'category' | 'collection' | 'collectionByHandle' | 'collections' | 'node' | 'nodes' | 'product' | 'products' | 'variant' | 'variants'> & { bundle?: Maybe<ResolversParentTypes['Bundle']>, bundles: ResolversParentTypes['BundleConnection'], categories: ResolversParentTypes['CategoryConnection'], category?: Maybe<ResolversParentTypes['Category']>, collection?: Maybe<ResolversParentTypes['Collection']>, collectionByHandle?: Maybe<ResolversParentTypes['Collection']>, collections: ResolversParentTypes['CollectionConnection'], node?: Maybe<ResolversParentTypes['Node']>, nodes: Array<Maybe<ResolversParentTypes['Node']>>, product?: Maybe<ResolversParentTypes['Product']>, products: ResolversParentTypes['ProductConnection'], variant?: Maybe<ResolversParentTypes['Variant']>, variants: ResolversParentTypes['VariantConnection'] };
  Category: Omit<Category, 'ancestors' | 'children' | 'description' | 'excerpt' | 'listing' | 'parent'> & { ancestors: Array<ResolversParentTypes['Category']>, children: Array<ResolversParentTypes['Category']>, description?: Maybe<ResolversParentTypes['RichText']>, excerpt?: Maybe<ResolversParentTypes['RichText']>, listing: ResolversParentTypes['ListingConnection'], parent?: Maybe<ResolversParentTypes['Category']> };
  CategoryCategoriesMetaInput: CategoryCategoriesMetaInput;
  CategoryConnection: Omit<CategoryConnection, 'edges'> & { edges: Array<ResolversParentTypes['CategoryEdge']> };
  CategoryContentInput: CategoryContentInput;
  CategoryCreateInput: CategoryCreateInput;
  CategoryCreatePayload: Omit<CategoryCreatePayload, 'category'> & { category?: Maybe<ResolversParentTypes['Category']> };
  CategoryDeleteInput: CategoryDeleteInput;
  CategoryDeletePayload: CategoryDeletePayload;
  CategoryEdge: Omit<CategoryEdge, 'node'> & { node: ResolversParentTypes['Category'] };
  CategoryHierarchyInput: CategoryHierarchyInput;
  CategoryHierarchyScopeInput: CategoryHierarchyScopeInput;
  CategoryMediaInput: CategoryMediaInput;
  CategoryMediaItem: CategoryMediaItem;
  CategoryMoveInput: CategoryMoveInput;
  CategoryMovePayload: Omit<CategoryMovePayload, 'category'> & { category?: Maybe<ResolversParentTypes['Category']> };
  CategoryOrderByInput: CategoryOrderByInput;
  CategoryProductsScopeInput: CategoryProductsScopeInput;
  CategoryRebalanceInput: CategoryRebalanceInput;
  CategoryRebalancePayload: Omit<CategoryRebalancePayload, 'category'> & { category?: Maybe<ResolversParentTypes['Category']> };
  CategorySortInput: CategorySortInput;
  CategoryUpdateInput: CategoryUpdateInput;
  CategoryUpdatePayload: Omit<CategoryUpdatePayload, 'category'> & { category?: Maybe<ResolversParentTypes['Category']> };
  CategoryWhereInput: CategoryWhereInput;
  Collection: Omit<Collection, 'description' | 'excerpt' | 'products'> & { description?: Maybe<ResolversParentTypes['RichText']>, excerpt?: Maybe<ResolversParentTypes['RichText']>, products: ResolversParentTypes['CollectionProductConnection'] };
  CollectionAddProductsInput: CollectionAddProductsInput;
  CollectionAddProductsPayload: Omit<CollectionAddProductsPayload, 'collection'> & { collection?: Maybe<ResolversParentTypes['Collection']> };
  CollectionConnection: Omit<CollectionConnection, 'edges'> & { edges: Array<ResolversParentTypes['CollectionEdge']> };
  CollectionCreateInput: CollectionCreateInput;
  CollectionCreatePayload: Omit<CollectionCreatePayload, 'collection'> & { collection?: Maybe<ResolversParentTypes['Collection']> };
  CollectionDeleteInput: CollectionDeleteInput;
  CollectionDeletePayload: CollectionDeletePayload;
  CollectionEdge: Omit<CollectionEdge, 'node'> & { node: ResolversParentTypes['Collection'] };
  CollectionMediaInput: CollectionMediaInput;
  CollectionMediaItem: CollectionMediaItem;
  CollectionMoveProductInput: CollectionMoveProductInput;
  CollectionMoveProductPayload: Omit<CollectionMoveProductPayload, 'collection'> & { collection?: Maybe<ResolversParentTypes['Collection']> };
  CollectionProductConnection: Omit<CollectionProductConnection, 'edges'> & { edges: Array<ResolversParentTypes['CollectionProductEdge']> };
  CollectionProductEdge: Omit<CollectionProductEdge, 'node'> & { node: ResolversParentTypes['Product'] };
  CollectionRemoveProductsInput: CollectionRemoveProductsInput;
  CollectionRemoveProductsPayload: Omit<CollectionRemoveProductsPayload, 'collection'> & { collection?: Maybe<ResolversParentTypes['Collection']> };
  CollectionRule: CollectionRule;
  CollectionRuleInput: CollectionRuleInput;
  CollectionUpdateInput: CollectionUpdateInput;
  CollectionUpdatePayload: Omit<CollectionUpdatePayload, 'collection'> & { collection?: Maybe<ResolversParentTypes['Collection']> };
  CollectionUpdateRulesInput: CollectionUpdateRulesInput;
  CollectionUpdateRulesPayload: Omit<CollectionUpdateRulesPayload, 'collection'> & { collection?: Maybe<ResolversParentTypes['Collection']> };
  DateTime: Scalars['DateTime']['output'];
  DateTimeFilter: DateTimeFilter;
  DimensionsInput: DimensionsInput;
  Email: Scalars['Email']['output'];
  Facet: Facet;
  FacetCreateInput: FacetCreateInput;
  FacetCreatePayload: FacetCreatePayload;
  FacetDeleteInput: FacetDeleteInput;
  FacetDeletePayload: FacetDeletePayload;
  FacetGroup: FacetGroup;
  FacetGroupCreateInput: FacetGroupCreateInput;
  FacetGroupCreatePayload: FacetGroupCreatePayload;
  FacetGroupDeleteInput: FacetGroupDeleteInput;
  FacetGroupDeletePayload: FacetGroupDeletePayload;
  FacetGroupUpdateInput: FacetGroupUpdateInput;
  FacetGroupUpdatePayload: FacetGroupUpdatePayload;
  FacetSwatch: FacetSwatch;
  FacetSwatchCreateInput: FacetSwatchCreateInput;
  FacetSwatchCreatePayload: FacetSwatchCreatePayload;
  FacetSwatchDeleteInput: FacetSwatchDeleteInput;
  FacetSwatchDeletePayload: FacetSwatchDeletePayload;
  FacetSwatchUpdateInput: FacetSwatchUpdateInput;
  FacetSwatchUpdatePayload: FacetSwatchUpdatePayload;
  FacetUpdateInput: FacetUpdateInput;
  FacetUpdatePayload: FacetUpdatePayload;
  FacetValue: FacetValue;
  FacetValueCreateInput: FacetValueCreateInput;
  FacetValueCreatePayload: FacetValueCreatePayload;
  FacetValueDeleteInput: FacetValueDeleteInput;
  FacetValueDeletePayload: FacetValueDeletePayload;
  FacetValueUpdateInput: FacetValueUpdateInput;
  FacetValueUpdatePayload: FacetValueUpdatePayload;
  File: File;
  FloatFilter: FloatFilter;
  Float: Scalars['Float']['output'];
  GenericUserError: GenericUserError;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  InventoryAlertThreshold: InventoryAlertThreshold;
  InventoryBackorder: InventoryBackorder;
  InventoryItem: Omit<InventoryItem, 'stock' | 'variant'> & { stock: Array<ResolversParentTypes['WarehouseStock']>, variant: ResolversParentTypes['Variant'] };
  InventoryItemConnection: Omit<InventoryItemConnection, 'edges'> & { edges: Array<ResolversParentTypes['InventoryItemEdge']> };
  InventoryItemCost: InventoryItemCost;
  InventoryItemCostInput: InventoryItemCostInput;
  InventoryItemEdge: Omit<InventoryItemEdge, 'node'> & { node: ResolversParentTypes['InventoryItem'] };
  InventoryItemInput: InventoryItemInput;
  InventoryItemInventoryItemsMetaInput: InventoryItemInventoryItemsMetaInput;
  InventoryItemOrderByInput: InventoryItemOrderByInput;
  InventoryItemStockInput: InventoryItemStockInput;
  InventoryItemUpdateInput: InventoryItemUpdateInput;
  InventoryItemUpdatePayload: Omit<InventoryItemUpdatePayload, 'inventoryItem'> & { inventoryItem?: Maybe<ResolversParentTypes['InventoryItem']> };
  InventoryItemWarehouseScopeInput: InventoryItemWarehouseScopeInput;
  InventoryItemWhereInput: InventoryItemWhereInput;
  InventoryMutation: Omit<InventoryMutation, 'inventoryItemUpdate' | 'warehouseCreate' | 'warehouseStockCreate' | 'warehouseUpdate'> & { inventoryItemUpdate: ResolversParentTypes['InventoryItemUpdatePayload'], warehouseCreate: ResolversParentTypes['WarehouseCreatePayload'], warehouseStockCreate: ResolversParentTypes['WarehouseStockCreatePayload'], warehouseUpdate: ResolversParentTypes['WarehouseUpdatePayload'] };
  InventoryQuantities: InventoryQuantities;
  InventoryQuery: Omit<InventoryQuery, 'inventoryItem' | 'inventoryItemByVariant' | 'inventoryItems' | 'node' | 'nodes' | 'warehouse' | 'warehouseAssignableVariants' | 'warehouses'> & { inventoryItem?: Maybe<ResolversParentTypes['InventoryItem']>, inventoryItemByVariant?: Maybe<ResolversParentTypes['InventoryItem']>, inventoryItems: ResolversParentTypes['InventoryItemConnection'], node?: Maybe<ResolversParentTypes['Node']>, nodes: Array<Maybe<ResolversParentTypes['Node']>>, warehouse?: Maybe<ResolversParentTypes['Warehouse']>, warehouseAssignableVariants: ResolversParentTypes['VariantConnection'], warehouses: ResolversParentTypes['WarehouseConnection'] };
  InventorySkuStatus: InventorySkuStatus;
  JSON: Scalars['JSON']['output'];
  Listing: ResolversInterfaceTypes<ResolversParentTypes>['Listing'];
  ListingConnection: Omit<ListingConnection, 'edges'> & { edges: Array<ResolversParentTypes['ListingEdge']> };
  ListingEdge: Omit<ListingEdge, 'node'> & { node: ResolversParentTypes['Listing'] };
  ListingOrderByInput: ListingOrderByInput;
  ListingWhereInput: ListingWhereInput;
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  OperationResult: OperationResult;
  PageInfo: PageInfo;
  PricingWidgetInput: PricingWidgetInput;
  PricingWidgetPayload: PricingWidgetPayload;
  Product: Omit<Product, 'categoryAssignments' | 'description' | 'excerpt' | 'primaryCategory' | 'variants'> & { categoryAssignments: Array<ResolversParentTypes['ProductCategoryAssignment']>, description?: Maybe<ResolversParentTypes['RichText']>, excerpt?: Maybe<ResolversParentTypes['RichText']>, primaryCategory?: Maybe<ResolversParentTypes['Category']>, variants: ResolversParentTypes['VariantConnection'] };
  ProductBulkUpdateInput: ProductBulkUpdateInput;
  ProductBulkUpdateItem: ProductBulkUpdateItem;
  ProductBulkUpdateJob: ProductBulkUpdateJob;
  ProductBulkUpdateJobConnection: ProductBulkUpdateJobConnection;
  ProductBulkUpdateJobEdge: ProductBulkUpdateJobEdge;
  ProductBulkUpdatePayload: ProductBulkUpdatePayload;
  ProductCategoriesScopeInput: ProductCategoriesScopeInput;
  ProductCategoryAssignment: Omit<ProductCategoryAssignment, 'category'> & { category: ResolversParentTypes['Category'] };
  ProductCategoryOperationInput: ProductCategoryOperationInput;
  ProductConnection: Omit<ProductConnection, 'edges'> & { edges: Array<ResolversParentTypes['ProductEdge']> };
  ProductContentInput: ProductContentInput;
  ProductCreateInput: ProductCreateInput;
  ProductCreateOptionInput: ProductCreateOptionInput;
  ProductCreateOptionValueInput: ProductCreateOptionValueInput;
  ProductCreatePayload: Omit<ProductCreatePayload, 'product'> & { product?: Maybe<ResolversParentTypes['Product']> };
  ProductCreateVariantInput: ProductCreateVariantInput;
  ProductDeleteInput: ProductDeleteInput;
  ProductDeletePayload: ProductDeletePayload;
  ProductEdge: Omit<ProductEdge, 'node'> & { node: ResolversParentTypes['Product'] };
  ProductFeature: ProductFeature;
  ProductFeatureCreateInput: ProductFeatureCreateInput;
  ProductFeatureCreatePayload: Omit<ProductFeatureCreatePayload, 'product'> & { product?: Maybe<ResolversParentTypes['Product']> };
  ProductFeatureDeleteInput: ProductFeatureDeleteInput;
  ProductFeatureDeletePayload: Omit<ProductFeatureDeletePayload, 'product'> & { product?: Maybe<ResolversParentTypes['Product']> };
  ProductFeatureInput: ProductFeatureInput;
  ProductFeatureSyncItemInput: ProductFeatureSyncItemInput;
  ProductFeatureUpdateInput: ProductFeatureUpdateInput;
  ProductFeatureUpdatePayload: Omit<ProductFeatureUpdatePayload, 'product'> & { product?: Maybe<ResolversParentTypes['Product']> };
  ProductFeatureValue: ProductFeatureValue;
  ProductFeatureValueCreateInput: ProductFeatureValueCreateInput;
  ProductFeatureValueSyncInput: ProductFeatureValueSyncInput;
  ProductFeatureValueUpdateInput: ProductFeatureValueUpdateInput;
  ProductFeatureValuesInput: ProductFeatureValuesInput;
  ProductFeaturesSyncInput: ProductFeaturesSyncInput;
  ProductFeaturesSyncPayload: Omit<ProductFeaturesSyncPayload, 'product'> & { product?: Maybe<ResolversParentTypes['Product']> };
  ProductInventoryWidget: ProductInventoryWidget;
  ProductMediaInput: ProductMediaInput;
  ProductMediaItem: ProductMediaItem;
  ProductOption: ProductOption;
  ProductOptionCreateInput: ProductOptionCreateInput;
  ProductOptionCreatePayload: Omit<ProductOptionCreatePayload, 'product'> & { product?: Maybe<ResolversParentTypes['Product']> };
  ProductOptionDeleteInput: ProductOptionDeleteInput;
  ProductOptionDeletePayload: Omit<ProductOptionDeletePayload, 'product'> & { product?: Maybe<ResolversParentTypes['Product']> };
  ProductOptionSwatch: ProductOptionSwatch;
  ProductOptionSwatchInput: ProductOptionSwatchInput;
  ProductOptionSyncItemInput: ProductOptionSyncItemInput;
  ProductOptionUpdateInput: ProductOptionUpdateInput;
  ProductOptionUpdatePayload: Omit<ProductOptionUpdatePayload, 'product'> & { product?: Maybe<ResolversParentTypes['Product']> };
  ProductOptionValue: ProductOptionValue;
  ProductOptionValueCreateInput: ProductOptionValueCreateInput;
  ProductOptionValueSyncInput: ProductOptionValueSyncInput;
  ProductOptionValueUpdateInput: ProductOptionValueUpdateInput;
  ProductOptionValuesInput: ProductOptionValuesInput;
  ProductOptionsSyncInput: ProductOptionsSyncInput;
  ProductOptionsSyncPayload: Omit<ProductOptionsSyncPayload, 'product'> & { product?: Maybe<ResolversParentTypes['Product']> };
  ProductOrderByInput: ProductOrderByInput;
  ProductPriceRange: ProductPriceRange;
  ProductProductsMetaInput: ProductProductsMetaInput;
  ProductSeo: ProductSeo;
  ProductSeoInput: ProductSeoInput;
  ProductSortInput: ProductSortInput;
  ProductTagOperationInput: ProductTagOperationInput;
  ProductUpdateInput: ProductUpdateInput;
  ProductUpdatePayload: Omit<ProductUpdatePayload, 'product'> & { product?: Maybe<ResolversParentTypes['Product']> };
  ProductUpdateStatusInput: ProductUpdateStatusInput;
  ProductUpdateStatusPayload: Omit<ProductUpdateStatusPayload, 'product'> & { product?: Maybe<ResolversParentTypes['Product']> };
  ProductWhereInput: ProductWhereInput;
  Query: {};
  RichText: RichText;
  RichTextInput: RichTextInput;
  SelectedOption: SelectedOption;
  SelectedOptionInput: SelectedOptionInput;
  Seo: Seo;
  SeoInput: SeoInput;
  SkuStatusMetric: SkuStatusMetric;
  StringFilter: StringFilter;
  Tag: Tag;
  TagConnection: TagConnection;
  TagCreateInput: TagCreateInput;
  TagCreatePayload: TagCreatePayload;
  TagDeleteInput: TagDeleteInput;
  TagDeletePayload: TagDeletePayload;
  TagEdge: TagEdge;
  TagOrderByInput: TagOrderByInput;
  TagUpdateInput: TagUpdateInput;
  TagUpdatePayload: TagUpdatePayload;
  TagWhereInput: TagWhereInput;
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
  Variant: Omit<Variant, 'bundleConfiguration' | 'inventoryItem' | 'product'> & { bundleConfiguration?: Maybe<ResolversParentTypes['BundleConfiguration']>, inventoryItem?: Maybe<ResolversParentTypes['InventoryItem']>, product: ResolversParentTypes['Product'] };
  VariantConnection: Omit<VariantConnection, 'edges'> & { edges: Array<ResolversParentTypes['VariantEdge']> };
  VariantCost: VariantCost;
  VariantCostConnection: VariantCostConnection;
  VariantCostEdge: VariantCostEdge;
  VariantCreateInput: VariantCreateInput;
  VariantCreatePayload: Omit<VariantCreatePayload, 'variant'> & { variant?: Maybe<ResolversParentTypes['Variant']> };
  VariantDeleteInput: VariantDeleteInput;
  VariantDeletePayload: Omit<VariantDeletePayload, 'product'> & { product?: Maybe<ResolversParentTypes['Product']> };
  VariantDimensions: VariantDimensions;
  VariantDimensionsOpInput: VariantDimensionsOpInput;
  VariantEdge: Omit<VariantEdge, 'node'> & { node: ResolversParentTypes['Variant'] };
  VariantInput: VariantInput;
  VariantInventoryOpInput: VariantInventoryOpInput;
  VariantMediaItem: VariantMediaItem;
  VariantMediaOpInput: VariantMediaOpInput;
  VariantOperationInput: VariantOperationInput;
  VariantOptionLinkInput: VariantOptionLinkInput;
  VariantOptionsOpInput: VariantOptionsOpInput;
  VariantOrderByInput: VariantOrderByInput;
  VariantPrice: VariantPrice;
  VariantPriceConnection: VariantPriceConnection;
  VariantPriceEdge: VariantPriceEdge;
  VariantPriceHistoryStatistics: VariantPriceHistoryStatistics;
  VariantPricingOpInput: VariantPricingOpInput;
  VariantUpdateMediaInput: VariantUpdateMediaInput;
  VariantUpdateMediaPayload: Omit<VariantUpdateMediaPayload, 'variant'> & { variant?: Maybe<ResolversParentTypes['Variant']> };
  VariantUpdateOptionsInput: VariantUpdateOptionsInput;
  VariantUpdateOptionsPayload: Omit<VariantUpdateOptionsPayload, 'variant'> & { variant?: Maybe<ResolversParentTypes['Variant']> };
  VariantUpdatePricingInput: VariantUpdatePricingInput;
  VariantUpdatePricingPayload: Omit<VariantUpdatePricingPayload, 'variant'> & { variant?: Maybe<ResolversParentTypes['Variant']> };
  VariantWeight: VariantWeight;
  VariantWhereInput: VariantWhereInput;
  Vendor: Vendor;
  VendorConnection: VendorConnection;
  VendorCreateInput: VendorCreateInput;
  VendorCreatePayload: VendorCreatePayload;
  VendorEdge: VendorEdge;
  VendorOrderByInput: VendorOrderByInput;
  VendorWhereInput: VendorWhereInput;
  Warehouse: Omit<Warehouse, 'stock'> & { stock: ResolversParentTypes['WarehouseStockConnection'] };
  WarehouseAssignableVariantOrderByInput: WarehouseAssignableVariantOrderByInput;
  WarehouseAssignableVariantWhereInput: WarehouseAssignableVariantWhereInput;
  WarehouseConnection: Omit<WarehouseConnection, 'edges'> & { edges: Array<ResolversParentTypes['WarehouseEdge']> };
  WarehouseConnectionInput: WarehouseConnectionInput;
  WarehouseCreateInput: WarehouseCreateInput;
  WarehouseCreatePayload: Omit<WarehouseCreatePayload, 'warehouse'> & { warehouse?: Maybe<ResolversParentTypes['Warehouse']> };
  WarehouseDeleteInput: WarehouseDeleteInput;
  WarehouseDeletePayload: WarehouseDeletePayload;
  WarehouseEdge: Omit<WarehouseEdge, 'node'> & { node: ResolversParentTypes['Warehouse'] };
  WarehouseOrderByInput: WarehouseOrderByInput;
  WarehouseStock: Omit<WarehouseStock, 'variant' | 'warehouse'> & { variant: ResolversParentTypes['Variant'], warehouse: ResolversParentTypes['Warehouse'] };
  WarehouseStockConnection: Omit<WarehouseStockConnection, 'edges'> & { edges: Array<ResolversParentTypes['WarehouseStockEdge']> };
  WarehouseStockConnectionInput: WarehouseStockConnectionInput;
  WarehouseStockCreateInput: WarehouseStockCreateInput;
  WarehouseStockCreateItemInput: WarehouseStockCreateItemInput;
  WarehouseStockCreatePayload: Omit<WarehouseStockCreatePayload, 'warehouseStocks'> & { warehouseStocks: Array<ResolversParentTypes['WarehouseStock']> };
  WarehouseStockDeleteInput: WarehouseStockDeleteInput;
  WarehouseStockDeleteItemInput: WarehouseStockDeleteItemInput;
  WarehouseStockDeletePayload: WarehouseStockDeletePayload;
  WarehouseStockEdge: Omit<WarehouseStockEdge, 'node'> & { node: ResolversParentTypes['WarehouseStock'] };
  WarehouseStockOrderByInput: WarehouseStockOrderByInput;
  WarehouseStockWhereInput: WarehouseStockWhereInput;
  WarehouseUpdateInput: WarehouseUpdateInput;
  WarehouseUpdatePayload: Omit<WarehouseUpdatePayload, 'warehouse'> & { warehouse?: Maybe<ResolversParentTypes['Warehouse']> };
  WarehouseWhereInput: WarehouseWhereInput;
  WeightInput: WeightInput;
  WidgetQuery: WidgetQuery;
}>;

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type BulkUpdateItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BulkUpdateItem'] = ResolversParentTypes['BulkUpdateItem']> = ResolversObject<{
  cancelReason?: Resolver<Maybe<ResolversTypes['BulkUpdateCancelReason']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['BulkUpdateUserError']>, ParentType, ContextType>;
  finishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  opIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  opType?: Resolver<ResolversTypes['BulkUpdateOpType'], ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['BulkUpdateItemStatus'], ParentType, ContextType>;
  supersededByJobId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  variantId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BulkUpdateItemConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BulkUpdateItemConnection'] = ResolversParentTypes['BulkUpdateItemConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['BulkUpdateItemEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BulkUpdateItemEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BulkUpdateItemEdge'] = ResolversParentTypes['BulkUpdateItemEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['BulkUpdateItem'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BulkUpdateJobProgressResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BulkUpdateJobProgress'] = ResolversParentTypes['BulkUpdateJobProgress']> = ResolversObject<{
  cancelled?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  done?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  failed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pending?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  running?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  succeeded?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  superseded?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BulkUpdateUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BulkUpdateUserError'] = ResolversParentTypes['BulkUpdateUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  operation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  productId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  variantId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Bundle'] = ResolversParentTypes['Bundle']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Bundle']>, { __typename: 'Bundle' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  categoryAssignments?: Resolver<Array<ResolversTypes['ProductCategoryAssignment']>, ParentType, ContextType>;
  configurations?: Resolver<Array<ResolversTypes['BundleConfiguration']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['RichText']>, ParentType, ContextType>;
  displayStyle?: Resolver<ResolversTypes['BundleDisplayStyle'], ParentType, ContextType>;
  excerpt?: Resolver<Maybe<ResolversTypes['RichText']>, ParentType, ContextType>;
  features?: Resolver<Array<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPublished?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ProductKind'], ParentType, ContextType>;
  media?: Resolver<Array<ResolversTypes['ProductMediaItem']>, ParentType, ContextType>;
  options?: Resolver<Array<ResolversTypes['ProductOption']>, ParentType, ContextType>;
  priceRange?: Resolver<Maybe<ResolversTypes['ProductPriceRange']>, ParentType, ContextType>;
  primaryCategory?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  seo?: Resolver<Maybe<ResolversTypes['ProductSeo']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['Tag']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<Maybe<ResolversTypes['BundleType']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variants?: Resolver<ResolversTypes['VariantConnection'], ParentType, ContextType, Partial<BundleVariantsArgs>>;
  variantsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  vendor?: Resolver<Maybe<ResolversTypes['Vendor']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleBasePriceRuleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleBasePriceRule'] = ResolversParentTypes['BundleBasePriceRule']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundleBasePriceRule']>, { __typename: 'BundleBasePriceRule' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  priceType?: Resolver<ResolversTypes['BundlePriceType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleConditionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleCondition'] = ResolversParentTypes['BundleCondition']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundleCondition']>, { __typename: 'BundleCondition' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  category?: Resolver<ResolversTypes['BundleConditionCategory'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  operator?: Resolver<ResolversTypes['BundleConditionOperator'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  subject?: Resolver<ResolversTypes['BundleConditionSubject'], ParentType, ContextType>;
  targetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  targetType?: Resolver<ResolversTypes['BundleDependencyTargetType'], ParentType, ContextType>;
  value?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleConditionGroupResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleConditionGroup'] = ResolversParentTypes['BundleConditionGroup']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundleConditionGroup']>, { __typename: 'BundleConditionGroup' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  conditions?: Resolver<Array<ResolversTypes['BundleCondition']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  logicOperator?: Resolver<ResolversTypes['BundleLogicOperator'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleConfigurationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleConfiguration'] = ResolversParentTypes['BundleConfiguration']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundleConfiguration']>, { __typename: 'BundleConfiguration' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  bundle?: Resolver<ResolversTypes['Bundle'], ParentType, ContextType>;
  bundleId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  dependencyRules?: Resolver<Array<ResolversTypes['BundleDependencyRule']>, ParentType, ContextType>;
  groups?: Resolver<Array<ResolversTypes['BundleGroup']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pricingTemplates?: Resolver<Array<ResolversTypes['BundlePricingTemplate']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variants?: Resolver<Array<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleConfigurationDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleConfigurationDeletePayload'] = ResolversParentTypes['BundleConfigurationDeletePayload']> = ResolversObject<{
  bundle?: Resolver<Maybe<ResolversTypes['Bundle']>, ParentType, ContextType>;
  deletedConfigurationId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleConfigurationPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleConfigurationPayload'] = ResolversParentTypes['BundleConfigurationPayload']> = ResolversObject<{
  configuration?: Resolver<Maybe<ResolversTypes['BundleConfiguration']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleConnection'] = ResolversParentTypes['BundleConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['BundleEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleCreatePayload'] = ResolversParentTypes['BundleCreatePayload']> = ResolversObject<{
  bundle?: Resolver<Maybe<ResolversTypes['Bundle']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleDependencyActionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleDependencyAction'] = ResolversParentTypes['BundleDependencyAction']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundleDependencyAction']>, { __typename: 'BundleDependencyAction' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  actionType?: Resolver<ResolversTypes['BundleDependencyActionType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  priceRule?: Resolver<Maybe<ResolversTypes['BundlePriceRule']>, ParentType, ContextType>;
  requiredValue?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  stackable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  targetId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  targetType?: Resolver<ResolversTypes['BundleDependencyTargetType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleDependencyRuleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleDependencyRule'] = ResolversParentTypes['BundleDependencyRule']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundleDependencyRule']>, { __typename: 'BundleDependencyRule' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  actions?: Resolver<Array<ResolversTypes['BundleDependencyAction']>, ParentType, ContextType>;
  conditionGroups?: Resolver<Array<ResolversTypes['BundleConditionGroup']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  logicOperator?: Resolver<ResolversTypes['BundleLogicOperator'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleDependencyRulesSyncPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleDependencyRulesSyncPayload'] = ResolversParentTypes['BundleDependencyRulesSyncPayload']> = ResolversObject<{
  configuration?: Resolver<Maybe<ResolversTypes['BundleConfiguration']>, ParentType, ContextType>;
  dependencyRules?: Resolver<Array<ResolversTypes['BundleDependencyRule']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleDiscountFixedPriceRuleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleDiscountFixedPriceRule'] = ResolversParentTypes['BundleDiscountFixedPriceRule']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundleDiscountFixedPriceRule']>, { __typename: 'BundleDiscountFixedPriceRule' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  amounts?: Resolver<Array<ResolversTypes['BundlePriceRuleAmount']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  priceType?: Resolver<ResolversTypes['BundlePriceType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleDiscountPercentPriceRuleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleDiscountPercentPriceRule'] = ResolversParentTypes['BundleDiscountPercentPriceRule']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundleDiscountPercentPriceRule']>, { __typename: 'BundleDiscountPercentPriceRule' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  percent?: Resolver<ResolversTypes['BundlePriceRulePercent'], ParentType, ContextType>;
  priceType?: Resolver<ResolversTypes['BundlePriceType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleEdge'] = ResolversParentTypes['BundleEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Bundle'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleFixedPriceRuleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleFixedPriceRule'] = ResolversParentTypes['BundleFixedPriceRule']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundleFixedPriceRule']>, { __typename: 'BundleFixedPriceRule' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  amounts?: Resolver<Array<ResolversTypes['BundlePriceRuleAmount']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  priceType?: Resolver<ResolversTypes['BundlePriceType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleFreePriceRuleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleFreePriceRule'] = ResolversParentTypes['BundleFreePriceRule']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundleFreePriceRule']>, { __typename: 'BundleFreePriceRule' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  priceType?: Resolver<ResolversTypes['BundlePriceType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleGroupResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleGroup'] = ResolversParentTypes['BundleGroup']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundleGroup']>, { __typename: 'BundleGroup' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['BundleItem']>, ParentType, ContextType>;
  maxSelection?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  minSelection?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleGroupsSyncPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleGroupsSyncPayload'] = ResolversParentTypes['BundleGroupsSyncPayload']> = ResolversObject<{
  configuration?: Resolver<Maybe<ResolversTypes['BundleConfiguration']>, ParentType, ContextType>;
  groups?: Resolver<Array<ResolversTypes['BundleGroup']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleItem'] = ResolversParentTypes['BundleItem']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundleItem']>, { __typename: 'BundleItem' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  defaultQty?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  featuredImage?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  group?: Resolver<ResolversTypes['BundleGroup'], ParentType, ContextType>;
  groupId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  itemType?: Resolver<ResolversTypes['BundleItemType'], ParentType, ContextType>;
  maxQty?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  minQty?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  optionSelections?: Resolver<Array<ResolversTypes['BundleItemOptionSelection']>, ParentType, ContextType>;
  priceRule?: Resolver<Maybe<ResolversTypes['BundlePriceRule']>, ParentType, ContextType>;
  pricingTemplate?: Resolver<Maybe<ResolversTypes['BundlePricingTemplate']>, ParentType, ContextType>;
  refProduct?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  refProductId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  refVariant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  refVariantId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  selected?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  visible?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleItemOptionSelectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleItemOptionSelection'] = ResolversParentTypes['BundleItemOptionSelection']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundleItemOptionSelection']>, { __typename: 'BundleItemOptionSelection' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  option?: Resolver<ResolversTypes['ProductOption'], ParentType, ContextType>;
  optionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  parentOption?: Resolver<Maybe<ResolversTypes['ProductOption']>, ParentType, ContextType>;
  parentOptionId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  values?: Resolver<Array<ResolversTypes['BundleItemOptionValueSelection']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleItemOptionValueSelectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleItemOptionValueSelection'] = ResolversParentTypes['BundleItemOptionValueSelection']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundleItemOptionValueSelection']>, { __typename: 'BundleItemOptionValueSelection' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  optionValue?: Resolver<Maybe<ResolversTypes['ProductOptionValue']>, ParentType, ContextType>;
  optionValueId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['BundleItemOptionValueSelectionStatus'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundlePriceRuleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundlePriceRule'] = ResolversParentTypes['BundlePriceRule']> = ResolversObject<{
  __resolveType: TypeResolveFn<'BundleBasePriceRule' | 'BundleDiscountFixedPriceRule' | 'BundleDiscountPercentPriceRule' | 'BundleFixedPriceRule' | 'BundleFreePriceRule', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  priceType?: Resolver<ResolversTypes['BundlePriceType'], ParentType, ContextType>;
}>;

export type BundlePriceRuleAmountResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundlePriceRuleAmount'] = ResolversParentTypes['BundlePriceRuleAmount']> = ResolversObject<{
  amountMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundlePriceRulePercentResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundlePriceRulePercent'] = ResolversParentTypes['BundlePriceRulePercent']> = ResolversObject<{
  value?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundlePricingTemplateResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundlePricingTemplate'] = ResolversParentTypes['BundlePricingTemplate']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['BundlePricingTemplate']>, { __typename: 'BundlePricingTemplate' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priceRule?: Resolver<ResolversTypes['BundlePriceRule'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundlePricingTemplatesSyncPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundlePricingTemplatesSyncPayload'] = ResolversParentTypes['BundlePricingTemplatesSyncPayload']> = ResolversObject<{
  configuration?: Resolver<Maybe<ResolversTypes['BundleConfiguration']>, ParentType, ContextType>;
  pricingTemplates?: Resolver<Array<ResolversTypes['BundlePricingTemplate']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BundleUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['BundleUpdatePayload'] = ResolversParentTypes['BundleUpdatePayload']> = ResolversObject<{
  bundle?: Resolver<Maybe<ResolversTypes['Bundle']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CatalogMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CatalogMutation'] = ResolversParentTypes['CatalogMutation']> = ResolversObject<{
  bundleConfigurationCreate?: Resolver<ResolversTypes['BundleConfigurationPayload'], ParentType, ContextType, RequireFields<CatalogMutationBundleConfigurationCreateArgs, 'input'>>;
  bundleConfigurationDelete?: Resolver<ResolversTypes['BundleConfigurationDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationBundleConfigurationDeleteArgs, 'input'>>;
  bundleConfigurationUpdate?: Resolver<ResolversTypes['BundleConfigurationPayload'], ParentType, ContextType, RequireFields<CatalogMutationBundleConfigurationUpdateArgs, 'input'>>;
  bundleCreate?: Resolver<ResolversTypes['BundleCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationBundleCreateArgs, 'input'>>;
  bundleDependencyRulesSync?: Resolver<ResolversTypes['BundleDependencyRulesSyncPayload'], ParentType, ContextType, RequireFields<CatalogMutationBundleDependencyRulesSyncArgs, 'input'>>;
  bundleGroupsSync?: Resolver<ResolversTypes['BundleGroupsSyncPayload'], ParentType, ContextType, RequireFields<CatalogMutationBundleGroupsSyncArgs, 'input'>>;
  bundlePricingTemplatesSync?: Resolver<ResolversTypes['BundlePricingTemplatesSyncPayload'], ParentType, ContextType, RequireFields<CatalogMutationBundlePricingTemplatesSyncArgs, 'input'>>;
  bundleUpdate?: Resolver<ResolversTypes['BundleUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationBundleUpdateArgs, 'bundleId' | 'expectedRevision'>>;
  categoryCreate?: Resolver<ResolversTypes['CategoryCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationCategoryCreateArgs, 'input'>>;
  categoryDelete?: Resolver<ResolversTypes['CategoryDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationCategoryDeleteArgs, 'input'>>;
  categoryMove?: Resolver<ResolversTypes['CategoryMovePayload'], ParentType, ContextType, RequireFields<CatalogMutationCategoryMoveArgs, 'input'>>;
  categoryRebalance?: Resolver<ResolversTypes['CategoryRebalancePayload'], ParentType, ContextType, RequireFields<CatalogMutationCategoryRebalanceArgs, 'input'>>;
  categoryUpdate?: Resolver<ResolversTypes['CategoryUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationCategoryUpdateArgs, 'categoryId'>>;
  collectionAddProducts?: Resolver<ResolversTypes['CollectionAddProductsPayload'], ParentType, ContextType, RequireFields<CatalogMutationCollectionAddProductsArgs, 'input'>>;
  collectionCreate?: Resolver<ResolversTypes['CollectionCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationCollectionCreateArgs, 'input'>>;
  collectionDelete?: Resolver<ResolversTypes['CollectionDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationCollectionDeleteArgs, 'input'>>;
  collectionMoveProduct?: Resolver<ResolversTypes['CollectionMoveProductPayload'], ParentType, ContextType, RequireFields<CatalogMutationCollectionMoveProductArgs, 'input'>>;
  collectionRemoveProducts?: Resolver<ResolversTypes['CollectionRemoveProductsPayload'], ParentType, ContextType, RequireFields<CatalogMutationCollectionRemoveProductsArgs, 'input'>>;
  collectionUpdate?: Resolver<ResolversTypes['CollectionUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationCollectionUpdateArgs, 'input'>>;
  collectionUpdateRules?: Resolver<ResolversTypes['CollectionUpdateRulesPayload'], ParentType, ContextType, RequireFields<CatalogMutationCollectionUpdateRulesArgs, 'input'>>;
  facetCreate?: Resolver<ResolversTypes['FacetCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationFacetCreateArgs, 'input'>>;
  facetDelete?: Resolver<ResolversTypes['FacetDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationFacetDeleteArgs, 'input'>>;
  facetGroupCreate?: Resolver<ResolversTypes['FacetGroupCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationFacetGroupCreateArgs, 'input'>>;
  facetGroupDelete?: Resolver<ResolversTypes['FacetGroupDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationFacetGroupDeleteArgs, 'input'>>;
  facetGroupUpdate?: Resolver<ResolversTypes['FacetGroupUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationFacetGroupUpdateArgs, 'input'>>;
  facetSwatchCreate?: Resolver<ResolversTypes['FacetSwatchCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationFacetSwatchCreateArgs, 'input'>>;
  facetSwatchDelete?: Resolver<ResolversTypes['FacetSwatchDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationFacetSwatchDeleteArgs, 'input'>>;
  facetSwatchUpdate?: Resolver<ResolversTypes['FacetSwatchUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationFacetSwatchUpdateArgs, 'input'>>;
  facetUpdate?: Resolver<ResolversTypes['FacetUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationFacetUpdateArgs, 'input'>>;
  facetValueCreate?: Resolver<ResolversTypes['FacetValueCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationFacetValueCreateArgs, 'input'>>;
  facetValueDelete?: Resolver<ResolversTypes['FacetValueDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationFacetValueDeleteArgs, 'input'>>;
  facetValueUpdate?: Resolver<ResolversTypes['FacetValueUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationFacetValueUpdateArgs, 'input'>>;
  productBulkUpdate?: Resolver<ResolversTypes['ProductBulkUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductBulkUpdateArgs, 'input'>>;
  productCreate?: Resolver<ResolversTypes['ProductCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductCreateArgs, 'input'>>;
  productDelete?: Resolver<ResolversTypes['ProductDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductDeleteArgs, 'input'>>;
  productFeatureCreate?: Resolver<ResolversTypes['ProductFeatureCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductFeatureCreateArgs, 'input'>>;
  productFeatureDelete?: Resolver<ResolversTypes['ProductFeatureDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductFeatureDeleteArgs, 'input'>>;
  productFeatureUpdate?: Resolver<ResolversTypes['ProductFeatureUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductFeatureUpdateArgs, 'input'>>;
  productFeaturesSync?: Resolver<ResolversTypes['ProductFeaturesSyncPayload'], ParentType, ContextType, RequireFields<CatalogMutationProductFeaturesSyncArgs, 'input'>>;
  productOptionCreate?: Resolver<ResolversTypes['ProductOptionCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductOptionCreateArgs, 'input'>>;
  productOptionDelete?: Resolver<ResolversTypes['ProductOptionDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductOptionDeleteArgs, 'input'>>;
  productOptionUpdate?: Resolver<ResolversTypes['ProductOptionUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductOptionUpdateArgs, 'input'>>;
  productOptionsSync?: Resolver<ResolversTypes['ProductOptionsSyncPayload'], ParentType, ContextType, RequireFields<CatalogMutationProductOptionsSyncArgs, 'input'>>;
  productUpdate?: Resolver<ResolversTypes['ProductUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationProductUpdateArgs, 'productId'>>;
  productUpdateStatus?: Resolver<ResolversTypes['ProductUpdateStatusPayload'], ParentType, ContextType, RequireFields<CatalogMutationProductUpdateStatusArgs, 'input'>>;
  tagCreate?: Resolver<ResolversTypes['TagCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationTagCreateArgs, 'input'>>;
  tagDelete?: Resolver<ResolversTypes['TagDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationTagDeleteArgs, 'input'>>;
  tagUpdate?: Resolver<ResolversTypes['TagUpdatePayload'], ParentType, ContextType, RequireFields<CatalogMutationTagUpdateArgs, 'input'>>;
  variantCreate?: Resolver<ResolversTypes['VariantCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationVariantCreateArgs, 'input'>>;
  variantDelete?: Resolver<ResolversTypes['VariantDeletePayload'], ParentType, ContextType, RequireFields<CatalogMutationVariantDeleteArgs, 'input'>>;
  variantUpdateMedia?: Resolver<ResolversTypes['VariantUpdateMediaPayload'], ParentType, ContextType, RequireFields<CatalogMutationVariantUpdateMediaArgs, 'input'>>;
  variantUpdateOptions?: Resolver<ResolversTypes['VariantUpdateOptionsPayload'], ParentType, ContextType, RequireFields<CatalogMutationVariantUpdateOptionsArgs, 'input'>>;
  variantUpdatePricing?: Resolver<ResolversTypes['VariantUpdatePricingPayload'], ParentType, ContextType, RequireFields<CatalogMutationVariantUpdatePricingArgs, 'input'>>;
  vendorCreate?: Resolver<ResolversTypes['VendorCreatePayload'], ParentType, ContextType, RequireFields<CatalogMutationVendorCreateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CatalogQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CatalogQuery'] = ResolversParentTypes['CatalogQuery']> = ResolversObject<{
  bundle?: Resolver<Maybe<ResolversTypes['Bundle']>, ParentType, ContextType, RequireFields<CatalogQueryBundleArgs, 'id'>>;
  bundles?: Resolver<ResolversTypes['BundleConnection'], ParentType, ContextType, Partial<CatalogQueryBundlesArgs>>;
  categories?: Resolver<ResolversTypes['CategoryConnection'], ParentType, ContextType, Partial<CatalogQueryCategoriesArgs>>;
  category?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType, RequireFields<CatalogQueryCategoryArgs, 'id'>>;
  collection?: Resolver<Maybe<ResolversTypes['Collection']>, ParentType, ContextType, RequireFields<CatalogQueryCollectionArgs, 'id'>>;
  collectionByHandle?: Resolver<Maybe<ResolversTypes['Collection']>, ParentType, ContextType, RequireFields<CatalogQueryCollectionByHandleArgs, 'handle'>>;
  collectionRulesPreviewCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType, RequireFields<CatalogQueryCollectionRulesPreviewCountArgs, 'rules'>>;
  collections?: Resolver<ResolversTypes['CollectionConnection'], ParentType, ContextType, Partial<CatalogQueryCollectionsArgs>>;
  facet?: Resolver<Maybe<ResolversTypes['Facet']>, ParentType, ContextType, RequireFields<CatalogQueryFacetArgs, 'id'>>;
  facetGroup?: Resolver<Maybe<ResolversTypes['FacetGroup']>, ParentType, ContextType, RequireFields<CatalogQueryFacetGroupArgs, 'id'>>;
  facetGroups?: Resolver<Array<ResolversTypes['FacetGroup']>, ParentType, ContextType>;
  facetSwatch?: Resolver<Maybe<ResolversTypes['FacetSwatch']>, ParentType, ContextType, RequireFields<CatalogQueryFacetSwatchArgs, 'id'>>;
  facetSwatches?: Resolver<Array<ResolversTypes['FacetSwatch']>, ParentType, ContextType>;
  facetValue?: Resolver<Maybe<ResolversTypes['FacetValue']>, ParentType, ContextType, RequireFields<CatalogQueryFacetValueArgs, 'id'>>;
  facetValues?: Resolver<Array<ResolversTypes['FacetValue']>, ParentType, ContextType, RequireFields<CatalogQueryFacetValuesArgs, 'facetId'>>;
  facets?: Resolver<Array<ResolversTypes['Facet']>, ParentType, ContextType>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<CatalogQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<CatalogQueryNodesArgs, 'ids'>>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<CatalogQueryProductArgs, 'id'>>;
  productBulkUpdateJob?: Resolver<Maybe<ResolversTypes['ProductBulkUpdateJob']>, ParentType, ContextType, RequireFields<CatalogQueryProductBulkUpdateJobArgs, 'jobId'>>;
  productBulkUpdateJobs?: Resolver<ResolversTypes['ProductBulkUpdateJobConnection'], ParentType, ContextType, Partial<CatalogQueryProductBulkUpdateJobsArgs>>;
  products?: Resolver<ResolversTypes['ProductConnection'], ParentType, ContextType, Partial<CatalogQueryProductsArgs>>;
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType, RequireFields<CatalogQueryTagArgs, 'id'>>;
  tags?: Resolver<ResolversTypes['TagConnection'], ParentType, ContextType, Partial<CatalogQueryTagsArgs>>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType, RequireFields<CatalogQueryVariantArgs, 'id'>>;
  variants?: Resolver<ResolversTypes['VariantConnection'], ParentType, ContextType, Partial<CatalogQueryVariantsArgs>>;
  vendor?: Resolver<Maybe<ResolversTypes['Vendor']>, ParentType, ContextType, RequireFields<CatalogQueryVendorArgs, 'id'>>;
  vendors?: Resolver<ResolversTypes['VendorConnection'], ParentType, ContextType, Partial<CatalogQueryVendorsArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Category']>, { __typename: 'Category' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  ancestors?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType>;
  children?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  defaultSort?: Resolver<ResolversTypes['ProductSortBy'], ParentType, ContextType>;
  defaultSortDirection?: Resolver<ResolversTypes['SortDirection'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  depth?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['RichText']>, ParentType, ContextType>;
  excerpt?: Resolver<Maybe<ResolversTypes['RichText']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPublished?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  listing?: Resolver<ResolversTypes['ListingConnection'], ParentType, ContextType, Partial<CategoryListingArgs>>;
  media?: Resolver<Array<ResolversTypes['CategoryMediaItem']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;
  path?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  productsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  seo?: Resolver<Maybe<ResolversTypes['Seo']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryConnection'] = ResolversParentTypes['CategoryConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CategoryEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryCreatePayload'] = ResolversParentTypes['CategoryCreatePayload']> = ResolversObject<{
  category?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryDeletePayload'] = ResolversParentTypes['CategoryDeletePayload']> = ResolversObject<{
  deletedCategoryId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryEdge'] = ResolversParentTypes['CategoryEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Category'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryMediaItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryMediaItem'] = ResolversParentTypes['CategoryMediaItem']> = ResolversObject<{
  file?: Resolver<ResolversTypes['File'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryMovePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryMovePayload'] = ResolversParentTypes['CategoryMovePayload']> = ResolversObject<{
  category?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryRebalancePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryRebalancePayload'] = ResolversParentTypes['CategoryRebalancePayload']> = ResolversObject<{
  category?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CategoryUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CategoryUpdatePayload'] = ResolversParentTypes['CategoryUpdatePayload']> = ResolversObject<{
  category?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;
  operationResults?: Resolver<Array<ResolversTypes['OperationResult']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Collection'] = ResolversParentTypes['Collection']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Collection']>, { __typename: 'Collection' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  activeFrom?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  activeTo?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  defaultSort?: Resolver<ResolversTypes['ProductSortBy'], ParentType, ContextType>;
  defaultSortDirection?: Resolver<ResolversTypes['SortDirection'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['RichText']>, ParentType, ContextType>;
  excerpt?: Resolver<Maybe<ResolversTypes['RichText']>, ParentType, ContextType>;
  handle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isPublished?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  media?: Resolver<Array<ResolversTypes['CollectionMediaItem']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  products?: Resolver<ResolversTypes['CollectionProductConnection'], ParentType, ContextType, Partial<CollectionProductsArgs>>;
  productsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  rules?: Resolver<Array<ResolversTypes['CollectionRule']>, ParentType, ContextType>;
  seo?: Resolver<Maybe<ResolversTypes['Seo']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['CollectionType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionAddProductsPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CollectionAddProductsPayload'] = ResolversParentTypes['CollectionAddProductsPayload']> = ResolversObject<{
  collection?: Resolver<Maybe<ResolversTypes['Collection']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CollectionConnection'] = ResolversParentTypes['CollectionConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CollectionEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CollectionCreatePayload'] = ResolversParentTypes['CollectionCreatePayload']> = ResolversObject<{
  collection?: Resolver<Maybe<ResolversTypes['Collection']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CollectionDeletePayload'] = ResolversParentTypes['CollectionDeletePayload']> = ResolversObject<{
  deletedCollectionId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CollectionEdge'] = ResolversParentTypes['CollectionEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Collection'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionMediaItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CollectionMediaItem'] = ResolversParentTypes['CollectionMediaItem']> = ResolversObject<{
  file?: Resolver<ResolversTypes['File'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionMoveProductPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CollectionMoveProductPayload'] = ResolversParentTypes['CollectionMoveProductPayload']> = ResolversObject<{
  collection?: Resolver<Maybe<ResolversTypes['Collection']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionProductConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CollectionProductConnection'] = ResolversParentTypes['CollectionProductConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CollectionProductEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionProductEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CollectionProductEdge'] = ResolversParentTypes['CollectionProductEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionRemoveProductsPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CollectionRemoveProductsPayload'] = ResolversParentTypes['CollectionRemoveProductsPayload']> = ResolversObject<{
  collection?: Resolver<Maybe<ResolversTypes['Collection']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionRuleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CollectionRule'] = ResolversParentTypes['CollectionRule']> = ResolversObject<{
  field?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  operator?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CollectionUpdatePayload'] = ResolversParentTypes['CollectionUpdatePayload']> = ResolversObject<{
  collection?: Resolver<Maybe<ResolversTypes['Collection']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CollectionUpdateRulesPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CollectionUpdateRulesPayload'] = ResolversParentTypes['CollectionUpdateRulesPayload']> = ResolversObject<{
  collection?: Resolver<Maybe<ResolversTypes['Collection']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type FacetResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Facet'] = ResolversParentTypes['Facet']> = ResolversObject<{
  facetType?: Resolver<ResolversTypes['FacetType'], ParentType, ContextType>;
  group?: Resolver<Maybe<ResolversTypes['FacetGroup']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  selectionMode?: Resolver<ResolversTypes['FacetSelectionMode'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sourceHandles?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  uiType?: Resolver<ResolversTypes['FacetUIType'], ParentType, ContextType>;
  values?: Resolver<Array<ResolversTypes['FacetValue']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetCreatePayload'] = ResolversParentTypes['FacetCreatePayload']> = ResolversObject<{
  facet?: Resolver<Maybe<ResolversTypes['Facet']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetDeletePayload'] = ResolversParentTypes['FacetDeletePayload']> = ResolversObject<{
  deletedFacetId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetGroupResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetGroup'] = ResolversParentTypes['FacetGroup']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  facets?: Resolver<Array<ResolversTypes['Facet']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetGroupCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetGroupCreatePayload'] = ResolversParentTypes['FacetGroupCreatePayload']> = ResolversObject<{
  facetGroup?: Resolver<Maybe<ResolversTypes['FacetGroup']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetGroupDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetGroupDeletePayload'] = ResolversParentTypes['FacetGroupDeletePayload']> = ResolversObject<{
  deletedFacetGroupId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetGroupUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetGroupUpdatePayload'] = ResolversParentTypes['FacetGroupUpdatePayload']> = ResolversObject<{
  facetGroup?: Resolver<Maybe<ResolversTypes['FacetGroup']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetSwatchResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSwatch'] = ResolversParentTypes['FacetSwatch']> = ResolversObject<{
  colorOne?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  colorTwo?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  file?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  swatchType?: Resolver<ResolversTypes['SwatchType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetSwatchCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSwatchCreatePayload'] = ResolversParentTypes['FacetSwatchCreatePayload']> = ResolversObject<{
  facetSwatch?: Resolver<Maybe<ResolversTypes['FacetSwatch']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetSwatchDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSwatchDeletePayload'] = ResolversParentTypes['FacetSwatchDeletePayload']> = ResolversObject<{
  deletedFacetSwatchId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetSwatchUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetSwatchUpdatePayload'] = ResolversParentTypes['FacetSwatchUpdatePayload']> = ResolversObject<{
  facetSwatch?: Resolver<Maybe<ResolversTypes['FacetSwatch']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetUpdatePayload'] = ResolversParentTypes['FacetUpdatePayload']> = ResolversObject<{
  facet?: Resolver<Maybe<ResolversTypes['Facet']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetValueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetValue'] = ResolversParentTypes['FacetValue']> = ResolversObject<{
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  facet?: Resolver<ResolversTypes['Facet'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sourceHandles?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  swatch?: Resolver<Maybe<ResolversTypes['FacetSwatch']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetValueCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetValueCreatePayload'] = ResolversParentTypes['FacetValueCreatePayload']> = ResolversObject<{
  facetValue?: Resolver<Maybe<ResolversTypes['FacetValue']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetValueDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetValueDeletePayload'] = ResolversParentTypes['FacetValueDeletePayload']> = ResolversObject<{
  deletedFacetValueId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FacetValueUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['FacetValueUpdatePayload'] = ResolversParentTypes['FacetValueUpdatePayload']> = ResolversObject<{
  facetValue?: Resolver<Maybe<ResolversTypes['FacetValue']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

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

export type InventoryAlertThresholdResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryAlertThreshold'] = ResolversParentTypes['InventoryAlertThreshold']> = ResolversObject<{
  method?: Resolver<ResolversTypes['ThresholdMethod'], ParentType, ContextType>;
  minimumStock?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryBackorderResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryBackorder'] = ResolversParentTypes['InventoryBackorder']> = ResolversObject<{
  etaAvgDays?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  quantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryItem'] = ResolversParentTypes['InventoryItem']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['InventoryItem']>, { __typename: 'InventoryItem' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  continueSellingWhenOutOfStock?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sku?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  stock?: Resolver<Array<ResolversTypes['WarehouseStock']>, ParentType, ContextType>;
  totalAvailable?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  trackInventory?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  unitCost?: Resolver<Maybe<ResolversTypes['InventoryItemCost']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variant?: Resolver<ResolversTypes['Variant'], ParentType, ContextType>;
  variantId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryItemConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryItemConnection'] = ResolversParentTypes['InventoryItemConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['InventoryItemEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryItemCostResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryItemCost'] = ResolversParentTypes['InventoryItemCost']> = ResolversObject<{
  amountMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  effectiveFrom?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryItemEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryItemEdge'] = ResolversParentTypes['InventoryItemEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['InventoryItem'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryItemUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryItemUpdatePayload'] = ResolversParentTypes['InventoryItemUpdatePayload']> = ResolversObject<{
  inventoryItem?: Resolver<Maybe<ResolversTypes['InventoryItem']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryMutation'] = ResolversParentTypes['InventoryMutation']> = ResolversObject<{
  inventoryItemUpdate?: Resolver<ResolversTypes['InventoryItemUpdatePayload'], ParentType, ContextType, RequireFields<InventoryMutationInventoryItemUpdateArgs, 'input'>>;
  warehouseCreate?: Resolver<ResolversTypes['WarehouseCreatePayload'], ParentType, ContextType, RequireFields<InventoryMutationWarehouseCreateArgs, 'input'>>;
  warehouseDelete?: Resolver<ResolversTypes['WarehouseDeletePayload'], ParentType, ContextType, RequireFields<InventoryMutationWarehouseDeleteArgs, 'input'>>;
  warehouseStockCreate?: Resolver<ResolversTypes['WarehouseStockCreatePayload'], ParentType, ContextType, RequireFields<InventoryMutationWarehouseStockCreateArgs, 'input'>>;
  warehouseStockDelete?: Resolver<ResolversTypes['WarehouseStockDeletePayload'], ParentType, ContextType, RequireFields<InventoryMutationWarehouseStockDeleteArgs, 'input'>>;
  warehouseUpdate?: Resolver<ResolversTypes['WarehouseUpdatePayload'], ParentType, ContextType, RequireFields<InventoryMutationWarehouseUpdateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryQuantitiesResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryQuantities'] = ResolversParentTypes['InventoryQuantities']> = ResolversObject<{
  availableForSale?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  onHand?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reserved?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  unavailable?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventoryQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventoryQuery'] = ResolversParentTypes['InventoryQuery']> = ResolversObject<{
  inventoryItem?: Resolver<Maybe<ResolversTypes['InventoryItem']>, ParentType, ContextType, RequireFields<InventoryQueryInventoryItemArgs, 'id'>>;
  inventoryItemByVariant?: Resolver<Maybe<ResolversTypes['InventoryItem']>, ParentType, ContextType, RequireFields<InventoryQueryInventoryItemByVariantArgs, 'variantId'>>;
  inventoryItems?: Resolver<ResolversTypes['InventoryItemConnection'], ParentType, ContextType, Partial<InventoryQueryInventoryItemsArgs>>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<InventoryQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<InventoryQueryNodesArgs, 'ids'>>;
  warehouse?: Resolver<Maybe<ResolversTypes['Warehouse']>, ParentType, ContextType, RequireFields<InventoryQueryWarehouseArgs, 'id'>>;
  warehouseAssignableVariants?: Resolver<ResolversTypes['VariantConnection'], ParentType, ContextType, RequireFields<InventoryQueryWarehouseAssignableVariantsArgs, 'warehouseId'>>;
  warehouses?: Resolver<ResolversTypes['WarehouseConnection'], ParentType, ContextType, Partial<InventoryQueryWarehousesArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InventorySkuStatusResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InventorySkuStatus'] = ResolversParentTypes['InventorySkuStatus']> = ResolversObject<{
  backorder?: Resolver<ResolversTypes['SkuStatusMetric'], ParentType, ContextType>;
  lowStock?: Resolver<ResolversTypes['SkuStatusMetric'], ParentType, ContextType>;
  outOfStock?: Resolver<ResolversTypes['SkuStatusMetric'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type ListingResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Listing'] = ResolversParentTypes['Listing']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Bundle' | 'Product', ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPublished?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ProductKind'], ParentType, ContextType>;
  media?: Resolver<Array<ResolversTypes['ProductMediaItem']>, ParentType, ContextType>;
  priceRange?: Resolver<Maybe<ResolversTypes['ProductPriceRange']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ListingConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ListingConnection'] = ResolversParentTypes['ListingConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ListingEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ListingEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ListingEdge'] = ResolversParentTypes['ListingEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Listing'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  catalogMutation?: Resolver<ResolversTypes['CatalogMutation'], ParentType, ContextType>;
  inventoryMutation?: Resolver<ResolversTypes['InventoryMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Bundle' | 'BundleBasePriceRule' | 'BundleCondition' | 'BundleConditionGroup' | 'BundleConfiguration' | 'BundleDependencyAction' | 'BundleDependencyRule' | 'BundleDiscountFixedPriceRule' | 'BundleDiscountPercentPriceRule' | 'BundleFixedPriceRule' | 'BundleFreePriceRule' | 'BundleGroup' | 'BundleItem' | 'BundleItemOptionSelection' | 'BundleItemOptionValueSelection' | 'BundlePricingTemplate' | 'Category' | 'Collection' | 'Facet' | 'FacetGroup' | 'FacetSwatch' | 'FacetValue' | 'InventoryItem' | 'Product' | 'ProductFeature' | 'ProductFeatureValue' | 'ProductOption' | 'ProductOptionSwatch' | 'ProductOptionValue' | 'Tag' | 'Variant' | 'VariantCost' | 'VariantPrice' | 'Vendor' | 'Warehouse' | 'WarehouseStock', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type OperationResultResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OperationResult'] = ResolversParentTypes['OperationResult']> = ResolversObject<{
  applied?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  clientMutationId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  entityId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  errors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['OperationType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PricingWidgetPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PricingWidgetPayload'] = ResolversParentTypes['PricingWidgetPayload']> = ResolversObject<{
  currentCostPrice?: Resolver<Maybe<ResolversTypes['VariantCost']>, ParentType, ContextType>;
  currentPrice?: Resolver<Maybe<ResolversTypes['VariantPrice']>, ParentType, ContextType>;
  history?: Resolver<ResolversTypes['VariantPriceConnection'], ParentType, ContextType>;
  statistics?: Resolver<ResolversTypes['VariantPriceHistoryStatistics'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Product']>, { __typename: 'Product' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  categoryAssignments?: Resolver<Array<ResolversTypes['ProductCategoryAssignment']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['RichText']>, ParentType, ContextType>;
  excerpt?: Resolver<Maybe<ResolversTypes['RichText']>, ParentType, ContextType>;
  features?: Resolver<Array<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPublished?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ProductKind'], ParentType, ContextType>;
  media?: Resolver<Array<ResolversTypes['ProductMediaItem']>, ParentType, ContextType>;
  options?: Resolver<Array<ResolversTypes['ProductOption']>, ParentType, ContextType>;
  priceRange?: Resolver<Maybe<ResolversTypes['ProductPriceRange']>, ParentType, ContextType>;
  primaryCategory?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  seo?: Resolver<Maybe<ResolversTypes['ProductSeo']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['Tag']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variants?: Resolver<ResolversTypes['VariantConnection'], ParentType, ContextType, Partial<ProductVariantsArgs>>;
  variantsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  vendor?: Resolver<Maybe<ResolversTypes['Vendor']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductBulkUpdateJobResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductBulkUpdateJob'] = ResolversParentTypes['ProductBulkUpdateJob']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  finishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  items?: Resolver<ResolversTypes['BulkUpdateItemConnection'], ParentType, ContextType, Partial<ProductBulkUpdateJobItemsArgs>>;
  progress?: Resolver<ResolversTypes['BulkUpdateJobProgress'], ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['BulkUpdateJobStatus'], ParentType, ContextType>;
  totalProducts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductBulkUpdateJobConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductBulkUpdateJobConnection'] = ResolversParentTypes['ProductBulkUpdateJobConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductBulkUpdateJobEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductBulkUpdateJobEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductBulkUpdateJobEdge'] = ResolversParentTypes['ProductBulkUpdateJobEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ProductBulkUpdateJob'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductBulkUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductBulkUpdatePayload'] = ResolversParentTypes['ProductBulkUpdatePayload']> = ResolversObject<{
  job?: Resolver<Maybe<ResolversTypes['ProductBulkUpdateJob']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['BulkUpdateUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductCategoryAssignmentResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductCategoryAssignment'] = ResolversParentTypes['ProductCategoryAssignment']> = ResolversObject<{
  category?: Resolver<ResolversTypes['Category'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductConnection'] = ResolversParentTypes['ProductConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ProductEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductCreatePayload'] = ResolversParentTypes['ProductCreatePayload']> = ResolversObject<{
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductDeletePayload'] = ResolversParentTypes['ProductDeletePayload']> = ResolversObject<{
  deletedProductId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductEdge'] = ResolversParentTypes['ProductEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeatureResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeature'] = ResolversParentTypes['ProductFeature']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductFeature']>, { __typename: 'ProductFeature' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  children?: Resolver<Array<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  index?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  isGroup?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent?: Resolver<Maybe<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  values?: Resolver<Array<ResolversTypes['ProductFeatureValue']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeatureCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeatureCreatePayload'] = ResolversParentTypes['ProductFeatureCreatePayload']> = ResolversObject<{
  feature?: Resolver<Maybe<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeatureDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeatureDeletePayload'] = ResolversParentTypes['ProductFeatureDeletePayload']> = ResolversObject<{
  deletedFeatureId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeatureUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeatureUpdatePayload'] = ResolversParentTypes['ProductFeatureUpdatePayload']> = ResolversObject<{
  feature?: Resolver<Maybe<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeatureValueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeatureValue'] = ResolversParentTypes['ProductFeatureValue']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductFeatureValue']>, { __typename: 'ProductFeatureValue' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  index?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductFeaturesSyncPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductFeaturesSyncPayload'] = ResolversParentTypes['ProductFeaturesSyncPayload']> = ResolversObject<{
  features?: Resolver<Array<ResolversTypes['ProductFeature']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductInventoryWidgetResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductInventoryWidget'] = ResolversParentTypes['ProductInventoryWidget']> = ResolversObject<{
  alertThreshold?: Resolver<ResolversTypes['InventoryAlertThreshold'], ParentType, ContextType>;
  availableChange7d?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  backorder?: Resolver<ResolversTypes['InventoryBackorder'], ParentType, ContextType>;
  quantities?: Resolver<ResolversTypes['InventoryQuantities'], ParentType, ContextType>;
  skuStatus?: Resolver<ResolversTypes['InventorySkuStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductMediaItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductMediaItem'] = ResolversParentTypes['ProductMediaItem']> = ResolversObject<{
  file?: Resolver<ResolversTypes['File'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOption'] = ResolversParentTypes['ProductOption']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductOption']>, { __typename: 'ProductOption' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  displayType?: Resolver<ResolversTypes['OptionDisplayType'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  values?: Resolver<Array<ResolversTypes['ProductOptionValue']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionCreatePayload'] = ResolversParentTypes['ProductOptionCreatePayload']> = ResolversObject<{
  option?: Resolver<Maybe<ResolversTypes['ProductOption']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionDeletePayload'] = ResolversParentTypes['ProductOptionDeletePayload']> = ResolversObject<{
  deletedOptionId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionSwatchResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionSwatch'] = ResolversParentTypes['ProductOptionSwatch']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductOptionSwatch']>, { __typename: 'ProductOptionSwatch' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  colorOne?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  colorTwo?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  file?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  swatchType?: Resolver<ResolversTypes['SwatchType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionUpdatePayload'] = ResolversParentTypes['ProductOptionUpdatePayload']> = ResolversObject<{
  option?: Resolver<Maybe<ResolversTypes['ProductOption']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionValueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionValue'] = ResolversParentTypes['ProductOptionValue']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['ProductOptionValue']>, { __typename: 'ProductOptionValue' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  swatch?: Resolver<Maybe<ResolversTypes['ProductOptionSwatch']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductOptionsSyncPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductOptionsSyncPayload'] = ResolversParentTypes['ProductOptionsSyncPayload']> = ResolversObject<{
  options?: Resolver<Array<ResolversTypes['ProductOption']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductPriceRangeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductPriceRange'] = ResolversParentTypes['ProductPriceRange']> = ResolversObject<{
  currency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  maxPriceAmount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  minPriceAmount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductSeoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductSeo'] = ResolversParentTypes['ProductSeo']> = ResolversObject<{
  ogDescription?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ogImage?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  ogTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  seoDescription?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  seoTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductUpdatePayload'] = ResolversParentTypes['ProductUpdatePayload']> = ResolversObject<{
  operationResults?: Resolver<Array<ResolversTypes['OperationResult']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProductUpdateStatusPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProductUpdateStatusPayload'] = ResolversParentTypes['ProductUpdateStatusPayload']> = ResolversObject<{
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  catalogQuery?: Resolver<ResolversTypes['CatalogQuery'], ParentType, ContextType>;
  inventoryQuery?: Resolver<ResolversTypes['InventoryQuery'], ParentType, ContextType>;
  widgetQuery?: Resolver<ResolversTypes['WidgetQuery'], ParentType, ContextType>;
}>;

export type RichTextResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RichText'] = ResolversParentTypes['RichText']> = ResolversObject<{
  html?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  json?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SelectedOptionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SelectedOption'] = ResolversParentTypes['SelectedOption']> = ResolversObject<{
  optionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  optionValueId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SeoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Seo'] = ResolversParentTypes['Seo']> = ResolversObject<{
  ogDescription?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ogImage?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  ogTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  seoDescription?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  seoTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SkuStatusMetricResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SkuStatusMetric'] = ResolversParentTypes['SkuStatusMetric']> = ResolversObject<{
  averageDays?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Tag'] = ResolversParentTypes['Tag']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Tag']>, { __typename: 'Tag' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  productsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['TagConnection'] = ResolversParentTypes['TagConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['TagEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['TagCreatePayload'] = ResolversParentTypes['TagCreatePayload']> = ResolversObject<{
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['TagDeletePayload'] = ResolversParentTypes['TagDeletePayload']> = ResolversObject<{
  deletedTagId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['TagEdge'] = ResolversParentTypes['TagEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Tag'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TagUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['TagUpdatePayload'] = ResolversParentTypes['TagUpdatePayload']> = ResolversObject<{
  tag?: Resolver<Maybe<ResolversTypes['Tag']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'BulkUpdateUserError' | 'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type VariantResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Variant'] = ResolversParentTypes['Variant']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Variant']>, { __typename: 'Variant' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  bundleConfiguration?: Resolver<Maybe<ResolversTypes['BundleConfiguration']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  dimensions?: Resolver<Maybe<ResolversTypes['VariantDimensions']>, ParentType, ContextType>;
  externalId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  externalSystem?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  inventoryItem?: Resolver<Maybe<ResolversTypes['InventoryItem']>, ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['ProductKind'], ParentType, ContextType>;
  media?: Resolver<Array<ResolversTypes['VariantMediaItem']>, ParentType, ContextType>;
  price?: Resolver<Maybe<ResolversTypes['VariantPrice']>, ParentType, ContextType>;
  priceHistory?: Resolver<ResolversTypes['VariantPriceConnection'], ParentType, ContextType, Partial<VariantPriceHistoryArgs>>;
  product?: Resolver<ResolversTypes['Product'], ParentType, ContextType>;
  selectedOptions?: Resolver<Array<ResolversTypes['SelectedOption']>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  weight?: Resolver<Maybe<ResolversTypes['VariantWeight']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantConnection'] = ResolversParentTypes['VariantConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['VariantEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantCostResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantCost'] = ResolversParentTypes['VariantCost']> = ResolversObject<{
  currency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  effectiveFrom?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  effectiveTo?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isCurrent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  recordedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  unitCostMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantCostConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantCostConnection'] = ResolversParentTypes['VariantCostConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['VariantCostEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantCostEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantCostEdge'] = ResolversParentTypes['VariantCostEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['VariantCost'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantCreatePayload'] = ResolversParentTypes['VariantCreatePayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantDeletePayload'] = ResolversParentTypes['VariantDeletePayload']> = ResolversObject<{
  deletedVariantId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  product?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantDimensionsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantDimensions'] = ResolversParentTypes['VariantDimensions']> = ResolversObject<{
  height?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  length?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  width?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantEdge'] = ResolversParentTypes['VariantEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Variant'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantMediaItemResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantMediaItem'] = ResolversParentTypes['VariantMediaItem']> = ResolversObject<{
  file?: Resolver<ResolversTypes['File'], ParentType, ContextType>;
  sortIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantPriceResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantPrice'] = ResolversParentTypes['VariantPrice']> = ResolversObject<{
  amountMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  compareAtMinor?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  effectiveFrom?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  effectiveTo?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isCurrent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  recordedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantPriceConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantPriceConnection'] = ResolversParentTypes['VariantPriceConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['VariantPriceEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantPriceEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantPriceEdge'] = ResolversParentTypes['VariantPriceEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['VariantPrice'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantPriceHistoryStatisticsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantPriceHistoryStatistics'] = ResolversParentTypes['VariantPriceHistoryStatistics']> = ResolversObject<{
  avgPriceMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['CurrencyCode'], ParentType, ContextType>;
  maxPriceMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  minPriceMinor?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantUpdateMediaPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantUpdateMediaPayload'] = ResolversParentTypes['VariantUpdateMediaPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantUpdateOptionsPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantUpdateOptionsPayload'] = ResolversParentTypes['VariantUpdateOptionsPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantUpdatePricingPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantUpdatePricingPayload'] = ResolversParentTypes['VariantUpdatePricingPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  variant?: Resolver<Maybe<ResolversTypes['Variant']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VariantWeightResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VariantWeight'] = ResolversParentTypes['VariantWeight']> = ResolversObject<{
  value?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VendorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Vendor'] = ResolversParentTypes['Vendor']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Vendor']>, { __typename: 'Vendor' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VendorConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VendorConnection'] = ResolversParentTypes['VendorConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['VendorEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VendorCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VendorCreatePayload'] = ResolversParentTypes['VendorCreatePayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  vendor?: Resolver<Maybe<ResolversTypes['Vendor']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VendorEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['VendorEdge'] = ResolversParentTypes['VendorEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Vendor'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Warehouse'] = ResolversParentTypes['Warehouse']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Warehouse']>, { __typename: 'Warehouse' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isDefault?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  stock?: Resolver<ResolversTypes['WarehouseStockConnection'], ParentType, ContextType, Partial<WarehouseStockArgs>>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variantsCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseConnection'] = ResolversParentTypes['WarehouseConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['WarehouseEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseCreatePayload'] = ResolversParentTypes['WarehouseCreatePayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  warehouse?: Resolver<Maybe<ResolversTypes['Warehouse']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseDeletePayload'] = ResolversParentTypes['WarehouseDeletePayload']> = ResolversObject<{
  deletedWarehouseId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseEdge'] = ResolversParentTypes['WarehouseEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Warehouse'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseStockResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseStock'] = ResolversParentTypes['WarehouseStock']> = ResolversObject<{
  availableForSale?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  quantityOnHand?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reservedQuantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  unavailableQuantity?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  variant?: Resolver<ResolversTypes['Variant'], ParentType, ContextType>;
  variantId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  warehouse?: Resolver<ResolversTypes['Warehouse'], ParentType, ContextType>;
  warehouseId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseStockConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseStockConnection'] = ResolversParentTypes['WarehouseStockConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['WarehouseStockEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseStockCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseStockCreatePayload'] = ResolversParentTypes['WarehouseStockCreatePayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  warehouseStocks?: Resolver<Array<ResolversTypes['WarehouseStock']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseStockDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseStockDeletePayload'] = ResolversParentTypes['WarehouseStockDeletePayload']> = ResolversObject<{
  deletedWarehouseStockIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseStockEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseStockEdge'] = ResolversParentTypes['WarehouseStockEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['WarehouseStock'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WarehouseUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WarehouseUpdatePayload'] = ResolversParentTypes['WarehouseUpdatePayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  warehouse?: Resolver<Maybe<ResolversTypes['Warehouse']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WidgetQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['WidgetQuery'] = ResolversParentTypes['WidgetQuery']> = ResolversObject<{
  inventory?: Resolver<Maybe<ResolversTypes['ProductInventoryWidget']>, ParentType, ContextType, RequireFields<WidgetQueryInventoryArgs, 'productId'>>;
  pricing?: Resolver<ResolversTypes['PricingWidgetPayload'], ParentType, ContextType, RequireFields<WidgetQueryPricingArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  BigInt?: GraphQLScalarType;
  BulkUpdateItem?: BulkUpdateItemResolvers<ContextType>;
  BulkUpdateItemConnection?: BulkUpdateItemConnectionResolvers<ContextType>;
  BulkUpdateItemEdge?: BulkUpdateItemEdgeResolvers<ContextType>;
  BulkUpdateJobProgress?: BulkUpdateJobProgressResolvers<ContextType>;
  BulkUpdateUserError?: BulkUpdateUserErrorResolvers<ContextType>;
  Bundle?: BundleResolvers<ContextType>;
  BundleBasePriceRule?: BundleBasePriceRuleResolvers<ContextType>;
  BundleCondition?: BundleConditionResolvers<ContextType>;
  BundleConditionGroup?: BundleConditionGroupResolvers<ContextType>;
  BundleConfiguration?: BundleConfigurationResolvers<ContextType>;
  BundleConfigurationDeletePayload?: BundleConfigurationDeletePayloadResolvers<ContextType>;
  BundleConfigurationPayload?: BundleConfigurationPayloadResolvers<ContextType>;
  BundleConnection?: BundleConnectionResolvers<ContextType>;
  BundleCreatePayload?: BundleCreatePayloadResolvers<ContextType>;
  BundleDependencyAction?: BundleDependencyActionResolvers<ContextType>;
  BundleDependencyRule?: BundleDependencyRuleResolvers<ContextType>;
  BundleDependencyRulesSyncPayload?: BundleDependencyRulesSyncPayloadResolvers<ContextType>;
  BundleDiscountFixedPriceRule?: BundleDiscountFixedPriceRuleResolvers<ContextType>;
  BundleDiscountPercentPriceRule?: BundleDiscountPercentPriceRuleResolvers<ContextType>;
  BundleEdge?: BundleEdgeResolvers<ContextType>;
  BundleFixedPriceRule?: BundleFixedPriceRuleResolvers<ContextType>;
  BundleFreePriceRule?: BundleFreePriceRuleResolvers<ContextType>;
  BundleGroup?: BundleGroupResolvers<ContextType>;
  BundleGroupsSyncPayload?: BundleGroupsSyncPayloadResolvers<ContextType>;
  BundleItem?: BundleItemResolvers<ContextType>;
  BundleItemOptionSelection?: BundleItemOptionSelectionResolvers<ContextType>;
  BundleItemOptionValueSelection?: BundleItemOptionValueSelectionResolvers<ContextType>;
  BundlePriceRule?: BundlePriceRuleResolvers<ContextType>;
  BundlePriceRuleAmount?: BundlePriceRuleAmountResolvers<ContextType>;
  BundlePriceRulePercent?: BundlePriceRulePercentResolvers<ContextType>;
  BundlePricingTemplate?: BundlePricingTemplateResolvers<ContextType>;
  BundlePricingTemplatesSyncPayload?: BundlePricingTemplatesSyncPayloadResolvers<ContextType>;
  BundleUpdatePayload?: BundleUpdatePayloadResolvers<ContextType>;
  CatalogMutation?: CatalogMutationResolvers<ContextType>;
  CatalogQuery?: CatalogQueryResolvers<ContextType>;
  Category?: CategoryResolvers<ContextType>;
  CategoryConnection?: CategoryConnectionResolvers<ContextType>;
  CategoryCreatePayload?: CategoryCreatePayloadResolvers<ContextType>;
  CategoryDeletePayload?: CategoryDeletePayloadResolvers<ContextType>;
  CategoryEdge?: CategoryEdgeResolvers<ContextType>;
  CategoryMediaItem?: CategoryMediaItemResolvers<ContextType>;
  CategoryMovePayload?: CategoryMovePayloadResolvers<ContextType>;
  CategoryRebalancePayload?: CategoryRebalancePayloadResolvers<ContextType>;
  CategoryUpdatePayload?: CategoryUpdatePayloadResolvers<ContextType>;
  Collection?: CollectionResolvers<ContextType>;
  CollectionAddProductsPayload?: CollectionAddProductsPayloadResolvers<ContextType>;
  CollectionConnection?: CollectionConnectionResolvers<ContextType>;
  CollectionCreatePayload?: CollectionCreatePayloadResolvers<ContextType>;
  CollectionDeletePayload?: CollectionDeletePayloadResolvers<ContextType>;
  CollectionEdge?: CollectionEdgeResolvers<ContextType>;
  CollectionMediaItem?: CollectionMediaItemResolvers<ContextType>;
  CollectionMoveProductPayload?: CollectionMoveProductPayloadResolvers<ContextType>;
  CollectionProductConnection?: CollectionProductConnectionResolvers<ContextType>;
  CollectionProductEdge?: CollectionProductEdgeResolvers<ContextType>;
  CollectionRemoveProductsPayload?: CollectionRemoveProductsPayloadResolvers<ContextType>;
  CollectionRule?: CollectionRuleResolvers<ContextType>;
  CollectionUpdatePayload?: CollectionUpdatePayloadResolvers<ContextType>;
  CollectionUpdateRulesPayload?: CollectionUpdateRulesPayloadResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  Facet?: FacetResolvers<ContextType>;
  FacetCreatePayload?: FacetCreatePayloadResolvers<ContextType>;
  FacetDeletePayload?: FacetDeletePayloadResolvers<ContextType>;
  FacetGroup?: FacetGroupResolvers<ContextType>;
  FacetGroupCreatePayload?: FacetGroupCreatePayloadResolvers<ContextType>;
  FacetGroupDeletePayload?: FacetGroupDeletePayloadResolvers<ContextType>;
  FacetGroupUpdatePayload?: FacetGroupUpdatePayloadResolvers<ContextType>;
  FacetSwatch?: FacetSwatchResolvers<ContextType>;
  FacetSwatchCreatePayload?: FacetSwatchCreatePayloadResolvers<ContextType>;
  FacetSwatchDeletePayload?: FacetSwatchDeletePayloadResolvers<ContextType>;
  FacetSwatchUpdatePayload?: FacetSwatchUpdatePayloadResolvers<ContextType>;
  FacetUpdatePayload?: FacetUpdatePayloadResolvers<ContextType>;
  FacetValue?: FacetValueResolvers<ContextType>;
  FacetValueCreatePayload?: FacetValueCreatePayloadResolvers<ContextType>;
  FacetValueDeletePayload?: FacetValueDeletePayloadResolvers<ContextType>;
  FacetValueUpdatePayload?: FacetValueUpdatePayloadResolvers<ContextType>;
  File?: FileResolvers<ContextType>;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  InventoryAlertThreshold?: InventoryAlertThresholdResolvers<ContextType>;
  InventoryBackorder?: InventoryBackorderResolvers<ContextType>;
  InventoryItem?: InventoryItemResolvers<ContextType>;
  InventoryItemConnection?: InventoryItemConnectionResolvers<ContextType>;
  InventoryItemCost?: InventoryItemCostResolvers<ContextType>;
  InventoryItemEdge?: InventoryItemEdgeResolvers<ContextType>;
  InventoryItemUpdatePayload?: InventoryItemUpdatePayloadResolvers<ContextType>;
  InventoryMutation?: InventoryMutationResolvers<ContextType>;
  InventoryQuantities?: InventoryQuantitiesResolvers<ContextType>;
  InventoryQuery?: InventoryQueryResolvers<ContextType>;
  InventorySkuStatus?: InventorySkuStatusResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Listing?: ListingResolvers<ContextType>;
  ListingConnection?: ListingConnectionResolvers<ContextType>;
  ListingEdge?: ListingEdgeResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  OperationResult?: OperationResultResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  PricingWidgetPayload?: PricingWidgetPayloadResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  ProductBulkUpdateJob?: ProductBulkUpdateJobResolvers<ContextType>;
  ProductBulkUpdateJobConnection?: ProductBulkUpdateJobConnectionResolvers<ContextType>;
  ProductBulkUpdateJobEdge?: ProductBulkUpdateJobEdgeResolvers<ContextType>;
  ProductBulkUpdatePayload?: ProductBulkUpdatePayloadResolvers<ContextType>;
  ProductCategoryAssignment?: ProductCategoryAssignmentResolvers<ContextType>;
  ProductConnection?: ProductConnectionResolvers<ContextType>;
  ProductCreatePayload?: ProductCreatePayloadResolvers<ContextType>;
  ProductDeletePayload?: ProductDeletePayloadResolvers<ContextType>;
  ProductEdge?: ProductEdgeResolvers<ContextType>;
  ProductFeature?: ProductFeatureResolvers<ContextType>;
  ProductFeatureCreatePayload?: ProductFeatureCreatePayloadResolvers<ContextType>;
  ProductFeatureDeletePayload?: ProductFeatureDeletePayloadResolvers<ContextType>;
  ProductFeatureUpdatePayload?: ProductFeatureUpdatePayloadResolvers<ContextType>;
  ProductFeatureValue?: ProductFeatureValueResolvers<ContextType>;
  ProductFeaturesSyncPayload?: ProductFeaturesSyncPayloadResolvers<ContextType>;
  ProductInventoryWidget?: ProductInventoryWidgetResolvers<ContextType>;
  ProductMediaItem?: ProductMediaItemResolvers<ContextType>;
  ProductOption?: ProductOptionResolvers<ContextType>;
  ProductOptionCreatePayload?: ProductOptionCreatePayloadResolvers<ContextType>;
  ProductOptionDeletePayload?: ProductOptionDeletePayloadResolvers<ContextType>;
  ProductOptionSwatch?: ProductOptionSwatchResolvers<ContextType>;
  ProductOptionUpdatePayload?: ProductOptionUpdatePayloadResolvers<ContextType>;
  ProductOptionValue?: ProductOptionValueResolvers<ContextType>;
  ProductOptionsSyncPayload?: ProductOptionsSyncPayloadResolvers<ContextType>;
  ProductPriceRange?: ProductPriceRangeResolvers<ContextType>;
  ProductSeo?: ProductSeoResolvers<ContextType>;
  ProductUpdatePayload?: ProductUpdatePayloadResolvers<ContextType>;
  ProductUpdateStatusPayload?: ProductUpdateStatusPayloadResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RichText?: RichTextResolvers<ContextType>;
  SelectedOption?: SelectedOptionResolvers<ContextType>;
  Seo?: SeoResolvers<ContextType>;
  SkuStatusMetric?: SkuStatusMetricResolvers<ContextType>;
  Tag?: TagResolvers<ContextType>;
  TagConnection?: TagConnectionResolvers<ContextType>;
  TagCreatePayload?: TagCreatePayloadResolvers<ContextType>;
  TagDeletePayload?: TagDeletePayloadResolvers<ContextType>;
  TagEdge?: TagEdgeResolvers<ContextType>;
  TagUpdatePayload?: TagUpdatePayloadResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
  Variant?: VariantResolvers<ContextType>;
  VariantConnection?: VariantConnectionResolvers<ContextType>;
  VariantCost?: VariantCostResolvers<ContextType>;
  VariantCostConnection?: VariantCostConnectionResolvers<ContextType>;
  VariantCostEdge?: VariantCostEdgeResolvers<ContextType>;
  VariantCreatePayload?: VariantCreatePayloadResolvers<ContextType>;
  VariantDeletePayload?: VariantDeletePayloadResolvers<ContextType>;
  VariantDimensions?: VariantDimensionsResolvers<ContextType>;
  VariantEdge?: VariantEdgeResolvers<ContextType>;
  VariantMediaItem?: VariantMediaItemResolvers<ContextType>;
  VariantPrice?: VariantPriceResolvers<ContextType>;
  VariantPriceConnection?: VariantPriceConnectionResolvers<ContextType>;
  VariantPriceEdge?: VariantPriceEdgeResolvers<ContextType>;
  VariantPriceHistoryStatistics?: VariantPriceHistoryStatisticsResolvers<ContextType>;
  VariantUpdateMediaPayload?: VariantUpdateMediaPayloadResolvers<ContextType>;
  VariantUpdateOptionsPayload?: VariantUpdateOptionsPayloadResolvers<ContextType>;
  VariantUpdatePricingPayload?: VariantUpdatePricingPayloadResolvers<ContextType>;
  VariantWeight?: VariantWeightResolvers<ContextType>;
  Vendor?: VendorResolvers<ContextType>;
  VendorConnection?: VendorConnectionResolvers<ContextType>;
  VendorCreatePayload?: VendorCreatePayloadResolvers<ContextType>;
  VendorEdge?: VendorEdgeResolvers<ContextType>;
  Warehouse?: WarehouseResolvers<ContextType>;
  WarehouseConnection?: WarehouseConnectionResolvers<ContextType>;
  WarehouseCreatePayload?: WarehouseCreatePayloadResolvers<ContextType>;
  WarehouseDeletePayload?: WarehouseDeletePayloadResolvers<ContextType>;
  WarehouseEdge?: WarehouseEdgeResolvers<ContextType>;
  WarehouseStock?: WarehouseStockResolvers<ContextType>;
  WarehouseStockConnection?: WarehouseStockConnectionResolvers<ContextType>;
  WarehouseStockCreatePayload?: WarehouseStockCreatePayloadResolvers<ContextType>;
  WarehouseStockDeletePayload?: WarehouseStockDeletePayloadResolvers<ContextType>;
  WarehouseStockEdge?: WarehouseStockEdgeResolvers<ContextType>;
  WarehouseUpdatePayload?: WarehouseUpdatePayloadResolvers<ContextType>;
  WidgetQuery?: WidgetQueryResolvers<ContextType>;
}>;


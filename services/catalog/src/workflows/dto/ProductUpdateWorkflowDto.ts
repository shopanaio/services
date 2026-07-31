import type { UserError } from "../../scripts/types/ScriptResult.js";
import type { RichTextInput } from "../../scripts/product/dto/shared.js";
import type { OptionSyncItemInput } from "../../scripts/option/dto/index.js";
import type { FeatureSyncItemInput } from "../../scripts/feature/dto/index.js";

export type { RichTextInput };

/**
 * Input for ProductUpdateWorkflow.
 */
export interface ProductUpdateWorkflowInput {
  productId: string;
  expectedRevision?: number;
  operations: ProductUpdateOperation[];
  context: WorkflowContext;
}

/**
 * Context for workflow execution.
 */
export interface WorkflowContext {
  organizationId: string;
  storeId: string;
  userId?: string;
  locale: string;
}

/**
 * Operation types - product or variant level updates.
 */
export interface ProductUpdateOperationMeta {
  fieldPrefix?: string[];
}

export type ProductUpdateOperation =
  | {
      type: "productUpdate";
      params: ProductUpdateParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "productCategoryUpdate";
      params: ProductCategoryUpdateParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "productTagUpdate";
      params: ProductTagUpdateParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "productOptionsSync";
      params: ProductOptionsSyncParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "productFeaturesSync";
      params: ProductFeaturesSyncParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "productComponentSettingsUpdate";
      params: ProductComponentSettingsUpdateParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "productComponentRemove";
      params: ProductComponentRemoveParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "productComponentConfigurationCreate";
      params: ProductComponentConfigurationCreateParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "productComponentConfigurationUpdate";
      params: ProductComponentConfigurationUpdateParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "productComponentConfigurationDelete";
      params: ProductComponentConfigurationDeleteParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "productComponentGroupsSync";
      params: ProductComponentGroupsSyncParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "productComponentPricingTemplatesSync";
      params: ProductComponentPricingTemplatesSyncParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "productComponentDependencyRulesSync";
      params: ProductComponentDependencyRulesSyncParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "variantCreate";
      params: VariantCreateParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "variantUpdate";
      params: VariantUpdateParams;
      meta?: ProductUpdateOperationMeta;
    }
  | {
      type: "variantDelete";
      params: VariantDeleteParams;
      meta?: ProductUpdateOperationMeta;
    };

/**
 * Product-level update parameters.
 * All fields are optional - only provided fields are updated.
 */
export interface ProductUpdateParams {
  id: string;
  handle?: string;
  title?: string;
  vendorId?: string | null;
  content?: ProductContentParams;
  seo?: ProductSeoParams;
  status?: "published" | "draft";
  media?: ProductMediaParams;
}

export interface ProductContentParams {
  description?: RichTextInput | null;
  excerpt?: RichTextInput | null;
}

export interface ProductSeoParams {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageId?: string;
}

export interface ProductMediaParams {
  fileIds: string[];
}

export type ProductCategoryOperationAction =
  | "add"
  | "remove"
  | "setPrimary"
  | "move";

export interface ProductCategoryUpdateParams {
  productId: string;
  categoryId: string;
  action: ProductCategoryOperationAction;
  afterProductId?: string | null;
  beforeProductId?: string | null;
}

export type ProductTagOperationAction = "add" | "remove";

export interface ProductTagUpdateParams {
  productId: string;
  tagId: string;
  action: ProductTagOperationAction;
}

export interface ProductOptionsSyncParams {
  productId: string;
  options: OptionSyncItemInput[];
}

export interface ProductFeaturesSyncParams {
  productId: string;
  features: FeatureSyncItemInput[];
}

export type ProductComponentDisplayStyle =
  | "ACCORDION"
  | "TABS"
  | "FLAT"
  | "WIZARD";

export interface ProductComponentSettingsUpdateParams {
  productId: string;
  displayStyle: ProductComponentDisplayStyle;
}

export interface ProductComponentRemoveParams {
  productId: string;
}

export interface ProductComponentConfigurationCreateParams {
  productId: string;
  clientMutationId: string;
  name: string;
}

export interface ProductComponentConfigurationUpdateParams {
  productId: string;
  configurationId: string;
  name: string;
}

export interface ProductComponentConfigurationDeleteParams {
  productId: string;
  configurationId: string;
}

export interface ProductComponentGroupsSyncParams {
  productId: string;
  configurationId: string;
  groups: ProductComponentGroupSyncItem[];
}

export interface ProductComponentPricingTemplatesSyncParams {
  productId: string;
  configurationId: string;
  pricingTemplates: ProductComponentPricingTemplateSyncItem[];
}

export interface ProductComponentDependencyRulesSyncParams {
  productId: string;
  configurationId: string;
  dependencyRules: ProductComponentDependencyRuleSyncItem[];
}

export interface ProductComponentGroupSyncItem {
  id?: string;
  title: string;
  minSelection?: number | null;
  maxSelection?: number | null;
  sortIndex: number;
  items: ProductComponentItemSyncItem[];
}

export interface ProductComponentItemSyncItem {
  id?: string;
  itemType: "PRODUCT" | "VARIANT";
  refProductId?: string | null;
  refVariantId?: string | null;
  featuredImageId?: string | null;
  minQty?: number | null;
  maxQty?: number | null;
  defaultQty?: number | null;
  priceRule?: ProductComponentPriceRuleInput | null;
  pricingTemplateId?: string | null;
  optionSelections?: ProductComponentItemOptionSelectionSyncItem[] | null;
  title?: string | null;
  visible: boolean;
  selected: boolean;
  sortIndex: number;
}

export interface ProductComponentItemOptionSelectionSyncItem {
  id?: string;
  optionId: string;
  parentOptionId?: string | null;
  sortIndex: number;
  values: ProductComponentItemOptionValueSelectionSyncItem[];
}

export interface ProductComponentItemOptionValueSelectionSyncItem {
  id?: string;
  optionValueId?: string | null;
  value: string;
  status: "SELECTED" | "DESELECTED" | "UNAVAILABLE" | "NEW";
  sortIndex: number;
}

export interface ProductComponentPriceRuleInput {
  id?: string;
  strategy: "BASE" | "ADJUSTMENT" | "OVERRIDE" | "FREE";
  operation?: "INCREASE" | "DECREASE" | null;
  valueType?: "FIXED_AMOUNT" | "PERCENTAGE" | null;
  amounts?: ProductComponentPriceRuleAmountInput[] | null;
  percentageBps?: number | null;
}

export interface ProductComponentPriceRuleAmountInput {
  currency: string;
  amountMinor: number;
}

export interface ProductComponentPricingTemplateSyncItem {
  id?: string;
  name: string;
  priceRule: ProductComponentPriceRuleInput;
  sortIndex: number;
}

export interface ProductComponentDependencyRuleSyncItem {
  id?: string;
  name: string;
  enabled: boolean;
  priority: number;
  logicOperator: "AND" | "OR";
  conditionGroups: ProductComponentConditionGroupSyncItem[];
  actions: ProductComponentDependencyActionSyncItem[];
}

export interface ProductComponentConditionGroupSyncItem {
  id?: string;
  logicOperator: "AND" | "OR";
  sortIndex: number;
  conditions: ProductComponentConditionSyncItem[];
}

export interface ProductComponentConditionSyncItem {
  id?: string;
  category: "STATE_CHECK" | "NUMERIC";
  subject: "ITEM_SELECTED" | "ITEM_QTY" | "GROUP_TOTAL_QTY";
  operator: "IS_SELECTED" | "IS_NOT_SELECTED" | "EQ" | "GTE" | "LTE";
  targetType: "ITEM" | "GROUP" | "CONFIGURATION";
  targetId: string;
  value?: number | null;
  sortIndex: number;
}

export interface ProductComponentDependencyActionSyncItem {
  id?: string;
  actionType:
    | "SHOW"
    | "HIDE"
    | "SET_REQUIRED"
    | "ADJUST_PRICE";
  targetType: "ITEM" | "GROUP" | "CONFIGURATION";
  targetId: string;
  requiredValue?: boolean | null;
  priceRule?: ProductComponentPriceRuleInput | null;
  stackable: boolean;
  sortIndex: number;
}

export interface VariantCreateParams {
  productId: string;
  clientMutationId: string;
  options: VariantOptionsParams;
  pricing?: VariantPricingParams;
  inventory?: VariantInventoryParams;
  dimensions?: VariantDimensionsParams;
  weight?: number | null;
  media?: VariantMediaParams;
}

/**
 * Variant-level update parameters.
 * All fields are optional - only provided fields are updated.
 */
export interface VariantUpdateParams {
  variantId: string;
  pricing?: VariantPricingParams;
  inventory?: VariantInventoryParams;
  dimensions?: VariantDimensionsParams;
  weight?: number | null;
  media?: VariantMediaParams;
  options?: VariantOptionsParams;
}

export interface VariantDeleteParams {
  variantId: string;
}

export interface VariantPricingParams {
  currency: string;
  amountMinor: number;
  compareAtMinor?: number | null;
}

export interface VariantInventoryParams {
  warehouseId?: string;
  onHand?: number;
  unavailable?: number;
  sku?: string | null;
  trackInventory?: boolean;
  continueSellingWhenOutOfStock?: boolean;
  unitCostMinor?: number | null;
  costCurrency?: string | null;
}

export interface VariantDimensionsParams {
  width: number;
  height: number;
  length: number;
}

export interface VariantMediaParams {
  fileIds: string[];
}

export interface VariantOptionsParams {
  set: VariantOptionLink[];
}

export interface VariantOptionLink {
  optionId: string;
  optionValueId: string;
}

/**
 * Result of ProductUpdateWorkflow.
 */
export interface ProductUpdateWorkflowResult {
  /** Updated product with new revision, or null if failed */
  product: { id: string; revision: number } | null;
  /** Results for each operation */
  operationResults: OperationResult[];
  /** Aggregated errors from all operations */
  userErrors: UserError[];
}

/**
 * Result of a single operation within the workflow.
 */
export interface OperationResult {
  type:
    | "productUpdate"
    | "productCategoryUpdate"
    | "productTagUpdate"
    | "productOptionsSync"
    | "productFeaturesSync"
    | "productComponentSettingsUpdate"
    | "productComponentRemove"
    | "productComponentConfigurationCreate"
    | "productComponentConfigurationUpdate"
    | "productComponentConfigurationDelete"
    | "productComponentGroupsSync"
    | "productComponentPricingTemplatesSync"
    | "productComponentDependencyRulesSync"
    | "variantCreate"
    | "variantDelete"
    | "variantUpdate";
  applied: boolean;
  clientMutationId?: string;
  entityId?: string;
  errors: UserError[];
}

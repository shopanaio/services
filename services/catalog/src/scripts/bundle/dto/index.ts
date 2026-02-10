import type {
  BundleGroup,
  BundleItem,
  BundlePricingTemplate,
  DependencyRule,
  ConditionGroup,
  Condition,
  DependencyAction,
} from "../../../repositories/models/index.js";
import type { UserError } from "../../../kernel/BaseScript.js";

// ==============================
// Bundle Group DTOs
// ==============================

export interface BundleGroupCreateParams {
  productId: string;
  title: string;
  sortIndex?: number;
  minSelection?: number | null;
  maxSelection?: number | null;
}

export interface BundleGroupUpdateParams {
  id: string;
  title?: string;
  sortIndex?: number;
  minSelection?: number | null;
  maxSelection?: number | null;
}

export interface BundleGroupResult {
  bundleGroup: BundleGroup | undefined;
  userErrors: UserError[];
}

// ==============================
// Bundle Item DTOs
// ==============================

export interface BundleItemCreateParams {
  groupId: string;
  itemType: string;
  sortIndex?: number;
  refProductId?: string | null;
  refVariantId?: string | null;
  title?: string | null;
  featuredImageId?: string | null;
  excludedVariantIds?: string[] | null;
  minQty?: number;
  maxQty?: number | null;
  defaultQty?: number;
  priceType?: string | null;
  priceValue?: number | null;
  pricingTemplateId?: string | null;
  visible?: boolean;
  selected?: boolean;
}

export interface BundleItemUpdateParams {
  id: string;
  title?: string | null;
  featuredImageId?: string | null;
  excludedVariantIds?: string[] | null;
  minQty?: number;
  maxQty?: number | null;
  defaultQty?: number;
  priceType?: string | null;
  priceValue?: number | null;
  pricingTemplateId?: string | null;
  visible?: boolean;
  selected?: boolean;
  sortIndex?: number;
}

export interface BundleItemResult {
  bundleItem: BundleItem | undefined;
  userErrors: UserError[];
}

// ==============================
// Bundle Pricing Template DTOs
// ==============================

export interface BundlePricingTemplateCreateParams {
  productId: string;
  name: string;
  priceType: string;
  priceValue?: number | null;
  sortIndex?: number;
}

export interface BundlePricingTemplateUpdateParams {
  id: string;
  name?: string;
  priceType?: string;
  priceValue?: number | null;
  sortIndex?: number;
}

export interface BundlePricingTemplateResult {
  bundlePricingTemplate: BundlePricingTemplate | undefined;
  userErrors: UserError[];
}

// ==============================
// Dependency Rule DTOs
// ==============================

export interface DependencyRuleCreateParams {
  productId: string;
  name: string;
  enabled?: boolean;
  priority?: number;
  logicOperator?: string;
}

export interface DependencyRuleUpdateParams {
  id: string;
  name?: string;
  enabled?: boolean;
  priority?: number;
  logicOperator?: string;
}

export interface DependencyRuleResult {
  dependencyRule: DependencyRule | undefined;
  userErrors: UserError[];
}

// ==============================
// Condition Group DTOs
// ==============================

export interface ConditionGroupCreateParams {
  ruleId: string;
  logicOperator?: string;
  sortIndex?: number;
}

export interface ConditionGroupUpdateParams {
  id: string;
  logicOperator?: string;
  sortIndex?: number;
}

export interface ConditionGroupResult {
  conditionGroup: ConditionGroup | undefined;
  userErrors: UserError[];
}

// ==============================
// Condition DTOs
// ==============================

export interface ConditionCreateParams {
  groupId: string;
  category: string;
  subject: string;
  operator: string;
  targetType: string;
  targetId: string;
  value?: number | null;
  sortIndex?: number;
}

export interface ConditionUpdateParams {
  id: string;
  category?: string;
  subject?: string;
  operator?: string;
  targetType?: string;
  targetId?: string;
  value?: number | null;
  sortIndex?: number;
}

export interface ConditionResult {
  condition: Condition | undefined;
  userErrors: UserError[];
}

// ==============================
// Dependency Action DTOs
// ==============================

export interface DependencyActionCreateParams {
  ruleId: string;
  actionType: string;
  targetType: string;
  targetId?: string | null;
  requiredValue?: boolean | null;
  priceType?: string | null;
  priceValue?: number | null;
  stackable?: boolean;
  sortIndex?: number;
}

export interface DependencyActionUpdateParams {
  id: string;
  actionType?: string;
  targetType?: string;
  targetId?: string | null;
  requiredValue?: boolean | null;
  priceType?: string | null;
  priceValue?: number | null;
  stackable?: boolean;
  sortIndex?: number;
}

export interface DependencyActionResult {
  dependencyAction: DependencyAction | undefined;
  userErrors: UserError[];
}

// ==============================
// Common Delete DTOs
// ==============================

export interface DeleteParams {
  id: string;
}

export interface DeleteResult {
  deletedId: string | undefined;
  userErrors: UserError[];
}

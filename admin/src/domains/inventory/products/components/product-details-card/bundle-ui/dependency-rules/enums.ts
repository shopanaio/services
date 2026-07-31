import {
  ProductComponentConditionCategory,
  ProductComponentConditionOperator,
  ProductComponentConditionSubject,
  ProductComponentDependencyActionType,
  ProductComponentDependencyTargetType,
  ProductComponentLogicOperator,
} from "@/graphql/types";

export const ComparisonOperator = {
  GTE: ProductComponentConditionOperator.Gte,
  EQ: ProductComponentConditionOperator.Eq,
  LTE: ProductComponentConditionOperator.Lte,
} as const;
export type ComparisonOperator =
  (typeof ComparisonOperator)[keyof typeof ComparisonOperator];

// ============================================================================
// Logic Operators (for combining conditions within a rule)
// ============================================================================

export const LogicOperator = {
  AND: ProductComponentLogicOperator.And,
  OR: ProductComponentLogicOperator.Or,
} as const;
export type LogicOperator = (typeof LogicOperator)[keyof typeof LogicOperator];

// ============================================================================
// State Check Operators (for selection-based conditions)
// ============================================================================

export const StateCheckOperator = {
  IS_SELECTED: ProductComponentConditionOperator.IsSelected,
  IS_NOT_SELECTED: ProductComponentConditionOperator.IsNotSelected,
} as const;
export type StateCheckOperator =
  (typeof StateCheckOperator)[keyof typeof StateCheckOperator];

// ============================================================================
// Condition Category (discriminator for the expanded condition system)
// ============================================================================

export const ConditionCategory = {
  STATE_CHECK: ProductComponentConditionCategory.StateCheck,
  NUMERIC: ProductComponentConditionCategory.Numeric,
} as const;
export type ConditionCategory =
  (typeof ConditionCategory)[keyof typeof ConditionCategory];

// ============================================================================
// Condition Subject (what the condition evaluates)
// ============================================================================

export const ConditionSubject = {
  ITEM_SELECTED: ProductComponentConditionSubject.ItemSelected,
  ITEM_QTY: ProductComponentConditionSubject.ItemQty,
  GROUP_TOTAL_QTY: ProductComponentConditionSubject.GroupTotalQty,
} as const;
export type ConditionSubject =
  (typeof ConditionSubject)[keyof typeof ConditionSubject];

// ============================================================================
// Target Types
// ============================================================================

export const DependencyTargetType = {
  ITEM: ProductComponentDependencyTargetType.Item,
  GROUP: ProductComponentDependencyTargetType.Group,
  BUNDLE: ProductComponentDependencyTargetType.Configuration,
} as const;
export type DependencyTargetType =
  (typeof DependencyTargetType)[keyof typeof DependencyTargetType];

// ============================================================================
// Action Category (groups related action types)
// ============================================================================

export enum ActionCategory {
  VISIBILITY = "VISIBILITY",
  SELECTION = "SELECTION",
  PRICE = "PRICE",
}

// ============================================================================
// Action Types
// ============================================================================

export const DependencyActionType = {
  SHOW: ProductComponentDependencyActionType.Show,
  HIDE: ProductComponentDependencyActionType.Hide,
  SET_REQUIRED: ProductComponentDependencyActionType.SetRequired,
  ADJUST_PRICE: ProductComponentDependencyActionType.AdjustPrice,
} as const;
export type DependencyActionType =
  (typeof DependencyActionType)[keyof typeof DependencyActionType];

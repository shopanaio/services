import {
  DependencyActionType,
  DependencyTargetType,
  ActionCategory,
  ComparisonOperator,
  StateCheckOperator,
  LogicOperator,
  ConditionSubject,
} from "./enums";

// ============================================================================
// Label Maps
// ============================================================================

export const ACTION_TYPE_LABELS: Record<DependencyActionType, string> = {
  [DependencyActionType.SHOW]: "show",
  [DependencyActionType.HIDE]: "hide",
  [DependencyActionType.ENABLE]: "enable",
  [DependencyActionType.DISABLE]: "disable",
  [DependencyActionType.SET_QTY]: "set quantity",
  [DependencyActionType.SET_QTY_LIMITS]: "set quantity limits",
  [DependencyActionType.SET_REQUIRED]: "set required",
  [DependencyActionType.OVERRIDE_PRICE]: "override price",
  [DependencyActionType.ADJUST_PRICE]: "adjust price",
};

export const ACTION_CATEGORY_LABELS: Record<ActionCategory, string> = {
  [ActionCategory.VISIBILITY]: "Visibility",
  [ActionCategory.STATE]: "State",
  [ActionCategory.QUANTITY]: "Quantity",
  [ActionCategory.SELECTION]: "Selection",
  [ActionCategory.PRICE]: "Price",
};

export const TARGET_TYPE_LABELS: Record<DependencyTargetType, string> = {
  [DependencyTargetType.ITEM]: "Item",
  [DependencyTargetType.GROUP]: "Group",
  [DependencyTargetType.BUNDLE]: "Bundle",
};

// ============================================================================
// New System Labels
// ============================================================================

export const COMPARISON_OPERATOR_LABELS: Record<ComparisonOperator, string> = {
  [ComparisonOperator.GTE]: ">=",
  [ComparisonOperator.LTE]: "<=",
  [ComparisonOperator.EQ]: "=",
  [ComparisonOperator.GT]: ">",
  [ComparisonOperator.LT]: "<",
  [ComparisonOperator.NEQ]: "!=",
  [ComparisonOperator.BETWEEN]: "between",
  [ComparisonOperator.IN_LIST]: "in",
};

export const STATE_CHECK_LABELS: Record<StateCheckOperator, string> = {
  [StateCheckOperator.IS_SELECTED]: "is selected",
  [StateCheckOperator.IS_NOT_SELECTED]: "is not selected",
  [StateCheckOperator.IS_OUT_OF_STOCK]: "is out of stock",
  [StateCheckOperator.IS_IN_STOCK]: "is in stock",
  [StateCheckOperator.CONTAINS]: "contains",
};

export const LOGIC_OPERATOR_LABELS: Record<LogicOperator, string> = {
  [LogicOperator.AND]: "AND",
  [LogicOperator.OR]: "OR",
};

export const CONDITION_SUBJECT_LABELS: Record<ConditionSubject, string> = {
  [ConditionSubject.ITEM_SELECTED]: "selection",
  [ConditionSubject.ITEM_QTY]: "quantity",
  [ConditionSubject.ITEM_STOCK]: "stock",
  [ConditionSubject.GROUP_UNIQUE_COUNT]: "unique items",
  [ConditionSubject.GROUP_TOTAL_QTY]: "total quantity",
  [ConditionSubject.GROUP_SUBTOTAL]: "subtotal",
  [ConditionSubject.GROUP_CONTAINS]: "contains",
  [ConditionSubject.BUNDLE_SUBTOTAL]: "bundle subtotal",
};

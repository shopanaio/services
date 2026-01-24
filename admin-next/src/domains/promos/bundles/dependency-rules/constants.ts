import {
  DependencyConditionType,
  DependencyActionType,
  DependencyTargetType,
  ComparisonOperator,
  StateCheckOperator,
  LogicOperator,
  ConditionSubject,
} from "./enums";

// ============================================================================
// Legacy Label Maps
// ============================================================================

export const CONDITION_TYPE_LABELS: Record<DependencyConditionType, string> = {
  [DependencyConditionType.IS_SELECTED]: "is selected",
  [DependencyConditionType.IS_NOT_SELECTED]: "is not selected",
  [DependencyConditionType.QTY_GTE]: "quantity >=",
  [DependencyConditionType.QTY_LTE]: "quantity <=",
  [DependencyConditionType.QTY_EQ]: "quantity =",
  [DependencyConditionType.GROUP_UNIQUE_GTE]: "unique items >=",
  [DependencyConditionType.GROUP_TOTAL_QTY_GTE]: "total quantity >=",
};

export const ACTION_TYPE_LABELS: Record<DependencyActionType, string> = {
  [DependencyActionType.SHOW]: "show",
  [DependencyActionType.HIDE]: "hide",
  [DependencyActionType.ENABLE]: "enable",
  [DependencyActionType.DISABLE]: "disable",
  [DependencyActionType.SET_QTY]: "set quantity",
  [DependencyActionType.OVERRIDE_PRICE]: "override price",
  [DependencyActionType.ADJUST_PRICE]: "adjust price",
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
  [StateCheckOperator.CONTAINS]: "contains",
};

export const LOGIC_OPERATOR_LABELS: Record<LogicOperator, string> = {
  [LogicOperator.AND]: "AND",
  [LogicOperator.OR]: "OR",
};

export const CONDITION_SUBJECT_LABELS: Record<ConditionSubject, string> = {
  [ConditionSubject.ITEM_SELECTED]: "selection",
  [ConditionSubject.ITEM_QTY]: "quantity",
  [ConditionSubject.GROUP_UNIQUE_COUNT]: "unique items",
  [ConditionSubject.GROUP_TOTAL_QTY]: "total quantity",
  [ConditionSubject.GROUP_CONTAINS]: "contains",
};

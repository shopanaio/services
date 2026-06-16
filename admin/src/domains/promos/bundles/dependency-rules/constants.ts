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
  [DependencyActionType.SET_REQUIRED]: "set required",
  [DependencyActionType.ADJUST_PRICE]: "adjust price",
};

export const ACTION_CATEGORY_LABELS: Record<ActionCategory, string> = {
  [ActionCategory.VISIBILITY]: "Visibility",
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
  [ComparisonOperator.EQ]: "=",
  [ComparisonOperator.LTE]: "<=",
};

export const STATE_CHECK_LABELS: Record<StateCheckOperator, string> = {
  [StateCheckOperator.IS_SELECTED]: "is selected",
  [StateCheckOperator.IS_NOT_SELECTED]: "is not selected",
};

export const LOGIC_OPERATOR_LABELS: Record<LogicOperator, string> = {
  [LogicOperator.AND]: "AND",
  [LogicOperator.OR]: "OR",
};

export const CONDITION_SUBJECT_LABELS: Record<ConditionSubject, string> = {
  [ConditionSubject.ITEM_SELECTED]: "selection",
  [ConditionSubject.ITEM_QTY]: "quantity",
  [ConditionSubject.GROUP_TOTAL_QTY]: "total quantity",
};

// ============================================================================
// Chip Display Phrases
// ============================================================================

/** Short subject names for chip display */
export const SUBJECT_SHORT: Partial<Record<ConditionSubject, string>> = {
  [ConditionSubject.ITEM_QTY]: "quantity",
  [ConditionSubject.GROUP_TOTAL_QTY]: "quantity",
};

/** Grammatically correct verb phrases for comparison operators */
export const OPERATOR_PHRASE: Record<ComparisonOperator, string> = {
  [ComparisonOperator.GTE]: "is at least",
  [ComparisonOperator.EQ]: "equals",
  [ComparisonOperator.LTE]: "is at most",
};

/** Grammatically correct phrases for action chip display */
export const ACTION_PHRASE: Record<DependencyActionType, string> = {
  [DependencyActionType.SHOW]: "is shown",
  [DependencyActionType.HIDE]: "is hidden",
  [DependencyActionType.SET_REQUIRED]: "is required",
  [DependencyActionType.ADJUST_PRICE]: "price adjust",
};

// ============================================================================
// Target Type Colors
// ============================================================================

export const TARGET_TYPE_COLORS: Record<DependencyTargetType, string> = {
  [DependencyTargetType.ITEM]: "blue",
  [DependencyTargetType.GROUP]: "purple",
  [DependencyTargetType.BUNDLE]: "gold",
};

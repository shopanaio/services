// ============================================================================
// Comparison Operators (for numeric conditions)
// ============================================================================

export enum ComparisonOperator {
  GTE = "GTE",
  LTE = "LTE",
  EQ = "EQ",
  GT = "GT",
  LT = "LT",
  NEQ = "NEQ",
  BETWEEN = "BETWEEN",
  IN_LIST = "IN_LIST",
}

// ============================================================================
// Logic Operators (for combining conditions within a rule)
// ============================================================================

export enum LogicOperator {
  AND = "AND",
  OR = "OR",
}

// ============================================================================
// State Check Operators (for selection-based conditions)
// ============================================================================

export enum StateCheckOperator {
  IS_SELECTED = "IS_SELECTED",
  IS_NOT_SELECTED = "IS_NOT_SELECTED",
  CONTAINS = "CONTAINS",
}

// ============================================================================
// Condition Category (discriminator for the expanded condition system)
// ============================================================================

export enum ConditionCategory {
  STATE_CHECK = "STATE_CHECK",
  NUMERIC = "NUMERIC",
}

// ============================================================================
// Condition Subject (what the condition evaluates)
// ============================================================================

export enum ConditionSubject {
  ITEM_SELECTED = "ITEM_SELECTED",
  ITEM_QTY = "ITEM_QTY",
  GROUP_UNIQUE_COUNT = "GROUP_UNIQUE_COUNT",
  GROUP_TOTAL_QTY = "GROUP_TOTAL_QTY",
  GROUP_CONTAINS = "GROUP_CONTAINS",
}

// ============================================================================
// Target Types
// ============================================================================

export enum DependencyTargetType {
  ITEM = "ITEM",
  GROUP = "GROUP",
  BUNDLE = "BUNDLE",
}

// ============================================================================
// Action Types
// ============================================================================

export enum DependencyActionType {
  SHOW = "SHOW",
  HIDE = "HIDE",
  ENABLE = "ENABLE",
  DISABLE = "DISABLE",
  SET_QTY = "SET_QTY",
  OVERRIDE_PRICE = "OVERRIDE_PRICE",
  ADJUST_PRICE = "ADJUST_PRICE",
}

// ============================================================================
// Condition Types (legacy - preserved for backward compat)
// ============================================================================

export enum DependencyConditionType {
  IS_SELECTED = "IS_SELECTED",
  IS_NOT_SELECTED = "IS_NOT_SELECTED",
  QTY_GTE = "QTY_GTE",
  QTY_LTE = "QTY_LTE",
  QTY_EQ = "QTY_EQ",
  GROUP_UNIQUE_GTE = "GROUP_UNIQUE_GTE",
  GROUP_TOTAL_QTY_GTE = "GROUP_TOTAL_QTY_GTE",
}

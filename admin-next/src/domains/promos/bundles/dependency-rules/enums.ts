// ============================================================================
// Comparison Operators (for numeric conditions)
// ============================================================================

export enum ComparisonOperator {
  GT = "GT",
  GTE = "GTE",
  EQ = "EQ",
  LTE = "LTE",
  LT = "LT",
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
  IS_OUT_OF_STOCK = "IS_OUT_OF_STOCK",
  IS_IN_STOCK = "IS_IN_STOCK",
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
  ITEM_STOCK = "ITEM_STOCK",
  GROUP_UNIQUE_COUNT = "GROUP_UNIQUE_COUNT",
  GROUP_TOTAL_QTY = "GROUP_TOTAL_QTY",
  GROUP_SUBTOTAL = "GROUP_SUBTOTAL",
  GROUP_CONTAINS = "GROUP_CONTAINS",
  BUNDLE_SUBTOTAL = "BUNDLE_SUBTOTAL",
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
// Action Category (groups related action types)
// ============================================================================

export enum ActionCategory {
  VISIBILITY = "VISIBILITY",
  STATE = "STATE",
  QUANTITY = "QUANTITY",
  SELECTION = "SELECTION",
  PRICE = "PRICE",
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
  SET_QTY_LIMITS = "SET_QTY_LIMITS",
  SET_REQUIRED = "SET_REQUIRED",
  OVERRIDE_PRICE = "OVERRIDE_PRICE",
  ADJUST_PRICE = "ADJUST_PRICE",
}


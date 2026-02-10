// ============================================================================
// Comparison Operators (for numeric conditions)
// ============================================================================

export enum ComparisonOperator {
  GTE = "GTE",
  EQ = "EQ",
  LTE = "LTE",
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
  GROUP_TOTAL_QTY = "GROUP_TOTAL_QTY",
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
  SELECTION = "SELECTION",
  PRICE = "PRICE",
}

// ============================================================================
// Action Types
// ============================================================================

export enum DependencyActionType {
  SHOW = "SHOW",
  HIDE = "HIDE",
  SET_REQUIRED = "SET_REQUIRED",
  ADJUST_PRICE = "ADJUST_PRICE",
}


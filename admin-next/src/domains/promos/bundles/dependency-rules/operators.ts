import {
  ComparisonOperator,
  StateCheckOperator,
  DependencyTargetType,
  ConditionSubject,
} from "./enums";
import type { OperatorMetadata } from "./types";

// ============================================================================
// Comparison Operator Metadata
// ============================================================================

export const COMPARISON_OPERATOR_META: Record<ComparisonOperator, OperatorMetadata> = {
  [ComparisonOperator.GTE]: { label: "greater than or equal", symbol: ">=", requiresValue: true },
  [ComparisonOperator.LTE]: { label: "less than or equal", symbol: "<=", requiresValue: true },
  [ComparisonOperator.EQ]: { label: "equals", symbol: "=", requiresValue: true },
  [ComparisonOperator.GT]: { label: "greater than", symbol: ">", requiresValue: true },
  [ComparisonOperator.LT]: { label: "less than", symbol: "<", requiresValue: true },
  [ComparisonOperator.NEQ]: { label: "not equal", symbol: "!=", requiresValue: true },
  [ComparisonOperator.BETWEEN]: { label: "between", symbol: "...", requiresValue: true, requiresSecondValue: true },
  [ComparisonOperator.IN_LIST]: { label: "in list", symbol: "in", requiresValue: false, requiresValueList: true },
};

// ============================================================================
// State Check Operator Metadata
// ============================================================================

export const STATE_CHECK_OPERATOR_META: Record<StateCheckOperator, OperatorMetadata> = {
  [StateCheckOperator.IS_SELECTED]: { label: "is selected", symbol: "=1", requiresValue: false },
  [StateCheckOperator.IS_NOT_SELECTED]: { label: "is not selected", symbol: "=0", requiresValue: false },
  [StateCheckOperator.CONTAINS]: { label: "contains", symbol: "has", requiresValue: false },
};

// ============================================================================
// Valid Operators per Subject
// ============================================================================

export const OPERATORS_BY_SUBJECT: Record<ConditionSubject, (ComparisonOperator | StateCheckOperator)[]> = {
  [ConditionSubject.ITEM_SELECTED]: [
    StateCheckOperator.IS_SELECTED,
    StateCheckOperator.IS_NOT_SELECTED,
  ],
  [ConditionSubject.ITEM_QTY]: [
    ComparisonOperator.GTE,
    ComparisonOperator.LTE,
    ComparisonOperator.EQ,
    ComparisonOperator.GT,
    ComparisonOperator.LT,
    ComparisonOperator.NEQ,
    ComparisonOperator.BETWEEN,
  ],
  [ConditionSubject.GROUP_UNIQUE_COUNT]: [
    ComparisonOperator.GTE,
    ComparisonOperator.LTE,
    ComparisonOperator.EQ,
    ComparisonOperator.GT,
    ComparisonOperator.LT,
    ComparisonOperator.BETWEEN,
  ],
  [ConditionSubject.GROUP_TOTAL_QTY]: [
    ComparisonOperator.GTE,
    ComparisonOperator.LTE,
    ComparisonOperator.EQ,
    ComparisonOperator.GT,
    ComparisonOperator.LT,
    ComparisonOperator.BETWEEN,
  ],
  [ConditionSubject.GROUP_CONTAINS]: [
    StateCheckOperator.CONTAINS,
  ],
};

// ============================================================================
// Valid Subjects per Target Type
// ============================================================================

export const SUBJECTS_BY_TARGET: Record<DependencyTargetType, ConditionSubject[]> = {
  [DependencyTargetType.ITEM]: [
    ConditionSubject.ITEM_SELECTED,
    ConditionSubject.ITEM_QTY,
  ],
  [DependencyTargetType.GROUP]: [
    ConditionSubject.GROUP_UNIQUE_COUNT,
    ConditionSubject.GROUP_TOTAL_QTY,
    ConditionSubject.GROUP_CONTAINS,
  ],
  [DependencyTargetType.BUNDLE]: [],
};

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
  [ComparisonOperator.GTE]: { label: "at least", symbol: ">=", requiresValue: true },
  [ComparisonOperator.EQ]: { label: "equals", symbol: "=", requiresValue: true },
  [ComparisonOperator.LTE]: { label: "at most", symbol: "<=", requiresValue: true },
};

// ============================================================================
// State Check Operator Metadata
// ============================================================================

export const STATE_CHECK_OPERATOR_META: Record<StateCheckOperator, OperatorMetadata> = {
  [StateCheckOperator.IS_SELECTED]: { label: "is selected", symbol: "=1", requiresValue: false },
  [StateCheckOperator.IS_NOT_SELECTED]: { label: "is not selected", symbol: "=0", requiresValue: false },
};

// ============================================================================
// Valid Operators per Subject
// ============================================================================

export const OPERATORS_BY_SUBJECT: Record<ConditionSubject, (ComparisonOperator | StateCheckOperator)[]> = {
  [ConditionSubject.ITEM_SELECTED]: [
    StateCheckOperator.IS_SELECTED,
    StateCheckOperator.IS_NOT_SELECTED,
  ],
  [ConditionSubject.GROUP_TOTAL_QTY]: [
    ComparisonOperator.GTE,
    ComparisonOperator.EQ,
    ComparisonOperator.LTE,
  ],
};

// ============================================================================
// Valid Subjects per Target Type
// ============================================================================

export const SUBJECTS_BY_TARGET: Record<DependencyTargetType, ConditionSubject[]> = {
  [DependencyTargetType.ITEM]: [
    ConditionSubject.ITEM_SELECTED,
  ],
  [DependencyTargetType.GROUP]: [
    ConditionSubject.GROUP_TOTAL_QTY,
  ],
  [DependencyTargetType.BUNDLE]: [],
};

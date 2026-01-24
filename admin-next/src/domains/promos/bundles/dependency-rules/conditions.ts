import {
  DependencyConditionType,
  ConditionSubject,
  ComparisonOperator,
  StateCheckOperator,
  DependencyTargetType,
  ConditionCategory,
} from "./enums";

// ============================================================================
// Legacy Condition Type -> New System Mapping
// ============================================================================

export interface LegacyConditionMapping {
  category: ConditionCategory;
  subject: ConditionSubject;
  operator: ComparisonOperator | StateCheckOperator;
}

export const LEGACY_CONDITION_MAP: Record<DependencyConditionType, LegacyConditionMapping> = {
  [DependencyConditionType.IS_SELECTED]: {
    category: ConditionCategory.STATE_CHECK,
    subject: ConditionSubject.ITEM_SELECTED,
    operator: StateCheckOperator.IS_SELECTED,
  },
  [DependencyConditionType.IS_NOT_SELECTED]: {
    category: ConditionCategory.STATE_CHECK,
    subject: ConditionSubject.ITEM_SELECTED,
    operator: StateCheckOperator.IS_NOT_SELECTED,
  },
  [DependencyConditionType.QTY_GTE]: {
    category: ConditionCategory.NUMERIC,
    subject: ConditionSubject.ITEM_QTY,
    operator: ComparisonOperator.GTE,
  },
  [DependencyConditionType.QTY_LTE]: {
    category: ConditionCategory.NUMERIC,
    subject: ConditionSubject.ITEM_QTY,
    operator: ComparisonOperator.LTE,
  },
  [DependencyConditionType.QTY_EQ]: {
    category: ConditionCategory.NUMERIC,
    subject: ConditionSubject.ITEM_QTY,
    operator: ComparisonOperator.EQ,
  },
  [DependencyConditionType.GROUP_UNIQUE_GTE]: {
    category: ConditionCategory.NUMERIC,
    subject: ConditionSubject.GROUP_UNIQUE_COUNT,
    operator: ComparisonOperator.GTE,
  },
  [DependencyConditionType.GROUP_TOTAL_QTY_GTE]: {
    category: ConditionCategory.NUMERIC,
    subject: ConditionSubject.GROUP_TOTAL_QTY,
    operator: ComparisonOperator.GTE,
  },
};

// ============================================================================
// Valid Condition Types by Target (legacy compat)
// ============================================================================

export const CONDITION_TYPES_BY_TARGET: Record<DependencyTargetType, DependencyConditionType[]> = {
  [DependencyTargetType.ITEM]: [
    DependencyConditionType.IS_SELECTED,
    DependencyConditionType.IS_NOT_SELECTED,
    DependencyConditionType.QTY_GTE,
    DependencyConditionType.QTY_LTE,
    DependencyConditionType.QTY_EQ,
  ],
  [DependencyTargetType.GROUP]: [
    DependencyConditionType.GROUP_UNIQUE_GTE,
    DependencyConditionType.GROUP_TOTAL_QTY_GTE,
  ],
  [DependencyTargetType.BUNDLE]: [],
};

import {
  DependencyTargetType,
  DependencyActionType,
  ActionCategory,
  ConditionSubject,
  ComparisonOperator,
  StateCheckOperator,
  LogicOperator,
} from "./enums";
import type { SelectOption } from "./types";
import type { IBundleGroup } from "../types";
import {
  TARGET_TYPE_LABELS,
  CONDITION_SUBJECT_LABELS,
  COMPARISON_OPERATOR_LABELS,
  STATE_CHECK_LABELS,
  LOGIC_OPERATOR_LABELS,
} from "./constants";
import { SUBJECTS_BY_TARGET, OPERATORS_BY_SUBJECT } from "./operators";
import { ACTIONS_BY_TARGET, ACTIONS_BY_CATEGORY, CATEGORIES_BY_TARGET, ACTION_META } from "./actions";
import { ACTION_CATEGORY_LABELS } from "./constants";
import { PRICE_RULE_OPTIONS } from "../types";

// ============================================================================
// Target Options (resolve items/groups from bundle data)
// ============================================================================

export const getTargetOptions = (
  targetType: DependencyTargetType,
  groups: IBundleGroup[],
): SelectOption[] => {
  if (targetType === DependencyTargetType.ITEM) {
    return groups.flatMap((g) =>
      g.items.map((item) => ({
        value: item.id,
        label:
          item.title ??
          item.assignedProduct?.title ??
          item.assignedVariant?.title ??
          item.id,
      }))
    );
  }
  if (targetType === DependencyTargetType.GROUP) {
    return groups.map((g) => ({ value: g.id, label: g.title }));
  }
  return [];
};

// ============================================================================
// Condition Target Type Options
// ============================================================================

export const CONDITION_TARGET_TYPE_OPTIONS: SelectOption<DependencyTargetType>[] = [
  { value: DependencyTargetType.ITEM, label: TARGET_TYPE_LABELS[DependencyTargetType.ITEM] },
  { value: DependencyTargetType.GROUP, label: TARGET_TYPE_LABELS[DependencyTargetType.GROUP] },
  { value: DependencyTargetType.BUNDLE, label: TARGET_TYPE_LABELS[DependencyTargetType.BUNDLE] },
];

// ============================================================================
// Action Target Type Options
// ============================================================================

export const ACTION_TARGET_TYPE_OPTIONS: SelectOption<DependencyTargetType>[] = [
  { value: DependencyTargetType.ITEM, label: TARGET_TYPE_LABELS[DependencyTargetType.ITEM] },
  { value: DependencyTargetType.GROUP, label: TARGET_TYPE_LABELS[DependencyTargetType.GROUP] },
  { value: DependencyTargetType.BUNDLE, label: TARGET_TYPE_LABELS[DependencyTargetType.BUNDLE] },
];

// ============================================================================
// Subject Options (by target type)
// ============================================================================

export const getSubjectOptions = (
  targetType: DependencyTargetType,
): SelectOption<ConditionSubject>[] => {
  const subjects = SUBJECTS_BY_TARGET[targetType];
  return subjects.map((s) => ({ value: s, label: CONDITION_SUBJECT_LABELS[s] }));
};

// ============================================================================
// Operator Options (by subject)
// ============================================================================

export const getOperatorOptions = (
  subject: ConditionSubject,
): SelectOption<ComparisonOperator | StateCheckOperator>[] => {
  const operators = OPERATORS_BY_SUBJECT[subject];
  return operators.map((op) => {
    const isComparison = Object.values(ComparisonOperator).includes(op as ComparisonOperator);
    const label = isComparison
      ? COMPARISON_OPERATOR_LABELS[op as ComparisonOperator]
      : STATE_CHECK_LABELS[op as StateCheckOperator];
    return { value: op, label };
  });
};

// ============================================================================
// Action Type Options (by target type)
// ============================================================================

export const getActionTypeOptions = (
  targetType: DependencyTargetType,
): SelectOption<DependencyActionType>[] => {
  const actions = ACTIONS_BY_TARGET[targetType];
  return actions.map((a) => ({ value: a, label: ACTION_META[a].label }));
};

// ============================================================================
// Action Category Options (by target type)
// ============================================================================

export const getActionCategoryOptions = (
  targetType: DependencyTargetType,
): SelectOption<ActionCategory>[] => {
  const categories = CATEGORIES_BY_TARGET[targetType];
  return categories.map((c) => ({ value: c, label: ACTION_CATEGORY_LABELS[c] }));
};

// ============================================================================
// Action Type Options (by category)
// ============================================================================

export const getActionTypeOptionsByCategory = (
  category: ActionCategory,
): SelectOption<DependencyActionType>[] => {
  const actions = ACTIONS_BY_CATEGORY[category];
  return actions.map((a) => ({ value: a, label: ACTION_META[a].label }));
};

// ============================================================================
// Logic Operator Options
// ============================================================================

export const LOGIC_OPERATOR_OPTIONS: SelectOption<LogicOperator>[] = [
  { value: LogicOperator.AND, label: LOGIC_OPERATOR_LABELS[LogicOperator.AND] },
  { value: LogicOperator.OR, label: LOGIC_OPERATOR_LABELS[LogicOperator.OR] },
];

// ============================================================================
// Price Type Options
// ============================================================================

export const getPriceTypeOptions = () =>
  PRICE_RULE_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));

import type { IDependencyCondition, IDependencyAction } from "./types";
import type { IBundleGroup } from "../types";
import {
  DependencyTargetType,
  DependencyActionType,
  ConditionCategory,
  ConditionSubject,
  ComparisonOperator,
} from "./enums";
import { ACTION_PHRASE, SUBJECT_SHORT, OPERATOR_PHRASE } from "./constants";
import { STATE_CHECK_OPERATOR_META } from "./operators";
import { PRICE_RULE_OPTIONS } from "../types";


// ============================================================================
// Target Resolution
// ============================================================================

export const resolveTargetName = (
  targetType: DependencyTargetType,
  targetId: string | undefined,
  groups: IBundleGroup[],
): string | null => {
  if (!targetId) return null;
  if (targetType === DependencyTargetType.GROUP) {
    return groups.find((g) => g.id === targetId)?.title ?? null;
  }
  if (targetType === DependencyTargetType.ITEM) {
    for (const group of groups) {
      const item = group.items?.find((i) => i.id === targetId);
      if (item) {
        return item.title
          ?? item.assignedProduct?.title
          ?? item.assignedVariant?.title
          ?? null;
      }
    }
  }
  return null;
};

// ============================================================================
// Condition Formatting
// ============================================================================

export const formatCondition = (cond: IDependencyCondition): string => {
  if (cond.category === ConditionCategory.STATE_CHECK) {
    return STATE_CHECK_OPERATOR_META[cond.operator]?.label ?? cond.operator;
  }

  const subjectShort = SUBJECT_SHORT[cond.subject] ?? cond.subject;
  const phrase = OPERATOR_PHRASE[cond.operator as ComparisonOperator] ?? cond.operator;
  if (cond.value === undefined || cond.value === null) {
    return `${subjectShort} ${phrase}`;
  }
  return `${subjectShort} ${phrase} ${cond.value}`;
};

// ============================================================================
// Action Formatting
// ============================================================================

export const formatAction = (action: IDependencyAction): string => {
  const phrase = ACTION_PHRASE[action.actionType] ?? action.actionType;

  if (action.actionType === DependencyActionType.SET_REQUIRED) {
    return `${phrase}: ${action.requiredValue ? "yes" : "no"}`;
  }

  if (action.actionType === DependencyActionType.ADJUST_PRICE && action.priceType) {
    const priceOption = PRICE_RULE_OPTIONS.find((o) => o.value === action.priceType);
    const value =
      action.priceValue !== null && action.priceValue !== undefined
        ? `${action.priceValue}${priceOption?.valueSuffix ?? ""}`
        : "";
    // Compact format for hub nodes: "Discount 10%" or "Free"
    return value ? `Discount ${value}` : (priceOption?.label ?? action.priceType);
  }

  return phrase;
};

// ============================================================================
// Chip Label Helpers
// ============================================================================

/** Get display label for any operator (phrase for comparison, label for state) */
export const getOperatorLabel = (op: string): string => {
  if (op in ComparisonOperator) {
    return OPERATOR_PHRASE[op as ComparisonOperator] ?? op;
  }
  return STATE_CHECK_OPERATOR_META[op as keyof typeof STATE_CHECK_OPERATOR_META]?.label ?? op;
};

/** Build a grammatically correct chip label for a condition */
export const getConditionChipLabel = (subject: ConditionSubject, operator: string): string => {
  // State checks — the operator label is already a phrase
  if (!(operator in ComparisonOperator)) {
    return STATE_CHECK_OPERATOR_META[operator as keyof typeof STATE_CHECK_OPERATOR_META]?.label ?? operator;
  }
  // Numeric — short subject + verb phrase
  const subjectShort = SUBJECT_SHORT[subject] ?? subject;
  const phrase = OPERATOR_PHRASE[operator as ComparisonOperator] ?? operator;
  return `${subjectShort} ${phrase}`;
};

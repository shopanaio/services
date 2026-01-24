import type { IDependencyCondition, IDependencyAction } from "./types";
import type { IBundleGroup } from "../types";
import {
  DependencyTargetType,
  DependencyActionType,
  ConditionCategory,
  ComparisonOperator,
} from "./enums";
import { ACTION_TYPE_LABELS, CONDITION_SUBJECT_LABELS } from "./constants";
import { COMPARISON_OPERATOR_META, STATE_CHECK_OPERATOR_META } from "./operators";
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
  const subjectLabel = CONDITION_SUBJECT_LABELS[cond.subject];

  if (cond.category === ConditionCategory.STATE_CHECK) {
    const meta = STATE_CHECK_OPERATOR_META[cond.operator];
    return `${subjectLabel} ${meta.label}`;
  }

  const meta = COMPARISON_OPERATOR_META[cond.operator];
  if (cond.operator === ComparisonOperator.BETWEEN && cond.valueTo != null) {
    return `${subjectLabel} ${meta.label} ${cond.value} and ${cond.valueTo}`;
  }
  if (cond.operator === ComparisonOperator.IN_LIST && cond.valueList?.length) {
    return `${subjectLabel} ${meta.label} [${cond.valueList.join(", ")}]`;
  }
  return `${subjectLabel} ${meta.symbol} ${cond.value}`;
};

// ============================================================================
// Action Formatting
// ============================================================================

export const formatAction = (action: IDependencyAction): string => {
  const label = ACTION_TYPE_LABELS[action.actionType] ?? action.actionType;

  if (action.actionType === DependencyActionType.SET_QTY && action.qtyValue != null) {
    return `${label}: ${action.qtyValue}`;
  }

  if (action.actionType === DependencyActionType.SET_QTY_LIMITS) {
    const parts: string[] = [];
    if (action.minQtyValue != null) parts.push(`min: ${action.minQtyValue}`);
    if (action.maxQtyValue != null) parts.push(`max: ${action.maxQtyValue}`);
    return `${label}: ${parts.join(", ") || "reset"}`;
  }

  if (action.actionType === DependencyActionType.SET_REQUIRED) {
    return `${label}: ${action.requiredValue ? "yes" : "no"}`;
  }

  if (
    (action.actionType === DependencyActionType.OVERRIDE_PRICE ||
      action.actionType === DependencyActionType.ADJUST_PRICE) &&
    action.priceType
  ) {
    const priceOption = PRICE_RULE_OPTIONS.find((o) => o.value === action.priceType);
    const priceName = priceOption?.label ?? action.priceType;
    const value =
      action.priceValue !== null && action.priceValue !== undefined
        ? `${action.priceValue}${priceOption?.valueSuffix ?? ""}`
        : "";
    return `${label}: ${priceName} ${value}`.trim();
  }

  return label;
};

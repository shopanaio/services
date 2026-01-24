import type { IDependencyCondition, IDependencyAction, IDependencyConditionV2 } from "./types";
import type { IBundleGroup } from "../types";
import {
  DependencyTargetType,
  DependencyActionType,
  DependencyConditionType,
  ConditionCategory,
  ComparisonOperator,
} from "./enums";
import { CONDITION_TYPE_LABELS, ACTION_TYPE_LABELS } from "./constants";
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
// Legacy Format Helpers
// ============================================================================

export const formatCondition = (cond: IDependencyCondition): string => {
  const label = CONDITION_TYPE_LABELS[cond.conditionType] ?? cond.conditionType;
  if (cond.value != null) return `${label} ${cond.value}`;
  return label;
};

export const formatAction = (action: IDependencyAction): string => {
  const label = ACTION_TYPE_LABELS[action.actionType] ?? action.actionType;
  if (action.qtyValue != null) return `${label}: ${action.qtyValue}`;
  if (action.priceValue != null) return `${label}: ${action.priceValue}`;
  return label;
};

// ============================================================================
// Chart Format Helpers (detailed view with price info)
// ============================================================================

export const formatConditionLabel = (
  conditionType: DependencyConditionType,
  value?: number,
): string => {
  const label = CONDITION_TYPE_LABELS[conditionType];
  if (value !== undefined) return `${label} ${value}`;
  return label;
};

export const formatActionLabel = (
  actionType: DependencyActionType,
  priceType?: string,
  priceValue?: number | null,
  qtyValue?: number,
): string => {
  const label = ACTION_TYPE_LABELS[actionType];

  if (actionType === DependencyActionType.SET_QTY && qtyValue !== undefined) {
    return `${label} ${qtyValue}`;
  }

  if (
    (actionType === DependencyActionType.OVERRIDE_PRICE ||
      actionType === DependencyActionType.ADJUST_PRICE) &&
    priceType
  ) {
    const priceOption = PRICE_RULE_OPTIONS.find((o) => o.value === priceType);
    const priceName = priceOption?.label ?? priceType;
    const value =
      priceValue !== null && priceValue !== undefined
        ? `${priceValue}${priceOption?.valueSuffix ?? ""}`
        : "";
    return `${label}: ${priceName} ${value}`.trim();
  }

  return label;
};

// ============================================================================
// V2 Format Helpers
// ============================================================================

export const formatConditionV2 = (cond: IDependencyConditionV2): string => {
  if (cond.category === ConditionCategory.STATE_CHECK) {
    const meta = STATE_CHECK_OPERATOR_META[cond.operator];
    return meta.label;
  }

  const meta = COMPARISON_OPERATOR_META[cond.operator];
  if (cond.operator === ComparisonOperator.BETWEEN && cond.valueTo != null) {
    return `${meta.label} ${cond.value} and ${cond.valueTo}`;
  }
  if (cond.operator === ComparisonOperator.IN_LIST && cond.valueList?.length) {
    return `${meta.label} [${cond.valueList.join(", ")}]`;
  }
  return `${meta.symbol} ${cond.value}`;
};

import type {
  ApiProductComponentCondition,
  ApiProductComponentDependencyAction,
  ApiProductComponentGroup,
  ProductComponentConditionOperator,
  ProductComponentConditionSubject,
} from "@/graphql/types";
import {
  ProductComponentConditionCategory,
  ProductComponentDependencyActionType,
  ProductComponentDependencyTargetType,
} from "@/graphql/types";
import { ACTION_PHRASE, SUBJECT_SHORT, OPERATOR_PHRASE } from "./constants";
import { STATE_CHECK_OPERATOR_META } from "./operators";
import { getPriceRuleLabel } from "../../sections/groups-section/helpers";

export const resolveTargetName = (
  targetType: ProductComponentDependencyTargetType,
  targetId: string | undefined,
  groups: ApiProductComponentGroup[],
): string | null => {
  if (!targetId) return null;
  if (targetType === ProductComponentDependencyTargetType.Group) {
    return groups.find(({ id }) => id === targetId)?.title ?? null;
  }
  if (targetType === ProductComponentDependencyTargetType.Item) {
    for (const group of groups) {
      const item = group.items.find(({ id }) => id === targetId);
      if (item) {
        return item.title ?? item.refProduct?.title ?? item.refVariant?.title ?? null;
      }
    }
  }
  return null;
};

export const formatCondition = (condition: ApiProductComponentCondition): string => {
  if (condition.category === ProductComponentConditionCategory.StateCheck) {
    return STATE_CHECK_OPERATOR_META[condition.operator]?.label ?? condition.operator;
  }
  const subject = SUBJECT_SHORT[condition.subject] ?? condition.subject;
  const operator = OPERATOR_PHRASE[condition.operator] ?? condition.operator;
  return condition.value == null
    ? `${subject} ${operator}`
    : `${subject} ${operator} ${condition.value}`;
};

export const formatAction = (action: ApiProductComponentDependencyAction): string => {
  const phrase = ACTION_PHRASE[action.actionType] ?? action.actionType;
  if (action.actionType === ProductComponentDependencyActionType.SetRequired) {
    return `${phrase}: ${action.requiredValue ? "yes" : "no"}`;
  }
  if (action.actionType === ProductComponentDependencyActionType.AdjustPrice && action.priceRule) {
    return getPriceRuleLabel(action.priceRule) ?? phrase;
  }
  return phrase;
};

export const getOperatorLabel = (operator: ProductComponentConditionOperator): string =>
  OPERATOR_PHRASE[operator] ?? STATE_CHECK_OPERATOR_META[operator]?.label ?? operator;

export const getConditionChipLabel = (
  subject: ProductComponentConditionSubject,
  operator: ProductComponentConditionOperator,
): string => {
  const operatorLabel = getOperatorLabel(operator);
  return operator in OPERATOR_PHRASE
    ? `${SUBJECT_SHORT[subject] ?? subject} ${operatorLabel}`
    : operatorLabel;
};

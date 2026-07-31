import type { ApiProductComponentGroup } from "@/graphql/types";
import {
  ProductComponentConditionOperator,
  ProductComponentConditionSubject,
  ProductComponentDependencyActionType,
  ProductComponentDependencyTargetType,
  ProductComponentLogicOperator,
} from "@/graphql/types";

import { PRICE_RULE_OPTIONS } from "../types";
import { ACTIONS_BY_CATEGORY, ACTIONS_BY_TARGET, ACTION_META, CATEGORIES_BY_TARGET } from "./actions";
import {
  ACTION_CATEGORY_LABELS,
  COMPARISON_OPERATOR_LABELS,
  CONDITION_SUBJECT_LABELS,
  LOGIC_OPERATOR_LABELS,
  STATE_CHECK_LABELS,
  TARGET_TYPE_LABELS,
} from "./constants";
import { ActionCategory } from "./enums";
import { OPERATORS_BY_SUBJECT, SUBJECTS_BY_TARGET } from "./operators";
import type { SelectOption } from "./types";

export const getTargetOptions = (
  targetType: ProductComponentDependencyTargetType,
  groups: ApiProductComponentGroup[],
): SelectOption[] => {
  if (targetType === ProductComponentDependencyTargetType.Item) {
    return groups.flatMap((group) =>
      group.items.map((item) => ({
        value: item.id,
        label: item.title ?? item.refProduct?.title ?? item.refVariant?.title ?? item.id,
      })),
    );
  }
  if (targetType === ProductComponentDependencyTargetType.Group) {
    return groups.map((group) => ({ value: group.id, label: group.title }));
  }
  return [];
};

export const CONDITION_TARGET_TYPE_OPTIONS: SelectOption<ProductComponentDependencyTargetType>[] = [
  { value: ProductComponentDependencyTargetType.Item, label: TARGET_TYPE_LABELS[ProductComponentDependencyTargetType.Item] },
  { value: ProductComponentDependencyTargetType.Group, label: TARGET_TYPE_LABELS[ProductComponentDependencyTargetType.Group] },
  { value: ProductComponentDependencyTargetType.Configuration, label: TARGET_TYPE_LABELS[ProductComponentDependencyTargetType.Configuration] },
];

export const ACTION_TARGET_TYPE_OPTIONS = CONDITION_TARGET_TYPE_OPTIONS;

export const getSubjectOptions = (
  targetType: ProductComponentDependencyTargetType,
): SelectOption<ProductComponentConditionSubject>[] =>
  SUBJECTS_BY_TARGET[targetType].map((subject) => ({
    value: subject,
    label: CONDITION_SUBJECT_LABELS[subject],
  }));

export const getOperatorOptions = (
  subject: ProductComponentConditionSubject,
): SelectOption<ProductComponentConditionOperator>[] =>
  OPERATORS_BY_SUBJECT[subject].map((operator) => ({
    value: operator,
    label: COMPARISON_OPERATOR_LABELS[operator] ?? STATE_CHECK_LABELS[operator] ?? operator,
  }));

export const getActionTypeOptions = (
  targetType: ProductComponentDependencyTargetType,
): SelectOption<ProductComponentDependencyActionType>[] =>
  ACTIONS_BY_TARGET[targetType].map((action) => ({ value: action, label: ACTION_META[action].label }));

export const getActionCategoryOptions = (
  targetType: ProductComponentDependencyTargetType,
): SelectOption<ActionCategory>[] =>
  CATEGORIES_BY_TARGET[targetType].map((category) => ({
    value: category,
    label: ACTION_CATEGORY_LABELS[category],
  }));

export const getActionTypeOptionsByCategory = (
  category: ActionCategory,
): SelectOption<ProductComponentDependencyActionType>[] =>
  ACTIONS_BY_CATEGORY[category].map((action) => ({ value: action, label: ACTION_META[action].label }));

export const LOGIC_OPERATOR_OPTIONS: SelectOption<ProductComponentLogicOperator>[] = [
  { value: ProductComponentLogicOperator.And, label: LOGIC_OPERATOR_LABELS[ProductComponentLogicOperator.And] },
  { value: ProductComponentLogicOperator.Or, label: LOGIC_OPERATOR_LABELS[ProductComponentLogicOperator.Or] },
];

export const getPriceTypeOptions = () =>
  PRICE_RULE_OPTIONS.map((option) => ({ value: option.value, label: option.label }));

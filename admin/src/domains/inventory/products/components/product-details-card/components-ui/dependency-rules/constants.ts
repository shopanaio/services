import {
  ProductComponentConditionOperator,
  ProductComponentConditionSubject,
  ProductComponentDependencyActionType,
  ProductComponentDependencyTargetType,
  ProductComponentLogicOperator,
} from "@/graphql/types";

import { ActionCategory } from "./enums";

export const ACTION_TYPE_LABELS: Record<ProductComponentDependencyActionType, string> = {
  [ProductComponentDependencyActionType.Show]: "show",
  [ProductComponentDependencyActionType.Hide]: "hide",
  [ProductComponentDependencyActionType.SetRequired]: "set required",
  [ProductComponentDependencyActionType.AdjustPrice]: "adjust price",
};

export const ACTION_CATEGORY_LABELS: Record<ActionCategory, string> = {
  [ActionCategory.VISIBILITY]: "Visibility",
  [ActionCategory.SELECTION]: "Selection",
  [ActionCategory.PRICE]: "Price",
};

export const TARGET_TYPE_LABELS: Record<ProductComponentDependencyTargetType, string> = {
  [ProductComponentDependencyTargetType.Item]: "Item",
  [ProductComponentDependencyTargetType.Group]: "Group",
  [ProductComponentDependencyTargetType.Configuration]: "Components",
};

export const COMPARISON_OPERATOR_LABELS: Partial<
  Record<ProductComponentConditionOperator, string>
> = {
  [ProductComponentConditionOperator.Gte]: ">=",
  [ProductComponentConditionOperator.Eq]: "=",
  [ProductComponentConditionOperator.Lte]: "<=",
};

export const STATE_CHECK_LABELS: Partial<Record<ProductComponentConditionOperator, string>> = {
  [ProductComponentConditionOperator.IsSelected]: "is selected",
  [ProductComponentConditionOperator.IsNotSelected]: "is not selected",
};

export const LOGIC_OPERATOR_LABELS: Record<ProductComponentLogicOperator, string> = {
  [ProductComponentLogicOperator.And]: "AND",
  [ProductComponentLogicOperator.Or]: "OR",
};

export const CONDITION_SUBJECT_LABELS: Record<ProductComponentConditionSubject, string> = {
  [ProductComponentConditionSubject.ItemSelected]: "selection",
  [ProductComponentConditionSubject.ItemQty]: "quantity",
  [ProductComponentConditionSubject.GroupTotalQty]: "total quantity",
};

export const SUBJECT_SHORT: Partial<Record<ProductComponentConditionSubject, string>> = {
  [ProductComponentConditionSubject.ItemQty]: "quantity",
  [ProductComponentConditionSubject.GroupTotalQty]: "quantity",
};

export const OPERATOR_PHRASE: Partial<Record<ProductComponentConditionOperator, string>> = {
  [ProductComponentConditionOperator.Gte]: "is at least",
  [ProductComponentConditionOperator.Eq]: "equals",
  [ProductComponentConditionOperator.Lte]: "is at most",
};

export const ACTION_PHRASE: Record<ProductComponentDependencyActionType, string> = {
  [ProductComponentDependencyActionType.Show]: "is shown",
  [ProductComponentDependencyActionType.Hide]: "is hidden",
  [ProductComponentDependencyActionType.SetRequired]: "is required",
  [ProductComponentDependencyActionType.AdjustPrice]: "price adjust",
};

export const TARGET_TYPE_COLORS: Record<ProductComponentDependencyTargetType, string> = {
  [ProductComponentDependencyTargetType.Item]: "blue",
  [ProductComponentDependencyTargetType.Group]: "purple",
  [ProductComponentDependencyTargetType.Configuration]: "gold",
};

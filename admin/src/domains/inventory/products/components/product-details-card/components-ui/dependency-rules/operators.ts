import {
  ProductComponentConditionOperator,
  ProductComponentConditionSubject,
  ProductComponentDependencyTargetType,
} from "@/graphql/types";

import type { OperatorMetadata } from "./types";

export const COMPARISON_OPERATOR_META: Partial<Record<ProductComponentConditionOperator, OperatorMetadata>> = {
  [ProductComponentConditionOperator.Gte]: { label: "at least", symbol: ">=", requiresValue: true },
  [ProductComponentConditionOperator.Eq]: { label: "equals", symbol: "=", requiresValue: true },
  [ProductComponentConditionOperator.Lte]: { label: "at most", symbol: "<=", requiresValue: true },
};

export const STATE_CHECK_OPERATOR_META: Partial<Record<ProductComponentConditionOperator, OperatorMetadata>> = {
  [ProductComponentConditionOperator.IsSelected]: { label: "is selected", symbol: "=1", requiresValue: false },
  [ProductComponentConditionOperator.IsNotSelected]: { label: "is not selected", symbol: "=0", requiresValue: false },
};

export const OPERATORS_BY_SUBJECT: Record<ProductComponentConditionSubject, ProductComponentConditionOperator[]> = {
  [ProductComponentConditionSubject.ItemSelected]: [
    ProductComponentConditionOperator.IsSelected,
    ProductComponentConditionOperator.IsNotSelected,
  ],
  [ProductComponentConditionSubject.ItemQty]: [
    ProductComponentConditionOperator.Gte,
    ProductComponentConditionOperator.Eq,
    ProductComponentConditionOperator.Lte,
  ],
  [ProductComponentConditionSubject.GroupTotalQty]: [
    ProductComponentConditionOperator.Gte,
    ProductComponentConditionOperator.Eq,
    ProductComponentConditionOperator.Lte,
  ],
};

export const SUBJECTS_BY_TARGET: Record<ProductComponentDependencyTargetType, ProductComponentConditionSubject[]> = {
  [ProductComponentDependencyTargetType.Item]: [
    ProductComponentConditionSubject.ItemSelected,
    ProductComponentConditionSubject.ItemQty,
  ],
  [ProductComponentDependencyTargetType.Group]: [
    ProductComponentConditionSubject.GroupTotalQty,
  ],
  [ProductComponentDependencyTargetType.Configuration]: [],
};

import {
  ProductComponentConditionCategory,
  ProductComponentConditionSubject,
} from "@/graphql/types";

export interface ConditionSubjectMetadata {
  category: ProductComponentConditionCategory;
  label: string;
  description: string;
}

export const CONDITION_SUBJECT_META: Record<ProductComponentConditionSubject, ConditionSubjectMetadata> = {
  [ProductComponentConditionSubject.ItemSelected]: {
    category: ProductComponentConditionCategory.StateCheck,
    label: "selection",
    description: "Whether the item is selected",
  },
  [ProductComponentConditionSubject.ItemQty]: {
    category: ProductComponentConditionCategory.Numeric,
    label: "quantity",
    description: "Item quantity",
  },
  [ProductComponentConditionSubject.GroupTotalQty]: {
    category: ProductComponentConditionCategory.Numeric,
    label: "total quantity",
    description: "Sum of quantities across all items in group",
  },
};

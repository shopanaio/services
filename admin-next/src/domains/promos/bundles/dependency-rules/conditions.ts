import {
  ConditionCategory,
  ConditionSubject,
} from "./enums";

// ============================================================================
// Condition Subject Metadata
// ============================================================================

export interface ConditionSubjectMetadata {
  category: ConditionCategory;
  label: string;
  description: string;
}

export const CONDITION_SUBJECT_META: Record<ConditionSubject, ConditionSubjectMetadata> = {
  [ConditionSubject.ITEM_SELECTED]: {
    category: ConditionCategory.STATE_CHECK,
    label: "selection",
    description: "Whether the item is selected",
  },
  [ConditionSubject.ITEM_QTY]: {
    category: ConditionCategory.NUMERIC,
    label: "quantity",
    description: "Item quantity",
  },
  [ConditionSubject.ITEM_STOCK]: {
    category: ConditionCategory.STATE_CHECK,
    label: "stock",
    description: "Item stock availability",
  },
  [ConditionSubject.GROUP_UNIQUE_COUNT]: {
    category: ConditionCategory.NUMERIC,
    label: "unique items",
    description: "Number of unique items selected in group",
  },
  [ConditionSubject.GROUP_TOTAL_QTY]: {
    category: ConditionCategory.NUMERIC,
    label: "total quantity",
    description: "Sum of quantities across all items in group",
  },
  [ConditionSubject.GROUP_SUBTOTAL]: {
    category: ConditionCategory.NUMERIC,
    label: "subtotal",
    description: "Sum of prices across selected items in group",
  },
  [ConditionSubject.GROUP_CONTAINS]: {
    category: ConditionCategory.STATE_CHECK,
    label: "contains",
    description: "Whether group contains a specific item",
  },
  [ConditionSubject.BUNDLE_SUBTOTAL]: {
    category: ConditionCategory.NUMERIC,
    label: "bundle subtotal",
    description: "Total bundle price",
  },
};

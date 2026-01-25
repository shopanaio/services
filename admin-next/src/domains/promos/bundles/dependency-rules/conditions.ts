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
  [ConditionSubject.GROUP_TOTAL_QTY]: {
    category: ConditionCategory.NUMERIC,
    label: "total quantity",
    description: "Sum of quantities across all items in group",
  },
};

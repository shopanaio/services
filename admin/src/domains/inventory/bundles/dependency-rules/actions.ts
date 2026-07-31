import { DependencyActionType, DependencyTargetType, ActionCategory } from "./enums";
import type { ActionMetadata } from "./types";

// ============================================================================
// Action Metadata
// ============================================================================

export const ACTION_META: Record<DependencyActionType, ActionMetadata> = {
  [DependencyActionType.SHOW]: {
    label: "show",
    description: "Make the target visible",
  },
  [DependencyActionType.HIDE]: {
    label: "hide",
    description: "Hide the target from view",
  },
  [DependencyActionType.SET_REQUIRED]: {
    label: "set required",
    description: "Make a group required or optional",
  },
  [DependencyActionType.ADJUST_PRICE]: {
    label: "adjust price",
    requiresPriceType: true,
    description: "Modify the base price with a calculation",
  },
};

// ============================================================================
// Actions by Category
// ============================================================================

export const ACTIONS_BY_CATEGORY: Record<ActionCategory, DependencyActionType[]> = {
  [ActionCategory.VISIBILITY]: [
    DependencyActionType.SHOW,
    DependencyActionType.HIDE,
  ],
  [ActionCategory.SELECTION]: [
    DependencyActionType.SET_REQUIRED,
  ],
  [ActionCategory.PRICE]: [
    DependencyActionType.ADJUST_PRICE,
  ],
};

// ============================================================================
// Valid Categories per Target Type
// ============================================================================

export const CATEGORIES_BY_TARGET: Record<DependencyTargetType, ActionCategory[]> = {
  [DependencyTargetType.ITEM]: [
    ActionCategory.VISIBILITY,
    ActionCategory.PRICE,
  ],
  [DependencyTargetType.GROUP]: [
    ActionCategory.VISIBILITY,
    ActionCategory.SELECTION,
    ActionCategory.PRICE,
  ],
  [DependencyTargetType.BUNDLE]: [
    ActionCategory.PRICE,
  ],
};

// ============================================================================
// Valid Actions per Target Type (flat convenience map)
// ============================================================================

export const ACTIONS_BY_TARGET: Record<DependencyTargetType, DependencyActionType[]> = {
  [DependencyTargetType.ITEM]: [
    DependencyActionType.SHOW,
    DependencyActionType.HIDE,
    DependencyActionType.ADJUST_PRICE,
  ],
  [DependencyTargetType.GROUP]: [
    DependencyActionType.SHOW,
    DependencyActionType.HIDE,
    DependencyActionType.SET_REQUIRED,
    DependencyActionType.ADJUST_PRICE,
  ],
  [DependencyTargetType.BUNDLE]: [
    DependencyActionType.ADJUST_PRICE,
  ],
};

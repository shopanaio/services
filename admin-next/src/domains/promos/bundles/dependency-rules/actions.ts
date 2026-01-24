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
  [DependencyActionType.ENABLE]: {
    label: "enable",
    description: "Allow the target to be selected",
  },
  [DependencyActionType.DISABLE]: {
    label: "disable",
    description: "Prevent the target from being selected",
  },
  [DependencyActionType.SET_QTY]: {
    label: "set quantity",
    requiresQtyValue: true,
    description: "Set item quantity to a specific value",
  },
  [DependencyActionType.SET_QTY_LIMITS]: {
    label: "set quantity limits",
    description: "Override min/max quantity for an item",
  },
  [DependencyActionType.SET_REQUIRED]: {
    label: "set required",
    description: "Make a group required or optional",
  },
  [DependencyActionType.OVERRIDE_PRICE]: {
    label: "override price",
    requiresPriceType: true,
    description: "Replace the base price entirely",
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
  [ActionCategory.STATE]: [
    DependencyActionType.ENABLE,
    DependencyActionType.DISABLE,
  ],
  [ActionCategory.QUANTITY]: [
    DependencyActionType.SET_QTY,
    DependencyActionType.SET_QTY_LIMITS,
  ],
  [ActionCategory.SELECTION]: [
    DependencyActionType.SET_REQUIRED,
  ],
  [ActionCategory.PRICE]: [
    DependencyActionType.OVERRIDE_PRICE,
    DependencyActionType.ADJUST_PRICE,
  ],
};

// ============================================================================
// Valid Categories per Target Type
// ============================================================================

export const CATEGORIES_BY_TARGET: Record<DependencyTargetType, ActionCategory[]> = {
  [DependencyTargetType.ITEM]: [
    ActionCategory.VISIBILITY,
    ActionCategory.STATE,
    ActionCategory.QUANTITY,
    ActionCategory.PRICE,
  ],
  [DependencyTargetType.GROUP]: [
    ActionCategory.VISIBILITY,
    ActionCategory.STATE,
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
    DependencyActionType.ENABLE,
    DependencyActionType.DISABLE,
    DependencyActionType.SET_QTY,
    DependencyActionType.SET_QTY_LIMITS,
    DependencyActionType.OVERRIDE_PRICE,
    DependencyActionType.ADJUST_PRICE,
  ],
  [DependencyTargetType.GROUP]: [
    DependencyActionType.SHOW,
    DependencyActionType.HIDE,
    DependencyActionType.ENABLE,
    DependencyActionType.DISABLE,
    DependencyActionType.SET_REQUIRED,
  ],
  [DependencyTargetType.BUNDLE]: [
    DependencyActionType.OVERRIDE_PRICE,
    DependencyActionType.ADJUST_PRICE,
  ],
};

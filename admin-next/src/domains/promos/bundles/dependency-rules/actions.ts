import { DependencyActionType, DependencyTargetType } from "./enums";
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
// Valid Actions per Target Type
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

import {
  ProductComponentDependencyActionType,
  ProductComponentDependencyTargetType,
} from "@/graphql/types";

import { ActionCategory } from "./enums";
import type { ActionMetadata } from "./types";

export const ACTION_META: Record<ProductComponentDependencyActionType, ActionMetadata> = {
  [ProductComponentDependencyActionType.Show]: {
    label: "show",
    description: "Make the target visible",
  },
  [ProductComponentDependencyActionType.Hide]: {
    label: "hide",
    description: "Hide the target from view",
  },
  [ProductComponentDependencyActionType.SetRequired]: {
    label: "set required",
    description: "Make a group required or optional",
  },
  [ProductComponentDependencyActionType.AdjustPrice]: {
    label: "adjust price",
    requiresPriceType: true,
    description: "Modify the base price with a calculation",
  },
};

export const ACTIONS_BY_CATEGORY: Record<ActionCategory, ProductComponentDependencyActionType[]> = {
  [ActionCategory.VISIBILITY]: [
    ProductComponentDependencyActionType.Show,
    ProductComponentDependencyActionType.Hide,
  ],
  [ActionCategory.SELECTION]: [ProductComponentDependencyActionType.SetRequired],
  [ActionCategory.PRICE]: [ProductComponentDependencyActionType.AdjustPrice],
};

export const CATEGORIES_BY_TARGET: Record<ProductComponentDependencyTargetType, ActionCategory[]> = {
  [ProductComponentDependencyTargetType.Item]: [
    ActionCategory.VISIBILITY,
    ActionCategory.PRICE,
  ],
  [ProductComponentDependencyTargetType.Group]: [
    ActionCategory.VISIBILITY,
    ActionCategory.SELECTION,
    ActionCategory.PRICE,
  ],
  [ProductComponentDependencyTargetType.Configuration]: [ActionCategory.PRICE],
};

export const ACTIONS_BY_TARGET: Record<ProductComponentDependencyTargetType, ProductComponentDependencyActionType[]> = {
  [ProductComponentDependencyTargetType.Item]: [
    ProductComponentDependencyActionType.Show,
    ProductComponentDependencyActionType.Hide,
    ProductComponentDependencyActionType.AdjustPrice,
  ],
  [ProductComponentDependencyTargetType.Group]: [
    ProductComponentDependencyActionType.Show,
    ProductComponentDependencyActionType.Hide,
    ProductComponentDependencyActionType.SetRequired,
    ProductComponentDependencyActionType.AdjustPrice,
  ],
  [ProductComponentDependencyTargetType.Configuration]: [
    ProductComponentDependencyActionType.AdjustPrice,
  ],
};

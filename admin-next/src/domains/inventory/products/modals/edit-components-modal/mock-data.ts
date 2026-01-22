/**
 * Mock data for testing the Bundle Dependencies Editor
 * This file contains sample groups, items, and dependency rules for development
 */

import type {
  IComponentGroup,
  IDependencyRule,
  PricingRuleTemplate,
  ITieredDiscount,
} from "./types";
import {
  ComponentItemType,
  ComponentPriceType,
  DependencyConditionType,
  DependencyActionType,
  DependencyTargetType,
} from "./types";

// ============================================================================
// Mock Groups & Items
// ============================================================================

export const MOCK_GROUPS: IComponentGroup[] = [
  {
    id: "grp-1",
    title: "Main Course",
    sortIndex: 0,
    isRequired: true,
    isMultiple: false,
    minSelection: 1,
    maxSelection: 1,
    items: [
      {
        id: "item-1",
        itemType: ComponentItemType.PRODUCT,
        sortIndex: 0,
        title: "Classic Burger",
        featuredImage: null,
        pricingRule: { priceType: ComponentPriceType.BASE, priceValue: null },
        assignedProduct: {
          id: "prod-burger",
          title: "Classic Burger",
          featuredImage: { id: "img-1", url: "https://placehold.co/100x100?text=Burger" },
        } as any,
      },
      {
        id: "item-2",
        itemType: ComponentItemType.PRODUCT,
        sortIndex: 1,
        title: "Premium Steak",
        featuredImage: null,
        pricingRule: { priceType: ComponentPriceType.MARKUP_FIXED, priceValue: 500 },
        assignedProduct: {
          id: "prod-steak",
          title: "Premium Steak",
          featuredImage: { id: "img-2", url: "https://placehold.co/100x100?text=Steak" },
        } as any,
      },
      {
        id: "item-3",
        itemType: ComponentItemType.PRODUCT,
        sortIndex: 2,
        title: "Veggie Wrap",
        featuredImage: null,
        pricingRule: { priceType: ComponentPriceType.DISCOUNT_PERCENT, priceValue: 10 },
        assignedProduct: {
          id: "prod-wrap",
          title: "Veggie Wrap",
          featuredImage: { id: "img-3", url: "https://placehold.co/100x100?text=Wrap" },
        } as any,
      },
    ],
  },
  {
    id: "grp-2",
    title: "Sides",
    sortIndex: 1,
    isRequired: false,
    isMultiple: true,
    minSelection: 0,
    maxSelection: 3,
    items: [
      {
        id: "item-4",
        itemType: ComponentItemType.PRODUCT,
        sortIndex: 0,
        title: "French Fries",
        featuredImage: null,
        pricingRule: { priceType: ComponentPriceType.FIXED, priceValue: 299 },
        assignedProduct: {
          id: "prod-fries",
          title: "French Fries",
          featuredImage: { id: "img-4", url: "https://placehold.co/100x100?text=Fries" },
        } as any,
      },
      {
        id: "item-5",
        itemType: ComponentItemType.PRODUCT,
        sortIndex: 1,
        title: "Onion Rings",
        featuredImage: null,
        pricingRule: { priceType: ComponentPriceType.FIXED, priceValue: 349 },
        assignedProduct: {
          id: "prod-rings",
          title: "Onion Rings",
          featuredImage: { id: "img-5", url: "https://placehold.co/100x100?text=Rings" },
        } as any,
      },
      {
        id: "item-6",
        itemType: ComponentItemType.PRODUCT,
        sortIndex: 2,
        title: "Coleslaw",
        featuredImage: null,
        pricingRule: { priceType: ComponentPriceType.FIXED, priceValue: 199 },
        assignedProduct: {
          id: "prod-coleslaw",
          title: "Coleslaw",
          featuredImage: { id: "img-6", url: "https://placehold.co/100x100?text=Slaw" },
        } as any,
      },
    ],
  },
  {
    id: "grp-3",
    title: "Drinks",
    sortIndex: 2,
    isRequired: false,
    isMultiple: true,
    minSelection: 0,
    maxSelection: null,
    items: [
      {
        id: "item-7",
        itemType: ComponentItemType.PRODUCT,
        sortIndex: 0,
        title: "Cola",
        featuredImage: null,
        pricingRule: { priceType: ComponentPriceType.FIXED, priceValue: 199 },
        assignedProduct: {
          id: "prod-cola",
          title: "Cola",
          featuredImage: { id: "img-7", url: "https://placehold.co/100x100?text=Cola" },
        } as any,
      },
      {
        id: "item-8",
        itemType: ComponentItemType.PRODUCT,
        sortIndex: 1,
        title: "Lemonade",
        featuredImage: null,
        pricingRule: { priceType: ComponentPriceType.FIXED, priceValue: 249 },
        assignedProduct: {
          id: "prod-lemonade",
          title: "Lemonade",
          featuredImage: { id: "img-8", url: "https://placehold.co/100x100?text=Lemon" },
        } as any,
      },
      {
        id: "item-9",
        itemType: ComponentItemType.PRODUCT,
        sortIndex: 2,
        title: "Premium Wine",
        featuredImage: null,
        pricingRule: { priceType: ComponentPriceType.FIXED, priceValue: 899 },
        assignedProduct: {
          id: "prod-wine",
          title: "Premium Wine",
          featuredImage: { id: "img-9", url: "https://placehold.co/100x100?text=Wine" },
        } as any,
      },
    ],
  },
];

// ============================================================================
// Mock Dependency Rules
// ============================================================================

export const MOCK_DEPENDENCY_RULES: IDependencyRule[] = [
  {
    id: "rule-1",
    name: "Premium locks basics",
    enabled: true,
    priority: 200,
    conditions: [
      {
        id: "cond-1-1",
        conditionType: DependencyConditionType.IS_SELECTED,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-2", // Premium Steak
      },
    ],
    actions: [
      {
        id: "act-1-1",
        actionType: DependencyActionType.DISABLE,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-1", // Classic Burger
        label: "Not available with Premium Steak",
      },
      {
        id: "act-1-2",
        actionType: DependencyActionType.DISABLE,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-3", // Veggie Wrap
        label: "Not available with Premium Steak",
      },
    ],
  },
  {
    id: "rule-2",
    name: "Steak + Wine combo",
    enabled: true,
    priority: 150,
    conditions: [
      {
        id: "cond-2-1",
        conditionType: DependencyConditionType.IS_SELECTED,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-2", // Premium Steak
      },
      {
        id: "cond-2-2",
        conditionType: DependencyConditionType.IS_SELECTED,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-9", // Premium Wine
      },
    ],
    actions: [
      {
        id: "act-2-1",
        actionType: DependencyActionType.ADJUST_PRICE,
        targetType: DependencyTargetType.BUNDLE,
        priceType: ComponentPriceType.DISCOUNT_PERCENT,
        priceValue: 15,
        exclusiveKey: "bundleDiscount",
        applyTo: "COMPONENTS_SUBTOTAL",
        label: "Steak & Wine combo: 15% off",
      },
    ],
  },
  {
    id: "rule-3",
    name: "3+ sides discount",
    enabled: true,
    priority: 100,
    conditions: [
      {
        id: "cond-3-1",
        conditionType: DependencyConditionType.GROUP_UNIQUE_GTE,
        targetType: DependencyTargetType.GROUP,
        targetId: "grp-2", // Sides
        value: 3,
      },
    ],
    actions: [
      {
        id: "act-3-1",
        actionType: DependencyActionType.ADJUST_PRICE,
        targetType: DependencyTargetType.GROUP,
        targetId: "grp-2",
        priceType: ComponentPriceType.DISCOUNT_PERCENT,
        priceValue: 20,
        label: "All sides: 20% off",
      },
    ],
  },
  {
    id: "rule-4",
    name: "Veggie meal (disabled)",
    enabled: false,
    priority: 50,
    conditions: [
      {
        id: "cond-4-1",
        conditionType: DependencyConditionType.IS_SELECTED,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-3", // Veggie Wrap
      },
    ],
    actions: [
      {
        id: "act-4-1",
        actionType: DependencyActionType.HIDE,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-2", // Hide Premium Steak
      },
    ],
  },
];

// ============================================================================
// Mock Pricing Templates
// ============================================================================

export const MOCK_PRICING_TEMPLATES: PricingRuleTemplate[] = [
  {
    id: "tpl-1",
    name: "10% Discount",
    priceType: ComponentPriceType.DISCOUNT_PERCENT,
    priceValue: 10,
  },
  {
    id: "tpl-2",
    name: "Free Item",
    priceType: ComponentPriceType.FREE,
    priceValue: null,
  },
  {
    id: "tpl-3",
    name: "Premium Markup",
    priceType: ComponentPriceType.MARKUP_FIXED,
    priceValue: 500,
  },
];

// ============================================================================
// Mock Tiered Discounts
// ============================================================================

export const MOCK_TIERED_DISCOUNTS: ITieredDiscount[] = [
  {
    id: "tier-1",
    minItems: 3,
    discountPercent: 5,
  },
  {
    id: "tier-2",
    minItems: 5,
    discountPercent: 10,
  },
  {
    id: "tier-3",
    minItems: 8,
    discountPercent: 15,
  },
];

// ============================================================================
// Combined Mock Payload for EditComponentsModal
// ============================================================================

export const MOCK_EDIT_COMPONENTS_PAYLOAD = {
  groups: MOCK_GROUPS,
  pricingTemplates: MOCK_PRICING_TEMPLATES,
  tieredDiscounts: MOCK_TIERED_DISCOUNTS,
  dependencyRules: MOCK_DEPENDENCY_RULES,
};

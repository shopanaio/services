/**
 * Mock data for testing the Bundle Dependencies Editor
 */

import type {
  IComponentGroup,
  IDependencyRule,
  PricingRuleTemplate,
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
    title: "Accessories",
    sortIndex: 0,
    isRequired: true,
    isMultiple: true,
    minSelection: 1,
    maxSelection: 5,
    items: [
      {
        id: "item-1",
        itemType: ComponentItemType.PRODUCT,
        sortIndex: 0,
        title: "Premium Case",
        featuredImage: null,
        pricingRule: { priceType: ComponentPriceType.BASE, priceValue: null },
        assignedProduct: {
          id: "prod-1",
          title: "Premium Case",
          featuredImage: { id: "img-1", url: "https://placehold.co/100x100?text=Case" },
        } as any,
      },
      {
        id: "item-2",
        itemType: ComponentItemType.PRODUCT,
        sortIndex: 1,
        title: "Pro Charger 65W",
        featuredImage: null,
        pricingRule: { priceType: ComponentPriceType.MARKUP_FIXED, priceValue: 500 },
        assignedProduct: {
          id: "prod-2",
          title: "Pro Charger 65W",
          featuredImage: { id: "img-2", url: "https://placehold.co/100x100?text=Charger" },
        } as any,
      },
      {
        id: "item-3",
        itemType: ComponentItemType.PRODUCT,
        sortIndex: 2,
        title: "Screen Protector",
        featuredImage: null,
        pricingRule: { priceType: ComponentPriceType.DISCOUNT_PERCENT, priceValue: 10 },
        assignedProduct: {
          id: "prod-3",
          title: "Screen Protector",
          featuredImage: { id: "img-3", url: "https://placehold.co/100x100?text=Screen" },
        } as any,
      },
    ],
  },
  {
    id: "grp-2",
    title: "Warranty",
    sortIndex: 1,
    isRequired: false,
    isMultiple: false,
    minSelection: 0,
    maxSelection: 1,
    items: [
      {
        id: "item-4",
        itemType: ComponentItemType.PRODUCT,
        sortIndex: 0,
        title: "1 Year Standard Warranty (included)",
        featuredImage: null,
        pricingRule: { priceType: ComponentPriceType.INCLUDED, priceValue: null },
        assignedProduct: {
          id: "prod-4",
          title: "1 Year Standard Warranty",
          featuredImage: { id: "img-4", url: "https://placehold.co/100x100?text=1Y" },
        } as any,
      },
      {
        id: "item-5",
        itemType: ComponentItemType.PRODUCT,
        sortIndex: 1,
        title: "2 Year Extended Warranty",
        featuredImage: null,
        pricingRule: { priceType: ComponentPriceType.FIXED, priceValue: 4999 },
        assignedProduct: {
          id: "prod-5",
          title: "2 Year Extended Warranty",
          featuredImage: { id: "img-5", url: "https://placehold.co/100x100?text=2Y" },
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
    name: "Premium case disables screen protector",
    enabled: true,
    priority: 200,
    conditions: [
      {
        id: "cond-1-1",
        conditionType: DependencyConditionType.IS_SELECTED,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-1", // Premium Case
      },
    ],
    actions: [
      {
        id: "act-1-1",
        actionType: DependencyActionType.DISABLE,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-3", // Screen Protector
        label: "Premium case has built-in screen protection",
      },
    ],
  },
  {
    id: "rule-2",
    name: "Charger shows extended warranty",
    enabled: true,
    priority: 150,
    conditions: [
      {
        id: "cond-2-1",
        conditionType: DependencyConditionType.IS_SELECTED,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-2", // Pro Charger 65W
      },
    ],
    actions: [
      {
        id: "act-2-1",
        actionType: DependencyActionType.SHOW,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-5", // 2 Year Extended Warranty
        label: "Shows extended warranty option",
      },
    ],
  },
  {
    id: "rule-3",
    name: "Screen protector free with charger",
    enabled: true,
    priority: 100,
    conditions: [
      {
        id: "cond-3-1",
        conditionType: DependencyConditionType.IS_SELECTED,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-2", // Pro Charger 65W
      },
    ],
    actions: [
      {
        id: "act-3-1",
        actionType: DependencyActionType.ADJUST_PRICE,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-3", // Screen Protector
        priceType: ComponentPriceType.FREE,
        priceValue: null,
        label: "Free screen protector with charger",
      },
    ],
  },
  {
    id: "rule-4",
    name: "Extended warranty hides standard",
    enabled: true,
    priority: 50,
    conditions: [
      {
        id: "cond-4-1",
        conditionType: DependencyConditionType.IS_SELECTED,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-5", // 2 Year Extended Warranty
      },
    ],
    actions: [
      {
        id: "act-4-1",
        actionType: DependencyActionType.HIDE,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-4", // 1 Year Standard Warranty
        label: "Extended warranty replaces standard",
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
// Combined Mock Payload
// ============================================================================

export const MOCK_EDIT_COMPONENTS_PAYLOAD = {
  groups: MOCK_GROUPS,
  pricingTemplates: MOCK_PRICING_TEMPLATES,
  dependencyRules: MOCK_DEPENDENCY_RULES,
};

import { BundleItemType, BundlePriceType } from "@/graphql/bundle-types";
import type {
  IBundleGroup,
  PricingRuleTemplate,
  IDependencyRule,
} from "@/domains/inventory/products/components/product-details-card/bundle-ui/types";
import {
  DependencyActionType,
  DependencyTargetType,
} from "@/domains/inventory/products/components/product-details-card/bundle-ui/types";
import {
  ConditionCategory,
  ConditionSubject,
  StateCheckOperator,
  LogicOperator,
  ComparisonOperator,
} from "@/domains/inventory/products/components/product-details-card/bundle-ui/dependency-rules";

// Mock Bundle Groups (used by bundle-details.ts)
const mockBundleGroups: IBundleGroup[] = [
  {
    id: "grp-1",
    title: "Accessories",
    sortIndex: 0,
    minSelection: 1,
    maxSelection: 5,
    items: [
      {
        id: "item-1",
        itemType: BundleItemType.Product,
        sortIndex: 0,
        minQty: 1,
        maxQty: 3,
        pricingRule: { priceType: BundlePriceType.Base, priceValue: null },
        title: "Premium Case",
        featuredImage: null,
      },
      {
        id: "item-2",
        itemType: BundleItemType.Product,
        sortIndex: 1,
        minQty: null,
        maxQty: 2,
        pricingRule: { priceType: BundlePriceType.DiscountPercent, priceValue: 10 },
        title: "Pro Charger 65W",
        featuredImage: null,
      },
      {
        id: "item-3",
        itemType: BundleItemType.Product,
        sortIndex: 2,
        minQty: null,
        maxQty: null,
        pricingRule: { priceType: BundlePriceType.Free, priceValue: null },
        title: "Screen Protector",
        featuredImage: null,
      },
    ],
  },
  {
    id: "grp-2",
    title: "Warranty",
    sortIndex: 1,
    minSelection: null,
    maxSelection: 1,
    items: [
      {
        id: "item-4",
        itemType: BundleItemType.Product,
        sortIndex: 0,
        minQty: null,
        maxQty: 1,
        pricingRule: { priceType: BundlePriceType.Free, priceValue: null },
        title: "1 Year Standard Warranty (included)",
        featuredImage: null,
      },
      {
        id: "item-5",
        itemType: BundleItemType.Product,
        sortIndex: 1,
        minQty: null,
        maxQty: 1,
        pricingRule: { priceType: BundlePriceType.Fixed, priceValue: 12990 },
        title: "2 Year Extended Warranty",
        featuredImage: null,
      },
    ],
  },
];

// Mock Pricing Templates
const mockPricingTemplates: PricingRuleTemplate[] = [
  {
    id: "tpl-1",
    name: "Bundle Discount",
    priceType: BundlePriceType.DiscountPercent,
    priceValue: 15,
  },
  {
    id: "tpl-2",
    name: "Premium Fixed",
    priceType: BundlePriceType.Fixed,
    priceValue: 2999,
  },
  {
    id: "tpl-3",
    name: "Free Accessory",
    priceType: BundlePriceType.Free,
    priceValue: null,
  },
];

// Mock Dependency Rules (10 comprehensive rules with various conditions/actions)
const mockDependencyRules: IDependencyRule[] = [
  // Rule 1: Single condition (ITEM) → Single action (ITEM)
  {
    id: "rule-1",
    name: "Premium case hides screen protector",
    enabled: true,
    priority: 1000,
    logicOperator: LogicOperator.AND,
    conditionGroups: [
      {
        id: "grp-1-1",
        logicOperator: LogicOperator.AND,
        conditions: [
          {
            id: "cond-1-1",
            category: ConditionCategory.STATE_CHECK,
            subject: ConditionSubject.ITEM_SELECTED,
            operator: StateCheckOperator.IS_SELECTED,
            targetType: DependencyTargetType.ITEM,
            targetId: "item-1",
          },
        ],
      },
    ],
    actions: [
      {
        id: "act-1-1",
        actionType: DependencyActionType.HIDE,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-3",
      },
    ],
  },
  // Rule 2: 2 conditions (ITEM + GROUP) → Single action (ITEM)
  {
    id: "rule-2",
    name: "Charger + Accessories group shows warranty",
    enabled: true,
    priority: 900,
    logicOperator: LogicOperator.AND,
    conditionGroups: [
      {
        id: "grp-2-1",
        logicOperator: LogicOperator.AND,
        conditions: [
          {
            id: "cond-2-1",
            category: ConditionCategory.STATE_CHECK,
            subject: ConditionSubject.ITEM_SELECTED,
            operator: StateCheckOperator.IS_SELECTED,
            targetType: DependencyTargetType.ITEM,
            targetId: "item-2",
          },
          {
            id: "cond-2-2",
            category: ConditionCategory.NUMERIC,
            subject: ConditionSubject.GROUP_TOTAL_QTY,
            operator: ComparisonOperator.GTE,
            targetType: DependencyTargetType.GROUP,
            targetId: "grp-1",
            value: 2,
          },
        ],
      },
    ],
    actions: [
      {
        id: "act-2-1",
        actionType: DependencyActionType.SHOW,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-5",
      },
    ],
  },
  // Rule 3: Single condition (ITEM qty) → 2 actions (ITEM price + GROUP show)
  {
    id: "rule-3",
    name: "Bulk case order gives discount + shows warranty",
    enabled: true,
    priority: 800,
    logicOperator: LogicOperator.AND,
    conditionGroups: [
      {
        id: "grp-3-1",
        logicOperator: LogicOperator.AND,
        conditions: [
          {
            id: "cond-3-1",
            category: ConditionCategory.NUMERIC,
            subject: ConditionSubject.ITEM_QTY,
            operator: ComparisonOperator.GTE,
            targetType: DependencyTargetType.ITEM,
            targetId: "item-1",
            value: 2,
          },
        ],
      },
    ],
    actions: [
      {
        id: "act-3-1",
        actionType: DependencyActionType.ADJUST_PRICE,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-3",
        priceType: BundlePriceType.DiscountPercent,
        priceValue: 20,
      },
      {
        id: "act-3-2",
        actionType: DependencyActionType.SHOW,
        targetType: DependencyTargetType.GROUP,
        targetId: "grp-2",
      },
    ],
  },
  // Rule 4: 3 conditions (ITEM + ITEM + BUNDLE) → Single action (BUNDLE price)
  {
    id: "rule-4",
    name: "Full bundle discount",
    enabled: true,
    priority: 700,
    logicOperator: LogicOperator.AND,
    conditionGroups: [
      {
        id: "grp-4-1",
        logicOperator: LogicOperator.AND,
        conditions: [
          {
            id: "cond-4-1",
            category: ConditionCategory.STATE_CHECK,
            subject: ConditionSubject.ITEM_SELECTED,
            operator: StateCheckOperator.IS_SELECTED,
            targetType: DependencyTargetType.ITEM,
            targetId: "item-1",
          },
          {
            id: "cond-4-2",
            category: ConditionCategory.STATE_CHECK,
            subject: ConditionSubject.ITEM_SELECTED,
            operator: StateCheckOperator.IS_SELECTED,
            targetType: DependencyTargetType.ITEM,
            targetId: "item-2",
          },
          {
            id: "cond-4-3",
            category: ConditionCategory.STATE_CHECK,
            subject: ConditionSubject.ITEM_SELECTED,
            operator: StateCheckOperator.IS_SELECTED,
            targetType: DependencyTargetType.ITEM,
            targetId: "item-4",
          },
        ],
      },
    ],
    actions: [
      {
        id: "act-4-1",
        actionType: DependencyActionType.ADJUST_PRICE,
        targetType: DependencyTargetType.BUNDLE,
        priceType: BundlePriceType.DiscountPercent,
        priceValue: 15,
      },
    ],
  },
  // Rule 5: 2 conditions (GROUP qty OR) → 3 actions (multiple ITEMs)
  {
    id: "rule-5",
    name: "Group selection unlocks extras",
    enabled: true,
    priority: 600,
    logicOperator: LogicOperator.OR,
    conditionGroups: [
      {
        id: "grp-5-1",
        logicOperator: LogicOperator.OR,
        conditions: [
          {
            id: "cond-5-1",
            category: ConditionCategory.NUMERIC,
            subject: ConditionSubject.GROUP_TOTAL_QTY,
            operator: ComparisonOperator.GTE,
            targetType: DependencyTargetType.GROUP,
            targetId: "grp-1",
            value: 3,
          },
          {
            id: "cond-5-2",
            category: ConditionCategory.NUMERIC,
            subject: ConditionSubject.GROUP_TOTAL_QTY,
            operator: ComparisonOperator.GTE,
            targetType: DependencyTargetType.GROUP,
            targetId: "grp-2",
            value: 1,
          },
        ],
      },
    ],
    actions: [
      {
        id: "act-5-1",
        actionType: DependencyActionType.SHOW,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-3",
      },
      {
        id: "act-5-2",
        actionType: DependencyActionType.SHOW,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-4",
      },
      {
        id: "act-5-3",
        actionType: DependencyActionType.ADJUST_PRICE,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-5",
        priceType: BundlePriceType.Free,
        priceValue: null,
      },
    ],
  },
  // Rule 6: Single condition (ITEM not selected) → Single action (GROUP required)
  {
    id: "rule-6",
    name: "No case requires warranty selection",
    enabled: false,
    priority: 500,
    logicOperator: LogicOperator.AND,
    conditionGroups: [
      {
        id: "grp-6-1",
        logicOperator: LogicOperator.AND,
        conditions: [
          {
            id: "cond-6-1",
            category: ConditionCategory.STATE_CHECK,
            subject: ConditionSubject.ITEM_SELECTED,
            operator: StateCheckOperator.IS_NOT_SELECTED,
            targetType: DependencyTargetType.ITEM,
            targetId: "item-1",
          },
        ],
      },
    ],
    actions: [
      {
        id: "act-6-1",
        actionType: DependencyActionType.SET_REQUIRED,
        targetType: DependencyTargetType.GROUP,
        targetId: "grp-2",
        requiredValue: true,
      },
    ],
  },
  // Rule 7: 2 conditions (ITEM qty EQ) → 2 actions (ITEM + BUNDLE)
  {
    id: "rule-7",
    name: "Exact quantity bonus",
    enabled: true,
    priority: 400,
    logicOperator: LogicOperator.AND,
    conditionGroups: [
      {
        id: "grp-7-1",
        logicOperator: LogicOperator.AND,
        conditions: [
          {
            id: "cond-7-1",
            category: ConditionCategory.NUMERIC,
            subject: ConditionSubject.ITEM_QTY,
            operator: ComparisonOperator.EQ,
            targetType: DependencyTargetType.ITEM,
            targetId: "item-2",
            value: 2,
          },
          {
            id: "cond-7-2",
            category: ConditionCategory.STATE_CHECK,
            subject: ConditionSubject.ITEM_SELECTED,
            operator: StateCheckOperator.IS_SELECTED,
            targetType: DependencyTargetType.ITEM,
            targetId: "item-3",
          },
        ],
      },
    ],
    actions: [
      {
        id: "act-7-1",
        actionType: DependencyActionType.ADJUST_PRICE,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-3",
        priceType: BundlePriceType.Free,
        priceValue: null,
      },
      {
        id: "act-7-2",
        actionType: DependencyActionType.ADJUST_PRICE,
        targetType: DependencyTargetType.BUNDLE,
        priceType: BundlePriceType.DiscountFixed,
        priceValue: 5000,
      },
    ],
  },
  // Rule 8: 3 conditions (mixed types) → Single action (ITEM hide)
  {
    id: "rule-8",
    name: "Hide standard warranty with premium setup",
    enabled: true,
    priority: 300,
    logicOperator: LogicOperator.AND,
    conditionGroups: [
      {
        id: "grp-8-1",
        logicOperator: LogicOperator.AND,
        conditions: [
          {
            id: "cond-8-1",
            category: ConditionCategory.STATE_CHECK,
            subject: ConditionSubject.ITEM_SELECTED,
            operator: StateCheckOperator.IS_SELECTED,
            targetType: DependencyTargetType.ITEM,
            targetId: "item-1",
          },
          {
            id: "cond-8-2",
            category: ConditionCategory.STATE_CHECK,
            subject: ConditionSubject.ITEM_SELECTED,
            operator: StateCheckOperator.IS_SELECTED,
            targetType: DependencyTargetType.ITEM,
            targetId: "item-5",
          },
          {
            id: "cond-8-3",
            category: ConditionCategory.NUMERIC,
            subject: ConditionSubject.GROUP_TOTAL_QTY,
            operator: ComparisonOperator.GTE,
            targetType: DependencyTargetType.GROUP,
            targetId: "grp-1",
            value: 2,
          },
        ],
      },
    ],
    actions: [
      {
        id: "act-8-1",
        actionType: DependencyActionType.HIDE,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-4",
      },
    ],
  },
  // Rule 9: Single condition (GROUP) → 3 actions (ITEM show + ITEM price + GROUP required)
  {
    id: "rule-9",
    name: "Accessories combo deal",
    enabled: true,
    priority: 200,
    logicOperator: LogicOperator.AND,
    conditionGroups: [
      {
        id: "grp-9-1",
        logicOperator: LogicOperator.AND,
        conditions: [
          {
            id: "cond-9-1",
            category: ConditionCategory.NUMERIC,
            subject: ConditionSubject.GROUP_TOTAL_QTY,
            operator: ComparisonOperator.GTE,
            targetType: DependencyTargetType.GROUP,
            targetId: "grp-1",
            value: 4,
          },
        ],
      },
    ],
    actions: [
      {
        id: "act-9-1",
        actionType: DependencyActionType.SHOW,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-5",
      },
      {
        id: "act-9-2",
        actionType: DependencyActionType.ADJUST_PRICE,
        targetType: DependencyTargetType.ITEM,
        targetId: "item-5",
        priceType: BundlePriceType.DiscountPercent,
        priceValue: 50,
      },
      {
        id: "act-9-3",
        actionType: DependencyActionType.SET_REQUIRED,
        targetType: DependencyTargetType.GROUP,
        targetId: "grp-2",
        requiredValue: false,
      },
    ],
  },
  // Rule 10: 2 conditions (ITEM LTE) → 2 actions (BUNDLE + GROUP)
  {
    id: "rule-10",
    name: "Minimal bundle config",
    enabled: false,
    priority: 100,
    logicOperator: LogicOperator.AND,
    conditionGroups: [
      {
        id: "grp-10-1",
        logicOperator: LogicOperator.AND,
        conditions: [
          {
            id: "cond-10-1",
            category: ConditionCategory.NUMERIC,
            subject: ConditionSubject.ITEM_QTY,
            operator: ComparisonOperator.LTE,
            targetType: DependencyTargetType.ITEM,
            targetId: "item-1",
            value: 1,
          },
          {
            id: "cond-10-2",
            category: ConditionCategory.NUMERIC,
            subject: ConditionSubject.GROUP_TOTAL_QTY,
            operator: ComparisonOperator.LTE,
            targetType: DependencyTargetType.GROUP,
            targetId: "grp-1",
            value: 2,
          },
        ],
      },
    ],
    actions: [
      {
        id: "act-10-1",
        actionType: DependencyActionType.ADJUST_PRICE,
        targetType: DependencyTargetType.BUNDLE,
        priceType: BundlePriceType.Fixed,
        priceValue: 9999,
      },
      {
        id: "act-10-2",
        actionType: DependencyActionType.HIDE,
        targetType: DependencyTargetType.GROUP,
        targetId: "grp-2",
      },
    ],
  },
];

export const productDetailsMockData = {
  bundleItems: mockBundleGroups,
  pricingTemplates: mockPricingTemplates,
  dependencyRules: mockDependencyRules,
};

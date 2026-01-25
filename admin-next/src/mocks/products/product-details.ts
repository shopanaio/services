import { mockCategories } from "./categories";
import { mockTags } from "./tags";
import { MOCK_OPTION_GROUPS } from "./options";
import { mockBundlesList } from "./bundles-list";
import { createMockData as createAttributesMockData } from "./attributes";
import type {
  IProductDetailsMockData,
  IVariantsTableData,
} from "@/domains/inventory/products/components/product-details-card/types";
import {
  type ProductInventoryWidget,
  ThresholdType,
} from "@/domains/inventory/products/components/product-details-card/inventory-widget.types";
import { CurrencyCode, type ApiVariant, type ApiPageInfo } from "@/graphql/types";
import type { IBundleGroup, PricingRuleTemplate, IDependencyRule } from "@/domains/promos/bundles/types";
import { BundleItemType, BundlePriceType, DependencyActionType, DependencyTargetType } from "@/domains/promos/bundles/types";
import { ConditionCategory, ConditionSubject, StateCheckOperator, LogicOperator, ComparisonOperator } from "@/domains/promos/bundles/dependency-rules";

const getMockInventoryWidget = (): ProductInventoryWidget => ({
  quantities: {
    availableForSale: 1250,
    onHand: 1500,
    reserved: 250,
    unavailable: 10,
  },
  availableChange7d: -45,
  skuStatus: {
    total: 24,
    lowStock: { count: 3, averageDays: 12 },
    outOfStock: { count: 1, averageDays: 3 },
    backorder: { count: 2, averageDays: 5 },
  },
  alertThreshold: {
    method: ThresholdType.SAFETY_STOCK,
    minimumStock: 10,
  },
});

const defaultReviewsData = {
  rating: 4.2,
  reviewsCount: 128,
  breakdown: [
    { stars: 5, count: 89, percent: 70 },
    { stars: 4, count: 24, percent: 19 },
    { stars: 3, count: 8, percent: 6 },
    { stars: 2, count: 4, percent: 3 },
    { stars: 1, count: 3, percent: 2 },
  ],
};

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
        itemType: BundleItemType.PRODUCT,
        sortIndex: 0,
        minQty: 1,
        maxQty: 3,
        pricingRule: { priceType: BundlePriceType.BASE, priceValue: null },
        title: "Premium Case",
        featuredImage: null,
      },
      {
        id: "item-2",
        itemType: BundleItemType.PRODUCT,
        sortIndex: 1,
        minQty: null,
        maxQty: 2,
        pricingRule: { priceType: BundlePriceType.DISCOUNT_PERCENT, priceValue: 10 },
        title: "Pro Charger 65W",
        featuredImage: null,
      },
      {
        id: "item-3",
        itemType: BundleItemType.PRODUCT,
        sortIndex: 2,
        minQty: null,
        maxQty: null,
        pricingRule: { priceType: BundlePriceType.FREE, priceValue: null },
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
        itemType: BundleItemType.PRODUCT,
        sortIndex: 0,
        minQty: null,
        maxQty: 1,
        pricingRule: { priceType: BundlePriceType.FREE, priceValue: null },
        title: "1 Year Standard Warranty (included)",
        featuredImage: null,
      },
      {
        id: "item-5",
        itemType: BundleItemType.PRODUCT,
        sortIndex: 1,
        minQty: null,
        maxQty: 1,
        pricingRule: { priceType: BundlePriceType.FIXED, priceValue: 12990 },
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
    priceType: BundlePriceType.DISCOUNT_PERCENT,
    priceValue: 15,
  },
  {
    id: "tpl-2",
    name: "Premium Fixed",
    priceType: BundlePriceType.FIXED,
    priceValue: 2999,
  },
  {
    id: "tpl-3",
    name: "Free Accessory",
    priceType: BundlePriceType.FREE,
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
        priceType: BundlePriceType.DISCOUNT_PERCENT,
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
        priceType: BundlePriceType.DISCOUNT_PERCENT,
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
        priceType: BundlePriceType.FREE,
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
        priceType: BundlePriceType.FREE,
        priceValue: null,
      },
      {
        id: "act-7-2",
        actionType: DependencyActionType.ADJUST_PRICE,
        targetType: DependencyTargetType.BUNDLE,
        priceType: BundlePriceType.DISCOUNT_FIXED,
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
        priceType: BundlePriceType.DISCOUNT_PERCENT,
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
        priceType: BundlePriceType.FIXED,
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

export const productDetailsMockData: IProductDetailsMockData = {
  categories: {
    primary: mockCategories[0],
    list: mockCategories.slice(1, 4),
  },
  tags: mockTags.slice(0, 5),
  reviews: defaultReviewsData,
  attributes: createAttributesMockData(),
  options: MOCK_OPTION_GROUPS,
  bundleItems: mockBundleGroups,
  pricingTemplates: mockPricingTemplates,
  dependencyRules: mockDependencyRules,
  inventory: getMockInventoryWidget(),
  includedInBundles: mockBundlesList.slice(0, 4),
};

// ============================================================================
// Mock Variants Table Data
// ============================================================================

const createMockVariant = (index: number): ApiVariant => {
  const sizes = ["XS", "S", "M", "L", "XL"];
  const colors = ["Black", "White", "Navy", "Red", "Green"];
  const sizeIndex = index % sizes.length;
  const colorIndex = Math.floor(index / sizes.length) % colors.length;

  const basePrice = 2990 + index * 100;
  const hasDiscount = index % 3 === 0;

  return {
    __typename: "Variant",
    id: `variant-${index + 1}`,
    title: `${colors[colorIndex]} / ${sizes[sizeIndex]}`,
    sku: `SKU-${String(index + 1).padStart(4, "0")}`,
    handle: `variant-${colors[colorIndex].toLowerCase()}-${sizes[sizeIndex].toLowerCase()}`,
    isDefault: index === 0,
    inStock: index % 4 !== 0,
    createdAt: new Date(Date.now() - index * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    selectedOptions: [
      { optionId: "option-size", optionValueId: `size-${sizes[sizeIndex].toLowerCase()}` },
      { optionId: "option-color", optionValueId: `color-${colors[colorIndex].toLowerCase()}` },
    ],
    price: {
      __typename: "VariantPrice",
      id: `price-${index + 1}`,
      amountMinor: basePrice,
      compareAtMinor: hasDiscount ? basePrice + 1000 : null,
      currency: CurrencyCode.Rub,
      effectiveFrom: new Date().toISOString(),
      isCurrent: true,
      recordedAt: new Date().toISOString(),
    },
    cost: null,
    costHistory: {
      __typename: "VariantCostConnection",
      edges: [],
      pageInfo: {
        __typename: "PageInfo",
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
      totalCount: 0,
    },
    priceHistory: {
      __typename: "VariantPriceConnection",
      edges: [],
      pageInfo: {
        __typename: "PageInfo",
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
      totalCount: 0,
    },
    weight: index % 2 === 0 ? { __typename: "VariantWeight", value: 250 + index * 10 } : null,
    dimensions:
      index % 2 === 0
        ? { __typename: "VariantDimensions", length: 200, width: 150, height: 50 }
        : null,
    media: [],
    stock: [
      {
        __typename: "WarehouseStock",
        id: `stock-${index + 1}`,
        quantityOnHand: index % 4 === 0 ? 0 : 10 + index * 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        variant: {} as ApiVariant,
        warehouse: {
          __typename: "Warehouse",
          id: "warehouse-1",
          code: "WH-MAIN",
          createdAt: new Date().toISOString(),
          isDefault: true,
          name: "Main Warehouse",
          updatedAt: new Date().toISOString(),
          variantsCount: 25,
          stock: { __typename: "WarehouseStockConnection", edges: [], pageInfo: { __typename: "PageInfo", hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 },
        },
      },
    ],
    product: {} as ApiVariant["product"],
  };
};

export const getMockVariantsTableData = (
  page: number = 1,
  pageSize: number = 10,
  totalVariants: number = 25
): IVariantsTableData => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalVariants);
  const variants: ApiVariant[] = [];

  for (let i = startIndex; i < endIndex; i++) {
    variants.push(createMockVariant(i));
  }

  const pageInfo: ApiPageInfo = {
    __typename: "PageInfo",
    hasNextPage: endIndex < totalVariants,
    hasPreviousPage: page > 1,
    startCursor: variants.length > 0 ? `cursor-${startIndex}` : null,
    endCursor: variants.length > 0 ? `cursor-${endIndex - 1}` : null,
  };

  return {
    variants,
    pageInfo,
    totalCount: totalVariants,
  };
};

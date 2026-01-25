import { mockCategories } from "./categories";
import { mockTags } from "./tags";
import { MOCK_OPTION_GROUPS } from "./options";
import { createMockData as createAttributesMockData } from "./attributes";
import type {
  IProductDetailsMockData,
  IVariantsTableData,
} from "@/domains/inventory/products/components/product-details-card/types";
import {
  type ProductInventoryWidget,
  ThresholdType,
} from "@/domains/inventory/products/components/product-details-card/inventory-widget.types";
import { CurrencyCode, OptionDisplayType, type ApiVariant, type ApiPageInfo } from "@/graphql/types";
import type { IBundleGroup, PricingRuleTemplate, IDependencyRule } from "@/domains/promos/bundles/types";
import { BundleItemType, BundlePriceType, DependencyActionType, DependencyTargetType } from "@/domains/promos/bundles/types";
import { ConditionCategory, ConditionSubject, StateCheckOperator, LogicOperator } from "@/domains/promos/bundles/dependency-rules";

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

// Helper to create mock variant for bundle products
const createBundleVariant = (
  id: string,
  title: string,
  sku: string,
  price: number,
  productRef: { id: string; title: string },
  options: { optionId: string; optionValueId: string }[] = []
): ApiVariant => ({
  __typename: "Variant",
  id,
  title,
  sku,
  handle: id,
  isDefault: false,
  inStock: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  selectedOptions: options,
  price: {
    __typename: "VariantPrice",
    id: `price-${id}`,
    amountMinor: price,
    compareAtMinor: null,
    currency: CurrencyCode.Rub,
    effectiveFrom: new Date().toISOString(),
    isCurrent: true,
    recordedAt: new Date().toISOString(),
  },
  cost: null,
  costHistory: { __typename: "VariantCostConnection", edges: [], pageInfo: { __typename: "PageInfo", hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 },
  priceHistory: { __typename: "VariantPriceConnection", edges: [], pageInfo: { __typename: "PageInfo", hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 },
  weight: null,
  dimensions: null,
  media: [],
  stock: [],
  product: {
    __typename: "Product",
    id: productRef.id,
    title: productRef.title,
  } as ApiVariant["product"],
});

// Product reference for Premium Case
const premiumCaseProductRef = { id: "prod-1", title: "Premium Case" };

// Mock variants for Premium Case product
const premiumCaseVariants: ApiVariant[] = [
  createBundleVariant("case-var-1", "Black", "CASE-BLK", 199000, premiumCaseProductRef, [{ optionId: "color", optionValueId: "black" }]),
  createBundleVariant("case-var-2", "White", "CASE-WHT", 199000, premiumCaseProductRef, [{ optionId: "color", optionValueId: "white" }]),
  createBundleVariant("case-var-3", "Navy", "CASE-NVY", 219000, premiumCaseProductRef, [{ optionId: "color", optionValueId: "navy" }]),
  createBundleVariant("case-var-4", "Red", "CASE-RED", 219000, premiumCaseProductRef, [{ optionId: "color", optionValueId: "red" }]),
  createBundleVariant("case-var-5", "Green", "CASE-GRN", 239000, premiumCaseProductRef, [{ optionId: "color", optionValueId: "green" }]),
  createBundleVariant("case-var-6", "Gold", "CASE-GLD", 299000, premiumCaseProductRef, [{ optionId: "color", optionValueId: "gold" }]),
];

// Mock bundle groups with new structure
const mockBundleGroups: IBundleGroup[] = [
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
        itemType: BundleItemType.PRODUCT,
        assignedProduct: {
          __typename: "Product",
          id: "prod-1",
          title: "Premium Case",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublished: true,
          options: [
            {
              __typename: "ProductOption",
              id: "color",
              name: "Color",
              slug: "color",
              displayType: OptionDisplayType.Swatch,
              values: [
                { __typename: "ProductOptionValue", id: "black", name: "Black", slug: "black" },
                { __typename: "ProductOptionValue", id: "white", name: "White", slug: "white" },
                { __typename: "ProductOptionValue", id: "navy", name: "Navy", slug: "navy" },
                { __typename: "ProductOptionValue", id: "red", name: "Red", slug: "red" },
                { __typename: "ProductOptionValue", id: "green", name: "Green", slug: "green" },
                { __typename: "ProductOptionValue", id: "gold", name: "Gold", slug: "gold" },
              ],
            },
          ],
          features: [],
          variants: {
            __typename: "VariantConnection",
            edges: premiumCaseVariants.map((v) => ({ __typename: "VariantEdge" as const, cursor: v.id, node: v })),
            pageInfo: { __typename: "PageInfo", hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
            totalCount: 6,
          },
          variantsCount: 6,
        },
        sortIndex: 0,
        minQty: 1,
        maxQty: 3,
        pricingRule: {
          priceType: BundlePriceType.MARKUP_PERCENT,
          priceValue: 10,
        },
        title: null,
        featuredImage: null,
      },
      {
        id: "item-2",
        itemType: BundleItemType.PRODUCT,
        assignedProduct: {
          __typename: "Product",
          id: "prod-2",
          title: "Pro Charger 65W",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublished: true,
          options: [],
          features: [],
          variants: { __typename: "VariantConnection", edges: [], pageInfo: { __typename: "PageInfo", hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 },
          variantsCount: 0,
        },
        sortIndex: 1,
        minQty: null,
        maxQty: 2,
        pricingRule: {
          priceType: BundlePriceType.DISCOUNT_PERCENT,
          priceValue: 10,
        },
        title: null,
        featuredImage: null,
      },
      {
        id: "item-3",
        itemType: BundleItemType.PRODUCT,
        assignedProduct: {
          __typename: "Product",
          id: "prod-3",
          title: "Screen Protector",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublished: true,
          options: [],
          features: [],
          variants: { __typename: "VariantConnection", edges: [], pageInfo: { __typename: "PageInfo", hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 },
          variantsCount: 0,
        },
        sortIndex: 2,
        minQty: null,
        maxQty: null,
        pricingRule: {
          priceType: BundlePriceType.FREE,
          priceValue: null,
        },
        title: null,
        featuredImage: null,
      },
    ],
  },
  {
    id: "grp-2",
    title: "Warranty",
    sortIndex: 1,
    isRequired: false,
    isMultiple: false,
    minSelection: null,
    maxSelection: 1,
    items: [
      {
        id: "item-4",
        itemType: BundleItemType.PRODUCT,
        assignedProduct: {
          __typename: "Product",
          id: "war-1",
          title: "1 Year Standard Warranty",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublished: true,
          options: [],
          features: [],
          variants: { __typename: "VariantConnection", edges: [], pageInfo: { __typename: "PageInfo", hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 },
          variantsCount: 0,
        },
        sortIndex: 0,
        minQty: null,
        maxQty: 1,
        pricingRule: {
          priceType: BundlePriceType.INCLUDED,
          priceValue: null,
        },
        title: "1 Year Standard Warranty (included)",
        featuredImage: null,
      },
      {
        id: "item-5",
        itemType: BundleItemType.PRODUCT,
        assignedProduct: {
          __typename: "Product",
          id: "war-2",
          title: "2 Year Extended Warranty",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPublished: true,
          options: [],
          features: [],
          variants: { __typename: "VariantConnection", edges: [], pageInfo: { __typename: "PageInfo", hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }, totalCount: 0 },
          variantsCount: 0,
        },
        sortIndex: 1,
        minQty: null,
        maxQty: 1,
        pricingRule: {
          priceType: BundlePriceType.FIXED,
          priceValue: 12990,
        },
        title: null,
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
    name: "Premium Markup",
    priceType: BundlePriceType.MARKUP_PERCENT,
    priceValue: 20,
  },
  {
    id: "tpl-3",
    name: "Free Accessory",
    priceType: BundlePriceType.FREE,
    priceValue: null,
  },
];

// Mock Dependency Rules
const mockDependencyRules: IDependencyRule[] = [
  {
    id: "rule-1",
    name: "Premium case disables screen protector",
    enabled: true,
    priority: 200,
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
  {
    id: "rule-2",
    name: "Charger shows extended warranty",
    enabled: true,
    priority: 150,
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
  {
    id: "rule-3",
    name: "Screen protector free with charger",
    enabled: true,
    priority: 100,
    logicOperator: LogicOperator.AND,
    conditionGroups: [
      {
        id: "grp-3-1",
        logicOperator: LogicOperator.AND,
        conditions: [
          {
            id: "cond-3-1",
            category: ConditionCategory.STATE_CHECK,
            subject: ConditionSubject.ITEM_SELECTED,
            operator: StateCheckOperator.IS_SELECTED,
            targetType: DependencyTargetType.ITEM,
            targetId: "item-2",
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
        priceType: BundlePriceType.FREE,
        priceValue: null,
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

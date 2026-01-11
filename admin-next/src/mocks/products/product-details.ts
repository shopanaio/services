import { mockCategories, mockTags } from "./data";
import { MOCK_OPTION_GROUPS } from "./options";
import { mockGroups, getProductById, getVariantById } from "./components";
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

const getComponentItemImage = (
  productId: string,
  variantId?: string | null
): string | null => {
  if (variantId) {
    const variant = getVariantById(productId, variantId);
    if (variant?.imageUrl) return variant.imageUrl;
  }
  const product = getProductById(productId);
  return product?.imageUrl ?? null;
};

export const productDetailsMockData: IProductDetailsMockData = {
  categories: {
    primary: mockCategories[0],
    list: mockCategories.slice(1, 4),
  },
  tags: mockTags.slice(0, 5),
  reviews: defaultReviewsData,
  attributes: createAttributesMockData(),
  options: MOCK_OPTION_GROUPS,
  components: mockGroups,
  inventory: getMockInventoryWidget(),
  getComponentItemImage,
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

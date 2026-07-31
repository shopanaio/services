import type { IVariantsTableData } from "@/domains/inventory/products/components/product-details-card/types";
import type { ApiPageInfo, ApiVariant } from "@/graphql/types";
import {
  createMockApiInventoryItem,
  createMockApiInventoryItemCost,
  createMockApiVariant,
  createMockApiVariantDimensions,
  createMockApiVariantPrice,
  createMockApiVariantWeight,
  createMockApiWarehouseStock,
} from "./api-builders";

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
  const variantId = `variant-${index + 1}`;
  const stock = index % 4 === 0 ? 0 : 10 + index * 2;

  return createMockApiVariant({
    id: variantId,
    title: `${colors[colorIndex]} / ${sizes[sizeIndex]}`,
    handle: `variant-${colors[colorIndex].toLowerCase()}-${sizes[sizeIndex].toLowerCase()}`,
    isDefault: index === 0,
    selectedOptions: [],
    price: createMockApiVariantPrice({
      id: `price-${index + 1}`,
      amountMinor: basePrice,
      compareAtMinor: hasDiscount ? basePrice + 1000 : null,
    }),
    weight:
      index % 2 === 0
        ? createMockApiVariantWeight({
            value: 250 + index * 10,
          })
        : null,
    dimensions:
      index % 2 === 0
        ? createMockApiVariantDimensions({
            length: 200,
            width: 150,
            height: 50,
          })
        : null,
    inventoryItem: createMockApiInventoryItem({
      id: `inventory-${variantId}`,
      variantId,
      sku: `SKU-${String(index + 1).padStart(4, "0")}`,
      totalAvailable: stock,
      stock: [
        createMockApiWarehouseStock({
          id: `stock-${index + 1}`,
          quantityOnHand: stock,
        }),
      ],
      unitCost: createMockApiInventoryItemCost({
        amountMinor: Math.round(basePrice * 0.6),
      }),
    }),
    media: [],
  });
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

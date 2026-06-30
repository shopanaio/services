import { CurrencyCode } from "@/graphql/types";
import type {
  ApiVariant,
  ApiVariantCost,
  ApiVariantConnection,
  ApiVariantPriceConnection,
  ApiPricingWidgetPayload,
  ApiVariantPriceHistoryStatistics,
} from "@/graphql/types";
import { getPeriodDays } from "../../utils/periods";
import {
  createMockApiInventoryItem,
  createMockApiInventoryItemCost,
  createMockApiVariant,
  createMockApiVariantPrice,
  createMockApiWarehouseStock,
} from "@/mocks/products/api-builders";

// ============================================================================
// Mock Data Generators
// ============================================================================

const CURRENCY = CurrencyCode.Usd;

function generatePriceHistory(
  days: number,
  basePrice: number
): ApiVariantPriceConnection {
  const edges: ApiVariantPriceConnection["edges"] = [];
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const variance = Math.random() * 0.2 - 0.1; // ±10%
    const price = Math.round(basePrice * (1 + variance));

    edges.push({
      cursor: `cursor-${i}`,
      node: {
        __typename: "VariantPrice" as const,
        id: `price-${i}`,
        amountMinor: price,
        compareAtMinor: price > basePrice ? basePrice + 1000 : null,
        currency: CURRENCY,
        effectiveFrom: date.toISOString(),
        effectiveTo: i === 0 ? null : new Date(now.getTime() - (i - 1) * 24 * 60 * 60 * 1000).toISOString(),
        isCurrent: i === 0,
        recordedAt: date.toISOString(),
      },
    });
  }

  return {
    __typename: "VariantPriceConnection",
    edges,
    pageInfo: {
      __typename: "PageInfo",
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor,
      endCursor: edges[edges.length - 1]?.cursor,
    },
    totalCount: edges.length,
  };
}

function generateVariant(index: number, productId: string): ApiVariant {
  const basePrice = 1999 + index * 500; // $19.99, $24.99, etc.
  const costPrice = Math.round(basePrice * 0.4); // 40% margin
  const variantId = `variant-${productId}-${index}`;

  return createMockApiVariant({
    id: variantId,
    title: index === 0 ? "Default" : `Variant ${index + 1}`,
    handle: `variant-${index}`,
    isDefault: index === 0,
    selectedOptions: [
      {
        __typename: "SelectedOption",
        optionId: "option-size",
        optionValueId: `option-value-${["s", "m", "l", "xl"][index % 4] ?? "m"}`,
      },
    ],
    media: [],
    product: { id: productId } as ApiVariant["product"],
    price: createMockApiVariantPrice({
      id: `price-current-${index}`,
      amountMinor: basePrice,
      compareAtMinor: index % 2 === 0 ? basePrice + 500 : null,
      currency: CURRENCY,
    }),
    inventoryItem: createMockApiInventoryItem({
      id: `inventory-${variantId}`,
      variantId,
      sku: `SKU-${productId.slice(-4)}-${index}`,
      totalAvailable: 20 + index,
      stock: [
        createMockApiWarehouseStock({
          id: `stock-${variantId}`,
          quantityOnHand: 20 + index,
        }),
      ],
      unitCost: createMockApiInventoryItemCost({
        amountMinor: costPrice,
        currency: CURRENCY,
      }),
    }),
    priceHistory: generatePriceHistory(90, basePrice),
  });
}

function getCurrentVariantCost(variant: ApiVariant): ApiVariantCost | null {
  const unitCost = variant.inventoryItem?.unitCost;

  if (!unitCost) {
    return null;
  }

  return {
    __typename: "VariantCost",
    id: `cost-${variant.id}`,
    unitCostMinor: unitCost.amountMinor,
    currency: unitCost.currency as CurrencyCode,
    effectiveFrom: unitCost.effectiveFrom,
    effectiveTo: null,
    isCurrent: true,
    recordedAt: unitCost.effectiveFrom,
  };
}

// ============================================================================
// Mock API Functions
// ============================================================================

const VARIANTS_PER_PAGE = 20;
const TOTAL_VARIANTS = 50;

// Cache for generated variants per product
const variantsCache = new Map<string, ApiVariant[]>();

function getOrCreateVariants(productId: string): ApiVariant[] {
  if (!variantsCache.has(productId)) {
    const variants = Array.from({ length: TOTAL_VARIANTS }, (_, i) =>
      generateVariant(i, productId)
    );
    variantsCache.set(productId, variants);
  }
  return variantsCache.get(productId)!;
}

export interface FetchVariantsParams {
  productId: string;
  first?: number;
  after?: string;
}

export async function fetchVariants({
  productId,
  first = VARIANTS_PER_PAGE,
  after,
}: FetchVariantsParams): Promise<ApiVariantConnection> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const allVariants = getOrCreateVariants(productId);

  let startIndex = 0;
  if (after) {
    const cursorIndex = parseInt(after.replace("cursor-", ""), 10);
    startIndex = cursorIndex + 1;
  }

  const endIndex = Math.min(startIndex + first, allVariants.length);
  const variants = allVariants.slice(startIndex, endIndex);

  const edges = variants.map((variant, i) => ({
    cursor: `cursor-${startIndex + i}`,
    node: variant,
  }));

  return {
    __typename: "VariantConnection",
    edges,
    pageInfo: {
      __typename: "PageInfo",
      hasNextPage: endIndex < allVariants.length,
      hasPreviousPage: startIndex > 0,
      startCursor: edges[0]?.cursor,
      endCursor: edges[edges.length - 1]?.cursor,
    },
    totalCount: allVariants.length,
  };
}

export interface FetchPricingWidgetParams {
  variantId: string;
  period: string;
}


export async function fetchPricingWidget({
  variantId,
  period,
}: FetchPricingWidgetParams): Promise<ApiPricingWidgetPayload> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Find variant in cache
  let variant: ApiVariant | undefined;
  for (const variants of variantsCache.values()) {
    variant = variants.find((v) => v.id === variantId);
    if (variant) break;
  }

  if (!variant) {
    // Generate a default variant if not found
    variant = generateVariant(0, "unknown");
  }

  const days = getPeriodDays(period);
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Filter price history by period
  const filteredEdges = variant.priceHistory.edges.filter(
    (edge) => new Date(edge.node.effectiveFrom) >= cutoff
  );

  const history: ApiVariantPriceConnection = {
    ...variant.priceHistory,
    edges: filteredEdges,
    totalCount: filteredEdges.length,
  };

  // Calculate statistics from filtered history
  const prices = filteredEdges.map((e) => e.node.amountMinor);
  const statistics: ApiVariantPriceHistoryStatistics = {
    __typename: "VariantPriceHistoryStatistics",
    minPriceMinor: prices.length > 0 ? Math.min(...prices) : 0,
    maxPriceMinor: prices.length > 0 ? Math.max(...prices) : 0,
    avgPriceMinor:
      prices.length > 0
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : 0,
    currency: CURRENCY,
  };

  return {
    __typename: "PricingWidgetPayload",
    currentPrice: variant.price ?? null,
    currentCostPrice: getCurrentVariantCost(variant),
    history,
    statistics,
  };
}

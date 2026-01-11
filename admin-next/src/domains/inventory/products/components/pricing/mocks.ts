import { CurrencyCode } from "@/graphql/types";
import type {
  ApiVariant,
  ApiVariantConnection,
  ApiVariantPriceConnection,
  PricingWidgetPayload,
  ApiVariantPriceHistoryStatistics,
  ChartPeriod,
} from "./types";

// ============================================================================
// Mock Data Generators
// ============================================================================

const CURRENCY = CurrencyCode.Usd;

function generatePriceHistory(
  days: number,
  basePrice: number
): ApiVariantPriceConnection {
  const edges = [];
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

  return {
    __typename: "Variant",
    id: `variant-${productId}-${index}`,
    title: index === 0 ? "Default" : `Variant ${index + 1}`,
    handle: `variant-${index}`,
    sku: `SKU-${productId.slice(-4)}-${index}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    externalId: null,
    externalSystem: null,
    inStock: true,
    isDefault: index === 0,
    selectedOptions: [
      {
        __typename: "SelectedOption",
        optionId: "option-size",
        optionValueId: `option-value-${["s", "m", "l", "xl"][index % 4] ?? "m"}`,
      },
    ],
    media: [],
    stock: [],
    dimensions: null,
    weight: null,
    product: { id: productId } as ApiVariant["product"],
    price: {
      __typename: "VariantPrice",
      id: `price-current-${index}`,
      amountMinor: basePrice,
      compareAtMinor: index % 2 === 0 ? basePrice + 500 : null,
      currency: CURRENCY,
      effectiveFrom: new Date().toISOString(),
      effectiveTo: null,
      isCurrent: true,
      recordedAt: new Date().toISOString(),
    },
    cost: {
      __typename: "VariantCost",
      id: `cost-current-${index}`,
      unitCostMinor: costPrice,
      currency: CURRENCY,
      effectiveFrom: new Date().toISOString(),
      effectiveTo: null,
      isCurrent: true,
      recordedAt: new Date().toISOString(),
    },
    priceHistory: generatePriceHistory(90, basePrice),
    costHistory: {
      __typename: "VariantCostConnection",
      edges: [],
      pageInfo: {
        __typename: "PageInfo",
        hasNextPage: false,
        hasPreviousPage: false,
      },
      totalCount: 0,
    },
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

function getPeriodDays(period: string): number {
  const p = period.toLowerCase();
  switch (p) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "ytd":
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return Math.ceil((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    case "all":
      return 365 * 10; // 10 years
    default:
      return 30;
  }
}

export async function fetchPricingWidget({
  variantId,
  period,
}: FetchPricingWidgetParams): Promise<PricingWidgetPayload> {
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
    minPriceMinor: prices.length > 0 ? Math.min(...prices) : 0,
    maxPriceMinor: prices.length > 0 ? Math.max(...prices) : 0,
    avgPriceMinor:
      prices.length > 0
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : 0,
    currency: CURRENCY,
  };

  return {
    currentPrice: variant.price ?? null,
    currentCostPrice: variant.cost ?? null,
    history,
    statistics,
  };
}

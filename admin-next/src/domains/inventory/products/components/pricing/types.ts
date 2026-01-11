// ============================================================================
// Pricing Types
// ============================================================================

import type {
  ApiVariant,
  ApiVariantPrice,
  ApiVariantCost,
  ApiVariantPriceConnection,
  CurrencyCode,
} from "@/graphql/types";

// Re-export for convenience
export type {
  ApiVariant,
  ApiVariantPrice,
  ApiVariantCost,
  ApiVariantPriceConnection,
  CurrencyCode,
};

// ============================================================================
// Derived Types (from existing GraphQL types)
// ============================================================================

/**
 * Variant with pricing fields selected
 */
export type VariantWithPricing = Pick<
  ApiVariant,
  "id" | "title" | "price" | "cost" | "priceHistory"
>;

// ============================================================================
// Stats (computed on frontend from priceHistory)
// ============================================================================

/**
 * Computed statistics for price history
 */
export interface PriceHistoryStats {
  /** Minimum price over the period (minor units) */
  minPrice: number | null;
  /** Maximum price over the period (minor units) */
  maxPrice: number | null;
  /** Average price over the period (minor units) */
  avgPrice: number | null;
  /** Number of price changes */
  priceChangesCount: number;
}

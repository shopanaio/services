// ============================================================================
// Pricing Types
// ============================================================================

import type {
  ApiVariant,
  ApiVariantPrice,
  ApiVariantCost,
  ApiVariantPriceConnection,
  ApiVariantConnection,
  CurrencyCode,
} from "@/graphql/types";

// Re-export API types for convenience
export type {
  ApiVariant,
  ApiVariantPrice,
  ApiVariantCost,
  ApiVariantPriceConnection,
  ApiVariantConnection,
  CurrencyCode,
};

// ============================================================================
// Pricing Widget Query Response
// ============================================================================

/**
 * Statistics returned from API for a variant's price history
 */
export interface ApiVariantPriceHistoryStatistics {
  /** Minimum price over the period */
  minPriceMinor: number;
  /** Maximum price over the period */
  maxPriceMinor: number;
  /** Average price over the period */
  avgPriceMinor: number;
  /** Currency code */
  currency: CurrencyCode;
}

/**
 * Pricing data returned from widget query
 */
export interface PricingWidgetPayload {
  /** Current price */
  currentPrice: ApiVariantPrice | null;
  /** Current cost */
  currentCostPrice: ApiVariantCost | null;
  /** Price history for the requested period with stats */
  history: ApiVariantPriceConnection;
  /** Computed statistics for the period */
  statistics: ApiVariantPriceHistoryStatistics;
}

/**
 * Full response from pricing widget query
 */
export interface PricingWidgetQueryResponse {
  widgetQuery: {
    pricing: PricingWidgetPayload;
  };
}

// ============================================================================
// Legacy Types (for backward compatibility)
// ============================================================================

/**
 * Source of price change
 */
export type PriceSource = "manual" | "rule-based" | "promo" | "market";

/**
 * Single price history record
 */
export interface IPriceHistoryRecord {
  id: string;
  amount: number;
  compareAt: number | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isCurrent: boolean;
}

/**
 * Summary of variant prices with history
 */
export interface IVariantPriceSummary {
  variantId: string;
  variantTitle: string;
  currentPrice: number;
  previousPrice: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  margin: number | null;
  priceHistory: IPriceHistoryRecord[];
}

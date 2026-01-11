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

// Re-export API types for convenience
export type {
  ApiVariant,
  ApiVariantPrice,
  ApiVariantCost,
  ApiVariantPriceConnection,
  CurrencyCode,
};

// ============================================================================
// Pricing Block Props
// ============================================================================

export interface IPricingBlockProps {
  /** Variants with pricing data from API */
  variants: ApiVariant[];
  /** Currently selected variant ID */
  selectedVariantId?: string;
  /** Callback when variant selection changes */
  onVariantSelect?: (id: string) => void;
  /** Computed statistics for selected variant */
  stats?: ApiVariantPriceHistoryStatistics | null;
  /** Block title */
  title?: string;
  /** Callback for menu actions */
  onMoreAction?: (action: string) => void;
  /** Custom price formatter */
  formatPrice?: (amount: number, currency?: CurrencyCode) => string;
}

// ============================================================================
// Stats (computed on frontend from priceHistory)
// ============================================================================

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
export interface PricingWidget {
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
    pricing: PricingWidget;
  };
}

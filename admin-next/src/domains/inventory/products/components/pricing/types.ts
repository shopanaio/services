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
// Pricing Block Props
// ============================================================================

export interface IPricingBlockProps {
  /** Product ID to fetch pricing data for */
  productId: string;
  /** Custom price formatter */
  formatPrice?: (amount: number, currency?: CurrencyCode) => string;
}

// ============================================================================
// Period Types
// ============================================================================

export type ChartPeriod = "7D" | "30D" | "90D";
export type KPIPeriod = "7d" | "30d" | "90d" | "ytd" | "all";

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
// Sub-component Props
// ============================================================================

export interface IPricingHeaderProps {
  productId: string;
  variants: ApiVariantConnection;
  selectedVariantId: string | null;
  onVariantSelect: (id: string) => void;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  formatPrice: (amount: number) => string;
}

export interface ICurrentPriceColumnProps {
  price: number;
  compareAtPrice: number | null;
  formatPrice: (amount: number) => string;
}

export interface IPriceHistoryChartColumnProps {
  history: ApiVariantPriceConnection;
  period: string;
  onPeriodChange: (period: string) => void;
  formatPrice: (amount: number) => string;
}

export interface IKPIRowProps {
  stats: ApiVariantPriceHistoryStatistics | null;
  costPrice: number | null;
  formatPrice: (amount: number) => string;
}

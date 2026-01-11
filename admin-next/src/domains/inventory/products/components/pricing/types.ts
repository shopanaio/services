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
  stats?: PriceHistoryStats | null;
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

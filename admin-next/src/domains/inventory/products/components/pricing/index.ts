// Main components
export { PricingBlock } from "./pricing-block";

// Hooks
export { usePricingWidget } from "./use-pricing-widget";
export type { UsePricingWidgetReturn } from "./use-pricing-widget";

// Sub-components
export {
  PriceChart,
  PriceChangeIndicator,
  DiscountBadge,
  PriceStats,
  PriceTimeline,
  PriceHistoryTimeline,
} from "./components";

// Types
export type {
  ApiVariant,
  ApiVariantPrice,
  ApiVariantCost,
  ApiVariantPriceConnection,
  ApiVariantConnection,
  ApiVariantPriceHistoryStatistics,
  PricingWidgetPayload,
  CurrencyCode,
  IPriceHistoryRecord,
  IVariantPriceSummary,
} from "./types";

// Utilities
export {
  formatPrice,
  formatShortDate,
  formatDateTime,
  formatDateFull,
  getPriceSourceLabel,
} from "./utils";

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
  PriceSparkline,
  PriceStats,
  PriceTimeline,
  PriceHistoryTimeline,
} from "./components";

// Types
export type {
  IPricingBlockProps,
  ApiVariant,
  ApiVariantPrice,
  ApiVariantCost,
  ApiVariantPriceConnection,
  ApiVariantConnection,
  ApiVariantPriceHistoryStatistics,
  PricingWidgetPayload,
  ChartPeriod,
  CurrencyCode,
} from "./types";

// Utilities
export {
  formatPrice,
  formatShortDate,
  formatDateTime,
  formatDateFull,
  getPriceSourceLabel,
} from "./utils";

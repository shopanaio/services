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
  IPricingHeaderProps,
  ICurrentPriceColumnProps,
  IPriceHistoryChartColumnProps,
  IKPIRowProps,
  ApiVariant,
  ApiVariantPrice,
  ApiVariantCost,
  ApiVariantPriceConnection,
  ApiVariantConnection,
  ApiVariantPriceHistoryStatistics,
  PricingWidgetPayload,
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

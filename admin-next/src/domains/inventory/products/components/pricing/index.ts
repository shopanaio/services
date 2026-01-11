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
  // Period types
  Period,
  ChartPeriod,
  DateRange,
  PeriodConfig,
} from "./types";

// Period utilities
export {
  PERIODS,
  CHART_PERIODS,
  DEFAULT_PERIOD,
  DEFAULT_CHART_PERIOD,
  getDateRangeForPeriod,
  getPeriodConfig,
  getPeriodDays,
} from "./types";

// Utilities
export {
  formatPrice,
  formatShortDate,
  formatDateTime,
  formatDateFull,
  getPriceSourceLabel,
} from "./utils";

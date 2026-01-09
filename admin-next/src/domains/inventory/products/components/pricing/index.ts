// Main components
export { PricingBlock } from "./PricingBlock";

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
  IPriceHistoryRecord,
  IScheduledPriceRecord,
  IVariantPriceSummary,
  IPricingData,
  IVariantOption,
  PriceSource,
  MarginStatus,
  ChartPeriod,
  KPIPeriod,
  IChartPoint,
} from "./types";

// Utilities
export {
  formatPrice,
  formatShortDate,
  formatDateTime,
  formatDateFull,
  getPriceSourceLabel,
  getMarginStatus,
  calculateMargin,
  calculateDiscount,
  calculatePriceStats,
  filterHistoryByPeriod,
  calculatePriceChange,
} from "./utils";

// Mocks (for development)
export {
  generateMockHistory,
  generateMockScheduledPrices,
  getMockVariantPrices,
} from "./mocks";

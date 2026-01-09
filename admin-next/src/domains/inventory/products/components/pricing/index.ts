// Main components
export { PricingBlock } from "./pricing-block";

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
  IVariantPriceSummary,
  IPricingData,
  IVariantOption,
  PriceSource,
  MarginStatus,
  ChartPeriod,
  KPIPeriod,
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
  getMockVariantPrices,
} from "@/mocks/products/pricing";

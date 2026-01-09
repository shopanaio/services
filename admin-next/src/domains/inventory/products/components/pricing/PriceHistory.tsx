// Re-exports for backward compatibility
// TODO: Update imports in consuming files and remove this file

export type {
  IPriceHistoryRecord,
  IScheduledPriceRecord,
  IVariantPriceSummary,
} from "./types";

export {
  generateMockHistory,
  generateMockScheduledPrices,
  getMockVariantPrices,
} from "./mocks";

export {
  PriceChangeIndicator,
  DiscountBadge,
  PriceSparkline,
  PriceStats,
  PriceTimeline,
  PriceHistoryTimeline,
} from "./components";

export { formatPrice, formatDateFull } from "./utils";

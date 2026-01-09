// Re-exports for backward compatibility
// TODO: Update imports in consuming files and remove this file

export type {
  IPriceHistoryRecord,
  IVariantPriceSummary,
} from "./types";

export {
  generateMockHistory,
  getMockVariantPrices,
} from "@/mocks/products/pricing";

export {
  PriceChangeIndicator,
  DiscountBadge,
  PriceSparkline,
  PriceStats,
  PriceTimeline,
  PriceHistoryTimeline,
} from "./components";

export { formatPrice, formatDateFull } from "./utils";

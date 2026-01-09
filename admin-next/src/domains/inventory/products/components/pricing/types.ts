// ============================================================================
// Price History Types
// ============================================================================

export interface IPriceHistoryRecord {
  id: string;
  amount: number; // in minor units (kopecks)
  compareAt: number | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isCurrent: boolean;
}

export interface IVariantPriceSummary {
  variantId: string;
  variantTitle: string;
  currentPrice: number;
  previousPrice: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  margin: number | null; // percentage
  priceHistory: IPriceHistoryRecord[];
}

// ============================================================================
// Pricing Block Types
// ============================================================================

export type PriceSource = "manual" | "rule-based" | "promo" | "market";
export type MarginStatus = "ok" | "warning" | "critical";

export interface IPricingData {
  currentPrice: number;
  previousPrice: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  margin: number | null;
  marginStatus: MarginStatus;
  minAllowedPrice: number | null;
  maxPrice: number | null;
  priceSource: PriceSource;
  priceHistory: IPriceHistoryRecord[];
  lastUpdatedAt: Date;
  changesCount: number;
  targetMargin?: number;
}

export interface IVariantOption {
  id: string;
  title: string;
  price: number;
  margin: number | null;
  hasWarning: boolean;
}

// ============================================================================
// Chart Types
// ============================================================================

export type ChartPeriod = "7D" | "30D" | "90D";
export type KPIPeriod = "7d" | "30d" | "90d" | "ytd" | "all";

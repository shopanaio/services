import type { MarginStatus, IPriceHistoryRecord, KPIPeriod } from "../types";

export const getMarginStatus = (
  margin: number | null,
  target: number = 35
): MarginStatus => {
  if (margin === null) return "warning";
  if (margin < target - 10) return "critical";
  if (margin < target) return "warning";
  return "ok";
};

export const calculateMargin = (
  price: number,
  costPrice: number | null
): number | null => {
  if (!costPrice || costPrice <= 0) return null;
  return Math.round(((price - costPrice) / price) * 100);
};

export const calculateDiscount = (
  price: number,
  compareAtPrice: number | null
): { saving: number | null; percent: number | null } => {
  if (!compareAtPrice || compareAtPrice <= price) {
    return { saving: null, percent: null };
  }
  const saving = compareAtPrice - price;
  const percent = Math.round((saving / compareAtPrice) * 100);
  return { saving, percent };
};

export const calculatePriceStats = (
  history: IPriceHistoryRecord[]
): { min: number; max: number; avg: number; changes: number } => {
  const prices = history.map((h) => h.amount);
  if (prices.length === 0) {
    return { min: 0, max: 0, avg: 0, changes: 0 };
  }
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const changes = history.length - 1;
  return { min, max, avg, changes };
};

export const filterHistoryByPeriod = (
  history: IPriceHistoryRecord[],
  period: KPIPeriod
): IPriceHistoryRecord[] => {
  if (period === "all") return history;

  const now = new Date();

  if (period === "ytd") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return history.filter((h) => h.effectiveFrom >= startOfYear);
  }

  const daysMap: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };
  const days = daysMap[period] || 30;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return history.filter((h) => h.effectiveFrom >= cutoff);
};

export const calculatePriceChange = (
  currentPrice: number,
  previousPrice: number | null
): { diff: number; percent: number; isIncrease: boolean } | null => {
  if (!previousPrice || previousPrice === currentPrice) return null;
  const diff = currentPrice - previousPrice;
  const percent = Math.round((diff / previousPrice) * 100);
  return { diff, percent, isIncrease: diff > 0 };
};

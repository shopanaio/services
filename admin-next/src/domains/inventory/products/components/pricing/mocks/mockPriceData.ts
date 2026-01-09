import type {
  IPriceHistoryRecord,
  IScheduledPriceRecord,
  IVariantPriceSummary,
} from "../types";

export const generateMockHistory = (
  currentPrice: number,
  currentCompareAt?: number | null
): IPriceHistoryRecord[] => {
  const now = new Date();
  const history: IPriceHistoryRecord[] = [
    {
      id: "1",
      amount: currentPrice,
      compareAt: currentCompareAt || null,
      effectiveFrom: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      effectiveTo: null,
      isCurrent: true,
    },
    {
      id: "2",
      amount: Math.round(currentPrice * 1.15),
      compareAt: Math.round(currentPrice * 1.4),
      effectiveFrom: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      effectiveTo: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
    {
      id: "3",
      amount: Math.round(currentPrice * 0.9),
      compareAt: Math.round(currentPrice * 1.1),
      effectiveFrom: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      effectiveTo: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
    {
      id: "4",
      amount: Math.round(currentPrice * 1.05),
      compareAt: null,
      effectiveFrom: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      effectiveTo: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
    {
      id: "5",
      amount: Math.round(currentPrice * 1.2),
      compareAt: Math.round(currentPrice * 1.5),
      effectiveFrom: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      effectiveTo: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      isCurrent: false,
    },
  ];
  return history;
};

export const generateMockScheduledPrices = (
  currentPrice: number
): IScheduledPriceRecord[] => {
  const now = new Date();

  // 50% chance to have scheduled prices
  if (Math.random() > 0.5) {
    return [];
  }

  const scheduled: IScheduledPriceRecord[] = [
    {
      id: "sched-1",
      amount: Math.round(currentPrice * 0.85),
      compareAt: currentPrice,
      startsAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // +10 days
      endsAt: new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000), // +24 days
      reason: "Promo: Winter Sale",
    },
  ];

  // 30% chance to have a second scheduled price
  if (Math.random() > 0.7) {
    scheduled.push({
      id: "sched-2",
      amount: currentPrice,
      compareAt: null,
      startsAt: new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000), // after promo ends
      endsAt: null,
      reason: "Return to regular price",
    });
  }

  return scheduled;
};

export const getMockVariantPrices = (
  variants: Array<{
    id: string;
    title: string;
    price: number;
    compareAtPrice?: number | null;
    costPrice?: number | null;
  }>
): IVariantPriceSummary[] => {
  return variants.map((v) => {
    const history = generateMockHistory(v.price);
    const costPrice = v.costPrice ?? Math.round(v.price * 0.6);
    const margin =
      costPrice > 0
        ? Math.round(((v.price - costPrice) / v.price) * 100)
        : null;
    return {
      variantId: v.id,
      variantTitle: v.title,
      currentPrice: v.price,
      previousPrice: history[1]?.amount || null,
      compareAtPrice:
        v.compareAtPrice ??
        (Math.random() > 0.5 ? Math.round(v.price * 1.2) : null),
      costPrice,
      margin,
      priceHistory: history,
    };
  });
};

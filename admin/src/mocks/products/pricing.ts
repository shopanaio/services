import type { ApiVariantPrice } from "@/graphql/types";
import { CurrencyCode } from "@/graphql/types";

export const generateMockHistory = (
  currentPrice: number,
  currentCompareAt?: number | null,
  currency: CurrencyCode = CurrencyCode.Rub
): ApiVariantPrice[] => {
  const now = new Date();
  const history: ApiVariantPrice[] = [
    {
      __typename: "VariantPrice",
      id: "price-1",
      amountMinor: currentPrice,
      compareAtMinor: currentCompareAt ?? null,
      currency,
      effectiveFrom: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      effectiveTo: null,
      isCurrent: true,
      recordedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      __typename: "VariantPrice",
      id: "price-2",
      amountMinor: Math.round(currentPrice * 1.15),
      compareAtMinor: Math.round(currentPrice * 1.4),
      currency,
      effectiveFrom: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      effectiveTo: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      isCurrent: false,
      recordedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      __typename: "VariantPrice",
      id: "price-3",
      amountMinor: Math.round(currentPrice * 0.9),
      compareAtMinor: Math.round(currentPrice * 1.1),
      currency,
      effectiveFrom: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      effectiveTo: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      isCurrent: false,
      recordedAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      __typename: "VariantPrice",
      id: "price-4",
      amountMinor: Math.round(currentPrice * 1.05),
      compareAtMinor: null,
      currency,
      effectiveFrom: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      effectiveTo: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      isCurrent: false,
      recordedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      __typename: "VariantPrice",
      id: "price-5",
      amountMinor: Math.round(currentPrice * 1.2),
      compareAtMinor: Math.round(currentPrice * 1.5),
      currency,
      effectiveFrom: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      effectiveTo: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      isCurrent: false,
      recordedAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
  return history;
};

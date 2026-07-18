import {
  DiscountEffectiveStatus,
  DiscountKind,
  DiscountMethod,
} from "@/graphql/types";
import type { DiscountDetailsQueryDiscount } from "../../graphql/operation-types";

export type DiscountKpiPeriod = "7d" | "30d" | "90d";

export interface DiscountKpiFixture {
  period: DiscountKpiPeriod;
  compareEnabled: boolean;
  metrics: ReadonlyArray<{
    label: string;
    value: string;
    trend: string;
    trendDirection: "positive" | "neutral";
  }>;
}

// TODO: Replace these isolated Pencil fixtures with the Pricing analytics query.
const DISCOUNT_KPI_FIXTURES: Record<string, DiscountKpiFixture> = {
  [`${DiscountKind.AmountOffProducts}:${DiscountMethod.Code}:${DiscountEffectiveStatus.Active}`]: {
    period: "7d",
    compareEnabled: false,
    metrics: [
      { label: "Orders", value: "156", trend: "+8%", trendDirection: "positive" },
      { label: "Uses", value: "248", trend: "+12%", trendDirection: "positive" },
      { label: "Discounted sales", value: "$18,420", trend: "+6%", trendDirection: "positive" },
      { label: "Avg. discount", value: "20%", trend: "—", trendDirection: "neutral" },
    ],
  },
  [`${DiscountKind.BuyXGetY}:${DiscountMethod.Automatic}:${DiscountEffectiveStatus.Scheduled}`]: {
    period: "7d",
    compareEnabled: false,
    metrics: [
      { label: "Orders", value: "0", trend: "—", trendDirection: "neutral" },
      { label: "Uses", value: "0", trend: "—", trendDirection: "neutral" },
      { label: "Discounted sales", value: "$0", trend: "—", trendDirection: "neutral" },
      { label: "Avg. discount", value: "—", trend: "—", trendDirection: "neutral" },
    ],
  },
  [`${DiscountKind.AmountOffOrder}:${DiscountMethod.Code}:${DiscountEffectiveStatus.Paused}`]: {
    period: "7d",
    compareEnabled: false,
    metrics: [
      { label: "Orders", value: "82", trend: "+8%", trendDirection: "positive" },
      { label: "Uses", value: "94", trend: "+12%", trendDirection: "positive" },
      { label: "Discounted sales", value: "$24,800", trend: "+6%", trendDirection: "positive" },
      { label: "Avg. discount", value: "$25", trend: "—", trendDirection: "neutral" },
    ],
  },
  [`${DiscountKind.FreeShipping}:${DiscountMethod.Automatic}:${DiscountEffectiveStatus.Active}`]: {
    period: "7d",
    compareEnabled: false,
    metrics: [
      { label: "Orders", value: "314", trend: "+8%", trendDirection: "positive" },
      { label: "Uses", value: "314", trend: "+12%", trendDirection: "positive" },
      { label: "Discounted sales", value: "$42,100", trend: "+6%", trendDirection: "positive" },
      { label: "Avg. discount", value: "$12.40", trend: "—", trendDirection: "neutral" },
    ],
  },
};

const DRAFT_KPI_FIXTURE: DiscountKpiFixture = {
  period: "7d",
  compareEnabled: false,
  metrics: [
    { label: "Orders", value: "0", trend: "—", trendDirection: "neutral" },
    { label: "Uses", value: "0", trend: "—", trendDirection: "neutral" },
    { label: "Discounted sales", value: "$0", trend: "—", trendDirection: "neutral" },
    { label: "Avg. discount", value: "—", trend: "—", trendDirection: "neutral" },
  ],
};

export function getDiscountKpiFixture(
  discount: DiscountDetailsQueryDiscount,
): DiscountKpiFixture {
  if (discount.effectiveStatus === DiscountEffectiveStatus.Draft) {
    return DRAFT_KPI_FIXTURE;
  }

  const key = `${discount.kind}:${discount.method}:${discount.effectiveStatus}`;
  return DISCOUNT_KPI_FIXTURES[key] ?? DRAFT_KPI_FIXTURE;
}

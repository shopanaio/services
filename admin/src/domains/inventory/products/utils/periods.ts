import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export interface DateRange {
  gte: string;
  lt: string;
}

export interface PeriodConfig<T extends string = string> {
  value: T;
  label: string;
  getDateRange: () => DateRange;
}

export type Period = "7d" | "30d" | "90d" | "ytd" | "all";

export const getDateRangeForDays = (days: number): DateRange => {
  const now = dayjs.utc();
  const lt = now.add(1, "day").startOf("day");
  const gte = now.subtract(days - 1, "day").startOf("day");

  return {
    gte: gte.toISOString(),
    lt: lt.toISOString(),
  };
};

export const getYearToDateRange = (): DateRange => {
  const now = dayjs.utc();
  const lt = now.add(1, "day").startOf("day");
  const gte = now.startOf("year");

  return {
    gte: gte.toISOString(),
    lt: lt.toISOString(),
  };
};

export const getAllTimeRange = (): DateRange => {
  const now = dayjs.utc();
  const lt = now.add(1, "day").startOf("day");
  const gte = now.subtract(10, "year").startOf("day");

  return {
    gte: gte.toISOString(),
    lt: lt.toISOString(),
  };
};

export const PERIODS: readonly PeriodConfig<Period>[] = [
  {
    value: "7d",
    label: "7D",
    getDateRange: () => getDateRangeForDays(7),
  },
  {
    value: "30d",
    label: "30D",
    getDateRange: () => getDateRangeForDays(30),
  },
  {
    value: "90d",
    label: "90D",
    getDateRange: () => getDateRangeForDays(90),
  },
  {
    value: "ytd",
    label: "YTD",
    getDateRange: getYearToDateRange,
  },
  {
    value: "all",
    label: "All",
    getDateRange: getAllTimeRange,
  },
] as const;

export const CHART_PERIODS: readonly PeriodConfig<"7d" | "30d" | "90d">[] =
  PERIODS.filter((period): period is PeriodConfig<"7d" | "30d" | "90d"> =>
    ["7d", "30d", "90d"].includes(period.value),
  );

export type ChartPeriod = "7d" | "30d" | "90d";

export const getPeriodConfig = (
  value: Period,
): PeriodConfig<Period> | undefined =>
  PERIODS.find((period) => period.value === value);

export const getDateRangeForPeriod = (value: Period): DateRange => {
  const config = getPeriodConfig(value);

  return config?.getDateRange() ?? getDateRangeForDays(30);
};

export const getPeriodDays = (value: Period | string): number => {
  const normalizedValue = value.toLowerCase();

  switch (normalizedValue) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "ytd": {
      const now = dayjs.utc();
      const startOfYear = now.startOf("year");

      return now.diff(startOfYear, "day") + 1;
    }
    case "all":
      return 365 * 10;
    default:
      return 30;
  }
};

export const DEFAULT_CHART_PERIOD: ChartPeriod = "30d";
export const DEFAULT_PERIOD: Period = "30d";

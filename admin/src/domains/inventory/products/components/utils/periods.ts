// ============================================================================
// Unified Period System (using dayjs)
// ============================================================================

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

/**
 * ISO 8601 date range for API requests
 * Uses gte (>=) and lt (<) semantics for range queries
 */
export interface DateRange {
  /** Start date (inclusive) in ISO 8601 format */
  gte: string;
  /** End date (exclusive) in ISO 8601 format */
  lt: string;
}

/**
 * Period configuration with label and date range generator
 */
export interface PeriodConfig<T extends string = string> {
  /** Period value for API/state */
  value: T;
  /** Display label */
  label: string;
  /** Get date range for this period */
  getDateRange: () => DateRange;
}

// ============================================================================
// Period Values
// ============================================================================

export type Period = "7d" | "30d" | "90d" | "ytd" | "all";

// ============================================================================
// Date Range Generators
// ============================================================================

/**
 * Get date range for a given number of days back from today
 * @param days Number of days to look back
 * @returns DateRange with gte (start of day N days ago) and lt (start of tomorrow)
 */
export const getDateRangeForDays = (days: number): DateRange => {
  const now = dayjs.utc();
  const lt = now.add(1, "day").startOf("day");
  const gte = now.subtract(days - 1, "day").startOf("day");

  return {
    gte: gte.toISOString(),
    lt: lt.toISOString(),
  };
};

/**
 * Get date range from start of current year to tomorrow
 */
export const getYearToDateRange = (): DateRange => {
  const now = dayjs.utc();
  const lt = now.add(1, "day").startOf("day");
  const gte = now.startOf("year");

  return {
    gte: gte.toISOString(),
    lt: lt.toISOString(),
  };
};

/**
 * Get date range for "all time" (10 years back)
 */
export const getAllTimeRange = (): DateRange => {
  const now = dayjs.utc();
  const lt = now.add(1, "day").startOf("day");
  const gte = now.subtract(10, "year").startOf("day");

  return {
    gte: gte.toISOString(),
    lt: lt.toISOString(),
  };
};

// ============================================================================
// Period Configurations
// ============================================================================

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

/**
 * Chart periods subset (without YTD and All)
 */
export const CHART_PERIODS: readonly PeriodConfig<"7d" | "30d" | "90d">[] =
  PERIODS.filter((p): p is PeriodConfig<"7d" | "30d" | "90d"> =>
    ["7d", "30d", "90d"].includes(p.value)
  );

export type ChartPeriod = "7d" | "30d" | "90d";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get period configuration by value
 */
export const getPeriodConfig = (value: Period): PeriodConfig<Period> | undefined => {
  return PERIODS.find((p) => p.value === value);
};

/**
 * Get date range for a period value
 */
export const getDateRangeForPeriod = (value: Period): DateRange => {
  const config = getPeriodConfig(value);
  if (!config) {
    return getDateRangeForDays(30);
  }
  return config.getDateRange();
};

/**
 * Get number of days for a period (for backwards compatibility)
 */
export const getPeriodDays = (value: Period | string): number => {
  const v = value.toLowerCase();
  switch (v) {
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

/**
 * Default period for charts
 */
export const DEFAULT_CHART_PERIOD: ChartPeriod = "30d";

/**
 * Default period for KPIs
 */
export const DEFAULT_PERIOD: Period = "30d";

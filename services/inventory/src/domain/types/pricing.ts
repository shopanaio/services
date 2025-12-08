/**
 * Pricing domain types - matches GraphQL schema
 */

/** Supported currency codes */
export type CurrencyCode = "UAH" | "USD" | "EUR";

/**
 * Represents a price for a variant
 */
export interface VariantPrice {
  /** UUID of the price record */
  id: string;
  /** The currency code */
  currency: CurrencyCode;
  /** The price amount in minor units (cents, kopecks, etc.) */
  amountMinor: number;
  /** The compare-at price in minor units (strikethrough price) */
  compareAtMinor: number | null;
  /** When this price became effective */
  effectiveFrom: Date;
  /** When this price stopped being effective (null if current) */
  effectiveTo: Date | null;
  /** When this price record was created */
  recordedAt: Date;
  /** Whether this is the current active price */
  isCurrent: boolean;
}

/**
 * Represents the cost of a variant
 */
export interface VariantCost {
  /** UUID of the cost record */
  id: string;
  /** The currency code */
  currency: CurrencyCode;
  /** The unit cost in minor units */
  unitCostMinor: number;
  /** When this cost became effective */
  effectiveFrom: Date;
  /** When this cost stopped being effective (null if current) */
  effectiveTo: Date | null;
  /** When this cost record was created */
  recordedAt: Date;
  /** Whether this is the current active cost */
  isCurrent: boolean;
}

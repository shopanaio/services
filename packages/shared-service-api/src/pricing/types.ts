import { Money } from "@shopana/shared-money";

export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
}

export type DiscountCondition = Readonly<{
  minAmount?: Money;
}>;

export type Discount = Readonly<{
  code: string;
  type: DiscountType;
  value: number | Money;
  provider: string;
  conditions?: DiscountCondition;
}>;

/**
 * Response for discount validation
 */
export type ValidateDiscountResponse = Readonly<{
  valid: boolean;
  code: string;
  discount?: Discount;
  provider?: string;
}>;

/**
 * High-level client interface for the pricing service.
 */
export interface PricingApiClient {
  /**
   * Validate a discount code and get discount details.
   * Store ID and API key are obtained from correlation context.
   */
  validateDiscount(input: {
    code: string;
    provider?: string;
    storeId: string;
  }): Promise<ValidateDiscountResponse>;

  /**
   * Evaluate discounts for the given lines and checkout context.
   */
  evaluateDiscounts(
    input: PricingEvaluateDiscountsInput
  ): Promise<PricingEvaluateDiscountsResult>;
}

/**
 * Enriched unit payload sent to pricing for discount evaluation.
 */
export type PricingEvaluateDiscountsUnit = Readonly<{
  id: string;
  price: Money;
  compareAtPrice: Money | null;
  sku: string | null;
  snapshot: Record<string, unknown> | null;
}>;

/**
 * Line payload sent to pricing for discount evaluation.
 */
export type PricingEvaluateDiscountsLine = Readonly<{
  lineId: string;
  quantity: number;
  unit: PricingEvaluateDiscountsUnit;
}>;

export type PricingEvaluateDiscountsInput = Readonly<{
  storeId: string;
  currency: string;
  lines: PricingEvaluateDiscountsLine[];
  appliedDiscountCodes: string[];
}>;

export type PricingEvaluateDiscountsResult = Readonly<{
  /**
   * Aggregated discounts applicable at order/checkout scope.
   */
  aggregatedDiscounts: Discount[];
  /**
   * Item-level discounts keyed by line identifier.
   */
  lineDiscounts: Record<string, Discount[]>;
}>;

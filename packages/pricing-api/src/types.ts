import { Money } from "@shopana/money";
import { Discount, DiscountType } from "@shopana/pricing-plugin-kit";

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
 * Response for getting all discounts
 */
export type GetAllDiscountsResponse = Readonly<{
  discounts: Discount[];
  warnings?: { [code: string]: string }[];
}>;

/**
 * High-level client interface for the pricing service.
 */
export interface PricingApiClient {
  /**
   * Fetch all available discounts for a project (tenant).
   * Project ID and API key are obtained from correlation context.
   */
  getProjectDiscounts(): Promise<Discount[]>;

  /**
   * Validate a discount code and get discount details.
   * Project ID and API key are obtained from correlation context.
   */
  validateDiscount(input: {
    code: string;
    provider?: string;
    projectId: string;
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
  projectId: string;
  currency: string;
  lines: PricingEvaluateDiscountsLine[];
  appliedDiscountCodes: string[];
}>;

export type PricingEvaluateDiscountsResult = Readonly<{
  checkoutDiscounts: Discount[];
  lineDiscounts: Record<string, Discount[]>;
}>;

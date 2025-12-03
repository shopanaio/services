import type { TransactionScript } from "../../kernel/types.js";

export interface VariantSetPricingParams {
  readonly id: string;
  readonly price: number;
  readonly compareAtPrice?: number;
  readonly currencyCode?: string;
}

export interface VariantSetPricingResult {
  variant?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantSetPricing: TransactionScript<
  VariantSetPricingParams,
  VariantSetPricingResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "variantSetPricing: not implemented");

    return {
      variant: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "variantSetPricing failed");
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

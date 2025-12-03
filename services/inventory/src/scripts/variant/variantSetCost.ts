import type { TransactionScript } from "../../kernel/types.js";

export interface VariantSetCostParams {
  readonly id: string;
  readonly cost: number;
  readonly currencyCode?: string;
}

export interface VariantSetCostResult {
  variant?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantSetCost: TransactionScript<
  VariantSetCostParams,
  VariantSetCostResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "variantSetCost: not implemented");

    return {
      variant: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "variantSetCost failed");
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

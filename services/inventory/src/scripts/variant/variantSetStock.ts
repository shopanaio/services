import type { TransactionScript } from "../../kernel/types.js";

export interface VariantSetStockParams {
  readonly id: string;
  readonly warehouseId: string;
  readonly quantity: number;
}

export interface VariantSetStockResult {
  variant?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantSetStock: TransactionScript<
  VariantSetStockParams,
  VariantSetStockResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "variantSetStock: not implemented");

    return {
      variant: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "variantSetStock failed");
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

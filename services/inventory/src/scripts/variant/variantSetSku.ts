import type { TransactionScript } from "../../kernel/types.js";

export interface VariantSetSkuParams {
  readonly id: string;
  readonly sku: string;
}

export interface VariantSetSkuResult {
  variant?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantSetSku: TransactionScript<
  VariantSetSkuParams,
  VariantSetSkuResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "variantSetSku: not implemented");

    return {
      variant: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "variantSetSku failed");
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

import type { TransactionScript } from "../../kernel/types.js";

export interface VariantCreateParams {
  readonly productId: string;
  readonly sku?: string;
  readonly optionValues?: Array<{
    optionId: string;
    valueId: string;
  }>;
}

export interface VariantCreateResult {
  variant?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantCreate: TransactionScript<
  VariantCreateParams,
  VariantCreateResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "variantCreate: not implemented");

    return {
      variant: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "variantCreate failed");
    return {
      variant: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

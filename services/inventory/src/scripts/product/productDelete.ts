import type { TransactionScript } from "../../kernel/types.js";

export interface ProductDeleteParams {
  readonly id: string;
  readonly permanent?: boolean;
}

export interface ProductDeleteResult {
  deletedProductId?: string;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productDelete: TransactionScript<
  ProductDeleteParams,
  ProductDeleteResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "productDelete: not implemented");

    return {
      deletedProductId: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "productDelete failed");
    return {
      deletedProductId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

import type { TransactionScript } from "../../kernel/types.js";

export interface ProductOptionDeleteParams {
  readonly id: string;
}

export interface ProductOptionDeleteResult {
  deletedOptionId?: string;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productOptionDelete: TransactionScript<
  ProductOptionDeleteParams,
  ProductOptionDeleteResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "productOptionDelete: not implemented");

    return {
      deletedOptionId: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "productOptionDelete failed");
    return {
      deletedOptionId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

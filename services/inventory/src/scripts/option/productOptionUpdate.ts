import type { TransactionScript } from "../../kernel/types.js";

export interface ProductOptionUpdateParams {
  readonly id: string;
  readonly name?: string;
  readonly displayType?: string;
}

export interface ProductOptionUpdateResult {
  option?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productOptionUpdate: TransactionScript<
  ProductOptionUpdateParams,
  ProductOptionUpdateResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "productOptionUpdate: not implemented");

    return {
      option: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "productOptionUpdate failed");
    return {
      option: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

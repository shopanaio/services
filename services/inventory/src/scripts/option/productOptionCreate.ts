import type { TransactionScript } from "../../kernel/types.js";

export interface ProductOptionCreateParams {
  readonly productId: string;
  readonly name: string;
  readonly values: string[];
  readonly displayType?: string;
}

export interface ProductOptionCreateResult {
  option?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productOptionCreate: TransactionScript<
  ProductOptionCreateParams,
  ProductOptionCreateResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "productOptionCreate: not implemented");

    return {
      option: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "productOptionCreate failed");
    return {
      option: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

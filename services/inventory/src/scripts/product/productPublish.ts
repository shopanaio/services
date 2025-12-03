import type { TransactionScript } from "../../kernel/types.js";

export interface ProductPublishParams {
  readonly id: string;
}

export interface ProductPublishResult {
  product?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productPublish: TransactionScript<
  ProductPublishParams,
  ProductPublishResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "productPublish: not implemented");

    return {
      product: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "productPublish failed");
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

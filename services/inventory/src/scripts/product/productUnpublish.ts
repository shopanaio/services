import type { TransactionScript } from "../../kernel/types.js";

export interface ProductUnpublishParams {
  readonly id: string;
}

export interface ProductUnpublishResult {
  product?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productUnpublish: TransactionScript<
  ProductUnpublishParams,
  ProductUnpublishResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "productUnpublish: not implemented");

    return {
      product: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "productUnpublish failed");
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

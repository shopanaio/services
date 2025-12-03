import type { TransactionScript } from "../../kernel/types.js";

export interface ProductUpdateParams {
  readonly id: string;
  readonly title?: string;
  readonly description?: {
    text: string;
    html: string;
    json: Record<string, unknown>;
  };
  readonly excerpt?: string;
  readonly seoTitle?: string;
  readonly seoDescription?: string;
}

export interface ProductUpdateResult {
  product?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productUpdate: TransactionScript<
  ProductUpdateParams,
  ProductUpdateResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "productUpdate: not implemented");

    return {
      product: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "productUpdate failed");
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

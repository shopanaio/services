import type { TransactionScript } from "../../kernel/types.js";

export interface ProductCreateParams {
  readonly title: string;
  readonly description?: {
    text: string;
    html: string;
    json: Record<string, unknown>;
  };
  readonly excerpt?: string;
  readonly seoTitle?: string;
  readonly seoDescription?: string;
  readonly variants?: Array<{
    sku?: string;
    price?: number;
  }>;
  readonly options?: Array<{
    name: string;
    values: string[];
  }>;
  readonly publish?: boolean;
}

export interface ProductCreateResult {
  product?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productCreate: TransactionScript<
  ProductCreateParams,
  ProductCreateResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "productCreate: not implemented");

    return {
      product: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "productCreate failed");
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

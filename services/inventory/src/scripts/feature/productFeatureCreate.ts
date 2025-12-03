import type { TransactionScript } from "../../kernel/types.js";

export interface ProductFeatureCreateParams {
  readonly productId: string;
  readonly name: string;
  readonly value: string;
}

export interface ProductFeatureCreateResult {
  feature?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productFeatureCreate: TransactionScript<
  ProductFeatureCreateParams,
  ProductFeatureCreateResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "productFeatureCreate: not implemented");

    return {
      feature: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "productFeatureCreate failed");
    return {
      feature: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

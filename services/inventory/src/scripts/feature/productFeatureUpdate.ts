import type { TransactionScript } from "../../kernel/types.js";

export interface ProductFeatureUpdateParams {
  readonly id: string;
  readonly name?: string;
  readonly value?: string;
}

export interface ProductFeatureUpdateResult {
  feature?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productFeatureUpdate: TransactionScript<
  ProductFeatureUpdateParams,
  ProductFeatureUpdateResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "productFeatureUpdate: not implemented");

    return {
      feature: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "productFeatureUpdate failed");
    return {
      feature: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

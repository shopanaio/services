import type { TransactionScript } from "../../kernel/types.js";

export interface ProductFeatureDeleteParams {
  readonly id: string;
}

export interface ProductFeatureDeleteResult {
  deletedFeatureId?: string;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productFeatureDelete: TransactionScript<
  ProductFeatureDeleteParams,
  ProductFeatureDeleteResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "productFeatureDelete: not implemented");

    return {
      deletedFeatureId: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "productFeatureDelete failed");
    return {
      deletedFeatureId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

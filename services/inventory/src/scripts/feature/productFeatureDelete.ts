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
  const { logger, repository } = services;

  try {
    const { id } = params;

    // 1. Check if feature exists
    const existingFeature = await repository.feature.findById(id);
    if (!existingFeature) {
      return {
        deletedFeatureId: undefined,
        userErrors: [
          {
            message: "Feature not found",
            field: ["id"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. Delete feature (CASCADE will delete values and translations)
    const deleted = await repository.feature.delete(id);
    if (!deleted) {
      return {
        deletedFeatureId: undefined,
        userErrors: [
          {
            message: "Failed to delete feature",
            code: "DELETE_FAILED",
          },
        ],
      };
    }

    logger.info({ featureId: id }, "Product feature deleted successfully");

    return {
      deletedFeatureId: id,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "productFeatureDelete failed");
    return {
      deletedFeatureId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

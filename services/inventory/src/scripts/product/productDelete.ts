import type { TransactionScript } from "../../kernel/types.js";

export interface ProductDeleteParams {
  readonly id: string;
  readonly permanent?: boolean;
}

export interface ProductDeleteResult {
  deletedProductId?: string;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productDelete: TransactionScript<
  ProductDeleteParams,
  ProductDeleteResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { id, permanent = false } = params;

    // 1. Check if product exists
    const existingProduct = await repository.product.findById(id);
    if (!existingProduct) {
      return {
        deletedProductId: undefined,
        userErrors: [
          {
            message: "Product not found",
            field: ["id"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. Delete product (soft or hard)
    let deleted: boolean;
    if (permanent) {
      // Hard delete - CASCADE will delete variants and related data
      deleted = await repository.product.hardDelete(id);
    } else {
      // Soft delete - just set deletedAt
      deleted = await repository.product.softDelete(id);
    }

    if (!deleted) {
      return {
        deletedProductId: undefined,
        userErrors: [
          {
            message: "Failed to delete product",
            code: "DELETE_FAILED",
          },
        ],
      };
    }

    logger.info(
      { productId: id, permanent },
      "Product deleted successfully"
    );

    return {
      deletedProductId: id,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "productDelete failed");
    return {
      deletedProductId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

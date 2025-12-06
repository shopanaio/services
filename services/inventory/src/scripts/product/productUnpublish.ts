import type { TransactionScript } from "../../kernel/types.js";
import type { Product } from "../../repositories/models/index.js";

export interface ProductUnpublishParams {
  readonly id: string;
}

export interface ProductUnpublishResult {
  product?: Product;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productUnpublish: TransactionScript<
  ProductUnpublishParams,
  ProductUnpublishResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { id } = params;

    // 1. Check if product exists
    const existingProduct = await repository.product.findById(id);
    if (!existingProduct) {
      return {
        product: undefined,
        userErrors: [
          {
            message: "Product not found",
            field: ["id"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. Check if already unpublished
    if (existingProduct.publishedAt === null) {
      return {
        product: existingProduct,
        userErrors: [
          {
            message: "Product is already unpublished",
            code: "ALREADY_UNPUBLISHED",
          },
        ],
      };
    }

    // 3. Unpublish product
    const product = await repository.product.unpublish(id);
    if (!product) {
      return {
        product: undefined,
        userErrors: [
          {
            message: "Failed to unpublish product",
            code: "UNPUBLISH_FAILED",
          },
        ],
      };
    }

    logger.info({ productId: id }, "Product unpublished successfully");

    return {
      product,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "productUnpublish failed");
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

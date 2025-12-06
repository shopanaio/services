import type { TransactionScript } from "../../kernel/types.js";
import type { Product } from "../../repositories/models/index.js";

export interface ProductPublishParams {
  readonly id: string;
}

export interface ProductPublishResult {
  product?: Product;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productPublish: TransactionScript<
  ProductPublishParams,
  ProductPublishResult
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

    // 2. Check if already published
    if (existingProduct.publishedAt !== null) {
      return {
        product: existingProduct,
        userErrors: [
          {
            message: "Product is already published",
            code: "ALREADY_PUBLISHED",
          },
        ],
      };
    }

    // 3. Publish product
    const product = await repository.product.publish(id);
    if (!product) {
      return {
        product: undefined,
        userErrors: [
          {
            message: "Failed to publish product",
            code: "PUBLISH_FAILED",
          },
        ],
      };
    }

    logger.info({ productId: id }, "Product published successfully");

    return {
      product,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "productPublish failed");
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};

import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProductSetStatusParams, ProductSetStatusResult } from "./dto/index.js";

export class ProductSetStatusScript extends BaseScript<ProductSetStatusParams, ProductSetStatusResult> {
  protected async execute(params: ProductSetStatusParams): Promise<ProductSetStatusResult> {
    const { productId, action } = params;

    // 1. Check if product exists
    const existingProduct = await this.repository.product.findById(productId);
    if (!existingProduct) {
      return {
        product: undefined,
        userErrors: [{ message: "Product not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Handle PUBLISH action
    if (action === "PUBLISH") {
      if (existingProduct.publishedAt !== null) {
        return {
          product: existingProduct,
          userErrors: [{ message: "Product is already published", code: "ALREADY_PUBLISHED" }],
        };
      }

      const product = await this.repository.product.publish(productId);
      if (!product) {
        return {
          product: undefined,
          userErrors: [{ message: "Failed to publish product", code: "PUBLISH_FAILED" }],
        };
      }

      this.logger.info({ productId }, "Product published");
      return { product, userErrors: [] };
    }

    // 3. Handle UNPUBLISH action
    if (existingProduct.publishedAt === null) {
      return {
        product: existingProduct,
        userErrors: [{ message: "Product is already unpublished", code: "ALREADY_UNPUBLISHED" }],
      };
    }

    const product = await this.repository.product.unpublish(productId);
    if (!product) {
      return {
        product: undefined,
        userErrors: [{ message: "Failed to unpublish product", code: "UNPUBLISH_FAILED" }],
      };
    }

    this.logger.info({ productId }, "Product unpublished");
    return { product, userErrors: [] };
  }

  protected handleError(_error: unknown): ProductSetStatusResult {
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

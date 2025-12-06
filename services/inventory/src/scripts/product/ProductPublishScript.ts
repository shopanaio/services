import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProductPublishParams, ProductPublishResult } from "./dto/index.js";

export class ProductPublishScript extends BaseScript<ProductPublishParams, ProductPublishResult> {
  protected async execute(params: ProductPublishParams): Promise<ProductPublishResult> {
    const { id } = params;

    // 1. Check if product exists
    const existingProduct = await this.repository.product.findById(id);
    if (!existingProduct) {
      return {
        product: undefined,
        userErrors: [{ message: "Product not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Check if already published
    if (existingProduct.publishedAt !== null) {
      return {
        product: existingProduct,
        userErrors: [{ message: "Product is already published", code: "ALREADY_PUBLISHED" }],
      };
    }

    // 3. Publish product
    const product = await this.repository.product.publish(id);
    if (!product) {
      return {
        product: undefined,
        userErrors: [{ message: "Failed to publish product", code: "PUBLISH_FAILED" }],
      };
    }

    this.logger.info({ productId: id }, "Product published");

    return { product, userErrors: [] };
  }

  protected handleError(_error: unknown): ProductPublishResult {
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

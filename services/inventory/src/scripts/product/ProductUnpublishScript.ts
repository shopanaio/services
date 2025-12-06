import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProductUnpublishParams, ProductUnpublishResult } from "./dto/index.js";

export class ProductUnpublishScript extends BaseScript<ProductUnpublishParams, ProductUnpublishResult> {
  protected async execute(params: ProductUnpublishParams): Promise<ProductUnpublishResult> {
    const { id } = params;

    // 1. Check if product exists
    const existingProduct = await this.repository.product.findById(id);
    if (!existingProduct) {
      return {
        product: undefined,
        userErrors: [{ message: "Product not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Check if already unpublished
    if (existingProduct.publishedAt === null) {
      return {
        product: existingProduct,
        userErrors: [{ message: "Product is already unpublished", code: "ALREADY_UNPUBLISHED" }],
      };
    }

    // 3. Unpublish product
    const product = await this.repository.product.unpublish(id);
    if (!product) {
      return {
        product: undefined,
        userErrors: [{ message: "Failed to unpublish product", code: "UNPUBLISH_FAILED" }],
      };
    }

    this.logger.info({ productId: id }, "Product unpublished");

    return { product, userErrors: [] };
  }

  protected handleError(_error: unknown): ProductUnpublishResult {
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

// Re-export types for backwards compatibility
export type { ProductUnpublishParams, ProductUnpublishResult } from "./dto/index.js";

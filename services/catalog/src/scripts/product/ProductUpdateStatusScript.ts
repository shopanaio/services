import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProductUpdateStatusParams, ProductUpdateStatusResult } from "./dto/index.js";
import { singleError } from "../types/index.js";

/**
 * ProductUpdateStatusScript handles product publish/unpublish status.
 */
export class ProductUpdateStatusScript extends BaseScript<ProductUpdateStatusParams, ProductUpdateStatusResult> {
  protected async execute(params: ProductUpdateStatusParams): Promise<ProductUpdateStatusResult> {
    const { id, status } = params;

    // 1. Check if product exists
    const existingProduct = await this.repository.product.findById(id);
    if (!existingProduct) {
      return singleError("Product not found", "NOT_FOUND", ["id"]);
    }

    // 2. Determine current status
    const currentStatus = existingProduct.publishedAt !== null ? "published" : "draft";

    // 3. Check if already in target state
    if (status === currentStatus) {
      return {
        result: existingProduct,
        changes: null,
        userErrors: [],
      };
    }

    // 4. Apply status change
    let product;
    if (status === "published") {
      product = await this.repository.product.publish(id);
      if (!product) {
        return singleError("Failed to publish product", "PUBLISH_FAILED");
      }
      this.logger.info({ productId: id }, "Product published");
    } else {
      product = await this.repository.product.unpublish(id);
      if (!product) {
        return singleError("Failed to unpublish product", "UNPUBLISH_FAILED");
      }
      this.logger.info({ productId: id }, "Product unpublished");
    }

    return {
      result: product,
      changes: { status },
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProductUpdateStatusResult {
    return {
      result: null,
      changes: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

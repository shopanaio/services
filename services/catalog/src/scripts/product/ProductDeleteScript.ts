import { BaseScript } from "../../kernel/BaseScript.js";
import type { ProductDeleteParams, ProductDeleteResult } from "./dto/index.js";

export class ProductDeleteScript extends BaseScript<ProductDeleteParams, ProductDeleteResult> {
  protected async execute(params: ProductDeleteParams): Promise<ProductDeleteResult> {
    const { id, permanent = false } = params;

    // 1. Check if product exists
    const existingProduct = await this.repository.product.findById(id);
    if (!existingProduct) {
      return {
        deletedProductId: undefined,
        userErrors: [{ message: "Product not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    // 2. Delete product (soft or hard)
    let deleted: boolean;
    if (permanent) {
      deleted = await this.repository.product.hardDelete(id);
    } else {
      deleted = await this.repository.product.softDelete(id);
    }

    if (!deleted) {
      return {
        deletedProductId: undefined,
        userErrors: [{ message: "Failed to delete product", code: "DELETE_FAILED" }],
      };
    }

    this.logger.info({ productId: id, permanent }, "Product deleted");

    return { deletedProductId: id, userErrors: [] };
  }

  protected handleError(_error: unknown): ProductDeleteResult {
    return {
      deletedProductId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

import { BaseScript, Transactional } from "../../../kernel/BaseScript.js";
import type { ProductDeleteParams, ProductDeleteResult } from "../dto/ProductDeleteDto.js";

export class ProductDeleteScript extends BaseScript<ProductDeleteParams, ProductDeleteResult> {
  protected async execute(params: ProductDeleteParams): Promise<ProductDeleteResult> {
    return this.deleteProduct(params);
  }

  @Transactional()
  private async deleteProduct(params: ProductDeleteParams): Promise<ProductDeleteResult> {
    const { id, permanent = false } = params;

    const existingProduct = await this.repository.product.findById(id);
    if (!existingProduct) {
      return {
        deletedProductId: undefined,
        categoryIds: [],
        deletedAt: undefined,
        userErrors: [{ message: "Product not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    const categoryLinks = await this.repository.category.getProductCategoryLinks(id);
    const categoryIds = [...new Set(categoryLinks.map((link) => link.categoryId))];

    const deletedAt = new Date().toISOString();
    const deleted = permanent
      ? await this.repository.product.hardDelete(id)
      : await this.repository.product.softDelete(id);

    if (!deleted) {
      return {
        deletedProductId: undefined,
        categoryIds,
        deletedAt: undefined,
        userErrors: [{ message: "Failed to delete product", code: "DELETE_FAILED" }],
      };
    }

    this.logger.info({ productId: id, permanent }, "Product deleted");

    return {
      deletedProductId: id,
      categoryIds,
      deletedAt,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): ProductDeleteResult {
    return {
      deletedProductId: undefined,
      categoryIds: [],
      deletedAt: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

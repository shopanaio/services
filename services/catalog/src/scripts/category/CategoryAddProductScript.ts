import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  CategoryAddProductParams,
  CategoryAddProductResult,
} from "./dto/index.js";

export class CategoryAddProductScript extends BaseScript<
  CategoryAddProductParams,
  CategoryAddProductResult
> {
  protected async execute(
    params: CategoryAddProductParams
  ): Promise<CategoryAddProductResult> {
    const { categoryId, productId } = params;

    const category = await this.repository.category.findById(categoryId);
    if (!category) {
      return {
        category: undefined,
        userErrors: [{ message: "Category not found", field: ["categoryId"], code: "NOT_FOUND" }],
      };
    }

    const product = await this.repository.product.findById(productId);
    if (!product) {
      return {
        category: undefined,
        userErrors: [{ message: "Product not found", field: ["productId"], code: "NOT_FOUND" }],
      };
    }

    // Check if already in category
    const existing = await this.repository.category.getProductCategory(categoryId, productId);
    if (existing) {
      // Already exists, return success
      return { category, userErrors: [] };
    }

    // Add product to category
    await this.repository.category.addProductToCategory(productId, categoryId, false);

    return { category, userErrors: [] };
  }

  protected handleError(_error: unknown): CategoryAddProductResult {
    return {
      category: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

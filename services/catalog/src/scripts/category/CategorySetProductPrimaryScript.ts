import { BaseScript } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import type { Category } from "../../repositories/models/index.js";

export interface CategorySetProductPrimaryParams {
  categoryId: string;
  productId: string;
}

export interface CategorySetProductPrimaryResult {
  category?: Category;
  affectedProductIds: string[];
  userErrors: UserError[];
}

export class CategorySetProductPrimaryScript extends BaseScript<
  CategorySetProductPrimaryParams,
  CategorySetProductPrimaryResult
> {
  protected async execute(
    params: CategorySetProductPrimaryParams,
  ): Promise<CategorySetProductPrimaryResult> {
    const category = await this.repository.category.findById(params.categoryId);
    if (!category) {
      return {
        category: undefined,
        affectedProductIds: [],
        userErrors: [
          {
            message: "Category not found",
            field: ["input", "categoryId"],
            code: "MISSING_CATEGORY",
          },
        ],
      };
    }

    const product = await this.repository.product.findById(params.productId);
    if (!product) {
      return {
        category: undefined,
        affectedProductIds: [],
        userErrors: [
          {
            message: "Product not found",
            field: ["input", "productId"],
            code: "MISSING_PRODUCT",
          },
        ],
      };
    }

    const link = await this.repository.category.setProductPrimaryCategory(
      params.productId,
      params.categoryId,
    );
    if (!link) {
      return {
        category: undefined,
        affectedProductIds: [],
        userErrors: [
          {
            message: "Product is not assigned to category",
            field: ["input", "categoryId"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    return {
      category,
      affectedProductIds: [params.productId],
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CategorySetProductPrimaryResult {
    return {
      category: undefined,
      affectedProductIds: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

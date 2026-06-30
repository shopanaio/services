import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { Category } from "../../repositories/models/index.js";
import type { UserError } from "../../kernel/BaseScript.js";

export interface CategoryRemoveProductParams {
  categoryId: string;
  productId: string;
}

export interface CategoryRemoveProductResult {
  category?: Category;
  affectedProductIds: string[];
  userErrors: UserError[];
}

export class CategoryRemoveProductScript extends BaseScript<
  CategoryRemoveProductParams,
  CategoryRemoveProductResult
> {
  @Transactional()
  protected async execute(
    params: CategoryRemoveProductParams,
  ): Promise<CategoryRemoveProductResult> {
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

    const link = await this.repository.category.getProductCategory(
      params.categoryId,
      params.productId,
    );
    if (!link) {
      return {
        category: undefined,
        affectedProductIds: [],
        userErrors: [
          {
            message: "Product is not assigned to category",
            field: ["input", "productId"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    await this.repository.category.removeProductFromCategory(
      params.productId,
      params.categoryId,
    );

    return {
      category,
      affectedProductIds: [params.productId],
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CategoryRemoveProductResult {
    return {
      category: undefined,
      affectedProductIds: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

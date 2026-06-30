import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  CategoryRebalanceParams,
  CategoryRebalanceResult,
} from "./dto/index.js";

export class CategoryRebalanceScript extends BaseScript<
  CategoryRebalanceParams,
  CategoryRebalanceResult
> {
  protected async execute(
    params: CategoryRebalanceParams
  ): Promise<CategoryRebalanceResult> {
    const category = await this.repository.category.findById(params.categoryId);
    if (!category) {
      return {
        category: undefined,
        userErrors: [{ message: "Category not found", field: ["categoryId"], code: "NOT_FOUND" }],
      };
    }

    const affectedProductIds = (
      await this.repository.category.getOrderedCategoryProducts(
        params.categoryId
      )
    ).map((item) => item.productId);

    await this.repository.category.rebalanceCategoryProductRanks(params.categoryId);
    const refreshed = await this.repository.category.findById(params.categoryId);
    return {
      category: refreshed ?? undefined,
      affectedProductIds,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CategoryRebalanceResult {
    return {
      category: undefined,
      affectedProductIds: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

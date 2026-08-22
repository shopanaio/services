import { BaseScript } from "../../kernel/BaseScript.js";
import type { CategoryRebalanceParams, CategoryRebalanceResult } from "./dto/index.js";

export class CategoryRebalanceScript extends BaseScript<
  CategoryRebalanceParams,
  CategoryRebalanceResult
> {
  protected async execute(params: CategoryRebalanceParams): Promise<CategoryRebalanceResult> {
    const category = await this.repository.category.findById(params.categoryId);
    if (!category) {
      return {
        category: undefined,
        affectedProductIds: [],
        changed: false,
        userErrors: [{ message: "Category not found", field: ["categoryId"], code: "NOT_FOUND" }],
      };
    }

    const affectedProductIds = await this.repository.category.rebalanceCategoryProductRanks(
      params.categoryId,
    );

    if (affectedProductIds.length === 0) {
      return {
        category,
        affectedProductIds: [],
        changed: false,
        userErrors: [],
      };
    }

    const refreshed = await this.repository.category.findById(params.categoryId);
    return {
      category: refreshed ?? undefined,
      affectedProductIds,
      changed: true,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CategoryRebalanceResult {
    return {
      category: undefined,
      affectedProductIds: [],
      changed: false,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

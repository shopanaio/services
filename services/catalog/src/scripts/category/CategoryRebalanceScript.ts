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

    await this.repository.category.rebalanceCategoryProductRanks(params.categoryId);
    const refreshed = await this.repository.category.findById(params.categoryId);
    return { category: refreshed ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): CategoryRebalanceResult {
    return {
      category: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

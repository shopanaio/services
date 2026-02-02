import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CategoryDeleteParams, CategoryDeleteResult } from "./dto/index.js";

export class CategoryDeleteScript extends BaseScript<
  CategoryDeleteParams,
  CategoryDeleteResult
> {
  @Transactional()
  protected async execute(
    params: CategoryDeleteParams
  ): Promise<CategoryDeleteResult> {
    const { id, permanent = false } = params;

    // 1. Check if category exists
    const existing = await this.repository.category.findById(id);
    if (!existing) {
      return {
        deletedCategoryId: undefined,
        userErrors: [
          { message: "Category not found", field: ["id"], code: "NOT_FOUND" },
        ],
      };
    }

    // 2. Delete category (soft or hard)
    let deleted: boolean;
    if (permanent) {
      deleted = await this.repository.category.hardDelete(id);
    } else {
      deleted = await this.repository.category.softDelete(id);
    }

    if (!deleted) {
      return {
        deletedCategoryId: undefined,
        userErrors: [{ message: "Failed to delete category", code: "DELETE_FAILED" }],
      };
    }

    this.logger.info({ categoryId: id, permanent }, "Category deleted");

    return { deletedCategoryId: id, userErrors: [] };
  }

  protected handleError(_error: unknown): CategoryDeleteResult {
    return {
      deletedCategoryId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

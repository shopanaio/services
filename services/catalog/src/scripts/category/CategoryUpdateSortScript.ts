import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  CategoryUpdateSortParams,
  CategoryUpdateSortResult,
} from "./dto/index.js";

const ALLOWED_SORTS = new Set(["manual", "price", "newest", "name"]);
const ALLOWED_DIRECTIONS = new Set(["asc", "desc"]);

export class CategoryUpdateSortScript extends BaseScript<
  CategoryUpdateSortParams,
  CategoryUpdateSortResult
> {
  protected async execute(
    params: CategoryUpdateSortParams
  ): Promise<CategoryUpdateSortResult> {
    const { id, defaultSort, defaultSortDirection } = params;

    const existing = await this.repository.category.findById(id);
    if (!existing) {
      return {
        category: undefined,
        userErrors: [{ message: "Category not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    if (!ALLOWED_SORTS.has(defaultSort)) {
      return {
        category: undefined,
        userErrors: [{ message: "Invalid default sort", field: ["defaultSort"], code: "INVALID" }],
      };
    }

    if (!ALLOWED_DIRECTIONS.has(defaultSortDirection)) {
      return {
        category: undefined,
        userErrors: [
          {
            message: "Invalid default sort direction",
            field: ["defaultSortDirection"],
            code: "INVALID",
          },
        ],
      };
    }

    const category = await this.repository.category.updateSortPreferences(
      id,
      defaultSort,
      defaultSortDirection
    );

    return { category: category ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): CategoryUpdateSortResult {
    return {
      category: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

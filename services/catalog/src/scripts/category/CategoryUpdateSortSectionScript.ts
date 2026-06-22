import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  CategorySortParams,
  CategoryUpdateSectionResult,
} from "../../workflows/dto/CategoryUpdateWorkflowDto.js";

const ALLOWED_SORTS = new Set(["manual", "price", "newest", "name"]);
const ALLOWED_DIRECTIONS = new Set(["asc", "desc"]);

export interface CategoryUpdateSortSectionParams extends CategorySortParams {
  categoryId: string;
}

export class CategoryUpdateSortSectionScript extends BaseScript<
  CategoryUpdateSortSectionParams,
  CategoryUpdateSectionResult
> {
  @Transactional()
  protected async execute(
    params: CategoryUpdateSortSectionParams,
  ): Promise<CategoryUpdateSectionResult> {
    const existing = await this.repository.category.findById(params.categoryId);
    if (!existing) {
      return {
        category: undefined,
        userErrors: [
          {
            message: "Category not found",
            field: ["categoryId"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    if (!ALLOWED_SORTS.has(params.defaultSort)) {
      return {
        category: undefined,
        userErrors: [
          {
            message: "Invalid default sort",
            field: ["operations", "sort", "defaultSort"],
            code: "INVALID_SORT",
          },
        ],
      };
    }

    if (!ALLOWED_DIRECTIONS.has(params.defaultSortDirection)) {
      return {
        category: undefined,
        userErrors: [
          {
            message: "Invalid default sort direction",
            field: ["operations", "sort", "defaultSortDirection"],
            code: "INVALID_SORT",
          },
        ],
      };
    }

    if (
      params.defaultSort === existing.defaultSort &&
      params.defaultSortDirection === existing.defaultSortDirection
    ) {
      return { category: existing, userErrors: [] };
    }

    const category = await this.repository.category.updateSortPreferences(
      params.categoryId,
      params.defaultSort,
      params.defaultSortDirection,
    );

    return {
      category: category ?? undefined,
      changes: { categoryFields: { affectsProductIndex: false } },
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CategoryUpdateSectionResult {
    return {
      category: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CategoryMoveParams, CategoryMoveResult } from "./dto/index.js";

export class CategoryMoveScript extends BaseScript<
  CategoryMoveParams,
  CategoryMoveResult
> {
  @Transactional()
  protected async execute(
    params: CategoryMoveParams
  ): Promise<CategoryMoveResult> {
    const { id, newParentId } = params;

    // 1. Check if category exists
    const existing = await this.repository.category.findById(id);
    if (!existing) {
      return {
        category: undefined,
        userErrors: [
          { message: "Category not found", field: ["id"], code: "NOT_FOUND" },
        ],
      };
    }

    // 2. Validate new parent exists if provided
    if (newParentId) {
      const parent = await this.repository.category.findById(newParentId);
      if (!parent) {
        return {
          category: undefined,
          userErrors: [
            { message: "Parent category not found", field: ["newParentId"], code: "NOT_FOUND" },
          ],
        };
      }

      // 3. Check for circular reference
      if (newParentId === id) {
        return {
          category: undefined,
          userErrors: [
            { message: "Category cannot be its own parent", field: ["newParentId"], code: "CIRCULAR_REFERENCE" },
          ],
        };
      }

      // Check if new parent is a descendant of the category
      const isDescendant = parent.path.startsWith(existing.path + ".");
      if (isDescendant) {
        return {
          category: undefined,
          userErrors: [
            { message: "Cannot move category to its own descendant", field: ["newParentId"], code: "CIRCULAR_REFERENCE" },
          ],
        };
      }
    }

    // 4. Move category
    const category = await this.repository.category.move(id, newParentId ?? null);

    if (!category) {
      return {
        category: undefined,
        userErrors: [{ message: "Failed to move category", code: "MOVE_FAILED" }],
      };
    }

    this.logger.info(
      { categoryId: id, newParentId },
      "Category moved"
    );

    return { category, userErrors: [] };
  }

  protected handleError(_error: unknown): CategoryMoveResult {
    return {
      category: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  CategoryHierarchyMoveParams,
  CategoryUpdateSectionResult,
} from "../../workflows/dto/CategoryUpdateWorkflowDto.js";

export interface CategoryUpdateHierarchyParams extends CategoryHierarchyMoveParams {
  categoryId: string;
}

export class CategoryUpdateHierarchyScript extends BaseScript<
  CategoryUpdateHierarchyParams,
  CategoryUpdateSectionResult
> {
  @Transactional()
  protected async execute(
    params: CategoryUpdateHierarchyParams,
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

    const parentId = params.parentId ?? null;
    if (parentId === existing.parentId) {
      return { category: existing, userErrors: [] };
    }

    if (parentId === params.categoryId) {
      return {
        category: undefined,
        userErrors: [
          {
            message: "Category cannot be its own parent",
            field: ["operations", "hierarchy", "parentId"],
            code: "INVALID_PARENT",
          },
        ],
      };
    }

    if (parentId) {
      const parent = await this.repository.category.findById(parentId);
      if (!parent) {
        return {
          category: undefined,
          userErrors: [
            {
              message: "Parent category not found",
              field: ["operations", "hierarchy", "parentId"],
              code: "MISSING_CATEGORY",
            },
          ],
        };
      }

      if (parent.path.startsWith(`${existing.path}.`)) {
        return {
          category: undefined,
          userErrors: [
            {
              message: "Cannot move category to its own descendant",
              field: ["operations", "hierarchy", "parentId"],
              code: "CIRCULAR_REFERENCE",
            },
          ],
        };
      }
    }

    const direct =
      (await this.repository.comparisonRead.getDirectProfilesByCategoryIds([params.categoryId]))[0]
        ?.profileId ?? null;
    const inherited = parentId
      ? ((await this.repository.comparisonRead.getEffectiveProfilesByCategoryIds([parentId]))[0]
          ?.profileId ?? null)
      : null;
    if (
      await this.repository.comparisonRead.categoryAssignmentHasConflicts(
        params.categoryId,
        direct ?? inherited,
      )
    ) {
      return {
        category: undefined,
        userErrors: [
          {
            message: "Category hierarchy change conflicts with product comparison mappings",
            field: ["operations", "hierarchy", "parentId"],
            code: "COMPARISON_CATEGORY_PROFILE_CONFLICT",
          },
        ],
      };
    }

    const category = await this.repository.category.move(params.categoryId, parentId);

    return {
      category: category ?? undefined,
      changes: { categoryFields: { affectsProductIndex: false } },
      userErrors: category ? [] : [{ message: "Failed to move category", code: "INTERNAL_ERROR" }],
    };
  }

  protected handleError(_error: unknown): CategoryUpdateSectionResult {
    return {
      category: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

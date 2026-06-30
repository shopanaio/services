import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  CategoryUpdateSectionResult,
} from "../../workflows/dto/CategoryUpdateWorkflowDto.js";

export interface CategoryUpdateStatusParams {
  categoryId: string;
  status: "published" | "draft";
}

export class CategoryUpdateStatusScript extends BaseScript<
  CategoryUpdateStatusParams,
  CategoryUpdateSectionResult
> {
  @Transactional()
  protected async execute(
    params: CategoryUpdateStatusParams,
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

    const alreadyPublished = existing.publishedAt !== null;
    if (params.status === "published" && alreadyPublished) {
      return { category: existing, userErrors: [] };
    }
    if (params.status === "draft" && !alreadyPublished) {
      return { category: existing, userErrors: [] };
    }

    const category =
      params.status === "published"
        ? await this.repository.category.publish(params.categoryId)
        : await this.repository.category.unpublish(params.categoryId);

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

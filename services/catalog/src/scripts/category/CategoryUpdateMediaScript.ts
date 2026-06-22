import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  CategoryMediaParams,
  CategoryUpdateSectionResult,
} from "../../workflows/dto/CategoryUpdateWorkflowDto.js";

export interface CategoryUpdateMediaParams extends CategoryMediaParams {
  categoryId: string;
}

export class CategoryUpdateMediaScript extends BaseScript<
  CategoryUpdateMediaParams,
  CategoryUpdateSectionResult
> {
  @Transactional()
  protected async execute(
    params: CategoryUpdateMediaParams,
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

    await this.repository.category.setMedia(params.categoryId, params.fileIds);
    const category = await this.repository.category.findById(params.categoryId);

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

import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  CategorySeoParams,
  CategoryUpdateSectionResult,
} from "../../workflows/dto/CategoryUpdateWorkflowDto.js";

export interface CategoryUpdateSeoParams {
  categoryId: string;
  seo: CategorySeoParams | null;
}

export class CategoryUpdateSeoScript extends BaseScript<
  CategoryUpdateSeoParams,
  CategoryUpdateSectionResult
> {
  @Transactional()
  protected async execute(
    params: CategoryUpdateSeoParams,
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

    if (params.seo === null) {
      await this.repository.translation.deleteCategorySeo(
        params.categoryId,
        this.getLocale(),
      );
    } else {
      await this.repository.translation.upsertCategorySeo({
        projectId: this.getProjectId(),
        categoryId: params.categoryId,
        locale: this.getLocale(),
        seoTitle: params.seo.seoTitle ?? null,
        seoDescription: params.seo.seoDescription ?? null,
        ogTitle: params.seo.ogTitle ?? null,
        ogDescription: params.seo.ogDescription ?? null,
        ogImageId: params.seo.ogImageId ?? null,
      });
    }

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

import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  CategoryUpdateSectionResult,
} from "../../workflows/dto/CategoryUpdateWorkflowDto.js";

export interface CategoryUpdateIdentityParams {
  categoryId: string;
  handle?: string;
  name?: string;
}

export class CategoryUpdateIdentityScript extends BaseScript<
  CategoryUpdateIdentityParams,
  CategoryUpdateSectionResult
> {
  @Transactional()
  protected async execute(
    params: CategoryUpdateIdentityParams,
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

    if (params.handle && params.handle !== existing.handle) {
      const duplicate = await this.repository.category.findByHandleExcludingId(
        params.handle,
        params.categoryId,
      );
      if (duplicate) {
        return {
          category: undefined,
          userErrors: [
            {
              message: "Category handle already exists",
              field: ["operations", "handle"],
              code: "DUPLICATE_HANDLE",
            },
          ],
        };
      }
    }

    let changed = false;
    let affectsProductIndex = false;

    if (params.handle !== undefined && params.handle !== existing.handle) {
      await this.repository.category.update(params.categoryId, {
        handle: params.handle,
      });
      changed = true;
      affectsProductIndex = true;
    }

    if (params.name !== undefined) {
      const [existingTranslation] =
        await this.repository.category.getTranslationsByCategoryIds([
          params.categoryId,
        ]);

      if (params.name !== existingTranslation?.name) {
        await this.repository.category.upsertTranslation({
          projectId: this.getProjectId(),
          categoryId: params.categoryId,
          locale: this.getLocale(),
          name: params.name,
          descriptionText: existingTranslation?.descriptionText ?? null,
          descriptionHtml: existingTranslation?.descriptionHtml ?? null,
          descriptionJson: existingTranslation?.descriptionJson ?? null,
          excerptText: existingTranslation?.excerptText ?? null,
          excerptHtml: existingTranslation?.excerptHtml ?? null,
          excerptJson: existingTranslation?.excerptJson ?? null,
        });
        changed = true;
      }
    }

    const category = await this.repository.category.findById(params.categoryId);

    return {
      category: category ?? undefined,
      changes: changed
        ? { categoryFields: { affectsProductIndex } }
        : undefined,
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

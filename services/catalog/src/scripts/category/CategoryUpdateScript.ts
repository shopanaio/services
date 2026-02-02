import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CategoryUpdateParams, CategoryUpdateResult } from "./dto/index.js";

export class CategoryUpdateScript extends BaseScript<
  CategoryUpdateParams,
  CategoryUpdateResult
> {
  @Transactional()
  protected async execute(
    params: CategoryUpdateParams
  ): Promise<CategoryUpdateResult> {
    const { id, handle, name, description, mediaFileIds } = params;

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

    // 2. Check handle uniqueness if changing
    if (handle && handle !== existing.handle) {
      const duplicate = await this.repository.category.findByHandle(handle);
      if (duplicate) {
        return {
          category: undefined,
          userErrors: [
            { message: "Category handle already exists", field: ["handle"], code: "DUPLICATE" },
          ],
        };
      }
    }

    // 3. Update category
    if (handle) {
      await this.repository.category.update(id, { handle });
    }

    // 4. Update translation if name or description provided
    if (name !== undefined || description !== undefined) {
      // Get existing translation
      const translations = await this.repository.category.getTranslationsByCategoryIds([id]);
      const existingTranslation = translations.find(
        (t) => t.locale === this.getLocale()
      );

      await this.repository.category.upsertTranslation({
        projectId: this.getProjectId(),
        categoryId: id,
        locale: this.getLocale(),
        name: name ?? existingTranslation?.name ?? "",
        descriptionText: description?.text ?? existingTranslation?.descriptionText ?? null,
        descriptionHtml: description?.html ?? existingTranslation?.descriptionHtml ?? null,
        descriptionJson: description?.json
          ? JSON.stringify(description.json)
          : description === null
          ? null
          : existingTranslation?.descriptionJson ?? null,
      });
    }

    // 5. Update media if provided
    if (mediaFileIds !== undefined) {
      await this.repository.category.setMedia(id, mediaFileIds);
    }

    // 6. Fetch updated category
    const category = await this.repository.category.findById(id);

    this.logger.info({ categoryId: id }, "Category updated");

    return { category: category ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): CategoryUpdateResult {
    return {
      category: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

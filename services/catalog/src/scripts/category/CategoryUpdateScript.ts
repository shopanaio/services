import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CategoryUpdateParams, CategoryUpdateResult } from "./dto/index.js";

const ALLOWED_SORTS = new Set(["manual", "price", "newest", "name"]);
const ALLOWED_DIRECTIONS = new Set(["asc", "desc"]);

export class CategoryUpdateScript extends BaseScript<
  CategoryUpdateParams,
  CategoryUpdateResult
> {
  @Transactional()
  protected async execute(
    params: CategoryUpdateParams
  ): Promise<CategoryUpdateResult> {
    const {
      id,
      handle,
      defaultSort,
      defaultSortDirection,
      name,
      description,
      seo,
      mediaFileIds,
    } = params;

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

    if (defaultSort !== undefined && !ALLOWED_SORTS.has(defaultSort)) {
      return {
        category: undefined,
        userErrors: [{ message: "Invalid default sort", field: ["defaultSort"], code: "INVALID" }],
      };
    }

    if (
      defaultSortDirection !== undefined &&
      !ALLOWED_DIRECTIONS.has(defaultSortDirection)
    ) {
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

    // 3. Update category
    if (handle || defaultSort || defaultSortDirection) {
      await this.repository.category.update(id, {
        handle,
        defaultSort,
        defaultSortDirection,
      });
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

    if (seo !== undefined) {
      if (seo === null) {
        await this.repository.translation.deleteCategorySeo(id, this.getLocale());
      } else {
        await this.repository.translation.upsertCategorySeo({
          projectId: this.getProjectId(),
          categoryId: id,
          locale: this.getLocale(),
          seoTitle: seo.seoTitle ?? null,
          seoDescription: seo.seoDescription ?? null,
          ogTitle: seo.ogTitle ?? null,
          ogDescription: seo.ogDescription ?? null,
          ogImageId: seo.ogImageId ?? null,
        });
      }
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

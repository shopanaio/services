import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CategoryCreateParams, CategoryCreateResult } from "./dto/index.js";
import {
  serializeRichTextJsonText,
  toRichTextStorage,
} from "../shared/richText.js";

export class CategoryCreateScript extends BaseScript<
  CategoryCreateParams,
  CategoryCreateResult
> {
  @Transactional()
  protected async execute(
    params: CategoryCreateParams
  ): Promise<CategoryCreateResult> {
    const {
      handle,
      name,
      parentId,
      description,
      excerpt,
      seo,
      mediaFileIds,
      publish,
    } = params;

    // 1. Check if handle is unique
    const existing = await this.repository.category.findByHandle(handle);
    if (existing) {
      return {
        category: undefined,
        userErrors: [
          { message: "Category handle already exists", field: ["handle"], code: "DUPLICATE" },
        ],
      };
    }

    // 2. Validate parent exists if provided
    if (parentId) {
      const parent = await this.repository.category.findById(parentId);
      if (!parent) {
        return {
          category: undefined,
          userErrors: [
            { message: "Parent category not found", field: ["parentId"], code: "NOT_FOUND" },
          ],
        };
      }
    }

    // 3. Create category
    const category = await this.repository.category.create({
      handle,
      parentId: parentId ?? null,
      publishedAt: publish ? new Date() : null,
    });

    // 4. Create translation
    const excerptStorage = toRichTextStorage(excerpt);
    await this.repository.category.upsertTranslation({
      projectId: this.getProjectId(),
      categoryId: category.id,
      locale: this.getLocale(),
      name,
      descriptionText: description?.text ?? null,
      descriptionHtml: description?.html ?? null,
      descriptionJson: serializeRichTextJsonText(description?.json),
      excerptText: excerptStorage.text,
      excerptHtml: excerptStorage.html,
      excerptJson: serializeRichTextJsonText(excerptStorage.json),
    });

    // 5. Set media if provided
    if (mediaFileIds && mediaFileIds.length > 0) {
      await this.repository.category.setMedia(category.id, mediaFileIds);
    }

    if (seo) {
      await this.repository.translation.upsertCategorySeo({
        projectId: this.getProjectId(),
        categoryId: category.id,
        locale: this.getLocale(),
        seoTitle: seo.seoTitle ?? null,
        seoDescription: seo.seoDescription ?? null,
        ogTitle: seo.ogTitle ?? null,
        ogDescription: seo.ogDescription ?? null,
        ogImageId: seo.ogImageId ?? null,
      });
    }

    this.logger.info(
      { categoryId: category.id, handle, parentId },
      "Category created"
    );

    return { category, userErrors: [] };
  }

  protected handleError(_error: unknown): CategoryCreateResult {
    return {
      category: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

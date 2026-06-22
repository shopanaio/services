import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  CategoryContentParams,
  CategoryUpdateSectionResult,
} from "../../workflows/dto/CategoryUpdateWorkflowDto.js";
import {
  serializeRichTextJsonText,
  toRichTextStorage,
} from "../shared/richText.js";

export interface CategoryUpdateContentParams extends CategoryContentParams {
  categoryId: string;
}

export class CategoryUpdateContentScript extends BaseScript<
  CategoryUpdateContentParams,
  CategoryUpdateSectionResult
> {
  @Transactional()
  protected async execute(
    params: CategoryUpdateContentParams,
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

    const [existingTranslation] =
      await this.repository.category.getTranslationsByCategoryIds([
        params.categoryId,
      ]);

    const nextDescription =
      params.description === undefined
        ? {
            text: existingTranslation?.descriptionText ?? null,
            html: existingTranslation?.descriptionHtml ?? null,
            json: existingTranslation?.descriptionJson ?? null,
          }
        : toRichTextStorage(params.description);
    const nextExcerpt =
      params.excerpt === undefined
        ? {
            text: existingTranslation?.excerptText ?? null,
            html: existingTranslation?.excerptHtml ?? null,
            json: existingTranslation?.excerptJson ?? null,
          }
        : toRichTextStorage(params.excerpt);

    await this.repository.category.upsertTranslation({
      projectId: this.getProjectId(),
      categoryId: params.categoryId,
      locale: this.getLocale(),
      name: existingTranslation?.name ?? "",
      descriptionText: nextDescription.text,
      descriptionHtml: nextDescription.html,
      descriptionJson:
        params.description === undefined
          ? (nextDescription.json as string | null)
          : serializeRichTextJsonText(
              nextDescription.json as Record<string, unknown> | null,
            ),
      excerptText: nextExcerpt.text,
      excerptHtml: nextExcerpt.html,
      excerptJson:
        params.excerpt === undefined
          ? (nextExcerpt.json as string | null)
          : serializeRichTextJsonText(
              nextExcerpt.json as Record<string, unknown> | null,
            ),
    });

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

import { BaseScript } from "../../kernel/BaseScript.js";
import type { CollectionResult, CollectionUpdateParams } from "./dto/index.js";

const ALLOWED_SORTS = new Set(["manual", "price", "newest", "name"]);

export class CollectionUpdateScript extends BaseScript<
  CollectionUpdateParams,
  CollectionResult
> {
  protected async execute(params: CollectionUpdateParams): Promise<CollectionResult> {
    const existing = await this.repository.collection.findById(params.id);
    if (!existing) {
      return {
        collection: undefined,
        userErrors: [{ message: "Collection not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    if (params.defaultSort && !ALLOWED_SORTS.has(params.defaultSort)) {
      return {
        collection: undefined,
        userErrors: [{ message: "Invalid default sort", field: ["defaultSort"], code: "INVALID" }],
      };
    }

    if (
      existing.type === "rule" &&
      params.defaultSort !== undefined &&
      params.defaultSort === "manual"
    ) {
      return {
        collection: undefined,
        userErrors: [{ message: "Rule collection cannot use manual sort", field: ["defaultSort"], code: "INVALID" }],
      };
    }

    const collection = await this.repository.collection.update(params.id, {
      handle: params.handle,
      defaultSort: params.defaultSort,
      defaultSortDirection: params.defaultSortDirection,
      effectiveFrom: params.activeFrom,
      effectiveTo: params.activeTo,
      publishedAt:
        params.publish === undefined
          ? undefined
          : params.publish
          ? new Date().toISOString()
          : null,
    });

    if (
      params.name !== undefined ||
      params.description !== undefined
    ) {
      const existingTranslations =
        await this.repository.collection.getTranslationsByCollectionIds([params.id]);
      const existingTranslation = existingTranslations[0];

      await this.repository.collection.upsertTranslation({
        collectionId: params.id,
        name: params.name ?? existingTranslation?.name ?? "",
        descriptionText:
          params.description === null
            ? null
            : params.description?.text ?? existingTranslation?.descriptionText ?? null,
        descriptionHtml:
          params.description === null
            ? null
            : params.description?.html ?? existingTranslation?.descriptionHtml ?? null,
        descriptionJson:
          params.description === null
            ? null
            : params.description?.json
            ? JSON.stringify(params.description.json)
            : existingTranslation?.descriptionJson ?? null,
      });
    }

    if (params.seo !== undefined) {
      await this.repository.collection.upsertSeo({
        collectionId: params.id,
        seoTitle: params.seo?.seoTitle ?? null,
        seoDescription: params.seo?.seoDescription ?? null,
        ogTitle: params.seo?.ogTitle ?? null,
        ogDescription: params.seo?.ogDescription ?? null,
        ogImageId: params.seo?.ogImageId ?? null,
      });
    }

    if (params.mediaFileIds !== undefined) {
      await this.repository.collection.setMedia(params.id, params.mediaFileIds);
    }

    return { collection: collection ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): CollectionResult {
    return {
      collection: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

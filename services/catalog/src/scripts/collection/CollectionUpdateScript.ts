import { BaseScript } from "../../kernel/BaseScript.js";
import type { CollectionResult, CollectionUpdateParams } from "./dto/index.js";
import {
  serializeRichTextJsonText,
  toRichTextStorage,
} from "../shared/richText.js";

const ALLOWED_SORTS = new Set(["manual", "price", "newest", "name"]);
const HANDLE_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

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

    // Validate handle if provided
    if (params.handle !== undefined && params.handle !== null) {
      if (!HANDLE_REGEX.test(params.handle)) {
        return {
          collection: undefined,
          userErrors: [{ message: "Invalid handle format", field: ["input", "handle"], code: "INVALID" }],
        };
      }
      if (params.handle !== existing.handle) {
        const duplicate = await this.repository.collection.findByHandle(params.handle);
        if (duplicate) {
          return {
            collection: undefined,
            userErrors: [{ message: "Handle already exists", field: ["input", "handle"], code: "DUPLICATE" }],
          };
        }
      }
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
      params.description !== undefined ||
      params.excerpt !== undefined
    ) {
      const existingTranslations =
        await this.repository.collection.getTranslationsByCollectionIds([params.id]);
      const existingTranslation = existingTranslations[0];
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

      await this.repository.collection.upsertTranslation({
        collectionId: params.id,
        name: params.name ?? existingTranslation?.name ?? "",
        descriptionText: nextDescription.text,
        descriptionHtml: nextDescription.html,
        descriptionJson:
          params.description === undefined
            ? (nextDescription.json as string | null)
            : serializeRichTextJsonText(nextDescription.json as Record<string, unknown> | null),
        excerptText: nextExcerpt.text,
        excerptHtml: nextExcerpt.html,
        excerptJson:
          params.excerpt === undefined
            ? (nextExcerpt.json as string | null)
            : serializeRichTextJsonText(nextExcerpt.json as Record<string, unknown> | null),
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

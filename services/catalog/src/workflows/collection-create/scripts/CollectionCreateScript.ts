import {
  normalizeCollectionRuleHandleV1,
  normalizeCollectionInstantV1,
  CollectionContractValidationError,
} from "@shopana/broker-types";
import { BaseScript, Transactional } from "../../../kernel/BaseScript.js";
import type { CollectionCreateParams, CollectionResult } from "../dto/CollectionScriptDto.js";
import { serializeRichTextJsonText, toRichTextStorage } from "../../../scripts/shared/richText.js";

const ALLOWED_SORTS = new Set(["manual", "price", "newest", "name"]);

export class CollectionCreateScript extends BaseScript<CollectionCreateParams, CollectionResult> {
  @Transactional()
  protected async execute(params: CollectionCreateParams): Promise<CollectionResult> {
    // Validate name
    if (!params.name || params.name.trim() === "") {
      return {
        collection: undefined,
        userErrors: [{ message: "Name is required", field: ["input", "name"], code: "REQUIRED" }],
      };
    }
    if (
      params.publish &&
      (this.context.locale ?? this.context.store.defaultLocale) !== this.context.store.defaultLocale
    ) {
      return {
        collection: undefined,
        userErrors: [
          {
            message: "Published collection requires a default-locale name",
            field: ["name"],
            code: "NAME_REQUIRED",
          },
        ],
      };
    }

    // Validate handle is provided
    if (!params.handle || params.handle.trim() === "") {
      return {
        collection: undefined,
        userErrors: [
          { message: "Handle is required", field: ["input", "handle"], code: "REQUIRED" },
        ],
      };
    }

    let handle: string;
    try {
      handle = normalizeCollectionRuleHandleV1(params.handle);
    } catch (error) {
      return {
        collection: undefined,
        userErrors: [
          {
            message:
              error instanceof CollectionContractValidationError
                ? error.message
                : "Invalid handle format",
            field: ["input", "handle"],
            code: "INVALID_HANDLE",
          },
        ],
      };
    }

    // Check for duplicate handle
    const existing = await this.repository.collection.findByHandle(handle);
    if (existing) {
      return {
        collection: undefined,
        userErrors: [
          { message: "Handle already exists", field: ["input", "handle"], code: "DUPLICATE" },
        ],
      };
    }

    const defaultSort = params.defaultSort ?? (params.type === "manual" ? "manual" : "newest");
    const defaultSortDirection =
      params.defaultSortDirection ?? (defaultSort === "newest" ? "desc" : "asc");

    if (!ALLOWED_SORTS.has(defaultSort)) {
      return {
        collection: undefined,
        userErrors: [{ message: "Invalid default sort", field: ["defaultSort"], code: "INVALID" }],
      };
    }

    if (params.type === "rule" && defaultSort === "manual") {
      return {
        collection: undefined,
        userErrors: [
          {
            message: "Rule collection cannot use manual sort",
            field: ["defaultSort"],
            code: "INVALID",
          },
        ],
      };
    }
    if (
      (defaultSort === "manual" && defaultSortDirection !== "asc") ||
      (defaultSort === "newest" && defaultSortDirection !== "desc")
    ) {
      return {
        collection: undefined,
        userErrors: [
          {
            message: "Invalid default sort direction",
            field: ["defaultSortDirection"],
            code: "INVALID",
          },
        ],
      };
    }
    if (params.type === "rule" && params.publish) {
      return {
        collection: undefined,
        userErrors: [
          {
            message: "A rule collection must contain rules before publication",
            field: ["publish"],
            code: "RULES_REQUIRED",
          },
        ],
      };
    }
    let effectiveFrom: string | null;
    let effectiveTo: string | null;
    try {
      effectiveFrom =
        params.activeFrom == null ? null : normalizeCollectionInstantV1(params.activeFrom);
      effectiveTo = params.activeTo == null ? null : normalizeCollectionInstantV1(params.activeTo);
    } catch (error) {
      return {
        collection: undefined,
        userErrors: [
          {
            message:
              error instanceof CollectionContractValidationError
                ? error.message
                : "Collection effective interval is invalid",
            field: ["activeFrom"],
            code: "INVALID_EFFECTIVE_INTERVAL",
          },
        ],
      };
    }
    if (effectiveFrom && effectiveTo && effectiveFrom >= effectiveTo) {
      return {
        collection: undefined,
        userErrors: [
          {
            message: "Active-to must be later than active-from",
            field: ["activeTo"],
            code: "INVALID_EFFECTIVE_INTERVAL",
          },
        ],
      };
    }

    const collection = await this.repository.collection.create({
      handle,
      type: params.type,
      defaultSort,
      defaultSortDirection,
      effectiveFrom,
      effectiveTo,
      publishedAt: params.publish ? await this.repository.collection.currentTimestamp() : null,
    });

    const excerptStorage = toRichTextStorage(params.excerpt);
    await this.repository.collection.upsertTranslation({
      collectionId: collection.id,
      name: params.name,
      descriptionText: params.description?.text ?? null,
      descriptionHtml: params.description?.html ?? null,
      descriptionJson: serializeRichTextJsonText(params.description?.json),
      excerptText: excerptStorage.text,
      excerptHtml: excerptStorage.html,
      excerptJson: serializeRichTextJsonText(excerptStorage.json),
    });

    if (params.seo) {
      await this.repository.collection.upsertSeo({
        collectionId: collection.id,
        seoTitle: params.seo.seoTitle ?? null,
        seoDescription: params.seo.seoDescription ?? null,
        ogTitle: params.seo.ogTitle ?? null,
        ogDescription: params.seo.ogDescription ?? null,
        ogImageId: params.seo.ogImageId ?? null,
      });
    }

    if (params.mediaFileIds) {
      await this.repository.collection.setMedia(collection.id, params.mediaFileIds);
    }

    return { collection, userErrors: [] };
  }

  protected handleError(error: unknown): CollectionResult {
    if (isUniqueViolation(error)) {
      return {
        collection: undefined,
        userErrors: [
          {
            message: "Handle already exists",
            field: ["input", "handle"],
            code: "DUPLICATE",
          },
        ],
      };
    }
    return {
      collection: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

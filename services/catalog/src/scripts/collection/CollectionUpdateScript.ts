import {
  CollectionContractValidationError,
  normalizeCollectionInstantV1,
  normalizeCollectionRuleHandleV1,
} from "@shopana/broker-types";
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CollectionResult, CollectionUpdateParams } from "./dto/index.js";
import { serializeRichTextJsonText, toRichTextStorage } from "../shared/richText.js";

const ALLOWED_SORTS = new Set(["manual", "price", "newest", "name"]);

export class CollectionUpdateScript extends BaseScript<CollectionUpdateParams, CollectionResult> {
  @Transactional()
  protected async execute(params: CollectionUpdateParams): Promise<CollectionResult> {
    const existing = await this.repository.collection.findByIdForUpdate(params.id);
    if (!existing) {
      return {
        collection: undefined,
        userErrors: [{ message: "Collection not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }
    // Validate handle if provided
    let normalizedHandle = params.handle;
    if (params.handle !== undefined && params.handle !== null) {
      try {
        normalizedHandle = normalizeCollectionRuleHandleV1(params.handle);
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
      if (normalizedHandle !== existing.handle) {
        const duplicate = await this.repository.collection.findByHandle(normalizedHandle);
        if (duplicate) {
          return {
            collection: undefined,
            userErrors: [
              { message: "Handle already exists", field: ["input", "handle"], code: "DUPLICATE" },
            ],
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
        userErrors: [
          {
            message: "Rule collection cannot use manual sort",
            field: ["defaultSort"],
            code: "INVALID",
          },
        ],
      };
    }
    const nextSort = params.defaultSort ?? existing.defaultSort;
    const nextDirection = params.defaultSortDirection ?? existing.defaultSortDirection;
    if (
      (nextSort === "manual" && nextDirection !== "asc") ||
      (nextSort === "newest" && nextDirection !== "desc")
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
    let normalizedActiveFrom = params.activeFrom;
    let normalizedActiveTo = params.activeTo;
    try {
      if (typeof params.activeFrom === "string") {
        normalizedActiveFrom = normalizeCollectionInstantV1(params.activeFrom);
      }
      if (typeof params.activeTo === "string") {
        normalizedActiveTo = normalizeCollectionInstantV1(params.activeTo);
      }
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
    const nextEffectiveFrom =
      normalizedActiveFrom === undefined ? existing.effectiveFrom : normalizedActiveFrom;
    const nextEffectiveTo =
      normalizedActiveTo === undefined ? existing.effectiveTo : normalizedActiveTo;
    if (nextEffectiveFrom && nextEffectiveTo && nextEffectiveFrom >= nextEffectiveTo) {
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
    if (existing.type === "rule" && params.publish === true) {
      const ruleCount = (await this.repository.collectionRule.findByCollectionId(params.id)).length;
      if (ruleCount === 0) {
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
    }
    const nextPublished = params.publish ?? existing.publishedAt !== null;
    if (nextPublished) {
      const defaultTranslation = await this.repository.collection.findDefaultTranslation(params.id);
      const nextDefaultName =
        (this.context.locale ?? this.context.store.defaultLocale) ===
          this.context.store.defaultLocale && params.name !== undefined
          ? params.name
          : defaultTranslation?.name;
      if (!nextDefaultName?.trim()) {
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
    }
    const listingChanged =
      nextSort !== existing.defaultSort ||
      nextDirection !== existing.defaultSortDirection ||
      nextEffectiveFrom !== existing.effectiveFrom ||
      nextEffectiveTo !== existing.effectiveTo ||
      (params.publish !== undefined && params.publish !== (existing.publishedAt !== null));
    const publishedAt =
      params.publish === undefined || params.publish === (existing.publishedAt !== null)
        ? undefined
        : params.publish
          ? await this.repository.collection.currentTimestamp()
          : null;

    const collection = await this.repository.collection.update(
      params.id,
      {
        handle: normalizedHandle,
        defaultSort: params.defaultSort,
        defaultSortDirection: params.defaultSortDirection,
        effectiveFrom: normalizedActiveFrom,
        effectiveTo: normalizedActiveTo,
        publishedAt,
      },
      { listingChanged },
    );

    if (
      params.name !== undefined ||
      params.description !== undefined ||
      params.excerpt !== undefined
    ) {
      const existingTranslations = await this.repository.collection.getTranslationsByCollectionIds([
        params.id,
      ]);
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

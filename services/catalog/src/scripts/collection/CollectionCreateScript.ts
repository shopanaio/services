import { BaseScript } from "../../kernel/BaseScript.js";
import type { CollectionCreateParams, CollectionResult } from "./dto/index.js";
import {
  serializeRichTextJsonText,
  toRichTextStorage,
} from "../shared/richText.js";

const ALLOWED_SORTS = new Set(["manual", "price", "newest", "name"]);
const HANDLE_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export class CollectionCreateScript extends BaseScript<
  CollectionCreateParams,
  CollectionResult
> {
  protected async execute(params: CollectionCreateParams): Promise<CollectionResult> {
    // Validate name
    if (!params.name || params.name.trim() === "") {
      return {
        collection: undefined,
        userErrors: [{ message: "Name is required", field: ["input", "name"], code: "REQUIRED" }],
      };
    }

    // Validate handle is provided
    if (!params.handle || params.handle.trim() === "") {
      return {
        collection: undefined,
        userErrors: [{ message: "Handle is required", field: ["input", "handle"], code: "REQUIRED" }],
      };
    }

    // Validate handle format
    if (!HANDLE_REGEX.test(params.handle)) {
      return {
        collection: undefined,
        userErrors: [{ message: "Invalid handle format", field: ["input", "handle"], code: "INVALID" }],
      };
    }

    // Check for duplicate handle
    const existing = await this.repository.collection.findByHandle(params.handle);
    if (existing) {
      return {
        collection: undefined,
        userErrors: [{ message: "Handle already exists", field: ["input", "handle"], code: "DUPLICATE" }],
      };
    }

    const defaultSort =
      params.defaultSort ??
      (params.type === "manual" ? "manual" : "newest");
    const defaultSortDirection = params.defaultSortDirection ?? "asc";

    if (!ALLOWED_SORTS.has(defaultSort)) {
      return {
        collection: undefined,
        userErrors: [{ message: "Invalid default sort", field: ["defaultSort"], code: "INVALID" }],
      };
    }

    if (params.type === "rule" && defaultSort === "manual") {
      return {
        collection: undefined,
        userErrors: [{ message: "Rule collection cannot use manual sort", field: ["defaultSort"], code: "INVALID" }],
      };
    }

    const collection = await this.repository.collection.create({
      handle: params.handle,
      type: params.type,
      defaultSort,
      defaultSortDirection,
      effectiveFrom: params.activeFrom ?? null,
      effectiveTo: params.activeTo ?? null,
      publishedAt: params.publish ? new Date().toISOString() : null,
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

  protected handleError(_error: unknown): CollectionResult {
    return {
      collection: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

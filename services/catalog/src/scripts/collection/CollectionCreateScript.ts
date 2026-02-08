import { BaseScript } from "../../kernel/BaseScript.js";
import type { CollectionCreateParams, CollectionResult } from "./dto/index.js";

const ALLOWED_SORTS = new Set(["manual", "price", "newest", "name"]);

export class CollectionCreateScript extends BaseScript<
  CollectionCreateParams,
  CollectionResult
> {
  protected async execute(params: CollectionCreateParams): Promise<CollectionResult> {
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
      handle: params.handle ?? null,
      type: params.type,
      defaultSort,
      defaultSortDirection,
      effectiveFrom: params.activeFrom ?? null,
      effectiveTo: params.activeTo ?? null,
      publishedAt: params.publish ? new Date().toISOString() : null,
    });

    await this.repository.collection.upsertTranslation({
      collectionId: collection.id,
      name: params.name,
      descriptionText: params.description?.text ?? null,
      descriptionHtml: params.description?.html ?? null,
      descriptionJson: params.description?.json
        ? JSON.stringify(params.description.json)
        : null,
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

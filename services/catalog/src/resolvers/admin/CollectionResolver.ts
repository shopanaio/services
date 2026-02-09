import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { Collection } from "../../repositories/models/index.js";
import { ProductResolver } from "./ProductResolver.js";
import { QueryCollectionProductsScript } from "../../scripts/collection/QueryCollectionProductsScript.js";
import { SeoResolver } from "./SeoResolver.js";

interface CollectionProductsArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  filters?: {
    facets?: string[] | null;
    ranges?: Array<{
      facetSlug: string;
      min?: string | null;
      max?: string | null;
    }> | null;
    priceMinMinor?: string | null;
    priceMaxMinor?: string | null;
    inStock?: boolean | null;
  } | null;
  sort?: {
    by: "MANUAL" | "PRICE" | "NEWEST" | "NAME";
    direction?: "asc" | "desc" | null;
  } | null;
}

function resolvePriceBounds(filters: CollectionProductsArgs["filters"]): {
  priceMinMinor?: number;
  priceMaxMinor?: number;
} {
  let min: number | undefined;
  let max: number | undefined;

  for (const range of filters?.ranges ?? []) {
    if (range.facetSlug !== "price") continue;
    if (range.min !== undefined && range.min !== null) {
      const parsed = Number(range.min);
      if (!Number.isNaN(parsed)) {
        min = min === undefined ? parsed : Math.max(min, parsed);
      }
    }
    if (range.max !== undefined && range.max !== null) {
      const parsed = Number(range.max);
      if (!Number.isNaN(parsed)) {
        max = max === undefined ? parsed : Math.min(max, parsed);
      }
    }
  }

  if (filters?.priceMinMinor !== undefined && filters.priceMinMinor !== null) {
    const parsed = Number(filters.priceMinMinor);
    if (!Number.isNaN(parsed)) {
      min = min === undefined ? parsed : Math.max(min, parsed);
    }
  }

  if (filters?.priceMaxMinor !== undefined && filters.priceMaxMinor !== null) {
    const parsed = Number(filters.priceMaxMinor);
    if (!Number.isNaN(parsed)) {
      max = max === undefined ? parsed : Math.min(max, parsed);
    }
  }

  return { priceMinMinor: min, priceMaxMinor: max };
}

export class CollectionResolver extends CatalogType<string, Collection> {
  async $preload() {
    const collection = await this.$ctx.loaders.collection.load(this.$props);
    if (!collection) {
      throw new Error(`Collection with ID ${this.$props} not found`);
    }
    return collection;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Collection);
  }

  async handle() {
    return this.$get("handle");
  }

  async type() {
    return ((await this.$get("type")) ?? "manual").toUpperCase();
  }

  async name() {
    const translation = await this.$ctx.loaders.collectionTranslation.load(this.$props);
    return translation?.name ?? "";
  }

  async description() {
    const translation = await this.$ctx.loaders.collectionTranslation.load(this.$props);
    if (!translation) return null;
    return {
      text: translation.descriptionText ?? "",
      html: translation.descriptionHtml ?? "",
      json: translation.descriptionJson ?? {},
    };
  }

  async media() {
    const rows = await this.$ctx.loaders.collectionMedia.load(this.$props);
    return rows.map((row) => ({
      file: { __typename: "File" as const, id: row.fileId },
      sortIndex: row.sortIndex,
    }));
  }

  async seo() {
    const seo = await this.$ctx.loaders.collectionSeo.load(this.$props);
    if (!seo) return null;
    return new SeoResolver(seo, this.$ctx);
  }

  async defaultSort() {
    return ((await this.$get("defaultSort")) ?? "newest").toUpperCase();
  }

  async defaultSortDirection() {
    return (await this.$get("defaultSortDirection")) ?? "asc";
  }

  async activeFrom() {
    return this.$get("effectiveFrom");
  }

  async activeTo() {
    return this.$get("effectiveTo");
  }

  async isActive() {
    const now = new Date();
    const from = await this.$get("effectiveFrom");
    const to = await this.$get("effectiveTo");
    if (from && new Date(from) > now) return false;
    if (to && new Date(to) <= now) return false;
    return true;
  }

  async publishedAt() {
    return this.$get("publishedAt");
  }

  async isPublished() {
    const publishedAt = await this.$get("publishedAt");
    if (!publishedAt) return false;
    return new Date(publishedAt) <= new Date();
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }

  async rules() {
    const rows = await this.$ctx.kernel.repository.collectionRule.findByCollectionId(
      this.$props
    );
    return rows.map((row) => ({
      id: row.id,
      field: row.field,
      operator: row.operator,
      value: row.value,
      sortIndex: row.sortIndex,
    }));
  }

  async products(args: CollectionProductsArgs) {
    const { priceMinMinor, priceMaxMinor } = resolvePriceBounds(args.filters);
    const result = await this.$ctx.kernel.runScript(QueryCollectionProductsScript, {
      collectionId: this.$props,
      locale: this.$ctx.locale ?? "uk",
      first: args.first ?? undefined,
      after: args.after ?? undefined,
      filters: args.filters
        ? {
            facets: args.filters.facets ?? undefined,
            ranges:
              args.filters.ranges?.map((range) => ({
                facetSlug: range.facetSlug,
                min:
                  range.min !== undefined && range.min !== null
                    ? Number(range.min)
                    : undefined,
                max:
                  range.max !== undefined && range.max !== null
                    ? Number(range.max)
                    : undefined,
              })) ?? undefined,
            priceMinMinor,
            priceMaxMinor,
            inStock: args.filters.inStock ?? undefined,
          }
        : undefined,
      sort: args.sort
        ? {
            by: args.sort.by.toLowerCase() as "manual" | "price" | "newest" | "name",
            direction: (args.sort.direction ?? undefined) as
              | "asc"
              | "desc"
              | undefined,
          }
        : undefined,
    });

    return {
      edges: result.edges.map((edge) => ({
        cursor: edge.cursor,
        node: new ProductResolver(edge.nodeId, this.$ctx),
      })),
      pageInfo: result.pageInfo,
      totalCount: result.totalCount,
      facets: result.facets,
    };
  }

  async productsCount() {
    const result = await this.$ctx.kernel.runScript(QueryCollectionProductsScript, {
      collectionId: this.$props,
      locale: this.$ctx.locale ?? "uk",
      first: 1,
    });
    return result.totalCount;
  }
}

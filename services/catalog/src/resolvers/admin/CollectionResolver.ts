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
    const collection = await this.$preload();

    // Determine sort - use collection defaults if not specified
    const sortBy = args.sort?.by?.toLowerCase() ?? collection.defaultSort ?? "manual";
    const sortDirection = args.sort?.direction ?? collection.defaultSortDirection ?? "asc";

    // For manual collections in admin API, query directly from collection_item
    // This bypasses the search index which may not be synced yet in tests
    if (collection.type === "manual") {
      const items = await this.$ctx.kernel.getServices().repository.collectionItem.findByCollectionId(this.$props);
      const isBackwardPagination = args.last !== undefined && args.last !== null;
      const pageSize = Math.min((isBackwardPagination ? args.last : args.first) ?? 20, 100);

      console.log('[DEBUG CollectionResolver] items.length:', items.length, 'pageSize:', pageSize, 'isBackward:', isBackwardPagination, 'productIds:', items.map(i => i.productId.slice(0, 8)));

      // Get product data for sorting (need title for NAME sort, createdAt for NEWEST)
      const productIds = items.map((item) => item.productId);
      const products = await this.$ctx.kernel.getServices().repository.product.getByIds(productIds);
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Get translations for NAME sort
      let translationMap = new Map<string, { title: string }>();
      if (sortBy === "name") {
        const translations = await this.$ctx.kernel.getServices().repository.product.getTranslationsByProductIds(productIds);
        translationMap = new Map(translations.map((t) => [t.productId, { title: t.title }]));
      }

      // Create sorted items with product data
      type ItemWithData = { productId: string; lexoRank: string; title: string; createdAt: string };
      const itemsWithData: ItemWithData[] = items.map((item) => {
        const prod = productMap.get(item.productId);
        const translation = translationMap.get(item.productId);
        return {
          productId: item.productId,
          lexoRank: item.lexoRank,
          title: translation?.title ?? "",
          createdAt: prod?.createdAt ?? "",
        };
      });

      // Sort based on sort type
      itemsWithData.sort((a, b) => {
        let cmp = 0;
        if (sortBy === "name") {
          cmp = a.title.localeCompare(b.title); // A-Z ascending
        } else if (sortBy === "newest") {
          // For NEWEST: "asc" means oldest first, "desc" means newest first
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // Oldest first (ascending by date)
        } else {
          // Manual sort - use lexoRank
          cmp = a.lexoRank.localeCompare(b.lexoRank);
        }
        return sortDirection === "desc" ? -cmp : cmp;
      });

      // Apply cursor-based pagination
      let filtered = itemsWithData;
      const totalCount = itemsWithData.length;

      if (isBackwardPagination) {
        // Backward pagination: last N items before cursor
        if (args.before) {
          const beforeId = Buffer.from(args.before, "base64").toString("utf8");
          const beforeIndex = filtered.findIndex((item) => item.productId === beforeId);
          console.log('[DEBUG CollectionResolver] before cursor:', args.before, 'beforeId:', beforeId, 'beforeIndex:', beforeIndex);
          if (beforeIndex >= 0) {
            filtered = filtered.slice(0, beforeIndex);
          }
        }
        // Take last N items
        const startIndex = Math.max(0, filtered.length - pageSize);
        const hasPreviousPage = startIndex > 0;
        const visible = filtered.slice(startIndex);
        console.log('[DEBUG CollectionResolver] backward: filtered.length:', filtered.length, 'startIndex:', startIndex, 'hasPreviousPage:', hasPreviousPage, 'visible.length:', visible.length);

        return {
          edges: visible.map((item) => ({
            cursor: Buffer.from(item.productId).toString("base64"),
            node: new ProductResolver(item.productId, this.$ctx),
          })),
          pageInfo: {
            hasNextPage: Boolean(args.before),
            hasPreviousPage,
            startCursor: visible[0] ? Buffer.from(visible[0].productId).toString("base64") : null,
            endCursor: visible.length > 0 ? Buffer.from(visible[visible.length - 1].productId).toString("base64") : null,
          },
          totalCount,
          facets: null, // Facets not implemented for manual collections in admin API
        };
      }

      // Forward pagination: first N items after cursor
      if (args.after) {
        const afterId = Buffer.from(args.after, "base64").toString("utf8");
        const afterIndex = filtered.findIndex((item) => item.productId === afterId);
        if (afterIndex >= 0) {
          filtered = filtered.slice(afterIndex + 1);
        }
      }

      const pageItems = filtered.slice(0, pageSize + 1);
      const hasNextPage = pageItems.length > pageSize;
      const visible = hasNextPage ? pageItems.slice(0, pageSize) : pageItems;

      return {
        edges: visible.map((item) => ({
          cursor: Buffer.from(item.productId).toString("base64"),
          node: new ProductResolver(item.productId, this.$ctx),
        })),
        pageInfo: {
          hasNextPage,
          hasPreviousPage: Boolean(args.after),
          startCursor: visible[0] ? Buffer.from(visible[0].productId).toString("base64") : null,
          endCursor: visible.length > 0 ? Buffer.from(visible[visible.length - 1].productId).toString("base64") : null,
        },
        totalCount,
        facets: null, // Facets not implemented for manual collections in admin API
      };
    }

    // For rule collections, use the full query script
    const { priceMinMinor, priceMaxMinor } = resolvePriceBounds(args.filters);

    const result = await this.$ctx.kernel.runScript(QueryCollectionProductsScript, {
      collectionId: this.$props,
      locale: this.$ctx.locale ?? "uk",
      first: args.first ?? undefined,
      after: args.after ?? undefined,
      skipPublishCheck: true, // Admin API can query unpublished collections
      includeDrafts: true, // Admin API can see draft products
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
      sort: {
        by: sortBy as "manual" | "price" | "newest" | "name",
        direction: sortDirection as "asc" | "desc",
      },
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
    const collection = await this.$preload();
    // For manual collections, count directly from collection_item (bypasses publishedAt check)
    if (collection.type === "manual") {
      return this.$ctx.kernel.getServices().repository.collectionItem.countByCollectionId(this.$props);
    }
    // For rule collections, use the full query script
    const result = await this.$ctx.kernel.runScript(QueryCollectionProductsScript, {
      collectionId: this.$props,
      locale: this.$ctx.locale ?? "uk",
      first: 1,
      skipPublishCheck: true,
      includeDrafts: true,
    });
    return result.totalCount;
  }
}

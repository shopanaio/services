import { SubgraphReference } from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { Description } from "./interfaces/index.js";
import type { Category } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";
import { ProductResolver } from "./ProductResolver.js";
import { QueryCategoryProductsScript } from "../../scripts/category/QueryCategoryProductsScript.js";
import { SeoResolver } from "./SeoResolver.js";

interface ProductsArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

interface CategoryProductsArgs {
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

function resolvePriceBounds(filters: CategoryProductsArgs["filters"]): {
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

/**
 * Category resolver - resolves Category domain interface.
 * Decorated with @SubgraphReference for federation support.
 */
@SubgraphReference()
export class CategoryResolver extends CatalogType<string, Category> {
  async $preload() {
    const category = await this.$ctx.loaders.category.load(this.$props);
    if (!category) {
      throw new Error(`Category with ID ${this.$props} not found`);
    }
    return category;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Category);
  }

  async handle() {
    return this.$get("handle");
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

  async deletedAt() {
    return this.$get("deletedAt");
  }

  async depth() {
    return this.$get("depth");
  }

  async path() {
    return this.$get("path");
  }

  /**
   * Returns the translated name for this category
   */
  async name() {
    const translation = await this.$ctx.loaders.categoryTranslation.load(
      this.$props
    );
    return translation?.name ?? "";
  }

  async defaultSort() {
    const value = (await this.$get("defaultSort")) ?? "manual";
    return value.toUpperCase();
  }

  async defaultSortDirection() {
    const value = (await this.$get("defaultSortDirection")) ?? "asc";
    return value;
  }

  /**
   * Returns the translated description for this category
   */
  async description(): Promise<Description | null> {
    const translation = await this.$ctx.loaders.categoryTranslation.load(
      this.$props
    );
    if (!translation) return null;

    return {
      text: translation.descriptionText ?? "",
      html: translation.descriptionHtml ?? "",
      json: translation.descriptionJson ?? {},
    };
  }

  /**
   * Returns the parent category, if any
   */
  async parent(): Promise<CategoryResolver | null> {
    const parentId = await this.$get("parentId");
    if (!parentId) return null;
    return new CategoryResolver(parentId, this.$ctx);
  }

  /**
   * Returns direct child categories
   */
  async children(): Promise<CategoryResolver[]> {
    const ids = await this.$ctx.loaders.categoryChildrenIds.load(this.$props);
    return ids.map((id) => new CategoryResolver(id, this.$ctx));
  }

  /**
   * Returns all ancestor categories (from root to parent)
   */
  async ancestors(): Promise<CategoryResolver[]> {
    const ids = await this.$ctx.loaders.categoryAncestorIds.load(this.$props);
    return ids.map((id) => new CategoryResolver(id, this.$ctx));
  }

  /**
   * Returns media files associated with this category
   */
  async media() {
    const mediaItems = await this.$ctx.loaders.categoryMedia.load(this.$props);
    return mediaItems.map((m) => ({
      file: { __typename: "File" as const, id: m.fileId },
      sortIndex: m.sortIndex,
    }));
  }

  async seo() {
    const seoData = await this.$ctx.loaders.categorySeo.load(this.$props);
    if (!seoData) return null;
    return new SeoResolver(seoData, this.$ctx);
  }

  /**
   * Returns the count of products in this category
   */
  async productsCount(): Promise<number> {
    return this.$ctx.loaders.categoryProductsCount.load(this.$props);
  }

  /**
   * Returns products in this category with pagination
   */
  async products(args: ProductsArgs) {
    const first = args.first ?? 20;
    const productIds = await this.$ctx.kernel
      .getServices()
      .repository.category.getProductIdsByCategoryId(this.$props, { first: first + 1 });

    const hasNextPage = productIds.length > first;
    const resultIds = hasNextPage ? productIds.slice(0, first) : productIds;

    const edges = resultIds.map((id) => ({
      cursor: Buffer.from(id).toString("base64"),
      node: new ProductResolver(id, this.$ctx),
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: false,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
      },
      totalCount: await this.productsCount(),
    };
  }

  async categoryProducts(args: CategoryProductsArgs) {
    const { priceMinMinor, priceMaxMinor } = resolvePriceBounds(args.filters);
    const sortBy = args.sort?.by
      ? args.sort.by.toLowerCase()
      : undefined;
    const result = await this.$ctx.kernel.runScript(QueryCategoryProductsScript, {
      categoryId: this.$props,
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
      sort: sortBy
        ? {
            by: sortBy as "manual" | "price" | "newest" | "name",
            direction: (args.sort?.direction ?? undefined) as
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
}

import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { ApolloQuery } from "@shopana/type-resolver";
import { CatalogType } from "./CatalogType.js";
import { ProductResolver } from "./ProductResolver.js";

/**
 * Safely decode a global ID, returning null if invalid
 */
function safeDecodeGlobalId(
  globalId: string,
  expectedType: GlobalIdType
): string | null {
  try {
    return decodeGlobalIdByType(globalId, expectedType);
  } catch {
    return null;
  }
}
import {
  ProductConnectionResolver,
  type ProductConnectionInput,
} from "./ProductConnectionResolver.js";
import { VariantResolver } from "./VariantResolver.js";
import { CategoryResolver } from "./CategoryResolver.js";
import { TagResolver } from "./TagResolver.js";
import { CollectionResolver } from "./CollectionResolver.js";
import { FacetGroupResolver } from "./FacetGroupResolver.js";
import { FacetResolver } from "./FacetResolver.js";
import { FacetValueResolver } from "./FacetValueResolver.js";
import { FacetSwatchResolver } from "./FacetSwatchResolver.js";
import {
  CategoryConnectionResolver,
  type CategoryConnectionInput,
} from "./CategoryConnectionResolver.js";
import {
  TagConnectionResolver,
  type TagConnectionInput,
} from "./TagConnectionResolver.js";
import { ProductBulkUpdateJobResolver } from "./ProductBulkUpdateJobResolver.js";
import { PricingWidgetResolver, type PricingWidgetInput } from "./PricingWidgetResolver.js";
import type { VariantRelayInput } from "../../repositories/variant/VariantRepository.js";
import { QueryCategoryProductsScript } from "../../scripts/category/QueryCategoryProductsScript.js";
import { CollectionRulesPreviewCountScript } from "../../scripts/collection/CollectionRulesPreviewCountScript.js";

/**
 * Root Query resolver for Catalog Service.
 * Decorated with @ApolloQuery to create Apollo-compatible resolver proxy.
 */
@ApolloQuery
export class QueryResolver extends CatalogType<Record<string, never>> {
  /**
   * Entry point for catalog-related queries.
   * Returns namespace resolver that handles all catalog queries.
   */
  catalogQuery() {
    return new CatalogQueryResolver({}, this.$ctx);
  }

  /**
   * Entry point for widget-related queries.
   */
  widgetQuery() {
    return new WidgetQueryResolver({}, this.$ctx);
  }
}

/**
 * Widget query resolver for pricing.
 */
export class WidgetQueryResolver extends CatalogType<Record<string, never>> {
  pricing(args: { input: PricingWidgetInput }) {
    return new PricingWidgetResolver(
      {
        variantId: args.input.variantId,
        currency: args.input.currency as "UAH" | "USD" | "EUR",
        from: args.input.from,
        to: args.input.to,
        first: args.input.first,
        after: args.input.after,
      },
      this.$ctx
    );
  }
}

/**
 * CatalogQuery namespace resolver.
 * Handles all catalog-related queries (products, variants).
 * Does NOT contain inventory queries (warehouses, stock).
 */
export class CatalogQueryResolver extends CatalogType<Record<string, never>> {
  // ---- Node Queries (Relay) ----

  /**
   * Get a node by ID (for Relay compatibility).
   */
  node(args: { id: string }) {
    return new ProductResolver(args.id, this.$ctx);
  }

  /**
   * Get multiple nodes by IDs (for Relay compatibility).
   */
  nodes(args: { ids: string[] }) {
    return args.ids.map((id) => new ProductResolver(id, this.$ctx));
  }

  // ---- Product Queries ----

  /**
   * Get a single product by ID.
   * Returns null if product doesn't exist.
   */
  async product(args: { id: string }) {
    const product = await this.$ctx.loaders.product.load(args.id);
    if (!product) {
      return null;
    }
    return new ProductResolver(args.id, this.$ctx);
  }

  /**
   * Get a paginated list of products.
   */
  products(args: ProductConnectionInput) {
    return new ProductConnectionResolver(args, this.$ctx);
  }

  // ---- Variant Queries ----

  /**
   * Get a single variant by ID.
   */
  variant(args: { id: string }) {
    return new VariantResolver(args.id, this.$ctx);
  }

  /**
   * Get a paginated list of variants.
   */
  async variants(args: VariantRelayInput) {
    const services = this.$ctx.kernel.getServices();
    const first = args.first ?? 10;

    const variants = await services.repository.variant.getMany({
      limit: first + 1,
    });

    const hasNextPage = variants.length > first;
    const resultVariants = hasNextPage ? variants.slice(0, first) : variants;

    const edges = resultVariants.map((variant) => ({
      node: new VariantResolver(variant.id, this.$ctx),
      cursor: Buffer.from(variant.id).toString("base64"),
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: false,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
      },
      totalCount: resultVariants.length,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Warehouse Queries REMOVED (moved to Inventory Service)
  // - warehouse(id)
  // - warehouses(...)
  // ═══════════════════════════════════════════════════════════

  // ---- Category Queries ----

  /**
   * Get a single category by ID.
   * Returns null if category doesn't exist.
   */
  async category(args: { id: string }) {
    const cat = await this.$ctx.loaders.category.load(args.id);
    if (!cat) {
      return null;
    }
    return new CategoryResolver(args.id, this.$ctx);
  }

  /**
   * Get a paginated list of categories.
   */
  categories(args: CategoryConnectionInput) {
    return new CategoryConnectionResolver(args, this.$ctx);
  }

  async categoryProducts(args: {
    categoryId: string;
    first?: number;
    after?: string;
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
    sort?: { by: "MANUAL" | "PRICE" | "NEWEST" | "NAME"; direction?: "asc" | "desc" | null } | null;
  }) {
    let priceMinMinor: number | undefined;
    let priceMaxMinor: number | undefined;

    for (const range of args.filters?.ranges ?? []) {
      if (range.facetSlug !== "price") continue;
      if (range.min !== undefined && range.min !== null) {
        const parsed = Number(range.min);
        if (!Number.isNaN(parsed)) {
          priceMinMinor =
            priceMinMinor === undefined
              ? parsed
              : Math.max(priceMinMinor, parsed);
        }
      }
      if (range.max !== undefined && range.max !== null) {
        const parsed = Number(range.max);
        if (!Number.isNaN(parsed)) {
          priceMaxMinor =
            priceMaxMinor === undefined
              ? parsed
              : Math.min(priceMaxMinor, parsed);
        }
      }
    }

    if (args.filters?.priceMinMinor !== undefined && args.filters.priceMinMinor !== null) {
      const parsed = Number(args.filters.priceMinMinor);
      if (!Number.isNaN(parsed)) {
        priceMinMinor =
          priceMinMinor === undefined ? parsed : Math.max(priceMinMinor, parsed);
      }
    }

    if (args.filters?.priceMaxMinor !== undefined && args.filters.priceMaxMinor !== null) {
      const parsed = Number(args.filters.priceMaxMinor);
      if (!Number.isNaN(parsed)) {
        priceMaxMinor =
          priceMaxMinor === undefined ? parsed : Math.min(priceMaxMinor, parsed);
      }
    }

    const result = await this.$ctx.kernel.runScript(QueryCategoryProductsScript, {
      categoryId: args.categoryId,
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

  async facetGroup(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.FacetGroup);
    if (!id) return null;
    const group = await this.$ctx.kernel.repository.facetGroup.findById(id);
    if (!group) return null;
    return new FacetGroupResolver(group.id, this.$ctx);
  }

  async facetGroups() {
    const groups = await this.$ctx.kernel.repository.facetGroup.findAll();
    return groups.map((group) => new FacetGroupResolver(group.id, this.$ctx));
  }

  async facet(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.Facet);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.facet.findById(id);
    if (!item) return null;
    return new FacetResolver(item.id, this.$ctx);
  }

  async facets() {
    const facets = await this.$ctx.kernel.repository.facet.findAll();
    return facets.map((item) => new FacetResolver(item.id, this.$ctx));
  }

  async facetValue(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.FacetValue);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.facetValue.findById(id);
    if (!item) return null;
    return new FacetValueResolver(item.id, this.$ctx);
  }

  async facetValues(args: { facetId: string }) {
    const facetId = safeDecodeGlobalId(args.facetId, GlobalIdEntity.Facet);
    if (!facetId) return [];
    const values = await this.$ctx.kernel.repository.facetValue.findByFacetId(
      facetId
    );
    return values.map((item) => new FacetValueResolver(item.id, this.$ctx));
  }

  async facetSwatch(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.FacetSwatch);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.facetSwatch.findById(id);
    if (!item) return null;
    return new FacetSwatchResolver(item.id, this.$ctx);
  }

  async facetSwatches() {
    const items = await this.$ctx.kernel.repository.facetSwatch.findAll();
    return items.map((item) => new FacetSwatchResolver(item.id, this.$ctx));
  }

  async collection(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.Collection);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.collection.findById(id);
    if (!item) return null;
    return new CollectionResolver(item.id, this.$ctx);
  }

  async collectionByHandle(args: { handle: string }) {
    const item = await this.$ctx.kernel.repository.collection.findByHandle(args.handle);
    if (!item) return null;
    return new CollectionResolver(item.id, this.$ctx);
  }

  async collections(args: { first?: number; after?: string }) {
    const first = args.first ?? 20;
    const rows = await this.$ctx.kernel.repository.collection.findAll();
    let working = rows;

    if (args.after) {
      const id = Buffer.from(args.after, "base64").toString("utf8");
      const index = working.findIndex((item) => item.id === id);
      if (index >= 0) {
        working = working.slice(index + 1);
      }
    }

    const pageRows = working.slice(0, first + 1);
    const hasNextPage = pageRows.length > first;
    const visible = hasNextPage ? pageRows.slice(0, first) : pageRows;
    const edges = visible.map((item) => ({
      cursor: Buffer.from(item.id).toString("base64"),
      node: new CollectionResolver(item.id, this.$ctx),
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: Boolean(args.after),
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
      },
      totalCount: rows.length,
    };
  }

  async collectionRulesPreviewCount(args: {
    rules: Array<{ field: string; operator: string; value: unknown }>;
  }) {
    const result = await this.$ctx.kernel.runScript(CollectionRulesPreviewCountScript, {
      rules: args.rules,
    });
    return result.count;
  }

  // ---- Tag Queries ----

  /**
   * Get a single tag by ID.
   * Returns null if tag doesn't exist.
   */
  async tag(args: { id: string }) {
    const t = await this.$ctx.loaders.tag.load(args.id);
    if (!t) {
      return null;
    }
    return new TagResolver(args.id, this.$ctx);
  }

  /**
   * Get a paginated list of tags.
   */
  tags(args: TagConnectionInput) {
    return new TagConnectionResolver(args, this.$ctx);
  }

  /**
   * Get a bulk update job by ID.
   */
  async productBulkUpdateJob(args: { jobId: string }) {
    const job = await this.$ctx.kernel.repository.bulkEditJob.findById(
      args.jobId
    );
    if (!job) return null;
    return new ProductBulkUpdateJobResolver(job.id, this.$ctx);
  }
}

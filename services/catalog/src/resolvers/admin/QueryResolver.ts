import { ApolloQuery } from "@shopana/type-resolver";
import { CatalogType } from "./CatalogType.js";
import { ProductResolver } from "./ProductResolver.js";
import {
  ProductConnectionResolver,
  type ProductConnectionInput,
} from "./ProductConnectionResolver.js";
import { VariantResolver } from "./VariantResolver.js";
import { CategoryResolver } from "./CategoryResolver.js";
import { TagResolver } from "./TagResolver.js";
import {
  CategoryConnectionResolver,
  type CategoryConnectionInput,
} from "./CategoryConnectionResolver.js";
import {
  TagConnectionResolver,
  type TagConnectionInput,
} from "./TagConnectionResolver.js";
import { ProductBulkUpdateJobResolver } from "./ProductBulkUpdateJobResolver.js";
import { PricingWidgetResolver } from "./PricingWidgetResolver.js";
import type { VariantRelayInput } from "../../repositories/variant/VariantRepository.js";

/**
 * Root Query resolver для Catalog Service.
 * Decorated with @ApolloQuery to create Apollo-compatible resolver proxy.
 */
@ApolloQuery
export class QueryResolver extends CatalogType<Record<string, never>> {
  /**
   * Entry point for catalog-related queries.
   * Returns namespace resolver that handles all catalog queries.
   */
  inventoryQuery() {
    return new InventoryQueryResolver({}, this.$ctx);
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
  pricing(args: { input: { variantId: string; currency: string } }) {
    return new PricingWidgetResolver(
      {
        variantId: args.input.variantId,
        currency: args.input.currency as "UAH" | "USD" | "EUR",
      },
      this.$ctx
    );
  }
}

/**
 * CatalogQuery namespace resolver.
 * Handles all catalog-related queries (products, variants).
 * НЕ содержит inventory queries (warehouses, stock).
 */
export class InventoryQueryResolver extends CatalogType<Record<string, never>> {
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
  // Warehouse Queries УДАЛЕНЫ (переносятся в Inventory Service)
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

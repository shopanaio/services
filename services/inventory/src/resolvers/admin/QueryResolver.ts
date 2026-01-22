import { ApolloQuery } from "@shopana/type-resolver";
import { InventoryType } from "./InventoryType.js";
import { ProductResolver } from "./ProductResolver.js";
import {
  ProductConnectionResolver,
  type ProductConnectionInput,
} from "./ProductConnectionResolver.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import {
  WarehouseConnectionResolver,
  type WarehouseConnectionResolverInput,
} from "./WarehouseConnectionResolver.js";
import { VariantResolver } from "./VariantResolver.js";
import { WidgetQueryResolver } from "./InventoryWidgetResolver.js";
import type { VariantRelayInput } from "../../repositories/variant/VariantRepository.js";

/**
 * Root Query resolver.
 * Decorated with @ApolloQuery to create Apollo-compatible resolver proxy.
 */
@ApolloQuery
export class QueryResolver extends InventoryType<Record<string, never>> {
  /**
   * Entry point for inventory-related queries.
   * Returns namespace resolver that handles all inventory queries.
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
 * InventoryQuery namespace resolver.
 * Handles all inventory-related queries.
 */
export class InventoryQueryResolver extends InventoryType<Record<string, never>> {
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

  // ---- Warehouse Queries ----

  /**
   * Get a single warehouse by ID.
   * Returns null if warehouse doesn't exist.
   */
  async warehouse(args: { id: string }) {
    const warehouse = await this.$ctx.loaders.warehouse.load(args.id);
    if (!warehouse) {
      return null;
    }
    return new WarehouseResolver(args.id, this.$ctx);
  }

  /**
   * Get a paginated list of warehouses.
   */
  warehouses(args: WarehouseConnectionResolverInput) {
    return new WarehouseConnectionResolver(args, this.$ctx);
  }

}

import { decodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { ApolloQuery } from "@shopana/type-resolver";
import { InventoryType } from "./InventoryType.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import { InventoryItemResolver } from "./InventoryItemResolver.js";
import { WidgetQueryResolver } from "./InventoryWidgetResolver.js";
import {
  WarehouseConnectionResolver,
  type WarehouseConnectionResolverInput,
} from "./WarehouseConnectionResolver.js";
import { normalizeWarehouseWhereInput } from "./filter-normalizers.js";

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
   * Entry point for widget queries.
   */
  widgetQuery() {
    return new WidgetQueryResolver({}, this.$ctx);
  }
}

/**
 * InventoryQuery namespace resolver.
 * Handles all inventory-related queries.
 *
 * After the service split:
 * - Product/Variant queries are in Catalog service
 * - This service handles Warehouse, Stock, and InventoryItem queries
 */
export class InventoryQueryResolver extends InventoryType<Record<string, never>> {
  // ---- Node Queries (Relay) ----

  /**
   * Get a node by ID (for Relay compatibility).
   * Supports Warehouse and InventoryItem nodes.
   */
  async node(args: { id: string }) {
    // Try to decode and load as Warehouse
    try {
      const warehouseId = decodeGlobalIdByType(
        args.id,
        GlobalIdEntity.Warehouse,
      );
      const warehouse = await this.$ctx.loaders.warehouse.load(warehouseId);
      if (warehouse) {
        return new WarehouseResolver(warehouseId, this.$ctx);
      }
    } catch {
      // Not a Warehouse ID
    }

    // Try to decode as InventoryItem
    try {
      const inventoryItemId = decodeGlobalIdByType(args.id, GlobalIdEntity.InventoryItem);
      const item = await this.$ctx.kernel.repository.inventoryItem.findById(inventoryItemId);
      if (item) {
        return new InventoryItemResolver(item.id, this.$ctx);
      }
    } catch {
      // Not an InventoryItem ID
    }

    return null;
  }

  /**
   * Get multiple nodes by IDs (for Relay compatibility).
   */
  async nodes(args: { ids: string[] }) {
    return Promise.all(args.ids.map((id) => this.node({ id })));
  }

  // ---- Warehouse Queries ----

  /**
   * Get a single warehouse by ID.
   * Returns null if warehouse doesn't exist.
   */
  async warehouse(args: { id: string }) {
    const warehouseId = decodeGlobalIdByType(args.id, GlobalIdEntity.Warehouse);
    const warehouse = await this.$ctx.loaders.warehouse.load(warehouseId);
    if (!warehouse) {
      return null;
    }
    return new WarehouseResolver(warehouseId, this.$ctx);
  }

  /**
   * Get a paginated list of warehouses.
   */
  warehouses(args: WarehouseConnectionResolverInput) {
    return new WarehouseConnectionResolver(
      {
        ...args,
        where: normalizeWarehouseWhereInput(args.where),
      },
      this.$ctx,
    );
  }

  // ---- InventoryItem Queries ----

  /**
   * Get an inventory item by ID.
   */
  async inventoryItem(args: { id: string }) {
    const itemId = decodeGlobalIdByType(args.id, GlobalIdEntity.InventoryItem);
    const item = await this.$ctx.kernel.repository.inventoryItem.findById(itemId);
    if (!item) return null;
    return new InventoryItemResolver(item.id, this.$ctx);
  }

  /**
   * Get an inventory item by variant ID.
   * Creates one if it doesn't exist (lazy creation).
   */
  async inventoryItemByVariant(args: { variantId: string }) {
    const variantUuid = decodeGlobalIdByType(args.variantId, GlobalIdEntity.Variant);
    const item = await this.$ctx.kernel.repository.inventoryItem.upsertByVariantId(variantUuid, {});
    return new InventoryItemResolver(item.id, this.$ctx);
  }

  /**
   * Get inventory items with pagination.
   */
  async inventoryItems(args: {
    first?: number;
    after?: string;
    where?: { sku?: { _eq?: string; _contains?: string; _startsWith?: string }; trackInventory?: boolean };
  }) {
    // TODO: Implement proper pagination with cursor
    // For now, return a simple list
    const first = args.first ?? 20;

    // This is a simplified implementation
    // A full implementation would use cursor-based pagination
    return {
      edges: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
      totalCount: 0,
    };
  }
}

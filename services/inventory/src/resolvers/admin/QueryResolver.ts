import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ApolloQuery } from "@shopana/type-resolver";
import { GraphQLError } from "graphql";
import { InventoryType } from "./InventoryType.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import { InventoryItemResolver } from "./InventoryItemResolver.js";
import { StockResolver } from "./StockResolver.js";
import { WidgetQueryResolver } from "./InventoryWidgetResolver.js";
import {
  WarehouseConnectionResolver,
  type WarehouseConnectionResolverInput,
} from "./WarehouseConnectionResolver.js";
import {
  InventoryItemConnectionResolver,
  type InventoryItemConnectionResolverInput,
} from "./InventoryItemConnectionResolver.js";
import { normalizeWarehouseWhereInput } from "./filter-normalizers.js";
import type { NormalizedInventoryItemWarehouseScope } from "../../repositories/inventory-item/InventoryItemRepository.js";

type InventoryItemWarehouseScopeArgs = {
  referenceIds?: string[] | null;
  mode?: "INCLUDE" | "EXCLUDE" | null;
};

type InventoryItemInventoryItemsMetaArgs = {
  warehouseScope?: InventoryItemWarehouseScopeArgs | null;
};

type InventoryItemsArgs = Omit<
  InventoryItemConnectionResolverInput,
  "meta"
> & {
  meta?: InventoryItemInventoryItemsMetaArgs | null;
};

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
   * Supports Warehouse, InventoryItem, and WarehouseStock nodes.
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
      const item = await this.$ctx.loaders.inventoryItem.load(inventoryItemId);
      if (item) {
        return new InventoryItemResolver(item.id, this.$ctx);
      }
    } catch {
      // Not an InventoryItem ID
    }

    // Try to decode as WarehouseStock
    try {
      const stockId = decodeGlobalIdByType(args.id, GlobalIdEntity.WarehouseStock);
      const stock = await this.$ctx.kernel.repository.stock.findById(stockId);
      if (stock) {
        return new StockResolver(stock.id, this.$ctx);
      }
    } catch {
      // Not a WarehouseStock ID
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
    const item = await this.$ctx.loaders.inventoryItem.load(itemId);
    if (!item) return null;
    return new InventoryItemResolver(item.id, this.$ctx);
  }

  /**
   * Get an inventory item by variant ID.
   */
  async inventoryItemByVariant(args: { variantId: string }) {
    const variantUuid = decodeGlobalIdByType(args.variantId, GlobalIdEntity.Variant);
    const item = await this.$ctx.loaders.inventoryItemByVariant.load(variantUuid);
    if (!item) return null;
    return new InventoryItemResolver(item.id, this.$ctx);
  }

  /**
   * Get inventory items with pagination.
   */
  async inventoryItems(args: InventoryItemsArgs) {
    const warehouseScope = await this.normalizeInventoryItemWarehouseScopeInput(
      args.meta?.warehouseScope,
    );

    if (warehouseScope.kind === "invalid") {
      throw new GraphQLError(warehouseScope.message, {
        extensions: { code: warehouseScope.code },
      });
    }

    return new InventoryItemConnectionResolver(
      {
        ...args,
        meta: { warehouseScope },
      } as InventoryItemConnectionResolverInput,
      this.$ctx,
    );
  }

  private async normalizeInventoryItemWarehouseScopeInput(
    input: InventoryItemWarehouseScopeArgs | null | undefined,
  ): Promise<NormalizedInventoryItemWarehouseScope> {
    if (!input) {
      return { kind: "all" };
    }

    if (input.mode !== "INCLUDE") {
      return {
        kind: "invalid",
        code: "UNSUPPORTED_INVENTORY_ITEM_WAREHOUSE_SCOPE",
        message: "Only warehouseScope mode INCLUDE is supported for inventoryItems.",
      };
    }

    const referenceIds = input.referenceIds ?? [];
    if (referenceIds.length !== 1) {
      return {
        kind: "invalid",
        code: "UNSUPPORTED_INVENTORY_ITEM_WAREHOUSE_SCOPE",
        message: "inventoryItems supports exactly one warehouseScope referenceId.",
      };
    }

    let warehouseId: string;
    try {
      warehouseId = decodeGlobalIdByType(
        referenceIds[0],
        GlobalIdEntity.Warehouse,
      );
    } catch {
      return { kind: "empty" };
    }

    const warehouse = await this.$ctx.kernel.repository.warehouse.findById(
      warehouseId,
    );
    if (!warehouse) {
      return { kind: "empty" };
    }

    return { kind: "warehouse", warehouseId };
  }
}

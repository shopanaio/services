import { InventoryType } from "./InventoryType.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import {
  WarehouseConnectionResolver,
  type WarehouseConnectionResolverInput,
} from "./WarehouseConnectionResolver.js";

/**
 * WarehouseQuery namespace resolver.
 * Handles all warehouse-related queries.
 */
export class WarehouseQueryResolver extends InventoryType<Record<string, never>> {
  /**
   * Get a single warehouse by ID.
   */
  warehouse(args: { id: string }) {
    return new WarehouseResolver(args.id, this.ctx);
  }

  /**
   * Get a paginated list of warehouses.
   */
  warehouses(args: WarehouseConnectionResolverInput) {
    return new WarehouseConnectionResolver(args, this.ctx);
  }
}

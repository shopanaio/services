import type { InventoryQueryWarehousesArgs } from "../../api/graphql-admin/generated/types.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import {
  BaseConnectionResolver,
  BaseEdgeResolver,
  type ConnectionData,
} from "./BaseConnectionResolver.js";

// ============ EdgeResolver ============

export class WarehouseEdgeResolver extends BaseEdgeResolver {
  static fields = {
    node: () => WarehouseResolver,
  };
}

// ============ ConnectionResolver ============

/**
 * WarehouseConnection view - resolves paginated warehouse list
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class WarehouseConnectionResolver extends BaseConnectionResolver<InventoryQueryWarehousesArgs> {
  static fields = {
    edges: () => WarehouseEdgeResolver,
  };

  async loadData(): Promise<ConnectionData> {
    return this.ctx.kernel
      .getServices()
      .repository.warehouse.getConnection(this.value);
  }
}

import type { PageInfo } from "@shopana/drizzle-query";
import { BaseType } from "@shopana/type-executor";
import type { InventoryContext } from "../../context/types.js";
import { WarehouseView } from "./WarehouseView.js";

// ============ Types ============

interface WarehouseConnectionArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

interface WarehouseEdgeData {
  cursor: string;
  nodeId: string;
}

interface WarehouseConnectionData {
  edges: WarehouseEdgeData[];
  pageInfo: PageInfo;
}

// ============ EdgeView ============

export class WarehouseEdgeView extends BaseType<
  WarehouseEdgeData,
  WarehouseEdgeData,
  InventoryContext
> {
  static fields = {
    node: () => WarehouseView,
  };

  cursor() {
    return this.value.cursor;
  }

  node() {
    return this.value.nodeId;
  }
}

// ============ ConnectionView ============

/**
 * WarehouseConnection view - resolves paginated warehouse list
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class WarehouseConnectionView extends BaseType<
  WarehouseConnectionArgs,
  WarehouseConnectionData,
  InventoryContext
> {
  static fields = {
    edges: () => WarehouseEdgeView,
  };

  async loadData(): Promise<WarehouseConnectionData> {
    return this.ctx.queries.warehouseConnection(this.value);
  }

  async edges() {
    return this.get("edges");
  }

  async pageInfo() {
    return this.get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return 0;
  }
}

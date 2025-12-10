import type { PageInfo } from "@shopana/drizzle-query";
import { BaseType } from "@shopana/type-executor";
import type { ServiceContext } from "../../context/types.js";
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
  totalCount: number;
}

// ============ EdgeView ============

export class WarehouseEdgeView extends BaseType<
  WarehouseEdgeData,
  WarehouseEdgeData,
  ServiceContext
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
  ServiceContext
> {
  static fields = {
    edges: () => WarehouseEdgeView,
  };

  async loadData(): Promise<WarehouseConnectionData> {
    const services = this.ctx.kernel.getServices();
    return services.repository.warehouse.getConnection(this.value);
  }

  async edges() {
    return this.get("edges");
  }

  async pageInfo() {
    return this.get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return this.get("totalCount");
  }
}

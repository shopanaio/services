import { type PageInfo } from "@shopana/drizzle-query";
import { BaseType } from "@shopana/type-executor";
import type { InventoryQueryWarehousesArgs } from "../../api/graphql-admin/generated/types.js";
import type { ServiceContext } from "../../context/types.js";
import type { WarehouseRelayInput } from "../../repositories/warehouse/WarehouseRepository.js";
import { WarehouseView } from "./WarehouseView.js";

// ============ Types ============

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
  InventoryQueryWarehousesArgs,
  WarehouseConnectionData,
  ServiceContext
> {
  static fields = {
    edges: () => WarehouseEdgeView,
  };

  async loadData(): Promise<WarehouseConnectionData> {
    // Map GraphQL args (orderBy) to internal API (order)
    const { orderBy, ...rest } = this.value;
    const input: WarehouseRelayInput = {
      ...rest,
      order: orderBy,
    };
    return this.ctx.kernel
      .getServices()
      .repository.warehouse.getConnection(input);
  }

  async edges() {
    return this.get("edges");
  }

  async pageInfo() {
    return this.get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return (await this.get("totalCount")) ?? 0;
  }
}

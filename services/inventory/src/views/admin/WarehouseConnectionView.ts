import {
  createQuery,
  createRelayQuery,
  type PageInfo,
} from "@shopana/drizzle-query";
import { BaseType } from "@shopana/type-executor";
import type { InventoryContext } from "../../context/types.js";
import { warehouses } from "../../repositories/models/index.js";
import { WarehouseView } from "./WarehouseView.js";

// RelayQuery - selects only id for cursor-based pagination
const warehouseRelayQuery = createRelayQuery(
  createQuery(warehouses).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "warehouse", tieBreaker: "id" }
);

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
    const result = await warehouseRelayQuery.execute(this.ctx.connection, {
      ...this.value,
      where: { projectId: this.ctx.project.id },
      order: ["createdAt:desc"],
    });

    return {
      edges: result.edges.map((edge) => ({
        cursor: edge.cursor,
        nodeId: edge.node.id,
      })),
      pageInfo: result.pageInfo,
    };
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

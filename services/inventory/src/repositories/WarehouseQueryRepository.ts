import { createQuery, createRelayQuery, type PageInfo } from "@shopana/drizzle-query";
import { BaseRepository } from "./BaseRepository.js";
import { warehouses } from "./models/index.js";
import type { PaginationArgs } from "../views/admin/args.js";

const warehouseRelayQuery = createRelayQuery(
  createQuery(warehouses).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "warehouse", tieBreaker: "id" }
);

export interface WarehouseConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
}

export class WarehouseQueryRepository extends BaseRepository {
  async getConnection(args: PaginationArgs): Promise<WarehouseConnectionResult> {
    const result = await warehouseRelayQuery.execute(this.connection, {
      ...args,
      where: { projectId: this.projectId },
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
}

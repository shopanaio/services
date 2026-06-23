import { and, eq, inArray } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type PageInfo,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import { vendor, type Vendor } from "../models/index.js";
import { decodeVendorGlobalId } from "../global-id-where-mappers.js";

export const vendorRelayQuery = createRelayQuery(
  createQuery(vendor)
    .include(["id"])
    .mapWhereFields({
      id: decodeVendorGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "vendor", tieBreaker: "id" }
);

export type VendorRelayInput = InferRelayInput<typeof vendorRelayQuery>;

export interface VendorConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class VendorRepository extends BaseRepository {
  async findById(id: string): Promise<Vendor | null> {
    const result = await this.connection
      .select()
      .from(vendor)
      .where(and(eq(vendor.projectId, this.storeId), eq(vendor.id, id)))
      .limit(1);

    return result[0] ?? null;
  }

  async getConnection(
    args: VendorRelayInput
  ): Promise<VendorConnectionResult> {
    const { where, orderBy, ...paginationArgs } = args;

    const mergedWhere: VendorRelayInput["where"] = {
      _and: [
        { projectId: { _eq: this.storeId } },
        ...(where ? [where] : []),
      ],
    };

    const executeInput: VendorRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "name", direction: "asc" },
        { field: "id", direction: "asc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      vendorRelayQuery.execute(this.connection, executeInput),
      vendorRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);

    return {
      edges: result.edges.map((edge) => ({
        cursor: edge.cursor,
        nodeId: edge.node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  async getByIds(vendorIds: readonly string[]): Promise<Vendor[]> {
    if (vendorIds.length === 0) {
      return [];
    }

    return this.connection
      .select()
      .from(vendor)
      .where(
        and(
          eq(vendor.projectId, this.storeId),
          inArray(vendor.id, [...vendorIds])
        )
      );
  }
}

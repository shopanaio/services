import { and, eq, inArray } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type PageInfo,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import { vendor, type NewVendor, type Vendor } from "../models/index.js";
import { decodeVendorGlobalId } from "../global-id-where-mappers.js";

export const vendorRelayQuery = createRelayQuery(
  createQuery(vendor)
    .include(["id"])
    .mapWhereFields({
      id: decodeVendorGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "vendor", tieBreaker: "id" },
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
      .where(and(eq(vendor.storeId, this.storeId), eq(vendor.id, id)))
      .limit(1);

    return result[0] ?? null;
  }

  async findByName(name: string): Promise<Vendor | null> {
    const result = await this.connection
      .select()
      .from(vendor)
      .where(and(eq(vendor.storeId, this.storeId), eq(vendor.name, name)))
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: { name: string }): Promise<Vendor> {
    const newVendor: NewVendor = {
      storeId: this.storeId,
      id: await this.generateUuidV7(),
      name: data.name,
    };

    const result = await this.connection.insert(vendor).values(newVendor).returning();

    return result[0];
  }

  async update(id: string, data: { name: string }): Promise<Vendor | null> {
    const result = await this.connection
      .update(vendor)
      .set(data)
      .where(and(eq(vendor.storeId, this.storeId), eq(vendor.id, id)))
      .returning();

    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(vendor)
      .where(and(eq(vendor.storeId, this.storeId), eq(vendor.id, id)))
      .returning({ id: vendor.id });

    return result.length === 1;
  }

  async getConnection(args: VendorRelayInput): Promise<VendorConnectionResult> {
    const { where, orderBy, ...paginationArgs } = args;

    const mergedWhere: VendorRelayInput["where"] = {
      _and: [{ storeId: { _eq: this.storeId } }, ...(where ? [where] : [])],
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
      .where(and(eq(vendor.storeId, this.storeId), inArray(vendor.id, [...vendorIds])));
  }
}

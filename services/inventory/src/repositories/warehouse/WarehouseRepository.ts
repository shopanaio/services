import { and, eq, inArray, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  createQuery,
  createRelayQuery,
  type PageInfo,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import { warehouses, type Warehouse, type NewWarehouse } from "../models/index.js";

export const warehouseRelayQuery = createRelayQuery(
  createQuery(warehouses).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "warehouse", tieBreaker: "id" }
);

export type WarehouseRelayInput = InferRelayInput<typeof warehouseRelayQuery>;

export interface WarehouseConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class WarehouseRepository extends BaseRepository {
  // ============ CRUD ============

  async exists(id: string): Promise<boolean> {
    const result = await this.connection
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(and(eq(warehouses.projectId, this.storeId), eq(warehouses.id, id)))
      .limit(1);

    return result.length > 0;
  }

  async findById(id: string): Promise<Warehouse | null> {
    const result = await this.connection
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.projectId, this.storeId), eq(warehouses.id, id)))
      .limit(1);

    return result[0] ?? null;
  }

  async getAll(limit?: number): Promise<Warehouse[]> {
    const query = this.connection
      .select()
      .from(warehouses)
      .where(eq(warehouses.projectId, this.storeId))
      .orderBy(warehouses.createdAt);

    if (limit) {
      return query.limit(limit);
    }

    return query;
  }

  async count(): Promise<number> {
    const result = await this.connection
      .select({ count: count() })
      .from(warehouses)
      .where(eq(warehouses.projectId, this.storeId));

    return result[0]?.count ?? 0;
  }

  async findByCode(code: string): Promise<Warehouse | null> {
    const result = await this.connection
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.projectId, this.storeId), eq(warehouses.code, code)))
      .limit(1);

    return result[0] ?? null;
  }

  async clearDefault(): Promise<void> {
    await this.connection
      .update(warehouses)
      .set({ isDefault: false, updatedAt: new Date().toISOString() })
      .where(
        and(eq(warehouses.projectId, this.storeId), eq(warehouses.isDefault, true))
      );
  }

  async create(data: { code: string; name: string; isDefault?: boolean }): Promise<Warehouse> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const newWarehouse: NewWarehouse = {
      projectId: this.storeId,
      id,
      code: data.code,
      name: data.name,
      isDefault: data.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.connection
      .insert(warehouses)
      .values(newWarehouse)
      .returning();

    return result[0];
  }

  async update(
    id: string,
    data: { code?: string; name?: string; isDefault?: boolean }
  ): Promise<Warehouse | null> {
    const updateData: Partial<NewWarehouse> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    const result = await this.connection
      .update(warehouses)
      .set(updateData)
      .where(and(eq(warehouses.projectId, this.storeId), eq(warehouses.id, id)))
      .returning();

    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(warehouses)
      .where(and(eq(warehouses.projectId, this.storeId), eq(warehouses.id, id)))
      .returning({ id: warehouses.id });

    return result.length > 0;
  }

  // ============ Query ============

  async getConnection(args: WarehouseRelayInput): Promise<WarehouseConnectionResult> {
    const { where, orderBy, ...paginationArgs } = args;

    // Merge user-provided where with projectId filter
    const mergedWhere: WarehouseRelayInput["where"] = {
      _and: [
        { projectId: { _eq: this.storeId } },
        ...(where ? [where] : []),
      ],
    };

    const executeInput: WarehouseRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: orderBy ?? [{ field: "createdAt", direction: "desc" }],
    };

    const [result, totalCount] = await Promise.all([
      warehouseRelayQuery.execute(this.connection, executeInput),
      warehouseRelayQuery.count(this.connection, { where: mergedWhere }),
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

  // ============ Loader ============

  async getByIds(warehouseIds: readonly string[]): Promise<Warehouse[]> {
    const result = await this.connection
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.projectId, this.storeId),
          inArray(warehouses.id, [...warehouseIds])
        )
      );

    return result;
  }
}

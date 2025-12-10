import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createQuery, createRelayQuery, type PageInfo } from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import { warehouses, type Warehouse, type NewWarehouse } from "../models/index.js";
import type { PaginationArgs } from "../../views/admin/args.js";

const warehouseRelayQuery = createRelayQuery(
  createQuery(warehouses).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "warehouse", tieBreaker: "id" }
);

export interface WarehouseConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
}

export class WarehouseRepository extends BaseRepository {
  // ============ CRUD ============

  async exists(id: string): Promise<boolean> {
    const result = await this.connection
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(and(eq(warehouses.projectId, this.projectId), eq(warehouses.id, id)))
      .limit(1);

    return result.length > 0;
  }

  async findById(id: string): Promise<Warehouse | null> {
    const result = await this.connection
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.projectId, this.projectId), eq(warehouses.id, id)))
      .limit(1);

    return result[0] ?? null;
  }

  async getAll(limit?: number): Promise<Warehouse[]> {
    const query = this.connection
      .select()
      .from(warehouses)
      .where(eq(warehouses.projectId, this.projectId))
      .orderBy(warehouses.createdAt);

    if (limit) {
      return query.limit(limit);
    }

    return query;
  }

  async findByCode(code: string): Promise<Warehouse | null> {
    const result = await this.connection
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.projectId, this.projectId), eq(warehouses.code, code)))
      .limit(1);

    return result[0] ?? null;
  }

  async clearDefault(): Promise<void> {
    await this.connection
      .update(warehouses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(eq(warehouses.projectId, this.projectId), eq(warehouses.isDefault, true))
      );
  }

  async create(data: { code: string; name: string; isDefault?: boolean }): Promise<Warehouse> {
    const id = randomUUID();
    const now = new Date();

    const newWarehouse: NewWarehouse = {
      projectId: this.projectId,
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
      updatedAt: new Date(),
    };

    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    const result = await this.connection
      .update(warehouses)
      .set(updateData)
      .where(and(eq(warehouses.projectId, this.projectId), eq(warehouses.id, id)))
      .returning();

    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(warehouses)
      .where(and(eq(warehouses.projectId, this.projectId), eq(warehouses.id, id)))
      .returning({ id: warehouses.id });

    return result.length > 0;
  }

  // ============ Query ============

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

  // ============ Loader ============

  async getByIds(warehouseIds: readonly string[]): Promise<Warehouse[]> {
    return this.connection
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.projectId, this.projectId),
          inArray(warehouses.id, [...warehouseIds])
        )
      );
  }
}

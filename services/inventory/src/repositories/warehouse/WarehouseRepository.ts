import { and, eq, inArray, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  createQuery,
  createRelayQuery,
  type PageInfo,
  type GraphQLWhereInput,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import { warehouses, type Warehouse, type NewWarehouse } from "../models/index.js";
import type { PaginationArgs } from "../../views/admin/args.js";

const warehouseRelayQuery = createRelayQuery(
  createQuery(warehouses).include(["id"]).maxLimit(100).defaultLimit(20),
  { name: "warehouse", tieBreaker: "id" }
);

type WarehouseRelayInput = InferRelayInput<typeof warehouseRelayQuery>;

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

  async count(): Promise<number> {
    const result = await this.connection
      .select({ count: count() })
      .from(warehouses)
      .where(eq(warehouses.projectId, this.projectId));

    return result[0]?.count ?? 0;
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

    console.log("[WarehouseRepository.create] Starting with data:", JSON.stringify(data));
    console.log("[WarehouseRepository.create] Generated id:", id);
    console.log("[WarehouseRepository.create] projectId:", this.projectId);

    const newWarehouse: NewWarehouse = {
      projectId: this.projectId,
      id,
      code: data.code,
      name: data.name,
      isDefault: data.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };

    console.log("[WarehouseRepository.create] newWarehouse object:", JSON.stringify(newWarehouse));
    console.log("[WarehouseRepository.create] connection exists:", !!this.connection);

    const result = await this.connection
      .insert(warehouses)
      .values(newWarehouse)
      .returning();

    console.log("[WarehouseRepository.create] Insert result:", JSON.stringify(result));
    console.log("[WarehouseRepository.create] result[0]:", JSON.stringify(result[0]));

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

  async getConnection(args: PaginationArgs & {
    where?: GraphQLWhereInput;
    order?: string[];
  }): Promise<WarehouseConnectionResult> {
    const { where, order, ...paginationArgs } = args;

    // Merge user-provided where with projectId filter
    const mergedWhere: GraphQLWhereInput = {
      $and: [
        { projectId: { $eq: this.projectId } },
        ...(where ? [where] : []),
      ],
    };

    const executeInput: WarehouseRelayInput = {
      ...paginationArgs,
      where: mergedWhere as WarehouseRelayInput["where"],
      order: (order ?? ["createdAt:desc"]) as WarehouseRelayInput["order"],
    };

    const [result, totalCount] = await Promise.all([
      warehouseRelayQuery.execute(this.connection, executeInput),
      this.count(),
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
    console.log("[WarehouseRepository.getByIds] warehouseIds:", warehouseIds);
    console.log("[WarehouseRepository.getByIds] projectId:", this.projectId);

    const result = await this.connection
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.projectId, this.projectId),
          inArray(warehouses.id, [...warehouseIds])
        )
      );

    console.log("[WarehouseRepository.getByIds] Query result:", JSON.stringify(result));
    return result;
  }
}

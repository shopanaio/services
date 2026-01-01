import { and, eq, inArray, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  createQuery,
  createRelayQuery,
  type PageInfo,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import { warehouseStock, type WarehouseStock, type NewWarehouseStock } from "../models";

export const stockRelayQuery = createRelayQuery(
  createQuery(warehouseStock).include(["id", "warehouseId", "variantId"]).maxLimit(100).defaultLimit(20),
  { name: "stock", tieBreaker: "id" }
);

export type StockRelayInput = InferRelayInput<typeof stockRelayQuery>;

export interface StockConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export class StockRepository extends BaseRepository {
  /**
   * Upsert stock for a variant in a warehouse
   * Creates or updates the quantity on hand
   */
  async upsert(
    variantId: string,
    warehouseId: string,
    quantity: number
  ): Promise<WarehouseStock> {
    const now = new Date();

    const result = await this.connection
      .insert(warehouseStock)
      .values({
        projectId: this.storeId,
        id: randomUUID(),
        variantId,
        warehouseId,
        quantityOnHand: quantity,
        createdAt: now,
        updatedAt: now,
      } satisfies NewWarehouseStock)
      .onConflictDoUpdate({
        target: [warehouseStock.projectId, warehouseStock.warehouseId, warehouseStock.variantId],
        set: {
          quantityOnHand: quantity,
          updatedAt: now,
        },
      })
      .returning();

    return result[0];
  }

  /**
   * Get stock by variant ID
   */
  async getByVariantId(variantId: string): Promise<WarehouseStock[]> {
    return await this.connection
      .select()
      .from(warehouseStock)
      .where(
        and(
          eq(warehouseStock.projectId, this.storeId),
          eq(warehouseStock.variantId, variantId)
        )
      );
  }

  /**
   * Batch get stock for multiple variants
   * Returns a Map where key is variantId and value is array of WarehouseStock
   */
  async getByVariantsBatch(variantIds: string[]): Promise<Map<string, WarehouseStock[]>> {
    if (variantIds.length === 0) {
      return new Map();
    }

    const stocks = await this.connection
      .select()
      .from(warehouseStock)
      .where(
        and(
          eq(warehouseStock.projectId, this.storeId),
          inArray(warehouseStock.variantId, variantIds)
        )
      );

    const result = new Map<string, WarehouseStock[]>();

    // Initialize all requested variant IDs with empty arrays
    for (const id of variantIds) {
      result.set(id, []);
    }

    // Group stocks by variant ID
    for (const stock of stocks) {
      const existing = result.get(stock.variantId) ?? [];
      existing.push(stock);
      result.set(stock.variantId, existing);
    }

    return result;
  }

  /**
   * Delete all stock entries for a variant
   */
  async deleteByVariantId(variantId: string): Promise<number> {
    const result = await this.connection
      .delete(warehouseStock)
      .where(
        and(
          eq(warehouseStock.projectId, this.storeId),
          eq(warehouseStock.variantId, variantId)
        )
      )
      .returning({ id: warehouseStock.id });

    return result.length;
  }

  /**
   * Delete stock entry for a specific variant-warehouse combination
   */
  async delete(variantId: string, warehouseId: string): Promise<boolean> {
    const result = await this.connection
      .delete(warehouseStock)
      .where(
        and(
          eq(warehouseStock.projectId, this.storeId),
          eq(warehouseStock.variantId, variantId),
          eq(warehouseStock.warehouseId, warehouseId)
        )
      )
      .returning({ id: warehouseStock.id });

    return result.length > 0;
  }

  /**
   * Get stock by ID
   */
  async findById(id: string): Promise<WarehouseStock | null> {
    const result = await this.connection
      .select()
      .from(warehouseStock)
      .where(
        and(
          eq(warehouseStock.projectId, this.storeId),
          eq(warehouseStock.id, id)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Count stock entries matching the where filter
   */
  async countByFilter(warehouseId?: string): Promise<number> {
    const conditions = [eq(warehouseStock.projectId, this.storeId)];
    if (warehouseId) {
      conditions.push(eq(warehouseStock.warehouseId, warehouseId));
    }

    const result = await this.connection
      .select({ count: count() })
      .from(warehouseStock)
      .where(and(...conditions));

    return result[0]?.count ?? 0;
  }

  /**
   * Get stock connection with cursor-based pagination
   */
  async getConnection(args: StockRelayInput): Promise<StockConnectionResult> {
    const { where, orderBy, ...paginationArgs } = args;

    const mergedWhere: StockRelayInput["where"] = {
      _and: [
        { projectId: { _eq: this.storeId } },
        ...(where ? [where] : []),
      ],
    };

    const executeInput: StockRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: orderBy ?? [{ field: "createdAt", direction: "desc" }],
    };

    // TODO: Implement totalCount in @shopana/drizzle-query createRelayQuery
    // so we don't need a separate count query in each repository
    // Extract warehouseId from where filter for count query
    const warehouseIdFilter = where?._and?.find(
      (condition): condition is { warehouseId: { _eq: string } } =>
        typeof condition === "object" &&
        condition !== null &&
        "warehouseId" in condition
    );
    const warehouseId = warehouseIdFilter?.warehouseId?._eq;

    const [result, totalCount] = await Promise.all([
      stockRelayQuery.execute(this.connection, executeInput),
      this.countByFilter(warehouseId),
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

  /**
   * Get stock by IDs (for DataLoader)
   */
  async getByIds(stockIds: readonly string[]): Promise<WarehouseStock[]> {
    if (stockIds.length === 0) {
      return [];
    }

    return await this.connection
      .select()
      .from(warehouseStock)
      .where(
        and(
          eq(warehouseStock.projectId, this.storeId),
          inArray(warehouseStock.id, [...stockIds])
        )
      );
  }
}

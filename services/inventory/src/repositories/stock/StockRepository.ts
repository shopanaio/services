import { and, eq, inArray, count } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import {
  createQuery,
  createRelayQuery,
  type PageInfo,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  warehouseStock,
  stockChanges,
  type WarehouseStock,
  type NewWarehouseStock,
  type NewStockChange,
} from "../models";

export const stockRelayQuery = createRelayQuery(
  createQuery(warehouseStock)
    .include(["id", "warehouseId", "variantId"])
    .maxLimit(100)
    .defaultLimit(20),
  { name: "stock", tieBreaker: "id" },
);

export type StockRelayInput = InferRelayInput<typeof stockRelayQuery>;

export interface StockConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export type StockChangeStatus = "APPLIED" | "REJECTED" | "DUPLICATE";

export interface ApplyStockChangeInput {
  variantId: string;
  warehouseId: string;
  deltaOnHand: number;
  deltaReserved?: number;
  deltaUnavailable?: number;
  movementType:
    | "SEED"
    | "RECEIVE"
    | "SELL"
    | "RETURN"
    | "ADJUST"
    | "RESERVE"
    | "RELEASE"
    | "TRANSFER";
  reason?: "DAMAGE" | "INVENTORY_COUNT" | "MANUAL" | "CUSTOMER_RETURN" | null;
  transferDirection?: "IN" | "OUT" | null;
  sourceSystem: string;
  sourceEventId: string;
  correlationId?: string | null;
  note?: string | null;
  createdBy?: string | null;
}

export interface ApplyStockChangeResult {
  status: StockChangeStatus;
  changeId?: string | null;
}

export class StockRepository extends BaseRepository {
  /**
   * Upsert stock for a variant in a warehouse
   * Creates or updates the quantity on hand
   */
  async upsert(
    variantId: string,
    warehouseId: string,
    quantity: number,
  ): Promise<WarehouseStock> {
    const now = new Date();

    const result = await this.connection
      .insert(warehouseStock)
      .values({
        projectId: this.storeId,
        id: uuidv7(),
        variantId,
        warehouseId,
        quantityOnHand: quantity,
        createdAt: now,
        updatedAt: now,
      } satisfies NewWarehouseStock)
      .onConflictDoUpdate({
        target: [
          warehouseStock.projectId,
          warehouseStock.warehouseId,
          warehouseStock.variantId,
        ],
        set: {
          quantityOnHand: quantity,
          updatedAt: now,
        },
      })
      .returning();

    return result[0];
  }

  /**
   * Get stock by variant + warehouse
   */
  async findByVariantWarehouse(
    variantId: string,
    warehouseId: string,
  ): Promise<WarehouseStock | null> {
    const result = await this.connection
      .select()
      .from(warehouseStock)
      .where(
        and(
          eq(warehouseStock.projectId, this.storeId),
          eq(warehouseStock.variantId, variantId),
          eq(warehouseStock.warehouseId, warehouseId),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Apply a stock change with idempotency and constraints.
   */
  async applyStockChange(
    input: ApplyStockChangeInput,
  ): Promise<ApplyStockChangeResult> {
    const deltaReserved = input.deltaReserved ?? 0;
    const deltaUnavailable = input.deltaUnavailable ?? 0;

    return await this.connection.transaction(async (tx) => {
      // 1. Check for duplicate (idempotency)
      const [existing] = await tx
        .select({ id: stockChanges.id })
        .from(stockChanges)
        .where(
          and(
            eq(stockChanges.projectId, this.storeId),
            eq(stockChanges.sourceSystem, input.sourceSystem),
            eq(stockChanges.sourceEventId, input.sourceEventId),
            eq(stockChanges.warehouseId, input.warehouseId),
            eq(stockChanges.variantId, input.variantId),
          ),
        )
        .limit(1);

      if (existing) {
        return { status: "DUPLICATE" as const, changeId: existing.id };
      }

      // 2. Get current stock with row lock
      const currentStock = await tx
        .select({
          quantityOnHand: warehouseStock.quantityOnHand,
          reservedQty: warehouseStock.reservedQty,
          unavailableQty: warehouseStock.unavailableQty,
        })
        .from(warehouseStock)
        .where(
          and(
            eq(warehouseStock.projectId, this.storeId),
            eq(warehouseStock.warehouseId, input.warehouseId),
            eq(warehouseStock.variantId, input.variantId),
          ),
        )
        .limit(1)
        .for("update");

      const current = currentStock[0] ?? {
        quantityOnHand: 0,
        reservedQty: 0,
        unavailableQty: 0,
      };

      // 3. Calculate new values
      const newOnHand = current.quantityOnHand + input.deltaOnHand;
      const newReserved = current.reservedQty + deltaReserved;
      const newUnavailable = current.unavailableQty + deltaUnavailable;

      // 4. Check constraints
      const constraintsValid =
        newOnHand >= 0 &&
        newReserved >= 0 &&
        newUnavailable >= 0 &&
        newUnavailable <= newOnHand;

      // 5. Insert stock change record
      const changeId = uuidv7();
      await tx.insert(stockChanges).values({
        id: changeId,
        projectId: this.storeId,
        warehouseId: input.warehouseId,
        variantId: input.variantId,
        deltaOnHand: input.deltaOnHand,
        deltaReserved: deltaReserved,
        deltaUnavailable: deltaUnavailable,
        movementType: input.movementType,
        reason: input.reason,
        transferDirection: input.transferDirection,
        sourceSystem: input.sourceSystem,
        sourceEventId: input.sourceEventId,
        correlationId: input.correlationId,
        note: input.note,
        createdBy: input.createdBy,
        onHandAfter: constraintsValid ? newOnHand : current.quantityOnHand,
        reservedAfter: constraintsValid ? newReserved : current.reservedQty,
        unavailableAfter: constraintsValid
          ? newUnavailable
          : current.unavailableQty,
        applyStatus: constraintsValid ? "APPLIED" : "REJECTED",
      } satisfies NewStockChange);

      // 6. Update stock if constraints are valid
      if (constraintsValid) {
        const now = new Date();
        if (currentStock.length === 0) {
          // Insert new stock record
          await tx.insert(warehouseStock).values({
            id: uuidv7(),
            projectId: this.storeId,
            warehouseId: input.warehouseId,
            variantId: input.variantId,
            quantityOnHand: newOnHand,
            reservedQty: newReserved,
            unavailableQty: newUnavailable,
            createdAt: now,
            updatedAt: now,
          } satisfies NewWarehouseStock);
        } else {
          // Update existing stock
          await tx
            .update(warehouseStock)
            .set({
              quantityOnHand: newOnHand,
              reservedQty: newReserved,
              unavailableQty: newUnavailable,
              updatedAt: now,
            })
            .where(
              and(
                eq(warehouseStock.projectId, this.storeId),
                eq(warehouseStock.warehouseId, input.warehouseId),
                eq(warehouseStock.variantId, input.variantId),
              ),
            );
        }
        return { status: "APPLIED" as const, changeId };
      }

      return { status: "REJECTED" as const, changeId };
    });
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
          eq(warehouseStock.variantId, variantId),
        ),
      );
  }

  /**
   * Batch get stock for multiple variants
   * Returns a Map where key is variantId and value is array of WarehouseStock
   */
  async getByVariantsBatch(
    variantIds: string[],
  ): Promise<Map<string, WarehouseStock[]>> {
    if (variantIds.length === 0) {
      return new Map();
    }

    const stocks = await this.connection
      .select()
      .from(warehouseStock)
      .where(
        and(
          eq(warehouseStock.projectId, this.storeId),
          inArray(warehouseStock.variantId, variantIds),
        ),
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
          eq(warehouseStock.variantId, variantId),
        ),
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
          eq(warehouseStock.warehouseId, warehouseId),
        ),
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
          eq(warehouseStock.id, id),
        ),
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
      _and: [{ projectId: { _eq: this.storeId } }, ...(where ? [where] : [])],
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
        "warehouseId" in condition,
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
          inArray(warehouseStock.id, [...stockIds]),
        ),
      );
  }
}

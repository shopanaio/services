import { and, eq, inArray, count, sql } from "drizzle-orm";
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
  type WarehouseStock,
  type NewWarehouseStock,
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
    const result = await this.connection.execute<{
      status: StockChangeStatus | null;
      id: string | null;
    }>(sql`
      WITH ins AS (
        INSERT INTO inventory.stock_changes (
          project_id, warehouse_id, variant_id,
          delta_on_hand, delta_reserved, delta_unavailable,
          movement_type, reason, transfer_direction,
          source_system, source_event_id, correlation_id, note, created_by,
          on_hand_after, reserved_after, unavailable_after
        )
        SELECT
          ${this.storeId}, ${input.warehouseId}, ${input.variantId},
          ${input.deltaOnHand}, ${deltaReserved}, ${deltaUnavailable},
          ${input.movementType}, ${input.reason ?? null}, ${input.transferDirection ?? null},
          ${input.sourceSystem}, ${input.sourceEventId}, ${input.correlationId ?? null}, ${input.note ?? null}, ${input.createdBy ?? null},
          0, 0, 0
        ON CONFLICT (project_id, source_system, source_event_id, warehouse_id, variant_id)
        DO NOTHING
        RETURNING id
      ),
      existing AS (
        SELECT id
        FROM inventory.stock_changes
        WHERE project_id = ${this.storeId}
          AND source_system = ${input.sourceSystem}
          AND source_event_id = ${input.sourceEventId}
          AND warehouse_id = ${input.warehouseId}
          AND variant_id = ${input.variantId}
      ),
      up AS (
        INSERT INTO inventory.warehouse_stock (
          id, project_id, warehouse_id, variant_id,
          quantity_on_hand, reserved_qty, unavailable_qty
        )
        SELECT
          ${uuidv7()}, ${this.storeId}, ${input.warehouseId}, ${input.variantId},
          ${input.deltaOnHand}, ${deltaReserved}, ${deltaUnavailable}
        FROM ins
        WHERE
          ${input.deltaOnHand} >= 0
          AND ${deltaReserved} >= 0
          AND ${deltaUnavailable} >= 0
          AND ${deltaUnavailable} <= ${input.deltaOnHand}
        ON CONFLICT (project_id, warehouse_id, variant_id) DO UPDATE SET
          quantity_on_hand = inventory.warehouse_stock.quantity_on_hand + ${input.deltaOnHand},
          reserved_qty = inventory.warehouse_stock.reserved_qty + ${deltaReserved},
          unavailable_qty = inventory.warehouse_stock.unavailable_qty + ${deltaUnavailable},
          updated_at = NOW()
        WHERE
          EXISTS (SELECT 1 FROM ins)
          AND (inventory.warehouse_stock.quantity_on_hand + ${input.deltaOnHand}) >= 0
          AND (inventory.warehouse_stock.reserved_qty + ${deltaReserved}) >= 0
          AND (inventory.warehouse_stock.unavailable_qty + ${deltaUnavailable}) >= 0
          AND (inventory.warehouse_stock.unavailable_qty + ${deltaUnavailable})
              <= (inventory.warehouse_stock.quantity_on_hand + ${input.deltaOnHand})
        RETURNING quantity_on_hand, reserved_qty, unavailable_qty
      ),
      fix AS (
        UPDATE inventory.stock_changes sc
        SET
          on_hand_after = up.quantity_on_hand,
          reserved_after = up.reserved_qty,
          unavailable_after = up.unavailable_qty
        FROM ins, up
        WHERE sc.id = ins.id
        RETURNING sc.*
      ),
      reject AS (
        UPDATE inventory.stock_changes sc
        SET
          on_hand_after = COALESCE(ws.quantity_on_hand, 0),
          reserved_after = COALESCE(ws.reserved_qty, 0),
          unavailable_after = COALESCE(ws.unavailable_qty, 0),
          apply_status = 'REJECTED'
        FROM ins
        LEFT JOIN inventory.warehouse_stock ws
          ON ws.project_id = ${this.storeId}
         AND ws.warehouse_id = ${input.warehouseId}
         AND ws.variant_id = ${input.variantId}
        WHERE sc.id = ins.id
          AND NOT EXISTS (SELECT 1 FROM fix)
        RETURNING sc.*
      ),
      result AS (
        SELECT 'APPLIED' as status, id FROM fix
        UNION ALL
        SELECT 'REJECTED' as status, id FROM reject
        UNION ALL
        SELECT 'DUPLICATE' as status, id
        FROM existing
        WHERE NOT EXISTS (SELECT 1 FROM fix)
          AND NOT EXISTS (SELECT 1 FROM reject)
      )
      SELECT
        r.status as status,
        sc.id as id
      FROM (SELECT 1) x
      LEFT JOIN result r ON true
      LEFT JOIN inventory.stock_changes sc ON sc.id = r.id
    `);

    const row = result[0];
    return {
      status: row?.status ?? "REJECTED",
      changeId: row?.id ?? null,
    };
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

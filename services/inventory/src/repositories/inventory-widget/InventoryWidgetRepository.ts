import { sql, eq, and, isNull, inArray, gte, sum } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  productInventorySettings,
  warehouseStock,
  stockChanges,
  inboundSupply,
} from "../models/index.js";
import { catalogVariant as variant } from "../models/catalog-refs.js";

export type ThresholdMethod = "SAFETY_STOCK" | "REORDER_POINT";

export interface InventoryQuantities {
  availableForSale: number;
  onHand: number;
  reserved: number;
  unavailable: number;
}

export interface InventorySkuStatusMetric {
  count: number;
  averageDays: number | null;
}

export interface InventorySkuStatus {
  total: number;
  lowStock: InventorySkuStatusMetric;
  outOfStock: InventorySkuStatusMetric;
  backorder: InventorySkuStatusMetric;
}

export interface InventoryBackorder {
  quantity: number;
  etaAvgDays: number | null;
}

export interface InventoryAlertThreshold {
  method: ThresholdMethod;
  minimumStock: number;
}

export interface ProductInventoryWidgetData {
  quantities: InventoryQuantities;
  availableChange7d: number;
  skuStatus: InventorySkuStatus;
  backorder: InventoryBackorder;
  alertThreshold: InventoryAlertThreshold;
}

const DEFAULT_ALERT_THRESHOLD: InventoryAlertThreshold = {
  method: "SAFETY_STOCK",
  minimumStock: 10,
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

/**
 * Repository for inventory widget data aggregation.
 *
 * Provides aggregated inventory metrics for the product inventory widget:
 * - Stock quantities (available, on-hand, reserved, unavailable)
 * - 7-day availability change
 * - SKU status metrics (low stock, out of stock, backorder)
 * - Alert thresholds
 *
 * Note: Uses variant table as a reference for joining with inventory data.
 * Variant is owned by Catalog service but referenced here for aggregation queries.
 */
export class InventoryWidgetRepository extends BaseRepository {
  async getWidget(productId: string): Promise<ProductInventoryWidgetData> {
    const alertThreshold = await this.getAlertThreshold(productId);

    const [quantities, availableChange7d, skuStatus, etaAvgDays] =
      await Promise.all([
        this.getQuantities(productId),
        this.getAvailableChange7d(productId),
        this.getSkuStatus(productId, alertThreshold.minimumStock),
        this.getBackorderEtaAvgDays(productId),
      ]);

    const backorderQuantity = Math.max(0, -quantities.availableForSale);

    return {
      quantities,
      availableChange7d,
      skuStatus,
      backorder: {
        quantity: backorderQuantity,
        etaAvgDays,
      },
      alertThreshold,
    };
  }

  private async getAlertThreshold(
    productId: string
  ): Promise<InventoryAlertThreshold> {
    const result = await this.connection
      .select({
        method: productInventorySettings.alertThresholdMethod,
        minimumStock: productInventorySettings.alertMinimumStock,
      })
      .from(productInventorySettings)
      .where(
        and(
          eq(productInventorySettings.projectId, this.storeId),
          eq(productInventorySettings.productId, productId)
        )
      )
      .limit(1);

    const row = result[0];

    if (!row) {
      return DEFAULT_ALERT_THRESHOLD;
    }

    const method = (row.method ?? DEFAULT_ALERT_THRESHOLD.method) as ThresholdMethod;
    const minimumStock = toNumber(row.minimumStock, DEFAULT_ALERT_THRESHOLD.minimumStock);

    return { method, minimumStock };
  }

  private async getQuantities(productId: string): Promise<InventoryQuantities> {
    const result = await this.connection
      .select({
        onHand: sql<number>`COALESCE(${sum(warehouseStock.quantityOnHand)}, 0)`,
        reserved: sql<number>`COALESCE(${sum(warehouseStock.reservedQty)}, 0)`,
        unavailable: sql<number>`COALESCE(${sum(warehouseStock.unavailableQty)}, 0)`,
        availableForSale: sql<number>`COALESCE(SUM(${warehouseStock.quantityOnHand} - ${warehouseStock.reservedQty} - ${warehouseStock.unavailableQty}), 0)`,
      })
      .from(warehouseStock)
      .innerJoin(variant, eq(variant.id, warehouseStock.variantId))
      .where(
        and(
          eq(warehouseStock.projectId, this.storeId),
          eq(variant.projectId, this.storeId),
          eq(variant.productId, productId),
          isNull(variant.deletedAt)
        )
      );

    const row = result[0];

    return {
      onHand: toNumber(row?.onHand),
      reserved: toNumber(row?.reserved),
      unavailable: toNumber(row?.unavailable),
      availableForSale: toNumber(row?.availableForSale),
    };
  }

  private async getAvailableChange7d(productId: string): Promise<number> {
    const productVariants = this.connection.$with("product_variants").as(
      this.connection
        .select({ id: variant.id })
        .from(variant)
        .where(
          and(
            eq(variant.projectId, this.storeId),
            eq(variant.productId, productId),
            isNull(variant.deletedAt)
          )
        )
    );

    const result = await this.connection
      .with(productVariants)
      .select({
        availableChange: sql<number>`COALESCE(SUM(${stockChanges.deltaOnHand} - ${stockChanges.deltaReserved} - ${stockChanges.deltaUnavailable}), 0)`,
      })
      .from(stockChanges)
      .where(
        and(
          eq(stockChanges.projectId, this.storeId),
          inArray(stockChanges.variantId, this.connection.select({ id: productVariants.id }).from(productVariants)),
          eq(stockChanges.applyStatus, "APPLIED"),
          gte(stockChanges.createdAt, sql`NOW() - INTERVAL '7 days'`)
        )
      );

    return toNumber(result[0]?.availableChange);
  }

  private async getBackorderEtaAvgDays(
    productId: string
  ): Promise<number | null> {
    const productVariants = this.connection.$with("product_variants").as(
      this.connection
        .select({ id: variant.id })
        .from(variant)
        .where(
          and(
            eq(variant.projectId, this.storeId),
            eq(variant.productId, productId),
            isNull(variant.deletedAt)
          )
        )
    );

    // Weighted average ETA: sum(seconds_until_eta * remaining_qty) / sum(remaining_qty) / 86400
    const result = await this.connection
      .with(productVariants)
      .select({
        etaAvgDays: sql<number | null>`
          SUM(EXTRACT(EPOCH FROM (${inboundSupply.expectedAt} - NOW())) * (${inboundSupply.qtyExpected} - ${inboundSupply.qtyReceived}))
          / NULLIF(SUM(${inboundSupply.qtyExpected} - ${inboundSupply.qtyReceived}), 0) / 86400
        `,
      })
      .from(inboundSupply)
      .innerJoin(productVariants, eq(productVariants.id, inboundSupply.variantId))
      .where(
        and(
          eq(inboundSupply.projectId, this.storeId),
          inArray(inboundSupply.status, ["PLANNED", "IN_TRANSIT"]),
          sql`(${inboundSupply.qtyExpected} - ${inboundSupply.qtyReceived}) > 0`,
          gte(inboundSupply.expectedAt, sql`NOW()`)
        )
      );

    return toNumberOrNull(result[0]?.etaAvgDays);
  }

  /**
   * Get SKU status metrics with out-of-stock and backorder analysis.
   * Uses raw SQL due to:
   * - LAG() window function for detecting OOS transitions
   * - COUNT/AVG with FILTER clause for conditional aggregates
   */
  private async getSkuStatus(
    productId: string,
    lowStockThreshold: number
  ): Promise<InventorySkuStatus> {
    // Column references for type safety in raw SQL
    const v = variant;
    const ws = warehouseStock;
    const sc = stockChanges;
    const s = inboundSupply;

    const result = await this.connection.execute<{
      total: number | null;
      low_stock_count: number | null;
      out_of_stock_count: number | null;
      out_of_stock_avg_days: number | null;
      backorder_count: number | null;
      backorder_avg_days: number | null;
    }>(sql`
      WITH product_variants AS (
        SELECT ${v.id}
        FROM ${v}
        WHERE ${v.projectId} = ${this.storeId}
          AND ${v.productId} = ${productId}
          AND ${v.deletedAt} IS NULL
      ),
      variant_stock AS (
        SELECT
          pv.id,
          COALESCE(SUM(${ws.quantityOnHand} - ${ws.reservedQty} - ${ws.unavailableQty}), 0) as available
        FROM product_variants pv
        LEFT JOIN ${ws}
          ON ${ws.variantId} = pv.id
         AND ${ws.projectId} = ${this.storeId}
        GROUP BY pv.id
      ),
      warehouse_available AS (
        SELECT
          ${ws.variantId} as variant_id,
          ${ws.warehouseId} as warehouse_id,
          (${ws.quantityOnHand} - ${ws.reservedQty} - ${ws.unavailableQty}) as available
        FROM ${ws}
        WHERE ${ws.projectId} = ${this.storeId}
          AND ${ws.variantId} IN (SELECT id FROM product_variants)
      ),
      warehouse_oos AS (
        SELECT
          sc_inner.variant_id,
          sc_inner.warehouse_id,
          MAX(sc_inner.created_at) as out_of_stock_since
        FROM (
          SELECT
            ${sc.variantId} as variant_id,
            ${sc.warehouseId} as warehouse_id,
            ${sc.createdAt} as created_at,
            (${sc.onHandAfter} - ${sc.reservedAfter} - ${sc.unavailableAfter}) as available_after,
            LAG(${sc.onHandAfter} - ${sc.reservedAfter} - ${sc.unavailableAfter})
              OVER (PARTITION BY ${sc.variantId}, ${sc.warehouseId} ORDER BY ${sc.createdAt}, ${sc.seq}) as prev_available
          FROM ${sc}
          WHERE ${sc.projectId} = ${this.storeId}
            AND ${sc.variantId} IN (SELECT id FROM product_variants)
            AND ${sc.applyStatus} = 'APPLIED'
        ) sc_inner
        WHERE sc_inner.available_after <= 0
          AND (sc_inner.prev_available IS NULL OR sc_inner.prev_available > 0)
        GROUP BY sc_inner.variant_id, sc_inner.warehouse_id
      ),
      warehouse_oos_fallback AS (
        SELECT
          wa.variant_id,
          wa.warehouse_id,
          ${ws.updatedAt} as out_of_stock_since
        FROM warehouse_available wa
        JOIN ${ws}
          ON ${ws.variantId} = wa.variant_id
         AND ${ws.warehouseId} = wa.warehouse_id
         AND ${ws.projectId} = ${this.storeId}
        WHERE wa.available <= 0
          AND NOT EXISTS (
            SELECT 1
            FROM warehouse_oos wo
            WHERE wo.variant_id = wa.variant_id
              AND wo.warehouse_id = wa.warehouse_id
          )
      ),
      variant_oos AS (
        SELECT
          wa.variant_id,
          MIN(COALESCE(wo.out_of_stock_since, wof.out_of_stock_since)) as out_of_stock_since
        FROM warehouse_available wa
        LEFT JOIN warehouse_oos wo
          ON wo.variant_id = wa.variant_id AND wo.warehouse_id = wa.warehouse_id
        LEFT JOIN warehouse_oos_fallback wof
          ON wof.variant_id = wa.variant_id AND wof.warehouse_id = wa.warehouse_id
        WHERE wa.available <= 0
        GROUP BY wa.variant_id
      ),
      variant_backorder_eta AS (
        SELECT
          pv.id,
          MIN(${s.expectedAt}) as backorder_expected_at
        FROM product_variants pv
        LEFT JOIN ${s}
          ON ${s.variantId} = pv.id
         AND ${s.projectId} = ${this.storeId}
         AND ${s.status} IN ('PLANNED', 'IN_TRANSIT')
        GROUP BY pv.id
      )
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE available > 0 AND available < ${lowStockThreshold}) as low_stock_count,
        COUNT(*) FILTER (WHERE available <= 0 AND backorder_expected_at IS NULL) as out_of_stock_count,
        AVG(EXTRACT(DAY FROM NOW() - vo.out_of_stock_since))
          FILTER (WHERE available <= 0 AND backorder_expected_at IS NULL) as out_of_stock_avg_days,
        COUNT(*) FILTER (WHERE available <= 0 AND backorder_expected_at IS NOT NULL) as backorder_count,
        AVG(EXTRACT(DAY FROM backorder_expected_at - NOW()))
          FILTER (WHERE available <= 0 AND backorder_expected_at IS NOT NULL) as backorder_avg_days
      FROM variant_stock
      LEFT JOIN variant_backorder_eta USING (id)
      LEFT JOIN variant_oos vo ON vo.variant_id = variant_stock.id
    `);

    const row = result[0];

    return {
      total: toNumber(row?.total),
      lowStock: {
        count: toNumber(row?.low_stock_count),
        averageDays: null,
      },
      outOfStock: {
        count: toNumber(row?.out_of_stock_count),
        averageDays: toNumberOrNull(row?.out_of_stock_avg_days),
      },
      backorder: {
        count: toNumber(row?.backorder_count),
        averageDays: toNumberOrNull(row?.backorder_avg_days),
      },
    };
  }
}

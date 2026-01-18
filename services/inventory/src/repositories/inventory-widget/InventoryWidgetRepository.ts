import { sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";

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
    const result = await this.connection.execute<{
      method: string | null;
      minimum_stock: number | null;
    }>(sql`
      SELECT
        alert_threshold_method as method,
        alert_minimum_stock as minimum_stock
      FROM inventory.product_inventory_settings
      WHERE project_id = ${this.storeId}
        AND product_id = ${productId}
      LIMIT 1
    `);

    const row = result[0];

    if (!row) {
      return DEFAULT_ALERT_THRESHOLD;
    }

    const method = (row.method ?? DEFAULT_ALERT_THRESHOLD.method) as ThresholdMethod;
    const minimumStock = toNumber(row.minimum_stock, DEFAULT_ALERT_THRESHOLD.minimumStock);

    return { method, minimumStock };
  }

  private async getQuantities(productId: string): Promise<InventoryQuantities> {
    const result = await this.connection.execute<{
      on_hand: number | null;
      reserved: number | null;
      unavailable: number | null;
      available_for_sale: number | null;
    }>(sql`
      SELECT
        COALESCE(SUM(ws.quantity_on_hand), 0) as on_hand,
        COALESCE(SUM(ws.reserved_qty), 0) as reserved,
        COALESCE(SUM(ws.unavailable_qty), 0) as unavailable,
        COALESCE(SUM(ws.quantity_on_hand - ws.reserved_qty - ws.unavailable_qty), 0) as available_for_sale
      FROM inventory.warehouse_stock ws
      JOIN inventory.variant v ON v.id = ws.variant_id
      WHERE ws.project_id = ${this.storeId}
        AND v.project_id = ${this.storeId}
        AND v.product_id = ${productId}
        AND v.deleted_at IS NULL
    `);

    const row = result[0];

    return {
      onHand: toNumber(row?.on_hand),
      reserved: toNumber(row?.reserved),
      unavailable: toNumber(row?.unavailable),
      availableForSale: toNumber(row?.available_for_sale),
    };
  }

  private async getAvailableChange7d(productId: string): Promise<number> {
    const result = await this.connection.execute<{
      available_change: number | null;
    }>(sql`
      WITH product_variants AS (
        SELECT id
        FROM inventory.variant
        WHERE project_id = ${this.storeId}
          AND product_id = ${productId}
          AND deleted_at IS NULL
      )
      SELECT COALESCE(SUM(sc.delta_on_hand - sc.delta_reserved - sc.delta_unavailable), 0) as available_change
      FROM inventory.stock_changes sc
      WHERE sc.project_id = ${this.storeId}
        AND sc.variant_id IN (SELECT id FROM product_variants)
        AND sc.apply_status = 'APPLIED'
        AND sc.created_at >= NOW() - INTERVAL '7 days'
    `);

    return toNumber(result[0]?.available_change);
  }

  private async getBackorderEtaAvgDays(
    productId: string
  ): Promise<number | null> {
    const result = await this.connection.execute<{
      eta_avg_days: number | null;
    }>(sql`
      SELECT
        SUM(EXTRACT(EPOCH FROM (s.expected_at - NOW())) * (s.qty_expected - s.qty_received))
        / NULLIF(SUM(s.qty_expected - s.qty_received), 0) / 86400 AS eta_avg_days
      FROM inventory.inbound_supply s
      JOIN inventory.variant v ON v.id = s.variant_id
      WHERE s.project_id = ${this.storeId}
        AND v.project_id = ${this.storeId}
        AND v.product_id = ${productId}
        AND v.deleted_at IS NULL
        AND s.status IN ('PLANNED', 'IN_TRANSIT')
        AND (s.qty_expected - s.qty_received) > 0
        AND s.expected_at >= NOW()
    `);

    return toNumberOrNull(result[0]?.eta_avg_days);
  }

  private async getSkuStatus(
    productId: string,
    lowStockThreshold: number
  ): Promise<InventorySkuStatus> {
    const result = await this.connection.execute<{
      total: number | null;
      low_stock_count: number | null;
      out_of_stock_count: number | null;
      out_of_stock_avg_days: number | null;
      backorder_count: number | null;
      backorder_avg_days: number | null;
    }>(sql`
      WITH product_variants AS (
        SELECT id
        FROM inventory.variant
        WHERE project_id = ${this.storeId}
          AND product_id = ${productId}
          AND deleted_at IS NULL
      ),
      variant_stock AS (
        SELECT
          v.id,
          COALESCE(SUM(ws.quantity_on_hand - ws.reserved_qty - ws.unavailable_qty), 0) as available
        FROM product_variants v
        LEFT JOIN inventory.warehouse_stock ws
          ON ws.variant_id = v.id
         AND ws.project_id = ${this.storeId}
        GROUP BY v.id
      ),
      warehouse_available AS (
        SELECT
          ws.variant_id,
          ws.warehouse_id,
          (ws.quantity_on_hand - ws.reserved_qty - ws.unavailable_qty) as available
        FROM inventory.warehouse_stock ws
        WHERE ws.project_id = ${this.storeId}
          AND ws.variant_id IN (SELECT id FROM product_variants)
      ),
      warehouse_oos AS (
        SELECT
          sc.variant_id,
          sc.warehouse_id,
          MAX(sc.created_at) as out_of_stock_since
        FROM (
          SELECT
            sc.variant_id,
            sc.warehouse_id,
            sc.created_at,
            (sc.on_hand_after - sc.reserved_after - sc.unavailable_after) as available_after,
            LAG(sc.on_hand_after - sc.reserved_after - sc.unavailable_after)
              OVER (PARTITION BY sc.variant_id, sc.warehouse_id ORDER BY sc.created_at, sc.seq) as prev_available
          FROM inventory.stock_changes sc
          WHERE sc.project_id = ${this.storeId}
            AND sc.variant_id IN (SELECT id FROM product_variants)
            AND sc.apply_status = 'APPLIED'
        ) sc
        WHERE sc.available_after <= 0
          AND (sc.prev_available IS NULL OR sc.prev_available > 0)
        GROUP BY sc.variant_id, sc.warehouse_id
      ),
      warehouse_oos_fallback AS (
        SELECT
          wa.variant_id,
          wa.warehouse_id,
          ws.updated_at as out_of_stock_since
        FROM warehouse_available wa
        JOIN inventory.warehouse_stock ws
          ON ws.variant_id = wa.variant_id
         AND ws.warehouse_id = wa.warehouse_id
         AND ws.project_id = ${this.storeId}
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
          v.id,
          MIN(s.expected_at) as backorder_expected_at
        FROM product_variants v
        LEFT JOIN inventory.inbound_supply s
          ON s.variant_id = v.id
         AND s.project_id = ${this.storeId}
         AND s.status IN ('PLANNED', 'IN_TRANSIT')
        GROUP BY v.id
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

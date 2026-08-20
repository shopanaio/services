import { ReadOnly } from "@shopana/shared-kernel";
import { sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import { FBT_RULES_V1 } from "../../recommendation/constants.js";
import type { RecommendationCalculationRun } from "../models/recommendationRuntime.js";

const ORDER_PAGE_SIZE = 25;
const PAIR_EXPANSION_LIMIT = 50_000;
const MATERIALIZATION_PAGE_SIZE = 500;

interface EffectiveOrderRow extends Record<string, unknown> {
  orderId: string;
  orderFactId: string | null;
  state: "COMMITTED" | "REVERSED" | null;
  committedAt: string | null;
  productId: string | null;
  quantity: number | null;
}

export interface AccumulationPageResult {
  done: boolean;
  consideredOrders: number;
  committedOrders: number;
  pairExpansions: number;
  progressAfter: string | null;
}

export interface MaterializationPageResult {
  done: boolean;
  inserted: number;
  progressAfter: string | null;
  pairProgressAfter?: { anchorProductId: string; targetProductId: string };
}

export class RecommendationCalculationAccumulatorRepository extends BaseRepository {
  async accumulateNext(run: RecommendationCalculationRun): Promise<AccumulationPageResult> {
    if (run.materializationPhase !== "ACCUMULATE") {
      return {
        done: true,
        consideredOrders: 0,
        committedOrders: 0,
        pairExpansions: 0,
        progressAfter: run.orderProgressAfter,
      };
    }
    const locked = await this.connection.execute<{ runId: string }>(sql`
      SELECT run_id AS "runId"
      FROM listing.recommendation_calculation_run
      WHERE store_id = ${this.storeId}::uuid
        AND run_id = ${run.runId}::uuid
        AND status = 'BUILDING'
        AND materialization_phase = 'ACCUMULATE'
        AND order_progress_after IS NOT DISTINCT FROM ${run.orderProgressAfter}::uuid
      FOR UPDATE
    `);
    if (!locked[0]) {
      throw new Error("Recommendation accumulation progress conflict");
    }

    const rows = await this.connection.execute<EffectiveOrderRow>(sql`
      WITH next_order_ids AS (
        SELECT DISTINCT order_id
        FROM listing.recommendation_order_fact
        WHERE store_id = ${this.storeId}::uuid
          AND ingestion_position <= ${run.sourceIngestionWatermark}
          AND (${run.orderProgressAfter}::uuid IS NULL OR order_id > ${run.orderProgressAfter}::uuid)
        ORDER BY order_id
        LIMIT ${ORDER_PAGE_SIZE}
      ),
      effective AS (
        SELECT DISTINCT ON (f.order_id)
          f.order_id, f.order_fact_id, f.state, f.committed_at
        FROM listing.recommendation_order_fact f
        JOIN next_order_ids n ON n.order_id = f.order_id
        WHERE f.store_id = ${this.storeId}::uuid
          AND f.ingestion_position <= ${run.sourceIngestionWatermark}
        ORDER BY f.order_id, f.order_revision DESC, f.ingestion_position DESC
      )
      SELECT
        n.order_id AS "orderId",
        e.order_fact_id AS "orderFactId",
        e.state,
        e.committed_at AS "committedAt",
        p.product_id AS "productId",
        p.quantity
      FROM next_order_ids n
      LEFT JOIN effective e ON e.order_id = n.order_id
      LEFT JOIN listing.recommendation_order_product_fact p
        ON p.order_fact_id = e.order_fact_id
        AND e.state = 'COMMITTED'
        AND e.committed_at >= ${run.windowStartedAt}::timestamptz
        AND e.committed_at < ${run.windowEndedAt}::timestamptz
      ORDER BY n.order_id, p.product_id
    `);
    if (rows.length === 0)
      return {
        done: true,
        consideredOrders: 0,
        committedOrders: 0,
        pairExpansions: 0,
        progressAfter: run.orderProgressAfter,
      };

    const byOrder = new Map<string, EffectiveOrderRow[]>();
    for (const row of rows) {
      const bucket = byOrder.get(row.orderId) ?? [];
      bucket.push(row);
      byOrder.set(row.orderId, bucket);
    }
    const selected: Array<[string, EffectiveOrderRow[]]> = [];
    let pairExpansions = 0;
    for (const entry of byOrder) {
      const count = entry[1].filter((row) => row.productId !== null).length;
      const expansion = count * Math.max(0, count - 1);
      if (selected.length > 0 && pairExpansions + expansion > PAIR_EXPANSION_LIMIT) break;
      selected.push(entry);
      pairExpansions += expansion;
    }
    const progressAfter = selected.at(-1)?.[0];
    if (!progressAfter) throw new Error("Recommendation accumulation selected no order");

    const products = new Map<
      string,
      { ordersCount: bigint; quantity: bigint; lastPurchasedAt: string }
    >();
    const pairs = new Map<
      string,
      {
        anchorProductId: string;
        targetProductId: string;
        ordersTogether: bigint;
        lastPurchasedTogetherAt: string;
      }
    >();
    let committedOrders = 0;
    for (const [, orderRows] of selected) {
      const eligible = orderRows.filter(
        (
          row,
        ): row is EffectiveOrderRow & {
          productId: string;
          quantity: number;
          committedAt: string;
        } =>
          row.state === "COMMITTED" &&
          row.productId !== null &&
          row.quantity !== null &&
          row.committedAt !== null &&
          row.committedAt >= run.windowStartedAt &&
          row.committedAt < run.windowEndedAt,
      );
      if (eligible.length === 0) continue;
      committedOrders += 1;
      for (const row of eligible) {
        const current = products.get(row.productId);
        products.set(row.productId, {
          ordersCount: (current?.ordersCount ?? 0n) + 1n,
          quantity: (current?.quantity ?? 0n) + BigInt(row.quantity),
          lastPurchasedAt:
            current && current.lastPurchasedAt > row.committedAt
              ? current.lastPurchasedAt
              : row.committedAt,
        });
      }
      for (const anchor of eligible) {
        for (const target of eligible) {
          if (anchor.productId === target.productId) continue;
          const key = `${anchor.productId}\0${target.productId}`;
          const current = pairs.get(key);
          pairs.set(key, {
            anchorProductId: anchor.productId,
            targetProductId: target.productId,
            ordersTogether: (current?.ordersTogether ?? 0n) + 1n,
            lastPurchasedTogetherAt:
              current && current.lastPurchasedTogetherAt > anchor.committedAt
                ? current.lastPurchasedTogetherAt
                : anchor.committedAt,
          });
        }
      }
    }

    const productJson = [...products.entries()].map(([productId, item]) => ({
      productId,
      ordersCount: item.ordersCount.toString(),
      quantity: item.quantity.toString(),
      lastPurchasedAt: item.lastPurchasedAt,
    }));
    const pairJson = [...pairs.values()].map((item) => ({
      ...item,
      ordersTogether: item.ordersTogether.toString(),
    }));
    if (productJson.length > 0) {
      await this.connection.execute(sql`
        INSERT INTO listing.recommendation_product_accumulator (
          run_id, product_id, orders_count, quantity, last_purchased_at
        )
        SELECT ${run.runId}::uuid, x.product_id, x.orders_count, x.quantity, x.last_purchased_at
        FROM jsonb_to_recordset(${JSON.stringify(productJson)}::jsonb) AS x(
          product_id uuid, orders_count bigint, quantity bigint,
          last_purchased_at timestamptz
        )
        ON CONFLICT (run_id, product_id) DO UPDATE SET
          orders_count = recommendation_product_accumulator.orders_count + EXCLUDED.orders_count,
          quantity = recommendation_product_accumulator.quantity + EXCLUDED.quantity,
          last_purchased_at = GREATEST(
            recommendation_product_accumulator.last_purchased_at,
            EXCLUDED.last_purchased_at
          )
      `);
    }
    if (pairJson.length > 0) {
      await this.connection.execute(sql`
        INSERT INTO listing.recommendation_pair_accumulator (
          run_id, anchor_product_id, target_product_id, orders_together,
          last_purchased_together_at
        )
        SELECT ${run.runId}::uuid, x.anchor_product_id, x.target_product_id,
          x.orders_together, x.last_purchased_together_at
        FROM jsonb_to_recordset(${JSON.stringify(pairJson)}::jsonb) AS x(
          anchor_product_id uuid, target_product_id uuid, orders_together bigint,
          last_purchased_together_at timestamptz
        )
        ON CONFLICT (run_id, anchor_product_id, target_product_id) DO UPDATE SET
          orders_together = recommendation_pair_accumulator.orders_together + EXCLUDED.orders_together,
          last_purchased_together_at = GREATEST(
            recommendation_pair_accumulator.last_purchased_together_at,
            EXCLUDED.last_purchased_together_at
          )
      `);
    }
    const advanced = await this.connection.execute<{ runId: string }>(sql`
      UPDATE listing.recommendation_calculation_run
      SET order_progress_after = ${progressAfter}::uuid,
        order_count = order_count + ${committedOrders}
      WHERE store_id = ${this.storeId}::uuid
        AND run_id = ${run.runId}::uuid
        AND status = 'BUILDING'
        AND materialization_phase = 'ACCUMULATE'
        AND order_progress_after IS NOT DISTINCT FROM ${run.orderProgressAfter}::uuid
      RETURNING run_id AS "runId"
    `);
    if (!advanced[0]) {
      throw new Error("Recommendation accumulation progress conflict");
    }
    return {
      done: false,
      consideredOrders: selected.length,
      committedOrders,
      pairExpansions,
      progressAfter,
    };
  }

  @ReadOnly()
  async hasOrdersAfter(run: RecommendationCalculationRun): Promise<boolean> {
    const rows = await this.connection.execute<{ exists: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1 FROM listing.recommendation_order_fact
        WHERE store_id = ${this.storeId}::uuid
          AND ingestion_position <= ${run.sourceIngestionWatermark}
          AND (${run.orderProgressAfter}::uuid IS NULL OR order_id > ${run.orderProgressAfter}::uuid)
      ) AS "exists"
    `);
    return rows[0]?.exists ?? false;
  }

  async materializeProducts(run: RecommendationCalculationRun): Promise<MaterializationPageResult> {
    const rows = await this.connection.execute<{
      productId: string;
      ordersCount: bigint;
      quantity: bigint;
      lastPurchasedAt: string;
    }>(sql`
      SELECT product_id AS "productId", orders_count AS "ordersCount",
        quantity, last_purchased_at AS "lastPurchasedAt"
      FROM listing.recommendation_product_accumulator
      WHERE run_id = ${run.runId}::uuid
        AND (${run.productProgressAfter}::uuid IS NULL OR product_id > ${run.productProgressAfter}::uuid)
      ORDER BY product_id
      LIMIT ${MATERIALIZATION_PAGE_SIZE}
    `);
    if (rows.length === 0)
      return { done: true, inserted: 0, progressAfter: run.productProgressAfter };
    const ids = await this.generateUuidV7s(rows.length);
    const values = rows.map((row, index) => ({
      id: ids[index]!,
      ...row,
      ordersCount: row.ordersCount.toString(),
      quantity: row.quantity.toString(),
    }));
    await this.connection.execute(sql`
      INSERT INTO listing.recommendation_product_stat (
        product_stat_id, run_id, product_id, orders_count, quantity, last_purchased_at
      )
      SELECT x.id, ${run.runId}::uuid, x.product_id, x.orders_count, x.quantity,
        x.last_purchased_at
      FROM jsonb_to_recordset(${JSON.stringify(values)}::jsonb) AS x(
        id uuid, product_id uuid, orders_count bigint, quantity bigint,
        last_purchased_at timestamptz
      )
      ON CONFLICT (run_id, product_id) DO NOTHING
    `);
    const progressAfter = rows.at(-1)!.productId;
    const advanced = await this.connection.execute<{ runId: string }>(sql`
      UPDATE listing.recommendation_calculation_run
      SET product_progress_after = ${progressAfter}::uuid,
        product_count = product_count + ${rows.length}
      WHERE store_id = ${this.storeId}::uuid AND run_id = ${run.runId}::uuid
        AND materialization_phase = 'PRODUCTS'
        AND product_progress_after IS NOT DISTINCT FROM ${run.productProgressAfter}::uuid
      RETURNING run_id AS "runId"
    `);
    if (!advanced[0]) throw new Error("Recommendation product materialization progress conflict");
    return { done: false, inserted: rows.length, progressAfter };
  }

  async materializePairs(run: RecommendationCalculationRun): Promise<MaterializationPageResult> {
    const rows = await this.connection.execute<{
      anchorProductId: string;
      targetProductId: string;
    }>(sql`
      SELECT anchor_product_id AS "anchorProductId", target_product_id AS "targetProductId"
      FROM listing.recommendation_pair_accumulator
      WHERE run_id = ${run.runId}::uuid
        AND (
          ${run.pairProgressAnchorAfter}::uuid IS NULL
          OR (anchor_product_id, target_product_id) >
             (${run.pairProgressAnchorAfter}::uuid, ${run.pairProgressTargetAfter}::uuid)
        )
      ORDER BY anchor_product_id, target_product_id
      LIMIT ${MATERIALIZATION_PAGE_SIZE}
    `);
    if (rows.length === 0) {
      return { done: true, inserted: 0, progressAfter: null };
    }
    const ids = await this.generateUuidV7s(rows.length);
    const values = rows.map((row, index) => ({ id: ids[index]!, ...row }));
    await this.connection.execute(sql`
      INSERT INTO listing.recommendation_product_pair_stat (
        pair_stat_id, run_id, anchor_product_id, target_product_id,
        orders_together, anchor_orders, target_orders, store_orders,
        support, confidence, lift, recency_score, source_score
      )
      SELECT
        x.id, ${run.runId}::uuid, a.anchor_product_id, a.target_product_id,
        a.orders_together, anchor.orders_count, target.orders_count, ${run.orderCount},
        round(a.orders_together::numeric / ${run.orderCount}::numeric, 10),
        round(a.orders_together::numeric / anchor.orders_count::numeric, 10),
        round(
          (a.orders_together::numeric / anchor.orders_count::numeric)
          / (target.orders_count::numeric / ${run.orderCount}::numeric), 10
        ),
        round(exp(-ln(2::numeric) *
          (extract(epoch FROM (${run.windowEndedAt}::timestamptz - a.last_purchased_together_at)) / 86400::numeric)
          / ${FBT_RULES_V1.recencyHalfLifeDays}::numeric), 10),
        round(
          (a.orders_together::numeric / anchor.orders_count::numeric)
          * ln(1::numeric + a.orders_together::numeric)
          * LEAST(
              (a.orders_together::numeric / anchor.orders_count::numeric)
              / (target.orders_count::numeric / ${run.orderCount}::numeric),
              ${FBT_RULES_V1.liftCap}::numeric
            )
          * exp(-ln(2::numeric) *
              (extract(epoch FROM (${run.windowEndedAt}::timestamptz - a.last_purchased_together_at)) / 86400::numeric)
              / ${FBT_RULES_V1.recencyHalfLifeDays}::numeric),
          10
        )
      FROM jsonb_to_recordset(${JSON.stringify(values)}::jsonb) AS x(
        id uuid, anchor_product_id uuid, target_product_id uuid
      )
      JOIN listing.recommendation_pair_accumulator a
        ON a.run_id = ${run.runId}::uuid
        AND a.anchor_product_id = x.anchor_product_id
        AND a.target_product_id = x.target_product_id
      JOIN listing.recommendation_product_accumulator anchor
        ON anchor.run_id = a.run_id AND anchor.product_id = a.anchor_product_id
      JOIN listing.recommendation_product_accumulator target
        ON target.run_id = a.run_id AND target.product_id = a.target_product_id
      WHERE ${run.orderCount}::bigint > 0
      ON CONFLICT (run_id, anchor_product_id, target_product_id) DO NOTHING
    `);
    const last = rows.at(-1)!;
    const advanced = await this.connection.execute<{ runId: string }>(sql`
      UPDATE listing.recommendation_calculation_run
      SET pair_progress_anchor_after = ${last.anchorProductId}::uuid,
        pair_progress_target_after = ${last.targetProductId}::uuid,
        pair_count = pair_count + ${rows.length}
      WHERE store_id = ${this.storeId}::uuid AND run_id = ${run.runId}::uuid
        AND materialization_phase = 'PAIRS'
        AND pair_progress_anchor_after IS NOT DISTINCT FROM ${run.pairProgressAnchorAfter}::uuid
        AND pair_progress_target_after IS NOT DISTINCT FROM ${run.pairProgressTargetAfter}::uuid
      RETURNING run_id AS "runId"
    `);
    if (!advanced[0]) throw new Error("Recommendation pair materialization progress conflict");
    return {
      done: false,
      inserted: rows.length,
      progressAfter: null,
      pairProgressAfter: last,
    };
  }

  async finalize(runId: string): Promise<{ productCount: number; pairCount: bigint }> {
    const rows = await this.connection.execute<{ productCount: number; pairCount: bigint }>(sql`
      WITH deleted_products AS (
        DELETE FROM listing.recommendation_product_accumulator WHERE run_id = ${runId}::uuid
      ), deleted_pairs AS (
        DELETE FROM listing.recommendation_pair_accumulator WHERE run_id = ${runId}::uuid
      )
      UPDATE listing.recommendation_calculation_run
      SET materialization_phase = 'COMPLETE'
      WHERE store_id = ${this.storeId}::uuid AND run_id = ${runId}::uuid
        AND status = 'BUILDING' AND materialization_phase = 'PAIRS'
      RETURNING product_count AS "productCount", pair_count AS "pairCount"
    `);
    const row = rows[0];
    if (!row) throw new Error("Recommendation calculation finalization conflict");
    return row;
  }
}

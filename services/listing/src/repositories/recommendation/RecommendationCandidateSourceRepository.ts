import { ReadOnly } from "@shopana/shared-kernel";
import { inArray, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import { FBT_RULES_V1 } from "../../recommendation/constants.js";
import { MAX_RECOMMENDATION_SOURCE_LIMIT } from "../../recommendation/constants.js";
import type { RecommendationPlacement } from "../models/recommendationRuntime.js";
import type { RecommendationCandidate } from "./types.js";

interface AutomatedCandidateRow {
  targetProductId: string;
  runId: string;
  fbtSourceScore: string | null;
  popularityScore: string | null;
}

export class RecommendationCandidateSourceRepository extends BaseRepository {
  @ReadOnly()
  async fbt(input: {
    anchorProductId: string;
    limit: number;
    diagnostic?: boolean;
  }): Promise<Array<RecommendationCandidate & { insufficientSupport?: boolean }>> {
    assertSourceLimit(input.limit);
    const rows = await this.connection.execute<AutomatedCandidateRow & {
      ordersTogether: bigint;
      confidence: string;
      lift: string;
    }>(sql`
      WITH active_run AS (
        SELECT run_id
        FROM listing.recommendation_calculation_run
        WHERE store_id = ${this.storeId}::uuid
          AND calculation_type = 'FREQUENTLY_BOUGHT_TOGETHER'
          AND status = 'ACTIVE'
      ), maximum AS (
        SELECT max(orders_count)::numeric AS count
        FROM listing.recommendation_product_stat ps
        JOIN active_run r USING (run_id)
      )
      SELECT
        pair.target_product_id AS "targetProductId",
        pair.run_id AS "runId",
        pair.source_score AS "fbtSourceScore",
        CASE WHEN maximum.count IS NULL OR maximum.count <= 0 THEN 0::numeric
          ELSE ln(1::numeric + COALESCE(pop.orders_count, 0)::numeric)
            / ln(1::numeric + maximum.count)
        END AS "popularityScore",
        pair.orders_together AS "ordersTogether",
        pair.confidence,
        pair.lift
      FROM active_run r
      JOIN listing.recommendation_product_pair_stat pair USING (run_id)
      LEFT JOIN listing.recommendation_product_stat pop
        ON pop.run_id = pair.run_id AND pop.product_id = pair.target_product_id
      CROSS JOIN maximum
      WHERE pair.anchor_product_id = ${input.anchorProductId}::uuid
        AND (
          ${input.diagnostic ?? false}
          OR (
            pair.orders_together >= ${FBT_RULES_V1.minimumPairOrders}
            AND pair.confidence >= ${FBT_RULES_V1.minimumConfidence}::numeric
            AND pair.lift >= ${FBT_RULES_V1.minimumLift}::numeric
          )
        )
      ORDER BY pair.source_score DESC, pair.target_product_id
      LIMIT ${input.limit}
    `);
    return rows.map((row) => ({
      targetProductId: row.targetProductId,
      manualAction: null,
      manualPosition: null,
      manualBoost: null,
      fbtSourceScore: row.fbtSourceScore,
      popularityScore: row.popularityScore,
      primarySource: "FREQUENTLY_BOUGHT_TOGETHER",
      sourceBreakdown: {
        version: 1,
        fbt: { runId: row.runId, sourceScore: row.fbtSourceScore ?? "0" },
      },
      insufficientSupport:
        row.ordersTogether < FBT_RULES_V1.minimumPairOrders ||
        compareDecimal(row.confidence, FBT_RULES_V1.minimumConfidence) < 0 ||
        compareDecimal(row.lift, FBT_RULES_V1.minimumLift) < 0,
    }));
  }

  @ReadOnly()
  async storePopularity(input: {
    anchorProductId: string;
    limit: number;
  }): Promise<RecommendationCandidate[]> {
    assertSourceLimit(input.limit);
    const rows = await this.connection.execute<AutomatedCandidateRow>(sql`
      WITH active_run AS (
        SELECT run_id
        FROM listing.recommendation_calculation_run
        WHERE store_id = ${this.storeId}::uuid
          AND calculation_type = 'FREQUENTLY_BOUGHT_TOGETHER'
          AND status = 'ACTIVE'
      ), ranked AS (
        SELECT ps.*, max(ps.orders_count) OVER ()::numeric AS maximum
        FROM listing.recommendation_product_stat ps
        JOIN active_run r USING (run_id)
      )
      SELECT product_id AS "targetProductId", run_id AS "runId",
        NULL::numeric AS "fbtSourceScore",
        CASE WHEN maximum <= 0 THEN 0::numeric
          ELSE ln(1::numeric + orders_count::numeric) / ln(1::numeric + maximum)
        END AS "popularityScore"
      FROM ranked
      WHERE product_id <> ${input.anchorProductId}::uuid
      ORDER BY "popularityScore" DESC, product_id
      LIMIT ${input.limit}
    `);
    return rows.map((row) => popularityCandidate(row, "storePopularity"));
  }

  @ReadOnly()
  async categoryPopularity(input: {
    anchorProductId: string;
    limit: number;
  }): Promise<RecommendationCandidate[]> {
    assertSourceLimit(input.limit);
    const rows = await this.connection.execute<AutomatedCandidateRow>(sql`
      WITH active_run AS (
        SELECT run_id
        FROM listing.recommendation_calculation_run
        WHERE store_id = ${this.storeId}::uuid
          AND calculation_type = 'FREQUENTLY_BOUGHT_TOGETHER'
          AND status = 'ACTIVE'
      ), anchor AS (
        SELECT product_doc_id
        FROM listing.product_listing_index
        WHERE store_id = ${this.storeId}::uuid
          AND product_id = ${input.anchorProductId}::uuid
      ), categories AS (
        SELECT posting.bitmap
        FROM listing.listing_posting_bitmap posting
        CROSS JOIN anchor
        WHERE posting.store_id = ${this.storeId}::uuid
          AND posting.entity_type = 'product'
          AND posting.field = 'category'
          AND posting.bitmap @> anchor.product_doc_id
      ), maximum AS (
        SELECT max(ps.orders_count)::numeric AS count
        FROM listing.recommendation_product_stat ps
        JOIN active_run r USING (run_id)
      )
      SELECT p.product_id AS "targetProductId", ps.run_id AS "runId",
        NULL::numeric AS "fbtSourceScore",
        max(CASE WHEN maximum.count IS NULL OR maximum.count <= 0 THEN 0::numeric
          ELSE ln(1::numeric + COALESCE(ps.orders_count, 0)::numeric)
            / ln(1::numeric + maximum.count)
        END) AS "popularityScore"
      FROM categories category
      JOIN listing.product_listing_index p
        ON p.store_id = ${this.storeId}::uuid
        AND category.bitmap @> p.product_doc_id
      JOIN active_run r ON true
      JOIN listing.recommendation_product_stat ps
        ON ps.run_id = r.run_id AND ps.product_id = p.product_id
      CROSS JOIN maximum
      WHERE p.product_id <> ${input.anchorProductId}::uuid
      GROUP BY p.product_id, ps.run_id
      ORDER BY "popularityScore" DESC, p.product_id
      LIMIT ${input.limit}
    `);
    return rows.map((row) => popularityCandidate(row, "categoryPopularity"));
  }

  @ReadOnly()
  async eligibleTargetIds(ids: readonly string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.connection.execute<{ productId: string }>(sql`
      SELECT DISTINCT p.product_id AS "productId"
      FROM listing.product_listing_index p
      JOIN listing.listing_posting_product_sort availability
        ON availability.store_id = p.store_id
        AND availability.product_id = p.product_id
        AND availability.sort_kind = 'availability'
        AND availability.bool_value = true
      WHERE p.store_id = ${this.storeId}::uuid
        AND p.status = 'published'
        AND ${inArray(sql`p.product_id`, [...new Set(ids)])}
    `);
    return new Set(rows.map((row) => row.productId));
  }

  @ReadOnly()
  async currentEligibility(ids: readonly string[]): Promise<Map<string, "ELIGIBLE" | "UNPUBLISHED" | "UNAVAILABLE" | "STALE">> {
    if (ids.length === 0) return new Map();
    const rows = await this.connection.execute<{ productId: string; status: string | null; available: boolean | null }>(sql`
      SELECT input.product_id AS "productId", p.status,
        bool_or(availability.bool_value = true) AS available
      FROM unnest(${[...ids]}::uuid[]) AS input(product_id)
      LEFT JOIN listing.product_listing_index p
        ON p.store_id = ${this.storeId}::uuid AND p.product_id = input.product_id
      LEFT JOIN listing.listing_posting_product_sort availability
        ON availability.store_id = p.store_id AND availability.product_id = p.product_id
        AND availability.sort_kind = 'availability'
      GROUP BY input.product_id, p.status
    `);
    return new Map(rows.map((row) => [
      row.productId,
      row.status === null ? "STALE"
        : row.status !== "published" ? "UNPUBLISHED"
        : row.available ? "ELIGIBLE" : "UNAVAILABLE",
    ]));
  }
}

function assertSourceLimit(limit: number): void {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_RECOMMENDATION_SOURCE_LIMIT) {
    throw new Error(`Recommendation source limit must be from 1 to ${MAX_RECOMMENDATION_SOURCE_LIMIT}`);
  }
}

function popularityCandidate(
  row: AutomatedCandidateRow,
  kind: "categoryPopularity" | "storePopularity",
): RecommendationCandidate {
  const score = row.popularityScore ?? "0";
  return {
    targetProductId: row.targetProductId,
    manualAction: null,
    manualPosition: null,
    manualBoost: null,
    fbtSourceScore: null,
    popularityScore: score,
    primarySource: "POPULARITY",
    sourceBreakdown: {
      version: 1,
      [kind]: { score },
    },
  };
}

function compareDecimal(left: string, right: string): number {
  const normalize = (value: string) => {
    const [whole = "0", fraction = ""] = value.split(".");
    return BigInt(`${whole}${fraction.padEnd(10, "0").slice(0, 10)}`);
  };
  const a = normalize(left);
  const b = normalize(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

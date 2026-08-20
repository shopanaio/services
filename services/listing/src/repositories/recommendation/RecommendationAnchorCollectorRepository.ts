import { ReadOnly } from "@shopana/shared-kernel";
import { sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import type { RecommendationPlacement } from "../models/recommendationRuntime.js";

export interface RecommendationAnchorPage {
  anchorProductIds: string[];
  nextCursor: string | null;
}

export class RecommendationAnchorCollectorRepository extends BaseRepository {
  @ReadOnly()
  async forPlacement(input: {
    placement: RecommendationPlacement;
    afterProductId?: string;
    first: number;
  }): Promise<RecommendationAnchorPage> {
    const rows = await this.connection.execute<{ anchorProductId: string }>(sql`
      WITH anchors AS (
        SELECT product_id AS anchor_product_id
        FROM listing.product_listing_index
        WHERE store_id = ${this.storeId}::uuid AND status = 'published'
        UNION
        SELECT anchor_product_id
        FROM listing.manual_product_recommendation
        WHERE store_id = ${this.storeId}::uuid AND placement = ${input.placement}
        UNION
        SELECT anchor_product_id
        FROM listing.recommendation_snapshot
        WHERE store_id = ${this.storeId}::uuid AND placement = ${input.placement}
          AND status = 'ACTIVE'
      )
      SELECT anchor_product_id AS "anchorProductId"
      FROM anchors
      WHERE (${input.afterProductId ?? null}::uuid IS NULL OR anchor_product_id > ${input.afterProductId ?? null}::uuid)
      ORDER BY anchor_product_id
      LIMIT ${input.first + 1}
    `);
    return page(rows, input.first);
  }

  @ReadOnly()
  async forCalculation(input: {
    runId: string;
    placement: RecommendationPlacement;
    includePopularityPolicies: boolean;
    afterProductId?: string;
    first: number;
  }): Promise<RecommendationAnchorPage> {
    const rows = await this.connection.execute<{ anchorProductId: string }>(sql`
      WITH anchors AS (
        SELECT DISTINCT anchor_product_id
        FROM listing.recommendation_product_pair_stat
        WHERE run_id = ${input.runId}::uuid
        UNION
        SELECT product.product_id
        FROM listing.product_listing_index product
        WHERE ${input.includePopularityPolicies}
          AND product.store_id = ${this.storeId}::uuid AND product.status = 'published'
      )
      SELECT anchor_product_id AS "anchorProductId"
      FROM anchors
      WHERE (${input.afterProductId ?? null}::uuid IS NULL OR anchor_product_id > ${input.afterProductId ?? null}::uuid)
      ORDER BY anchor_product_id
      LIMIT ${input.first + 1}
    `);
    return page(rows, input.first);
  }

  @ReadOnly()
  async reverseReferences(input: {
    targetProductId: string;
    afterProductId?: string;
    first: number;
  }): Promise<RecommendationAnchorPage> {
    const rows = await this.connection.execute<{ anchorProductId: string }>(sql`
      WITH anchors AS (
        SELECT anchor_product_id
        FROM listing.manual_product_recommendation
        WHERE store_id = ${this.storeId}::uuid
          AND target_product_id = ${input.targetProductId}::uuid
        UNION
        SELECT snapshot.anchor_product_id
        FROM listing.recommendation_snapshot_item item
        JOIN listing.recommendation_snapshot snapshot USING (snapshot_id)
        WHERE snapshot.store_id = ${this.storeId}::uuid
          AND item.target_product_id = ${input.targetProductId}::uuid
          AND snapshot.status = 'ACTIVE'
      )
      SELECT DISTINCT anchor_product_id AS "anchorProductId"
      FROM anchors
      WHERE (${input.afterProductId ?? null}::uuid IS NULL OR anchor_product_id > ${input.afterProductId ?? null}::uuid)
      ORDER BY anchor_product_id
      LIMIT ${input.first + 1}
    `);
    return page(rows, input.first);
  }

  @ReadOnly()
  async anchorsInCategories(input: {
    categoryIds: readonly string[];
    afterProductId?: string;
    first: number;
  }): Promise<RecommendationAnchorPage> {
    if (input.categoryIds.length === 0) return { anchorProductIds: [], nextCursor: null };
    const rows = await this.connection.execute<{ anchorProductId: string }>(sql`
      SELECT DISTINCT product.product_id AS "anchorProductId"
      FROM listing.listing_posting_bitmap category
      JOIN listing.product_listing_index product
        ON product.store_id = category.store_id
        AND category.bitmap @> product.product_doc_id
        AND product.status = 'published'
      WHERE category.store_id = ${this.storeId}::uuid
        AND category.entity_type = 'product' AND category.field = 'category'
        AND category.value_key = ANY(${[...input.categoryIds]}::text[])
        AND (${input.afterProductId ?? null}::uuid IS NULL OR product.product_id > ${input.afterProductId ?? null}::uuid)
      ORDER BY product.product_id
      LIMIT ${input.first + 1}
    `);
    return page(rows, input.first);
  }
}

function page(rows: Array<{ anchorProductId: string }>, first: number): RecommendationAnchorPage {
  const values = rows.slice(0, first).map((row) => row.anchorProductId);
  return {
    anchorProductIds: values,
    nextCursor: rows.length > first ? (values.at(-1) ?? null) : null,
  };
}

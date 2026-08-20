import { ReadOnly } from "@shopana/shared-kernel";
import { sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import type {
  ProductRecommendationSource,
  RecommendationPlacement,
} from "../models/recommendationRuntime.js";
import type { RecommendationPageKey, RecommendationPageResult } from "../recommendation/types.js";
import {
  decodeRecommendationCursor,
  encodeRecommendationCursor,
  recommendationCursorHash,
  StorefrontRecommendationValidationError,
} from "./recommendationCursor.js";

interface BatchInputRow {
  ordinal: number;
  anchor_product_id: string;
  placement: RecommendationPlacement;
  first: number;
  cursor_snapshot_id: string | null;
  cursor_hash: string | null;
  after_rank: number;
}

interface BatchResultRow {
  ordinal: number;
  anchorProductId: string;
  placement: RecommendationPlacement;
  first: number;
  snapshotId: string | null;
  rows: Array<{
    targetProductId: string;
    primarySource: ProductRecommendationSource;
    rank: number;
  }> | null;
  totalCount: number;
  cursorSnapshotId: string | null;
  cursorHash: string | null;
}

export class StorefrontRecommendationQueryRepository extends BaseRepository {
  @ReadOnly()
  async getPages(keys: readonly RecommendationPageKey[]): Promise<RecommendationPageResult[]> {
    if (keys.length === 0) return [];
    const input: BatchInputRow[] = keys.map((key, ordinal) => {
      if (!Number.isSafeInteger(key.first) || key.first < 1 || key.first > 100) {
        throw new StorefrontRecommendationValidationError("first must be an integer from 1 to 100");
      }
      const cursor = key.after ? decodeRecommendationCursor(key.after) : null;
      return {
        ordinal,
        anchor_product_id: key.anchorProductId,
        placement: key.placement,
        first: key.first,
        cursor_snapshot_id: cursor?.snapshotId ?? null,
        cursor_hash: cursor?.hash ?? null,
        after_rank: cursor?.rank ?? 0,
      };
    });
    const rows = await this.connection.execute<BatchResultRow>(sql`
      WITH input AS (
        SELECT *
        FROM jsonb_to_recordset(${JSON.stringify(input)}::jsonb) AS x(
          ordinal integer, anchor_product_id uuid, placement varchar(48),
          first integer, cursor_snapshot_id uuid, cursor_hash text,
          after_rank integer
        )
      )
      SELECT input.ordinal, input.anchor_product_id AS "anchorProductId",
        input.placement, input.first, active.snapshot_id AS "snapshotId",
        page.rows, COALESCE(total.total_count, 0)::integer AS "totalCount",
        input.cursor_snapshot_id AS "cursorSnapshotId",
        input.cursor_hash AS "cursorHash"
      FROM input
      LEFT JOIN LATERAL (
        SELECT snapshot.snapshot_id
        FROM listing.recommendation_snapshot snapshot
        JOIN listing.recommendation_placement_policy policy
          ON policy.policy_id = snapshot.policy_id
          AND policy.store_id = ${this.storeId}::uuid
          AND policy.enabled = true
        WHERE snapshot.store_id = ${this.storeId}::uuid
          AND snapshot.anchor_product_id = input.anchor_product_id
          AND snapshot.placement = input.placement
          AND snapshot.status = 'ACTIVE'
          AND (snapshot.expires_at IS NULL OR snapshot.expires_at > now())
        LIMIT 1
      ) active ON true
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(to_jsonb(ranked) ORDER BY ranked.rank) AS rows
        FROM (
          SELECT item.target_product_id AS "targetProductId",
            item.primary_source AS "primarySource", item.rank
          FROM listing.recommendation_snapshot_item item
          JOIN listing.product_listing_index product
            ON product.store_id = ${this.storeId}::uuid
            AND product.product_id = item.target_product_id
            AND product.status = 'published'
          WHERE item.snapshot_id = active.snapshot_id
            AND item.rank > input.after_rank
            AND EXISTS (
              SELECT 1
              FROM listing.listing_posting_product_sort availability
              WHERE availability.store_id = ${this.storeId}::uuid
                AND availability.product_id = item.target_product_id
                AND availability.sort_kind = 'availability'
                AND availability.bool_value = true
            )
          ORDER BY item.rank
          LIMIT input.first + 1
        ) ranked
      ) page ON true
      LEFT JOIN LATERAL (
        SELECT count(*) AS total_count
        FROM listing.recommendation_snapshot_item item
        JOIN listing.product_listing_index product
          ON product.store_id = ${this.storeId}::uuid
          AND product.product_id = item.target_product_id
          AND product.status = 'published'
        WHERE item.snapshot_id = active.snapshot_id
          AND EXISTS (
            SELECT 1
            FROM listing.listing_posting_product_sort availability
            WHERE availability.store_id = ${this.storeId}::uuid
              AND availability.product_id = item.target_product_id
              AND availability.sort_kind = 'availability'
              AND availability.bool_value = true
          )
      ) total ON true
      ORDER BY input.ordinal
    `);
    return rows.map((row) => this.mapPage(row));
  }

  private mapPage(row: BatchResultRow): RecommendationPageResult {
    if (row.cursorSnapshotId !== null) {
      if (row.snapshotId !== row.cursorSnapshotId || row.snapshotId === null) {
        throw new StorefrontRecommendationValidationError(
          "Recommendation snapshot changed between pages",
        );
      }
      const expected = recommendationCursorHash({
        storeId: this.storeId,
        anchorProductId: row.anchorProductId,
        placement: row.placement,
        snapshotId: row.snapshotId,
      });
      if (row.cursorHash !== expected) {
        throw new StorefrontRecommendationValidationError(
          "Recommendation cursor does not match this connection",
        );
      }
    }
    if (row.snapshotId === null) {
      return { rows: [], hasNextPage: false, totalCount: 0, snapshotId: null };
    }
    const rawRows = row.rows ?? [];
    const hasNextPage = rawRows.length > row.first;
    const pageRows = rawRows.slice(0, row.first);
    const hash = recommendationCursorHash({
      storeId: this.storeId,
      anchorProductId: row.anchorProductId,
      placement: row.placement,
      snapshotId: row.snapshotId,
    });
    return {
      rows: pageRows.map((item) => ({
        ...item,
        cursor: encodeRecommendationCursor({
          version: 1,
          hash,
          snapshotId: row.snapshotId!,
          rank: item.rank,
        }),
      })),
      hasNextPage,
      totalCount: row.totalCount,
      snapshotId: row.snapshotId,
    };
  }
}

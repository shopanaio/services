import { ReadOnly } from "@shopana/shared-kernel";
import { eq, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  recommendationMaintenanceCursor,
  type RecommendationMaintenanceCursor,
  type RecommendationPlacement,
} from "../models/recommendationRuntime.js";

export interface ManualBoundaryPage {
  rows: Array<{ anchorProductId: string; placement: RecommendationPlacement }>;
  nextCursor: { anchorProductId: string; placement: RecommendationPlacement } | null;
}

export class RecommendationMaintenanceRepository extends BaseRepository {
  @ReadOnly()
  async listBootstrapAnchors(input: {
    after?: { anchorProductId: string; placement: RecommendationPlacement };
    first: number;
  }): Promise<ManualBoundaryPage> {
    const rows = await this.connection.execute<{
      anchorProductId: string;
      placement: RecommendationPlacement;
    }>(sql`
      SELECT DISTINCT anchor_product_id AS "anchorProductId", placement
      FROM listing.manual_product_recommendation
      WHERE store_id = ${this.storeId}::uuid
        AND (
          ${input.after?.anchorProductId ?? null}::uuid IS NULL
          OR (anchor_product_id, placement) >
             (${input.after?.anchorProductId ?? null}::uuid, ${input.after?.placement ?? null}::varchar)
        )
      ORDER BY anchor_product_id, placement
      LIMIT ${input.first + 1}
    `);
    const page = rows.slice(0, input.first);
    return {
      rows: page,
      nextCursor: rows.length > input.first ? (page.at(-1) ?? null) : null,
    };
  }

  async lockOrCreate(): Promise<RecommendationMaintenanceCursor> {
    const cursorId = await this.generateUuidV7();
    await this.connection.execute(sql`
      INSERT INTO listing.recommendation_maintenance_cursor (
        cursor_id, store_id, status, bootstrap_cutoff_at,
        last_manual_boundary_at, created_at, updated_at
      ) VALUES (
        ${cursorId}::uuid, ${this.storeId}::uuid, 'BOOTSTRAPPING',
        date_trunc('minute', now()), NULL, now(), now()
      ) ON CONFLICT (store_id) DO NOTHING
    `);
    const rows = await this.connection.execute<RecommendationMaintenanceCursor>(sql`
      SELECT cursor_id AS "cursorId", store_id AS "storeId", status,
        bootstrap_cutoff_at AS "bootstrapCutoffAt",
        last_manual_boundary_at AS "lastManualBoundaryAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM listing.recommendation_maintenance_cursor
      WHERE store_id = ${this.storeId}::uuid FOR UPDATE
    `);
    const row = rows[0];
    if (!row) throw new Error("Recommendation maintenance cursor is missing");
    return row;
  }

  @ReadOnly()
  async find(): Promise<RecommendationMaintenanceCursor | null> {
    const [row] = await this.connection
      .select()
      .from(recommendationMaintenanceCursor)
      .where(eq(recommendationMaintenanceCursor.storeId, this.storeId))
      .limit(1);
    return row ?? null;
  }

  async activateBootstrap(cutoff: string): Promise<boolean> {
    const rows = await this.connection.execute<{ cursorId: string }>(sql`
      UPDATE listing.recommendation_maintenance_cursor
      SET status = 'ACTIVE', last_manual_boundary_at = bootstrap_cutoff_at,
        updated_at = now()
      WHERE store_id = ${this.storeId}::uuid
        AND status = 'BOOTSTRAPPING'
        AND bootstrap_cutoff_at = ${cutoff}::timestamptz
      RETURNING cursor_id AS "cursorId"
    `);
    return rows.length === 1;
  }

  async lockActiveInterval(
    toBoundary: string,
  ): Promise<{ fromBoundary: string; toBoundary: string } | null> {
    const rows = await this.connection.execute<RecommendationMaintenanceCursor>(sql`
      SELECT cursor_id AS "cursorId", store_id AS "storeId", status,
        bootstrap_cutoff_at AS "bootstrapCutoffAt",
        last_manual_boundary_at AS "lastManualBoundaryAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM listing.recommendation_maintenance_cursor
      WHERE store_id = ${this.storeId}::uuid FOR UPDATE
    `);
    const cursor = rows[0];
    if (!cursor || cursor.status !== "ACTIVE" || cursor.lastManualBoundaryAt === null) return null;
    return { fromBoundary: cursor.lastManualBoundaryAt, toBoundary };
  }

  @ReadOnly()
  async listBoundaries(input: {
    fromBoundary: string;
    toBoundary: string;
    after?: { anchorProductId: string; placement: RecommendationPlacement };
    first: number;
  }): Promise<ManualBoundaryPage> {
    const rows = await this.connection.execute<{
      anchorProductId: string;
      placement: RecommendationPlacement;
    }>(sql`
      SELECT DISTINCT anchor_product_id AS "anchorProductId", placement
      FROM listing.manual_product_recommendation
      WHERE store_id = ${this.storeId}::uuid AND enabled = true
        AND (
          (starts_at > ${input.fromBoundary}::timestamptz AND starts_at <= ${input.toBoundary}::timestamptz)
          OR (ends_at > ${input.fromBoundary}::timestamptz AND ends_at <= ${input.toBoundary}::timestamptz)
        )
        AND (
          ${input.after?.anchorProductId ?? null}::uuid IS NULL
          OR (anchor_product_id, placement) >
             (${input.after?.anchorProductId ?? null}::uuid, ${input.after?.placement ?? null}::varchar)
        )
      ORDER BY anchor_product_id, placement
      LIMIT ${input.first + 1}
    `);
    const page = rows.slice(0, input.first);
    return {
      rows: page,
      nextCursor: rows.length > input.first ? (page.at(-1) ?? null) : null,
    };
  }

  async advance(
    fromBoundary: string,
    toBoundary: string,
  ): Promise<"ADVANCED" | "ALREADY_ADVANCED" | "CONFLICT"> {
    const rows = await this.connection.execute<{ boundary: string }>(sql`
      UPDATE listing.recommendation_maintenance_cursor
      SET last_manual_boundary_at = ${toBoundary}::timestamptz, updated_at = now()
      WHERE store_id = ${this.storeId}::uuid AND status = 'ACTIVE'
        AND last_manual_boundary_at = ${fromBoundary}::timestamptz
      RETURNING last_manual_boundary_at AS boundary
    `);
    if (rows[0]) return "ADVANCED";
    const current = await this.find();
    if (current?.lastManualBoundaryAt && current.lastManualBoundaryAt >= toBoundary)
      return "ALREADY_ADVANCED";
    return "CONFLICT";
  }
}

import { ReadOnly } from "@shopana/shared-kernel";
import { and, eq, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  recommendationBuildRequest,
  type RecommendationBuildRequest,
  type RecommendationPlacement,
} from "../models/recommendationRuntime.js";
import type { RecommendationRequestGeneration } from "./types.js";

export class RecommendationBuildRequestRepository extends BaseRepository {
  async lockOrCreateMutex(
    anchorProductId: string,
    placement: RecommendationPlacement,
  ): Promise<RecommendationBuildRequest> {
    const requestId = await this.generateUuidV7();
    await this.connection.execute(sql`
      INSERT INTO listing.recommendation_build_request (
        request_id, store_id, anchor_product_id, placement, generation, trigger_key
      ) VALUES (
        ${requestId}::uuid, ${this.storeId}::uuid, ${anchorProductId}::uuid,
        ${placement}, 1, 'mutex:initial'
      )
      ON CONFLICT (store_id, anchor_product_id, placement) DO NOTHING
    `);
    const rows = await this.connection.execute<RecommendationBuildRequest>(sql`
      SELECT
        request_id AS "requestId", store_id AS "storeId",
        anchor_product_id AS "anchorProductId", placement,
        generation, trigger_key AS "triggerKey",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM listing.recommendation_build_request
      WHERE store_id = ${this.storeId}::uuid
        AND anchor_product_id = ${anchorProductId}::uuid
        AND placement = ${placement}
      FOR UPDATE
    `);
    const row = rows[0];
    if (!row) throw new Error("Recommendation build request mutex is missing");
    return row;
  }

  async request(
    anchorProductId: string,
    placement: RecommendationPlacement,
    triggerKey: string,
  ): Promise<RecommendationRequestGeneration> {
    const locked = await this.lockOrCreateMutex(anchorProductId, placement);
    if (locked.triggerKey === triggerKey) return toGeneration(locked);
    const [row] = await this.connection
      .update(recommendationBuildRequest)
      .set({
        generation: sql`${recommendationBuildRequest.generation} + 1`,
        triggerKey,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(recommendationBuildRequest.storeId, this.storeId),
          eq(recommendationBuildRequest.requestId, locked.requestId),
        ),
      )
      .returning();
    if (!row) throw new Error("Recommendation build request update returned no row");
    return toGeneration(row);
  }

  @ReadOnly()
  async find(
    anchorProductId: string,
    placement: RecommendationPlacement,
  ): Promise<RecommendationBuildRequest | null> {
    const [row] = await this.connection
      .select()
      .from(recommendationBuildRequest)
      .where(
        and(
          eq(recommendationBuildRequest.storeId, this.storeId),
          eq(recommendationBuildRequest.anchorProductId, anchorProductId),
          eq(recommendationBuildRequest.placement, placement),
        ),
      )
      .limit(1);
    return row ?? null;
  }
}

function toGeneration(row: RecommendationBuildRequest): RecommendationRequestGeneration {
  return {
    requestId: row.requestId,
    anchorProductId: row.anchorProductId,
    placement: row.placement,
    generation: row.generation.toString(),
    triggerKey: row.triggerKey,
  };
}

import { ReadOnly } from "@shopana/shared-kernel";
import { and, asc, count, eq, gt, inArray, or, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  manualProductRecommendation,
  productListingIndex,
  type ManualProductRecommendation,
  type RecommendationPlacement,
} from "../models/index.js";
import type { ManualRecommendationInput } from "./types.js";

export class ManualProductRecommendationRepository extends BaseRepository {
  @ReadOnly()
  async findById(id: string): Promise<ManualProductRecommendation | null> {
    const [row] = await this.connection
      .select()
      .from(manualProductRecommendation)
      .where(
        and(
          eq(manualProductRecommendation.storeId, this.storeId),
          eq(manualProductRecommendation.recommendationId, id),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<ManualProductRecommendation[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(manualProductRecommendation)
      .where(
        and(
          eq(manualProductRecommendation.storeId, this.storeId),
          inArray(manualProductRecommendation.recommendationId, [...ids]),
        ),
      );
  }

  @ReadOnly()
  async listPage(input: {
    anchorProductId: string;
    placement: RecommendationPlacement;
    afterId?: string;
    first: number;
  }): Promise<{ rows: ManualProductRecommendation[]; nextCursor: string | null }> {
    const rows = await this.connection
      .select()
      .from(manualProductRecommendation)
      .where(
        and(
          eq(manualProductRecommendation.storeId, this.storeId),
          eq(manualProductRecommendation.anchorProductId, input.anchorProductId),
          eq(manualProductRecommendation.placement, input.placement),
          input.afterId
            ? gt(manualProductRecommendation.recommendationId, input.afterId)
            : undefined,
        ),
      )
      .orderBy(asc(manualProductRecommendation.recommendationId))
      .limit(input.first + 1);
    const page = rows.slice(0, input.first);
    return {
      rows: page,
      nextCursor: rows.length > input.first
        ? page.at(-1)?.recommendationId ?? null
        : null,
    };
  }

  @ReadOnly()
  async listEffective(input: {
    anchorProductId: string;
    placement: RecommendationPlacement;
    asOf: string;
  }): Promise<ManualProductRecommendation[]> {
    return this.connection
      .select()
      .from(manualProductRecommendation)
      .where(
        and(
          eq(manualProductRecommendation.storeId, this.storeId),
          eq(manualProductRecommendation.anchorProductId, input.anchorProductId),
          eq(manualProductRecommendation.placement, input.placement),
          eq(manualProductRecommendation.enabled, true),
          eq(manualProductRecommendation.anchorReferenceStatus, "VALID"),
          eq(manualProductRecommendation.targetReferenceStatus, "VALID"),
          or(
            sql`${manualProductRecommendation.startsAt} IS NULL`,
            sql`${manualProductRecommendation.startsAt} <= ${input.asOf}::timestamptz`,
          ),
          or(
            sql`${manualProductRecommendation.endsAt} IS NULL`,
            sql`${manualProductRecommendation.endsAt} > ${input.asOf}::timestamptz`,
          ),
        ),
      )
      .orderBy(asc(manualProductRecommendation.recommendationId));
  }

  @ReadOnly()
  async countForAnchorPlacement(
    anchorProductId: string,
    placement: RecommendationPlacement,
  ): Promise<number> {
    const [row] = await this.connection
      .select({ value: count() })
      .from(manualProductRecommendation)
      .where(
        and(
          eq(manualProductRecommendation.storeId, this.storeId),
          eq(manualProductRecommendation.anchorProductId, anchorProductId),
          eq(manualProductRecommendation.placement, placement),
        ),
      );
    return Number(row?.value ?? 0);
  }

  @ReadOnly()
  async hasPinBeyondMaximum(
    placement: RecommendationPlacement,
    maximumResults: number,
  ): Promise<boolean> {
    const rows = await this.connection.execute<{ exists: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1 FROM listing.manual_product_recommendation
        WHERE store_id = ${this.storeId}::uuid AND placement = ${placement}
          AND action = 'PIN' AND enabled = true
          AND anchor_reference_status = 'VALID'
          AND target_reference_status = 'VALID'
          AND position > ${maximumResults}
          AND (ends_at IS NULL OR ends_at > now())
      ) AS "exists"
    `);
    return rows[0]?.exists ?? false;
  }

  @ReadOnly()
  async findOwnedProductIds(ids: readonly string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.connection
      .select({ id: productListingIndex.productId })
      .from(productListingIndex)
      .where(
        and(
          eq(productListingIndex.storeId, this.storeId),
          inArray(productListingIndex.productId, [...new Set(ids)]),
        ),
      );
    return new Set(rows.map((row) => row.id));
  }

  async create(input: ManualRecommendationInput): Promise<ManualProductRecommendation> {
    const recommendationId = await this.generateUuidV7();
    const [row] = await this.connection
      .insert(manualProductRecommendation)
      .values({
        recommendationId,
        storeId: this.storeId,
        ...input,
        anchorReferenceStatus: "VALID",
        targetReferenceStatus: "VALID",
        version: 1,
        createdAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .returning();
    if (!row) throw new Error("Manual recommendation insert returned no row");
    return row;
  }

  async update(
    id: string,
    expectedVersion: number,
    patch: Partial<Omit<ManualRecommendationInput, "anchorProductId" | "placement">>,
  ): Promise<ManualProductRecommendation | null> {
    const [row] = await this.connection
      .update(manualProductRecommendation)
      .set({
        ...patch,
        version: sql`${manualProductRecommendation.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(manualProductRecommendation.storeId, this.storeId),
          eq(manualProductRecommendation.recommendationId, id),
          eq(manualProductRecommendation.version, expectedVersion),
        ),
      )
      .returning();
    return row ?? null;
  }

  async delete(id: string, expectedVersion: number): Promise<string | null> {
    const [row] = await this.connection
      .delete(manualProductRecommendation)
      .where(
        and(
          eq(manualProductRecommendation.storeId, this.storeId),
          eq(manualProductRecommendation.recommendationId, id),
          eq(manualProductRecommendation.version, expectedVersion),
        ),
      )
      .returning({ id: manualProductRecommendation.recommendationId });
    return row?.id ?? null;
  }

  async markReferenceStatus(input: {
    productId: string;
    status: "VALID" | "STALE";
  }): Promise<void> {
    await this.connection
      .update(manualProductRecommendation)
      .set({
        anchorReferenceStatus: sql`CASE WHEN ${manualProductRecommendation.anchorProductId} = ${input.productId}::uuid THEN ${input.status} ELSE ${manualProductRecommendation.anchorReferenceStatus} END`,
        targetReferenceStatus: sql`CASE WHEN ${manualProductRecommendation.targetProductId} = ${input.productId}::uuid THEN ${input.status} ELSE ${manualProductRecommendation.targetReferenceStatus} END`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(manualProductRecommendation.storeId, this.storeId),
          or(
            eq(manualProductRecommendation.anchorProductId, input.productId),
            eq(manualProductRecommendation.targetProductId, input.productId),
          ),
        ),
      );
  }
}

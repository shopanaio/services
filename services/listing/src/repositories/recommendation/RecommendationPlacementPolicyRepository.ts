import { ReadOnly } from "@shopana/shared-kernel";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  recommendationPlacementPolicy,
  recommendationSnapshot,
  type RecommendationPlacement,
  type RecommendationPlacementPolicy,
  type RecommendationStrategy,
} from "../models/recommendationRuntime.js";

export interface PolicyWriteInput {
  placement: RecommendationPlacement;
  strategy: RecommendationStrategy;
  minimumResults: number;
  maximumResults: number;
  fallbackChain: string[];
}

export class RecommendationPlacementPolicyRepository extends BaseRepository {
  @ReadOnly()
  async findByPlacement(
    placement: RecommendationPlacement,
  ): Promise<RecommendationPlacementPolicy | null> {
    const [row] = await this.connection
      .select()
      .from(recommendationPlacementPolicy)
      .where(
        and(
          eq(recommendationPlacementPolicy.storeId, this.storeId),
          eq(recommendationPlacementPolicy.placement, placement),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  @ReadOnly()
  async findById(id: string): Promise<RecommendationPlacementPolicy | null> {
    const [row] = await this.connection
      .select()
      .from(recommendationPlacementPolicy)
      .where(
        and(
          eq(recommendationPlacementPolicy.storeId, this.storeId),
          eq(recommendationPlacementPolicy.policyId, id),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<RecommendationPlacementPolicy[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(recommendationPlacementPolicy)
      .where(
        and(
          eq(recommendationPlacementPolicy.storeId, this.storeId),
          inArray(recommendationPlacementPolicy.policyId, [...ids]),
        ),
      );
  }

  @ReadOnly()
  async list(): Promise<RecommendationPlacementPolicy[]> {
    return this.connection
      .select()
      .from(recommendationPlacementPolicy)
      .where(eq(recommendationPlacementPolicy.storeId, this.storeId))
      .orderBy(asc(recommendationPlacementPolicy.placement));
  }

  async lockByPlacement(
    placement: RecommendationPlacement,
  ): Promise<RecommendationPlacementPolicy | null> {
    await this.connection.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${`${this.storeId}:recommendation-policy:${placement}`}, 0)
      )
    `);
    const rows = await this.connection.execute<RecommendationPlacementPolicy>(sql`
      SELECT
        policy_id AS "policyId",
        store_id AS "storeId",
        placement,
        enabled,
        strategy,
        minimum_results AS "minimumResults",
        maximum_results AS "maximumResults",
        fallback_chain AS "fallbackChain",
        version,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM listing.recommendation_placement_policy
      WHERE store_id = ${this.storeId}::uuid
        AND placement = ${placement}
      FOR UPDATE
    `);
    return rows[0] ?? null;
  }

  async create(input: PolicyWriteInput): Promise<RecommendationPlacementPolicy> {
    const policyId = await this.generateUuidV7();
    const [row] = await this.connection
      .insert(recommendationPlacementPolicy)
      .values({
        policyId,
        storeId: this.storeId,
        ...input,
        enabled: true,
        version: 1,
        createdAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .returning();
    if (!row) throw new Error("Recommendation policy insert returned no row");
    return row;
  }

  async update(
    policyId: string,
    expectedVersion: number,
    input: Omit<PolicyWriteInput, "placement">,
  ): Promise<RecommendationPlacementPolicy | null> {
    const [row] = await this.connection
      .update(recommendationPlacementPolicy)
      .set({
        ...input,
        version: sql`${recommendationPlacementPolicy.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(recommendationPlacementPolicy.storeId, this.storeId),
          eq(recommendationPlacementPolicy.policyId, policyId),
          eq(recommendationPlacementPolicy.version, expectedVersion),
        ),
      )
      .returning();
    return row ?? null;
  }

  async setEnabled(
    policyId: string,
    expectedVersion: number,
    enabled: boolean,
  ): Promise<RecommendationPlacementPolicy | null> {
    const [row] = await this.connection
      .update(recommendationPlacementPolicy)
      .set({
        enabled,
        version: sql`${recommendationPlacementPolicy.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(recommendationPlacementPolicy.storeId, this.storeId),
          eq(recommendationPlacementPolicy.policyId, policyId),
          eq(recommendationPlacementPolicy.version, expectedVersion),
        ),
      )
      .returning();

    if (row && !enabled) {
      await this.connection
        .update(recommendationSnapshot)
        .set({ status: "SUPERSEDED" })
        .where(
          and(
            eq(recommendationSnapshot.storeId, this.storeId),
            eq(recommendationSnapshot.placement, row.placement),
            eq(recommendationSnapshot.status, "ACTIVE"),
          ),
        );
    }
    return row ?? null;
  }
}

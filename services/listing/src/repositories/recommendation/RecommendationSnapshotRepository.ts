import { ReadOnly } from "@shopana/shared-kernel";
import { and, asc, eq, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  recommendationSnapshot,
  recommendationSnapshotItem,
  type RecommendationBuildRequest,
  type RecommendationCalculationRun,
  type RecommendationPlacement,
  type RecommendationPlacementPolicy,
  type RecommendationSnapshot,
  type RecommendationSnapshotItem,
} from "../models/recommendationRuntime.js";
import {
  canonicalByteLength,
  sha256Canonical,
} from "../../recommendation/canonical.js";
import {
  MAX_RECOMMENDATION_ITEM_BYTES,
  MAX_RECOMMENDATION_SNAPSHOT_BYTES,
} from "../../recommendation/constants.js";
import { RecommendationIntegrityError } from "../../recommendation/errors.js";
import type {
  RankedRecommendationCandidate,
  RecommendationBuildInputs,
} from "./types.js";

export interface SnapshotActivationLocks {
  policy: RecommendationPlacementPolicy | null;
  request: RecommendationBuildRequest | null;
  run: RecommendationCalculationRun | null;
  snapshot: RecommendationSnapshot | null;
  activationAsOf: string;
}

export class RecommendationSnapshotRepository extends BaseRepository {
  @ReadOnly()
  async findById(snapshotId: string): Promise<RecommendationSnapshot | null> {
    const [row] = await this.connection
      .select()
      .from(recommendationSnapshot)
      .where(
        and(
          eq(recommendationSnapshot.storeId, this.storeId),
          eq(recommendationSnapshot.snapshotId, snapshotId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  @ReadOnly()
  async findActive(
    anchorProductId: string,
    placement: RecommendationPlacement,
  ): Promise<RecommendationSnapshot | null> {
    const [row] = await this.connection
      .select()
      .from(recommendationSnapshot)
      .where(
        and(
          eq(recommendationSnapshot.storeId, this.storeId),
          eq(recommendationSnapshot.anchorProductId, anchorProductId),
          eq(recommendationSnapshot.placement, placement),
          eq(recommendationSnapshot.status, "ACTIVE"),
          sql`(${recommendationSnapshot.expiresAt} IS NULL OR ${recommendationSnapshot.expiresAt} > now())`,
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async create(input: {
    anchorProductId: string;
    placement: RecommendationPlacement;
    policy: RecommendationPlacementPolicy;
    buildInputs: RecommendationBuildInputs;
    buildKey: string;
  }): Promise<RecommendationSnapshot> {
    const existingRows = await this.connection.execute<RecommendationSnapshot>(sql`
      SELECT snapshot_id AS "snapshotId", store_id AS "storeId",
        anchor_product_id AS "anchorProductId", placement, status, strategy,
        policy_id AS "policyId", policy_version AS "policyVersion",
        calculation_run_id AS "calculationRunId", ranker_type AS "rankerType",
        model_version AS "modelVersion", build_key AS "buildKey",
        source_watermarks AS "sourceWatermarks", item_count AS "itemCount",
        content_hash AS "contentHash", generated_at AS "generatedAt",
        activated_at AS "activatedAt", expires_at AS "expiresAt",
        failure_code AS "failureCode"
      FROM listing.recommendation_snapshot
      WHERE store_id = ${this.storeId}::uuid
        AND anchor_product_id = ${input.anchorProductId}::uuid
        AND placement = ${input.placement} AND build_key = ${input.buildKey}
    `);
    if (existingRows[0]) return existingRows[0];
    const snapshotId = await this.generateUuidV7();
    const [row] = await this.connection
      .insert(recommendationSnapshot)
      .values({
        snapshotId,
        storeId: this.storeId,
        anchorProductId: input.anchorProductId,
        placement: input.placement,
        status: "BUILDING",
        strategy: input.policy.strategy,
        policyId: input.policy.policyId,
        policyVersion: input.policy.version,
        calculationRunId: input.buildInputs.calculationRunId,
        rankerType: "RULES",
        modelVersion: input.buildInputs.modelVersion,
        buildKey: input.buildKey,
        sourceWatermarks: { version: 1, ...input.buildInputs },
        itemCount: 0,
        contentHash: null,
        generatedAt: input.buildInputs.asOf,
        activatedAt: null,
        expiresAt: null,
        failureCode: null,
      })
      .returning();
    if (!row) throw new Error("Recommendation snapshot insert returned no row");
    return row;
  }

  async populate(
    snapshotId: string,
    items: readonly RankedRecommendationCandidate[],
  ): Promise<{ itemCount: number; contentHash: string }> {
    const lockedRows = await this.connection.execute<RecommendationSnapshot>(sql`
      SELECT snapshot_id AS "snapshotId", store_id AS "storeId",
        anchor_product_id AS "anchorProductId", placement, status, strategy,
        policy_id AS "policyId", policy_version AS "policyVersion",
        calculation_run_id AS "calculationRunId", ranker_type AS "rankerType",
        model_version AS "modelVersion", build_key AS "buildKey",
        source_watermarks AS "sourceWatermarks", item_count AS "itemCount",
        content_hash AS "contentHash", generated_at AS "generatedAt",
        activated_at AS "activatedAt", expires_at AS "expiresAt",
        failure_code AS "failureCode"
      FROM listing.recommendation_snapshot
      WHERE store_id = ${this.storeId}::uuid AND snapshot_id = ${snapshotId}::uuid
      FOR UPDATE
    `);
    const snapshot = lockedRows[0];
    if (!snapshot || snapshot.status !== "BUILDING") {
      throw new RecommendationIntegrityError("INVALID_SNAPSHOT_CONTENT", "Snapshot is not populateable");
    }
    if (snapshot.contentHash !== null) return this.verifyPersisted(snapshot);
    const existing = await this.listItems(snapshotId);
    if (existing.length > 0) {
      throw new RecommendationIntegrityError("INVALID_SNAPSHOT_CONTENT", "Snapshot has items without a content hash");
    }
    validateContent(items);
    const contentHash = snapshotContentHash(items);
    const ids = await this.generateUuidV7s(items.length);
    if (items.length > 0) {
      await this.connection.insert(recommendationSnapshotItem).values(
        items.map((item, index) => ({
          snapshotItemId: ids[index]!,
          snapshotId,
          targetProductId: item.targetProductId,
          rank: item.rank,
          score: item.score,
          primarySource: item.primarySource,
          pinned: item.pinned,
          features: item.features,
          sourceBreakdown: item.sourceBreakdown,
          createdAt: sql`now()`,
        })),
      );
    }
    await this.connection
      .update(recommendationSnapshot)
      .set({ itemCount: items.length, contentHash })
      .where(
        and(
          eq(recommendationSnapshot.storeId, this.storeId),
          eq(recommendationSnapshot.snapshotId, snapshotId),
          eq(recommendationSnapshot.status, "BUILDING"),
        ),
      );
    return { itemCount: items.length, contentHash };
  }

  @ReadOnly()
  async listItems(snapshotId: string): Promise<RecommendationSnapshotItem[]> {
    return this.connection
      .select({
        snapshotItemId: recommendationSnapshotItem.snapshotItemId,
        snapshotId: recommendationSnapshotItem.snapshotId,
        targetProductId: recommendationSnapshotItem.targetProductId,
        rank: recommendationSnapshotItem.rank,
        score: recommendationSnapshotItem.score,
        primarySource: recommendationSnapshotItem.primarySource,
        pinned: recommendationSnapshotItem.pinned,
        features: recommendationSnapshotItem.features,
        sourceBreakdown: recommendationSnapshotItem.sourceBreakdown,
        createdAt: recommendationSnapshotItem.createdAt,
      })
      .from(recommendationSnapshotItem)
      .innerJoin(
        recommendationSnapshot,
        and(
          eq(recommendationSnapshot.snapshotId, recommendationSnapshotItem.snapshotId),
          eq(recommendationSnapshot.storeId, this.storeId),
        ),
      )
      .where(eq(recommendationSnapshotItem.snapshotId, snapshotId))
      .orderBy(asc(recommendationSnapshotItem.rank));
  }

  async markReady(snapshotId: string): Promise<void> {
    const rows = await this.connection.execute<{ snapshotId: string }>(sql`
      UPDATE listing.recommendation_snapshot
      SET status = 'READY'
      WHERE store_id = ${this.storeId}::uuid AND snapshot_id = ${snapshotId}::uuid
        AND status = 'BUILDING' AND content_hash IS NOT NULL
      RETURNING snapshot_id AS "snapshotId"
    `);
    if (!rows[0]) throw new Error("Recommendation snapshot is not readyable");
  }

  async lockActivationLineage(input: {
    snapshotId: string;
    placement: RecommendationPlacement;
    anchorProductId: string;
    calculationRunId: string | null;
  }): Promise<SnapshotActivationLocks> {
    const policyRows = await this.connection.execute<RecommendationPlacementPolicy>(sql`
      SELECT policy_id AS "policyId", store_id AS "storeId", placement, enabled,
        strategy, minimum_results AS "minimumResults", maximum_results AS "maximumResults",
        fallback_chain AS "fallbackChain", version, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM listing.recommendation_placement_policy
      WHERE store_id = ${this.storeId}::uuid AND placement = ${input.placement}
      FOR UPDATE
    `);
    const requestRows = await this.connection.execute<RecommendationBuildRequest>(sql`
      SELECT request_id AS "requestId", store_id AS "storeId",
        anchor_product_id AS "anchorProductId", placement, generation,
        trigger_key AS "triggerKey", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM listing.recommendation_build_request
      WHERE store_id = ${this.storeId}::uuid
        AND anchor_product_id = ${input.anchorProductId}::uuid
        AND placement = ${input.placement}
      FOR UPDATE
    `);
    const runRows = input.calculationRunId
      ? await this.connection.execute<RecommendationCalculationRun>(sql`
          SELECT * FROM listing.recommendation_calculation_run
          WHERE store_id = ${this.storeId}::uuid AND run_id = ${input.calculationRunId}::uuid
          FOR UPDATE
        `)
      : [];
    const snapshotRows = await this.connection.execute<RecommendationSnapshot>(sql`
      SELECT snapshot_id AS "snapshotId", store_id AS "storeId",
        anchor_product_id AS "anchorProductId", placement, status, strategy,
        policy_id AS "policyId", policy_version AS "policyVersion",
        calculation_run_id AS "calculationRunId", ranker_type AS "rankerType",
        model_version AS "modelVersion", build_key AS "buildKey",
        source_watermarks AS "sourceWatermarks", item_count AS "itemCount",
        content_hash AS "contentHash", generated_at AS "generatedAt",
        activated_at AS "activatedAt", expires_at AS "expiresAt",
        failure_code AS "failureCode"
      FROM listing.recommendation_snapshot
      WHERE store_id = ${this.storeId}::uuid AND snapshot_id = ${input.snapshotId}::uuid
      FOR UPDATE
    `);
    const clock = await this.connection.execute<{ now: string }>(sql`SELECT now() AS "now"`);
    return {
      policy: policyRows[0] ?? null,
      request: requestRows[0] ?? null,
      run: runRows[0] ?? null,
      snapshot: snapshotRows[0] ?? null,
      activationAsOf: clock[0]!.now,
    };
  }

  async activate(snapshotId: string): Promise<void> {
    const snapshot = await this.findById(snapshotId);
    if (!snapshot) throw new Error("Recommendation snapshot not found");
    await this.connection.execute(sql`
      UPDATE listing.recommendation_snapshot
      SET status = 'SUPERSEDED'
      WHERE store_id = ${this.storeId}::uuid
        AND anchor_product_id = ${snapshot.anchorProductId}::uuid
        AND placement = ${snapshot.placement}
        AND status = 'ACTIVE'
        AND snapshot_id <> ${snapshotId}::uuid
    `);
    const rows = await this.connection.execute<{ snapshotId: string }>(sql`
      UPDATE listing.recommendation_snapshot
      SET status = 'ACTIVE', activated_at = now()
      WHERE store_id = ${this.storeId}::uuid AND snapshot_id = ${snapshotId}::uuid
        AND status = 'READY'
      RETURNING snapshot_id AS "snapshotId"
    `);
    if (!rows[0]) throw new Error("Recommendation snapshot activation conflict");
  }

  async markFailed(snapshotId: string, failureCode: string): Promise<void> {
    await this.connection.execute(sql`
      UPDATE listing.recommendation_snapshot
      SET status = 'FAILED', failure_code = ${failureCode}
      WHERE store_id = ${this.storeId}::uuid AND snapshot_id = ${snapshotId}::uuid
        AND status IN ('BUILDING', 'READY')
    `);
  }

  async supersedeAnchor(anchorProductId: string): Promise<void> {
    await this.connection.execute(sql`
      UPDATE listing.recommendation_snapshot SET status = 'SUPERSEDED'
      WHERE store_id = ${this.storeId}::uuid
        AND anchor_product_id = ${anchorProductId}::uuid AND status = 'ACTIVE'
    `);
  }

  private async verifyPersisted(
    snapshot: RecommendationSnapshot,
  ): Promise<{ itemCount: number; contentHash: string }> {
    const items = await this.listItems(snapshot.snapshotId);
    const contentHash = snapshotContentHash(items.map((item) => ({
      targetProductId: item.targetProductId,
      rank: item.rank,
      score: item.score,
      primarySource: item.primarySource,
      pinned: item.pinned,
      features: item.features,
      sourceBreakdown: item.sourceBreakdown,
    })));
    if (items.length !== snapshot.itemCount || contentHash !== snapshot.contentHash) {
      throw new RecommendationIntegrityError("INVALID_SNAPSHOT_CONTENT", "Persisted snapshot content hash mismatch");
    }
    return { itemCount: items.length, contentHash };
  }
}

function snapshotContentHash(items: readonly Array<{
  targetProductId: string;
  rank: number;
  score: string;
  primarySource: string;
  pinned: boolean;
  features: unknown;
  sourceBreakdown: unknown;
}>): string {
  return sha256Canonical(items.map((item) => ({
    targetProductId: item.targetProductId,
    rank: item.rank,
    score: item.score,
    primarySource: item.primarySource,
    pinned: item.pinned,
    features: item.features,
    sourceBreakdown: item.sourceBreakdown,
  })));
}

function validateContent(items: readonly RankedRecommendationCandidate[]): void {
  const targets = new Set<string>();
  let expectedRank = 1;
  let totalBytes = 0;
  for (const item of items) {
    if (item.rank !== expectedRank++ || targets.has(item.targetProductId)) {
      throw new RecommendationIntegrityError("INVALID_SNAPSHOT_CONTENT", "Recommendation ranks or targets are invalid");
    }
    targets.add(item.targetProductId);
    const bytes = canonicalByteLength(item);
    if (bytes > MAX_RECOMMENDATION_ITEM_BYTES) {
      throw new RecommendationIntegrityError("INVALID_SNAPSHOT_CONTENT", "Recommendation item exceeds byte limit");
    }
    totalBytes += bytes;
  }
  if (totalBytes > MAX_RECOMMENDATION_SNAPSHOT_BYTES) {
    throw new RecommendationIntegrityError("INVALID_SNAPSHOT_CONTENT", "Recommendation snapshot exceeds byte limit");
  }
}

import { ReadOnly } from "@shopana/shared-kernel";
import { and, desc, eq, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  recommendationCalculationRun,
  type RecommendationCalculationRun,
  type RecommendationMaterializationPhase,
} from "../models/recommendationRuntime.js";

export class RecommendationCalculationRunRepository extends BaseRepository {
  @ReadOnly()
  async currentWindow(windowDays: number): Promise<{
    windowStartedAt: string;
    windowEndedAt: string;
  }> {
    const rows = await this.connection.execute<{
      windowStartedAt: string;
      windowEndedAt: string;
    }>(sql`
      SELECT
        (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
          - make_interval(days => ${windowDays})) AS "windowStartedAt",
        date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
          AS "windowEndedAt"
    `);
    const row = rows[0];
    if (!row) throw new Error("Database clock did not return a calculation window");
    return row;
  }

  @ReadOnly()
  async databaseNow(): Promise<string> {
    const rows = await this.connection.execute<{ now: string }>(sql`SELECT now() AS "now"`);
    if (!rows[0]) throw new Error("Database clock did not return a timestamp");
    return rows[0].now;
  }
  @ReadOnly()
  async findById(runId: string): Promise<RecommendationCalculationRun | null> {
    const [row] = await this.connection
      .select()
      .from(recommendationCalculationRun)
      .where(
        and(
          eq(recommendationCalculationRun.storeId, this.storeId),
          eq(recommendationCalculationRun.runId, runId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  @ReadOnly()
  async findByIdempotencyKey(key: string): Promise<RecommendationCalculationRun | null> {
    const [row] = await this.connection
      .select()
      .from(recommendationCalculationRun)
      .where(
        and(
          eq(recommendationCalculationRun.storeId, this.storeId),
          eq(recommendationCalculationRun.calculationType, "FREQUENTLY_BOUGHT_TOGETHER"),
          eq(recommendationCalculationRun.idempotencyKey, key),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  @ReadOnly()
  async findActive(): Promise<RecommendationCalculationRun | null> {
    const [row] = await this.connection
      .select()
      .from(recommendationCalculationRun)
      .where(
        and(
          eq(recommendationCalculationRun.storeId, this.storeId),
          eq(recommendationCalculationRun.calculationType, "FREQUENTLY_BOUGHT_TOGETHER"),
          eq(recommendationCalculationRun.status, "ACTIVE"),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  @ReadOnly()
  async findLatestCurrentDay(windowEndedAt: string): Promise<RecommendationCalculationRun | null> {
    const [row] = await this.connection
      .select()
      .from(recommendationCalculationRun)
      .where(
        and(
          eq(recommendationCalculationRun.storeId, this.storeId),
          eq(recommendationCalculationRun.calculationType, "FREQUENTLY_BOUGHT_TOGETHER"),
          eq(recommendationCalculationRun.windowEndedAt, windowEndedAt),
        ),
      )
      .orderBy(desc(recommendationCalculationRun.sourceIngestionWatermark))
      .limit(1);
    return row ?? null;
  }

  async create(input: {
    algorithmVersion: string;
    windowStartedAt: string;
    windowEndedAt: string;
    sourceIngestionWatermark: bigint;
    idempotencyKey: string;
  }): Promise<RecommendationCalculationRun> {
    const existing = await this.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;
    const runId = await this.generateUuidV7();
    const [row] = await this.connection
      .insert(recommendationCalculationRun)
      .values({
        runId,
        storeId: this.storeId,
        calculationType: "FREQUENTLY_BOUGHT_TOGETHER",
        status: "BUILDING",
        algorithmVersion: input.algorithmVersion,
        windowStartedAt: input.windowStartedAt,
        windowEndedAt: input.windowEndedAt,
        sourceIngestionWatermark: input.sourceIngestionWatermark,
        sourceEventTimeWatermark: null,
        idempotencyKey: input.idempotencyKey,
        productCount: 0,
        pairCount: 0n,
        materializationPhase: "ACCUMULATE",
        orderProgressAfter: null,
        orderCount: 0n,
        productProgressAfter: null,
        pairProgressAnchorAfter: null,
        pairProgressTargetAfter: null,
        startedAt: sql`now()`,
        completedAt: null,
        activatedAt: null,
        statisticsPurgedAt: null,
        failureCode: null,
        createdAt: sql`now()`,
      })
      .returning();
    if (!row) throw new Error("Recommendation calculation run insert returned no row");
    return row;
  }

  async setPhase(
    runId: string,
    expected: RecommendationMaterializationPhase,
    next: RecommendationMaterializationPhase,
  ): Promise<void> {
    const order = ["ACCUMULATE", "PRODUCTS", "PAIRS", "COMPLETE"];
    if (order.indexOf(next) !== order.indexOf(expected) + 1) {
      throw new Error("Recommendation calculation phase transition is invalid");
    }
    const rows = await this.connection.execute<{ runId: string }>(sql`
      UPDATE listing.recommendation_calculation_run
      SET materialization_phase = ${next}
      WHERE store_id = ${this.storeId}::uuid
        AND run_id = ${runId}::uuid
        AND status = 'BUILDING'
        AND materialization_phase = ${expected}
      RETURNING run_id AS "runId"
    `);
    if (!rows[0]) throw new Error("Recommendation calculation phase conflict");
  }

  async markReady(runId: string, productCount: number, pairCount: bigint): Promise<void> {
    const rows = await this.connection.execute<{ runId: string }>(sql`
      UPDATE listing.recommendation_calculation_run
      SET status = 'READY', product_count = ${productCount}, pair_count = ${pairCount},
        completed_at = now()
      WHERE store_id = ${this.storeId}::uuid
        AND run_id = ${runId}::uuid
        AND status = 'BUILDING'
        AND materialization_phase = 'COMPLETE'
      RETURNING run_id AS "runId"
    `);
    if (!rows[0]) throw new Error("Recommendation calculation run is not readyable");
  }

  async activate(runId: string): Promise<void> {
    const rows = await this.connection.execute<{ runId: string }>(sql`
      SELECT run_id AS "runId"
      FROM listing.recommendation_calculation_run
      WHERE store_id = ${this.storeId}::uuid
        AND calculation_type = 'FREQUENTLY_BOUGHT_TOGETHER'
        AND (status = 'ACTIVE' OR run_id = ${runId}::uuid)
      ORDER BY run_id
      FOR UPDATE
    `);
    if (!rows.some((row) => row.runId === runId)) {
      throw new Error("Recommendation calculation run was not found for activation");
    }
    await this.connection.execute(sql`
      UPDATE listing.recommendation_calculation_run
      SET status = 'SUPERSEDED'
      WHERE store_id = ${this.storeId}::uuid
        AND calculation_type = 'FREQUENTLY_BOUGHT_TOGETHER'
        AND status = 'ACTIVE'
        AND run_id <> ${runId}::uuid
    `);
    const activated = await this.connection.execute<{ runId: string }>(sql`
      UPDATE listing.recommendation_calculation_run
      SET status = 'ACTIVE', activated_at = now()
      WHERE store_id = ${this.storeId}::uuid
        AND run_id = ${runId}::uuid
        AND status = 'READY'
      RETURNING run_id AS "runId"
    `);
    if (!activated[0]) throw new Error("Recommendation calculation run activation conflict");
  }

  async markFailed(
    runId: string,
    code: "CALCULATION_FAILED" | "INVALID_CALCULATION_RESULT",
  ): Promise<void> {
    await this.connection.execute(sql`
      UPDATE listing.recommendation_calculation_run
      SET status = 'FAILED', failure_code = ${code}, completed_at = now()
      WHERE store_id = ${this.storeId}::uuid
        AND run_id = ${runId}::uuid
        AND status IN ('BUILDING', 'READY')
    `);
  }
}

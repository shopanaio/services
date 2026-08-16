import { createHash } from "node:crypto";
import {
  addCalendarDate,
  evaluateSegmentTemporalBoundary,
  nextCalendarDayStartUtc,
  parseCalendarDate,
  type SegmentDefinitionV1,
  type SegmentDependency,
  type SegmentExpression,
  type SegmentStoreEvaluationContext,
  type SegmentValue,
  startOfCalendarDayUtc,
} from "@shopana/customer-segment-dsl";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import {
  and,
  asc,
  eq,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import { compileCustomerSegmentMatchQuery } from "../../segments/compiler.js";
import {
  customerSegment,
  customerSegmentEvaluationLock,
  customerSegmentEvaluationState,
  customerSegmentMaterializationRun,
  customerSegmentMembership,
  customerSegmentReevaluationQueue,
  customerSegmentTemporalSchedule,
  customerGroupMembership,
  customerTaxExemption,
  customerTaxIdentifier,
  type CustomerSegment,
  type CustomerSegmentMaterializationRun,
  type CustomerSegmentReevaluationQueue,
  type CustomerSegmentTemporalSchedule,
} from "../models/index.js";

export class CustomerSegmentMaterializationRepository extends BaseRepository {
  async failSegment(segmentId: string): Promise<void> {
    await this.connection
      .update(customerSegment)
      .set({ materializationStatus: "FAILED", updatedAt: new Date().toISOString() })
      .where(and(
        eq(customerSegment.storeId, this.storeId),
        eq(customerSegment.id, segmentId),
        eq(customerSegment.type, "DYNAMIC"),
        isNull(customerSegment.deletedAt),
      ));
  }

  async failCurrencyDependentSegments(): Promise<number> {
    const segments = await this.connection
      .select()
      .from(customerSegment)
      .where(and(
        eq(customerSegment.storeId, this.storeId),
        eq(customerSegment.type, "DYNAMIC"),
        isNull(customerSegment.deletedAt),
      ));
    const ids = segments
      .filter((segment) => {
        const definition = segment.definition as unknown as SegmentDefinitionV1;
        return definition.contextDependencies?.includes("currency");
      })
      .map((segment) => segment.id);
    if (ids.length === 0) return 0;
    const rows = await this.connection
      .update(customerSegment)
      .set({ materializationStatus: "FAILED", updatedAt: new Date().toISOString() })
      .where(and(
        eq(customerSegment.storeId, this.storeId),
        inArray(customerSegment.id, ids),
      ))
      .returning({ id: customerSegment.id });
    return rows.length;
  }

  async schedule(
    segment: CustomerSegment,
    effectiveAt: string,
    retry = false,
  ): Promise<void> {
    if (segment.type !== "DYNAMIC" || segment.status !== "ACTIVE") return;
    const sequence = await this.nextCauseSequence();
    const insert = this.connection
      .insert(customerSegmentMaterializationRun)
      .values({
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        segmentId: segment.id,
        definitionRevision: segment.definitionRevision,
        evaluationGeneration: segment.evaluationGeneration,
        causeSequence: sequence,
        scanEffectiveAt: effectiveAt,
        status: "PENDING",
      });
    if (retry) {
      await insert.onConflictDoUpdate({
        target: [
          customerSegmentMaterializationRun.storeId,
          customerSegmentMaterializationRun.segmentId,
          customerSegmentMaterializationRun.evaluationGeneration,
        ],
        set: {
          status: "PENDING",
          scanCursor: null,
          scanCompletedAt: null,
          queueWatermark: null,
          publicationEffectiveAt: null,
          attemptCount: 0,
          leaseUntil: null,
          claimedBy: null,
          lastError: null,
          scanEffectiveAt: effectiveAt,
          causeSequence: sequence,
          updatedAt: new Date().toISOString(),
        },
      });
      await this.connection
        .update(customerSegment)
        .set({ materializationStatus: "PENDING", updatedAt: new Date().toISOString() })
        .where(and(
          eq(customerSegment.storeId, this.storeId),
          eq(customerSegment.id, segment.id),
          eq(customerSegment.definitionRevision, segment.definitionRevision),
          eq(customerSegment.evaluationGeneration, segment.evaluationGeneration),
        ));
    } else {
      await insert.onConflictDoNothing();
    }
  }

  @Transactional()
  async claimRun(
    workerId: string,
    leaseUntil: string,
  ): Promise<CustomerSegmentMaterializationRun | null> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .select()
      .from(customerSegmentMaterializationRun)
      .where(and(
        eq(customerSegmentMaterializationRun.storeId, this.storeId),
        inArray(customerSegmentMaterializationRun.status, ["PENDING", "RUNNING"]),
        or(
          eq(customerSegmentMaterializationRun.claimedBy, workerId),
          isNull(customerSegmentMaterializationRun.leaseUntil),
          lte(customerSegmentMaterializationRun.leaseUntil, now),
        ),
      ))
      .orderBy(asc(customerSegmentMaterializationRun.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });
    const run = rows[0];
    if (!run) return null;
    const claimed = await this.connection
      .update(customerSegmentMaterializationRun)
      .set({
        status: "RUNNING",
        claimedBy: workerId,
        leaseUntil,
        updatedAt: now,
      })
      .where(eq(customerSegmentMaterializationRun.id, run.id))
      .returning();
    await this.connection
      .update(customerSegment)
      .set({ materializationStatus: "RUNNING", updatedAt: now })
      .where(and(
        eq(customerSegment.storeId, this.storeId),
        eq(customerSegment.id, run.segmentId),
        eq(customerSegment.definitionRevision, run.definitionRevision),
        eq(customerSegment.evaluationGeneration, run.evaluationGeneration),
      ));
    return claimed[0] ?? null;
  }

  async advanceRun(runId: string, cursor: string): Promise<void> {
    await this.connection
      .update(customerSegmentMaterializationRun)
      .set({ scanCursor: cursor, updatedAt: new Date().toISOString() })
      .where(and(
        eq(customerSegmentMaterializationRun.storeId, this.storeId),
        eq(customerSegmentMaterializationRun.id, runId),
      ));
  }

  async renewRunLease(
    runId: string,
    workerId: string,
    leaseUntil: string,
  ): Promise<boolean> {
    const rows = await this.connection
      .update(customerSegmentMaterializationRun)
      .set({ leaseUntil, updatedAt: new Date().toISOString() })
      .where(and(
        eq(customerSegmentMaterializationRun.storeId, this.storeId),
        eq(customerSegmentMaterializationRun.id, runId),
        eq(customerSegmentMaterializationRun.claimedBy, workerId),
        eq(customerSegmentMaterializationRun.status, "RUNNING"),
      ))
      .returning({ id: customerSegmentMaterializationRun.id });
    return rows.length === 1;
  }

  async finishScan(runId: string): Promise<{
    readonly watermark: bigint;
    readonly publicationEffectiveAt: string;
  }> {
    const now = new Date().toISOString();
    const rows = await this.connection.execute<{ watermark: string | bigint | null }>(sql`
      SELECT max(sequence) AS watermark
      FROM customers.customer_segment_reevaluation_queue
      WHERE store_id = ${this.storeId}::uuid
    `);
    const watermark = BigInt(rows[0]?.watermark ?? 0);
    await this.connection
      .update(customerSegmentMaterializationRun)
      .set({
        scanCompletedAt: now,
        queueWatermark: watermark,
        publicationEffectiveAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(customerSegmentMaterializationRun.storeId, this.storeId),
        eq(customerSegmentMaterializationRun.id, runId),
      ));
    return { watermark, publicationEffectiveAt: now };
  }

  @ReadOnly()
  async barrierPassed(run: CustomerSegmentMaterializationRun): Promise<boolean> {
    if (run.queueWatermark === null) return false;
    const rows = await this.connection
      .select({ sequence: customerSegmentReevaluationQueue.sequence })
      .from(customerSegmentReevaluationQueue)
      .where(and(
        eq(customerSegmentReevaluationQueue.storeId, this.storeId),
        eq(customerSegmentReevaluationQueue.segmentId, run.segmentId),
        eq(customerSegmentReevaluationQueue.definitionRevision, run.definitionRevision),
        eq(customerSegmentReevaluationQueue.evaluationGeneration, run.evaluationGeneration),
        lte(customerSegmentReevaluationQueue.sequence, run.queueWatermark),
        isNull(customerSegmentReevaluationQueue.completedAt),
      ))
      .limit(1);
    if (rows.length > 0) return false;
    const dueTemporal = await this.connection
      .select({ id: customerSegmentTemporalSchedule.id })
      .from(customerSegmentTemporalSchedule)
      .where(and(
        eq(customerSegmentTemporalSchedule.storeId, this.storeId),
        eq(customerSegmentTemporalSchedule.segmentId, run.segmentId),
        eq(customerSegmentTemporalSchedule.definitionRevision, run.definitionRevision),
        eq(customerSegmentTemporalSchedule.evaluationGeneration, run.evaluationGeneration),
        lte(
          customerSegmentTemporalSchedule.evaluateAt,
          run.publicationEffectiveAt ?? run.scanEffectiveAt,
        ),
      ))
      .limit(1);
    return dueTemporal.length === 0;
  }

  async publishRun(run: CustomerSegmentMaterializationRun): Promise<boolean> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .update(customerSegment)
      .set({ materializationStatus: "READY", updatedAt: now })
      .where(and(
        eq(customerSegment.storeId, this.storeId),
        eq(customerSegment.id, run.segmentId),
        eq(customerSegment.status, "ACTIVE"),
        sql`${customerSegment.materializationStatus} <> 'FAILED'`,
        eq(customerSegment.definitionRevision, run.definitionRevision),
        eq(customerSegment.evaluationGeneration, run.evaluationGeneration),
      ))
      .returning({ id: customerSegment.id });
    if (rows.length === 0) {
      await this.connection
        .update(customerSegmentMaterializationRun)
        .set({
          status: "FAILED",
          lastError: "Materialization publication was blocked by current segment state",
          leaseUntil: null,
          claimedBy: null,
          updatedAt: now,
        })
        .where(and(
          eq(customerSegmentMaterializationRun.storeId, this.storeId),
          eq(customerSegmentMaterializationRun.id, run.id),
        ));
      return false;
    }
    await this.connection
      .update(customerSegmentMaterializationRun)
      .set({
        status: "SUCCEEDED",
        publicationEffectiveAt: run.publicationEffectiveAt ?? now,
        leaseUntil: null,
        claimedBy: null,
        updatedAt: now,
      })
      .where(eq(customerSegmentMaterializationRun.id, run.id));
    return true;
  }

  async failRun(run: CustomerSegmentMaterializationRun, error: unknown): Promise<void> {
    const now = new Date().toISOString();
    const message = error instanceof Error ? error.message : String(error);
    await this.connection
      .update(customerSegmentMaterializationRun)
      .set({ status: "FAILED", lastError: message.slice(0, 8_192), leaseUntil: null, updatedAt: now })
      .where(eq(customerSegmentMaterializationRun.id, run.id));
    await this.connection
      .update(customerSegment)
      .set({ materializationStatus: "FAILED", updatedAt: now })
      .where(and(
        eq(customerSegment.storeId, this.storeId),
        eq(customerSegment.id, run.segmentId),
        eq(customerSegment.definitionRevision, run.definitionRevision),
        eq(customerSegment.evaluationGeneration, run.evaluationGeneration),
      ));
  }

  async recordRunFailure(
    run: CustomerSegmentMaterializationRun,
    error: unknown,
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const nextAttemptCount = run.attemptCount + 1;
    const terminal = nextAttemptCount >= 20;
    const message = error instanceof Error ? error.message : String(error);
    await this.connection
      .update(customerSegmentMaterializationRun)
      .set({
        status: terminal ? "FAILED" : "PENDING",
        attemptCount: nextAttemptCount,
        lastError: message.slice(0, 8_192),
        leaseUntil: null,
        claimedBy: null,
        updatedAt: now,
      })
      .where(and(
        eq(customerSegmentMaterializationRun.storeId, this.storeId),
        eq(customerSegmentMaterializationRun.id, run.id),
      ));
    if (terminal) {
      await this.connection
        .update(customerSegment)
        .set({ materializationStatus: "FAILED", updatedAt: now })
        .where(and(
          eq(customerSegment.storeId, this.storeId),
          eq(customerSegment.id, run.segmentId),
          eq(customerSegment.definitionRevision, run.definitionRevision),
          eq(customerSegment.evaluationGeneration, run.evaluationGeneration),
        ));
    }
    return terminal;
  }

  @Transactional()
  async applyEvaluation(input: {
    readonly segment: CustomerSegment;
    readonly definition: SegmentDefinitionV1;
    readonly storeContext: SegmentStoreEvaluationContext;
    readonly customerId: string;
    readonly effectiveAt: string;
    readonly causeSequence: bigint;
    readonly sourceEventId?: string | null;
    readonly queueSequence?: bigint | null;
    readonly expectedScheduleToken?: string | null;
  }): Promise<boolean> {
    if (input.storeContext.storeId !== this.storeId) {
      throw new Error("Segment evaluation cannot cross tenant boundary");
    }

    await this.connection
      .insert(customerSegmentEvaluationLock)
      .values({
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        customerId: input.customerId,
        segmentId: input.segment.id,
      })
      .onConflictDoNothing();
    await this.connection
      .select({ id: customerSegmentEvaluationLock.id })
      .from(customerSegmentEvaluationLock)
      .where(and(
        eq(customerSegmentEvaluationLock.storeId, this.storeId),
        eq(customerSegmentEvaluationLock.customerId, input.customerId),
        eq(customerSegmentEvaluationLock.segmentId, input.segment.id),
      ))
      .for("update");

    if (input.expectedScheduleToken) {
      const schedules = await this.connection
        .select({ scheduleToken: customerSegmentTemporalSchedule.scheduleToken })
        .from(customerSegmentTemporalSchedule)
        .where(and(
          eq(customerSegmentTemporalSchedule.storeId, this.storeId),
          eq(customerSegmentTemporalSchedule.customerId, input.customerId),
          eq(customerSegmentTemporalSchedule.segmentId, input.segment.id),
        ))
        .limit(1);
      if (schedules[0]?.scheduleToken !== input.expectedScheduleToken) {
        return false;
      }
    }

    // The segment state and customer predicate are deliberately read only
    // after the shared pair lock. Bulk, event and temporal workers therefore
    // cannot publish a result calculated from state observed before a newer
    // invalidation/evaluation of the same pair.
    const current = await this.currentGeneration(input.segment.id);
    if (
      !current ||
      current.status !== "ACTIVE" ||
      current.type !== "DYNAMIC" ||
      current.definitionRevision !== input.segment.definitionRevision ||
      current.evaluationGeneration !== input.segment.evaluationGeneration
    ) {
      await this.completeQueueInTransaction(input.queueSequence);
      return false;
    }

    await this.connection.execute(sql`SELECT set_config('statement_timeout', '10000', true)`);
    const temporal = input.definition.temporal
      ? await evaluateSegmentTemporalBoundary(
          input.definition.root,
          async (leaf) => this.evaluateTemporalLeaf(
            leaf,
            input.definition,
            input.customerId,
            input.storeContext,
            input.effectiveAt,
          ),
        )
      : {
          value: await this.matchesExpression(
            input.definition,
            input.definition.root,
            input.customerId,
            input.storeContext,
            input.effectiveAt,
          ),
          nextChangeAt: null,
        };
    const matched = temporal.value;
    const nextChangeAt = temporal.nextChangeAt;

    const previousStates = await this.connection
      .select({
        definitionRevision: customerSegmentEvaluationState.definitionRevision,
        evaluationGeneration: customerSegmentEvaluationState.evaluationGeneration,
        evaluatedAt: customerSegmentEvaluationState.evaluatedAt,
        causeSequence: customerSegmentEvaluationState.causeSequence,
        evaluatorToken: customerSegmentEvaluationState.evaluatorToken,
      })
      .from(customerSegmentEvaluationState)
      .where(and(
        eq(customerSegmentEvaluationState.storeId, this.storeId),
        eq(customerSegmentEvaluationState.customerId, input.customerId),
        eq(customerSegmentEvaluationState.segmentId, input.segment.id),
      ))
      .limit(1);

    const token = evaluationToken(input);
    const previous = previousStates[0];
    if (
      previous &&
      previous.definitionRevision === input.segment.definitionRevision &&
      previous.evaluationGeneration === input.segment.evaluationGeneration &&
      compareFreshness(
        [previous.evaluatedAt, previous.causeSequence, previous.evaluatorToken],
        [input.effectiveAt, input.causeSequence, token],
      ) > 0
    ) {
      await this.completeQueueInTransaction(input.queueSequence);
      return false;
    }
    await this.connection
      .insert(customerSegmentEvaluationState)
      .values({
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        customerId: input.customerId,
        segmentId: input.segment.id,
        definitionRevision: input.segment.definitionRevision,
        evaluationGeneration: input.segment.evaluationGeneration,
        evaluatedAt: input.effectiveAt,
        matched,
        causeSequence: input.causeSequence,
        evaluatorToken: token,
        sourceEventId: input.sourceEventId ?? null,
        updatedAt: input.effectiveAt,
      })
      .onConflictDoUpdate({
        target: [
          customerSegmentEvaluationState.storeId,
          customerSegmentEvaluationState.segmentId,
          customerSegmentEvaluationState.customerId,
        ],
        set: {
          definitionRevision: input.segment.definitionRevision,
          evaluationGeneration: input.segment.evaluationGeneration,
          evaluatedAt: input.effectiveAt,
          matched,
          causeSequence: input.causeSequence,
          evaluatorToken: token,
          sourceEventId: input.sourceEventId ?? null,
          updatedAt: input.effectiveAt,
        },
      });

    if (matched) {
      await this.connection
        .insert(customerSegmentMembership)
        .values({
          id: await this.generateUuidV7(),
          storeId: this.storeId,
          customerId: input.customerId,
          segmentId: input.segment.id,
          source: "RULE",
          evaluatedAt: input.effectiveAt,
          evaluatedDefinitionRevision: input.segment.definitionRevision,
          evaluatedGeneration: input.segment.evaluationGeneration,
          expiresAt: nextChangeAt,
        })
        .onConflictDoUpdate({
          target: [customerSegmentMembership.customerId, customerSegmentMembership.segmentId],
          set: {
            source: "RULE",
            evaluatedAt: input.effectiveAt,
            evaluatedDefinitionRevision: input.segment.definitionRevision,
            evaluatedGeneration: input.segment.evaluationGeneration,
            expiresAt: nextChangeAt,
          },
        });
    } else {
      await this.connection
        .delete(customerSegmentMembership)
        .where(and(
          eq(customerSegmentMembership.storeId, this.storeId),
          eq(customerSegmentMembership.customerId, input.customerId),
          eq(customerSegmentMembership.segmentId, input.segment.id),
          eq(customerSegmentMembership.source, "RULE"),
        ));
    }

    if (nextChangeAt) {
      const scheduleToken = temporalToken(input, nextChangeAt);
      await this.connection
        .insert(customerSegmentTemporalSchedule)
        .values({
          id: await this.generateUuidV7(),
          storeId: this.storeId,
          customerId: input.customerId,
          segmentId: input.segment.id,
          definitionRevision: input.segment.definitionRevision,
          evaluationGeneration: input.segment.evaluationGeneration,
          evaluateAt: nextChangeAt,
          scheduleToken,
          updatedAt: input.effectiveAt,
        })
        .onConflictDoUpdate({
          target: [
            customerSegmentTemporalSchedule.storeId,
            customerSegmentTemporalSchedule.segmentId,
            customerSegmentTemporalSchedule.customerId,
          ],
          set: {
            definitionRevision: input.segment.definitionRevision,
            evaluationGeneration: input.segment.evaluationGeneration,
            evaluateAt: nextChangeAt,
            scheduleToken,
            attemptCount: 0,
            leaseUntil: null,
            claimedBy: null,
            lastError: null,
            updatedAt: input.effectiveAt,
          },
        });
    } else {
      await this.connection
        .delete(customerSegmentTemporalSchedule)
        .where(and(
          eq(customerSegmentTemporalSchedule.storeId, this.storeId),
          eq(customerSegmentTemporalSchedule.segmentId, input.segment.id),
          eq(customerSegmentTemporalSchedule.customerId, input.customerId),
        ));
    }
    await this.completeQueueInTransaction(input.queueSequence);
    return true;
  }

  private async completeQueueInTransaction(
    sequence: bigint | null | undefined,
  ): Promise<void> {
    if (sequence === null || sequence === undefined) return;
    await this.connection
      .update(customerSegmentReevaluationQueue)
      .set({
        completedAt: sql`transaction_timestamp()`,
        leaseUntil: null,
        claimedBy: null,
        updatedAt: sql`transaction_timestamp()`,
      })
      .where(and(
        eq(customerSegmentReevaluationQueue.storeId, this.storeId),
        eq(customerSegmentReevaluationQueue.sequence, sequence),
      ));
  }

  @Transactional()
  async enqueueCustomer(
    customerId: string,
    dependencies: ReadonlySet<SegmentDependency>,
    sourceEventId: string,
    effectiveAt: string,
  ): Promise<number> {
    // The queue clock is transaction_timestamp() below. Keep this argument in
    // the public event-script contract for diagnostics without trusting a
    // producer timestamp as the DSL evaluation clock.
    void effectiveAt;
    const segments = await this.connection
      .select()
      .from(customerSegment)
      .where(and(
        eq(customerSegment.storeId, this.storeId),
        eq(customerSegment.type, "DYNAMIC"),
        eq(customerSegment.status, "ACTIVE"),
        isNull(customerSegment.deletedAt),
      ));
    const affected = segments.filter((segment) => {
      const definition = segment.definition as unknown as SegmentDefinitionV1;
      return dependencies.has("customer.any") ||
        definition.dependencies?.includes("customer.any") ||
        definition.dependencies?.some((dependency) => dependencies.has(dependency));
    }).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    if (affected.length === 0) return 0;

    await this.lockPairs(customerId, affected.map((segment) => segment.id));

    const inserted = await this.connection
      .insert(customerSegmentReevaluationQueue)
      .values(affected.map((segment) => ({
        storeId: this.storeId,
        customerId,
        segmentId: segment.id,
        definitionRevision: segment.definitionRevision,
        evaluationGeneration: segment.evaluationGeneration,
        sourceEventId,
        requestedEffectiveAt: sql`transaction_timestamp()`,
        availableAt: sql`transaction_timestamp()`,
      })))
      .onConflictDoNothing()
      .returning({ segmentId: customerSegmentReevaluationQueue.segmentId });
    if (inserted.length === 0) return 0;
    const ids = inserted.map((row) => row.segmentId);
    await this.connection
      .delete(customerSegmentMembership)
      .where(and(
        eq(customerSegmentMembership.storeId, this.storeId),
        eq(customerSegmentMembership.customerId, customerId),
        eq(customerSegmentMembership.source, "RULE"),
        inArray(customerSegmentMembership.segmentId, ids),
      ));
    return inserted.length;
  }

  @Transactional()
  async claimQueue(
    workerId: string,
    leaseUntil: string,
    limit = 100,
  ): Promise<readonly CustomerSegmentReevaluationQueue[]> {
    const now = new Date().toISOString();
    await this.connection.execute(sql`
      DELETE FROM customers.customer_segment_reevaluation_queue
      WHERE sequence IN (
        SELECT sequence
        FROM customers.customer_segment_reevaluation_queue
        WHERE store_id = ${this.storeId}::uuid
          AND completed_at < transaction_timestamp() - interval '30 days'
        ORDER BY completed_at, sequence
        LIMIT 500
        FOR UPDATE SKIP LOCKED
      )
    `);
    const rows = await this.connection
      .select()
      .from(customerSegmentReevaluationQueue)
      .where(and(
        eq(customerSegmentReevaluationQueue.storeId, this.storeId),
        isNull(customerSegmentReevaluationQueue.completedAt),
        lte(customerSegmentReevaluationQueue.availableAt, now),
        or(
          isNull(customerSegmentReevaluationQueue.leaseUntil),
          lte(customerSegmentReevaluationQueue.leaseUntil, now),
        ),
      ))
      .orderBy(asc(customerSegmentReevaluationQueue.sequence))
      .limit(limit)
      .for("update", { skipLocked: true });
    if (rows.length === 0) return [];
    const sequences = rows.map((row) => row.sequence);
    const claimed = await this.connection
      .update(customerSegmentReevaluationQueue)
      .set({
        claimedBy: workerId,
        leaseUntil,
        attemptCount: sql`${customerSegmentReevaluationQueue.attemptCount} + 1`,
        updatedAt: now,
      })
      .where(inArray(customerSegmentReevaluationQueue.sequence, sequences))
      .returning();
    return claimed.sort((left, right) => left.sequence < right.sequence ? -1 : left.sequence > right.sequence ? 1 : 0);
  }

  @Transactional()
  async claimTemporal(
    workerId: string,
    leaseUntil: string,
    limit = 100,
  ): Promise<readonly CustomerSegmentTemporalSchedule[]> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .select()
      .from(customerSegmentTemporalSchedule)
      .where(and(
        eq(customerSegmentTemporalSchedule.storeId, this.storeId),
        lte(customerSegmentTemporalSchedule.evaluateAt, now),
        sql`EXISTS (
          SELECT 1
          FROM customers.customer_segment AS active_segment
          WHERE active_segment.store_id = ${this.storeId}::uuid
            AND active_segment.id = ${customerSegmentTemporalSchedule.segmentId}
            AND active_segment.type = 'DYNAMIC'
            AND active_segment.status = 'ACTIVE'
            AND active_segment.materialization_status = 'READY'
            AND active_segment.deleted_at IS NULL
            AND active_segment.definition_revision = ${customerSegmentTemporalSchedule.definitionRevision}
            AND active_segment.evaluation_generation = ${customerSegmentTemporalSchedule.evaluationGeneration}
        )`,
        or(
          isNull(customerSegmentTemporalSchedule.leaseUntil),
          lte(customerSegmentTemporalSchedule.leaseUntil, now),
        ),
      ))
      .orderBy(
        asc(customerSegmentTemporalSchedule.evaluateAt),
        asc(customerSegmentTemporalSchedule.id),
      )
      .limit(limit)
      .for("update", { skipLocked: true });
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const claimed = await this.connection
      .update(customerSegmentTemporalSchedule)
      .set({
        claimedBy: workerId,
        leaseUntil,
        attemptCount: sql`${customerSegmentTemporalSchedule.attemptCount} + 1`,
        updatedAt: now,
      })
      .where(inArray(customerSegmentTemporalSchedule.id, ids))
      .returning();
    return claimed.sort((left, right) => {
      if (left.evaluateAt !== right.evaluateAt) {
        return left.evaluateAt < right.evaluateAt ? -1 : 1;
      }
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    });
  }

  @Transactional()
  async claimTemporalForPublication(
    run: CustomerSegmentMaterializationRun,
    workerId: string,
    leaseUntil: string,
    limit = 100,
  ): Promise<readonly CustomerSegmentTemporalSchedule[]> {
    if (!run.publicationEffectiveAt) return [];
    const now = new Date().toISOString();
    const rows = await this.connection
      .select()
      .from(customerSegmentTemporalSchedule)
      .where(and(
        eq(customerSegmentTemporalSchedule.storeId, this.storeId),
        eq(customerSegmentTemporalSchedule.segmentId, run.segmentId),
        eq(customerSegmentTemporalSchedule.definitionRevision, run.definitionRevision),
        eq(customerSegmentTemporalSchedule.evaluationGeneration, run.evaluationGeneration),
        lte(customerSegmentTemporalSchedule.evaluateAt, run.publicationEffectiveAt),
        or(
          isNull(customerSegmentTemporalSchedule.leaseUntil),
          lte(customerSegmentTemporalSchedule.leaseUntil, now),
        ),
      ))
      .orderBy(
        asc(customerSegmentTemporalSchedule.evaluateAt),
        asc(customerSegmentTemporalSchedule.id),
      )
      .limit(limit)
      .for("update", { skipLocked: true });
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const claimed = await this.connection
      .update(customerSegmentTemporalSchedule)
      .set({
        claimedBy: workerId,
        leaseUntil,
        attemptCount: sql`${customerSegmentTemporalSchedule.attemptCount} + 1`,
        updatedAt: now,
      })
      .where(inArray(customerSegmentTemporalSchedule.id, ids))
      .returning();
    return claimed.sort((left, right) => {
      if (left.evaluateAt !== right.evaluateAt) {
        return left.evaluateAt < right.evaluateAt ? -1 : 1;
      }
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    });
  }

  async completeQueue(sequence: bigint, completedAt: string): Promise<void> {
    await this.connection
      .update(customerSegmentReevaluationQueue)
      .set({ completedAt, leaseUntil: null, claimedBy: null, updatedAt: completedAt })
      .where(and(
        eq(customerSegmentReevaluationQueue.storeId, this.storeId),
        eq(customerSegmentReevaluationQueue.sequence, sequence),
      ));
  }

  async failQueue(
    item: CustomerSegmentReevaluationQueue,
    error: unknown,
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const terminal = item.attemptCount >= 20;
    const message = error instanceof Error ? error.message : String(error);
    await this.connection
      .update(customerSegmentReevaluationQueue)
      .set({
        availableAt: terminal ? item.availableAt : retryAt(item.attemptCount),
        completedAt: terminal ? now : null,
        claimedBy: null,
        leaseUntil: null,
        lastError: message.slice(0, 8_192),
        updatedAt: now,
      })
      .where(and(
        eq(customerSegmentReevaluationQueue.storeId, this.storeId),
        eq(customerSegmentReevaluationQueue.sequence, item.sequence),
      ));
    if (terminal) await this.failCurrentSegment(item, now);
    return terminal;
  }

  async deleteTemporal(id: string, scheduleToken: string): Promise<void> {
    await this.connection
      .delete(customerSegmentTemporalSchedule)
      .where(and(
        eq(customerSegmentTemporalSchedule.storeId, this.storeId),
        eq(customerSegmentTemporalSchedule.id, id),
        eq(customerSegmentTemporalSchedule.scheduleToken, scheduleToken),
      ));
  }

  async failTemporal(
    item: CustomerSegmentTemporalSchedule,
    error: unknown,
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const terminal = item.attemptCount >= 20;
    const message = error instanceof Error ? error.message : String(error);
    await this.connection
      .update(customerSegmentTemporalSchedule)
      .set({
        claimedBy: terminal ? "terminal" : null,
        // Preserve the semantic boundary so publication cannot skip a failed
        // due row. The lease is also the retry-not-before timestamp.
        leaseUntil: terminal
          ? "9999-12-31T23:59:59.999Z"
          : retryAt(item.attemptCount),
        lastError: message.slice(0, 8_192),
        updatedAt: now,
      })
      .where(and(
        eq(customerSegmentTemporalSchedule.storeId, this.storeId),
        eq(customerSegmentTemporalSchedule.id, item.id),
        eq(customerSegmentTemporalSchedule.scheduleToken, item.scheduleToken),
      ));
    if (terminal) await this.failCurrentSegment(item, now);
    return terminal;
  }

  async cleanupCustomer(customerId: string): Promise<void> {
    const segments = await this.connection
      .select({ id: customerSegment.id })
      .from(customerSegment)
      .where(and(
        eq(customerSegment.storeId, this.storeId),
        isNull(customerSegment.deletedAt),
      ))
      .orderBy(asc(customerSegment.id));
    await this.lockPairs(customerId, segments.map((segment) => segment.id));
    await this.connection.delete(customerSegmentReevaluationQueue)
      .where(and(
        eq(customerSegmentReevaluationQueue.storeId, this.storeId),
        eq(customerSegmentReevaluationQueue.customerId, customerId),
      ));
    await this.connection.delete(customerSegmentTemporalSchedule)
      .where(and(
        eq(customerSegmentTemporalSchedule.storeId, this.storeId),
        eq(customerSegmentTemporalSchedule.customerId, customerId),
      ));
    await this.connection.delete(customerSegmentEvaluationState)
      .where(and(
        eq(customerSegmentEvaluationState.storeId, this.storeId),
        eq(customerSegmentEvaluationState.customerId, customerId),
      ));
    await this.connection.delete(customerSegmentEvaluationLock)
      .where(and(
        eq(customerSegmentEvaluationLock.storeId, this.storeId),
        eq(customerSegmentEvaluationLock.customerId, customerId),
      ));
    await this.connection.delete(customerSegmentMembership)
      .where(and(
        eq(customerSegmentMembership.storeId, this.storeId),
        eq(customerSegmentMembership.customerId, customerId),
      ));
  }

  private async matchesExpression(
    definition: SegmentDefinitionV1,
    root: SegmentExpression,
    customerId: string,
    storeContext: SegmentStoreEvaluationContext,
    effectiveAt: string,
  ): Promise<boolean> {
    const matches = await this.connection.execute<{ id: string }>(
      compileCustomerSegmentMatchQuery(
        { ...definition, root },
        customerId,
        { store: storeContext, effectiveAt },
      ),
    );
    return matches.length > 0;
  }

  private async lockPairs(
    customerId: string,
    segmentIds: readonly string[],
  ): Promise<void> {
    const ids = [...new Set(segmentIds)].sort();
    if (ids.length === 0) return;
    await this.connection
      .insert(customerSegmentEvaluationLock)
      .values(await Promise.all(ids.map(async (segmentId) => ({
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        customerId,
        segmentId,
      }))))
      .onConflictDoNothing();
    await this.connection
      .select({ id: customerSegmentEvaluationLock.id })
      .from(customerSegmentEvaluationLock)
      .where(and(
        eq(customerSegmentEvaluationLock.storeId, this.storeId),
        eq(customerSegmentEvaluationLock.customerId, customerId),
        inArray(customerSegmentEvaluationLock.segmentId, ids),
      ))
      .orderBy(asc(customerSegmentEvaluationLock.segmentId))
      .for("update");
  }

  private async evaluateTemporalLeaf(
    leaf: Extract<SegmentExpression, { kind: "predicate" | "function" }>,
    definition: SegmentDefinitionV1,
    customerId: string,
    storeContext: SegmentStoreEvaluationContext,
    effectiveAt: string,
  ) {
    const value = await this.matchesExpression(
      definition,
      leaf,
      customerId,
      storeContext,
      effectiveAt,
    );
    const boundaries: string[] = [];
    const values = expressionValues(leaf);
    if (values.some((item) => item.kind === "namedDate" || item.kind === "relativeDate")) {
      boundaries.push(nextCalendarDayStartUtc(effectiveAt, storeContext.timeZone));
    }
    if (leaf.kind === "predicate" && leaf.attribute === "customer_groups") {
      const groupId = "value" in leaf && leaf.value.kind === "entityId"
        ? leaf.value.id
        : null;
      const expiry = await this.nextGroupExpiryForEvaluation(
        customerId,
        effectiveAt,
        groupId,
      );
      if (expiry) boundaries.push(expiry);
    }
    if (
      leaf.kind === "predicate" &&
      (leaf.attribute === "tax_identifier_statuses" ||
        leaf.attribute === "tax_exemption_statuses" ||
        leaf.attribute === "tax_exemption_countries")
    ) {
      const boundary = await this.nextTaxBoundary(
        customerId,
        leaf.attribute,
        effectiveAt,
        storeContext.timeZone,
      );
      if (boundary) boundaries.push(boundary);
    }
    return { value, nextChangeAt: boundaries.sort()[0] ?? null };
  }

  private async nextGroupExpiryForEvaluation(
    customerId: string,
    effectiveAt: string,
    groupId: string | null,
  ): Promise<string | null> {
    const rows = await this.connection
      .select({ value: sql<string | null>`min(${customerGroupMembership.expiresAt})` })
      .from(customerGroupMembership)
      .where(and(
        eq(customerGroupMembership.storeId, this.storeId),
        eq(customerGroupMembership.customerId, customerId),
        sql`${customerGroupMembership.expiresAt} > ${effectiveAt}::timestamptz`,
        ...(groupId ? [eq(customerGroupMembership.groupId, groupId)] : []),
      ));
    return rows[0]?.value ?? null;
  }

  private async nextTaxBoundary(
    customerId: string,
    attribute: "tax_identifier_statuses" | "tax_exemption_statuses" | "tax_exemption_countries",
    effectiveAt: string,
    timeZone: string,
  ): Promise<string | null> {
    const rows = attribute === "tax_identifier_statuses"
      ? await this.connection
          .select({
            status: customerTaxIdentifier.status,
            validFrom: customerTaxIdentifier.validFrom,
            validTo: customerTaxIdentifier.validTo,
          })
          .from(customerTaxIdentifier)
          .where(and(
            eq(customerTaxIdentifier.storeId, this.storeId),
            eq(customerTaxIdentifier.customerId, customerId),
            isNull(customerTaxIdentifier.deletedAt),
          ))
      : await this.connection
          .select({
            status: customerTaxExemption.status,
            validFrom: customerTaxExemption.validFrom,
            validTo: customerTaxExemption.validTo,
          })
          .from(customerTaxExemption)
          .where(and(
            eq(customerTaxExemption.storeId, this.storeId),
            eq(customerTaxExemption.customerId, customerId),
            isNull(customerTaxExemption.deletedAt),
          ));
    const boundaries: string[] = [];
    for (const row of rows) {
      if (row.validFrom) {
        const boundary = startOfCalendarDayUtc(parseCalendarDate(row.validFrom)!, timeZone);
        if (boundary > effectiveAt) boundaries.push(boundary);
      }
      if (row.validTo && row.status !== "REJECTED" && row.status !== "REVOKED") {
        const boundary = startOfCalendarDayUtc(
          addCalendarDate(parseCalendarDate(row.validTo)!, 1, "day"),
          timeZone,
        );
        if (boundary > effectiveAt) boundaries.push(boundary);
      }
    }
    return boundaries.sort()[0] ?? null;
  }

  allocateCauseSequence(): Promise<bigint> {
    return this.nextCauseSequence();
  }

  @ReadOnly()
  currentGeneration(segmentId: string): Promise<CustomerSegment | null> {
    return this.connection
      .select()
      .from(customerSegment)
      .where(and(
        eq(customerSegment.storeId, this.storeId),
        eq(customerSegment.id, segmentId),
        isNull(customerSegment.deletedAt),
      ))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  private async nextCauseSequence(): Promise<bigint> {
    const rows = await this.connection.execute<{ sequence: string | bigint }>(sql`
      SELECT nextval('customers.customer_segment_evaluation_cause_sequence') AS sequence
    `);
    return BigInt(rows[0]!.sequence);
  }

  private async failCurrentSegment(
    item: Pick<
      CustomerSegmentReevaluationQueue,
      "segmentId" | "definitionRevision" | "evaluationGeneration"
    >,
    now: string,
  ): Promise<void> {
    await this.connection
      .update(customerSegment)
      .set({ materializationStatus: "FAILED", updatedAt: now })
      .where(and(
        eq(customerSegment.storeId, this.storeId),
        eq(customerSegment.id, item.segmentId),
        eq(customerSegment.definitionRevision, item.definitionRevision),
        eq(customerSegment.evaluationGeneration, item.evaluationGeneration),
      ));
  }
}

function evaluationToken(input: {
  readonly segment: CustomerSegment;
  readonly customerId: string;
  readonly effectiveAt: string;
  readonly causeSequence: bigint;
}): string {
  return sha256([
    "v1",
    input.segment.storeId,
    input.segment.id,
    input.customerId,
    String(input.segment.definitionRevision),
    String(input.segment.evaluationGeneration),
    input.effectiveAt,
    String(input.causeSequence),
  ]);
}

function temporalToken(
  input: {
    readonly segment: CustomerSegment;
    readonly customerId: string;
    readonly effectiveAt: string;
  },
  boundary: string,
): string {
  return sha256([
    "v1",
    input.segment.storeId,
    input.segment.id,
    input.customerId,
    String(input.segment.definitionRevision),
    String(input.segment.evaluationGeneration),
    input.effectiveAt,
    boundary,
  ]);
}

function compareFreshness(
  left: readonly [string, bigint, string],
  right: readonly [string, bigint, string],
): number {
  if (left[0] !== right[0]) return left[0] < right[0] ? -1 : 1;
  if (left[1] !== right[1]) return left[1] < right[1] ? -1 : 1;
  return left[2] < right[2] ? -1 : left[2] > right[2] ? 1 : 0;
}

function expressionValues(
  expression: Extract<SegmentExpression, { kind: "predicate" | "function" }>,
): SegmentValue[] {
  const values: SegmentValue[] = [];
  if (expression.kind === "predicate") {
    if ("value" in expression) values.push(expression.value);
    if ("upperValue" in expression) values.push(expression.upperValue);
    if ("values" in expression) values.push(...expression.values);
    return values;
  }
  if (!("parameters" in expression)) return values;
  for (const parameter of expression.parameters) {
    if ("value" in parameter) values.push(parameter.value);
    if ("upperValue" in parameter) values.push(parameter.upperValue);
    if ("values" in parameter) values.push(...parameter.values);
  }
  return values;
}

function sha256(parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\0"), "utf8").digest("hex");
}

function retryAt(attemptCount: number): string {
  const baseSeconds = Math.min(300, 2 ** Math.min(9, Math.max(0, attemptCount - 1)));
  const delaySeconds = Math.max(1, Math.round(baseSeconds * (0.8 + Math.random() * 0.4)));
  return new Date(Date.now() + delaySeconds * 1_000).toISOString();
}

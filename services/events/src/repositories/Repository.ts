import { and, eq, gt, inArray, isNotNull, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { Transactional, TransactionManager } from "@shopana/shared-kernel";
import type { DomainEvent, EmitDispatchOptions } from "@shopana/events";
import type { Database } from "../infrastructure/db/database.js";
import { domainEvents, type DomainEventRecord } from "./models/domainEvents.js";
import { deadLetterQueue } from "./models/deadLetterQueue.js";
import {
  eventHandlerJobs,
  type EventHandlerJobRecord,
  type NewEventHandlerJobRecord,
} from "./models/eventHandlerJobs.js";
import { computePayloadHash } from "../utils/hash.js";

export interface RepositoryConfig {
  db: Database;
}

export interface AddToDLQParams {
  eventId: string;
  eventType: string;
  organizationId: string;
  correlationId?: string;
  handler: { service: string; action: string };
  error: string;
  errorCode?: string;
  attempts: number;
  dbosWorkflowId?: string;
  dbosStepName?: string;
}

export type PersistDispatchOptions =
  Required<Extract<EmitDispatchOptions, { mode: "deferred" }>> | { mode: "immediate" };

export interface ClaimEventInput {
  organizationId: string;
  eventId: string;
  lockedBy: string;
}

export interface ClaimBatchInput {
  organizationId: string;
  eventType?: string;
  batchKey: string;
  limit?: number;
  lockedBy: string;
}

export type EventHandlerJobKind = "single" | "batch";

export interface EventHandlerJobDefinition {
  jobId: string;
  event: DomainEventRecord;
  handler: {
    serviceName: string;
    action: string;
    retryPolicy: {
      maxAttempts: number;
      intervalSeconds: number;
      backoffRate: number;
      timeoutMs?: number;
    };
  };
  handlerKind: EventHandlerJobKind;
}

export interface ClaimHandlerJobsInput {
  organizationId?: string;
  eventIds?: readonly string[];
  eventType?: string;
  batchKey?: string | null;
  handlerKind?: EventHandlerJobKind;
  lockedBy: string;
  limit?: number;
}

export interface FindClaimedHandlerJobsInput {
  eventIds: readonly string[];
  lockedBy: string;
  limit?: number;
}

export interface HandlerJobFailureInput {
  job: EventHandlerJobRecord;
  error: string;
  errorCode?: string;
  dbosWorkflowId?: string;
  dbosStepName?: string;
}

export interface RefreshEventDispatchStatusesResult {
  dispatched: number;
  failed: number;
  dispatching: number;
}

const DEFAULT_DISPATCH_LIMIT = 500;
const HANDLER_JOB_LEASE_MS = 5 * 60 * 1000;
const HANDLER_ATTEMPTS_EXHAUSTED_CODE = "HANDLER_ATTEMPTS_EXHAUSTED";
const HANDLER_ATTEMPTS_EXHAUSTED_MESSAGE = "Handler retry attempts exhausted";

export class Repository {
  public readonly txManager: TransactionManager<Database>;

  constructor(
    private readonly db: Database,
    txManager: TransactionManager<Database>,
  ) {
    this.txManager = txManager;
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    const txManager = new TransactionManager(config.db);
    return new Repository(config.db, txManager);
  }

  get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  async close(): Promise<void> {
    // Connection pool managed by DatabaseModule.
  }

  @Transactional()
  async persistPendingEvent(
    event: DomainEvent,
    dispatch: PersistDispatchOptions,
  ): Promise<{ timestamp: string; eventSequence: number }> {
    const realTimestamp = new Date();
    const payloadHash = computePayloadHash(event.payload);

    if (!payloadHash) {
      throw new Error("Event payload is required");
    }

    await this.connection.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${this.sequenceLockKey(event)}, 0))`,
    );

    const existing = await this.connection
      .select({
        timestamp: domainEvents.timestamp,
        eventSequence: domainEvents.eventSequence,
      })
      .from(domainEvents)
      .where(eq(domainEvents.eventId, event.eventId))
      .limit(1);

    if (existing[0]) {
      return {
        timestamp: toISOString(existing[0].timestamp),
        eventSequence: existing[0].eventSequence,
      };
    }

    const nextSequenceRows = await this.connection
      .select({
        eventSequence: sql<number>`COALESCE(MAX(${domainEvents.eventSequence}), 0) + 1`,
      })
      .from(domainEvents)
      .where(
        and(
          eq(domainEvents.organizationId, event.context.organizationId),
          eq(domainEvents.subjectType, event.subject.type),
          eq(domainEvents.subjectId, event.subject.id),
        ),
      );

    const eventSequence = Number(nextSequenceRows[0]?.eventSequence ?? 1);

    await this.connection.insert(domainEvents).values({
      eventId: event.eventId,
      eventType: event.eventType,
      eventSequence,
      source: event.source,
      timestamp: realTimestamp,
      organizationId: event.context.organizationId,
      userId: event.context.userId,
      correlationId: event.context.correlationId,
      causationId: event.context.causationId,
      emitKey: event.emitKey,
      parentWorkflowId: event.parentWorkflowId,
      payload: event.payload,
      payloadHash,
      dispatchMode: dispatch.mode,
      status: "pending",
      batchKey: dispatch.mode === "deferred" ? dispatch.batchKey : null,
      aggregateKey: dispatch.mode === "deferred" ? dispatch.aggregateKey : null,
      subjectType: event.subject.type,
      subjectId: event.subject.id,
      actorType: event.actor?.type ?? "service",
      actorId: event.actor?.id,
    });

    return { timestamp: realTimestamp.toISOString(), eventSequence };
  }

  async claimEvent(input: ClaimEventInput): Promise<DomainEventRecord[]> {
    const claimed = this.connection.$with("claimed").as(
      this.connection
        .select({ eventId: domainEvents.eventId })
        .from(domainEvents)
        .where(
          and(
            eq(domainEvents.status, "pending"),
            eq(domainEvents.organizationId, input.organizationId),
            eq(domainEvents.eventId, input.eventId),
          ),
        )
        .orderBy(domainEvents.createdAt)
        .limit(1)
        .for("update", { skipLocked: true }),
    );

    return this.connection
      .with(claimed)
      .update(domainEvents)
      .set({
        status: "dispatching",
        lockedBy: input.lockedBy,
        dispatchClaims: sql`${domainEvents.dispatchClaims} + 1`,
        dispatchStartedAt: sql`COALESCE(${domainEvents.dispatchStartedAt}, NOW())`,
        updatedAt: sql`NOW()`,
      })
      .where(
        inArray(
          domainEvents.eventId,
          this.connection.select({ eventId: claimed.eventId }).from(claimed),
        ),
      )
      .returning();
  }

  async claimBatch(input: ClaimBatchInput): Promise<DomainEventRecord[]> {
    const limit = input.limit ?? 500;
    const where = input.eventType
      ? and(
          eq(domainEvents.status, "pending"),
          eq(domainEvents.dispatchMode, "deferred"),
          eq(domainEvents.organizationId, input.organizationId),
          eq(domainEvents.eventType, input.eventType),
          eq(domainEvents.batchKey, input.batchKey),
        )
      : and(
          eq(domainEvents.status, "pending"),
          eq(domainEvents.dispatchMode, "deferred"),
          eq(domainEvents.organizationId, input.organizationId),
          eq(domainEvents.batchKey, input.batchKey),
        );

    const claimed = this.connection
      .$with("claimed")
      .as(
        this.connection
          .select({ eventId: domainEvents.eventId })
          .from(domainEvents)
          .where(where)
          .orderBy(domainEvents.createdAt)
          .limit(limit)
          .for("update", { skipLocked: true }),
      );

    return this.connection
      .with(claimed)
      .update(domainEvents)
      .set({
        status: "dispatching",
        lockedBy: input.lockedBy,
        dispatchClaims: sql`${domainEvents.dispatchClaims} + 1`,
        dispatchStartedAt: sql`COALESCE(${domainEvents.dispatchStartedAt}, NOW())`,
        updatedAt: sql`NOW()`,
      })
      .where(
        inArray(
          domainEvents.eventId,
          this.connection.select({ eventId: claimed.eventId }).from(claimed),
        ),
      )
      .returning();
  }

  async findEventForDispatch(input: {
    organizationId: string;
    eventId: string;
  }): Promise<DomainEventRecord[]> {
    return this.connection
      .select()
      .from(domainEvents)
      .where(
        and(
          eq(domainEvents.organizationId, input.organizationId),
          eq(domainEvents.eventId, input.eventId),
          inArray(domainEvents.status, ["pending", "dispatching"]),
        ),
      )
      .limit(1);
  }

  async findBatchEventsForDispatch(input: {
    organizationId: string;
    eventType?: string;
    batchKey: string;
    limit?: number;
  }): Promise<DomainEventRecord[]> {
    const limit = input.limit ?? DEFAULT_DISPATCH_LIMIT;
    const baseWhere = and(
      eq(domainEvents.status, "pending"),
      eq(domainEvents.dispatchMode, "deferred"),
      eq(domainEvents.organizationId, input.organizationId),
      eq(domainEvents.batchKey, input.batchKey),
    );

    return this.connection
      .select()
      .from(domainEvents)
      .where(
        input.eventType ? and(baseWhere, eq(domainEvents.eventType, input.eventType)) : baseWhere,
      )
      .orderBy(domainEvents.createdAt)
      .limit(limit);
  }

  async ensureHandlerJobs(definitions: readonly EventHandlerJobDefinition[]): Promise<void> {
    if (definitions.length === 0) return;

    const uniqueDefinitions = dedupeHandlerJobDefinitions(definitions);
    const values: NewEventHandlerJobRecord[] = uniqueDefinitions.map((definition) => ({
      jobId: definition.jobId,
      eventId: definition.event.eventId,
      organizationId: definition.event.organizationId,
      eventType: definition.event.eventType,
      batchKey: definition.event.batchKey,
      aggregateKey: definition.event.aggregateKey,
      handlerService: definition.handler.serviceName,
      handlerAction: definition.handler.action,
      handlerKind: definition.handlerKind,
      maxAttempts: definition.handler.retryPolicy.maxAttempts,
      intervalSeconds: definition.handler.retryPolicy.intervalSeconds,
      backoffRate: definition.handler.retryPolicy.backoffRate,
      timeoutMs: definition.handler.retryPolicy.timeoutMs,
    }));

    await this.connection
      .insert(eventHandlerJobs)
      .values(values)
      .onConflictDoUpdate({
        target: [eventHandlerJobs.eventId, eventHandlerJobs.handlerAction],
        set: {
          handlerService: sql`excluded.handler_service`,
          handlerKind: sql`excluded.handler_kind`,
          maxAttempts: sql`excluded.max_attempts`,
          intervalSeconds: sql`excluded.interval_seconds`,
          backoffRate: sql`excluded.backoff_rate`,
          timeoutMs: sql`excluded.timeout_ms`,
          updatedAt: sql`NOW()`,
        },
      });
  }

  async claimHandlerJobs(input: ClaimHandlerJobsInput): Promise<EventHandlerJobRecord[]> {
    if (input.eventIds && input.eventIds.length === 0) return [];

    const limit = input.limit ?? DEFAULT_DISPATCH_LIMIT;
    const lockedUntil = new Date(Date.now() + HANDLER_JOB_LEASE_MS);
    const claimed = this.connection.$with("claimed_handler_jobs").as(
      this.connection
        .select({ jobId: eventHandlerJobs.jobId })
        .from(eventHandlerJobs)
        .where(
          and(
            buildClaimHandlerJobWhere(input),
            sql`${eventHandlerJobs.attempts} < ${eventHandlerJobs.maxAttempts}`,
          ),
        )
        .orderBy(eventHandlerJobs.nextAttemptAt, eventHandlerJobs.createdAt)
        .limit(limit)
        .for("update", { skipLocked: true }),
    );

    return this.connection
      .with(claimed)
      .update(eventHandlerJobs)
      .set({
        status: "dispatching",
        lockedBy: input.lockedBy,
        lockedUntil,
        attempts: sql`${eventHandlerJobs.attempts} + 1`,
        updatedAt: sql`NOW()`,
      })
      .where(
        inArray(
          eventHandlerJobs.jobId,
          this.connection.select({ jobId: claimed.jobId }).from(claimed),
        ),
      )
      .returning();
  }

  async findClaimedHandlerJobs(
    input: FindClaimedHandlerJobsInput,
  ): Promise<EventHandlerJobRecord[]> {
    if (input.eventIds.length === 0) return [];

    return this.connection
      .select()
      .from(eventHandlerJobs)
      .where(
        and(
          inArray(eventHandlerJobs.eventId, [...input.eventIds]),
          eq(eventHandlerJobs.status, "dispatching"),
          eq(eventHandlerJobs.lockedBy, input.lockedBy),
          gt(eventHandlerJobs.lockedUntil, sql`NOW()`),
        ),
      )
      .orderBy(eventHandlerJobs.updatedAt)
      .limit(input.limit ?? DEFAULT_DISPATCH_LIMIT);
  }

  @Transactional()
  async markDueExhaustedHandlerJobsDLQ(input: {
    eventIds: readonly string[];
    limit?: number;
    dbosWorkflowId?: string;
  }): Promise<number> {
    const uniqueEventIds = [...new Set(input.eventIds)];
    if (uniqueEventIds.length === 0) return 0;

    const jobs = await this.connection
      .select()
      .from(eventHandlerJobs)
      .where(
        and(
          buildDueHandlerJobWhere(),
          inArray(eventHandlerJobs.eventId, uniqueEventIds),
          sql`${eventHandlerJobs.attempts} >= ${eventHandlerJobs.maxAttempts}`,
        ),
      )
      .orderBy(eventHandlerJobs.nextAttemptAt, eventHandlerJobs.createdAt)
      .limit(input.limit ?? DEFAULT_DISPATCH_LIMIT)
      .for("update", { skipLocked: true });

    if (jobs.length === 0) return 0;

    const eventRows = await this.connection
      .select({
        eventId: domainEvents.eventId,
        correlationId: domainEvents.correlationId,
      })
      .from(domainEvents)
      .where(
        inArray(
          domainEvents.eventId,
          jobs.map((job) => job.eventId),
        ),
      );
    const correlationByEventId = new Map(eventRows.map((row) => [row.eventId, row.correlationId]));

    let marked = 0;

    for (const job of jobs) {
      const error = job.lastError ?? HANDLER_ATTEMPTS_EXHAUSTED_MESSAGE;
      const errorCode = job.lastErrorCode ?? HANDLER_ATTEMPTS_EXHAUSTED_CODE;
      const updated = await this.connection
        .update(eventHandlerJobs)
        .set({
          status: "dlq",
          lockedBy: null,
          lockedUntil: null,
          lastError: error,
          lastErrorCode: errorCode,
          failedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(eventHandlerJobs.jobId, job.jobId),
            eq(eventHandlerJobs.attempts, job.attempts),
            inArray(eventHandlerJobs.status, ["pending", "dispatching"]),
          ),
        )
        .returning({ jobId: eventHandlerJobs.jobId });

      if (updated.length === 0) {
        continue;
      }

      await this.addToDLQ({
        eventId: job.eventId,
        eventType: job.eventType,
        organizationId: job.organizationId,
        correlationId: correlationByEventId.get(job.eventId),
        handler: {
          service: job.handlerService,
          action: job.handlerAction,
        },
        error,
        errorCode,
        attempts: job.attempts,
        dbosWorkflowId: input.dbosWorkflowId,
        dbosStepName: buildHandlerJobStepName(job),
      });

      marked++;
    }

    return marked;
  }

  async findNextHandlerJobClaimAt(eventIds: readonly string[]): Promise<Date | null> {
    if (eventIds.length === 0) return null;

    const rows = await this.connection
      .select({
        claimAt: sql<Date | null>`
          MIN(
            CASE
              WHEN ${eventHandlerJobs.status} = 'pending'
                THEN ${eventHandlerJobs.nextAttemptAt}
              WHEN ${eventHandlerJobs.status} = 'dispatching'
                THEN COALESCE(${eventHandlerJobs.lockedUntil}, NOW())
              ELSE NULL
            END
          )
        `,
      })
      .from(eventHandlerJobs)
      .where(
        and(
          inArray(eventHandlerJobs.eventId, [...eventIds]),
          inArray(eventHandlerJobs.status, ["pending", "dispatching"]),
        ),
      );

    const claimAt = rows[0]?.claimAt;
    return claimAt ? new Date(claimAt) : null;
  }

  async markHandlerJobsSucceeded(jobs: readonly EventHandlerJobRecord[]): Promise<void> {
    if (jobs.length === 0) return;

    await Promise.all(
      jobs.map((job) =>
        this.connection
          .update(eventHandlerJobs)
          .set({
            status: "succeeded",
            lockedBy: null,
            lockedUntil: null,
            lastError: null,
            lastErrorCode: null,
            succeededAt: new Date(),
            updatedAt: new Date(),
          })
          .where(buildClaimedHandlerJobWhere(job)),
      ),
    );
  }

  async markHandlerJobsPending(input: {
    jobs: readonly EventHandlerJobRecord[];
    error: string;
    errorCode?: string;
    nextAttemptAt: Date;
  }): Promise<void> {
    if (input.jobs.length === 0) return;

    await Promise.all(
      input.jobs.map((job) =>
        this.connection
          .update(eventHandlerJobs)
          .set({
            status: "pending",
            lockedBy: null,
            lockedUntil: null,
            lastError: input.error,
            lastErrorCode: input.errorCode,
            nextAttemptAt: input.nextAttemptAt,
            updatedAt: new Date(),
          })
          .where(buildClaimedHandlerJobWhere(job)),
      ),
    );
  }

  @Transactional()
  async markHandlerJobDLQ(input: HandlerJobFailureInput): Promise<void> {
    const updated = await this.connection
      .update(eventHandlerJobs)
      .set({
        status: "dlq",
        lockedBy: null,
        lockedUntil: null,
        lastError: input.error,
        lastErrorCode: input.errorCode,
        failedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(buildClaimedHandlerJobWhere(input.job))
      .returning({ jobId: eventHandlerJobs.jobId });

    if (updated.length === 0) {
      return;
    }

    const eventRows = await this.connection
      .select({ correlationId: domainEvents.correlationId })
      .from(domainEvents)
      .where(eq(domainEvents.eventId, input.job.eventId))
      .limit(1);

    await this.addToDLQ({
      eventId: input.job.eventId,
      eventType: input.job.eventType,
      organizationId: input.job.organizationId,
      correlationId: eventRows[0]?.correlationId,
      handler: {
        service: input.job.handlerService,
        action: input.job.handlerAction,
      },
      error: input.error,
      errorCode: input.errorCode,
      attempts: input.job.attempts,
      dbosWorkflowId: input.dbosWorkflowId,
      dbosStepName: input.dbosStepName,
    });
  }

  async refreshEventDispatchStatuses(
    eventIds: readonly string[],
  ): Promise<RefreshEventDispatchStatusesResult> {
    const uniqueEventIds = [...new Set(eventIds)];
    if (uniqueEventIds.length === 0) {
      return { dispatched: 0, failed: 0, dispatching: 0 };
    }

    const summaries = await this.connection
      .select({
        eventId: eventHandlerJobs.eventId,
        total: sql<number>`COUNT(*)`,
        succeeded: sql<number>`COUNT(*) FILTER (WHERE ${eventHandlerJobs.status} = 'succeeded')`,
        dlq: sql<number>`COUNT(*) FILTER (WHERE ${eventHandlerJobs.status} = 'dlq')`,
      })
      .from(eventHandlerJobs)
      .where(inArray(eventHandlerJobs.eventId, uniqueEventIds))
      .groupBy(eventHandlerJobs.eventId);

    const byEventId = new Map(summaries.map((row) => [row.eventId, row]));
    const dispatchedEventIds: string[] = [];
    const failedEventIds: string[] = [];
    const dispatchingEventIds: string[] = [];

    for (const eventId of uniqueEventIds) {
      const summary = byEventId.get(eventId);
      if (!summary) {
        dispatchedEventIds.push(eventId);
        continue;
      }

      const total = Number(summary.total);
      const succeeded = Number(summary.succeeded);
      const dlq = Number(summary.dlq);
      const terminal = succeeded + dlq;

      if (dlq > 0 && terminal === total) {
        failedEventIds.push(eventId);
      } else if (total === succeeded) {
        dispatchedEventIds.push(eventId);
      } else {
        dispatchingEventIds.push(eventId);
      }
    }

    await this.markDispatchedMany(dispatchedEventIds);
    await this.markFailedMany(failedEventIds);
    await this.markDispatchingMany(dispatchingEventIds);

    return {
      dispatched: dispatchedEventIds.length,
      failed: failedEventIds.length,
      dispatching: dispatchingEventIds.length,
    };
  }

  async markDispatched(eventId: string): Promise<void> {
    await this.connection
      .update(domainEvents)
      .set({
        status: "dispatched",
        dispatchCompletedAt: new Date(),
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(domainEvents.eventId, eventId));
  }

  async markDispatchedMany(eventIds: readonly string[]): Promise<void> {
    if (eventIds.length === 0) return;

    await this.connection
      .update(domainEvents)
      .set({
        status: "dispatched",
        dispatchCompletedAt: new Date(),
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(inArray(domainEvents.eventId, [...eventIds]));
  }

  async markFailed(eventId: string): Promise<void> {
    await this.connection
      .update(domainEvents)
      .set({
        status: "failed",
        dispatchCompletedAt: new Date(),
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(domainEvents.eventId, eventId));
  }

  async markFailedMany(eventIds: readonly string[]): Promise<void> {
    if (eventIds.length === 0) return;

    await this.connection
      .update(domainEvents)
      .set({
        status: "failed",
        dispatchCompletedAt: new Date(),
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(inArray(domainEvents.eventId, [...eventIds]));
  }

  async markDispatchingMany(eventIds: readonly string[]): Promise<void> {
    if (eventIds.length === 0) return;

    await this.connection
      .update(domainEvents)
      .set({
        status: "dispatching",
        dispatchStartedAt: sql`COALESCE(${domainEvents.dispatchStartedAt}, NOW())`,
        dispatchCompletedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(inArray(domainEvents.eventId, [...eventIds]));
  }

  async addToDLQ(params: AddToDLQParams): Promise<void> {
    await this.connection
      .insert(deadLetterQueue)
      .values({
        eventId: params.eventId,
        eventType: params.eventType,
        handlerService: params.handler.service,
        handlerAction: params.handler.action,
        error: params.error,
        errorCode: params.errorCode,
        attempts: params.attempts,
        organizationId: params.organizationId,
        correlationId: params.correlationId,
        dbosWorkflowId: params.dbosWorkflowId,
        dbosStepName: params.dbosStepName,
        status: "failed",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .onConflictDoUpdate({
        target: [
          deadLetterQueue.eventId,
          deadLetterQueue.handlerService,
          deadLetterQueue.handlerAction,
        ],
        set: {
          error: params.error,
          errorCode: params.errorCode,
          attempts: params.attempts,
          failedAt: new Date(),
          dbosWorkflowId: params.dbosWorkflowId,
          dbosStepName: params.dbosStepName,
          status: "failed",
        },
      });
  }

  async cleanupExpiredDLQ(batchSize: number): Promise<number> {
    const expiredIds = this.connection
      .select({ id: deadLetterQueue.id })
      .from(deadLetterQueue)
      .where(and(isNotNull(deadLetterQueue.expiresAt), lt(deadLetterQueue.expiresAt, sql`NOW()`)))
      .limit(batchSize);

    const deleted = await this.connection
      .delete(deadLetterQueue)
      .where(inArray(deadLetterQueue.id, expiredIds))
      .returning({ id: deadLetterQueue.id });

    return deleted.length;
  }

  @Transactional()
  async cleanupOldDomainEvents(cutoffDate: Date, batchSize: number): Promise<number> {
    const oldEventIds = this.connection
      .select({ eventId: domainEvents.eventId })
      .from(domainEvents)
      .where(
        and(
          lt(domainEvents.timestamp, cutoffDate),
          inArray(domainEvents.status, ["dispatched", "failed"]),
        ),
      )
      .limit(batchSize);

    await this.connection
      .delete(eventHandlerJobs)
      .where(inArray(eventHandlerJobs.eventId, oldEventIds));

    const deleted = await this.connection
      .delete(domainEvents)
      .where(inArray(domainEvents.eventId, oldEventIds))
      .returning({ eventId: domainEvents.eventId });

    return deleted.length;
  }

  private sequenceLockKey(event: DomainEvent): string {
    return [
      "domain_events_sequence:v1",
      event.context.organizationId,
      event.subject.type,
      event.subject.id,
    ].join(":");
  }
}

function buildDueHandlerJobWhere(organizationId?: string): SQL | undefined {
  const dueWhere = or(
    and(eq(eventHandlerJobs.status, "pending"), lte(eventHandlerJobs.nextAttemptAt, sql`NOW()`)),
    and(
      eq(eventHandlerJobs.status, "dispatching"),
      or(isNull(eventHandlerJobs.lockedUntil), lt(eventHandlerJobs.lockedUntil, sql`NOW()`)),
    ),
  );

  return organizationId
    ? and(eq(eventHandlerJobs.organizationId, organizationId), dueWhere)
    : dueWhere;
}

function buildClaimHandlerJobWhere(input: ClaimHandlerJobsInput): SQL | undefined {
  const conditions: Array<SQL | undefined> = [buildDueHandlerJobWhere(input.organizationId)];

  if (input.eventIds) {
    conditions.push(inArray(eventHandlerJobs.eventId, [...input.eventIds]));
  }

  if (input.eventType) {
    conditions.push(eq(eventHandlerJobs.eventType, input.eventType));
  }

  if (input.batchKey !== undefined) {
    conditions.push(
      input.batchKey === null
        ? isNull(eventHandlerJobs.batchKey)
        : eq(eventHandlerJobs.batchKey, input.batchKey),
    );
  }

  if (input.handlerKind) {
    conditions.push(eq(eventHandlerJobs.handlerKind, input.handlerKind));
  }

  return and(...conditions);
}

function buildClaimedHandlerJobWhere(job: EventHandlerJobRecord): SQL {
  if (!job.lockedBy) {
    return sql`FALSE`;
  }

  return and(
    eq(eventHandlerJobs.jobId, job.jobId),
    eq(eventHandlerJobs.lockedBy, job.lockedBy),
    eq(eventHandlerJobs.attempts, job.attempts),
    eq(eventHandlerJobs.status, "dispatching"),
  )!;
}

function buildHandlerJobStepName(job: EventHandlerJobRecord): string {
  return `${job.handlerKind}Handler:${job.handlerAction}:${job.eventId}`;
}

function dedupeHandlerJobDefinitions(
  definitions: readonly EventHandlerJobDefinition[],
): EventHandlerJobDefinition[] {
  const byKey = new Map<string, EventHandlerJobDefinition>();

  for (const definition of definitions) {
    byKey.set(`${definition.event.eventId}:${definition.handler.action}`, definition);
  }

  return [...byKey.values()];
}

function toISOString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

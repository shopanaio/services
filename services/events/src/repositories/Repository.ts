import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { Transactional, TransactionManager } from "@shopana/shared-kernel";
import type { DomainEvent, EmitDispatchOptions } from "@shopana/events";
import type { Database } from "../infrastructure/db/database.js";
import {
  domainEvents,
  type DomainEventRecord,
} from "./models/domainEvents.js";
import { deadLetterQueue } from "./models/deadLetterQueue.js";
import { computePayloadHash } from "../utils/hash.js";

export interface RepositoryConfig {
  db: Database;
}

export interface AddToDLQParams {
  eventId: string;
  eventType: string;
  tenantId: string;
  correlationId?: string;
  handler: { service: string; action: string };
  error: string;
  errorCode?: string;
  attempts: number;
  dbosWorkflowId?: string;
  dbosStepName?: string;
}

export type PersistDispatchOptions = Required<
  Extract<EmitDispatchOptions, { mode: "deferred" }>
> | { mode: "immediate" };

export interface ClaimEventInput {
  tenantId: string;
  eventId: string;
  lockedBy: string;
}

export interface ClaimBatchInput {
  tenantId: string;
  eventType?: string;
  batchKey: string;
  limit?: number;
  lockedBy: string;
}

export class Repository {
  public readonly txManager: TransactionManager<Database>;

  constructor(private readonly db: Database, txManager: TransactionManager<Database>) {
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
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${this.sequenceLockKey(event)}, 0))`
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
          eq(domainEvents.tenantId, event.context.tenantId),
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
      tenantId: event.context.tenantId,
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
      aggregateKey:
        dispatch.mode === "deferred" ? dispatch.aggregateKey : null,
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
            eq(domainEvents.tenantId, input.tenantId),
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
          eq(domainEvents.tenantId, input.tenantId),
          eq(domainEvents.eventType, input.eventType),
          eq(domainEvents.batchKey, input.batchKey),
        )
      : and(
          eq(domainEvents.status, "pending"),
          eq(domainEvents.dispatchMode, "deferred"),
          eq(domainEvents.tenantId, input.tenantId),
          eq(domainEvents.batchKey, input.batchKey),
        );

    const claimed = this.connection.$with("claimed").as(
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
        tenantId: params.tenantId,
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
      .where(
        and(
          isNotNull(deadLetterQueue.expiresAt),
          lt(deadLetterQueue.expiresAt, sql`NOW()`)
        )
      )
      .limit(batchSize);

    const deleted = await this.connection
      .delete(deadLetterQueue)
      .where(inArray(deadLetterQueue.id, expiredIds))
      .returning({ id: deadLetterQueue.id });

    return deleted.length;
  }

  async cleanupOldDomainEvents(cutoffDate: Date, batchSize: number): Promise<number> {
    const oldEventIds = this.connection
      .select({ eventId: domainEvents.eventId })
      .from(domainEvents)
      .where(
        and(
          lt(domainEvents.timestamp, cutoffDate),
          inArray(domainEvents.status, ["dispatched", "failed"]),
        )
      )
      .limit(batchSize);

    const deleted = await this.connection
      .delete(domainEvents)
      .where(inArray(domainEvents.eventId, oldEventIds))
      .returning({ eventId: domainEvents.eventId });

    return deleted.length;
  }

  private sequenceLockKey(event: DomainEvent): string {
    return [
      "domain_events_sequence:v1",
      event.context.tenantId,
      event.subject.type,
      event.subject.id,
    ].join(":");
  }
}

function toISOString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

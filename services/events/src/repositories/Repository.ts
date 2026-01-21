import { eq } from "drizzle-orm";
import { TransactionManager } from "@shopana/shared-kernel";
import type { DomainEvent, HandlerInvocationResult } from "@shopana/events";
import type { Database } from "../infrastructure/db/database.js";
import { domainEvents } from "./models/domainEvents.js";
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

  async persistEvent(event: DomainEvent): Promise<{ timestamp: string }> {
    const realTimestamp = new Date();

    await this.connection
      .insert(domainEvents)
      .values({
        eventId: event.eventId,
        eventType: event.eventType,
        source: event.source,
        timestamp: realTimestamp,
        tenantId: event.context.tenantId,
        userId: event.context.userId,
        correlationId: event.context.correlationId,
        causationId: event.context.causationId,
        emitKey: event.emitKey,
        parentWorkflowId: event.parentWorkflowId,
        status: "dispatching",
        dispatchStartedAt: realTimestamp,
        subjectType: event.subject.type,
        subjectId: event.subject.id,
        actorType: event.actor?.type ?? "service",
        actorId: event.actor?.id,
        payloadHash: computePayloadHash(event.payload),
      })
      .onConflictDoNothing();

    return { timestamp: realTimestamp.toISOString() };
  }

  async updateEventStatus(
    eventId: string,
    results: HandlerInvocationResult[]
  ): Promise<void> {
    await this.connection
      .update(domainEvents)
      .set({
        status: "completed",
        dispatchCompletedAt: new Date(),
        handlerResults: results,
        updatedAt: new Date(),
      })
      .where(eq(domainEvents.eventId, eventId));
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
          status: "failed",
        },
      });
  }
}

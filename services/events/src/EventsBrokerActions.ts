import { Injectable } from "@nestjs/common";
import {
  Action,
  BrokerActions,
  DBOS,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type {
  DomainEvent,
  EventContext,
  EventDispatchResult,
  HandlerInvocationResult,
} from "@shopana/events";
import {
  makeDeterministicCorrelationId,
  makeDispatchWorkflowId,
  makeEventId,
} from "@shopana/events";
import { eq, sql } from "drizzle-orm";
import { domainEvents } from "./repositories/models/domainEvents.js";
import {
  deadLetterQueue,
  type DLQEntry,
} from "./repositories/models/deadLetterQueue.js";
import { computePayloadHash } from "./utils/hash.js";
import { Kernel } from "./kernel/Kernel.js";
import type { EventDispatchWorkflow } from "./workflows/EventDispatchWorkflow.js";

interface EmitParams<TType extends string = string, TPayload = unknown> {
  eventType: TType;
  payload: TPayload;
  source: string;
  context: Omit<EventContext, "correlationId"> & { correlationId?: string };
  subject: { type: string; id: string };
  actor?: { type: "user" | "service" | "system"; id?: string };
  emitKey: string;
}

@Injectable()
export class EventsBrokerActions extends BrokerActions {
  constructor(@InjectBroker("events") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  private get db() {
    return this.kernel.db;
  }

  @Action("emit")
  async emit(params: EmitParams): Promise<{ workflowId: string; eventId: string }> {
    const { event, workflowId } = this.buildEvent(params);

    const dispatchWorkflow = this.getDispatchWorkflow();
    await DBOS.startWorkflow(dispatchWorkflow, { workflowID: workflowId }).dispatch(
      event
    );

    return { workflowId, eventId: event.eventId };
  }

  @Action("emitAndWait")
  async emitAndWait(params: EmitParams): Promise<EventDispatchResult> {
    const { event, workflowId } = this.buildEvent(params);

    const dispatchWorkflow = this.getDispatchWorkflow();
    const handle = await DBOS.startWorkflow(dispatchWorkflow, {
      workflowID: workflowId,
    }).dispatch(event);

    return handle.getResult();
  }

  @Action("persistEvent")
  async persistEvent(params: {
    event: DomainEvent;
  }): Promise<{ persisted: boolean; timestamp: string }> {
    const { event } = params;
    const realTimestamp = new Date();

    await this.db
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

    return { persisted: true, timestamp: realTimestamp.toISOString() };
  }

  @Action("updateEventStatus")
  async updateEventStatus(params: {
    eventId: string;
    status: "completed";
    handlerResults: HandlerInvocationResult[];
  }): Promise<{ updated: boolean }> {
    await this.db
      .update(domainEvents)
      .set({
        status: "completed",
        dispatchCompletedAt: new Date(),
        handlerResults: params.handlerResults,
        updatedAt: new Date(),
      })
      .where(eq(domainEvents.eventId, params.eventId));

    return { updated: true };
  }

  @Action("addToDLQ")
  async addToDLQ(params: {
    eventId: string;
    eventType: string;
    tenantId: string;
    correlationId?: string;
    handler: { service: string; action: string };
    error: string;
    errorCode?: string;
    attempts: number;
  }): Promise<{ added: boolean }> {
    await this.db
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

    return { added: true };
  }

  @Action("getDLQEntries")
  async getDLQEntries(params: {
    limit?: number;
    eventType?: string;
  }): Promise<{ entries: DLQEntry[] }> {
    const limit = params.limit ?? 100;

    let query = this.db
      .select()
      .from(deadLetterQueue)
      .where(eq(deadLetterQueue.status, "failed"))
      .orderBy(deadLetterQueue.failedAt)
      .limit(limit);

    if (params.eventType) {
      query = query.where(eq(deadLetterQueue.eventType, params.eventType));
    }

    const entries = await query;
    return { entries };
  }

  @Action("cleanupDLQ")
  async cleanupDLQ(params: { batchSize?: number }): Promise<{ deleted: number }> {
    const batchSize = params.batchSize ?? 1000;

    const result = await this.db.execute(sql`
      DELETE FROM dead_letter_queue
      WHERE id IN (
        SELECT id FROM dead_letter_queue
        WHERE expires_at IS NOT NULL AND expires_at < NOW()
        LIMIT ${batchSize}
      )
    `);

    return { deleted: result.rowCount ?? 0 };
  }

  @Action("cleanupDomainEvents")
  async cleanupDomainEvents(params: {
    retentionDays?: number;
    batchSize?: number;
  }): Promise<{ deleted: number }> {
    const retentionDays = params.retentionDays ?? 90;
    const batchSize = params.batchSize ?? 5000;
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    );

    const result = await this.db.execute(sql`
      DELETE FROM domain_events
      WHERE event_id IN (
        SELECT event_id FROM domain_events
        WHERE timestamp < ${cutoffDate}
        LIMIT ${batchSize}
      )
    `);

    return { deleted: result.rowCount ?? 0 };
  }

  private buildEvent(params: EmitParams): { event: DomainEvent; workflowId: string } {
    if (!params.emitKey || params.emitKey.trim().length === 0) {
      throw new Error("emitKey is required and must be non-empty");
    }

    const parentWorkflowId = DBOS.workflowID;
    if (!parentWorkflowId) {
      throw new Error("events.emit must be called from workflow code");
    }

    const workflowId = makeDispatchWorkflowId({
      parentWorkflowId,
      eventType: params.eventType,
      emitKey: params.emitKey,
    });

    const eventId = makeEventId({
      tenantId: params.context.tenantId,
      dispatchWorkflowId: workflowId,
    });

    const correlationId =
      params.context.correlationId ??
      makeDeterministicCorrelationId(parentWorkflowId);

    const event: DomainEvent = {
      eventId,
      eventType: params.eventType,
      timestamp: "",
      source: params.source,
      payload: params.payload,
      emitKey: params.emitKey,
      parentWorkflowId,
      context: {
        ...params.context,
        correlationId,
      },
      subject: params.subject,
      actor: params.actor ?? { type: "service", id: params.source },
    };

    return { event, workflowId };
  }

  private getDispatchWorkflow(): EventDispatchWorkflow {
    const workflowName = this.broker.qualifyAction("eventDispatch");
    const registry = this.kernel.workflow;

    if (!registry.has(workflowName)) {
      throw new Error("eventDispatch workflow not registered");
    }

    return registry.get<EventDispatchWorkflow>(workflowName);
  }
}

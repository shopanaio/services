import { Injectable } from "@nestjs/common";
import {
  Action,
  BrokerActions,
  DBOS,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import type {
  DomainEvent,
  EventContext,
  EventDispatchResult,
} from "@shopana/events";
import {
  makeDeterministicCorrelationId,
  makeDispatchWorkflowId,
  makeEventId,
} from "@shopana/events";
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

  private get repository() {
    return this.kernel.repository;
  }

  @Action("emit")
  async emit(params: EmitParams): Promise<{ workflowId: string; eventId: string }> {
    const { event, workflowId } = this.buildEvent(params);

    const dispatchWorkflow = this.getDispatchWorkflow();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (DBOS.startWorkflow(dispatchWorkflow, { workflowID: workflowId }) as any).run(
      event
    );

    return { workflowId, eventId: event.eventId };
  }

  @Action("emitAndWait")
  async emitAndWait(params: EmitParams): Promise<EventDispatchResult> {
    const { event, workflowId } = this.buildEvent(params);

    const dispatchWorkflow = this.getDispatchWorkflow();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle = await (DBOS.startWorkflow(dispatchWorkflow, {
      workflowID: workflowId,
    }) as any).run(event);

    return handle.getResult();
  }

  @Action("cleanupDLQ")
  async cleanupDLQ(params: { batchSize?: number }): Promise<{ deleted: number }> {
    const batchSize = params.batchSize ?? 1000;
    const deleted = await this.repository.cleanupExpiredDLQ(batchSize);
    return { deleted };
  }

  @Action("cleanupDomainEvents")
  async cleanupDomainEvents(params: {
    retentionDays?: number;
    batchSize?: number;
  }): Promise<{ deleted: number }> {
    const retentionDays = params.retentionDays ?? 90;
    const batchSize = params.batchSize ?? 5000;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const deleted = await this.repository.cleanupOldDomainEvents(cutoffDate, batchSize);
    return { deleted };
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

  private getDispatchWorkflow(): ConfiguredInstance & {
    run: (event: DomainEvent) => Promise<EventDispatchResult>;
  } {
    const workflowName = this.broker.qualifyAction("eventDispatch");
    const registry = this.kernel.workflow;

    if (!registry.has(workflowName)) {
      throw new Error("eventDispatch workflow not registered");
    }

    return registry.get<EventDispatchWorkflow>(workflowName) as ConfiguredInstance & {
      run: (event: DomainEvent) => Promise<EventDispatchResult>;
    };
  }
}

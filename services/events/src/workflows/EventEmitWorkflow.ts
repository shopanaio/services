import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  WorkflowStep,
  InjectBroker,
  ServiceBroker,
  DBOS,
} from "@shopana/shared-kernel";
import type {
  DomainEvent,
  EventContext,
  EmitDispatchOptions,
  EventEmitResult,
} from "@shopana/events";
import {
  makeDeterministicCorrelationId,
  makeDispatchWorkflowId,
  makeEventId,
} from "@shopana/events";
import { Kernel } from "../kernel/Kernel.js";
import type { PersistDispatchOptions } from "../repositories/Repository.js";

export interface EmitParams<TType extends string = string, TPayload = unknown> {
  eventType: TType;
  payload: TPayload;
  source: string;
  context: Omit<EventContext, "correlationId"> & { correlationId?: string };
  subject: { type: string; id: string };
  actor?: { type: "user" | "service" | "system"; id?: string };
  emitKey: string;
  dispatch?: EmitDispatchOptions;
}

@Injectable()
export class EventEmitWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("events") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  private get repository() {
    return this.kernel.repository;
  }

  @Workflow("emit")
  async run(params: EmitParams): Promise<EventEmitResult> {
    const dispatch = normalizeDispatch(params);
    const { event } = this.buildEvent(params);
    await this.stepPersistEvent(event, dispatch);

    if (dispatch.mode === "deferred") {
      return {
        eventId: event.eventId,
        eventType: event.eventType,
        status: "pending",
        dispatchMode: "deferred",
      };
    }

    const started = await this.broker.startWorkflow(
      "events.dispatch",
      {
        kind: "event",
        tenantId: event.context.tenantId,
        eventId: event.eventId,
      },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: "dispatchEvent",
        callId: event.eventId,
        tenantId: event.context.tenantId,
      },
    );

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      status: "pending",
      dispatchMode: "immediate",
      dispatchWorkflowId: started.workflowId,
    };
  }

  @WorkflowStep()
  private async stepPersistEvent(
    event: DomainEvent,
    dispatch: PersistDispatchOptions,
  ): Promise<{ timestamp: string }> {
    return this.repository.persistPendingEvent(event, dispatch);
  }

  private buildEvent(params: EmitParams): {
    event: DomainEvent;
    workflowId: string;
  } {
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
}

function normalizeDispatch(params: EmitParams): PersistDispatchOptions {
  if (!params.dispatch || params.dispatch.mode !== "deferred") {
    return { mode: "immediate" };
  }

  if (!params.dispatch.batchKey || params.dispatch.batchKey.trim().length === 0) {
    throw new Error("batchKey is required for deferred event dispatch");
  }

  return {
    mode: "deferred",
    batchKey: params.dispatch.batchKey,
    aggregateKey:
      params.dispatch.aggregateKey ??
      `${params.subject.type}:${params.subject.id}`,
  };
}

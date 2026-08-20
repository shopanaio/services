import { Injectable } from "@nestjs/common";
import {
  Action,
  BrokerActions,
  DBOS,
  InjectBroker,
  ServiceBroker,
  type IdempotencyContext,
} from "@shopana/shared-kernel";
import type { EventDispatchInput, EventDispatchResult } from "@shopana/events";
import { Kernel } from "../kernel/Kernel.js";

type EventDispatchActionParams = EventDispatchInput & {
  waitForResult?: boolean;
};

type EventDispatchActionResult =
  | {
      workflowId: string;
      status: "started";
    }
  | {
      workflowId: string;
      status: "completed" | "failed";
      result: EventDispatchResult;
    };

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

  @Action("dispatch")
  async dispatch(params: EventDispatchActionParams): Promise<EventDispatchActionResult> {
    const input = toDispatchInput(params);
    const started = await this.broker.startWorkflow<EventDispatchInput>(
      "events.dispatch",
      input,
      buildDispatchIdempotency(input),
    );

    if (!params.waitForResult) {
      return started;
    }

    const result = await this.broker
      .getWorkflowRegistry()
      .retrieve<EventDispatchResult>(started.workflowId)
      .getResult();

    return {
      workflowId: started.workflowId,
      status: result.failed > 0 ? "failed" : "completed",
      result,
    };
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
}

function toDispatchInput(params: EventDispatchActionParams): EventDispatchInput {
  if (params.kind === "event") {
    return {
      kind: "event",
      organizationId: params.organizationId,
      eventId: params.eventId,
    };
  }

  return {
    kind: "batch",
    organizationId: params.organizationId,
    eventType: params.eventType,
    batchKey: params.batchKey,
    limit: params.limit,
  };
}

function buildDispatchIdempotency(input: EventDispatchInput): IdempotencyContext {
  const parentWorkflowId = DBOS.workflowID;
  const callId = buildDispatchCallId(input);

  if (parentWorkflowId) {
    return {
      source: "workflow",
      organizationId: input.organizationId,
      workflowId: parentWorkflowId,
      stepId: buildDispatchOperation(input),
      callId,
    };
  }

  return {
    source: "content",
    organizationId: input.organizationId,
    resourceId: buildDispatchResourceId(input),
    operation: buildDispatchOperation(input),
    content: input,
  };
}

function buildDispatchCallId(input: EventDispatchInput): string {
  if (input.kind === "event") {
    return input.eventId;
  }

  return `${input.batchKey}:${input.eventType ?? "*"}:${input.limit ?? "default"}`;
}

function buildDispatchResourceId(input: EventDispatchInput): string {
  if (input.kind === "event") {
    return input.eventId;
  }

  return input.batchKey;
}

function buildDispatchOperation(input: EventDispatchInput): string {
  if (input.kind === "event") {
    return "dispatchEvent";
  }

  return "dispatchBatch";
}

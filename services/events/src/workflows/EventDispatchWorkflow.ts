import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  WorkflowStep,
  InjectBroker,
  ServiceBroker,
  withTimeout,
  StepTimeoutError,
  DBOS,
} from "@shopana/shared-kernel";
import type {
  DomainEvent,
  EventDispatchInput,
  EventDispatchResult,
  EventHandlerResponse,
  HandlerInfo,
  HandlerInvocationResult,
} from "@shopana/events";
import { getConfig } from "@shopana/shared-service-config";
import { Kernel } from "../kernel/Kernel.js";
import type { DomainEventRecord } from "../repositories/models/domainEvents.js";

const DEFAULT_HANDLER_TIMEOUT_MS = 30_000;

@Injectable()
export class EventDispatchWorkflow extends BrokerWorkflows<
  EventDispatchInput,
  EventDispatchResult
> {
  constructor(@InjectBroker("events") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  private get repository() {
    return this.kernel.repository;
  }

  @Workflow("dispatch")
  async run(input: EventDispatchInput): Promise<EventDispatchResult> {
    const records = await this.stepClaimEvents(input);
    if (records.length === 0) {
      return { claimed: 0, dispatched: 0, failed: 0 };
    }

    let dispatched = 0;
    let failed = 0;

    for (const record of records) {
      const event = toDomainEvent(record);
      const handlers = await this.getAvailableHandlers(
        event.eventType,
        event.eventId,
      );
      const results = await Promise.all(
        handlers.map((handler) => this.tryInvokeHandler(event, handler)),
      );

      if (results.some((result) => result.status === "failed")) {
        await this.markFailed(event.eventId);
        failed++;
      } else {
        await this.markDispatched(event.eventId);
        dispatched++;
      }
    }

    return { claimed: records.length, dispatched, failed };
  }

  @WorkflowStep()
  private async stepClaimEvents(
    input: EventDispatchInput,
  ): Promise<DomainEventRecord[]> {
    const lockedBy = DBOS.workflowID ?? "events.dispatch";

    if (input.kind === "event") {
      return this.repository.claimEvent({
        tenantId: input.tenantId,
        eventId: input.eventId,
        lockedBy,
      });
    }

    return this.repository.claimBatch({
      tenantId: input.tenantId,
      eventType: input.eventType,
      batchKey: input.batchKey,
      limit: input.limit,
      lockedBy,
    });
  }

  private async getAvailableHandlers(
    eventType: string,
    eventId: string,
  ): Promise<HandlerInfo[]> {
    return DBOS.runStep(
      async () => {
        const config = getConfig();
        const serviceNames = Object.keys(config.services ?? {});
        const handlers: HandlerInfo[] = [];

        for (const serviceName of serviceNames) {
          const action = `${serviceName}.${eventType}`;

          if (this.broker.hasAction(action)) {
            const metadata = this.broker.getActionMetadata(action);
            const retryPolicy = metadata?.retryPolicy ?? {
              maxAttempts: 3,
              intervalSeconds: 1,
              backoffRate: 2,
            };

            handlers.push({ serviceName, action, retryPolicy });
          }
        }

        return handlers;
      },
      {
        name: `handlers:${eventId}:${eventType}`,
        retriesAllowed: true,
        maxAttempts: 3,
        intervalSeconds: 1,
        backoffRate: 2,
      },
    );
  }

  private async tryInvokeHandler(
    event: DomainEvent,
    handler: HandlerInfo,
  ): Promise<HandlerInvocationResult> {
    const { serviceName, action, retryPolicy } = handler;
    const timeoutMs = retryPolicy.timeoutMs ?? DEFAULT_HANDLER_TIMEOUT_MS;
    const stepName = `handler:${action}:${event.eventId}`;

    type StepResult =
      | { kind: "ok"; durationMs: number }
      | {
          kind: "nonRetryableFailure";
          error: { message: string; code?: string };
          durationMs: number;
        }
      | {
          kind: "timeout";
          error: { message: string; code: string };
          durationMs: number;
        };

    let stepResult: StepResult;

    try {
      stepResult = await DBOS.runStep<StepResult>(
        async () => {
          const startTime = Date.now();

          try {
            const resp: EventHandlerResponse = await withTimeout(
              () => this.broker.call(action, { event }),
              timeoutMs,
              action,
            );
            const durationMs = Date.now() - startTime;

            if (resp.success) {
              return { kind: "ok", durationMs };
            }

            const error = resp.error;
            if (!error.retryable) {
              return {
                kind: "nonRetryableFailure",
                error: { message: error.message, code: error.code },
                durationMs,
              };
            }

            throw new Error(error.message);
          } catch (error) {
            const durationMs = Date.now() - startTime;

            if (error instanceof StepTimeoutError) {
              return {
                kind: "timeout",
                error: { message: error.message, code: "HANDLER_TIMEOUT" },
                durationMs,
              };
            }

            throw error;
          }
        },
        {
          name: stepName,
          retriesAllowed: true,
          maxAttempts: retryPolicy.maxAttempts,
          intervalSeconds: retryPolicy.intervalSeconds,
          backoffRate: retryPolicy.backoffRate,
        },
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.sendToDLQ(
        event,
        handler,
        errorMsg,
        undefined,
        retryPolicy.maxAttempts,
        stepName,
      );
      return {
        service: serviceName,
        status: "failed",
        error: errorMsg,
        durationMs: 0,
      };
    }

    if (stepResult.kind === "timeout") {
      await this.sendToDLQ(
        event,
        handler,
        stepResult.error.message,
        stepResult.error.code,
        1,
        stepName,
      );
      return {
        service: serviceName,
        status: "failed",
        error: stepResult.error.message,
        durationMs: stepResult.durationMs,
      };
    }

    if (stepResult.kind === "nonRetryableFailure") {
      await this.sendToDLQ(
        event,
        handler,
        stepResult.error.message,
        stepResult.error.code,
        1,
        stepName,
      );
      return {
        service: serviceName,
        status: "failed",
        error: stepResult.error.message,
        durationMs: stepResult.durationMs,
      };
    }

    return {
      service: serviceName,
      status: "success",
      durationMs: stepResult.durationMs,
    };
  }

  private async sendToDLQ(
    event: DomainEvent,
    handler: HandlerInfo,
    error: string,
    errorCode: string | undefined,
    attempts: number,
    dbosStepName: string,
  ): Promise<void> {
    await DBOS.runStep(
      async () => {
        await this.repository.addToDLQ({
          eventId: event.eventId,
          eventType: event.eventType,
          tenantId: event.context.tenantId,
          correlationId: event.context.correlationId,
          handler: { service: handler.serviceName, action: handler.action },
          error,
          errorCode,
          attempts,
          dbosWorkflowId: DBOS.workflowID ?? undefined,
          dbosStepName,
        });
      },
      {
        name: `dlq:${event.eventId}:${handler.action}`,
        retriesAllowed: true,
        maxAttempts: 3,
        intervalSeconds: 1,
        backoffRate: 2,
      },
    );
  }

  private async markDispatched(eventId: string): Promise<void> {
    await DBOS.runStep(
      async () => {
        await this.repository.markDispatched(eventId);
      },
      {
        name: `markDispatched:${eventId}`,
        retriesAllowed: true,
        maxAttempts: 3,
        intervalSeconds: 1,
        backoffRate: 2,
      },
    );
  }

  private async markFailed(eventId: string): Promise<void> {
    await DBOS.runStep(
      async () => {
        await this.repository.markFailed(eventId);
      },
      {
        name: `markFailed:${eventId}`,
        retriesAllowed: true,
        maxAttempts: 3,
        intervalSeconds: 1,
        backoffRate: 2,
      },
    );
  }
}

function toDomainEvent(record: DomainEventRecord): DomainEvent {
  return {
    eventId: record.eventId,
    eventType: record.eventType,
    timestamp: toISOString(record.timestamp),
    source: record.source,
    payload: record.payload,
    emitKey: record.emitKey,
    parentWorkflowId: record.parentWorkflowId ?? undefined,
    context: {
      tenantId: record.tenantId,
      userId: record.userId ?? undefined,
      correlationId: record.correlationId,
      causationId: record.causationId ?? undefined,
    },
    subject: { type: record.subjectType, id: record.subjectId },
    actor: {
      type: record.actorType as "user" | "service" | "system",
      id: record.actorId ?? undefined,
    },
  };
}

function toISOString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

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
  EventContext,
  EventDispatchResult,
  HandlerInfo,
  EventHandlerResponse,
  HandlerInvocationResult,
} from "@shopana/events";
import {
  makeDeterministicCorrelationId,
  makeDispatchWorkflowId,
  makeEventId,
} from "@shopana/events";
import { getConfig } from "@shopana/shared-service-config";
import { Kernel } from "../kernel/Kernel.js";

const DEFAULT_HANDLER_TIMEOUT_MS = 30_000; // 30 seconds

export interface EmitParams<TType extends string = string, TPayload = unknown> {
  eventType: TType;
  payload: TPayload;
  source: string;
  context: Omit<EventContext, "correlationId"> & { correlationId?: string };
  subject: { type: string; id: string };
  actor?: { type: "user" | "service" | "system"; id?: string };
  emitKey: string;
}

@Injectable()
export class EventDispatchWorkflow extends BrokerWorkflows {
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
  async run(params: EmitParams): Promise<EventDispatchResult> {
    const { event } = this.buildEvent(params);
    const { timestamp } = await this.stepPersistEvent(event);
    event.timestamp = timestamp;

    const handlers = await this.stepGetAvailableHandlers(event.eventType);

    const results = await Promise.all(
      handlers.map((handler) => this.tryInvokeHandler(event, handler))
    );

    await this.stepUpdateEventStatus(event.eventId, results);

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      status: "completed",
      servicesNotified: handlers.length,
      results,
    };
  }

  @WorkflowStep()
  private async stepPersistEvent(
    event: DomainEvent
  ): Promise<{ timestamp: string }> {
    return this.repository.persistEvent(event);
  }

  @WorkflowStep()
  private async stepGetAvailableHandlers(eventType: string): Promise<HandlerInfo[]> {
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
  }

  /**
   * Try to invoke a handler with retry logic.
   * This uses DBOS.runStep directly for fine-grained retry control.
   */
  private async tryInvokeHandler(
    event: DomainEvent,
    handler: HandlerInfo
  ): Promise<HandlerInvocationResult> {
    const { serviceName, action, retryPolicy } = handler;
    const timeoutMs = retryPolicy.timeoutMs ?? DEFAULT_HANDLER_TIMEOUT_MS;

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
              this.broker.call(action, { event }),
              timeoutMs,
              action
            );
            const durationMs = Date.now() - startTime;

            if (resp.success) {
              return { kind: "ok", durationMs };
            }

            // Error case
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

            // Timeout is non-retryable - send to DLQ immediately
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
          name: `handler:${action}:${event.eventId}`,
          retriesAllowed: true,
          maxAttempts: retryPolicy.maxAttempts,
          intervalSeconds: retryPolicy.intervalSeconds,
          backoffRate: retryPolicy.backoffRate,
        }
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.stepSendToDLQ(
        event,
        handler,
        errorMsg,
        undefined,
        retryPolicy.maxAttempts
      );
      return { service: serviceName, status: "failed", error: errorMsg, durationMs: 0 };
    }

    if (stepResult.kind === "timeout") {
      await this.stepSendToDLQ(
        event,
        handler,
        stepResult.error.message,
        stepResult.error.code,
        1 // Only 1 attempt - timeout is non-retryable
      );
      return {
        service: serviceName,
        status: "failed",
        error: stepResult.error.message,
        durationMs: stepResult.durationMs,
      };
    }

    if (stepResult.kind === "nonRetryableFailure") {
      await this.stepSendToDLQ(
        event,
        handler,
        stepResult.error.message,
        stepResult.error.code,
        1
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

  @WorkflowStep()
  private async stepSendToDLQ(
    event: DomainEvent,
    handler: HandlerInfo,
    error: string,
    errorCode: string | undefined,
    attempts: number
  ): Promise<void> {
    await this.repository.addToDLQ({
      eventId: event.eventId,
      eventType: event.eventType,
      tenantId: event.context.tenantId,
      correlationId: event.context.correlationId,
      handler: { service: handler.serviceName, action: handler.action },
      error,
      errorCode,
      attempts,
    });
  }

  @WorkflowStep()
  private async stepUpdateEventStatus(
    eventId: string,
    results: HandlerInvocationResult[]
  ): Promise<void> {
    await this.repository.updateEventStatus(eventId, results);
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
}

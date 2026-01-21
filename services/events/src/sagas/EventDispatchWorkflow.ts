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
  EventDispatchResult,
  HandlerInfo,
  EventHandlerResponse,
  HandlerInvocationResult,
} from "@shopana/events";
import { getConfig } from "@shopana/shared-service-config";
import { Kernel } from "../kernel/Kernel.js";

const DEFAULT_HANDLER_TIMEOUT_MS = 30_000; // 30 seconds

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

  @Workflow("eventDispatch")
  async run(event: DomainEvent): Promise<EventDispatchResult> {
    const { timestamp } = await this.persistEvent(event);
    event.timestamp = timestamp;

    const handlers = await this.getAvailableHandlers(event.eventType);

    const results = await Promise.all(
      handlers.map((handler) => this.tryInvokeHandler(event, handler))
    );

    await this.updateEventStatus(event.eventId, results);

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      status: "completed",
      servicesNotified: handlers.length,
      results,
    };
  }

  @WorkflowStep()
  private async persistEvent(
    event: DomainEvent
  ): Promise<{ timestamp: string }> {
    return this.repository.persistEvent(event);
  }

  @WorkflowStep()
  private async getAvailableHandlers(eventType: string): Promise<HandlerInfo[]> {
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

            if (resp.ok) {
              return { kind: "ok", durationMs };
            }

            if (!resp.error.retryable) {
              return {
                kind: "nonRetryableFailure",
                error: { message: resp.error.message, code: resp.error.code },
                durationMs,
              };
            }

            throw new Error(resp.error.message);
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
      await this.sendToDLQ(
        event,
        handler,
        errorMsg,
        undefined,
        retryPolicy.maxAttempts
      );
      return { service: serviceName, status: "failed", error: errorMsg, durationMs: 0 };
    }

    if (stepResult.kind === "timeout") {
      await this.sendToDLQ(
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
      await this.sendToDLQ(
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
  private async sendToDLQ(
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
  private async updateEventStatus(
    eventId: string,
    results: HandlerInvocationResult[]
  ): Promise<void> {
    await this.repository.updateEventStatus(eventId, results);
  }
}

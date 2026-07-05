import { createHash } from "node:crypto";
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
  BatchHandlerInvocationResult,
  DomainEvent,
  EventBatchHandlerResponse,
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
const BATCH_EVENT_ACTION_SUFFIX = ":batch";

type BatchHandlerAttemptResult =
  | { kind: "ok"; durationMs: number; stepName: string }
  | {
      kind: "failure";
      retryable: boolean;
      error: { message: string; code?: string };
      failedEventIds: string[];
      durationMs: number;
      stepName: string;
    };

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

    if (input.kind === "batch") {
      return this.dispatchBatchEvents(records);
    }

    return this.dispatchSingleEvents(records);
  }

  @WorkflowStep()
  private async stepClaimEvents(
    input: EventDispatchInput,
  ): Promise<DomainEventRecord[]> {
    const lockedBy = this.getDispatchWorkflowId();

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

  private getDispatchWorkflowId(): string {
    const workflowId = DBOS.workflowID;
    if (!workflowId) {
      throw new Error("events.dispatch must run inside a DBOS workflow context");
    }

    return workflowId;
  }

  private async dispatchSingleEvents(
    records: DomainEventRecord[],
  ): Promise<EventDispatchResult> {
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

  private async dispatchBatchEvents(
    records: DomainEventRecord[],
  ): Promise<EventDispatchResult> {
    let dispatched = 0;
    let failed = 0;

    for (const eventRecords of groupRecordsByEventType(records).values()) {
      const events = eventRecords.map(toDomainEvent);
      const firstEvent = events[0];
      if (!firstEvent) continue;

      const eventIds = events.map((event) => event.eventId);
      const batchHandlers = await this.getAvailableBatchHandlers(
        firstEvent.eventType,
        eventIds,
      );
      const individualHandlers = await this.getAvailableHandlers(
        firstEvent.eventType,
        hashValues(eventIds),
      );
      const individualOnlyHandlers = excludeBatchHandledServices(
        individualHandlers,
        batchHandlers,
      );

      const batchResults = await Promise.all(
        batchHandlers.map((handler) => this.tryInvokeBatchHandler(events, handler)),
      );
      const failedEventIds = collectFailedEventIds(batchResults);
      const individualFailedEventIds = await this.tryInvokeHandlersIndividually(
        events,
        individualOnlyHandlers,
      );
      for (const eventId of individualFailedEventIds) {
        failedEventIds.add(eventId);
      }

      const dispatchedEventIds = eventIds.filter((id) => !failedEventIds.has(id));

      await this.markDispatchedBatch(dispatchedEventIds);
      await this.markFailedBatch([...failedEventIds]);

      dispatched += dispatchedEventIds.length;
      failed += failedEventIds.size;
    }

    return { claimed: records.length, dispatched, failed };
  }

  private async tryInvokeHandlersIndividually(
    events: DomainEvent[],
    handlers: HandlerInfo[],
  ): Promise<Set<string>> {
    const failedEventIds = new Set<string>();
    if (handlers.length === 0) {
      return failedEventIds;
    }

    for (const event of events) {
      const results = await Promise.all(
        handlers.map((handler) => this.tryInvokeHandler(event, handler)),
      );

      if (results.some((result) => result.status === "failed")) {
        failedEventIds.add(event.eventId);
      }
    }

    return failedEventIds;
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

  private async getAvailableBatchHandlers(
    eventType: string,
    eventIds: readonly string[],
  ): Promise<HandlerInfo[]> {
    const batchHash = hashValues(eventIds);

    return DBOS.runStep(
      async () => {
        const config = getConfig();
        const serviceNames = Object.keys(config.services ?? {});
        const handlers: HandlerInfo[] = [];

        for (const serviceName of serviceNames) {
          const action = `${serviceName}.${eventType}${BATCH_EVENT_ACTION_SUFFIX}`;

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
        name: `batchHandlers:${eventType}:${batchHash}`,
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

  private async tryInvokeBatchHandler(
    events: DomainEvent[],
    handler: HandlerInfo,
  ): Promise<BatchHandlerInvocationResult> {
    const { serviceName, retryPolicy } = handler;
    const eventIds = events.map((event) => event.eventId);
    let pendingEvents = events;
    let durationMs = 0;
    let attempt = 1;

    while (pendingEvents.length > 0) {
      const attemptResult = await this.invokeBatchHandlerAttempt(
        pendingEvents,
        handler,
        attempt,
      );
      durationMs += attemptResult.durationMs;

      if (attemptResult.kind === "ok") {
        return {
          service: serviceName,
          status: "success",
          eventIds,
          failedEventIds: [],
          durationMs,
        };
      }

      const exhausted = attempt >= retryPolicy.maxAttempts;
      if (!attemptResult.retryable || exhausted) {
        await this.sendBatchToDLQ(
          events,
          handler,
          attemptResult.error.message,
          attemptResult.error.code,
          attempt,
          attemptResult.stepName,
          attemptResult.failedEventIds,
        );
        return {
          service: serviceName,
          status: "failed",
          eventIds,
          failedEventIds: attemptResult.failedEventIds,
          error: attemptResult.error.message,
          durationMs,
        };
      }

      await this.sleepBeforeBatchRetry(handler, attempt);
      pendingEvents = selectEventsByIds(pendingEvents, attemptResult.failedEventIds);
      attempt++;
    }

    return {
      service: serviceName,
      status: "success",
      eventIds,
      failedEventIds: [],
      durationMs,
    };
  }

  private async invokeBatchHandlerAttempt(
    events: DomainEvent[],
    handler: HandlerInfo,
    attempt: number,
  ): Promise<BatchHandlerAttemptResult> {
    const { action, retryPolicy } = handler;
    const eventIds = events.map((event) => event.eventId);
    const timeoutMs = retryPolicy.timeoutMs ?? DEFAULT_HANDLER_TIMEOUT_MS;
    const stepName = `batchHandler:${action}:${hashValues(eventIds)}:${attempt}`;

    return DBOS.runStep<BatchHandlerAttemptResult>(
      async () => {
        const startTime = Date.now();

        try {
          const resp: EventBatchHandlerResponse = await withTimeout(
            () =>
              this.broker.call(action, {
                events,
                payloads: events.map((event) => event.payload),
              }),
            timeoutMs,
            action,
          );
          const durationMs = Date.now() - startTime;

          if (resp.success) {
            return { kind: "ok", durationMs, stepName };
          }

          return {
            kind: "failure",
            retryable: resp.error.retryable,
            error: { message: resp.error.message, code: resp.error.code },
            failedEventIds: normalizeFailedEventIds(resp.failedEventIds, eventIds),
            durationMs,
            stepName,
          };
        } catch (error) {
          const durationMs = Date.now() - startTime;

          if (error instanceof StepTimeoutError) {
            return {
              kind: "failure",
              retryable: false,
              error: { message: error.message, code: "HANDLER_TIMEOUT" },
              failedEventIds: eventIds,
              durationMs,
              stepName,
            };
          }

          const message = error instanceof Error ? error.message : String(error);
          return {
            kind: "failure",
            retryable: true,
            error: { message },
            failedEventIds: eventIds,
            durationMs,
            stepName,
          };
        }
      },
      {
        name: stepName,
        retriesAllowed: false,
      },
    );
  }

  private async sleepBeforeBatchRetry(
    handler: HandlerInfo,
    failedAttempt: number,
  ): Promise<void> {
    const delayMs = getRetryDelayMs(handler.retryPolicy, failedAttempt);
    if (delayMs <= 0) return;

    await DBOS.sleep(delayMs);
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

  private async sendBatchToDLQ(
    events: DomainEvent[],
    handler: HandlerInfo,
    error: string,
    errorCode: string | undefined,
    attempts: number,
    dbosStepName: string,
    failedEventIds: readonly string[],
  ): Promise<void> {
    const failedEventIdSet = new Set(failedEventIds);
    const failedEvents = events.filter((event) => failedEventIdSet.has(event.eventId));
    if (failedEvents.length === 0) return;

    await DBOS.runStep(
      async () => {
        await Promise.all(
          failedEvents.map((event) =>
            this.repository.addToDLQ({
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
            }),
          ),
        );
      },
      {
        name: `dlqBatch:${handler.action}:${hashValues(failedEventIds)}`,
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

  private async markDispatchedBatch(eventIds: readonly string[]): Promise<void> {
    if (eventIds.length === 0) return;

    await DBOS.runStep(
      async () => {
        await this.repository.markDispatchedMany(eventIds);
      },
      {
        name: `markDispatchedBatch:${hashValues(eventIds)}`,
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

  private async markFailedBatch(eventIds: readonly string[]): Promise<void> {
    if (eventIds.length === 0) return;

    await DBOS.runStep(
      async () => {
        await this.repository.markFailedMany(eventIds);
      },
      {
        name: `markFailedBatch:${hashValues(eventIds)}`,
        retriesAllowed: true,
        maxAttempts: 3,
        intervalSeconds: 1,
        backoffRate: 2,
      },
    );
  }
}

function groupRecordsByEventType(
  records: DomainEventRecord[],
): Map<string, DomainEventRecord[]> {
  const groups = new Map<string, DomainEventRecord[]>();

  for (const record of records) {
    const group = groups.get(record.eventType) ?? [];
    group.push(record);
    groups.set(record.eventType, group);
  }

  return groups;
}

function collectFailedEventIds(
  results: readonly BatchHandlerInvocationResult[],
): Set<string> {
  const failedEventIds = new Set<string>();

  for (const result of results) {
    if (result.status !== "failed") continue;

    for (const eventId of result.failedEventIds) {
      failedEventIds.add(eventId);
    }
  }

  return failedEventIds;
}

function excludeBatchHandledServices(
  individualHandlers: readonly HandlerInfo[],
  batchHandlers: readonly HandlerInfo[],
): HandlerInfo[] {
  const batchServiceNames = new Set(
    batchHandlers.map((handler) => handler.serviceName),
  );

  return individualHandlers.filter(
    (handler) => !batchServiceNames.has(handler.serviceName),
  );
}

function normalizeFailedEventIds(
  failedEventIds: readonly string[] | undefined,
  allEventIds: readonly string[],
): string[] {
  if (!failedEventIds || failedEventIds.length === 0) {
    return [...allEventIds];
  }

  const allEventIdSet = new Set(allEventIds);
  const normalized = [...new Set(failedEventIds)].filter((eventId) =>
    allEventIdSet.has(eventId),
  );

  return normalized.length > 0 ? normalized : [...allEventIds];
}

function selectEventsByIds(
  events: readonly DomainEvent[],
  eventIds: readonly string[],
): DomainEvent[] {
  const eventIdSet = new Set(eventIds);
  return events.filter((event) => eventIdSet.has(event.eventId));
}

function getRetryDelayMs(
  retryPolicy: HandlerInfo["retryPolicy"],
  failedAttempt: number,
): number {
  return Math.round(
    retryPolicy.intervalSeconds *
      Math.pow(retryPolicy.backoffRate, failedAttempt - 1) *
      1000,
  );
}

function hashValues(values: readonly string[]): string {
  return createHash("sha256").update(values.join("\0")).digest("hex").slice(0, 16);
}

function toDomainEvent(record: DomainEventRecord): DomainEvent {
  return {
    eventId: record.eventId,
    eventType: record.eventType,
    eventSequence: record.eventSequence,
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

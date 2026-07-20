import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  InjectBroker,
  ServiceBroker,
  withTimeout,
  StepTimeoutError,
  DBOS,
} from "@shopana/shared-kernel";
import type {
  DomainEvent,
  EventBatchHandlerResponse,
  EventDispatchInput,
  EventDispatchResult,
  EventHandlerDelivery,
  EventHandlerResponse,
  HandlerInfo,
} from "@shopana/events";
import { getConfig } from "@shopana/shared-service-config";
import { Kernel } from "../kernel/Kernel.js";
import type { DomainEventRecord } from "../repositories/models/domainEvents.js";
import type { EventHandlerJobRecord } from "../repositories/models/eventHandlerJobs.js";
import type {
  EventHandlerJobDefinition,
  EventHandlerJobKind,
} from "../repositories/Repository.js";

const DEFAULT_HANDLER_TIMEOUT_MS = 30_000;
const DEFAULT_DISPATCH_LIMIT = 500;
const BATCH_EVENT_ACTION_SUFFIX = ":batch";
const HANDLER_ATTEMPTS_EXHAUSTED_CODE = "HANDLER_ATTEMPTS_EXHAUSTED";
const HANDLER_ATTEMPTS_EXHAUSTED_MESSAGE = "Handler retry attempts exhausted";

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
    const records = await this.findDispatchRecords(input);
    if (records.length === 0) {
      return { claimed: 0, dispatched: 0, failed: 0 };
    }

    const jobDefinitions = await this.buildJobDefinitions(records);
    await this.repository.ensureHandlerJobs(jobDefinitions);

    const eventIds = records.map((record) => record.eventId);
    const lockedBy = this.getDispatchRunId();
    const claimLimit = Math.max(
      jobDefinitions.length,
      records.length * 10,
      DEFAULT_DISPATCH_LIMIT,
    );
    let statuses = await this.repository.refreshEventDispatchStatuses(eventIds);

    while (statuses.dispatching > 0) {
      const jobs = await this.findRunnableJobs(eventIds, lockedBy, claimLimit);

      if (jobs.length > 0) {
        await this.invokeClaimedJobs(records, jobs);
        statuses = await this.repository.refreshEventDispatchStatuses(eventIds);
        continue;
      }

      const nextClaimAt = await this.repository.findNextHandlerJobClaimAt(eventIds);
      if (!nextClaimAt) {
        break;
      }

      await DBOS.sleep(getDelayUntil(nextClaimAt));
      statuses = await this.repository.refreshEventDispatchStatuses(eventIds);
    }

    return {
      claimed: records.length,
      dispatched: statuses.dispatched,
      failed: statuses.failed,
    };
  }

  private async findDispatchRecords(
    input: EventDispatchInput,
  ): Promise<DomainEventRecord[]> {
    if (input.kind === "event") {
      return this.repository.findEventForDispatch({
        organizationId: input.organizationId,
        eventId: input.eventId,
      });
    }

    return this.repository.findBatchEventsForDispatch({
      organizationId: input.organizationId,
      eventType: input.eventType,
      batchKey: input.batchKey,
      limit: input.limit,
    });
  }

  private getDispatchRunId(): string {
    return DBOS.workflowID ?? `events.dispatch:${Date.now()}`;
  }

  private async buildJobDefinitions(
    records: DomainEventRecord[],
  ): Promise<EventHandlerJobDefinition[]> {
    const definitions: EventHandlerJobDefinition[] = [];

    for (const eventRecords of groupRecordsByEventType(records).values()) {
      const firstRecord = eventRecords[0];
      if (!firstRecord) continue;

      const singleHandlers = await this.getAvailableHandlers(firstRecord.eventType);
      const batchHandlers = await this.getAvailableBatchHandlers(firstRecord.eventType);
      const singleOnlyHandlers = excludeBatchHandledServices(
        singleHandlers,
        batchHandlers,
      );

      for (const record of eventRecords) {
        if (record.dispatchMode === "deferred") {
          definitions.push(
            ...this.buildDefinitionsForHandlers(record, batchHandlers, "batch"),
            ...this.buildDefinitionsForHandlers(record, singleOnlyHandlers, "single"),
          );
          continue;
        }

        definitions.push(
          ...this.buildDefinitionsForHandlers(record, singleHandlers, "single"),
        );
      }
    }

    return definitions;
  }

  private async findRunnableJobs(
    eventIds: readonly string[],
    lockedBy: string,
    limit: number,
  ): Promise<EventHandlerJobRecord[]> {
    await this.repository.markDueExhaustedHandlerJobsDLQ({
      eventIds,
      limit,
      dbosWorkflowId: DBOS.workflowID ?? undefined,
    });

    const alreadyClaimed = await this.repository.findClaimedHandlerJobs({
      eventIds,
      lockedBy,
      limit,
    });
    const remainingLimit = Math.max(limit - alreadyClaimed.length, 0);
    const newlyClaimed =
      remainingLimit > 0
        ? await this.repository.claimHandlerJobs({
            eventIds,
            lockedBy,
            limit: remainingLimit,
          })
        : [];

    const claimed = dedupeJobs([...alreadyClaimed, ...newlyClaimed]);
    const exhaustedJobs = claimed.filter(
      (job) => job.attempts > job.maxAttempts,
    );

    await this.handleFailedJobs(exhaustedJobs, {
      message: HANDLER_ATTEMPTS_EXHAUSTED_MESSAGE,
      code: HANDLER_ATTEMPTS_EXHAUSTED_CODE,
      retryable: false,
    });

    return claimed.filter((job) => job.attempts <= job.maxAttempts);
  }

  private buildDefinitionsForHandlers(
    record: DomainEventRecord,
    handlers: readonly HandlerInfo[],
    handlerKind: EventHandlerJobKind,
  ): EventHandlerJobDefinition[] {
    return handlers.map((handler) => ({
      jobId: buildHandlerJobId(record.eventId, handler.action),
      event: record,
      handler,
      handlerKind,
    }));
  }

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

  private async getAvailableBatchHandlers(
    eventType: string,
  ): Promise<HandlerInfo[]> {
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
  }

  private async invokeClaimedJobs(
    records: readonly DomainEventRecord[],
    jobs: readonly EventHandlerJobRecord[],
  ): Promise<void> {
    const eventsById = new Map(
      records.map((record) => [record.eventId, toDomainEvent(record)]),
    );
    const jobsWithEvents = jobs
      .map((job) => ({ job, event: eventsById.get(job.eventId) }))
      .filter(
        (item): item is { job: EventHandlerJobRecord; event: DomainEvent } =>
          item.event !== undefined,
      );

    const singleJobs = jobsWithEvents.filter(
      (item) => item.job.handlerKind === "single",
    );
    const batchJobs = jobsWithEvents.filter(
      (item) => item.job.handlerKind === "batch",
    );

    await Promise.all(
      singleJobs.map(({ job, event }) => this.invokeSingleHandlerJob(job, event)),
    );

    for (const groupedJobs of groupBatchJobs(batchJobs).values()) {
      await this.invokeBatchHandlerJobs(groupedJobs);
    }
  }

  private async invokeSingleHandlerJob(
    job: EventHandlerJobRecord,
    event: DomainEvent,
  ): Promise<void> {
    const timeoutMs = job.timeoutMs ?? DEFAULT_HANDLER_TIMEOUT_MS;
    let response: EventHandlerResponse;

    try {
      response = await withTimeout(
        () =>
          this.broker.callEvent<
            EventHandlerResponse,
            { event: DomainEvent; delivery: EventHandlerDelivery }
          >(
            job.handlerAction,
            {
              event,
              delivery: toDelivery(job),
            },
            event.source,
          ),
        timeoutMs,
        job.handlerAction,
      );
    } catch (error) {
      await this.handleFailedJobs([job], normalizeHandlerError(error));
      return;
    }

    if (response.success) {
      await this.repository.markHandlerJobsSucceeded([job]);
      return;
    }

    await this.handleFailedJobs([job], {
      message: response.error.message,
      code: response.error.code,
      retryable: response.error.retryable,
    });
  }

  private async invokeBatchHandlerJobs(
    items: readonly { job: EventHandlerJobRecord; event: DomainEvent }[],
  ): Promise<void> {
    if (items.length === 0) return;

    const first = items[0];
    if (!first) return;

    const events = items.map((item) => item.event);
    const eventIds = events.map((event) => event.eventId);
    const timeoutMs = Math.max(
      ...items.map((item) => item.job.timeoutMs ?? DEFAULT_HANDLER_TIMEOUT_MS),
    );
    let response: EventBatchHandlerResponse;

    try {
      response = await withTimeout(
        () =>
          this.broker.callEvent<
            EventBatchHandlerResponse,
            {
              events: DomainEvent[];
              payloads: unknown[];
              deliveries: EventHandlerDelivery[];
            }
          >(
            first.job.handlerAction,
            {
              events,
              payloads: events.map((event) => event.payload),
              deliveries: items.map((item) => toDelivery(item.job)),
            },
            first.event.source,
          ),
        timeoutMs,
        first.job.handlerAction,
      );
    } catch (error) {
      await this.handleFailedJobs(
        items.map((item) => item.job),
        normalizeHandlerError(error),
      );
      return;
    }

    if (response.success) {
      await this.repository.markHandlerJobsSucceeded(
        items.map((item) => item.job),
      );
      return;
    }

    const failedEventIds = new Set(
      normalizeFailedEventIds(response.failedEventIds, eventIds),
    );
    const succeededJobs = items
      .filter((item) => !failedEventIds.has(item.job.eventId))
      .map((item) => item.job);
    const failedJobs = items
      .filter((item) => failedEventIds.has(item.job.eventId))
      .map((item) => item.job);

    await this.repository.markHandlerJobsSucceeded(succeededJobs);
    await this.handleFailedJobs(failedJobs, {
      message: response.error.message,
      code: response.error.code,
      retryable: response.error.retryable,
    });
  }

  private async handleFailedJobs(
    jobs: readonly EventHandlerJobRecord[],
    error: { message: string; code?: string; retryable: boolean },
  ): Promise<void> {
    await Promise.all(
      jobs.map(async (job) => {
        const exhausted = job.attempts >= job.maxAttempts;
        const stepName = `${job.handlerKind}Handler:${job.handlerAction}:${job.eventId}`;

        if (!error.retryable || exhausted) {
          await this.repository.markHandlerJobDLQ({
            job,
            error: error.message,
            errorCode: error.code,
            dbosWorkflowId: DBOS.workflowID ?? undefined,
            dbosStepName: stepName,
          });
          return;
        }

        await this.repository.markHandlerJobsPending({
          jobs: [job],
          error: error.message,
          errorCode: error.code,
          nextAttemptAt: new Date(Date.now() + getRetryDelayMs(job)),
        });
      }),
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

function groupBatchJobs(
  items: readonly { job: EventHandlerJobRecord; event: DomainEvent }[],
): Map<string, Array<{ job: EventHandlerJobRecord; event: DomainEvent }>> {
  const groups = new Map<
    string,
    Array<{ job: EventHandlerJobRecord; event: DomainEvent }>
  >();

  for (const item of items) {
    const groupKey = [
      item.job.organizationId,
      item.job.eventType,
      item.job.batchKey ?? "",
      item.job.handlerAction,
      item.event.source,
    ].join("\0");
    const group = groups.get(groupKey) ?? [];
    group.push(item);
    groups.set(groupKey, group);
  }

  return groups;
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

function normalizeHandlerError(error: unknown): {
  message: string;
  code?: string;
  retryable: boolean;
} {
  if (error instanceof StepTimeoutError) {
    return {
      message: error.message,
      code: "HANDLER_TIMEOUT",
      retryable: false,
    };
  }

  return {
    message: error instanceof Error ? error.message : String(error),
    retryable: true,
  };
}

function getRetryDelayMs(job: EventHandlerJobRecord): number {
  return Math.round(
    job.intervalSeconds * Math.pow(job.backoffRate, job.attempts - 1) * 1000,
  );
}

function getDelayUntil(date: Date): number {
  return Math.max(date.getTime() - Date.now(), 0);
}

function dedupeJobs(jobs: readonly EventHandlerJobRecord[]): EventHandlerJobRecord[] {
  const byId = new Map<string, EventHandlerJobRecord>();

  for (const job of jobs) {
    byId.set(job.jobId, job);
  }

  return [...byId.values()];
}

function buildHandlerJobId(eventId: string, handlerAction: string): string {
  return createHash("sha256")
    .update(`${eventId}\0${handlerAction}`)
    .digest("hex");
}

function toDelivery(job: EventHandlerJobRecord): EventHandlerDelivery {
  return {
    jobId: job.jobId,
    attempt: job.attempts,
    maxAttempts: job.maxAttempts,
    idempotencyKey: `${job.eventId}:${job.handlerAction}`,
  };
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
      organizationId: record.organizationId,
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

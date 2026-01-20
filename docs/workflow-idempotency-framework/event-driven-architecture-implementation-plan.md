# Event-Driven Architecture — Implementation Plan

**Created**: 2026-01-20
**Based on**: event-driven-architecture-standalone.md
**Status**: Planning

---

## Implementation Tracker

### Phase 1: Types & Utilities (`@shopana/events` package)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | Create `packages/events/` package structure | ⬜ Pending | package.json, tsconfig, exports |
| 1.2 | Implement `types.ts` — DomainEvent, EventContext, EventHandlerResponse | ⬜ Pending | Core type definitions |
| 1.3 | Implement `idempotency.ts` — makeDispatchWorkflowId, makeEventId, etc. | ⬜ Pending | Add `canonicalize` dependency |
| 1.4 | Add concrete event types (ProductCreated, OrderCreated, etc.) | ⬜ Pending | Type-safe event definitions |
| 1.5 | Export all from package index | ⬜ Pending | Clean public API |

> **Note**: This package contains ONLY types and utility functions. No runtime dependencies on Kernel, DBOS, or ServiceBroker.

### Phase 2: Shared Kernel Updates
| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Add `ActionMetadata` interface to ActionRegistry | ⬜ Pending | retryPolicy support |
| 2.2 | Update `ActionRegistry.register()` with metadata parameter | ⬜ Pending | Store metadata alongside handler |
| 2.3 | Add `ActionRegistry.getMetadata()` method | ⬜ Pending | For EventDispatchWorkflow |
| 2.4 | Update `ServiceBroker.register()` with metadata | ⬜ Pending | Pass through to registry |
| 2.5 | Add `ServiceBroker.getActionMetadata()` method | ⬜ Pending | Expose metadata lookup |
| 2.6 | Add `ServiceBroker.hasAction()` method | ⬜ Pending | Check if action exists |
| 2.7 | Create `@EventHandler` decorator | ⬜ Pending | `decorators/EventHandler.ts` |
| 2.8 | Create `EventHandlers` base class | ⬜ Pending | Auto-registration on module init |
| 2.9 | Export new APIs from shared-kernel | ⬜ Pending | Update index.ts |

### Phase 3: Events Service (New)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | Create `services/events/` directory structure | ⬜ Pending | package.json, drizzle.config |
| 3.2 | Implement `kernel/Kernel.ts` — Events service Kernel singleton | ⬜ Pending | Like project/iam Kernel pattern |
| 3.3 | Implement Drizzle schema: `domain_events` table | ⬜ Pending | With UI/timeline fields |
| 3.4 | Implement Drizzle schema: `dead_letter_queue` table | ⬜ Pending | Reference-only, no payload |
| 3.5 | Generate initial SQL migration | ⬜ Pending | `pnpm db:generate` |
| 3.6 | Implement `EventsBrokerActions` — persistence actions | ⬜ Pending | persistEvent, updateEventStatus |
| 3.7 | Implement `EventsBrokerActions` — emit action | ⬜ Pending | `events.emit` broker action |
| 3.8 | Implement `EventsBrokerActions` — emitAndWait action | ⬜ Pending | `events.emitAndWait` broker action |
| 3.9 | Implement DLQ actions in EventsBrokerActions | ⬜ Pending | addToDLQ, getDLQEntries, cleanupDLQ |
| 3.10 | Implement retention actions | ⬜ Pending | cleanupDomainEvents |
| 3.11 | Implement `EventDispatchWorkflow` | ⬜ Pending | DBOS workflow for dispatch |
| 3.12 | Implement `CleanupScheduler` | ⬜ Pending | Daily cron jobs |
| 3.13 | Create `EventsNestService` | ⬜ Pending | Register workflow, init Kernel |
| 3.14 | Create `EventsModule` | ⬜ Pending | Wire up all providers |
| 3.15 | Add events service to bootstrap | ⬜ Pending | Update bootstrap.module.ts |

> **Note**: EventEmitter is now a broker action (`events.emit`), not a static class. Other services call via `broker.call("events.emit", {...})`.

### Phase 4: Service Integration — Inventory (Example)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | Create `InventoryEventHandlers` class | ⬜ Pending | Extends EventHandlers |
| 4.2 | Implement `@EventHandler("productCreated")` | ⬜ Pending | Initialize inventory record |
| 4.3 | Implement `@EventHandler("productDeleted")` | ⬜ Pending | Remove inventory record |
| 4.4 | Implement `@EventHandler("productUpdated")` | ⬜ Pending | Sync metadata |
| 4.5 | Add helper functions (isDuplicateKeyError, isTransientError) | ⬜ Pending | Error classification |
| 4.6 | Register InventoryEventHandlers in module | ⬜ Pending | Update inventory.module.ts |

### Phase 5: Event Emission Integration
| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | Update ProductCreateWorkflow to emit productCreated | ⬜ Pending | listing service |
| 5.2 | Update ProductDeleteWorkflow to emit productDeleted | ⬜ Pending | listing service |
| 5.3 | Update ProductUpdateWorkflow to emit productUpdated | ⬜ Pending | listing service |
| 5.4 | Add event emission to order workflows | ⬜ Pending | orders service |
| 5.5 | Add event emission to store/project workflows | ⬜ Pending | project service |

### Phase 6: Testing & Validation
| # | Task | Status | Notes |
|---|------|--------|-------|
| 6.1 | Unit tests for idempotency utilities | ⬜ Pending | Deterministic IDs |
| 6.2 | Unit tests for EventEmitter | ⬜ Pending | emit, emitAndWait |
| 6.3 | Integration test: event dispatch flow | ⬜ Pending | End-to-end |
| 6.4 | Test DLQ flow (retryable vs non-retryable) | ⬜ Pending | Error handling |
| 6.5 | Test idempotency (duplicate events) | ⬜ Pending | Same emitKey |

### Phase 7: Documentation & Observability
| # | Task | Status | Notes |
|---|------|--------|-------|
| 7.1 | Add logging to EventDispatchWorkflow | ⬜ Pending | Structured events |
| 7.2 | Document emitKey conventions | ⬜ Pending | Developer guide |
| 7.3 | Document handler implementation patterns | ⬜ Pending | Best practices |

---

## Detailed Implementation Steps

### Phase 1: Types & Utilities (`@shopana/events` package)

#### 1.1 Create Package Structure

**Path**: `packages/events/`

```
packages/events/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── types.ts
│   └── idempotency.ts
```

**package.json**:
```json
{
  "name": "@shopana/events",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "default": "./src/index.ts"
    }
  },
  "dependencies": {
    "canonicalize": "^2.0.0"
  },
  "devDependencies": {
    "@shopana/build-tools": "0.0.1",
    "@types/node": "^20.14.14",
    "typescript": "^5.5.4"
  }
}
```

**Key files to create**:
- `src/types.ts` — DomainEvent, EventContext, EventHandlerResponse interfaces
- `src/idempotency.ts` — ID generation functions with canonicalize

**Dependencies**:
- `canonicalize` — RFC 8785 JSON Canonicalization (only runtime dependency)

> **Important**: This package has NO dependencies on @dbos-inc/dbos-sdk, @shopana/shared-kernel, or any service code. It's a pure types/utilities package.

---

#### 1.2 Implement types.ts

**Key interfaces**:

```typescript
// DomainEvent — base interface with UI/timeline fields
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  eventId: string;
  eventType: TType;
  timestamp: string;  // Set in persistEvent step
  source: string;
  payload: TPayload;
  emitKey: string;  // REQUIRED for idempotency
  parentWorkflowId?: string;
  context: EventContext;

  // UI/Timeline fields (REQUIRED)
  subject: { type: string; id: string };
  related?: Array<{ type: string; id: string }>;
  actor?: { type: "user" | "service" | "system"; id?: string };
}

// EventContext — context passed with every event
export interface EventContext {
  /** Tenant/organization scope */
  tenantId: string;

  /** User who triggered the event (if applicable) */
  userId?: string;

  /** Correlation ID for distributed tracing */
  correlationId: string;

  /** Causation ID (parent event if this is a reaction) */
  causationId?: string;
}

// EventHandlerResponse — handler return type
export type EventHandlerResponse =
  | { ok: true }
  | { ok: false; error: { message: string; code?: string; retryable: boolean } };

// HandlerInfo — captured at checkpoint time for deterministic replay
interface HandlerInfo {
  serviceName: string;
  action: string;  // e.g., "inventory.productCreated"
  retryPolicy: {
    maxAttempts: number;
    intervalSeconds: number;
    backoffRate: number;
  };
}

// EventDispatchResult — workflow return type
export interface EventDispatchResult {
  eventId: string;
  eventType: string;
  status: "completed";
  servicesNotified: number;
  results: HandlerInvocationResult[];
}

export interface HandlerInvocationResult {
  service: string;
  status: "success" | "failed";
  error?: string;
  durationMs: number;
}
```

**Note on emitKey**:
- `emitKey` is stored in `DomainEvent` after construction
- But passed as **separate argument** to `EventEmitter.emit(input, emitKey)`
- This makes the API explicit: emitKey is REQUIRED and must be consciously provided

---

#### 1.3 Implement idempotency.ts

**Functions**:
- `canonicalJson(value)` — RFC 8785 JSON canonicalization
- `makeDispatchWorkflowId({ parentWorkflowId, eventType, emitKey })` — deterministic workflow ID
- `makeEventId({ tenantId, dispatchWorkflowId })` — deterministic event ID
- `makeDeterministicCorrelationId(parentWorkflowId)` — UUID-like correlation ID

**Key implementation notes**:
- Use `canonicalize` package (NOT JSON.stringify)
- Include version prefix (v1) in hash inputs
- Hash output: 32 chars (128 bits)

---

### Phase 2: Shared Kernel Updates

#### 2.1-2.6 ActionRegistry & ServiceBroker Updates

**Current ActionRegistry** (from `packages/shared-kernel/src/broker/ActionRegistry.ts`):
- Has `register(action, handler)`
- Has `resolve(action)`
- Has `list()`

**Required changes**:

```typescript
// Add ActionMetadata interface
export interface ActionMetadata {
  retryPolicy?: {
    maxAttempts: number;
    intervalSeconds: number;
    backoffRate: number;
  };
}

// Update register signature
register(action: string, handler: ActionHandler, metadata?: ActionMetadata): void

// Add getMetadata method
getMetadata(action: string): ActionMetadata | undefined

// Add has method
has(action: string): boolean
```

**ServiceBroker updates**:
- Pass metadata through to registry
- Add `getActionMetadata(action)` method
- Add `hasAction(action)` method

---

#### 2.7-2.8 @EventHandler Decorator and EventHandlers Base Class

**@EventHandler decorator** (`decorators/EventHandler.ts`):

```typescript
// packages/shared-kernel/src/decorators/EventHandler.ts

import "reflect-metadata";

export const EVENT_HANDLER_METADATA_KEY = Symbol("broker:eventHandler");

export interface EventHandlerMetadata {
  eventType: string;
  retryPolicy: {
    maxAttempts: number;
    intervalSeconds: number;
    backoffRate: number;
  };
}

export function EventHandler(
  eventType: string,
  options: { retry?: Partial<EventHandlerMetadata["retryPolicy"]> } = {}
): MethodDecorator {
  return function (target, propertyKey, descriptor) {
    const metadata: EventHandlerMetadata = {
      eventType,
      retryPolicy: {
        maxAttempts: options.retry?.maxAttempts ?? 3,
        intervalSeconds: options.retry?.intervalSeconds ?? 1,
        backoffRate: options.retry?.backoffRate ?? 2,
      },
    };

    Reflect.defineMetadata(EVENT_HANDLER_METADATA_KEY, metadata, target, propertyKey);
    return descriptor;
  };
}
```

**EventHandlers base class** (`broker/EventHandlers.ts`):

```typescript
// packages/shared-kernel/src/broker/EventHandlers.ts

import { Logger, OnModuleInit } from "@nestjs/common";
import { ServiceBroker } from "./ServiceBroker.js";
import { EVENT_HANDLER_METADATA_KEY, EventHandlerMetadata } from "../decorators/EventHandler.js";

export abstract class EventHandlers implements OnModuleInit {
  protected readonly logger: Logger;

  constructor(protected readonly broker: ServiceBroker) {
    this.logger = new Logger(this.constructor.name);
  }

  onModuleInit(): void {
    const prototype = Object.getPrototypeOf(this);
    const methodNames = Object.getOwnPropertyNames(prototype)
      .filter(name => name !== "constructor" && typeof prototype[name] === "function");

    for (const methodName of methodNames) {
      const metadata = Reflect.getMetadata(
        EVENT_HANDLER_METADATA_KEY,
        prototype,
        methodName
      ) as EventHandlerMetadata | undefined;

      if (metadata) {
        const boundMethod = (this as any)[methodName].bind(this);

        // Register with eventType as action name + retry metadata
        this.broker.register(metadata.eventType, boundMethod, {
          retryPolicy: metadata.retryPolicy,
        });

        this.logger.debug(`Registered handler: ${metadata.eventType}`);
      }
    }
  }
}
```

**Action naming convention**:
- Handler decorated with `@EventHandler("productCreated")` in `InventoryEventHandlers`
- Broker service name: `inventory`
- Registered action: `inventory.productCreated`
- Dispatch workflow calls: `broker.call("inventory.productCreated", { event })`

---

### Phase 3: Events Service

#### 3.1 Directory Structure

```
services/events/
├── package.json
├── drizzle.config.ts
├── migrations/
│   └── 0000_initial.sql
├── src/
│   ├── main.ts
│   ├── events.module.ts
│   ├── events.nest-service.ts
│   ├── EventsBrokerActions.ts
│   ├── CleanupScheduler.ts
│   ├── kernel/
│   │   ├── Kernel.ts
│   │   ├── types.ts
│   │   └── BaseWorkflow.ts
│   ├── workflows/
│   │   └── EventDispatchWorkflow.ts
│   └── repositories/
│       └── models/
│           ├── index.ts
│           ├── domainEvents.ts
│           └── deadLetterQueue.ts
```

---

#### 3.2 Events Kernel (Singleton Pattern)

**File**: `services/events/src/kernel/Kernel.ts`

Following the same pattern as project/iam services:

```typescript
import { Kernel as BaseKernel, consoleLogger } from "@shopana/shared-kernel";
import type { ServiceBroker, Logger, DatabaseClient } from "@shopana/shared-kernel";
import type { WorkflowRegistry } from "@shopana/workflows";
import type { EventsKernelServices } from "./types.js";
import { Repository } from "../repositories/Repository.js";
import { createDatabase, type Database } from "../infrastructure/db/database.js";

export class Kernel extends BaseKernel<EventsKernelServices> {
  private static instance: Kernel | null = null;

  public repository!: Repository;
  public workflow!: WorkflowRegistry;
  public db!: Database;

  private constructor(
    broker: ServiceBroker,
    logger: Logger,
    repository: Repository,
    workflow: WorkflowRegistry,
    db: Database
  ) {
    super(broker, logger, { repository, workflow });
    this.repository = repository;
    this.workflow = workflow;
    this.db = db;
  }

  static async create(
    broker: ServiceBroker,
    workflow: WorkflowRegistry,
    dbClient: DatabaseClient
  ): Promise<Kernel> {
    if (this.instance) {
      return this.instance;
    }

    console.log("[Events] Using shared database pool...");
    const db = createDatabase(dbClient);
    const repository = await Repository.create({ db });

    this.instance = new Kernel(broker, consoleLogger, repository, workflow, db);
    console.log("[Events] Kernel initialized");
    return this.instance;
  }

  static getInstance(): Kernel {
    if (!this.instance) {
      throw new Error("Kernel not initialized. Call Kernel.create() first.");
    }
    return this.instance;
  }

  static isInitialized(): boolean {
    return this.instance !== null;
  }

  async close(): Promise<void> {
    Kernel.instance = null;
  }
}
```

---

#### 3.3-3.4 Drizzle Schemas

**domain_events table** — Key fields:
- `event_id` (PK)
- `event_type`, `source`, `timestamp`
- `tenant_id`, `user_id`, `correlation_id`, `causation_id`
- `emit_key`, `parent_workflow_id`
- `status` (dispatching → completed)
- `subject_type`, `subject_id`, `related`, `actor_type`, `actor_id`
- `payload_hash`

**Indexes**:
- `idx_events_tenant_timestamp` — for timeline queries
- `idx_events_subject_timeline` — for entity timelines
- `idx_events_related` (GIN) — for related entity queries

**dead_letter_queue table** — Reference only:
- `event_id` (reference, NOT FK)
- `handler_service`, `handler_action`
- `error`, `error_code`, `attempts`
- `status` (failed → retried → resolved)
- `expires_at` — for cleanup

---

#### 3.6-3.10 EventsBrokerActions

**File**: `services/events/src/EventsBrokerActions.ts`

```typescript
import { Injectable } from "@nestjs/common";
import { DBOS } from "@dbos-inc/dbos-sdk";
import {
  BrokerActions,
  Action,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type {
  DomainEvent,
  EventContext,
  EventDispatchResult,
} from "@shopana/events";
import {
  makeDispatchWorkflowId,
  makeEventId,
  makeDeterministicCorrelationId,
} from "@shopana/events";
import { Kernel } from "./kernel/Kernel.js";
import { EventDispatchWorkflow } from "./workflows/EventDispatchWorkflow.js";

export interface EmitParams {
  eventType: string;
  payload: unknown;
  source: string;
  context: Omit<EventContext, "correlationId"> & { correlationId?: string };
  subject: { type: string; id: string };
  related?: Array<{ type: string; id: string }>;
  actor?: { type: "user" | "service" | "system"; id?: string };
  emitKey: string;
}

@Injectable()
export class EventsBrokerActions extends BrokerActions {
  constructor(@InjectBroker("events") broker: ServiceBroker) {
    super(broker);
  }

  /**
   * Emit event (fire and forget).
   * Called from other services via: broker.call("events.emit", {...})
   */
  @Action("emit")
  async emit(params: EmitParams): Promise<{ workflowId: string; eventId: string }> {
    const { emitKey, ...input } = params;

    // Validate emitKey
    if (!emitKey || emitKey.trim().length === 0) {
      throw new Error("emitKey is required and must be non-empty");
    }

    const parentWorkflowId = DBOS.workflowID;
    if (!parentWorkflowId) {
      throw new Error("events.emit must be called from workflow code");
    }

    // Build deterministic IDs
    const workflowId = makeDispatchWorkflowId({
      parentWorkflowId,
      eventType: input.eventType,
      emitKey,
    });

    const eventId = makeEventId({
      tenantId: input.context.tenantId,
      dispatchWorkflowId: workflowId,
    });

    const correlationId = input.context.correlationId
      ?? makeDeterministicCorrelationId(parentWorkflowId);

    // Build event
    const event: DomainEvent = {
      eventId,
      eventType: input.eventType,
      timestamp: "",  // Set in persistEventStep
      source: input.source,
      payload: input.payload,
      emitKey,
      parentWorkflowId,
      context: { ...input.context, correlationId },
      subject: input.subject,
      related: input.related ?? [],
      actor: input.actor ?? { type: "service", id: input.source },
    };

    // Get workflow from Kernel singleton
    const workflow = Kernel.getInstance().workflow;
    const dispatchWorkflow = workflow.get<EventDispatchWorkflow>("eventDispatch");

    // Start dispatch workflow (fire and forget)
    await DBOS
      .startWorkflow(dispatchWorkflow, { workflowID: workflowId })
      .dispatch(event);

    return { workflowId, eventId };
  }

  /**
   * Emit event and wait for completion.
   * Called via: broker.call("events.emitAndWait", {...})
   */
  @Action("emitAndWait")
  async emitAndWait(params: EmitParams): Promise<EventDispatchResult> {
    // Same setup as emit()...
    // But wait for result:
    // const handle = await DBOS.startWorkflow(...).dispatch(event);
    // return handle.getResult();
  }

  /**
   * Persist event to database.
   * Called internally by EventDispatchWorkflow.
   */
  @Action("persistEvent")
  async persistEvent(params: { event: DomainEvent }): Promise<{ eventId: string; timestamp: string }> {
    // INSERT with ON CONFLICT DO NOTHING
    // Returns actual timestamp
  }

  /**
   * Update event status after dispatch completes.
   */
  @Action("updateEventStatus")
  async updateEventStatus(params: {
    eventId: string;
    status: "completed";
    handlerResults: unknown[];
  }): Promise<void> {
    // UPDATE domain_events SET status = 'completed'
  }

  /**
   * Add failed handler to DLQ.
   */
  @Action("addToDLQ")
  async addToDLQ(params: {
    eventId: string;
    eventType: string;
    handlerService: string;
    handlerAction: string;
    error: string;
    errorCode?: string;
    attempts: number;
  }): Promise<void> {
    // INSERT to dead_letter_queue
  }

  /**
   * Get DLQ entries for retry or inspection.
   */
  @Action("getDLQEntries")
  async getDLQEntries(params: { limit?: number; eventType?: string }): Promise<unknown[]> {
    // SELECT from dead_letter_queue
  }

  /**
   * Cleanup expired DLQ entries.
   */
  @Action("cleanupDLQ")
  async cleanupDLQ(params: { batchSize?: number }): Promise<{ deleted: number }> {
    // DELETE WHERE expires_at < NOW()
  }

  /**
   * Cleanup old domain events.
   */
  @Action("cleanupDomainEvents")
  async cleanupDomainEvents(params: {
    retentionDays?: number;
    batchSize?: number;
  }): Promise<{ deleted: number }> {
    // DELETE WHERE timestamp < NOW() - retention
  }
}
```

---

#### 3.11 EventDispatchWorkflow

**File**: `services/events/src/workflows/EventDispatchWorkflow.ts`

```typescript
import { ConfiguredInstance, DBOS } from "@dbos-inc/dbos-sdk";
import type { DomainEvent, EventDispatchResult, HandlerInfo, EventHandlerResponse } from "@shopana/events";
import { getConfig } from "@shopana/shared-service-config";
import type { Kernel } from "../kernel/Kernel.js";

interface WorkflowServices {
  kernel: Kernel;
}

export class EventDispatchWorkflow extends ConfiguredInstance {
  private readonly kernel: Kernel;

  constructor(name: string, services: WorkflowServices) {
    super(name);
    this.kernel = services.kernel;
  }

  private get broker() {
    return this.kernel.getServices().broker;
  }

  @DBOS.workflow()
  async dispatch(event: DomainEvent): Promise<EventDispatchResult> {
    // Step 1: Persist event
    const { timestamp } = await this.persistEvent(event);
    event.timestamp = timestamp;

    // Step 2: Get available handlers (checkpointed)
    const handlers = await this.getAvailableHandlers(event.eventType);

    // Step 3: Invoke handlers in parallel
    const results = await Promise.all(
      handlers.map(handler => this.tryInvokeHandler(event, handler))
    );

    // Step 4: Update event status
    await this.updateEventStatus(event.eventId, results);

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      status: "completed",
      servicesNotified: handlers.length,
      results,
    };
  }

  @DBOS.step()
  private async persistEvent(event: DomainEvent): Promise<{ timestamp: string }> {
    return this.broker.call("events.persistEvent", { event });
  }

  /**
   * DETERMINISM: Result is checkpointed.
   * On replay, same handler list returned even if registrations changed.
   */
  @DBOS.step()
  private async getAvailableHandlers(eventType: string): Promise<HandlerInfo[]> {
    const config = getConfig();
    const serviceNames = Object.keys(config.services);
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

  private async tryInvokeHandler(
    event: DomainEvent,
    handler: HandlerInfo
  ): Promise<{ service: string; status: "success" | "failed"; error?: string; durationMs: number }> {
    const { serviceName, action, retryPolicy } = handler;

    type StepResult =
      | { kind: "ok"; durationMs: number }
      | { kind: "nonRetryableFailure"; error: { message: string; code?: string }; durationMs: number };

    let stepResult: StepResult;

    try {
      stepResult = await DBOS.runStep<StepResult>(
        async () => {
          const startTime = Date.now();
          const resp: EventHandlerResponse = await this.broker.call(action, { event });
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
        },
        {
          name: `handler:${action}:${event.eventId}`,
          retriesAllowed: true,
          maxAttempts: retryPolicy.maxAttempts,
          intervalSeconds: retryPolicy.intervalSeconds,
          backoffRate: retryPolicy.backoffRate,
        }
      );
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      await this.sendToDLQ(event, handler, errorMsg, undefined, retryPolicy.maxAttempts);
      return { service: serviceName, status: "failed", error: errorMsg, durationMs: 0 };
    }

    if (stepResult.kind === "nonRetryableFailure") {
      await this.sendToDLQ(event, handler, stepResult.error.message, stepResult.error.code, 1);
      return {
        service: serviceName,
        status: "failed",
        error: stepResult.error.message,
        durationMs: stepResult.durationMs,
      };
    }

    return { service: serviceName, status: "success", durationMs: stepResult.durationMs };
  }

  @DBOS.step()
  private async sendToDLQ(
    event: DomainEvent,
    handler: HandlerInfo,
    error: string,
    errorCode: string | undefined,
    attempts: number
  ): Promise<void> {
    await this.broker.call("events.addToDLQ", {
      eventId: event.eventId,
      eventType: event.eventType,
      handlerService: handler.serviceName,
      handlerAction: handler.action,
      error,
      errorCode,
      attempts,
    });
  }

  @DBOS.step()
  private async updateEventStatus(eventId: string, results: unknown[]): Promise<void> {
    await this.broker.call("events.updateEventStatus", {
      eventId,
      status: "completed",
      handlerResults: results,
    });
  }
}
```

---

#### 3.12 CleanupScheduler

**Cron jobs**:
- `@Cron(EVERY_DAY_AT_3AM)` — cleanupExpiredDLQEntries
- `@Cron(EVERY_DAY_AT_4AM)` — cleanupOldDomainEvents (90 days retention)

**Uses batch deletion** to avoid long transactions.

---

#### 3.13-3.15 EventsNestService, EventsModule & Bootstrap Integration

**File**: `services/events/src/events.nest-service.ts`

```typescript
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  DATABASE_CLIENT,
  InjectBroker,
  ServiceBroker,
  type DatabaseClient,
} from "@shopana/shared-kernel";
import { WORKFLOW_REGISTRY, WorkflowRegistry } from "@shopana/workflows";
import { Kernel } from "./kernel/Kernel.js";
import { EventDispatchWorkflow } from "./workflows/EventDispatchWorkflow.js";

@Injectable()
export class EventsNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsNestService.name);
  private kernel!: Kernel;

  constructor(
    @InjectBroker("events") private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry,
    @Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient
  ) {}

  async onModuleInit() {
    // Initialize Kernel singleton
    this.kernel = await Kernel.create(this.broker, this.workflow, this.dbClient);

    // Register EventDispatchWorkflow
    const dispatchWorkflow = new EventDispatchWorkflow("eventDispatch", {
      kernel: this.kernel,
    });
    this.workflow.register("eventDispatch", dispatchWorkflow);
    this.logger.debug("Registered workflow: eventDispatch");

    this.logger.log("Events service started");
  }

  async onModuleDestroy() {
    if (this.workflow) {
      this.workflow.deregister("eventDispatch");
    }

    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log("Events service stopped");
  }
}
```

**Update bootstrap.module.ts**:
```typescript
import { EventsModule } from "@shopana/events-service";

@Module({
  imports: [
    EventsModule,  // Add this
    // ... existing modules
  ],
})
export class BootstrapModule {}
```

**Update bootstrap/package.json**:
```json
{
  "dependencies": {
    "@shopana/events-service": "0.0.1"
  }
}
```

---

### Phase 4: Service Integration (Inventory Example)

#### 4.1-4.4 InventoryEventHandlers

**File**: `services/inventory/src/InventoryEventHandlers.ts`

```typescript
@Injectable()
export class InventoryEventHandlers extends EventHandlers {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  @EventHandler("productCreated")
  async handleProductCreated(params: { event: ProductCreatedEvent }): Promise<EventHandlerResponse> {
    // INSERT ON CONFLICT DO NOTHING
    // Duplicate key → return { ok: true }
    // Transient error → return { ok: false, retryable: true }
    // Business error → return { ok: false, retryable: false }
  }

  @EventHandler("productDeleted")
  async handleProductDeleted(params: { event: ProductDeletedEvent }): Promise<EventHandlerResponse> {
    // DELETE is naturally idempotent
  }

  @EventHandler("productUpdated", { retry: { maxAttempts: 5 } })
  async handleProductUpdated(params: { event: ProductUpdatedEvent }): Promise<EventHandlerResponse> {
    // Sync metadata
  }
}
```

**Module registration**:
```typescript
@Module({
  providers: [
    InventoryBrokerActions,
    InventoryEventHandlers,  // Add this
  ],
})
export class InventoryModule {}
```

---

### Phase 5: Event Emission Integration

#### Context Pattern

**Context передаётся как часть input** (аналогично StoreCreateWorkflow):

```typescript
// Resolver передаёт context из $ctx:
await DBOS.startWorkflow(workflow).run({
  title: input.title,
  handle: input.handle,
  // ... business fields ...
  organizationId: this.$ctx.organizationId,  // ← из resolver $ctx
  userId: this.$ctx.userId,
});
```

#### Example: ProductCreateWorkflow

**Location**: `services/inventory/src/workflows/ProductCreateWorkflow.ts`

**Input type update**:
```typescript
export interface ProductCreateParams {
  readonly title: string;
  readonly handle: string;
  // ... existing fields ...

  // Context for event emission (passed from resolver)
  readonly organizationId: string;
  readonly userId?: string;
  readonly storeId: string;
}
```

**Workflow with event emission**:
```typescript
@DBOS.workflow()
async run(input: ProductCreateParams): Promise<ProductCreateResult> {
  // Step 1: Save product
  const result = await this.createProduct(input);

  if (result.userErrors.length > 0 || !result.product) {
    return result;
  }

  // Step 2: Emit event via broker.call (fire and forget)
  await this.emitProductCreated(result.product, input);

  // Step 3: Sync back-refs (existing logic)
  if (result.variantMediaMap?.length) {
    await this.syncVariantBackRefs(result.variantMediaMap);
  }

  return result;
}

@DBOS.step()
async emitProductCreated(product: Product, input: ProductCreateParams): Promise<void> {
  await this.broker.call("events.emit", {
    eventType: "productCreated",
    payload: {
      productId: product.id,
      storeId: input.storeId,
      name: input.title,
    },
    context: {
      tenantId: input.organizationId,
      userId: input.userId,
    },
    source: "inventory",
    subject: { type: "product", id: product.id },
    related: [{ type: "store", id: input.storeId }],
    actor: input.userId
      ? { type: "user", id: input.userId }
      : { type: "service", id: "inventory" },
    emitKey: `product:${product.id}`,  // ← deterministic!
  });
}
```

> **Note**: Event emission is done via `broker.call("events.emit", {...})`, NOT via static EventEmitter class. This keeps the events service as the single source of truth for event dispatch.

---

## Implementation Order (Recommended)

1. **Phase 1** (Core) — Create @shopana/events package first
2. **Phase 2** (Kernel) — Update shared-kernel with metadata support
3. **Phase 3.1-3.4** (Events Service DB) — Create schema and migrations
4. **Phase 3.5-3.11** (Events Service Logic) — Implement actions and scheduler
5. **Phase 3.12** (Bootstrap) — Integrate events service
6. **Phase 4** (Inventory) — First service integration as example
7. **Phase 5** (Emission) — Add event emission to workflows
8. **Phase 6-7** (Testing/Docs) — Validate and document

---

## Files to Create (Summary)

### New Package: `@shopana/events` (Types & Utilities Only)
- `packages/events/package.json`
- `packages/events/tsconfig.json`
- `packages/events/src/index.ts`
- `packages/events/src/types.ts`
- `packages/events/src/idempotency.ts`

### New Service: `services/events`
- `services/events/package.json`
- `services/events/drizzle.config.ts`
- `services/events/src/main.ts`
- `services/events/src/events.module.ts`
- `services/events/src/events.nest-service.ts`
- `services/events/src/EventsBrokerActions.ts`
- `services/events/src/CleanupScheduler.ts`
- `services/events/src/kernel/Kernel.ts`
- `services/events/src/kernel/types.ts`
- `services/events/src/kernel/BaseWorkflow.ts`
- `services/events/src/workflows/EventDispatchWorkflow.ts`
- `services/events/src/repositories/Repository.ts`
- `services/events/src/repositories/models/index.ts`
- `services/events/src/repositories/models/domainEvents.ts`
- `services/events/src/repositories/models/deadLetterQueue.ts`
- `services/events/src/infrastructure/db/database.ts`

### Modified Files
- `packages/shared-kernel/src/broker/ActionRegistry.ts` — add `has()`, `getMetadata()`, metadata storage
- `packages/shared-kernel/src/broker/ServiceBroker.ts` — add `hasAction()`, `getActionMetadata()`
- `packages/shared-kernel/src/broker/EventHandlers.ts` (new) — base class for event handlers
- `packages/shared-kernel/src/decorators/EventHandler.ts` (new) — decorator for event handlers
- `packages/shared-kernel/src/index.ts` — export new APIs
- `services/bootstrap/package.json` — add events service dependency
- `services/bootstrap/src/bootstrap.module.ts` — import EventsModule
- `services/inventory/src/InventoryEventHandlers.ts` (new) — event handlers
- `services/inventory/src/inventory.module.ts` — register handlers

---

## Critical Implementation Notes

### emitKey Rules (MUST follow)
- **Never random** — No `randomUUID()`, no `Date.now()`
- **Business-derived** — From productId, orderId, etc.
- **Unique within workflow** — Different emits = different emitKeys

### Handler Response Contract
| Situation | Return |
|-----------|--------|
| Success | `{ ok: true }` |
| Already done (duplicate key) | `{ ok: true }` |
| Transient error | `{ ok: false, retryable: true }` |
| Business/validation error | `{ ok: false, retryable: false }` |

---

## Dependencies to Add

```bash
# In packages/events (types & utilities only)
pnpm add canonicalize

# In services/events (full runtime)
pnpm add @nestjs/schedule @shopana/events
```

### Package Dependencies

**packages/events/package.json** (minimal — types & utilities only):
```json
{
  "dependencies": {
    "canonicalize": "^2.0.0"
  }
}
```

**services/events/package.json** (full runtime):
```json
{
  "dependencies": {
    "@dbos-inc/dbos-sdk": "^2.0.0",
    "@shopana/events": "*",
    "@shopana/shared-kernel": "*",
    "@shopana/shared-service-config": "*",
    "@shopana/workflows": "*",
    "@nestjs/schedule": "^4.0.0",
    "drizzle-orm": "^0.45.1"
  }
}
```

**`@shopana/shared-service-config`** — предоставляет:
- `getConfig()` — returns service configuration with all registered services
- Used in `getAvailableHandlers()` to iterate over `config.services`

```typescript
// Usage in EventDispatchWorkflow (services/events)
import { getConfig } from "@shopana/shared-service-config";

const config = getConfig();
const serviceNames = Object.keys(config.services);
// → ["inventory", "listing", "orders", "payments", ...]
```

---

## Migration Checklist

- [ ] Run `pnpm install` after creating new packages
- [ ] Run `pnpm db:generate` in events service after schema creation
- [ ] Run migrations before testing
- [ ] Verify DBOS schema exists (for workflow state)
- [ ] Test with single handler before enabling all handlers

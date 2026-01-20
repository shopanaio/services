# Event-Driven Architecture — Implementation Plan

**Created**: 2026-01-20
**Based on**: event-driven-architecture-standalone.md
**Status**: Planning

---

## Implementation Tracker

### Phase 1: Core Infrastructure (`@shopana/events` package)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | Create `packages/events/` package structure | ⬜ Pending | package.json, tsconfig, exports |
| 1.2 | Implement `types.ts` — DomainEvent, EventContext, EventHandlerResponse | ⬜ Pending | Core type definitions |
| 1.3 | Implement `idempotency.ts` — makeDispatchWorkflowId, makeEventId, etc. | ⬜ Pending | Add `canonicalize` dependency |
| 1.4 | Implement `EventEmitter` class | ⬜ Pending | emit(), emitAndWait() |
| 1.5 | Implement `EventDispatchWorkflow` | ⬜ Pending | DBOS workflow for dispatch |
| 1.6 | Add concrete event types (ProductCreated, OrderCreated, etc.) | ⬜ Pending | Type-safe event definitions |
| 1.7 | Export all from package index | ⬜ Pending | Clean public API |

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
| 3.2 | Implement Drizzle schema: `domain_events` table | ⬜ Pending | With UI/timeline fields |
| 3.3 | Implement Drizzle schema: `dead_letter_queue` table | ⬜ Pending | Reference-only, no payload |
| 3.4 | Generate initial SQL migration | ⬜ Pending | `pnpm db:generate` |
| 3.5 | Implement `EventsBrokerActions` — persistence actions | ⬜ Pending | persistEvent, updateEventStatus |
| 3.6 | Implement DLQ actions in EventsBrokerActions | ⬜ Pending | addToDLQ, getDLQEntries, cleanupDLQ |
| 3.7 | Implement retention actions | ⬜ Pending | cleanupDomainEvents |
| 3.8 | Implement `CleanupScheduler` | ⬜ Pending | Daily cron jobs |
| 3.9 | Create `EventsNestService` | ⬜ Pending | Register EventDispatchWorkflow |
| 3.10 | Create `EventsModule` | ⬜ Pending | Wire up all providers |
| 3.11 | Add events service to bootstrap | ⬜ Pending | Update bootstrap.module.ts |

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

### Phase 1: Core Infrastructure (`@shopana/events` package)

#### 1.1 Create Package Structure

**Path**: `packages/events/`

```
packages/events/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── idempotency.ts
│   ├── emitter.ts
│   └── workflows/
│       └── EventDispatchWorkflow.ts
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
    "@dbos-inc/dbos-sdk": "^2.0.0",
    "@shopana/shared-kernel": "*",
    "@shopana/shared-service-config": "*",
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
- `src/emitter.ts` — EventEmitter class with emit() and emitAndWait()
- `src/workflows/EventDispatchWorkflow.ts` — DBOS workflow for dispatch

**Dependencies to check**:
- `canonicalize` — RFC 8785 JSON Canonicalization (add to package.json)
- `@dbos-inc/dbos-sdk` — Already used in project
- `@shopana/shared-kernel` — ServiceBroker dependency

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

#### 1.4-1.5 Implement EventEmitter and EventDispatchWorkflow

**EventEmitter**:

```typescript
// packages/events/src/emitter.ts

import { DBOS } from "@dbos-inc/dbos-sdk";
import { Kernel } from "@shopana/shared-kernel";  // For workflow registry access
import type { DomainEvent, EventContext } from "./types.js";
import {
  makeDispatchWorkflowId,
  makeEventId,
  makeDeterministicCorrelationId,
} from "./idempotency.js";
import { EventDispatchWorkflow } from "./workflows/EventDispatchWorkflow.js";

export class EventEmitter {
  /**
   * Emit an event (fire and forget).
   * MUST be called from workflow code (not from a step!).
   *
   * @param input - Event data (all fields except eventId, timestamp, emitKey)
   * @param emitKey - REQUIRED: Deterministic key derived from business context
   */
  static async emit<TType extends string, TPayload>(
    input: {
      eventType: TType;
      payload: TPayload;
      source: string;
      context: Omit<EventContext, "correlationId"> & { correlationId?: string };
      subject: { type: string; id: string };
      related?: Array<{ type: string; id: string }>;
      actor?: { type: "user" | "service" | "system"; id?: string };
    },
    emitKey: string  // Separate argument — explicit and required!
  ): Promise<{ workflowId: string; eventId: string }> {
    // Validate emitKey
    if (!emitKey || emitKey.trim().length === 0) {
      throw new Error("emitKey is required and must be non-empty");
    }

    const parentWorkflowId = DBOS.workflowID;
    if (!parentWorkflowId) {
      throw new Error("EventEmitter.emit() must be called from workflow code");
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

    // Build event (timestamp will be set in persistEventStep)
    const event: DomainEvent<TType, TPayload> = {
      eventId,
      eventType: input.eventType,
      timestamp: "",  // Set in persistEventStep with real time
      source: input.source,
      payload: input.payload,
      emitKey,
      parentWorkflowId,
      context: { ...input.context, correlationId },
      subject: input.subject,
      related: input.related ?? [],
      actor: input.actor ?? { type: "service", id: input.source },
    };

    // Get registered workflow instance from Kernel
    const workflowRegistry = Kernel.getInstance().workflow;
    const dispatchWorkflow = workflowRegistry.get<EventDispatchWorkflow>("eventDispatch");

    // Start dispatch workflow (fire and forget)
    await DBOS
      .startWorkflow(dispatchWorkflow, { workflowID: workflowId })
      .dispatch(event);

    return { workflowId, eventId };
  }

  /**
   * Emit event and wait for all handlers to complete.
   * Same signature as emit(), returns EventDispatchResult.
   */
  static async emitAndWait<TType extends string, TPayload>(
    input: { /* same as emit */ },
    emitKey: string
  ): Promise<EventDispatchResult> {
    // Same as emit() but:
    // const handle = await DBOS.startWorkflow(dispatchWorkflow, { workflowID }).dispatch(event);
    // return handle.getResult();
  }
}
```

**EventDispatchWorkflow**:
- `dispatch(event)` workflow method
- Step 1: `persistEventStep()` — calls events.persistEvent
- Step 2: `getAvailableHandlers()` — checkpointed handler list with retry policies
- Step 3: `tryInvokeHandler()` — parallel invocation with retry/DLQ logic
- Step 4: `updateEventStatus()` — mark completed

**ServiceBroker injection** (через существующий Kernel паттерн):

Workflows в проекте используют `ConfiguredInstance` + `Kernel` singleton:

```typescript
// packages/events/src/workflows/EventDispatchWorkflow.ts

import { ConfiguredInstance, DBOS } from "@dbos-inc/dbos-sdk";
import type { DomainEvent } from "../types.js";
import type { ServiceBroker } from "@shopana/shared-kernel";
import { getConfig } from "@shopana/shared-service-config";

interface EventDispatchWorkflowServices {
  broker: ServiceBroker;
}

export class EventDispatchWorkflow extends ConfiguredInstance {
  private readonly broker: ServiceBroker;

  constructor(name: string, services: EventDispatchWorkflowServices) {
    super(name);
    this.broker = services.broker;
  }

  @DBOS.workflow()
  async dispatch(event: DomainEvent): Promise<EventDispatchResult> {
    // this.broker доступен через constructor injection
  }
}
```

**Регистрация в events service**:

```typescript
// services/events/src/events.nest-service.ts

@Injectable()
export class EventsNestService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @InjectBroker("events") private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry,
  ) {}

  async onModuleInit() {
    // Регистрируем workflow с broker dependency
    const dispatchWorkflow = new EventDispatchWorkflow("eventDispatch", {
      broker: this.broker,
    });
    this.workflow.register("eventDispatch", dispatchWorkflow);
  }

  async onModuleDestroy() {
    this.workflow.deregister("eventDispatch");
  }
}
```

**Запуск из EventEmitter**:

```typescript
// EventEmitter.emit() получает workflow из registry
const registry = Kernel.getInstance().workflow;
const workflow = registry.get<EventDispatchWorkflow>("eventDispatch");

await DBOS.startWorkflow(workflow, { workflowID }).dispatch(event);
```

**getAvailableHandlers() — handler discovery**:

```typescript
/**
 * DETERMINISM: This is a @DBOS.step(), result is checkpointed.
 * On replay, same handler list returned even if registrations changed.
 */
@DBOS.step()
private async getAvailableHandlers(eventType: string): Promise<HandlerInfo[]> {
  const config = getConfig();  // From @shopana/shared-service-config
  const serviceNames = Object.keys(config.services);
  const handlers: HandlerInfo[] = [];

  for (const serviceName of serviceNames) {
    const action = `${serviceName}.${eventType}`;

    // Check if this service has a handler for this event type
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
```

**tryInvokeHandler() — DBOS.runStep() с retry**:

```typescript
/**
 * Key insight: DBOS only retries when step THROWS.
 * - Return marker for non-retryable → no retry
 * - Throw for retryable → DBOS retries according to policy
 */
private async tryInvokeHandler(
  event: DomainEvent,
  handler: HandlerInfo
): Promise<HandlerInvocationResult> {
  const { serviceName, action, retryPolicy } = handler;

  type InvokeStepResult =
    | { kind: "ok"; durationMs: number }
    | { kind: "nonRetryableFailure"; error: { message: string; code?: string }; durationMs: number };

  let stepResult: InvokeStepResult;

  try {
    stepResult = await DBOS.runStep<InvokeStepResult>(
      async () => {
        const startTime = Date.now();
        const resp: EventHandlerResponse = await this.broker.call(action, { event });
        const durationMs = Date.now() - startTime;

        if (resp.ok) {
          return { kind: "ok", durationMs };
        }

        // Non-retryable: DON'T throw → DBOS won't retry
        if (!resp.error.retryable) {
          return {
            kind: "nonRetryableFailure",
            error: { message: resp.error.message, code: resp.error.code },
            durationMs,
          };
        }

        // Retryable: throw → DBOS retries this step
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
    // DBOS exhausted retries → DLQ
    const errorMsg = e instanceof Error ? e.message : String(e);
    await this.sendToDLQ(event, serviceName, errorMsg, undefined, retryPolicy.maxAttempts);
    return { service: serviceName, status: "failed", error: errorMsg, durationMs: 0 };
  }

  if (stepResult.kind === "nonRetryableFailure") {
    // Non-retryable → DLQ immediately (1 attempt)
    await this.sendToDLQ(event, serviceName, stepResult.error.message, stepResult.error.code, 1);
    return {
      service: serviceName,
      status: "failed",
      error: stepResult.error.message,
      durationMs: stepResult.durationMs,
    };
  }

  return { service: serviceName, status: "success", durationMs: stepResult.durationMs };
}
```

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
│   └── repositories/
│       └── models/
│           ├── index.ts
│           ├── domainEvents.ts
│           └── deadLetterQueue.ts
```

---

#### 3.2-3.3 Drizzle Schemas

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

#### 3.5-3.7 EventsBrokerActions

**Persistence actions**:
- `persistEvent({ event })` — Insert to domain_events with `ON CONFLICT DO NOTHING`
- `updateEventStatus({ eventId, status, handlerResults })` — Mark completed

**DLQ actions**:
- `addToDLQ({ eventId, eventType, handler, error, attempts })` — Insert/update DLQ entry
- `getDLQEntries({ limit, eventType })` — Query failed entries
- `cleanupDLQ({ batchSize })` — Delete expired entries

**Retention**:
- `cleanupDomainEvents({ retentionDays, batchSize })` — Delete old events

---

#### 3.8 CleanupScheduler

**Cron jobs**:
- `@Cron(EVERY_DAY_AT_3AM)` — cleanupExpiredDLQEntries
- `@Cron(EVERY_DAY_AT_4AM)` — cleanupOldDomainEvents (90 days retention)

**Uses batch deletion** to avoid long transactions.

---

#### 3.9-3.11 EventsNestService, EventsModule & Bootstrap Integration

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

#### Example: ProductCreateWorkflow

**Current location**: `services/listing/src/workflows/` or `services/inventory/src/workflows/`

**Update pattern**:
```typescript
@DBOS.workflow()
async createProduct(input: CreateProductInput) {
  // Step 1: Save product
  const product = await this.saveProduct(input);

  // Step 2: Emit event (fire and forget)
  await EventEmitter.emit(
    {
      eventType: "productCreated",
      payload: { productId: product.id, storeId: input.storeId, name: input.name },
      context: { tenantId: ctx.organizationId, userId: ctx.userId },
      source: "listing",
      subject: { type: "product", id: product.id },
      related: [{ type: "store", id: input.storeId }],
      actor: { type: "user", id: ctx.userId },
    },
    "product:" + product.id  // emitKey — deterministic!
  );

  return product;
}
```

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

### New Packages
- `packages/events/package.json`
- `packages/events/tsconfig.json`
- `packages/events/src/index.ts`
- `packages/events/src/types.ts`
- `packages/events/src/idempotency.ts`
- `packages/events/src/emitter.ts`
- `packages/events/src/workflows/EventDispatchWorkflow.ts`

### New Service
- `services/events/package.json`
- `services/events/drizzle.config.ts`
- `services/events/src/events.module.ts`
- `services/events/src/events.nest-service.ts`
- `services/events/src/EventsBrokerActions.ts`
- `services/events/src/CleanupScheduler.ts`
- `services/events/src/repositories/models/index.ts`
- `services/events/src/repositories/models/domainEvents.ts`
- `services/events/src/repositories/models/deadLetterQueue.ts`

### Modified Files
- `packages/shared-kernel/src/broker/ActionRegistry.ts`
- `packages/shared-kernel/src/broker/ServiceBroker.ts`
- `packages/shared-kernel/src/broker/EventHandlers.ts` (new)
- `packages/shared-kernel/src/decorators/EventHandler.ts` (new)
- `packages/shared-kernel/src/index.ts`
- `services/bootstrap/package.json`
- `services/bootstrap/src/bootstrap.module.ts`
- `services/inventory/src/InventoryEventHandlers.ts` (new)
- `services/inventory/src/inventory.module.ts`

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
# In packages/events
pnpm add canonicalize

# In services/events
pnpm add @nestjs/schedule
```

### Required Package Dependencies

**packages/events/package.json** должен включать:
```json
{
  "dependencies": {
    "@dbos-inc/dbos-sdk": "^2.0.0",
    "@shopana/shared-kernel": "*",
    "@shopana/shared-service-config": "*",
    "canonicalize": "^2.0.0"
  }
}
```

**`@shopana/shared-service-config`** — предоставляет:
- `getConfig()` — returns service configuration with all registered services
- Used in `getAvailableHandlers()` to iterate over `config.services`

```typescript
// Usage in EventDispatchWorkflow
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

# Event-Driven Architecture with DBOS Durability (Standalone)

**Author**: Generated from event-driven-architecture-plan.md
**Date**: 2026-01-20

## Overview

Event-driven architecture built directly on DBOS durability primitives.

**Key idea**: Events are dispatched through durable DBOS workflows. Each handler is a simple async function called via the service broker. Idempotency is handled at two levels:
1. **DBOS Workflow level** — same `workflowId` = execute once
2. **Domain level** — `ON CONFLICT DO NOTHING`, upserts, conditional updates

### Architectural Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     EVENT-DRIVEN LAYER                          │
│  DomainEvent, EventEmitter, EventDispatchWorkflow               │
├─────────────────────────────────────────────────────────────────┤
│                     DBOS DURABILITY                             │
│  Workflows, Steps, Retry policies                               │
├─────────────────────────────────────────────────────────────────┤
│                     DOMAIN IDEMPOTENCY                          │
│  ON CONFLICT DO NOTHING, upserts, conditional updates           │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Fire and forget** — producer emits event and moves on, doesn't know/care about consumers
2. **Independent consumers** — each handler processes independently, no coordination
3. **Parallel fan-out** — all handlers invoked in parallel
4. **Per-handler retry** — each handler has its own retry policy, failures don't affect others
5. **Eventual consistency** — system converges to consistent state over time
6. **Domain-level idempotency** — handlers use DB constraints for exactly-once semantics

---

## Service Structure: `events` Service

Event store, DLQ, и scheduling живут в отдельном сервисе `events` (не в `bootstrap`).

### Directory Structure

```
services/events/
├── package.json
├── drizzle.config.ts
├── migrations/
│   └── 0000_initial.sql
├── src/
│   ├── main.ts
│   ├── events.module.ts
│   ├── EventsBrokerActions.ts          # @Action: persistEvent, addToDLQ, cleanupDomainEvents, etc.
│   ├── CleanupScheduler.ts             # Scheduled cleanup (DLQ + domain events retention)
│   ├── context/
│   │   └── index.ts
│   ├── repositories/
│   │   └── models/
│   │       ├── index.ts
│   │       ├── domainEvents.ts         # domain_events table schema
│   │       └── deadLetterQueue.ts      # dead_letter_queue table schema
│   └── infrastructure/
│       └── db/
│           └── migrate.ts
```

### package.json

```json
{
  "name": "@shopana/events-service",
  "version": "0.0.1",
  "description": "Event store, DLQ, UI event log, entity timelines, and retention management",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "db:generate": "drizzle-kit generate"
  },
  "exports": {
    ".": {
      "import": "./dist/events.module.js",
      "default": "./src/events.module.ts"
    }
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/schedule": "^4.0.0",
    "@shopana/shared-kernel": "*",
    "@shopana/shared-context": "*",
    "drizzle-orm": "^0.44.7",
    "postgres": "^3.4.7",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@shopana/build-tools": "0.0.1",
    "@types/node": "^20.14.14",
    "drizzle-kit": "^0.31.7",
    "tsx": "^4.16.2",
    "typescript": "^5.5.4"
  }
}
```

### drizzle.config.ts

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/repositories/models/index.ts",
  out: "./migrations",
  dialect: "postgresql",
});
```

### Bootstrap Integration

`bootstrap` сервис импортирует `events` модуль:

```typescript
// services/bootstrap/src/bootstrap.module.ts

import { Module } from "@nestjs/common";
import { EventsModule } from "@shopana/events-service";
// ... other imports

@Module({
  imports: [
    EventsModule,  // Event store, DLQ, scheduling
    // ... other modules
  ],
})
export class BootstrapModule {}
```

```json
// services/bootstrap/package.json (добавить зависимость)
{
  "dependencies": {
    "@shopana/events-service": "0.0.1",
    // ... existing deps
  }
}
```

---

## Part 1: Event Types & Registry

### 1.1 Event Definition

```typescript
// packages/events/src/types.ts

/**
 * Base interface for all domain events.
 */
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  /** Unique event ID (deterministic, derived from dispatchWorkflowId) */
  eventId: string;

  /** Event type: "productCreated", "orderCompleted", etc. */
  eventType: TType;

  /**
   * Event timestamp (ISO 8601).
   *
   * NOTE: This is set to "" in EventEmitter and filled with REAL wall-clock
   * time in persistEvent step. The step is checkpointed by DBOS, so on replay
   * we get the same timestamp (determinism + real time).
   */
  timestamp: string;

  /** Event source (service name) */
  source: string;

  /** Event data */
  payload: TPayload;

  /** Context: tenant, user, correlation */
  context: EventContext;

  /**
   * REQUIRED: Unique emit key within parent workflow.
   * Must be deterministic and derived from business context.
   * Same emitKey = same dispatch workflow = idempotent.
   *
   * Examples:
   * - "product:" + productId
   * - "order:" + orderId + ":completed"
   * - "lineItem:" + lineItemId
   */
  emitKey: string;

  /** Parent workflow ID (for tracing) */
  parentWorkflowId?: string;

  // ═══════════════════════════════════════════════════════════════════
  // UI / TIMELINE FIELDS (REQUIRED for all events)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * REQUIRED: Primary subject of the event (for timeline grouping).
   * The main entity this event is about.
   */
  subject: {
    /** Entity type: "product", "order", "store", "user", etc. */
    type: string;
    /** Entity ID */
    id: string;
  };

  /**
   * Related entities (for cross-entity queries).
   * Entities that are associated with but not the primary subject.
   */
  related?: Array<{
    type: string;
    id: string;
  }>;

  /**
   * Who/what triggered this event.
   * Used for audit trail and filtering.
   */
  actor?: {
    /** Actor type: "user" (human), "service" (automated), "system" (cron/scheduler) */
    type: "user" | "service" | "system";
    /** User ID or service name */
    id?: string;
  };
}

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

// ═══════════════════════════════════════════════════════════════════
// CONCRETE EVENT TYPES (with subject/related/actor examples)
// ═══════════════════════════════════════════════════════════════════

// Product events
export interface ProductCreatedEvent extends DomainEvent<"productCreated", {
  productId: string;
  storeId: string;
  name: string;
  sku?: string;
}> {
  // subject: { type: "product", id: productId }
  // related: [{ type: "store", id: storeId }]
  // actor: { type: "user", id: userId } or { type: "service", id: "listing" }
}

export interface ProductDeletedEvent extends DomainEvent<"productDeleted", {
  productId: string;
  storeId: string;
}> {
  // subject: { type: "product", id: productId }
  // related: [{ type: "store", id: storeId }]
}

export interface ProductUpdatedEvent extends DomainEvent<"productUpdated", {
  productId: string;
  storeId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
}> {
  // subject: { type: "product", id: productId }
  // related: [{ type: "store", id: storeId }]
}

// Order events
export interface OrderCreatedEvent extends DomainEvent<"orderCreated", {
  orderId: string;
  storeId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
}> {
  // subject: { type: "order", id: orderId }
  // related: [{ type: "store", id: storeId }, { type: "customer", id: customerId }, ...items.map(i => ({ type: "product", id: i.productId }))]
}

export interface OrderCompletedEvent extends DomainEvent<"orderCompleted", {
  orderId: string;
  storeId: string;
  completedAt: string;
}> {
  // subject: { type: "order", id: orderId }
  // related: [{ type: "store", id: storeId }]
}

// Store events
export interface StoreCreatedEvent extends DomainEvent<"storeCreated", {
  storeId: string;
  organizationId: string;
  name: string;
}> {
  // subject: { type: "store", id: storeId }
  // related: [{ type: "organization", id: organizationId }]
}

// Union type for type safety
export type ShopanaEvent =
  | ProductCreatedEvent
  | ProductDeletedEvent
  | ProductUpdatedEvent
  | OrderCreatedEvent
  | OrderCompletedEvent
  | StoreCreatedEvent;

export type EventType = ShopanaEvent["eventType"];
```

### 1.2 Event Handler Decorator

```typescript
// packages/shared-kernel/src/decorators/EventHandler.ts

import "reflect-metadata";

/**
 * Metadata key for storing event handler info on methods
 */
export const EVENT_HANDLER_METADATA_KEY = Symbol("broker:eventHandler");

/**
 * Interface for event handler metadata stored on methods
 */
export interface EventHandlerMetadata {
  /** Event type this handler responds to */
  eventType: string;

  /** Retry policy for this handler */
  retryPolicy: RetryPolicy;
}

/**
 * Method decorator that marks a method as an event handler.
 * Used with EventHandlers base class for automatic registration.
 *
 * The method will be registered as a broker action with the event type as action name.
 * EventDispatchWorkflow calls `broker.call("{serviceName}.{eventType}", { event })`.
 *
 * @param eventType - Event type to handle (e.g., "productCreated")
 *
 * @example
 * class InventoryEventHandlers extends EventHandlers {
 *   // Uses default retry policy (3 attempts, 1s interval, 2x backoff)
 *   @EventHandler("productCreated")
 *   async handleProductCreated(params: { event: ProductCreatedEvent }) {
 *     // ...
 *   }
 *
 *   // Custom retry policy: 5 attempts with faster backoff
 *   @EventHandler("orderCompleted", { retry: { maxAttempts: 5, intervalSeconds: 0.5 } })
 *   async handleOrderCompleted(params: { event: OrderCompletedEvent }) {
 *     // ...
 *   }
 * }
 */
export function EventHandler(
  eventType: string,
  options: { retry?: Partial<RetryPolicy> } = {}
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
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

### 1.3 ActionRegistry with Metadata Support

```typescript
// packages/shared-kernel/src/broker/ActionRegistry.ts

import { Injectable } from '@nestjs/common';

export type ActionHandler<TParams = unknown, TResult = unknown> = (
  params: TParams | undefined,
) => Promise<TResult> | TResult;

/**
 * Metadata that can be attached to an action.
 */
export interface ActionMetadata {
  /** Retry policy for DBOS workflows */
  retryPolicy?: {
    maxAttempts: number;
    intervalSeconds: number;
    backoffRate: number;
  };
}

interface RegisteredAction {
  handler: ActionHandler;
  metadata?: ActionMetadata;
}

@Injectable()
export class ActionRegistry {
  private readonly actions = new Map<string, RegisteredAction>();

  /**
   * Registers a new action handler with optional metadata.
   */
  register(action: string, handler: ActionHandler, metadata?: ActionMetadata): void {
    if (this.actions.has(action)) {
      throw new Error(`Action "${action}" already registered`);
    }
    this.actions.set(action, { handler, metadata });
  }

  /**
   * Removes the action during shutdown.
   */
  deregister(action: string): void {
    this.actions.delete(action);
  }

  /**
   * Resolves an action handler or throws if it does not exist.
   */
  resolve<TParams = unknown, TResult = unknown>(
    action: string,
  ): ActionHandler<TParams, TResult> {
    const registered = this.actions.get(action);
    if (!registered) {
      throw new Error(`Action "${action}" not found`);
    }
    return registered.handler as ActionHandler<TParams, TResult>;
  }

  /**
   * Returns metadata for an action, or undefined if not found.
   */
  getMetadata(action: string): ActionMetadata | undefined {
    return this.actions.get(action)?.metadata;
  }

  /**
   * Checks if an action is registered.
   */
  has(action: string): boolean {
    return this.actions.has(action);
  }

  /**
   * Returns all registered actions for observability.
   */
  list(): string[] {
    return Array.from(this.actions.keys());
  }
}
```

### 1.4 ServiceBroker with Metadata

```typescript
// packages/shared-kernel/src/broker/ServiceBroker.ts (additions)

export class ServiceBroker {
  // ... existing code ...

  /**
   * Registers a new action with optional metadata.
   */
  register<TParams = unknown, TResult = unknown>(
    action: string,
    handler: ActionHandler<TParams, TResult>,
    metadata?: ActionMetadata,
  ): void {
    const qualifiedAction = this.qualifyAction(action);
    this.registry.register(qualifiedAction, handler as ActionHandler, metadata);
    this.localActions.add(qualifiedAction);
  }

  /**
   * Returns metadata for an action.
   */
  getActionMetadata(action: string): ActionMetadata | undefined {
    const qualifiedAction = this.assertFullyQualified(action);
    return this.registry.getMetadata(qualifiedAction);
  }

  /**
   * Checks if an action is registered.
   */
  hasAction(action: string): boolean {
    const qualifiedAction = this.assertFullyQualified(action);
    return this.registry.has(qualifiedAction);
  }
}
```

### 1.5 Handler Contract

```typescript
// packages/events/src/types.ts (continued)

/**
 * Handler response contract.
 *
 * Handler decides if error is retryable or not:
 * - { ok: true } → success
 * - { ok: false, retryable: true } → DBOS retries according to policy
 * - { ok: false, retryable: false } → DLQ immediately (no retries)
 */
export type EventHandlerResponse =
  | { ok: true }
  | { ok: false; error: { message: string; code?: string; retryable: boolean } };

/**
 * Event handler signature.
 */
export type EventHandler<TEvent> = (params: { event: TEvent }) => Promise<EventHandlerResponse>;
```

**Правила для разработчиков:**

| Ситуация | Что возвращать |
|----------|----------------|
| Успех | `{ ok: true }` |
| Idempotent "already done" (duplicate key, etc.) | `{ ok: true }` |
| Transient error (network, timeout, deadlock) | `{ ok: false, retryable: true }` |
| Business/validation error | `{ ok: false, retryable: false }` |

### 1.6 Error Handling Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HANDLER ERROR FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Handler returns EventHandlerResponse:                                      │
│                                                                             │
│  ┌─────────────┐                                                            │
│  │   Handler   │                                                            │
│  │  executes   │                                                            │
│  └──────┬──────┘                                                            │
│         │                                                                   │
│         ├──► { ok: true } ─────────────────────────────────► SUCCESS        │
│         │                                                                   │
│         ├──► { ok: false, retryable: true } ──► DBOS retries ──► DLQ       │
│         │                                       (N attempts)                │
│         │                                                                   │
│         └──► { ok: false, retryable: false } ──► DLQ immediately           │
│                                                  (1 attempt, no retries)    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Return { ok: true }:                                                       │
│  - Success                                                                  │
│  - Idempotent "already done" (duplicate key, version mismatch)             │
│  - Resource not found for DELETE (already deleted)                         │
│                                                                             │
│  Return { ok: false, retryable: true }:                                    │
│  - Connection errors (ECONNREFUSED, timeout)                               │
│  - Deadlock / serialization failure                                        │
│  - Temporary unavailability                                                │
│                                                                             │
│  Return { ok: false, retryable: false }:                                   │
│  - Validation errors                                                       │
│  - Business rule violations                                                │
│  - Data corruption                                                         │
│  - Missing required data                                                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  HOW WRAPPER WORKS (inside EventDispatchWorkflow.tryInvokeHandler):        │
│                                                                             │
│  DETERMINISM: Handler list + retryPolicy come from checkpointed            │
│  getAvailableHandlers() step. On replay, same handlers with same config.   │
│                                                                             │
│  1. Call handler via broker → get EventHandlerResponse                     │
│  2. If { ok: true } → return success marker                                │
│  3. If { ok: false, retryable: false } → return failure marker (no throw)  │
│  4. If { ok: false, retryable: true } → THROW → DBOS retries step          │
│                                                                             │
│  Key insight: DBOS only retries when step throws.                          │
│  By returning a marker instead of throwing, we control retry behavior.     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 EventHandlers Base Class

```typescript
// packages/shared-kernel/src/broker/EventHandlers.ts

import { Logger, OnModuleInit } from "@nestjs/common";
import { ServiceBroker } from "./ServiceBroker.js";
import {
  EVENT_HANDLER_METADATA_KEY,
  type EventHandlerMetadata,
} from "../decorators/EventHandler.js";
import "reflect-metadata";

/**
 * Base class for services that handle domain events.
 * Separate from BrokerActions to keep concerns clean:
 * - BrokerActions: request-response actions (@Action)
 * - EventHandlers: event-driven handlers (@EventHandler)
 *
 * @example
 * @Injectable()
 * class InventoryEventHandlers extends EventHandlers {
 *   constructor(@InjectBroker("inventory") broker: ServiceBroker) {
 *     super(broker);
 *   }
 *
 *   @EventHandler("productCreated")
 *   async handleProductCreated(params: { event: ProductCreatedEvent }) {
 *     // ...
 *   }
 * }
 */
export abstract class EventHandlers implements OnModuleInit {
  protected readonly logger: Logger;

  constructor(protected readonly broker: ServiceBroker) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Returns the service broker instance.
   */
  getBroker(): ServiceBroker {
    return this.broker;
  }

  /**
   * Called by NestJS when the module initializes.
   * Scans for @EventHandler decorated methods and registers them with the broker.
   */
  onModuleInit(): void {
    this.registerEventHandlers();
  }

  /**
   * Scans the class instance for methods decorated with @EventHandler and registers them.
   */
  private registerEventHandlers(): void {
    const prototype = Object.getPrototypeOf(this);
    const methodNames = this.getMethodNames(prototype);
    const registeredHandlers: string[] = [];

    for (const methodName of methodNames) {
      const metadata = Reflect.getMetadata(
        EVENT_HANDLER_METADATA_KEY,
        prototype,
        methodName
      ) as EventHandlerMetadata | undefined;

      if (metadata) {
        const method = (this as Record<string, unknown>)[methodName] as (
          params: unknown
        ) => Promise<unknown>;

        // Bind the method to this instance
        const boundMethod = method.bind(this);

        // Register with retry policy metadata
        this.broker.register(metadata.eventType, boundMethod, {
          retryPolicy: metadata.retryPolicy,
        });
        registeredHandlers.push(metadata.eventType);
      }
    }

    if (registeredHandlers.length > 0) {
      this.logger.debug(`Registered event handlers: ${registeredHandlers.join(", ")}`);
    }
  }

  private getMethodNames(prototype: object): string[] {
    const methods: string[] = [];
    let currentProto = prototype;

    while (currentProto && currentProto !== Object.prototype) {
      const names = Object.getOwnPropertyNames(currentProto).filter((name) => {
        if (name === "constructor") return false;
        const descriptor = Object.getOwnPropertyDescriptor(currentProto, name);
        return descriptor && typeof descriptor.value === "function";
      });

      methods.push(...names);
      currentProto = Object.getPrototypeOf(currentProto);
    }

    return [...new Set(methods)];
  }
}
```

**Разделение ответственности:**

| Класс | Декоратор | Назначение |
|-------|-----------|------------|
| `BrokerActions` | `@Action` | Request-response (sync) |
| `EventHandlers` | `@EventHandler` | Event-driven (fire & forget) |

---

## Part 2: Event Emission (Source Service)

### 2.1 Idempotency Formulas

```typescript
// packages/events/src/idempotency.ts

import crypto from "node:crypto";
import canonicalize from "canonicalize";  // npm: canonicalize (RFC 8785 JCS)

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

/**
 * Create canonical JSON string for deterministic hashing.
 * Uses RFC 8785 JSON Canonicalization Scheme (JCS).
 *
 * IMPORTANT: Never use plain JSON.stringify() for hashing —
 * key order is not guaranteed and same payload can produce different hashes.
 *
 * @see https://www.rfc-editor.org/rfc/rfc8785
 */
export function canonicalJson(value: unknown): string {
  const result = canonicalize(value);
  if (result === undefined) {
    throw new Error("Cannot canonicalize value: contains unsupported types");
  }
  return result;
}

/**
 * Generate dispatch workflow ID.
 * Deterministic: same parent + eventType + emitKey = same workflowId.
 *
 * Format: {parentWorkflowId}:dispatch:v1:{eventType}:{emitKeyHash}
 *
 * Version prefix (v1) allows changing the formula later without breaking
 * existing workflows or causing unexpected collisions.
 */
export function makeDispatchWorkflowId(params: {
  parentWorkflowId: string;
  eventType: string;
  emitKey: string;
}): string {
  // v1 in hash input ensures formula changes don't collide with old hashes
  // 32 chars = 128 bits of entropy, virtually no collision risk
  const emitKeyHash = sha256(`emitKey:v1:${params.emitKey}`).slice(0, 32);
  return `${params.parentWorkflowId}:dispatch:v1:${params.eventType}:${emitKeyHash}`;
}

/**
 * Generate deterministic event ID.
 * Same tenant + dispatchWorkflowId = same eventId.
 *
 * This ensures:
 * - Retry of same emit = same eventId (no duplicate in event store)
 * - Different emits = different eventIds
 *
 * Version prefix (v1) allows changing the formula later.
 */
export function makeEventId(params: {
  tenantId: string;
  dispatchWorkflowId: string;
}): string {
  return sha256(`eventId:v1:${params.tenantId}:${params.dispatchWorkflowId}`).slice(0, 32);
}

// ═══════════════════════════════════════════════════════════════════
// NOTE: Real timestamp is captured in persistEvent step (see Part 5.4)
// We do NOT generate fake timestamps from hashes - that would break
// timeline ordering in UI.
//
// The timestamp field in DomainEvent is set to empty string initially,
// and replaced with real time when persisted (inside @DBOS.step).
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate deterministic correlationId from parentWorkflowId.
 *
 * IMPORTANT: We do NOT use crypto.randomUUID() because it's non-deterministic on replay.
 * Instead, we derive correlationId from the parent workflow.
 */
export function makeDeterministicCorrelationId(parentWorkflowId: string): string {
  // Format as UUID-like string for compatibility with tracing systems
  const hash = sha256(`correlationId:v1:${parentWorkflowId}`);
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}
```

### 2.2 emitKey Rules

**CRITICAL: `emitKey` is MANDATORY and must follow these rules:**

| Rule | Description |
|------|-------------|
| **Never random** | `emitKey` must be deterministic, never use `randomUUID()` |
| **Business-derived** | Must come from business context (productId, orderId, lineItemId, etc.) |
| **One emit = one key** | Same business operation = same emitKey |
| **Unique within workflow** | Different emits in same workflow = different emitKeys |

**Good emitKey examples:**

```typescript
// Single entity events
"product:" + productId                     // productCreated
"order:" + orderId + ":completed"          // orderCompleted
"lineItem:" + lineItemId                   // itemReserved

// Multiple events of same type from one workflow
"product:" + productId + ":change:price"   // productUpdated (price)
"product:" + productId + ":change:name"    // productUpdated (name)
"product:" + productId + ":change:sku"     // productUpdated (sku)

// Content-based (for idempotent updates)
"sku:" + sku + ":setStock:" + sha256(canonicalJson(payload)).slice(0, 8)
```

**Bad emitKey examples:**

```typescript
// ❌ Random - breaks idempotency
crypto.randomUUID()

// ❌ Timestamp - different on retry
Date.now().toString()

// ❌ Too generic - collisions within workflow
"productUpdated"
```

### 2.2.1 Critical Edge Case: Same emitKey, Different Payload

⚠️ **If you emit the same emitKey with different payload, idempotency "wins" and the second emit is IGNORED.**

```typescript
// WRONG: same emitKey, different payload → second emit silently ignored!
await EventEmitter.emit(
  { eventType: "productUpdated", payload: { price: 100 }, ... },
  "product:123"  // same emitKey
);
await EventEmitter.emit(
  { eventType: "productUpdated", payload: { price: 200 }, ... },  // different payload!
  "product:123"  // same emitKey → IGNORED, dispatch workflow already exists
);
```

**Rule: One emitKey = One business result**

If payload changes by meaning → emitKey MUST change too:

```typescript
// CORRECT: different changes → different emitKeys
await EventEmitter.emit(
  { eventType: "productUpdated", payload: { field: "price", value: 100 }, ... },
  "product:123:change:price"  // unique emitKey for price change
);
await EventEmitter.emit(
  { eventType: "productUpdated", payload: { field: "name", value: "New Name" }, ... },
  "product:123:change:name"  // unique emitKey for name change
);
```

Or include payload hash in emitKey for content-addressed events:

```typescript
const payloadHash = sha256(canonicalJson(payload)).slice(0, 8);
await EventEmitter.emit(
  { eventType: "stockUpdated", payload, ... },
  `sku:${sku}:setStock:${payloadHash}`  // payload change → different emitKey
);
```

### 2.2.2 emitKey Templates by Event Type

| Event Type | emitKey Template | Example |
|------------|------------------|---------|
| `productCreated` | `"product:" + productId` | `"product:prod-123"` |
| `productUpdated` | `"product:" + productId + ":change:" + field` | `"product:prod-123:change:price"` |
| `productDeleted` | `"product:" + productId` | `"product:prod-123"` |
| `orderCreated` | `"order:" + orderId` | `"order:ord-456"` |
| `orderCompleted` | `"order:" + orderId + ":completed"` | `"order:ord-456:completed"` |
| `storeCreated` | `"store:" + storeId` | `"store:store-789"` |
| `stockUpdated` | `"sku:" + sku + ":setStock:" + payloadHash` | `"sku:ABC:setStock:a1b2c3d4"` |
| `itemReserved` | `"lineItem:" + lineItemId` | `"lineItem:li-001"` |

**For batch operations** (e.g., updating multiple items in one workflow):

```typescript
// Each item gets its own emitKey
for (const item of order.items) {
  await EventEmitter.emit(
    { eventType: "itemReserved", payload: { itemId: item.id, quantity: item.qty }, ... },
    `lineItem:${item.id}`  // unique per item
  );
}
```
```

### 2.3 Event Emitter

```typescript
// packages/events/src/emitter.ts

import { DBOS } from "@dbos-inc/dbos-sdk";
import type { DomainEvent, EventContext } from "./types.js";
import {
  makeDispatchWorkflowId,
  makeEventId,
  makeDeterministicCorrelationId,
} from "./idempotency.js";
import { EventDispatchWorkflow, type EventDispatchResult } from "./workflows/EventDispatchWorkflow.js";

/**
 * Emit an event by starting its dispatch workflow.
 *
 * IMPORTANT: Cannot be called from inside a @DBOS.step() — workflows cannot
 * be started from steps. Call from workflow code directly.
 *
 * CRITICAL: emitKey is MANDATORY. It must be deterministic and derived from
 * business context. See "emitKey Rules" section for guidelines.
 */
export class EventEmitter {
  /**
   * Emit an event. Starts EventDispatchWorkflow.
   *
   * MUST be called from workflow code (not from step!).
   *
   * @param input - Event data (eventType, payload, context, source)
   * @param emitKey - REQUIRED: Unique key within parent workflow. Must be deterministic.
   *
   * WorkflowID is derived from:
   * - Parent workflow ID (DBOS.workflowID)
   * - Event type
   * - emitKey (hashed)
   *
   * This ensures: same parent + same eventType + same emitKey = same dispatch workflow.
   *
   * DETERMINISM: All event fields are deterministic on workflow replay:
   * - eventId: derived from tenantId + dispatchWorkflowId
   * - timestamp: captured in persistEventStep (real wall-clock, but checkpointed!)
   * - correlationId: derived from parentWorkflowId (not random!)
   *
   * @example
   * @DBOS.workflow()
   * async createProduct(input: CreateProductInput) {
   *   const product = await this.saveProduct(input);  // @DBOS.step()
   *
   *   // emitKey is deterministic: "product:" + productId
   *   await EventEmitter.emit(
   *     {
   *       eventType: "productCreated",
   *       payload: { productId: product.id, storeId: input.storeId, name: input.name },
   *       context: { tenantId: ctx.organizationId, userId: ctx.userId },
   *       source: "listing",
   *       // UI/Timeline fields (REQUIRED)
   *       subject: { type: "product", id: product.id },
   *       related: [{ type: "store", id: input.storeId }],
   *       actor: { type: "user", id: ctx.userId },
   *     },
   *     "product:" + product.id  // emitKey
   *   );
   *
   *   return product;
   * }
   *
   * @returns workflowId and eventId
   */
  static async emit<TType extends string, TPayload>(
    input: {
      eventType: TType;
      payload: TPayload;
      source: string;
      context: Omit<EventContext, "correlationId"> & { correlationId?: string };
      /** REQUIRED: Primary subject for timeline grouping */
      subject: { type: string; id: string };
      /** Related entities (optional) */
      related?: Array<{ type: string; id: string }>;
      /** Who triggered this event (optional, defaults to service) */
      actor?: { type: "user" | "service" | "system"; id?: string };
    },
    emitKey: string
  ): Promise<{ workflowId: string; eventId: string }> {
    // Validate emitKey — must be non-empty
    if (!emitKey || emitKey.trim().length === 0) {
      throw new Error("emitKey is required and must be non-empty");
    }

    const parentWorkflowId = DBOS.workflowID;
    if (!parentWorkflowId) {
      throw new Error("EventEmitter.emit() must be called from workflow code (not from a step).");
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

    // DETERMINISM: correlationId derived from parentWorkflowId if not provided
    const correlationId = input.context.correlationId
      ?? makeDeterministicCorrelationId(parentWorkflowId);

    // Build event object
    // NOTE: timestamp is NOT set here — it will be captured in persistEventStep
    // (real wall-clock time, checkpointed by DBOS for replay safety)
    const event: DomainEvent<TType, TPayload> = {
      eventId,
      eventType: input.eventType,
      timestamp: "",  // Will be set in persistEventStep with real time
      source: input.source,
      payload: input.payload,
      emitKey,
      parentWorkflowId,
      context: {
        ...input.context,
        correlationId,
      },
      // UI/Timeline fields (REQUIRED for valid event)
      subject: input.subject,
      related: input.related ?? [],
      actor: input.actor ?? { type: "service", id: input.source },
    };

    // Start dispatch workflow
    await DBOS
      .startWorkflow(EventDispatchWorkflow, { workflowID: workflowId })
      .dispatch(event);

    return { workflowId, eventId };
  }

  /**
   * Emit event and wait for all handlers to complete.
   * Use sparingly - prefer async emission.
   *
   * MUST be called from workflow code (not from step!).
   */
  static async emitAndWait<TType extends string, TPayload>(
    input: {
      eventType: TType;
      payload: TPayload;
      source: string;
      context: Omit<EventContext, "correlationId"> & { correlationId?: string };
      /** REQUIRED: Primary subject for timeline grouping */
      subject: { type: string; id: string };
      /** Related entities (optional) */
      related?: Array<{ type: string; id: string }>;
      /** Who triggered this event (optional, defaults to service) */
      actor?: { type: "user" | "service" | "system"; id?: string };
    },
    emitKey: string
  ): Promise<EventDispatchResult> {
    // Validate emitKey — must be non-empty
    if (!emitKey || emitKey.trim().length === 0) {
      throw new Error("emitKey is required and must be non-empty");
    }

    const parentWorkflowId = DBOS.workflowID;
    if (!parentWorkflowId) {
      throw new Error("EventEmitter.emitAndWait() must be called from workflow code.");
    }

    const workflowId = makeDispatchWorkflowId({
      parentWorkflowId,
      eventType: input.eventType,
      emitKey,
    });

    const eventId = makeEventId({
      tenantId: input.context.tenantId,
      dispatchWorkflowId: workflowId,
    });

    // DETERMINISM: correlationId derived from parentWorkflowId if not provided
    const correlationId = input.context.correlationId
      ?? makeDeterministicCorrelationId(parentWorkflowId);

    // NOTE: timestamp will be set in persistEventStep with real time
    const event: DomainEvent<TType, TPayload> = {
      eventId,
      eventType: input.eventType,
      timestamp: "",  // Will be set in persistEventStep
      source: input.source,
      payload: input.payload,
      emitKey,
      parentWorkflowId,
      context: {
        ...input.context,
        correlationId,
      },
      // UI/Timeline fields (REQUIRED for valid event)
      subject: input.subject,
      related: input.related ?? [],
      actor: input.actor ?? { type: "service", id: input.source },
    };

    const handle = await DBOS
      .startWorkflow(EventDispatchWorkflow, { workflowID: workflowId })
      .dispatch(event);

    return handle.getResult();
  }
}
```

---

## Part 3: Event Dispatch Workflow (DBOS Durability)

### 3.1 Workflow Definition

```typescript
// packages/events/src/workflows/EventDispatchWorkflow.ts

import { DBOS } from "@dbos-inc/dbos-sdk";
import type { DomainEvent } from "../types.js";
import type { ServiceBroker } from "@shopana/shared-kernel";
import { getConfig } from "@shopana/shared-service-config";

/**
 * Result of event dispatch workflow.
 */
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

/**
 * Handler info captured at checkpoint time.
 * Includes retry policy to ensure consistent behavior on replay.
 */
interface HandlerInfo {
  serviceName: string;
  action: string;
  retryPolicy: {
    maxAttempts: number;
    intervalSeconds: number;
    backoffRate: number;
  };
}

/**
 * Main event dispatch workflow.
 *
 * Iterates over all services from config and tries to call
 * {serviceName}.{eventType} for each. Services that don't handle
 * this event type will return "action not found" and be skipped.
 *
 * DBOS Workflow guarantees:
 * - Completion even if service restarts (durability)
 * - Idempotent execution (same workflowId = execute once)
 *
 * NOTE: Workflow ID is generated by EventEmitter using makeDispatchWorkflowId().
 * Pattern: {parentWorkflowId}:dispatch:v1:{eventType}:{emitKeyHash}
 */
export class EventDispatchWorkflow {
  constructor(private readonly broker: ServiceBroker) {}

  @DBOS.workflow()
  async dispatch(event: DomainEvent): Promise<EventDispatchResult> {
    // Step 1: Persist event and capture REAL timestamp
    // (step result is checkpointed → same timestamp on replay)
    const { timestamp } = await this.persistEventStep(event);

    // Enrich event with real timestamp for handlers
    const eventWithTimestamp: DomainEvent = { ...event, timestamp };

    // Step 2: Get handlers that exist for this event type (checkpointed!)
    // This ensures determinism on replay — same handler list every time
    const handlers = await this.getAvailableHandlers(event.eventType);

    // Step 3: Try to invoke handler on each service in parallel
    // NOTE: handlers receive eventWithTimestamp (has real time!)
    const resultPromises = handlers.map((handler) =>
      this.tryInvokeHandler(eventWithTimestamp, handler)
    );

    const results = await Promise.all(resultPromises);

    // Step 4: Update event status to completed
    await this.updateEventStatus(event.eventId, results);

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      status: "completed",
      servicesNotified: results.length,
      results,
    };
  }

  /**
   * DBOS Step: Persist event and capture real timestamp.
   *
   * NOTE: This step is checkpointed by DBOS. On replay it won't run,
   * so the underlying broker action (events.persistEvent) won't be called again.
   * The returned timestamp is part of the checkpointed result.
   */
  @DBOS.step()
  private async persistEventStep(event: DomainEvent): Promise<{ timestamp: string }> {
    // Calls broker @Action "events.persistEvent" which returns { persisted, timestamp }
    const result = await this.broker.call("events.persistEvent", { event });
    return { timestamp: result.timestamp };
  }

  /**
   * Update event status after all handlers processed.
   */
  @DBOS.step()
  private async updateEventStatus(
    eventId: string,
    results: HandlerInvocationResult[]
  ): Promise<void> {
    await this.broker.call("events.updateEventStatus", {
      eventId,
      status: "completed",
      handlerResults: results,
    });
  }

  /**
   * Get available handlers for this event type.
   *
   * DETERMINISM: This is a @DBOS.step(), so the result is checkpointed.
   * On workflow replay, DBOS returns the same handler list — even if
   * broker registration changed since then.
   *
   * Also captures retry policy at checkpoint time, ensuring consistent
   * retry behavior on replay.
   */
  @DBOS.step()
  private async getAvailableHandlers(eventType: string): Promise<HandlerInfo[]> {
    const config = getConfig();
    const serviceNames = Object.keys(config.services);
    const handlers: HandlerInfo[] = [];

    for (const serviceName of serviceNames) {
      const action = `${serviceName}.${eventType}`;

      // Check if this service has a handler for this event type
      if (this.broker.hasAction(action)) {
        // Capture retry policy at checkpoint time
        const metadata = this.broker.getActionMetadata(action);
        const retryPolicy = metadata?.retryPolicy ?? {
          maxAttempts: 3,
          intervalSeconds: 1,
          backoffRate: 2,
        };

        handlers.push({
          serviceName,
          action,
          retryPolicy,
        });
      }
    }

    return handlers;
  }

  /**
   * Try to invoke event handler on a service.
   *
   * DETERMINISM: Handler info (including retryPolicy) comes from checkpointed
   * getAvailableHandlers() step — ensures identical behavior on replay.
   *
   * Wrapper logic:
   * - Handler returns { ok: true } → success
   * - Handler returns { ok: false, retryable: true } → throw → DBOS retries
   * - Handler returns { ok: false, retryable: false } → return marker → DLQ immediately
   *
   * Key insight: DBOS only retries when step throws.
   * By returning a marker instead of throwing, we skip retries for non-retryable errors.
   */
  private async tryInvokeHandler(
    event: DomainEvent,
    handler: HandlerInfo
  ): Promise<HandlerInvocationResult> {
    const { serviceName, action, retryPolicy } = handler;

    /**
     * Step result includes durationMs so it's checkpointed.
     * On replay, DBOS returns the saved result with correct timing.
     */
    type InvokeStepResult =
      | { kind: "ok"; durationMs: number }
      | { kind: "nonRetryableFailure"; error: { message: string; code?: string }; durationMs: number };

    let stepResult: InvokeStepResult;

    try {
      stepResult = await DBOS.runStep<InvokeStepResult>(
        async () => {
          // ═══════════════════════════════════════════════════════════════
          // Timing INSIDE the step → checkpointed by DBOS!
          // ═══════════════════════════════════════════════════════════════
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
      // DBOS exhausted retries for retryable error → DLQ
      const errorMsg = e instanceof Error ? e.message : String(e);

      await this.sendToDLQ(event, serviceName, errorMsg, undefined, retryPolicy.maxAttempts);

      return {
        service: serviceName,
        status: "failed",
        error: errorMsg,
        durationMs: 0,  // Unknown after retries exhausted
      };
    }

    // Step completed without throw
    if (stepResult.kind === "nonRetryableFailure") {
      // Non-retryable failure → DLQ immediately (1 attempt)
      await this.sendToDLQ(
        event,
        serviceName,
        stepResult.error.message,
        stepResult.error.code,
        1
      );

      return {
        service: serviceName,
        status: "failed",
        error: stepResult.error.message,
        durationMs: stepResult.durationMs,  // From checkpointed step result
      };
    }

    return {
      service: serviceName,
      status: "success",
      durationMs: stepResult.durationMs,  // From checkpointed step result
    };
  }

  /**
   * Send failed handler to Dead Letter Queue for later inspection/retry.
   *
   * NOTE: We do NOT pass the full event (PII protection).
   * Only event_id reference + handler info + error are stored.
   */
  @DBOS.step()
  private async sendToDLQ(
    event: DomainEvent,
    serviceName: string,
    error: string,
    errorCode: string | undefined,
    attempts: number
  ): Promise<void> {
    await this.broker.call("events.addToDLQ", {
      // Reference only — NO full event passed!
      eventId: event.eventId,
      eventType: event.eventType,
      tenantId: event.context.tenantId,
      correlationId: event.context.correlationId,
      handler: {
        service: serviceName,
        action: event.eventType,
      },
      error,
      errorCode,
      attempts,
    });
  }
}
```

---

## Part 4: Service-Side Event Handlers

Event handlers живут в отдельном классе `EventHandlers`, не в `BrokerActions`.

### 4.1 Broker Actions (request-response)

```typescript
// services/inventory/src/InventoryBrokerActions.ts

import { Injectable } from "@nestjs/common";
import {
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  Action,
} from "@shopana/shared-kernel";
import { Kernel } from "./kernel/Kernel.js";

/**
 * Request-response actions only.
 * Event handlers are in InventoryEventHandlers.
 */
@Injectable()
export class InventoryBrokerActions extends BrokerActions {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Action("getOffers")
  async getOffers(params: GetOffersParams): Promise<GetOffersResult> {
    return this.kernel.runScript(GetOffersScript, params);
  }

  @Action("setStock")
  async setStock(params: SetStockParams): Promise<SetStockResult> {
    return this.kernel.runScript(SetStockScript, params);
  }
}
```

### 4.2 Event Handlers (event-driven)

```typescript
// services/inventory/src/InventoryEventHandlers.ts

import { Injectable } from "@nestjs/common";
import {
  EventHandlers,
  EventHandler,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type {
  ProductCreatedEvent,
  ProductDeletedEvent,
  ProductUpdatedEvent,
  EventHandlerResponse,
} from "@shopana/events";
import { Kernel } from "./kernel/Kernel.js";

/**
 * Event handlers for inventory service.
 * Separate from BrokerActions for clean separation of concerns.
 *
 * Handler contract (EventHandlerResponse):
 * - { ok: true } → success (including idempotent "already done")
 * - { ok: false, retryable: true } → DBOS retries according to policy
 * - { ok: false, retryable: false } → DLQ immediately (no retries)
 *
 * Each handler is independent — failures don't affect other handlers.
 */
@Injectable()
export class InventoryEventHandlers extends EventHandlers {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  /**
   * Handle productCreated: Initialize inventory record.
   *
   * Domain idempotency: INSERT ON CONFLICT DO NOTHING
   * - Duplicate key → { ok: true } (idempotent success)
   * - Transient error → { ok: false, retryable: true } → DBOS retries
   * - Business error → { ok: false, retryable: false } → DLQ immediately
   */
  @EventHandler("productCreated")
  async handleProductCreated(params: { event: ProductCreatedEvent }): Promise<EventHandlerResponse> {
    const { productId, storeId, sku } = params.event.payload;

    try {
      await this.kernel.runScript(InitializeInventoryScript, {
        productId,
        storeId,
        sku: sku ?? productId,
        initialQuantity: 0,
      });

      return { ok: true };
    } catch (error) {
      // Duplicate key = already initialized, idempotent success
      if (isDuplicateKeyError(error)) {
        this.logger.debug(`Inventory already exists for product ${productId}`);
        return { ok: true };
      }

      // Transient errors → retry
      if (isTransientError(error)) {
        return {
          ok: false,
          error: { message: String(error), retryable: true, code: "TRANSIENT" },
        };
      }

      // Business/validation errors → DLQ immediately
      return {
        ok: false,
        error: { message: String(error), retryable: false, code: "BUSINESS" },
      };
    }
  }

  /**
   * Handle productDeleted: Remove inventory record.
   *
   * DELETE is naturally idempotent — deleting non-existent record is OK.
   */
  @EventHandler("productDeleted")
  async handleProductDeleted(params: { event: ProductDeletedEvent }): Promise<EventHandlerResponse> {
    const { productId, storeId } = params.event.payload;

    try {
      await this.kernel.runScript(DeleteInventoryScript, { productId, storeId });
      return { ok: true };
    } catch (error) {
      if (isTransientError(error)) {
        return {
          ok: false,
          error: { message: String(error), retryable: true, code: "TRANSIENT" },
        };
      }

      return {
        ok: false,
        error: { message: String(error), retryable: false, code: "BUSINESS" },
      };
    }
  }

  /**
   * Handle productUpdated: Sync inventory metadata.
   *
   * Custom retry: more attempts for this important sync.
   */
  @EventHandler("productUpdated", { retry: { maxAttempts: 5 } })
  async handleProductUpdated(params: { event: ProductUpdatedEvent }): Promise<EventHandlerResponse> {
    const { productId, changes } = params.event.payload;

    try {
      await this.kernel.runScript(SyncInventoryMetadataScript, { productId, changes });
      return { ok: true };
    } catch (error) {
      if (isTransientError(error)) {
        return {
          ok: false,
          error: { message: String(error), retryable: true, code: "TRANSIENT" },
        };
      }

      return {
        ok: false,
        error: { message: String(error), retryable: false, code: "BUSINESS" },
      };
    }
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return String(error).includes("duplicate key") ||
         String(error).includes("unique constraint");
}

function isTransientError(error: unknown): boolean {
  const msg = String(error).toLowerCase();
  return (
    msg.includes("econnrefused") ||
    msg.includes("timeout") ||
    msg.includes("deadlock") ||
    msg.includes("serialization failure") ||
    msg.includes("connection reset")
  );
}
```

### 4.3 Module Registration

```typescript
// services/inventory/src/inventory.module.ts

import { Module } from "@nestjs/common";
import { InventoryBrokerActions } from "./InventoryBrokerActions.js";
import { InventoryEventHandlers } from "./InventoryEventHandlers.js";

@Module({
  providers: [
    InventoryBrokerActions,   // @Action methods
    InventoryEventHandlers,   // @EventHandler methods
  ],
})
export class InventoryModule {}
```

**Структура файлов сервиса:**
```
services/inventory/src/
├── InventoryBrokerActions.ts   # @Action — request-response
├── InventoryEventHandlers.ts   # @EventHandler — event-driven
├── inventory.module.ts
└── kernel/
```

---

## Part 5: Event Persistence & Audit

> **Note**: Все таблицы и broker actions этой части находятся в сервисе `events` (не `bootstrap`).

### 5.1 Drizzle Schema Models

```typescript
// services/events/src/repositories/models/domainEvents.ts

import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const domainEvents = pgTable(
  "domain_events",
  {
    // ═══════════════════════════════════════════════════════════════════
    // CORE EVENT FIELDS
    // ═══════════════════════════════════════════════════════════════════
    eventId: text("event_id").primaryKey(),
    eventType: text("event_type").notNull(),
    source: text("source").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),

    // Context fields
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id"),
    correlationId: text("correlation_id").notNull(),
    causationId: text("causation_id"),

    // Idempotency fields
    emitKey: text("emit_key").notNull(),
    parentWorkflowId: text("parent_workflow_id"),

    // Dispatch status
    status: text("status").notNull().default("pending"),
    dispatchStartedAt: timestamp("dispatch_started_at", { withTimezone: true }),
    dispatchCompletedAt: timestamp("dispatch_completed_at", { withTimezone: true }),
    handlerResults: jsonb("handler_results"),

    // ═══════════════════════════════════════════════════════════════════
    // UI / TIMELINE FIELDS (for event log and entity timelines)
    // ═══════════════════════════════════════════════════════════════════

    /** Primary subject: { type, id } — main entity this event is about */
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),

    /** Related entities: array of { type, id } — for cross-entity queries */
    related: jsonb("related").notNull().default([]),

    /** Actor info: who triggered the event */
    actorType: text("actor_type").notNull().default("service"),  // "user" | "service" | "system"
    actorId: text("actor_id"),  // userId or service name

    /** Hash of original payload for verification (optional) */
    payloadHash: text("payload_hash"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Core indexes
    index("idx_events_type").on(table.eventType),
    index("idx_events_correlation").on(table.correlationId),
    index("idx_events_parent_workflow").on(table.parentWorkflowId, table.eventType),

    // Timeline indexes (for UI queries)
    index("idx_events_tenant_timestamp").on(table.tenantId, table.timestamp),
    index("idx_events_subject_timeline").on(table.tenantId, table.subjectType, table.subjectId, table.timestamp),
    index("idx_events_type_timestamp").on(table.tenantId, table.eventType, table.timestamp),

    // GIN index for related entities (enables filtering by related.type/related.id)
    // CREATE INDEX idx_events_related ON domain_events USING GIN (related);
  ]
);

export type DomainEventRecord = typeof domainEvents.$inferSelect;
export type NewDomainEventRecord = typeof domainEvents.$inferInsert;
```

### 5.2 Generated SQL Migration

```sql
-- services/events/migrations/0000_initial.sql

CREATE TABLE IF NOT EXISTS domain_events (
  event_id TEXT PRIMARY KEY,

  -- ═══════════════════════════════════════════════════════════════════
  -- CORE EVENT FIELDS
  -- ═══════════════════════════════════════════════════════════════════
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,

  -- Context fields
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  correlation_id TEXT NOT NULL,
  causation_id TEXT,

  -- Idempotency fields
  emit_key TEXT NOT NULL,
  parent_workflow_id TEXT,

  -- Dispatch status
  status TEXT NOT NULL DEFAULT 'pending',
  dispatch_started_at TIMESTAMPTZ,
  dispatch_completed_at TIMESTAMPTZ,
  handler_results JSONB,

  -- ═══════════════════════════════════════════════════════════════════
  -- UI / TIMELINE FIELDS
  -- ═══════════════════════════════════════════════════════════════════

  -- Primary subject (for timeline grouping)
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,

  -- Related entities (for cross-entity queries)
  related JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Actor info
  actor_type TEXT NOT NULL DEFAULT 'service',  -- 'user' | 'service' | 'system'
  actor_id TEXT,

  -- Payload hash for verification
  payload_hash TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT domain_events_status_chk
    CHECK (status IN ('dispatching', 'completed')),
  CONSTRAINT domain_events_actor_type_chk
    CHECK (actor_type IN ('user', 'service', 'system'))
);

-- Core indexes
CREATE INDEX idx_events_type ON domain_events(event_type);
CREATE INDEX idx_events_correlation ON domain_events(correlation_id);
CREATE INDEX idx_events_status ON domain_events(status) WHERE status != 'completed';
CREATE INDEX idx_events_parent_workflow ON domain_events(parent_workflow_id, event_type);

-- Timeline indexes (for UI queries)
CREATE INDEX idx_events_tenant_timestamp ON domain_events(tenant_id, timestamp DESC);
CREATE INDEX idx_events_subject_timeline ON domain_events(tenant_id, subject_type, subject_id, timestamp DESC);
CREATE INDEX idx_events_type_timestamp ON domain_events(tenant_id, event_type, timestamp DESC);

-- GIN index for related entities (enables @> containment queries)
CREATE INDEX idx_events_related ON domain_events USING GIN (related);
```

### 5.3 Event Store Service

```typescript
// services/events/src/EventsBrokerActions.ts

import { Injectable } from "@nestjs/common";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { DomainEvent } from "@shopana/events";
import { eq, sql, and, desc, gte, lte, like, or } from "drizzle-orm";
import { domainEvents } from "./repositories/models/domainEvents.js";
import { deadLetterQueue, type DLQEntry } from "./repositories/models/deadLetterQueue.js";
import { computePayloadHash } from "./utils/hash.js";

/**
 * Broker actions for event persistence, DLQ management, and UI queries.
 * Lives in the `events` service.
 */
@Injectable()
export class EventsBrokerActions extends BrokerActions {
  constructor(@InjectBroker("events") broker: ServiceBroker) {
    super(broker);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PERSISTENCE ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Persist event to domain_events table.
   *
   * IMPORTANT:
   * This method is a Broker @Action (RPC handler), NOT a DBOS step.
   * It is deterministic in practice because it is called from a @DBOS.step()
   * in EventDispatchWorkflow.persistEventStep(). That step's return value is
   * checkpointed, so on replay the step won't re-run and this action won't
   * be called again.
   *
   * The `new Date()` here captures REAL wall-clock time, which becomes part
   * of the step's checkpointed return value.
   */
  @Action("persistEvent")
  async persistEvent(params: { event: DomainEvent }): Promise<{ persisted: boolean; timestamp: string }> {
    const { event } = params;

    // Capture REAL timestamp
    // (this action is called from a checkpointed step, so on replay it won't run)
    const realTimestamp = new Date();

    await this.db.insert(domainEvents).values({
      eventId: event.eventId,
      eventType: event.eventType,
      source: event.source,
      timestamp: realTimestamp,
      tenantId: event.context.tenantId,
      userId: event.context.userId,
      correlationId: event.context.correlationId,
      causationId: event.context.causationId,
      emitKey: event.emitKey,
      parentWorkflowId: event.parentWorkflowId,
      status: "dispatching",
      dispatchStartedAt: realTimestamp,
      // Subject/related/actor from event
      subjectType: event.subject.type,
      subjectId: event.subject.id,
      related: event.related ?? [],
      actorType: event.actor?.type ?? "service",
      actorId: event.actor?.id,
      payloadHash: computePayloadHash(event.payload),
    }).onConflictDoNothing();

    return { persisted: true, timestamp: realTimestamp.toISOString() };
  }

  @Action("updateEventStatus")
  async updateEventStatus(params: {
    eventId: string;
    status: "completed";
    handlerResults: HandlerInvocationResult[];
  }): Promise<{ updated: boolean }> {
    await this.db.update(domainEvents)
      .set({
        status: "completed",
        dispatchCompletedAt: new Date(),
        handlerResults: params.handlerResults,
        updatedAt: new Date(),
      })
      .where(eq(domainEvents.eventId, params.eventId));

    return { updated: true };
  }

  /**
   * Add failed handler to Dead Letter Queue.
   *
   * NOTE: We do NOT store the full event (PII protection).
   * Only event_id reference + handler info + error are stored.
   * To inspect the event, join with domain_events table.
   */
  @Action("addToDLQ")
  async addToDLQ(params: {
    eventId: string;
    eventType: string;
    tenantId: string;
    correlationId?: string;
    handler: { service: string; action: string };
    error: string;
    errorCode?: string;
    attempts: number;
  }): Promise<{ added: boolean }> {
    await this.db.insert(deadLetterQueue).values({
      // Reference only — NO full event stored!
      eventId: params.eventId,
      eventType: params.eventType,
      handlerService: params.handler.service,
      handlerAction: params.handler.action,
      error: params.error,
      errorCode: params.errorCode,
      attempts: params.attempts,
      tenantId: params.tenantId,
      correlationId: params.correlationId,
      status: "failed",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }).onConflictDoUpdate({
      target: [deadLetterQueue.eventId, deadLetterQueue.handlerService, deadLetterQueue.handlerAction],
      set: {
        error: params.error,
        errorCode: params.errorCode,
        attempts: params.attempts,
        failedAt: new Date(),
        status: "failed",
      },
    });

    return { added: true };
  }

  /**
   * Cleanup expired DLQ entries.
   * Should be called periodically (e.g., daily cron job).
   */
  @Action("cleanupDLQ")
  async cleanupDLQ(params: { batchSize?: number }): Promise<{ deleted: number }> {
    const batchSize = params.batchSize ?? 1000;

    const result = await this.db.execute(sql`
      DELETE FROM dead_letter_queue
      WHERE id IN (
        SELECT id FROM dead_letter_queue
        WHERE expires_at IS NOT NULL AND expires_at < NOW()
        LIMIT ${batchSize}
      )
    `);

    return { deleted: result.rowCount ?? 0 };
  }

  /**
   * Get failed DLQ entries for inspection.
   */
  @Action("getDLQEntries")
  async getDLQEntries(params: {
    limit?: number;
    eventType?: string;
  }): Promise<{ entries: DLQEntry[] }> {
    const limit = params.limit ?? 100;

    let query = this.db
      .select()
      .from(deadLetterQueue)
      .where(eq(deadLetterQueue.status, "failed"))
      .orderBy(deadLetterQueue.failedAt)
      .limit(limit);

    if (params.eventType) {
      query = query.where(eq(deadLetterQueue.eventType, params.eventType));
    }

    const entries = await query;
    return { entries };
  }

  // ═══════════════════════════════════════════════════════════════════
  // RETENTION / CLEANUP ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Cleanup old domain events.
   * Should be called periodically (e.g., daily cron job).
   *
   * @param retentionDays - Delete events older than this (default: 90)
   * @param batchSize - Max events to delete per call (default: 5000)
   */
  @Action("cleanupDomainEvents")
  async cleanupDomainEvents(params: {
    retentionDays?: number;
    batchSize?: number;
  }): Promise<{ deleted: number }> {
    const retentionDays = params.retentionDays ?? 90;
    const batchSize = params.batchSize ?? 5000;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await this.db.execute(sql`
      DELETE FROM domain_events
      WHERE event_id IN (
        SELECT event_id FROM domain_events
        WHERE timestamp < ${cutoffDate}
        LIMIT ${batchSize}
      )
    `);

    return { deleted: result.rowCount ?? 0 };
  }
}
```

---

### 5.5 Cleanup Scheduler (DLQ + Domain Events Retention)

```typescript
// services/events/src/CleanupScheduler.ts

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectBroker, ServiceBroker } from "@shopana/shared-kernel";

/**
 * Scheduled jobs for cleanup:
 * 1. DLQ cleanup (expired entries) - daily at 3 AM
 * 2. Domain events retention (old events) - daily at 4 AM
 */
@Injectable()
export class CleanupScheduler {
  private readonly logger = new Logger(CleanupScheduler.name);

  constructor(@InjectBroker("events") private readonly broker: ServiceBroker) {}

  /**
   * Cleanup expired DLQ entries (entries older than expiresAt).
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredDLQEntries(): Promise<void> {
    let totalDeleted = 0;
    let deleted: number;

    do {
      const result = await this.broker.call("events.cleanupDLQ", {
        batchSize: 1000,
      });
      deleted = result.deleted;
      totalDeleted += deleted;
    } while (deleted > 0);

    if (totalDeleted > 0) {
      this.logger.log(`DLQ cleanup: deleted ${totalDeleted} expired entries`);
    }
  }

  /**
   * Cleanup old domain events (retention policy: 90 days).
   * Runs in batches to avoid long-running transactions.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupOldDomainEvents(): Promise<void> {
    const RETENTION_DAYS = 90;
    const BATCH_SIZE = 5000;

    let totalDeleted = 0;
    let deleted: number;

    do {
      const result = await this.broker.call("events.cleanupDomainEvents", {
        retentionDays: RETENTION_DAYS,
        batchSize: BATCH_SIZE,
      });
      deleted = result.deleted;
      totalDeleted += deleted;

      // Small delay between batches to reduce DB load
      if (deleted > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } while (deleted > 0);

    if (totalDeleted > 0) {
      this.logger.log(`Domain events cleanup: deleted ${totalDeleted} events older than ${RETENTION_DAYS} days`);
    }
  }
}
```

### 5.6 Events Module

```typescript
// services/events/src/events.module.ts

import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { EventsBrokerActions } from "./EventsBrokerActions.js";
import { CleanupScheduler } from "./CleanupScheduler.js";

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    EventsBrokerActions,
    CleanupScheduler,
  ],
  exports: [EventsBrokerActions],
})
export class EventsModule {}
```

---

## Part 6: Dead Letter Queue (DLQ)

> **Note**: DLQ tables и broker actions находятся в сервисе `events`.

> **IMPORTANT**: DLQ does NOT store the full event payload (PII protection).
> It only stores a reference to `event_id` in `domain_events` table + handler info + error.

### 6.1 Drizzle Schema Model

```typescript
// services/events/src/repositories/models/deadLetterQueue.ts

import { pgTable, text, timestamp, integer, uuid, uniqueIndex, index } from "drizzle-orm/pg-core";

/**
 * Dead Letter Queue for failed event handlers.
 *
 * IMPORTANT: We do NOT store the full event here (PII protection).
 * Instead, we store a reference to domain_events.event_id.
 * To inspect the event, join with domain_events table.
 */
export const deadLetterQueue = pgTable(
  "dead_letter_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Reference to domain_events (NOT the full event!)
    eventId: text("event_id").notNull(),  // FK to domain_events.event_id
    eventType: text("event_type").notNull(),  // Denormalized for filtering

    // Handler that failed
    handlerService: text("handler_service").notNull(),
    handlerAction: text("handler_action").notNull(),

    // Error info
    error: text("error").notNull(),
    errorCode: text("error_code"),
    attempts: integer("attempts").notNull(),

    // Context (denormalized for queries without join)
    tenantId: text("tenant_id").notNull(),
    correlationId: text("correlation_id"),

    // Status
    status: text("status").notNull().default("failed"),  // 'failed' | 'retried' | 'resolved'

    failedAt: timestamp("failed_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("dlq_event_handler_unique").on(
      table.eventId,
      table.handlerService,
      table.handlerAction
    ),
    index("idx_dlq_status").on(table.status),
    index("idx_dlq_event_type").on(table.eventType, table.status),
    index("idx_dlq_tenant").on(table.tenantId, table.status),
  ]
);

export type DLQEntry = typeof deadLetterQueue.$inferSelect;
export type NewDLQEntry = typeof deadLetterQueue.$inferInsert;
```

### 6.2 Models Index

```typescript
// services/events/src/repositories/models/index.ts

export * from "./domainEvents.js";
export * from "./deadLetterQueue.js";
```

### 6.3 Generated SQL Migration

```sql
-- services/events/migrations/0000_initial.sql (continued)

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to domain_events (NOT the full event!)
  event_id TEXT NOT NULL,  -- FK to domain_events.event_id
  event_type TEXT NOT NULL,  -- Denormalized for filtering

  -- NOTE: We do NOT store the full event here (PII protection)
  -- To inspect the event, join with domain_events table

  -- Handler that failed
  handler_service TEXT NOT NULL,
  handler_action TEXT NOT NULL,

  -- Error info
  error TEXT NOT NULL,
  error_code TEXT,
  attempts INTEGER NOT NULL,

  -- Context (denormalized)
  tenant_id TEXT NOT NULL,
  correlation_id TEXT,

  -- Status: 'failed' | 'retried' | 'resolved'
  status TEXT NOT NULL DEFAULT 'failed',

  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  CONSTRAINT dlq_event_handler_unique
    UNIQUE (event_id, handler_service, handler_action),
  CONSTRAINT dlq_status_chk
    CHECK (status IN ('failed', 'retried', 'resolved'))
);

CREATE INDEX idx_dlq_status ON dead_letter_queue(status);
CREATE INDEX idx_dlq_event_type ON dead_letter_queue(event_type, status);
CREATE INDEX idx_dlq_tenant ON dead_letter_queue(tenant_id, status);
CREATE INDEX idx_dlq_expires ON dead_letter_queue(expires_at) WHERE expires_at IS NOT NULL;

-- Optional: FK to domain_events (if you want referential integrity)
-- ALTER TABLE dead_letter_queue
--   ADD CONSTRAINT dlq_event_fk FOREIGN KEY (event_id)
--   REFERENCES domain_events(event_id) ON DELETE CASCADE;
```

> **Note**: DLQ operations (add, get, cleanup) реализованы в `EventsBrokerActions` (см. Part 5.4).

---

## Part 7: Monitoring & Observability

### 7.1 Metrics

```typescript
const EVENT_METRICS = {
  // Event emission
  "events.emitted.total": "Total events emitted",
  "events.emitted.by_type": "Events emitted by type",

  // Dispatch workflow
  "events.dispatch.started": "Dispatch workflows started",
  "events.dispatch.completed": "Dispatch workflows completed",
  "events.dispatch.duration_ms": "Dispatch workflow duration",

  // Handler invocation
  "events.handler.invoked": "Handler invocations",
  "events.handler.succeeded": "Handler successes",
  "events.handler.failed": "Handler failures (sent to DLQ)",
  "events.handler.duration_ms": "Handler execution duration",
  "events.handler.retries": "Handler retry attempts",

  // DLQ
  "dlq.entries.added": "New entries added to DLQ",
  "dlq.entries.pending": "Pending entries (status=failed)",
} as const;
```

### 7.2 Structured Logging

```typescript
type EventLogEvent =
  | { event: "EVENT_EMITTED"; eventId: string; eventType: string; source: string }
  | { event: "DISPATCH_STARTED"; eventId: string; eventType: string; handlers: number }
  | { event: "HANDLER_INVOKED"; eventId: string; service: string; action: string }
  | { event: "HANDLER_RETRY"; eventId: string; service: string; action: string; attempt: number }
  | { event: "HANDLER_SUCCEEDED"; eventId: string; service: string; action: string; durationMs: number }
  | { event: "HANDLER_FAILED"; eventId: string; service: string; action: string; error: string; sentToDLQ: boolean }
  | { event: "DISPATCH_COMPLETED"; eventId: string; eventType: string; succeeded: number; failed: number };
```

---

## Part 8: Example Flow

### Product Creation Event Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCT CREATION EVENT FLOW                          │
│                         (Pure Event-Driven / Fire & Forget)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. API Request: createProduct                                              │
│     │                                                                       │
│     ▼                                                                       │
│  2. ProductService.createProduct()                                          │
│     │  - Creates product in DB                                              │
│     │  - Emits productCreated event (fire & forget)                         │
│     │  - Returns immediately to client                                      │
│     │                                                                       │
│     ▼                                                                       │
│  3. EventEmitter.emit({ eventType, payload, context, source }, emitKey)     │
│     │  - emitKey = "product:" + productId (deterministic!)                  │
│     │  - Starts EventDispatchWorkflow                                       │
│     │  - Workflow ID: {parentWorkflowId}:dispatch:v1:productCreated:{hash}  │
│     │                                                                       │
│     ▼                                                                       │
│  4. EventDispatchWorkflow                                                   │
│     │                                                                       │
│     ├──[Step 1]─► persistEventStep() ─────────► events.persistEvent         │
│     │             - Stores event in domain_events table                     │
│     │             - Returns { timestamp } (checkpointed!)                   │
│     │                                                                       │
│     ├──[Step 2]─► getAvailableHandlers(eventType) ──► CHECKPOINTED!         │
│     │             - Checks broker.hasAction() for each service              │
│     │             - Captures retryPolicy at checkpoint time                 │
│     │             - Returns: [{ serviceName, action, retryPolicy }, ...]    │
│     │             - On replay: returns SAME list (deterministic!)           │
│     │                                                                       │
│     ├──[Step 3]─► tryInvokeHandler() — ONLY REGISTERED HANDLERS             │
│     │             │                                                         │
│     │             ├─► inventory.productCreated ─────────────► OK            │
│     │             │   - INSERT ON CONFLICT DO NOTHING                       │
│     │             │                                                         │
│     │             ├─► search.productCreated ────────────────► OK            │
│     │             │   - Index product                                       │
│     │             │                                                         │
│     │             └─► pricing.productCreated ───────────────► FAILED        │
│     │                 │  - Retries exhausted                                │
│     │                 └──► events.addToDLQ ─────────────────► DLQ           │
│     │                                                                       │
│     ├──[Step 4]─► updateEventStatus() ────────► events.updateEventStatus    │
│     │             - Marks event as completed with handler results           │
│     │                                                                       │
│     └──[Complete]─► Return EventDispatchResult                              │
│                     { status: "completed", servicesNotified: 3 }            │
│                                                                             │
│  Note: Only services with registered handlers are invoked (deterministic). │
│        Failed handlers go to DLQ. Event persistence managed by `events`.   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 9: Idempotency Strategy

### Parent Workflow Idempotency Keys

Three strategies for creating idempotency keys (Stripe-inspired approach):

#### 1. Client-Provided Keys (External API)

**When to use:** Requests from external clients via API.

**Source:** HTTP header `Idempotency-Key`

**Key format:**
```
client:{sha256(tenantId:apiKeyId:operation:clientKey)}
```

**Scope:** `tenant + api_key + provided_key`

**TTL:** 24 hours

**Example:**
```typescript
// HTTP Header: Idempotency-Key: "user-order-123"

// In HTTP handler / controller:
@DBOS.workflow()
async createOrder(input: CreateOrderInput) {
  // workflowId automatically = client:{hash}
  // DBOS guarantees: repeat call with same key returns same result
  const order = await this.saveOrder(input);

  // emitKey = "order:" + orderId — deterministic!
  await EventEmitter.emit(
    {
      eventType: "orderCreated",
      payload: { orderId: order.id, storeId: input.storeId, items: input.items },
      context: { tenantId: ctx.tenantId, userId: ctx.userId },
      source: "orders",
    },
    "order:" + order.id  // emitKey
  );

  return order;
}
```

#### 2. Workflow-Derived Keys (Service-Initiated)

**When to use:** Background jobs, event handlers, cron tasks, internal workflow operations.

**Source:** Workflow context (DBOS)

**Components:**
| Field | Description | Example |
|-------|-------------|---------|
| `workflowId` | Business ID of workflow | `store:create:org-123:my-store` |
| `stepId` | Step name within workflow | `createRoles` |
| `callId` | Unique ID for fan-out | `store-456` |

**Final key format:**
```
workflow:{sha256(workflowId + stepId + callId)}
```

> **Important:** `stepId` and `callId` are NOT part of `workflowId`. They are added separately to ensure key uniqueness at the specific call level within a workflow.

**Example:**
```typescript
// Background job for store creation
@DBOS.workflow({ workflowID: `store:create:${input.orgId}:${input.storeName}` })
async createStore(input: CreateStoreInput) {
  const store = await this.saveStore(input);  // step

  // emitKey = "store:" + storeId — deterministic!
  // dispatch workflowId = store:create:org-123:my-store:dispatch:storeCreated:{hash}
  await EventEmitter.emit(
    {
      eventType: "storeCreated",
      payload: { storeId: store.id, organizationId: input.orgId, name: input.storeName },
      context: { tenantId: input.orgId },
      source: "project",
    },
    "store:" + store.id  // emitKey
  );

  return store;
}
```

**Deterministic workflowId patterns for business operations:**
```typescript
// Product creation — unique within store + SKU
workflowId = `product:create:${storeId}:${sku}`;

// Order processing — unique by orderId
workflowId = `order:process:${orderId}`;

// Event handling — unique by eventId
workflowId = `event:handle:${eventId}:${handlerName}`;
```

#### 3. Content-Derived Keys (Idempotent Updates)

**When to use:** UPDATE/SET operations where same data = same operation.

**Source:** Hash of request content

**Key format:**
```
content:{sha256(resourceId:operation:payloadHash)}
```

**Scope:** `resource + action`

**TTL:** 1 hour (short)

**Note:** Different payload automatically creates different key.

**Example:**
```typescript
// setStock({ sku: "ABC", quantity: 100 })
// Repeat call with same data = same key

@DBOS.workflow({
  workflowID: `content:${sha256(`${sku}:setStock:${canonicalJson(payload)}`)}`
})
async setStock(payload: SetStockInput) {
  // Idempotent by content
  await this.updateStock(payload);

  // emitKey includes payload hash for content-based idempotency
  const payloadHash = sha256(canonicalJson(payload)).slice(0, 8);
  await EventEmitter.emit(
    {
      eventType: "stockUpdated",
      payload,
      context: { tenantId: ctx.tenantId },
      source: "inventory",
    },
    `sku:${payload.sku}:setStock:${payloadHash}`  // emitKey
  );
}
```

#### Strategy Comparison

| Strategy | Source | Scope | TTL | Use Case |
|----------|--------|-------|-----|----------|
| **Client** | HTTP Header | tenant + api_key | 24h | External API |
| **Workflow** | Business ID | service + workflow | Operation-dependent | Background jobs, events |
| **Content** | Payload hash | resource + action | 1h | Idempotent updates |

---

### Two-Layer Approach

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      IDEMPOTENCY STRATEGY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: DBOS Workflow Idempotency (Dispatch Level)                        │
│  ───────────────────────────────────────────────────                        │
│  Key: {parentWorkflowId}:dispatch:v1:{eventType}:{emitKeyHash}              │
│  Example: wf-create-product-123:dispatch:v1:productCreated:a1b2c3d4         │
│                                                                             │
│  Components:                                                                │
│  - parentWorkflowId: From DBOS.workflowID                                   │
│  - v1: Version prefix (allows formula changes without collisions)           │
│  - eventType: "productCreated", "orderCompleted", etc.                      │
│  - emitKeyHash: sha256("emitKey:v1:" + emitKey).slice(0, 32)                │
│                                                                             │
│  Guarantees: Same parent + same eventType + same emitKey = dispatch once    │
│  Note: emitKey allows multiple events of same type from one workflow        │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  Layer 2: Domain-Level Idempotency (Handler Level)                          │
│  ─────────────────────────────────────────────────                          │
│  Method: Unique constraints, upserts, conditional updates                   │
│                                                                             │
│  Handler contract (EventHandlerResponse):                                   │
│  - { ok: true } → success (including "already done")                        │
│  - { ok: false, retryable: true } → DBOS retries according to policy        │
│  - { ok: false, retryable: false } → DLQ immediately (no retries)           │
│                                                                             │
│  Examples:                                                                  │
│  - INSERT ON CONFLICT DO NOTHING → catch duplicate, return normally         │
│  - UPDATE ... WHERE version = expected → return normally if 0 rows          │
│  - DELETE WHERE id = ? → naturally idempotent, always succeeds              │
│                                                                             │
│  Guarantees: Business invariants even with duplicate handler calls          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHY TWO LAYERS?                                                            │
│                                                                             │
│  1. DBOS Workflow: Prevents duplicate dispatches                            │
│     - Same parent + eventType + emitKey = same dispatch workflow            │
│     - Handles: Parent workflow replays, service restarts                    │
│     - emitKey enables multiple events of same type (e.g., 3 productUpdated) │
│                                                                             │
│  2. Domain: Business-level safety net                                       │
│     - Handles: DBOS step retries (transient failures)                       │
│     - Handles: Business duplicates (same product created twice)             │
│     - Handles: Edge cases, bugs, manual operations                          │
│     - Provides: Data integrity guarantees                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 10: Summary

### Architecture Overview

| Aspect | Implementation |
|--------|----------------|
| Event Definition | Typed `DomainEvent<TType, TPayload>` with `emitKey`, `subject`, `related`, `actor` |
| Event Emission | `EventEmitter.emit(input, emitKey)` — fire and forget, emitKey REQUIRED |
| emitKey | Mandatory, deterministic, derived from business context (e.g., `"product:" + productId`) |
| Durability | DBOS workflow guarantees delivery |
| Service Discovery | Services from `config.yml` via `getConfig().services` |
| Fan-out | All services invoked in parallel, non-handlers skipped |
| Handler Contract | `(params: { event }) => Promise<EventHandlerResponse>` — handler decides retryable vs non-retryable |
| Handler Registration | `@EventHandler("eventName", { retry })` → `broker.register(eventName, handler, metadata)` |
| Retry Policy | Per-handler via `@EventHandler` options, used in `DBOS.runStep()` |
| Event Store | `events` service — `domain_events` table with UI fields (NO payload stored) |
| Dead Letter Queue | `events` service — failed handlers sent to `events.addToDLQ` |
| Handler Independence | Each service processes independently, failures don't affect others |
| Event Status | Always `completed` (dispatch done, regardless of failures) |
| Idempotency | DBOS workflow (parent + eventType + emitKey) + domain-level (ON CONFLICT, upserts) |
| Consistency | Eventual — system converges over time |
| **Retention** | 90 days default, daily cleanup via `events.cleanupDomainEvents` |

### Key Design Decisions

1. **Pure event-driven** — Fire and forget, producer doesn't know/care about consumers
2. **Mandatory emitKey** — Every emit MUST provide deterministic emitKey from business context
3. **Config-based discovery** — Services from `config.yml`, no central registry
4. **Convention over configuration** — `@EventHandler("productCreated")` → `{service}.productCreated`
5. **Metadata in broker** — `ActionRegistry` stores handler + metadata (retry policy)
6. **Per-handler retry** — Each handler can define own retry policy via decorator
7. **Handler-controlled retryability** — Handler returns `{ ok: false, retryable: true/false }`, wrapper translates to DBOS behavior
8. **Dead Letter Queue** — Failed handlers sent to DLQ; non-retryable immediately, retryable after exhausting attempts
9. **Independent handlers** — Each handler succeeds or fails independently
10. **Dedicated events service** — Event store, DLQ, and cleanup scheduling in separate `events` service
11. **Separate classes** — `BrokerActions` for `@Action`, `EventHandlers` for `@EventHandler`
12. **DBOS workflow idempotency** — Same parent + eventType + emitKey = same dispatch workflow
13. **Domain-level idempotency** — Handlers use DB constraints (`ON CONFLICT DO NOTHING`)
14. **Subject/Related/Actor** — Every event has subject (primary entity), related entities, and actor info
15. **Retention policy** — Old events automatically cleaned up (default: 90 days)

### Benefits

1. **Simplicity**: Pure event-driven model, easy to understand
2. **Loose Coupling**: Producers and consumers are completely independent
3. **Resilience**: Handler failures don't cascade, system keeps working
4. **Clean Separation**: `BrokerActions` vs `EventHandlers` — different concerns
5. **Guaranteed Delivery**: DBOS workflow durability
6. **Exactly-Once Semantics**: DBOS workflow ID (with emitKey) + domain-level idempotency
7. **Multiple Events Per Type**: emitKey enables multiple events of same type from one workflow
8. **Smart DLQ Routing**: Non-retryable errors go to DLQ immediately, no wasted retry attempts
9. **Handler Autonomy**: Each handler decides if its errors are retryable or not
10. **Dead Letter Queue**: Failed handlers stored for inspection and manual retry
11. **No Central Registry**: Services discovered from existing `config.yml`
12. **No Infrastructure Overhead**: No separate message queue
13. **Dedicated Events Service**: Event store, DLQ, and scheduling isolated in `events` service with own migrations
14. **Automatic Cleanup**: Retention policy prevents unbounded storage growth

### Trade-offs

1. **Eventual consistency** — Data may be temporarily inconsistent
2. **No ordering guarantees** — Handlers may process in any order
3. **Broadcast overhead** — All services are called even if they don't handle the event
4. **No full payload** — Original payload is not stored (by design, for PII protection)

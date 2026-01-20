# Event-Driven Architecture with DBOS Durability (Standalone)

**Author**: Generated from event-driven-architecture-plan.md
**Date**: 2026-01-20
**Purpose**: Event-driven architecture WITHOUT the idempotency framework dependency

## Overview

Simplified event-driven architecture built directly on DBOS durability primitives. No external idempotency framework required.

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

## Part 1: Event Types & Registry

### 1.1 Event Definition

```typescript
// packages/events/src/types.ts

/**
 * Base interface for all domain events.
 */
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  /** Unique event ID (UUID) */
  eventId: string;

  /** Event type: "productCreated", "orderCompleted", etc. */
  eventType: TType;

  /** Event creation time (ISO 8601) */
  timestamp: string;

  /** Event source (service name) */
  source: string;

  /** Event data */
  payload: TPayload;

  /** Context: tenant, user, correlation */
  context: EventContext;
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
// CONCRETE EVENT TYPES
// ═══════════════════════════════════════════════════════════════════

// Product events
export interface ProductCreatedEvent extends DomainEvent<"productCreated", {
  productId: string;
  storeId: string;
  name: string;
  sku?: string;
}> {}

export interface ProductDeletedEvent extends DomainEvent<"productDeleted", {
  productId: string;
  storeId: string;
}> {}

export interface ProductUpdatedEvent extends DomainEvent<"productUpdated", {
  productId: string;
  storeId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
}> {}

// Order events
export interface OrderCreatedEvent extends DomainEvent<"orderCreated", {
  orderId: string;
  storeId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
}> {}

export interface OrderCompletedEvent extends DomainEvent<"orderCompleted", {
  orderId: string;
  storeId: string;
  completedAt: string;
}> {}

// Store events
export interface StoreCreatedEvent extends DomainEvent<"storeCreated", {
  storeId: string;
  organizationId: string;
  name: string;
}> {}

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
}
```

### 1.5 Event Handler Result Type

```typescript
// packages/events/src/types.ts (continued)

/**
 * Result of an event handler invocation.
 */
export interface EventHandlerResult<T = void> {
  /** Handler output (can be void) */
  result?: T;

  /** Error if handler failed */
  error?: {
    message: string;
    code?: string;
    /** If true, DBOS will retry the step */
    retryable: boolean;
  };
}
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

### 2.1 Event Factory

```typescript
// packages/events/src/factory.ts

import crypto from "node:crypto";
import type { DomainEvent, EventContext, EventType } from "./types.js";

/**
 * Create a domain event with proper structure.
 *
 * @example
 * const event = createEvent("productCreated", {
 *   productId: "prod-123",
 *   storeId: "store-456",
 *   name: "Cool Product",
 * }, {
 *   tenantId: ctx.organizationId,
 *   userId: ctx.userId,
 *   correlationId: ctx.correlationId,
 * }, "listing");
 */
export function createEvent<TType extends EventType, TPayload>(
  eventType: TType,
  payload: TPayload,
  context: Omit<EventContext, "correlationId"> & { correlationId?: string },
  source: string
): DomainEvent<TType, TPayload> {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    timestamp: new Date().toISOString(),
    source,
    payload,
    context: {
      ...context,
      correlationId: context.correlationId ?? crypto.randomUUID(),
    },
  };
}

/**
 * Create deterministic event ID for idempotent event creation.
 * Use when the same business operation should produce the same event.
 *
 * @example
 * // Same product creation attempt = same eventId
 * const eventId = deterministicEventId("productCreated", productId, storeId);
 */
export function deterministicEventId(...parts: string[]): string {
  const input = parts.join(":");
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}
```

### 2.2 Event Emitter

```typescript
// packages/events/src/emitter.ts

import { DBOS } from "@dbos-inc/dbos-sdk";
import type { DomainEvent } from "./types.js";
import { EventDispatchWorkflow, type EventDispatchResult } from "./workflows/EventDispatchWorkflow.js";

/**
 * Emit an event by starting its dispatch workflow.
 *
 * IMPORTANT: Cannot be called from inside a @DBOS.step() — workflows cannot
 * be started from steps. Call from workflow code directly or from HTTP handler.
 *
 * Two usage patterns:
 * 1. From workflow code (after a step completes) — durable, recommended
 * 2. From HTTP handler — not durable, use only for fire-and-forget
 */
export class EventEmitter {
  /**
   * Emit an event. Starts EventDispatchWorkflow.
   *
   * MUST be called from workflow code (not from step!) or HTTP handler.
   *
   * @example
   * // From workflow code (recommended):
   * @DBOS.workflow()
   * async createProduct(input: CreateProductInput) {
   *   const product = await this.saveProduct(input);  // @DBOS.step()
   *
   *   // After step completes, emit event from workflow code
   *   const event = createEvent("productCreated", { productId: product.id, ... }, ...);
   *   await EventEmitter.emit(event);  // Starts child workflow
   *
   *   return product;
   * }
   *
   * @returns Workflow handle for tracking
   */
  static async emit<TEvent extends DomainEvent>(event: TEvent): Promise<{ workflowId: string }> {
    const workflowId = EventDispatchWorkflow.workflowID(event);

    // Start as child workflow (if called from workflow) or standalone workflow
    await DBOS
      .startWorkflow(EventDispatchWorkflow, { workflowID: workflowId })
      .dispatch(event);

    return { workflowId };
  }

  /**
   * Emit event and wait for all handlers to complete.
   * Use sparingly - prefer async emission.
   *
   * MUST be called from workflow code (not from step!).
   */
  static async emitAndWait<TEvent extends DomainEvent>(
    event: TEvent
  ): Promise<EventDispatchResult> {
    const workflowId = EventDispatchWorkflow.workflowID(event);

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
  status: "success" | "skipped" | "failed";
  error?: string;
  durationMs: number;
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
 */
export class EventDispatchWorkflow {
  constructor(private readonly broker: ServiceBroker) {}

  /**
   * Deterministic workflow ID based on event.
   * Same eventId = same workflow = dispatch once.
   */
  static workflowID(event: DomainEvent): string {
    return `event:dispatch:${event.eventType}:${event.eventId}`;
  }

  @DBOS.workflow()
  async dispatch(event: DomainEvent): Promise<EventDispatchResult> {
    // Step 1: Get all service names from config
    const serviceNames = await this.getServiceNames();

    // Step 2: Try to invoke handler on each service in parallel
    const resultPromises = serviceNames.map((serviceName) =>
      this.tryInvokeHandler(event, serviceName)
    );

    const results = await Promise.all(resultPromises);

    // Filter out skipped services (those that don't handle this event)
    const notifiedResults = results.filter((r) => r.status !== "skipped");

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      status: "completed",
      servicesNotified: notifiedResults.length,
      results: notifiedResults,
    };
  }

  /**
   * Get service names from config.
   *
   * DETERMINISM: This is a @DBOS.step(), so the result is checkpointed.
   * On workflow replay, DBOS returns the checkpointed service list.
   */
  @DBOS.step()
  private async getServiceNames(): Promise<string[]> {
    const config = getConfig();
    return Object.keys(config.services);
  }

  /**
   * Try to invoke event handler on a service.
   * If service doesn't have a handler for this event, returns "skipped".
   * Uses retry policy from action metadata if available.
   */
  private async tryInvokeHandler(
    event: DomainEvent,
    serviceName: string
  ): Promise<HandlerInvocationResult> {
    const startTime = Date.now();
    const action = `${serviceName}.${event.eventType}`;

    // Check if action exists and get its metadata
    const metadata = this.broker.getActionMetadata(action);
    if (!metadata) {
      // Action not registered = service doesn't handle this event
      return {
        service: serviceName,
        status: "skipped",
        durationMs: Date.now() - startTime,
      };
    }

    const retryPolicy = metadata.retryPolicy ?? {
      maxAttempts: 3,
      intervalSeconds: 1,
      backoffRate: 2,
    };

    try {
      // Use DBOS.runStep() with retry policy from metadata
      await DBOS.runStep(
        () => this.broker.call(action, { event }),
        {
          name: `handler:${action}:${event.eventId}`,
          retriesAllowed: true,
          maxAttempts: retryPolicy.maxAttempts,
          intervalSeconds: retryPolicy.intervalSeconds,
          backoffRate: retryPolicy.backoffRate,
        }
      );

      return {
        service: serviceName,
        status: "success",
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      // Handler failed after all retries — send to DLQ
      await this.sendToDLQ(event, serviceName, String(error), retryPolicy.maxAttempts);

      return {
        service: serviceName,
        status: "failed",
        error: String(error),
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Send failed handler to Dead Letter Queue for later inspection/retry.
   */
  @DBOS.step()
  private async sendToDLQ(
    event: DomainEvent,
    serviceName: string,
    error: string,
    attempts: number
  ): Promise<void> {
    await this.broker.call("bootstrap.addToDLQ", {
      event,
      handler: {
        service: serviceName,
        action: event.eventType,
      },
      error,
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
  EventHandlerResult,
} from "@shopana/events";
import { Kernel } from "./kernel/Kernel.js";

/**
 * Event handlers for inventory service.
 * Separate from BrokerActions for clean separation of concerns.
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
   */
  @EventHandler("productCreated")
  async handleProductCreated(
    params: { event: ProductCreatedEvent }
  ): Promise<EventHandlerResult<void>> {
    try {
      const { productId, storeId, sku } = params.event.payload;

      await this.kernel.runScript(InitializeInventoryScript, {
        productId,
        storeId,
        sku: sku ?? productId,
        initialQuantity: 0,
      });

      return {};
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return {}; // Already exists - idempotent success
      }

      if (isConnectionError(error)) {
        return {
          error: { message: String(error), code: "CONNECTION_ERROR", retryable: true },
        };
      }

      return {
        error: { message: String(error), code: "INTERNAL_ERROR", retryable: false },
      };
    }
  }

  /**
   * Handle productDeleted: Remove inventory record.
   */
  @EventHandler("productDeleted")
  async handleProductDeleted(
    params: { event: ProductDeletedEvent }
  ): Promise<EventHandlerResult<void>> {
    try {
      const { productId, storeId } = params.event.payload;

      await this.kernel.runScript(DeleteInventoryScript, { productId, storeId });

      return {};
    } catch (error) {
      if (isConnectionError(error)) {
        return {
          error: { message: String(error), code: "CONNECTION_ERROR", retryable: true },
        };
      }

      return {
        error: { message: String(error), code: "INTERNAL_ERROR", retryable: false },
      };
    }
  }

  /**
   * Handle productUpdated: Sync inventory metadata.
   *
   * Custom retry: more attempts for this important sync.
   */
  @EventHandler("productUpdated", { retry: { maxAttempts: 5 } })
  async handleProductUpdated(
    params: { event: ProductUpdatedEvent }
  ): Promise<EventHandlerResult<{ synced: boolean; updatedFields: string[] }>> {
    try {
      const { productId, changes } = params.event.payload;

      const updatedFields = await this.kernel.runScript(
        SyncInventoryMetadataScript,
        { productId, changes }
      );

      return { result: { synced: true, updatedFields } };
    } catch (error) {
      if (isConnectionError(error)) {
        return {
          error: { message: String(error), code: "CONNECTION_ERROR", retryable: true },
        };
      }

      return {
        error: { message: String(error), code: "INTERNAL_ERROR", retryable: false },
      };
    }
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return String(error).includes("duplicate key") ||
         String(error).includes("unique constraint");
}

function isConnectionError(error: unknown): boolean {
  return String(error).includes("ECONNREFUSED") ||
         String(error).includes("connection timeout");
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

### 5.1 Event Store Schema

```sql
CREATE TABLE IF NOT EXISTS domain_events (
  event_id TEXT PRIMARY KEY,

  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,

  payload JSONB NOT NULL,

  tenant_id TEXT NOT NULL,
  user_id TEXT,
  correlation_id TEXT NOT NULL,
  causation_id TEXT,

  status TEXT NOT NULL DEFAULT 'pending',
  dispatch_started_at TIMESTAMPTZ,
  dispatch_completed_at TIMESTAMPTZ,

  handler_results JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT domain_events_status_chk
    CHECK (status IN ('pending', 'dispatching', 'completed'))
);

CREATE INDEX idx_events_type ON domain_events(event_type);
CREATE INDEX idx_events_tenant ON domain_events(tenant_id);
CREATE INDEX idx_events_correlation ON domain_events(correlation_id);
CREATE INDEX idx_events_status ON domain_events(status) WHERE status != 'completed';
CREATE INDEX idx_events_timestamp ON domain_events(timestamp);
```

### 5.2 Event Store Service

```typescript
// services/bootstrap/src/EventStoreBrokerActions.ts

import { Action, BrokerActions } from "@shopana/shared-kernel";
import type { DomainEvent } from "@shopana/events";

export class EventStoreBrokerActions extends BrokerActions {

  @Action("persistEvent")
  async persistEvent(params: { event: DomainEvent }): Promise<{ persisted: boolean }> {
    const { event } = params;

    await this.db.insert(domainEvents).values({
      eventId: event.eventId,
      eventType: event.eventType,
      source: event.source,
      timestamp: new Date(event.timestamp),
      payload: event.payload,
      tenantId: event.context.tenantId,
      userId: event.context.userId,
      correlationId: event.context.correlationId,
      causationId: event.context.causationId,
      status: "dispatching",
      dispatchStartedAt: new Date(),
    }).onConflictDoNothing();

    return { persisted: true };
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
   */
  @Action("addToDLQ")
  async addToDLQ(params: {
    event: DomainEvent;
    handler: { service: string; action: string };
    error: string;
    errorCode?: string;
    attempts: number;
  }): Promise<{ added: boolean }> {
    await this.db.insert(deadLetterQueue).values({
      eventId: params.event.eventId,
      eventType: params.event.eventType,
      event: params.event as unknown as Record<string, unknown>,
      handlerService: params.handler.service,
      handlerAction: params.handler.action,
      error: params.error,
      errorCode: params.errorCode,
      attempts: params.attempts,
      tenantId: params.event.context.tenantId,
      correlationId: params.event.context.correlationId,
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
}
```

---

## Part 6: Dead Letter Queue (DLQ)

### 6.1 DLQ Schema

```sql
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event JSONB NOT NULL,

  handler_service TEXT NOT NULL,
  handler_action TEXT NOT NULL,

  error TEXT NOT NULL,
  error_code TEXT,
  attempts INTEGER NOT NULL,

  tenant_id TEXT,
  correlation_id TEXT,

  status TEXT NOT NULL DEFAULT 'failed',

  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  CONSTRAINT dlq_event_handler_unique
    UNIQUE (event_id, handler_service, handler_action)
);

CREATE INDEX idx_dlq_status ON dead_letter_queue(status);
CREATE INDEX idx_dlq_event_type ON dead_letter_queue(event_type, status);
CREATE INDEX idx_dlq_tenant ON dead_letter_queue(tenant_id, status);
CREATE INDEX idx_dlq_expires ON dead_letter_queue(expires_at) WHERE expires_at IS NOT NULL;
```

### 6.2 DLQ Repository

```typescript
// packages/events/src/dlq/repository.ts

export interface FailedHandlerInfo {
  event: DomainEvent;
  handler: { service: string; action: string };
  error: string;
  errorCode?: string;
  attempts: number;
}

export class DeadLetterRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  async add(info: FailedHandlerInfo): Promise<DeadLetterEntry> {
    const [result] = await this.db.insert(deadLetterQueue).values({
      eventId: info.event.eventId,
      eventType: info.event.eventType,
      event: info.event as unknown as Record<string, unknown>,
      handlerService: info.handler.service,
      handlerAction: info.handler.action,
      error: info.error,
      errorCode: info.errorCode,
      attempts: info.attempts,
      tenantId: info.event.context.tenantId,
      correlationId: info.event.context.correlationId,
      status: "failed",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }).onConflictDoUpdate({
      target: [deadLetterQueue.eventId, deadLetterQueue.handlerService, deadLetterQueue.handlerAction],
      set: {
        error: info.error,
        errorCode: info.errorCode,
        attempts: info.attempts,
        failedAt: new Date(),
        status: "failed",
      },
    }).returning();

    return result;
  }

  /**
   * Get failed entries for inspection/debugging.
   */
  async getFailedEntries(limit: number = 100): Promise<DeadLetterEntry[]> {
    return this.db
      .select()
      .from(deadLetterQueue)
      .where(eq(deadLetterQueue.status, "failed"))
      .orderBy(deadLetterQueue.failedAt)
      .limit(limit);
  }

  /**
   * Cleanup expired entries.
   */
  async cleanup(batchSize: number = 1000): Promise<number> {
    const result = await this.db.execute(sql`
      DELETE FROM dead_letter_queue
      WHERE id IN (
        SELECT id FROM dead_letter_queue
        WHERE expires_at IS NOT NULL AND expires_at < NOW()
        LIMIT ${batchSize}
      )
    `);

    return result.rowCount ?? 0;
  }
}
```

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
│     │  - Emits productCreated event (fire & forget)                          │
│     │  - Returns immediately to client                                      │
│     │                                                                       │
│     ▼                                                                       │
│  3. EventEmitter.emit(ProductCreatedEvent)                                  │
│     │  - Starts EventDispatchWorkflow                                       │
│     │  - Workflow ID: event:dispatch:productCreated:{eventId}                │
│     │                                                                       │
│     ▼                                                                       │
│  4. EventDispatchWorkflow                                                   │
│     │                                                                       │
│     ├──[Step 1]─► getServiceNames()                                         │
│     │             - Gets all services from config.yml                       │
│     │             - Returns: [apps, checkout, inventory, orders, ...]       │
│     │                                                                       │
│     ├──[Step 2]─► tryInvokeHandler() — ALL SERVICES IN PARALLEL             │
│     │             │                                                         │
│     │             ├─► apps.productCreated ──────────────────► SKIPPED       │
│     │             │   - Action not registered                               │
│     │             │                                                         │
│     │             ├─► inventory.productCreated ─────────────► OK            │
│     │             │   - INSERT ON CONFLICT DO NOTHING                       │
│     │             │                                                         │
│     │             ├─► search.productCreated ────────────────► OK            │
│     │             │   - Index product                                       │
│     │             │                                                         │
│     │             └─► pricing.productCreated ───────────────► FAILED → DLQ  │
│     │                 - Retries exhausted → sendToDLQ()                     │
│     │                                                                       │
│     └──[Complete]─► Return EventDispatchResult                              │
│                     { status: "completed", servicesNotified: 3 }            │
│                                                                             │
│  Note: Services without handler are skipped. Failed handlers go to DLQ.    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 9: Idempotency Strategy

### Two-Layer Approach

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      IDEMPOTENCY STRATEGY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: DBOS Workflow Idempotency (Dispatch Level)                        │
│  ───────────────────────────────────────────────────                        │
│  Key: event:dispatch:{eventType}:{eventId}                                  │
│  Example: event:dispatch:productCreated:evt-123-456                         │
│                                                                             │
│  Guarantees: Same event = same workflow = dispatch once                     │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  Layer 2: Domain-Level Idempotency (Handler Level)                          │
│  ─────────────────────────────────────────────────                          │
│  Method: Unique constraints, upserts, conditional updates                   │
│                                                                             │
│  Examples:                                                                  │
│  - INSERT INTO inventory (product_id, ...) ON CONFLICT DO NOTHING           │
│  - UPDATE inventory SET qty = qty + 1 WHERE version = expected_version      │
│  - DELETE FROM inventory WHERE product_id = ? (naturally idempotent)        │
│                                                                             │
│  Guarantees: Business invariants even with duplicate handler calls          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHY TWO LAYERS?                                                            │
│                                                                             │
│  1. DBOS Workflow: Prevents duplicate dispatches                            │
│     - Same eventId never starts two dispatch workflows                      │
│     - Handles: API retries, workflow restarts                               │
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
| Event Definition | Typed `DomainEvent<TType, TPayload>` with context |
| Event Emission | `EventEmitter.emit()` — fire and forget |
| Durability | DBOS workflow guarantees delivery |
| Service Discovery | Services from `config.yml` via `getConfig().services` |
| Fan-out | All services invoked in parallel, non-handlers skipped |
| Handler Contract | `(params: { event }) => Promise<void>` |
| Handler Registration | `@EventHandler("eventName", { retry })` → `broker.register(eventName, handler, metadata)` |
| Retry Policy | Per-handler via `@EventHandler` options, used in `DBOS.runStep()` |
| Dead Letter Queue | Failed handlers (after retries) sent to `bootstrap.addToDLQ` |
| Handler Independence | Each service processes independently, failures don't affect others |
| Event Status | Always `completed` (dispatch done, regardless of failures) |
| Idempotency | DBOS workflow + domain-level (ON CONFLICT, upserts) |
| Consistency | Eventual — system converges over time |

### Key Design Decisions

1. **Pure event-driven** — Fire and forget, producer doesn't know/care about consumers
2. **Config-based discovery** — Services from `config.yml`, no central registry
3. **Convention over configuration** — `@EventHandler("productCreated")` → `{service}.productCreated`
4. **Metadata in broker** — `ActionRegistry` stores handler + metadata (retry policy)
5. **Per-handler retry** — Each handler can define own retry policy via decorator
6. **Dead Letter Queue** — Failed handlers (after retries) stored in bootstrap for inspection
7. **Independent handlers** — Each handler succeeds or fails independently
8. **Separate classes** — `BrokerActions` for `@Action`, `EventHandlers` for `@EventHandler`
9. **DBOS workflow idempotency** — Same eventId = same workflow = dispatch once
10. **Domain-level idempotency** — Handlers use DB constraints (`ON CONFLICT DO NOTHING`)

### Benefits

1. **Simplicity**: Pure event-driven model, easy to understand
2. **Loose Coupling**: Producers and consumers are completely independent
3. **Resilience**: Handler failures don't cascade, system keeps working
4. **Clean Separation**: `BrokerActions` vs `EventHandlers` — different concerns
5. **Guaranteed Delivery**: DBOS workflow durability
6. **Exactly-Once Semantics**: DBOS workflow ID + domain-level idempotency
7. **Dead Letter Queue**: Failed handlers stored for inspection and manual retry
8. **No Central Registry**: Services discovered from existing `config.yml`
9. **No Infrastructure Overhead**: No separate message queue

### Trade-offs

1. **Eventual consistency** — Data may be temporarily inconsistent
2. **No ordering guarantees** — Handlers may process in any order
3. **Broadcast overhead** — All services are called even if they don't handle the event

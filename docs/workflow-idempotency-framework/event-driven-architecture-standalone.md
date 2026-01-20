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

  /** Event type: "product.created", "order.completed", etc. */
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
export interface ProductCreatedEvent extends DomainEvent<"product.created", {
  productId: string;
  storeId: string;
  name: string;
  sku?: string;
}> {}

export interface ProductDeletedEvent extends DomainEvent<"product.deleted", {
  productId: string;
  storeId: string;
}> {}

export interface ProductUpdatedEvent extends DomainEvent<"product.updated", {
  productId: string;
  storeId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
}> {}

// Order events
export interface OrderCreatedEvent extends DomainEvent<"order.created", {
  orderId: string;
  storeId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
}> {}

export interface OrderCompletedEvent extends DomainEvent<"order.completed", {
  orderId: string;
  storeId: string;
  completedAt: string;
}> {}

// Store events
export interface StoreCreatedEvent extends DomainEvent<"store.created", {
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
 * Used with BrokerActions base class for automatic registration.
 *
 * The method will be registered both as:
 * 1. A broker action (so EventDispatchWorkflow can call it)
 * 2. An event handler in the global registry (so it's discoverable)
 *
 * @param eventType - Event type to handle (e.g., "product.created")
 * @param options - Handler options (retry policy)
 *
 * @example
 * class InventoryEventHandlers extends EventHandlers {
 *   @EventHandler("product.created")
 *   async handleProductCreated(params: { event: ProductCreatedEvent }) {
 *     // ...
 *   }
 *
 *   @EventHandler("order.completed", { retry: { maxAttempts: 5, backoffRate: 2 } })
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

### 1.3 Event Handler Result Type

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
 *   @EventHandler("product.created", { critical: true })
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

  onModuleInit(): void {
    this.registerEventHandlers();
  }

  /**
   * Scans for @EventHandler decorated methods and registers them.
   *
   * Each handler is registered as:
   * 1. A broker action (so EventDispatchWorkflow can call it via broker.call)
   * 2. An event handler in bootstrap registry (for discovery)
   */
  private registerEventHandlers(): void {
    const prototype = Object.getPrototypeOf(this);
    const methodNames = this.getMethodNames(prototype);
    const handlers: Array<{ methodName: string; metadata: EventHandlerMetadata }> = [];

    for (const methodName of methodNames) {
      const metadata = Reflect.getMetadata(
        EVENT_HANDLER_METADATA_KEY,
        prototype,
        methodName
      ) as EventHandlerMetadata | undefined;

      if (metadata) {
        handlers.push({ methodName, metadata });

        // Register as broker action (transport for EventDispatchWorkflow)
        const method = (this as Record<string, unknown>)[methodName] as (
          params: unknown
        ) => Promise<unknown>;

        this.broker.register(methodName, method.bind(this));
      }
    }

    // Register with bootstrap service for discovery
    if (handlers.length > 0) {
      this.registerWithBootstrap(handlers);
    }
  }

  /**
   * Registers event handlers with the bootstrap service's global registry.
   */
  private async registerWithBootstrap(
    handlers: Array<{ methodName: string; metadata: EventHandlerMetadata }>
  ): Promise<void> {
    const serviceName = this.broker.getServiceName();

    for (const { methodName, metadata } of handlers) {
      try {
        await this.broker.call("bootstrap.registerEventHandler", {
          service: serviceName,
          action: methodName,
          eventType: metadata.eventType,
          retryPolicy: metadata.retryPolicy,
        });

        this.logger.debug(
          `Registered event handler: ${metadata.eventType} -> ${serviceName}.${methodName}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to register event handler ${methodName}: ${error}`
        );
      }
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
 * const event = createEvent("product.created", {
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
 * const eventId = deterministicEventId("product.created", productId, storeId);
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
   *   const event = createEvent("product.created", { productId: product.id, ... }, ...);
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
import type { EventHandlerResult } from "../handler-types.js";

/**
 * Result of event dispatch workflow.
 */
export interface EventDispatchResult {
  eventId: string;
  eventType: string;

  /**
   * Final status:
   * - "completed": all handlers finished (success or failure)
   *
   * Note: In pure event-driven, "completed" means dispatch is done.
   * Individual handler failures don't affect the event status.
   * Failed handlers go to DLQ for independent retry.
   */
  status: "completed";

  handlersInvoked: number;
  handlersSucceeded: number;
  handlersFailed: number;
  results: HandlerInvocationResult[];
}

export interface HandlerInvocationResult {
  service: string;
  action: string;
  status: "success" | "failed";
  error?: string;
  durationMs: number;
}

/**
 * Main event dispatch workflow.
 *
 * Pure event-driven: fire and forget, each handler independent.
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
    // Step 1: Persist event
    await this.persistEvent(event);

    // Step 2: Discover handlers
    const handlers = await this.discoverHandlers(event.eventType);

    if (handlers.length === 0) {
      return {
        eventId: event.eventId,
        eventType: event.eventType,
        status: "completed",
        handlersInvoked: 0,
        handlersSucceeded: 0,
        handlersFailed: 0,
        results: [],
      };
    }

    // Step 3: Invoke ALL handlers in parallel (fire and forget)
    // Each handler is independent — failures don't affect others
    const resultPromises = handlers.map((handler) =>
      this.invokeHandlerSafe(event, handler)
    );

    const results = await Promise.all(resultPromises);

    // Step 4: Update event status (always "completed" — dispatch is done)
    const succeeded = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;

    await this.updateEventStatus(event.eventId, results);

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      status: "completed",
      handlersInvoked: results.length,
      handlersSucceeded: succeeded,
      handlersFailed: failed,
      results,
    };
  }

  /**
   * Safe wrapper that never throws (for Promise.all).
   * Each handler invocation is independent.
   */
  private async invokeHandlerSafe(
    event: DomainEvent,
    handler: HandlerInfo
  ): Promise<HandlerInvocationResult> {
    try {
      return await this.invokeHandler(event, handler);
    } catch (error) {
      return {
        service: handler.service,
        action: handler.action,
        status: "failed",
        error: String(error),
        durationMs: 0,
      };
    }
  }

  @DBOS.step()
  private async persistEvent(event: DomainEvent): Promise<void> {
    await this.broker.call("events.persistEvent", { event });
  }

  /**
   * Discover handlers for event type.
   *
   * DETERMINISM: This is a @DBOS.step(), so the result is checkpointed.
   * On workflow replay, DBOS returns the checkpointed handler list,
   * ensuring the same handlers are invoked even if registry changed.
   */
  @DBOS.step()
  private async discoverHandlers(eventType: string): Promise<HandlerInfo[]> {
    const response = await this.broker.call("bootstrap.getEventHandlers", {
      eventType,
    });

    return response.handlers ?? [];
  }

  /**
   * Invoke handler using DBOS.runStep() with dynamic retry config.
   *
   * Key patterns:
   * 1. One broker.call = one DBOS step (durable)
   * 2. DBOS.runStep() allows runtime retry configuration
   * 3. Retryable errors → throw → DBOS retries
   * 4. Non-retryable errors → return error → no retry, workflow handles DLQ
   * 5. retriesAllowed: true is REQUIRED for retries to work
   *
   * Error flow:
   * - Retryable error thrown → DBOS retries up to maxAttempts
   * - All retries exhausted → DBOS.runStep() throws → catch → DLQ
   * - Non-retryable error returned → stepResult.error → DLQ
   *
   * DETERMINISM:
   * - Step name is stable: `handler:{service}.{action}:{eventId}`
   * - Handler list comes from discoverHandlers() step (checkpointed)
   * - Retry policy is part of handler registration (stable per deployment)
   * - If retry policy changes between deployments, already-running workflows
   *   will continue with original policy (step results are checkpointed)
   */
  private async invokeHandler(
    event: DomainEvent,
    handler: HandlerInfo
  ): Promise<HandlerInvocationResult> {
    const startTime = Date.now();
    const { retryPolicy } = handler;

    let stepResult: EventHandlerResult<unknown>;

    try {
      // Use DBOS.runStep() for dynamic retry config
      stepResult = await DBOS.runStep(
        () => this.doCallHandler(event, handler),
        {
          name: `handler:${handler.service}.${handler.action}:${event.eventId}`,
          retriesAllowed: true,  // REQUIRED for retries to work!
          maxAttempts: retryPolicy.maxAttempts,
          intervalSeconds: retryPolicy.intervalSeconds,
          backoffRate: retryPolicy.backoffRate,
        }
      );
    } catch (error) {
      // DBOS exhausted all retries (retryable error thrown maxAttempts times)
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.sendToDLQ(
        event,
        handler,
        { message: errorMessage },
        retryPolicy.maxAttempts
      );

      return {
        service: handler.service,
        action: handler.action,
        status: "failed",
        error: errorMessage,
        durationMs: Date.now() - startTime,
      };
    }

    const durationMs = Date.now() - startTime;

    // Step returned (didn't throw) — check if it's an error result
    if (stepResult.error) {
      // Non-retryable error was returned (not thrown) — send to DLQ
      await this.sendToDLQ(
        event,
        handler,
        { message: stepResult.error.message, code: stepResult.error.code },
        1  // Only 1 attempt since it was non-retryable
      );

      return {
        service: handler.service,
        action: handler.action,
        status: "failed",
        error: stepResult.error.message,
        durationMs,
      };
    }

    return {
      service: handler.service,
      action: handler.action,
      status: "success",
      durationMs,
    };
  }

  /**
   * Actual handler invocation logic.
   *
   * IMPORTANT error handling pattern:
   * - Retryable error → THROW → DBOS retries the step
   * - Non-retryable error → RETURN { error } → No retry, workflow handles DLQ
   * - Success → RETURN { result }
   *
   * This is NOT a @DBOS.step() — it's wrapped by DBOS.runStep() in invokeHandler.
   */
  private async doCallHandler(
    event: DomainEvent,
    handler: HandlerInfo
  ): Promise<EventHandlerResult<unknown>> {
    const response: EventHandlerResult<unknown> = await this.broker.call(
      `${handler.service}.${handler.action}`,
      { event }
    );

    if (response.error) {
      if (response.error.retryable) {
        // Retryable → throw so DBOS retries this step
        throw new Error(response.error.message);
      }
      // Non-retryable → return error, don't throw
      // Workflow will handle DLQ, DBOS won't retry
      return response;
    }

    return response;
  }

  /**
   * Send permanently failed handler to Dead Letter Queue.
   */
  @DBOS.step()
  private async sendToDLQ(
    event: DomainEvent,
    handler: HandlerInfo,
    error: { message: string; code?: string },
    attempts: number
  ): Promise<void> {
    await this.broker.call("events.addToDLQ", {
      event,
      handler: {
        service: handler.service,
        action: handler.action,
      },
      error: error.message,
      errorCode: error.code,
      attempts,
    });

    this.logger.warn("Handler failed permanently, sent to DLQ", {
      eventId: event.eventId,
      eventType: event.eventType,
      handler: `${handler.service}.${handler.action}`,
      error: error.message,
    });
  }

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
}

interface HandlerInfo {
  service: string;
  action: string;
  retryPolicy: RetryPolicy;
}

interface RetryPolicy {
  maxAttempts: number;
  intervalSeconds: number;
  backoffRate: number;
}
```

### 3.2 Retry Policies

```typescript
// packages/events/src/retry.ts

export interface RetryPolicy {
  maxAttempts: number;
  intervalSeconds: number;
  backoffRate: number;
}

/**
 * Default retry policy for event handlers.
 * Can be overridden per-handler via @EventHandler decorator.
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  intervalSeconds: 1,
  backoffRate: 2,
};

/**
 * Preset policies for common scenarios.
 */
export const RetryPolicies = {
  /** Default: 3 attempts, 1s base delay, 2x backoff */
  DEFAULT: DEFAULT_RETRY_POLICY,

  /** Aggressive: 5 attempts, 0.5s base delay, 2x backoff */
  AGGRESSIVE: {
    maxAttempts: 5,
    intervalSeconds: 0.5,
    backoffRate: 2,
  },

  /** Lenient: 2 attempts, 2s base delay, 1.5x backoff */
  LENIENT: {
    maxAttempts: 2,
    intervalSeconds: 2,
    backoffRate: 1.5,
  },

  /** Single attempt, no retry */
  NO_RETRY: {
    maxAttempts: 1,
    intervalSeconds: 0,
    backoffRate: 1,
  },
} satisfies Record<string, RetryPolicy>;
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
   * Handle product.created: Initialize inventory record.
   *
   * Domain idempotency: INSERT ON CONFLICT DO NOTHING
   */
  @EventHandler("product.created")
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
   * Handle product.deleted: Remove inventory record.
   */
  @EventHandler("product.deleted")
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
   * Handle product.updated: Sync inventory metadata.
   *
   * Custom retry: more attempts for this important sync.
   */
  @EventHandler("product.updated", { retry: { maxAttempts: 5 } })
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

## Part 5: Event Handler Registration (Bootstrap)

### 5.1 Global Registry

```typescript
// services/bootstrap/src/EventHandlerRegistry.ts

import type { EventType, RetryPolicy } from "@shopana/events";

interface RegisteredHandler {
  service: string;
  action: string;
  eventType: EventType;
  retryPolicy: RetryPolicy;
  registeredAt: string;
}

/**
 * Central registry of all event handlers across services.
 *
 * Services register their handlers on startup.
 * EventDispatchWorkflow queries this to know who to call.
 */
export class GlobalEventHandlerRegistry {
  private handlers = new Map<EventType, RegisteredHandler[]>();

  register(handler: Omit<RegisteredHandler, "registeredAt">): void {
    const existing = this.handlers.get(handler.eventType as EventType) ?? [];

    const isDuplicate = existing.some(
      (h) => h.service === handler.service && h.action === handler.action
    );

    if (!isDuplicate) {
      existing.push({
        ...handler,
        registeredAt: new Date().toISOString(),
      });
      this.handlers.set(handler.eventType as EventType, existing);
    }
  }

  getHandlers(eventType: EventType): RegisteredHandler[] {
    return this.handlers.get(eventType) ?? [];
  }

  getAllEventTypes(): EventType[] {
    return Array.from(this.handlers.keys());
  }

  export(): Record<EventType, RegisteredHandler[]> {
    return Object.fromEntries(this.handlers);
  }
}

export const globalEventRegistry = new GlobalEventHandlerRegistry();
```

### 5.2 Bootstrap Service Actions

```typescript
// services/bootstrap/src/BootstrapBrokerActions.ts

import { Action, BrokerActions } from "@shopana/shared-kernel";
import type { RetryPolicy } from "@shopana/events";
import { globalEventRegistry } from "./EventHandlerRegistry.js";

export class BootstrapBrokerActions extends BrokerActions {

  @Action("registerEventHandler")
  async registerEventHandler(params: {
    service: string;
    action: string;
    eventType: string;
    retryPolicy: RetryPolicy;
  }): Promise<{ registered: boolean }> {
    globalEventRegistry.register(params);
    return { registered: true };
  }

  @Action("getEventHandlers")
  async getEventHandlers(params: {
    eventType: string;
  }): Promise<{
    handlers: Array<{ service: string; action: string; retryPolicy: RetryPolicy }>;
  }> {
    const handlers = globalEventRegistry.getHandlers(params.eventType as any);
    return {
      handlers: handlers.map((h) => ({
        service: h.service,
        action: h.action,
        retryPolicy: h.retryPolicy,
      })),
    };
  }

  @Action("getEventRegistry")
  async getEventRegistry(): Promise<{ registry: Record<string, any[]> }> {
    return { registry: globalEventRegistry.export() };
  }
}
```

---

## Part 6: Event Persistence & Audit

### 6.1 Event Store Schema

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

### 6.2 Event Store Service

```typescript
// services/events/src/EventStoreBrokerActions.ts

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

## Part 7: Dead Letter Queue (DLQ)

### 7.1 DLQ Schema

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

  status TEXT NOT NULL DEFAULT 'failed'
    CHECK (status IN ('failed', 'retried', 'discarded')),

  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retried_at TIMESTAMPTZ,
  discarded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  CONSTRAINT dlq_event_handler_unique
    UNIQUE (event_id, handler_service, handler_action)
);

CREATE INDEX idx_dlq_status ON dead_letter_queue(status);
CREATE INDEX idx_dlq_event_type ON dead_letter_queue(event_type, status);
CREATE INDEX idx_dlq_tenant ON dead_letter_queue(tenant_id, status);
CREATE INDEX idx_dlq_expires ON dead_letter_queue(expires_at) WHERE expires_at IS NOT NULL;
```

### 7.2 DLQ Repository

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

  async getFailedEntries(limit: number = 100): Promise<DeadLetterEntry[]> {
    return this.db
      .select()
      .from(deadLetterQueue)
      .where(eq(deadLetterQueue.status, "failed"))
      .orderBy(deadLetterQueue.failedAt)
      .limit(limit);
  }

  async markRetried(id: string): Promise<boolean> {
    const result = await this.db
      .update(deadLetterQueue)
      .set({ status: "retried", retriedAt: new Date() })
      .where(and(
        eq(deadLetterQueue.id, id),
        eq(deadLetterQueue.status, "failed")
      ));

    return (result.rowCount ?? 0) > 0;
  }

  async discard(id: string, reason?: string): Promise<boolean> {
    const result = await this.db
      .update(deadLetterQueue)
      .set({
        status: "discarded",
        discardedAt: new Date(),
        error: reason ? `DISCARDED: ${reason}` : undefined,
      })
      .where(and(
        eq(deadLetterQueue.id, id),
        eq(deadLetterQueue.status, "failed")
      ));

    return (result.rowCount ?? 0) > 0;
  }

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

### 7.3 DLQ Retry Workflow

```typescript
// packages/events/src/dlq/retry.ts

import { DBOS } from "@dbos-inc/dbos-sdk";

export interface DLQRetryResult {
  processed: number;
  succeeded: number;
  failed: number;
}

export class DLQRetryWorkflow {
  constructor(
    private readonly broker: ServiceBroker,
    private readonly dlqRepo: DeadLetterRepository
  ) {}

  @DBOS.workflow()
  async retryEntry(entryId: string): Promise<{ success: boolean; error?: string }> {
    const entries = await this.dlqRepo.getFailedEntries(1);
    const entry = entries.find((e) => e.id === entryId);

    if (!entry) {
      return { success: false, error: "Entry not found or already processed" };
    }

    const result = await this.invokeHandler(entry);

    if (result.success) {
      await this.dlqRepo.markRetried(entryId);
    }

    return result;
  }

  @DBOS.workflow()
  async retryBatch(limit: number = 50): Promise<DLQRetryResult> {
    const entries = await this.dlqRepo.getFailedEntries(limit);
    let succeeded = 0;
    let failed = 0;

    for (const entry of entries) {
      const result = await this.invokeHandler(entry);

      if (result.success) {
        await this.dlqRepo.markRetried(entry.id);
        succeeded++;
      } else {
        failed++;
      }
    }

    return { processed: entries.length, succeeded, failed };
  }

  @DBOS.step({ maxAttempts: 1 })
  private async invokeHandler(entry: DeadLetterEntry): Promise<{ success: boolean; error?: string }> {
    const event = entry.event as unknown as DomainEvent;

    const response = await this.broker.call(
      `${entry.handlerService}.${entry.handlerAction}`,
      { event }
    );

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return { success: true };
  }
}
```

---

## Part 8: Monitoring & Observability

### 8.1 Metrics

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
  "dlq.entries.retried": "Entries successfully retried",
  "dlq.entries.pending": "Pending entries (status=failed)",
} as const;
```

### 8.2 Structured Logging

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

## Part 9: Example Flow

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
│     │  - Emits product.created event (fire & forget)                        │
│     │  - Returns immediately to client                                      │
│     │                                                                       │
│     ▼                                                                       │
│  3. EventEmitter.emit(ProductCreatedEvent)                                  │
│     │  - Starts EventDispatchWorkflow                                       │
│     │  - Workflow ID: event:dispatch:product.created:{eventId}              │
│     │                                                                       │
│     ▼                                                                       │
│  4. EventDispatchWorkflow                                                   │
│     │                                                                       │
│     ├──[Step 1]─► persistEvent()                                            │
│     │             - Saves to domain_events table                            │
│     │                                                                       │
│     ├──[Step 2]─► discoverHandlers("product.created")                       │
│     │             - Returns: [inventory, search, pricing]                   │
│     │                                                                       │
│     ├──[Step 3]─► invokeHandlers() — ALL IN PARALLEL                        │
│     │             │                                                         │
│     │             ├─► inventory.handleProductCreated(event) ──► OK          │
│     │             │   - INSERT ON CONFLICT DO NOTHING                       │
│     │             │                                                         │
│     │             ├─► search.handleProductCreated(event) ────► OK           │
│     │             │   - Index product                                       │
│     │             │                                                         │
│     │             └─► pricing.handleProductCreated(event) ───► FAIL → DLQ   │
│     │                 - (e.g. timeout) → retry → DLQ                        │
│     │                                                                       │
│     └──[Complete]─► Return EventDispatchResult                              │
│                     { status: "completed", succeeded: 2, failed: 1 }        │
│                                                                             │
│  Note: Event is "completed" even with failures.                             │
│  pricing handler will be retried from DLQ later.                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 10: Idempotency Strategy

### Two-Layer Approach

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      IDEMPOTENCY STRATEGY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: DBOS Workflow Idempotency (Dispatch Level)                        │
│  ───────────────────────────────────────────────────                        │
│  Key: event:dispatch:{eventType}:{eventId}                                  │
│  Example: event:dispatch:product.created:evt-123-456                        │
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
│     - Handles: DLQ retries (same handler called again)                      │
│     - Handles: Business duplicates (same product created twice)             │
│     - Handles: Edge cases, bugs, manual operations                          │
│     - Provides: Data integrity guarantees                                   │
│                                                                             │
│  In pure event-driven, DLQ retries are expected — domain idempotency        │
│  ensures handlers can be safely re-invoked.                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 11: Summary

### Architecture Overview

| Aspect | Implementation |
|--------|----------------|
| Event Definition | Typed `DomainEvent<TType, TPayload>` with context |
| Event Emission | `EventEmitter.emit()` — fire and forget |
| Durability | DBOS workflow guarantees delivery |
| Fan-out | All handlers invoked in parallel |
| Handler Contract | `(params: { event }) => Promise<EventHandlerResult>` |
| Handler Registration | Automatic via `@EventHandler` decorator |
| Handler Independence | Each handler processes independently, failures don't affect others |
| Event Status | Always `completed` (dispatch done, regardless of handler failures) |
| Retry | Per-handler retry policy (configurable via decorator) |
| Dead Letter Queue | Failed handlers stored for independent retry |
| Audit | `domain_events` + `dead_letter_queue` tables |
| Idempotency | DBOS workflow + domain-level (ON CONFLICT, upserts) |
| Consistency | Eventual — system converges over time |

### Key Design Decisions

1. **Pure event-driven** — Fire and forget, producer doesn't know/care about consumers
2. **Independent handlers** — Each handler succeeds or fails independently
3. **Eventual consistency** — Accepted as normal, DLQ handles failures
4. **Per-handler retry** — Each handler has its own retry policy
5. **No coordination** — No critical/non-critical, no stop-on-failure
6. **Separate classes** — `BrokerActions` for `@Action`, `EventHandlers` for `@EventHandler`
7. **DBOS workflow idempotency** — Same eventId = same workflow = dispatch once
8. **Domain-level idempotency** — Handlers use DB constraints (`ON CONFLICT DO NOTHING`)
9. **Dead Letter Queue** — Failed handlers go to DLQ for retry after fix

### Benefits

1. **Simplicity**: Pure event-driven model, easy to understand
2. **Loose Coupling**: Producers and consumers are completely independent
3. **Resilience**: Handler failures don't cascade, system keeps working
4. **Clean Separation**: `BrokerActions` vs `EventHandlers` — different concerns
5. **Guaranteed Delivery**: DBOS workflow durability
6. **Exactly-Once Semantics**: DBOS workflow ID + domain-level idempotency
7. **No External Framework**: Just DBOS + standard DB patterns
8. **Full Audit Trail**: `domain_events` + `dead_letter_queue` tables
9. **No Infrastructure Overhead**: No separate message queue

### Trade-offs

1. **Eventual consistency** — Data may be temporarily inconsistent
2. **No ordering guarantees** — Handlers may process in any order
3. **No transactions across handlers** — Each handler is independent
4. **DLQ management** — Need process for handling failed handlers

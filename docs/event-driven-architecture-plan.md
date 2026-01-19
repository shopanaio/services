# Event-Driven Architecture with DBOS Durability

**Author**: Generated from workflow-idempotency-plan.md
**Date**: 2026-01-19

## Overview

Классическая event-driven архитектура где:
- **События** (product.created, order.completed) — первоклассные сущности
- **Сервисы** регистрируют handlers на события которые их интересуют
- **DBOS workflows** обеспечивают durability (событие не потеряется при падении)
- **Idempotency framework** обеспечивает exactly-once semantics per service

### Ключевые принципы

1. **No Outbox** — workflow сам гарантирует доставку, не нужен отдельный outbox pattern
2. **Fan-out через workflow** — одно событие → один workflow → вызовы всех подписчиков
3. **Per-service idempotency** — каждый сервис обрабатывает событие ровно один раз
4. **Event source in idempotency key** — `{eventType}:{eventId}:{service}` обеспечивает изоляцию

---

## Part 1: Event Types & Registry

### 1.1 Event Definition

```typescript
// packages/events/src/types.ts

/**
 * Базовый интерфейс для всех доменных событий.
 */
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  /** Уникальный ID события (UUID или детерминистичный) */
  eventId: string;

  /** Тип события: "product.created", "order.completed", etc. */
  eventType: TType;

  /** Время создания события (ISO 8601) */
  timestamp: string;

  /** Источник события (service name) */
  source: string;

  /** Данные события */
  payload: TPayload;

  /** Контекст: tenant, user, correlation */
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

### 1.2 Event Registry (Service-Side)

```typescript
// packages/events/src/registry.ts

import type { DomainEvent, EventType } from "./types.js";

/**
 * Handler configuration for an event type.
 */
export interface EventHandlerConfig<TEvent extends DomainEvent = DomainEvent> {
  /** Event type to handle */
  eventType: TEvent["eventType"];

  /** Handler function */
  handler: (event: TEvent) => Promise<EventHandlerResult>;

  /** Operation preset for idempotency (from workflow-idempotency-plan) */
  operation: OperationConfig;

  /** Optional: custom idempotency key builder */
  buildIdempotencyKey?: (event: TEvent) => string;

  /** Whether this handler is critical (blocks event completion) */
  critical?: boolean;

  /** Retry policy override */
  retryPolicy?: RetryPolicy;
}

export interface EventHandlerResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  /** Optional data to include in event log */
  metadata?: Record<string, unknown>;
}

export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Service-level event registry.
 * Each service registers its event handlers here.
 */
export class EventHandlerRegistry {
  private handlers = new Map<EventType, EventHandlerConfig[]>();

  /**
   * Register a handler for an event type.
   * Multiple handlers per event type are allowed (within same service).
   */
  register<TEvent extends DomainEvent>(config: EventHandlerConfig<TEvent>): void {
    const existing = this.handlers.get(config.eventType) ?? [];
    existing.push(config as EventHandlerConfig);
    this.handlers.set(config.eventType, existing);
  }

  /**
   * Get all handlers for an event type.
   */
  getHandlers(eventType: EventType): EventHandlerConfig[] {
    return this.handlers.get(eventType) ?? [];
  }

  /**
   * Get all registered event types.
   */
  getRegisteredEventTypes(): EventType[] {
    return Array.from(this.handlers.keys());
  }
}

// Global registry instance per service
export const eventRegistry = new EventHandlerRegistry();
```

### 1.3 Event Handler Decorator

```typescript
// packages/events/src/decorators.ts

import { eventRegistry, type EventHandlerConfig } from "./registry.js";
import { OperationPresets, type OperationConfig } from "../idempotency/types.js";
import type { DomainEvent } from "./types.js";

/**
 * Decorator to register a method as an event handler.
 *
 * @example
 * class InventoryEventHandlers {
 *   @EventHandler("product.created", { operation: OperationPresets.CREATE })
 *   async onProductCreated(event: ProductCreatedEvent): Promise<EventHandlerResult> {
 *     // Initialize inventory record for new product
 *     await this.inventoryService.initializeStock(event.payload.productId);
 *     return { success: true };
 *   }
 * }
 */
export function EventHandler<TEvent extends DomainEvent>(
  eventType: TEvent["eventType"],
  options: {
    operation?: OperationConfig;
    critical?: boolean;
    retryPolicy?: RetryPolicy;
  } = {}
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    // Register handler in registry
    eventRegistry.register<TEvent>({
      eventType,
      handler: originalMethod.bind(target),
      operation: options.operation ?? OperationPresets.CREATE,
      critical: options.critical ?? true,
      retryPolicy: options.retryPolicy,
    });

    return descriptor;
  };
}
```

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
 * });
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

### 2.2 Event Emitter (In Workflow Context)

```typescript
// packages/events/src/emitter.ts

import { DBOS } from "@dbos-inc/dbos-sdk";
import type { DomainEvent } from "./types.js";
import type { ServiceBroker } from "@shopana/shared-kernel";

/**
 * Emit an event by starting its dispatch workflow.
 *
 * IMPORTANT: This should be called from within a DBOS step to ensure
 * the event emission is durable.
 *
 * The workflow will:
 * 1. Persist the event
 * 2. Fan-out to all registered handlers
 * 3. Track completion status
 */
export class EventEmitter {
  constructor(private readonly broker: ServiceBroker) {}

  /**
   * Emit an event. Starts EventDispatchWorkflow.
   *
   * @returns Workflow handle for tracking
   */
  @DBOS.step()
  async emit<TEvent extends DomainEvent>(event: TEvent): Promise<{ workflowId: string }> {
    // Start the dispatch workflow with deterministic ID based on eventId
    const workflowId = `event:dispatch:${event.eventType}:${event.eventId}`;

    await DBOS.startWorkflow(EventDispatchWorkflow, workflowId).dispatch(event);

    return { workflowId };
  }

  /**
   * Emit event and wait for all handlers to complete.
   * Use sparingly - prefer async emission.
   */
  @DBOS.step()
  async emitAndWait<TEvent extends DomainEvent>(
    event: TEvent,
    timeoutMs: number = 30000
  ): Promise<EventDispatchResult> {
    const { workflowId } = await this.emit(event);

    // Get workflow handle and await completion
    const handle = DBOS.retrieveWorkflow(workflowId);
    return handle.getResult(timeoutMs);
  }
}
```

---

## Part 3: Event Dispatch Workflow (DBOS Durability)

### 3.1 Workflow Definition

```typescript
// packages/events/src/workflows/EventDispatchWorkflow.ts

import { DBOS, Workflow } from "@dbos-inc/dbos-sdk";
import type { DomainEvent } from "../types.js";
import type { ServiceBroker } from "@shopana/shared-kernel";
import { buildEventHandlerContext } from "../context.js";

export interface EventDispatchResult {
  eventId: string;
  eventType: string;
  handlersInvoked: number;
  handlersSucceeded: number;
  handlersFailed: number;
  results: HandlerInvocationResult[];
}

export interface HandlerInvocationResult {
  service: string;
  handlerName: string;
  status: "success" | "failed" | "skipped";
  error?: string;
  durationMs: number;
}

/**
 * Main event dispatch workflow.
 *
 * This workflow is the SINGLE source of truth for event delivery.
 * - DBOS guarantees it will complete even if service restarts
 * - Built-in retry policies handle transient failures
 * - Idempotency framework ensures each handler runs exactly once
 */
export class EventDispatchWorkflow {
  constructor(private readonly broker: ServiceBroker) {}

  /**
   * Deterministic workflow ID based on event.
   * Same event = same workflow = idempotent dispatch.
   */
  static workflowID(event: DomainEvent): string {
    return `event:dispatch:${event.eventType}:${event.eventId}`;
  }

  /**
   * Main dispatch entry point.
   */
  @Workflow()
  async dispatch(event: DomainEvent): Promise<EventDispatchResult> {
    // Step 1: Persist event (for audit/replay)
    await this.persistEvent(event);

    // Step 2: Get all handlers for this event type
    const handlers = await this.discoverHandlers(event.eventType);

    if (handlers.length === 0) {
      return {
        eventId: event.eventId,
        eventType: event.eventType,
        handlersInvoked: 0,
        handlersSucceeded: 0,
        handlersFailed: 0,
        results: [],
      };
    }

    // Step 3: Invoke each handler (fan-out)
    // Each invocation is a separate step for durability
    const results: HandlerInvocationResult[] = [];

    for (const handler of handlers) {
      const result = await this.invokeHandler(event, handler);
      results.push(result);
    }

    // Step 4: Summarize results
    const succeeded = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      handlersInvoked: handlers.length,
      handlersSucceeded: succeeded,
      handlersFailed: failed,
      results,
    };
  }

  /**
   * Persist event for audit trail and potential replay.
   */
  @DBOS.step()
  private async persistEvent(event: DomainEvent): Promise<void> {
    await this.broker.call("events.persistEvent", {
      payload: event,
      ctx: buildEventHandlerContext(event, "events", "persistEvent"),
    });
  }

  /**
   * Discover handlers for event type across all services.
   * Returns service + handler info from service registry.
   */
  @DBOS.step()
  private async discoverHandlers(eventType: string): Promise<HandlerInfo[]> {
    // Call bootstrap/registry service to get all handlers
    const response = await this.broker.call("bootstrap.getEventHandlers", {
      eventType,
    });

    return response.handlers ?? [];
  }

  /**
   * Invoke a single handler with full idempotency.
   *
   * This is the KEY step where:
   * - DBOS ensures the step completes (durability)
   * - Idempotency framework ensures exactly-once per handler
   */
  @DBOS.step()
  private async invokeHandler(
    event: DomainEvent,
    handler: HandlerInfo
  ): Promise<HandlerInvocationResult> {
    const startTime = Date.now();

    try {
      // Build idempotency context for this specific handler
      // Key: eventId + service ensures each service processes event once
      const ctx = buildEventHandlerContext(
        event,
        handler.service,
        handler.action
      );

      const response = await this.broker.call(
        `${handler.service}.${handler.action}`,
        {
          payload: { event },
          ctx,
        }
      );

      if (response.error) {
        // Non-retryable error from handler
        if (!response.error.retryable) {
          return {
            service: handler.service,
            handlerName: handler.action,
            status: "failed",
            error: response.error.message,
            durationMs: Date.now() - startTime,
          };
        }

        // Retryable error - DBOS will retry the step
        throw new Error(`TRANSIENT: ${response.error.message}`);
      }

      // Check if this was an idempotent replay
      if (response.meta?.idempotent) {
        return {
          service: handler.service,
          handlerName: handler.action,
          status: "success",
          durationMs: Date.now() - startTime,
        };
      }

      return {
        service: handler.service,
        handlerName: handler.action,
        status: "success",
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      // Let DBOS retry transient errors
      if (String(error).includes("TRANSIENT")) {
        throw error;
      }

      return {
        service: handler.service,
        handlerName: handler.action,
        status: "failed",
        error: String(error),
        durationMs: Date.now() - startTime,
      };
    }
  }
}

interface HandlerInfo {
  service: string;
  action: string;
  critical: boolean;
}
```

### 3.2 Event Idempotency Context Builder

```typescript
// packages/events/src/context.ts

import crypto from "node:crypto";
import type { DomainEvent } from "./types.js";
import type { ActionContextV3, OperationConfig } from "../idempotency/types.js";
import { OperationPresets } from "../idempotency/types.js";
import { canonicalJson } from "../idempotency/utils.js";

/**
 * Build idempotency context for event handler invocation.
 *
 * Key structure: event:{eventType}:{eventId}:{service}:{action}
 *
 * This ensures:
 * - Same event processed by different services = different keys (fan-out works)
 * - Same event processed by same service = same key (exactly-once per service)
 * - Different events = different keys (no collision)
 */
export function buildEventHandlerContext(
  event: DomainEvent,
  service: string,
  action: string,
  operation: OperationConfig = OperationPresets.CREATE
): ActionContextV3 {
  const keyParts = [
    "event",
    event.eventType,
    event.eventId,
    service,
    action,
  ];

  const idempotencyKey = sha256(keyParts.join(":"));
  const payloadHash = sha256(canonicalJson(event));

  return {
    version: 3,
    source: "workflow",
    idempotencyKey,
    payloadHash,
    service,
    action,
    operation,

    // Workflow-specific fields
    workflowId: `event:dispatch:${event.eventType}:${event.eventId}`,
    stepId: `invoke:${service}:${action}`,
    callId: event.eventId,

    // Tenant scope from event context
    tenantId: event.context.tenantId,

    // Tracing
    traceId: event.context.correlationId,
  };
}

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}
```

---

## Part 4: Service-Side Event Handlers

### 4.1 Handler Implementation Pattern

```typescript
// services/inventory/src/InventoryEventHandlers.ts

import { EventHandler, type EventHandlerResult } from "@shopana/events";
import type { ProductCreatedEvent, ProductDeletedEvent } from "@shopana/events";
import { OperationPresets } from "@shopana/idempotency";
import { InventoryKernel } from "./InventoryKernel.js";

/**
 * Inventory service event handlers.
 *
 * Each handler:
 * - Receives event from EventDispatchWorkflow
 * - Has idempotency guaranteed by framework
 * - Returns success/failure (never throws for business errors)
 */
export class InventoryEventHandlers {
  constructor(private readonly kernel: InventoryKernel) {}

  /**
   * Handle product.created: Initialize inventory record.
   *
   * Idempotency: Same product creation event = initialize once.
   */
  @EventHandler("product.created", {
    operation: OperationPresets.CREATE,
    critical: true,
  })
  async onProductCreated(event: ProductCreatedEvent): Promise<EventHandlerResult> {
    const { productId, storeId, sku } = event.payload;

    try {
      await this.kernel.runScript(InitializeInventoryScript, {
        productId,
        storeId,
        sku: sku ?? productId,
        initialQuantity: 0,
      });

      return { success: true };
    } catch (error) {
      // Check if this is a duplicate (product already has inventory)
      if (isDuplicateError(error)) {
        // Idempotent: already initialized, that's fine
        return { success: true, metadata: { alreadyExists: true } };
      }

      return {
        success: false,
        error: {
          code: isTransient(error) ? "TRANSIENT_ERROR" : "INTERNAL_ERROR",
          message: String(error),
          retryable: isTransient(error),
        },
      };
    }
  }

  /**
   * Handle product.deleted: Remove inventory record.
   *
   * Idempotency: Deleting non-existent inventory is fine.
   */
  @EventHandler("product.deleted", {
    operation: OperationPresets.DELETE,
    critical: false, // Non-critical: event completes even if this fails
  })
  async onProductDeleted(event: ProductDeletedEvent): Promise<EventHandlerResult> {
    const { productId, storeId } = event.payload;

    try {
      await this.kernel.runScript(DeleteInventoryScript, {
        productId,
        storeId,
      });

      return { success: true };
    } catch (error) {
      if (isNotFoundError(error)) {
        // Idempotent: already deleted or never existed
        return { success: true, metadata: { notFound: true } };
      }

      return {
        success: false,
        error: {
          code: "TRANSIENT_ERROR",
          message: String(error),
          retryable: true,
        },
      };
    }
  }
}
```

### 4.2 BrokerActions Integration

```typescript
// services/inventory/src/InventoryBrokerActions.ts

import { Action, BrokerActions } from "@shopana/shared-kernel";
import type { ActionRequest, ActionResponse } from "@shopana/idempotency";
import { withIdempotency } from "@shopana/idempotency";
import type { ProductCreatedEvent, ProductDeletedEvent } from "@shopana/events";
import { InventoryEventHandlers } from "./InventoryEventHandlers.js";

export class InventoryBrokerActions extends BrokerActions {
  private eventHandlers: InventoryEventHandlers;

  constructor(kernel: InventoryKernel) {
    super(kernel);
    this.eventHandlers = new InventoryEventHandlers(kernel);
  }

  /**
   * Event handler action: product.created
   *
   * Called by EventDispatchWorkflow with full idempotency context.
   */
  @Action("handleProductCreated", { operation: OperationPresets.CREATE })
  async handleProductCreated(
    input: ActionRequest<{ event: ProductCreatedEvent }>
  ): Promise<ActionResponse<EventHandlerResult>> {
    const { payload, ctx } = this.unwrapRequest(input);

    return withIdempotency(ctx, payload, this.idempotencyHelpers, async (p) => {
      return this.eventHandlers.onProductCreated(p.event);
    });
  }

  /**
   * Event handler action: product.deleted
   */
  @Action("handleProductDeleted", { operation: OperationPresets.DELETE })
  async handleProductDeleted(
    input: ActionRequest<{ event: ProductDeletedEvent }>
  ): Promise<ActionResponse<EventHandlerResult>> {
    const { payload, ctx } = this.unwrapRequest(input);

    return withIdempotency(ctx, payload, this.idempotencyHelpers, async (p) => {
      return this.eventHandlers.onProductDeleted(p.event);
    });
  }
}
```

---

## Part 5: Event Handler Registration (Bootstrap)

### 5.1 Service Registration

```typescript
// services/bootstrap/src/EventHandlerRegistry.ts

import type { EventType } from "@shopana/events";

interface RegisteredHandler {
  service: string;
  action: string;
  eventType: EventType;
  critical: boolean;
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

  /**
   * Register a handler (called by services on startup).
   */
  register(handler: Omit<RegisteredHandler, "registeredAt">): void {
    const existing = this.handlers.get(handler.eventType as EventType) ?? [];

    // Avoid duplicates
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

  /**
   * Get all handlers for an event type.
   */
  getHandlers(eventType: EventType): RegisteredHandler[] {
    return this.handlers.get(eventType) ?? [];
  }

  /**
   * Get all registered event types.
   */
  getAllEventTypes(): EventType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Export registry state (for debugging/monitoring).
   */
  export(): Record<EventType, RegisteredHandler[]> {
    return Object.fromEntries(this.handlers);
  }
}

// Singleton instance
export const globalEventRegistry = new GlobalEventHandlerRegistry();
```

### 5.2 Bootstrap Service Actions

```typescript
// services/bootstrap/src/BootstrapBrokerActions.ts

import { Action, BrokerActions } from "@shopana/shared-kernel";
import { globalEventRegistry } from "./EventHandlerRegistry.js";

export class BootstrapBrokerActions extends BrokerActions {
  /**
   * Register an event handler (called by services on startup).
   */
  @Action("registerEventHandler")
  async registerEventHandler(params: {
    service: string;
    action: string;
    eventType: string;
    critical: boolean;
  }): Promise<{ success: boolean }> {
    globalEventRegistry.register(params);
    return { success: true };
  }

  /**
   * Get handlers for an event type (called by EventDispatchWorkflow).
   */
  @Action("getEventHandlers")
  async getEventHandlers(params: { eventType: string }): Promise<{
    handlers: Array<{ service: string; action: string; critical: boolean }>;
  }> {
    const handlers = globalEventRegistry.getHandlers(params.eventType as any);
    return {
      handlers: handlers.map((h) => ({
        service: h.service,
        action: h.action,
        critical: h.critical,
      })),
    };
  }

  /**
   * Get full registry state (for debugging).
   */
  @Action("getEventRegistry")
  async getEventRegistry(): Promise<{ registry: Record<string, any[]> }> {
    return { registry: globalEventRegistry.export() };
  }
}
```

### 5.3 Service Startup Registration

```typescript
// services/inventory/src/index.ts

import { globalEventRegistry } from "@shopana/bootstrap";

// Register event handlers on service startup
export function registerEventHandlers(broker: ServiceBroker): void {
  // Register each handler this service provides
  const handlers = [
    { eventType: "product.created", action: "handleProductCreated", critical: true },
    { eventType: "product.deleted", action: "handleProductDeleted", critical: false },
    { eventType: "product.updated", action: "handleProductUpdated", critical: true },
  ];

  for (const handler of handlers) {
    broker.call("bootstrap.registerEventHandler", {
      service: "inventory",
      ...handler,
    });
  }
}
```

---

## Part 6: Event Persistence & Audit

### 6.1 Event Store Schema

```sql
-- Event persistence for audit and replay
CREATE TABLE IF NOT EXISTS domain_events (
  -- Primary key
  event_id TEXT PRIMARY KEY,

  -- Event metadata
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,

  -- Payload (full event data)
  payload JSONB NOT NULL,

  -- Context
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  correlation_id TEXT NOT NULL,
  causation_id TEXT,

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'dispatching' | 'completed' | 'failed'
  dispatch_started_at TIMESTAMPTZ,
  dispatch_completed_at TIMESTAMPTZ,

  -- Handler results
  handler_results JSONB,  -- Array of per-handler results

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT domain_events_status_chk
    CHECK (status IN ('pending', 'dispatching', 'completed', 'failed'))
);

-- Indexes
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
import { withIdempotency, OperationPresets } from "@shopana/idempotency";

export class EventStoreBrokerActions extends BrokerActions {
  /**
   * Persist an event (idempotent).
   */
  @Action("persistEvent", { operation: OperationPresets.CREATE })
  async persistEvent(
    input: ActionRequest<DomainEvent>
  ): Promise<ActionResponse<{ persisted: boolean }>> {
    const { payload: event, ctx } = this.unwrapRequest(input);

    return withIdempotency(ctx, event, this.idempotencyHelpers, async () => {
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
    });
  }

  /**
   * Update event dispatch status.
   */
  @Action("updateEventStatus")
  async updateEventStatus(params: {
    eventId: string;
    status: "completed" | "failed";
    handlerResults: Array<{ service: string; status: string; error?: string }>;
  }): Promise<{ updated: boolean }> {
    await this.db.update(domainEvents)
      .set({
        status: params.status,
        dispatchCompletedAt: new Date(),
        handlerResults: params.handlerResults,
        updatedAt: new Date(),
      })
      .where(eq(domainEvents.eventId, params.eventId));

    return { updated: true };
  }

  /**
   * Get events for replay (e.g., new service catching up).
   */
  @Action("getEventsForReplay")
  async getEventsForReplay(params: {
    eventTypes: string[];
    since: string;
    limit: number;
  }): Promise<{ events: DomainEvent[] }> {
    const events = await this.db.query.domainEvents.findMany({
      where: and(
        inArray(domainEvents.eventType, params.eventTypes),
        gte(domainEvents.timestamp, new Date(params.since))
      ),
      orderBy: asc(domainEvents.timestamp),
      limit: params.limit,
    });

    return {
      events: events.map((e) => ({
        eventId: e.eventId,
        eventType: e.eventType,
        timestamp: e.timestamp.toISOString(),
        source: e.source,
        payload: e.payload,
        context: {
          tenantId: e.tenantId,
          userId: e.userId,
          correlationId: e.correlationId,
          causationId: e.causationId,
        },
      })),
    };
  }
}
```

---

## Part 7: Full Example - Product Lifecycle

### 7.1 Product Creation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCT CREATION EVENT FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. API Request: createProduct                                              │
│     │                                                                       │
│     ▼                                                                       │
│  2. ProductService.createProduct()                                          │
│     │  - Creates product in DB                                              │
│     │  - Emits product.created event                                        │
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
│     │             - Idempotent (same eventId = no duplicate)                │
│     │                                                                       │
│     ├──[Step 2]─► discoverHandlers("product.created")                       │
│     │             - Returns: [inventory, search, pricing]                   │
│     │                                                                       │
│     ├──[Step 3]─► invokeHandler(event, inventory)                           │
│     │             │  Idempotency key: event:product.created:{eventId}:      │
│     │             │                   inventory:handleProductCreated        │
│     │             │                                                         │
│     │             ▼                                                         │
│     │             inventory.handleProductCreated(event)                     │
│     │             - Initializes stock record                                │
│     │             - Returns { success: true }                               │
│     │                                                                       │
│     ├──[Step 4]─► invokeHandler(event, search)                              │
│     │             │  Idempotency key: event:product.created:{eventId}:      │
│     │             │                   search:handleProductCreated           │
│     │             │                                                         │
│     │             ▼                                                         │
│     │             search.handleProductCreated(event)                        │
│     │             - Indexes product for search                              │
│     │             - Returns { success: true }                               │
│     │                                                                       │
│     ├──[Step 5]─► invokeHandler(event, pricing)                             │
│     │             │  Idempotency key: event:product.created:{eventId}:      │
│     │             │                   pricing:handleProductCreated          │
│     │             │                                                         │
│     │             ▼                                                         │
│     │             pricing.handleProductCreated(event)                       │
│     │             - Creates default price record                            │
│     │             - Returns { success: true }                               │
│     │                                                                       │
│     └──[Complete]─► Return EventDispatchResult                              │
│                     { handlersInvoked: 3, handlersSucceeded: 3 }            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Failure & Retry Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FAILURE & RECOVERY FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Scenario: Inventory service fails during handleProductCreated              │
│                                                                             │
│  1. EventDispatchWorkflow running...                                        │
│     │                                                                       │
│     ├──[Step 3]─► invokeHandler(event, inventory)                           │
│     │             │                                                         │
│     │             ▼                                                         │
│     │             inventory.handleProductCreated(event)                     │
│     │             ❌ FAILS: "Connection timeout"                            │
│     │             Returns: { error: { code: "TRANSIENT_ERROR", ... } }      │
│     │                                                                       │
│     │             ┌───────────────────────────────────────────┐             │
│     │             │ DBOS Step Retry Policy kicks in:          │             │
│     │             │ - maxAttempts: 3                          │             │
│     │             │ - backoff: 1s, 2s, 4s                     │             │
│     │             └───────────────────────────────────────────┘             │
│     │                                                                       │
│     ├──[Retry 1]─► invokeHandler(event, inventory)                          │
│     │             ❌ FAILS again                                            │
│     │                                                                       │
│     ├──[Retry 2]─► invokeHandler(event, inventory)                          │
│     │             ✅ SUCCESS                                                │
│     │             - Idempotency check: not processed yet                    │
│     │             - Executes handler                                        │
│     │             - Marks as completed                                      │
│     │                                                                       │
│     └──► Continue with remaining handlers...                                │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  Scenario: Service crashes mid-workflow                                     │
│                                                                             │
│  1. EventDispatchWorkflow running...                                        │
│     ├──[Step 3]─► invokeHandler(event, inventory) ✅                        │
│     ├──[Step 4]─► invokeHandler(event, search)                              │
│     │             💥 SERVICE CRASHES                                        │
│     │                                                                       │
│  2. Service restarts...                                                     │
│     │                                                                       │
│     │  ┌───────────────────────────────────────────┐                        │
│     │  │ DBOS Workflow Recovery:                   │                        │
│     │  │ - Detects incomplete workflow             │                        │
│     │  │ - Resumes from last completed step        │                        │
│     │  │ - Step 3 (inventory) already done         │                        │
│     │  │ - Resumes at Step 4 (search)              │                        │
│     │  └───────────────────────────────────────────┘                        │
│     │                                                                       │
│     ├──[Step 4]─► invokeHandler(event, search)                              │
│     │             │                                                         │
│     │             ▼                                                         │
│     │             Idempotency check for search handler:                     │
│     │             - Key: event:product.created:{eventId}:search:...         │
│     │             - Status: NOT FOUND (wasn't processed before crash)       │
│     │             - Execute handler normally                                │
│     │                                                                       │
│     ├──[Step 5]─► invokeHandler(event, pricing) ✅                          │
│     │                                                                       │
│     └──[Complete]─► Workflow completes successfully                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Idempotent Replay (Duplicate Event)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IDEMPOTENT REPLAY FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Scenario: Same event emitted twice (network retry, bug, etc.)              │
│                                                                             │
│  First emission: product.created eventId="evt-123"                          │
│  ├── EventDispatchWorkflow (ID: event:dispatch:product.created:evt-123)     │
│  ├── All handlers execute successfully                                      │
│  └── Workflow completes                                                     │
│                                                                             │
│  Second emission: product.created eventId="evt-123" (DUPLICATE)             │
│  │                                                                          │
│  ▼                                                                          │
│  DBOS.startWorkflow(EventDispatchWorkflow, "event:dispatch:...evt-123")     │
│  │                                                                          │
│  │  ┌───────────────────────────────────────────┐                           │
│  │  │ DBOS Workflow Idempotency:                │                           │
│  │  │ - Same workflow ID detected               │                           │
│  │  │ - Previous execution found                │                           │
│  │  │ - Returns cached result immediately       │                           │
│  │  └───────────────────────────────────────────┘                           │
│  │                                                                          │
│  └──► Returns: { handlersInvoked: 3, handlersSucceeded: 3 }                 │
│       (No handlers actually invoked - cached result)                        │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  Scenario: Same event, different eventId (business duplicate)               │
│                                                                             │
│  First: product.created eventId="evt-123" productId="prod-456"              │
│  Second: product.created eventId="evt-789" productId="prod-456"             │
│                                                                             │
│  Both workflows run (different workflow IDs), but:                          │
│  │                                                                          │
│  ▼                                                                          │
│  inventory.handleProductCreated for evt-789:                                │
│  │                                                                          │
│  │  ┌───────────────────────────────────────────┐                           │
│  │  │ Domain-level idempotency:                 │                           │
│  │  │ - INSERT inventory ON CONFLICT DO NOTHING │                           │
│  │  │ - Product already has inventory record    │                           │
│  │  │ - Returns { success: true, alreadyExists }│                           │
│  │  └───────────────────────────────────────────┘                           │
│  │                                                                          │
│  └──► Handler succeeds (idempotent at domain level)                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 8: Idempotency Key Structure

### 8.1 Key Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      IDEMPOTENCY KEY STRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Layer 1: DBOS Workflow Idempotency                                         │
│  ─────────────────────────────────────                                      │
│  Key: event:dispatch:{eventType}:{eventId}                                  │
│  Example: event:dispatch:product.created:evt-123-456                        │
│                                                                             │
│  Guarantees: Same event = same workflow = executes once                     │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  Layer 2: Per-Handler Idempotency (Framework)                               │
│  ─────────────────────────────────────────────                              │
│  Key: event:{eventType}:{eventId}:{service}:{action}                        │
│  Example: event:product.created:evt-123:inventory:handleProductCreated      │
│                                                                             │
│  Stored in: processed_requests table                                        │
│  Guarantees: Each service processes event exactly once                      │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  Layer 3: Domain-Level Idempotency (Application)                            │
│  ─────────────────────────────────────────────────                          │
│  Method: Unique constraints, upserts, conditional updates                   │
│  Example: INSERT INTO inventory (product_id, ...) ON CONFLICT DO NOTHING    │
│                                                                             │
│  Guarantees: Business invariants even with duplicate events                 │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHY THREE LAYERS?                                                          │
│                                                                             │
│  1. DBOS Workflow: Prevents duplicate workflow executions                   │
│     - Same eventId never starts two workflows                               │
│     - Handles: API retries, message redelivery                              │
│                                                                             │
│  2. Framework (processed_requests): Per-handler tracking                    │
│     - Handles: Workflow restart after crash (resume from step)              │
│     - Handles: Network issues between workflow and service                  │
│     - Provides: Audit trail, completion status                              │
│                                                                             │
│  3. Domain: Business-level safety net                                       │
│     - Handles: Business duplicates (same product created twice)             │
│     - Handles: Edge cases, bugs, manual operations                          │
│     - Provides: Data integrity guarantees                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Key Collision Analysis

```typescript
// Key collision is IMPOSSIBLE when:

// 1. Different events (different eventId)
"event:product.created:evt-123:inventory:handleProductCreated"
"event:product.created:evt-456:inventory:handleProductCreated"
// ✅ Different keys - both execute

// 2. Different services (same event)
"event:product.created:evt-123:inventory:handleProductCreated"
"event:product.created:evt-123:search:handleProductCreated"
// ✅ Different keys - both execute (fan-out works)

// 3. Different event types
"event:product.created:evt-123:inventory:handleProductCreated"
"event:product.deleted:evt-123:inventory:handleProductDeleted"
// ✅ Different keys - both execute

// 4. Same everything (duplicate)
"event:product.created:evt-123:inventory:handleProductCreated"
"event:product.created:evt-123:inventory:handleProductCreated"
// ⚠️ Same key - second is idempotent replay (correct behavior)
```

---

## Part 9: Configuration & Presets

### 9.1 Event Handler Operation Presets

```typescript
// packages/events/src/presets.ts

import { OperationPresets, type OperationConfig } from "@shopana/idempotency";

/**
 * Operation presets specifically for event handlers.
 */
export const EventHandlerPresets = {
  /**
   * Standard event handler - creates something in response to event.
   * Examples: Initialize inventory, index for search, create notification.
   */
  STANDARD: {
    ...OperationPresets.CREATE,
    ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days (longer for event audit)
  },

  /**
   * Idempotent update handler - updates state based on event.
   * Examples: Update counters, sync data, set flags.
   */
  SYNC: {
    ...OperationPresets.UPDATE,
    ttlMs: 24 * 60 * 60 * 1000, // 24 hours
    allowSamePayloadRetry: true,
  },

  /**
   * Cleanup handler - removes data in response to event.
   * Examples: Delete inventory, remove from search index.
   */
  CLEANUP: {
    ...OperationPresets.DELETE,
    ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  /**
   * Notification handler - fire-and-forget style.
   * Examples: Send email, push notification, webhook.
   */
  NOTIFY: {
    ...OperationPresets.ASYNC_JOB,
    ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days (for audit)
    cacheResult: false,
    resultMode: "receipt_only" as const,
  },
} satisfies Record<string, OperationConfig>;
```

### 9.2 Retry Policies

```typescript
// packages/events/src/retry.ts

export const RetryPolicies = {
  /**
   * Standard retry - 3 attempts with exponential backoff.
   */
  STANDARD: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },

  /**
   * Aggressive retry - for critical handlers.
   */
  CRITICAL: {
    maxAttempts: 5,
    initialDelayMs: 500,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
  },

  /**
   * Lenient retry - for non-critical handlers.
   */
  BEST_EFFORT: {
    maxAttempts: 2,
    initialDelayMs: 2000,
    maxDelayMs: 10000,
    backoffMultiplier: 1.5,
  },

  /**
   * No retry - fail immediately.
   */
  NONE: {
    maxAttempts: 1,
    initialDelayMs: 0,
    maxDelayMs: 0,
    backoffMultiplier: 1,
  },
} satisfies Record<string, RetryPolicy>;
```

---

## Part 10: Monitoring & Observability

### 10.1 Metrics

```typescript
const EVENT_METRICS = {
  // Event emission
  "events.emitted.total": "Total events emitted",
  "events.emitted.by_type": "Events emitted by type",

  // Dispatch workflow
  "events.dispatch.started": "Dispatch workflows started",
  "events.dispatch.completed": "Dispatch workflows completed",
  "events.dispatch.failed": "Dispatch workflows failed",
  "events.dispatch.duration_ms": "Dispatch workflow duration",

  // Handler invocation
  "events.handler.invoked": "Handler invocations",
  "events.handler.succeeded": "Handler successes",
  "events.handler.failed": "Handler failures",
  "events.handler.idempotent_replay": "Idempotent replays",
  "events.handler.duration_ms": "Handler execution duration",

  // Retry metrics
  "events.handler.retried": "Handler retries",
  "events.handler.retry_exhausted": "Retry exhaustion",

  // Gauges
  "events.pending.count": "Pending events",
  "events.dispatching.count": "Currently dispatching",
} as const;
```

### 10.2 Structured Logging

```typescript
type EventLogEvent =
  | { event: "EVENT_EMITTED"; eventId: string; eventType: string; source: string }
  | { event: "DISPATCH_STARTED"; eventId: string; eventType: string; handlers: number }
  | { event: "HANDLER_INVOKED"; eventId: string; service: string; action: string }
  | { event: "HANDLER_SUCCEEDED"; eventId: string; service: string; action: string; durationMs: number }
  | { event: "HANDLER_FAILED"; eventId: string; service: string; action: string; error: string }
  | { event: "HANDLER_REPLAY"; eventId: string; service: string; action: string }
  | { event: "DISPATCH_COMPLETED"; eventId: string; eventType: string; succeeded: number; failed: number };
```

---

## Part 11: Migration Path

### Phase 1: Core Infrastructure

1. Create `packages/events/` with:
   - Event types (`types.ts`)
   - Event factory (`factory.ts`)
   - Event emitter (`emitter.ts`)
   - Handler registry (`registry.ts`)
   - Handler decorator (`decorators.ts`)
   - Context builder (`context.ts`)
   - Presets (`presets.ts`)

2. Create `EventDispatchWorkflow` in `packages/events/src/workflows/`

3. Add `domain_events` table migration

### Phase 2: Bootstrap Service Updates

1. Add `GlobalEventHandlerRegistry` to bootstrap service
2. Add `registerEventHandler` and `getEventHandlers` actions
3. Update service startup to register handlers

### Phase 3: Service Integration

For each service that needs to react to events:

1. Create `{Service}EventHandlers` class
2. Add handler methods with `@EventHandler` decorator
3. Add corresponding broker actions
4. Register handlers on service startup

### Phase 4: Event Emission

For each service that emits events:

1. Identify domain operations that should emit events
2. Use `EventEmitter.emit()` in workflows/steps
3. Add appropriate event types

### Phase 5: Testing & Validation

1. Unit tests for event handlers (mock broker)
2. Integration tests for event dispatch workflow
3. E2E tests for complete event flows
4. Load testing for concurrent event handling

---

## Part 12: Summary

| Aspect | Implementation |
|--------|----------------|
| Event Definition | Typed `DomainEvent<TType, TPayload>` with context |
| Event Emission | `EventEmitter.emit()` starts durable workflow |
| Durability | DBOS workflow guarantees delivery |
| Fan-out | Workflow calls all registered handlers |
| Per-service Idempotency | `event:{type}:{id}:{service}:{action}` key |
| Handler Registration | Decorator + startup registration |
| Retry | DBOS step retry + custom policies |
| Audit | `domain_events` table with full history |
| No Outbox | Workflow IS the delivery guarantee |

### Key Benefits

1. **Simple Mental Model**: Event → Workflow → Handlers
2. **Guaranteed Delivery**: DBOS workflow durability
3. **Exactly-Once per Service**: Idempotency framework
4. **Easy to Add Handlers**: Decorator + registration
5. **Full Audit Trail**: Event store with handler results
6. **No Infrastructure Overhead**: No separate message queue needed

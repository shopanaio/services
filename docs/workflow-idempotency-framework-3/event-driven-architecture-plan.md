# Event-Driven Architecture with DBOS Durability

**Author**: Generated from workflow-idempotency-plan.md
**Date**: 2026-01-19
**Last Updated**: 2026-01-20
**Based on**: [Workflow Idempotency Plan v4](./workflow-idempotency-plan.md)

## Overview

Classic event-driven architecture built on **DBOS workflow idempotency**.

**Key idea**: Events are dispatched via durable DBOS workflows. Each event gets a deterministic `workflowID` derived from `eventId`, ensuring exactly-once processing.

### Architectural Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     EVENT-DRIVEN LAYER                          │
│  DomainEvent, EventEmitter, EventDispatchWorkflow               │
├─────────────────────────────────────────────────────────────────┤
│                     DBOS DURABILITY                             │
│  Workflows (@DBOS.workflow), Steps (@DBOS.step)                 │
│  WorkflowID = Idempotency Key                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **No Outbox needed** — DBOS workflow guarantees delivery after durable step completes
2. **Parallel fan-out** — handlers invoked in parallel batches
3. **WorkflowID = Idempotency** — same eventId = same workflowID = no re-execution
4. **Critical vs Non-critical** — stop-on-failure for critical handlers
5. **Domain-level idempotency** — handlers should be naturally idempotent (UPSERT)

---

## Part 1: Event Types

### 1.1 Event Definition

```typescript
// packages/events/src/types.ts

/**
 * Base interface for all domain events.
 */
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  /** Unique event ID (UUID or deterministic) */
  eventId: string;

  /** Event type: "product.created", "order.completed", etc. */
  eventType: TType;

  /** Event creation time (ISO 8601) */
  timestamp: string;

  /** Event source (service name) */
  source: string;

  /** Event data */
  payload: TPayload;

  /** Context: project, user, correlation */
  context: EventContext;
}

export interface EventContext {
  /** Project scope */
  projectId: string;

  /** User who triggered the event (if applicable) */
  userId?: string;

  /** Correlation ID for distributed tracing */
  correlationId: string;

  /** Causation ID (parent event if this is a reaction) */
  causationId?: string;
}
```

### 1.2 Concrete Event Types

```typescript
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

---

## Part 2: Event Handler Registry

### 2.1 Handler Definition

```typescript
// packages/events/src/registry.ts

/**
 * Metadata about registered event handler.
 */
export interface EventHandler {
  /** Target service */
  service: string;

  /** Target action (broker action name) */
  action: string;

  /** If true, failure stops processing of subsequent handlers */
  critical: boolean;

  /** Execution order within same criticality level (lower = earlier) */
  priority: number;

  /** Description for documentation */
  description?: string;
}

/**
 * Registry of event handlers.
 * In production, this would be stored in a database or config service.
 */
export const EVENT_HANDLERS: Record<EventType, EventHandler[]> = {
  "product.created": [
    {
      service: "search",
      action: "indexProduct",
      critical: false,
      priority: 10,
      description: "Index product in search",
    },
    {
      service: "inventory",
      action: "initializeStock",
      critical: true,
      priority: 1,
      description: "Initialize inventory record",
    },
  ],

  "product.deleted": [
    {
      service: "search",
      action: "removeProduct",
      critical: false,
      priority: 10,
    },
    {
      service: "inventory",
      action: "removeStock",
      critical: false,
      priority: 10,
    },
  ],

  "product.updated": [
    {
      service: "search",
      action: "updateProduct",
      critical: false,
      priority: 10,
    },
  ],

  "order.created": [
    {
      service: "inventory",
      action: "reserveStock",
      critical: true,
      priority: 1,
    },
    {
      service: "payments",
      action: "capturePayment",
      critical: true,
      priority: 2,
    },
    {
      service: "delivery",
      action: "createShipment",
      critical: false,
      priority: 10,
    },
  ],

  "order.completed": [
    {
      service: "inventory",
      action: "commitStock",
      critical: true,
      priority: 1,
    },
    {
      service: "reviews",
      action: "requestReview",
      critical: false,
      priority: 100,
    },
  ],

  "store.created": [
    {
      service: "search",
      action: "createStoreIndex",
      critical: false,
      priority: 10,
    },
  ],
};

/**
 * Get handlers for an event type, sorted by criticality and priority.
 */
export function getHandlers(eventType: EventType): EventHandler[] {
  const handlers = EVENT_HANDLERS[eventType] ?? [];

  return [...handlers].sort((a, b) => {
    // Critical first
    if (a.critical !== b.critical) return a.critical ? -1 : 1;
    // Then by priority (lower = earlier)
    return a.priority - b.priority;
  });
}
```

---

## Part 3: Event Dispatch Workflow

### 3.1 Workflow Implementation

```typescript
// packages/events/src/workflows/EventDispatchWorkflow.ts

import { DBOS } from "@dbos-inc/dbos-sdk";
import { buildEventWorkflowID, ServiceError } from "@shopana/workflows";
import type { DomainEvent, EventHandler } from "../types.js";
import { getHandlers } from "../registry.js";
import type { ServiceBroker } from "@shopana/shared-kernel";

export interface EventDispatchResult {
  eventId: string;
  eventType: string;
  status: "completed" | "completed_with_errors" | "failed";
  handlersInvoked: number;
  handlersSucceeded: number;
  handlersFailed: number;
  failedHandlers: FailedHandler[];
}

interface FailedHandler {
  service: string;
  action: string;
  error: string;
  critical: boolean;
}

const CONCURRENCY_LIMIT = 5;

export class EventDispatchWorkflow {
  constructor(private readonly broker: ServiceBroker) {}

  /**
   * Deterministic workflow ID from event.
   * Same eventId = same workflowID = idempotent.
   */
  static workflowID(event: DomainEvent): string {
    return buildEventWorkflowID(event.eventType, event.eventId);
  }

  /**
   * Start dispatch with idempotent workflow ID.
   */
  static async start(event: DomainEvent): Promise<EventDispatchResult> {
    const workflowID = EventDispatchWorkflow.workflowID(event);
    const handle = await DBOS.startWorkflow(EventDispatchWorkflow, { workflowID });
    return handle.dispatch(event);
  }

  @DBOS.workflow()
  async dispatch(event: DomainEvent): Promise<EventDispatchResult> {
    // Step 1: Get handlers (from registry or service)
    const handlers = await this.getHandlers(event.eventType);

    if (handlers.length === 0) {
      return {
        eventId: event.eventId,
        eventType: event.eventType,
        status: "completed",
        handlersInvoked: 0,
        handlersSucceeded: 0,
        handlersFailed: 0,
        failedHandlers: [],
      };
    }

    // Step 2: Split into critical and non-critical
    const critical = handlers.filter((h) => h.critical);
    const nonCritical = handlers.filter((h) => !h.critical);

    const failedHandlers: FailedHandler[] = [];
    let succeeded = 0;

    // Step 3: Process critical handlers first (stop on failure)
    const criticalResults = await this.invokeHandlersBatch(event, critical, true);
    succeeded += criticalResults.succeeded;
    failedHandlers.push(...criticalResults.failed);

    const criticalFailed = criticalResults.failed.length > 0;

    // Step 4: Process non-critical only if critical succeeded
    if (!criticalFailed && nonCritical.length > 0) {
      const nonCriticalResults = await this.invokeHandlersBatch(event, nonCritical, false);
      succeeded += nonCriticalResults.succeeded;
      failedHandlers.push(...nonCriticalResults.failed);
    }

    // Determine status
    let status: EventDispatchResult["status"];
    if (criticalFailed) {
      status = "failed";
    } else if (failedHandlers.length > 0) {
      status = "completed_with_errors";
    } else {
      status = "completed";
    }

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      status,
      handlersInvoked: critical.length + (criticalFailed ? 0 : nonCritical.length),
      handlersSucceeded: succeeded,
      handlersFailed: failedHandlers.length,
      failedHandlers,
    };
  }

  @DBOS.step()
  private async getHandlers(eventType: string): Promise<EventHandler[]> {
    // Could call bootstrap service or use local registry
    return getHandlers(eventType as any);
  }

  /**
   * Invoke handlers in batches with concurrency limit.
   */
  private async invokeHandlersBatch(
    event: DomainEvent,
    handlers: EventHandler[],
    stopOnFailure: boolean
  ): Promise<{ succeeded: number; failed: FailedHandler[] }> {
    const failed: FailedHandler[] = [];
    let succeeded = 0;

    for (let i = 0; i < handlers.length; i += CONCURRENCY_LIMIT) {
      const batch = handlers.slice(i, i + CONCURRENCY_LIMIT);

      const results = await Promise.all(
        batch.map((h) => this.invokeHandler(event, h))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const handler = batch[j];

        if (result.success) {
          succeeded++;
        } else {
          failed.push({
            service: handler.service,
            action: handler.action,
            error: result.error!,
            critical: handler.critical,
          });

          if (stopOnFailure && handler.critical) {
            // Stop processing remaining handlers
            return { succeeded, failed };
          }
        }
      }
    }

    return { succeeded, failed };
  }

  @DBOS.step({ maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 })
  private async invokeHandler(
    event: DomainEvent,
    handler: EventHandler
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.broker.call(
        `${handler.service}.${handler.action}`,
        { event }
      );

      if (result.userErrors?.length) {
        // Business error - not retryable
        return { success: false, error: result.userErrors[0].message };
      }

      return { success: true };
    } catch (error) {
      // If it's a transient error, throw to trigger DBOS retry
      if (error instanceof Error && error.message.includes("TRANSIENT")) {
        throw error;
      }

      // Non-transient error
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
```

---

## Part 4: Event Emitter

### 4.1 Emitter Implementation

```typescript
// packages/events/src/emitter.ts

import { DBOS } from "@dbos-inc/dbos-sdk";
import crypto from "node:crypto";
import type { DomainEvent, EventContext } from "./types.js";
import { EventDispatchWorkflow, type EventDispatchResult } from "./workflows/EventDispatchWorkflow.js";

export class EventEmitter {
  /**
   * Create a new event with generated ID and timestamp.
   */
  static createEvent<TType extends string, TPayload>(
    eventType: TType,
    source: string,
    payload: TPayload,
    context: EventContext
  ): DomainEvent<TType, TPayload> {
    return {
      eventId: crypto.randomUUID(),
      eventType,
      timestamp: new Date().toISOString(),
      source,
      payload,
      context,
    };
  }

  /**
   * Create event with deterministic ID (for idempotent event creation).
   */
  static createDeterministicEvent<TType extends string, TPayload>(
    eventType: TType,
    source: string,
    payload: TPayload,
    context: EventContext,
    deterministicKey: string
  ): DomainEvent<TType, TPayload> {
    const eventId = crypto
      .createHash("sha256")
      .update(`${eventType}:${deterministicKey}`)
      .digest("hex")
      .slice(0, 32);

    return {
      eventId,
      eventType,
      timestamp: new Date().toISOString(),
      source,
      payload,
      context,
    };
  }

  /**
   * Emit event (fire-and-forget).
   * Starts dispatch workflow in background.
   */
  @DBOS.step()
  async emit<TEvent extends DomainEvent>(event: TEvent): Promise<{ workflowId: string }> {
    const workflowId = EventDispatchWorkflow.workflowID(event);

    // Start workflow in background - don't await
    DBOS.startWorkflow(EventDispatchWorkflow, { workflowID: workflowId })
      .dispatch(event)
      .catch((err) => {
        console.error("EventDispatch failed", { workflowId, eventId: event.eventId, err });
      });

    return { workflowId };
  }

  /**
   * Emit and wait for all handlers to complete.
   */
  @DBOS.step()
  async emitAndWait<TEvent extends DomainEvent>(event: TEvent): Promise<EventDispatchResult> {
    return EventDispatchWorkflow.start(event);
  }
}
```

---

## Part 5: Event Handler Implementation

### 5.1 Handler Pattern

Event handlers are regular broker actions that receive `{ event }` payload:

```typescript
// services/search/src/SearchBrokerActions.ts

import { Action, BrokerActions } from "@shopana/shared-kernel";
import type { ProductCreatedEvent, ProductDeletedEvent } from "@shopana/events";

export class SearchBrokerActions extends BrokerActions {
  /**
   * Handle product.created event.
   * Must be idempotent - use UPSERT pattern.
   */
  @Action("indexProduct")
  async indexProduct(params: { event: ProductCreatedEvent }): Promise<{ success: boolean }> {
    const { event } = params;
    const { productId, storeId, name, sku } = event.payload;

    // UPSERT - idempotent by design
    await this.searchClient.upsertDocument("products", productId, {
      id: productId,
      storeId,
      name,
      sku,
      indexedAt: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * Handle product.deleted event.
   * Idempotent - delete is naturally idempotent.
   */
  @Action("removeProduct")
  async removeProduct(params: { event: ProductDeletedEvent }): Promise<{ success: boolean }> {
    const { event } = params;
    const { productId } = event.payload;

    // Delete is idempotent - no error if doesn't exist
    await this.searchClient.deleteDocument("products", productId);

    return { success: true };
  }
}
```

### 5.2 Inventory Handler Example

```typescript
// services/inventory/src/InventoryBrokerActions.ts

import { Action, BrokerActions } from "@shopana/shared-kernel";
import { sql, eq, and } from "drizzle-orm";
import type { ProductCreatedEvent, OrderCreatedEvent } from "@shopana/events";
import { stock } from "./db/schema.js";

export class InventoryBrokerActions extends BrokerActions {
  /**
   * Initialize stock record for new product.
   * CRITICAL handler - must succeed.
   */
  @Action("initializeStock")
  async initializeStock(params: { event: ProductCreatedEvent }): Promise<{ success: boolean }> {
    const { event } = params;
    const { productId, storeId } = event.payload;

    // UPSERT - idempotent
    await this.db.execute(sql`
      INSERT INTO stock (product_id, store_id, quantity, reserved)
      VALUES (${productId}, ${storeId}, 0, 0)
      ON CONFLICT (product_id, store_id) DO NOTHING
    `);

    return { success: true };
  }

  /**
   * Reserve stock for order.
   * CRITICAL handler.
   */
  @Action("reserveStock")
  async reserveStock(params: { event: OrderCreatedEvent }): Promise<{ success: boolean; userErrors?: UserError[] }> {
    const { event } = params;
    const { orderId, items, storeId } = event.payload;

    // Use idempotency key based on orderId to prevent double-reservation
    const reservationId = `order:${orderId}`;

    // Check if already reserved (idempotent)
    const existing = await this.db.query.reservations.findFirst({
      where: eq(reservations.id, reservationId),
    });

    if (existing) {
      // Already processed this order - idempotent success
      return { success: true };
    }

    // Reserve stock in transaction
    await this.db.transaction(async (tx) => {
      for (const item of items) {
        const [updated] = await tx.execute(sql`
          UPDATE stock
          SET reserved = reserved + ${item.quantity}
          WHERE product_id = ${item.productId}
            AND store_id = ${storeId}
            AND quantity - reserved >= ${item.quantity}
          RETURNING *
        `);

        if (!updated) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }
      }

      // Record reservation
      await tx.insert(reservations).values({
        id: reservationId,
        orderId,
        items: JSON.stringify(items),
        createdAt: new Date(),
      });
    });

    return { success: true };
  }
}
```

---

## Part 6: Emitting Events from Workflows

### 6.1 Workflow with Event Emission

```typescript
// services/listing/src/workflows/ProductCreateWorkflow.ts

import { DBOS } from "@dbos-inc/dbos-sdk";
import { ServiceError, normalizeForWorkflowID } from "@shopana/workflows";
import { EventEmitter } from "@shopana/events";
import type { ServiceBroker } from "@shopana/shared-kernel";

export class ProductCreateWorkflow {
  private readonly eventEmitter = new EventEmitter();

  constructor(private readonly broker: ServiceBroker) {}

  static workflowID(input: ProductCreateInput): string {
    const normalizedSku = normalizeForWorkflowID(input.sku ?? input.name);
    return `product:create:${input.storeId}:${normalizedSku}`;
  }

  static async start(input: ProductCreateInput): Promise<ProductCreateResult> {
    const workflowID = ProductCreateWorkflow.workflowID(input);
    const handle = await DBOS.startWorkflow(ProductCreateWorkflow, { workflowID });
    return handle.run(input);
  }

  @DBOS.workflow()
  async run(input: ProductCreateInput): Promise<ProductCreateResult> {
    // Step 1: Create product
    const product = await this.createProduct(input);

    // Step 2: Emit event (after durable step completes)
    await this.emitProductCreated(product, input.context);

    return { product };
  }

  @DBOS.step()
  private async createProduct(input: ProductCreateInput): Promise<Product> {
    const result = await this.broker.call("listing.createProduct", input);

    if (result.userErrors?.length) {
      throw ServiceError.validation("listing", "createProduct", result.userErrors[0].message);
    }

    return result.product;
  }

  @DBOS.step()
  private async emitProductCreated(product: Product, context: EventContext): Promise<void> {
    const event = EventEmitter.createDeterministicEvent(
      "product.created",
      "listing",
      {
        productId: product.id,
        storeId: product.storeId,
        name: product.name,
        sku: product.sku,
      },
      context,
      product.id // Deterministic key - same product = same eventId
    );

    await this.eventEmitter.emit(event);
  }
}
```

---

## Part 7: Dead Letter Queue (Optional)

For production systems, you may want to track failed handlers:

### 7.1 DLQ Table

```sql
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event JSONB NOT NULL,

  handler_service TEXT NOT NULL,
  handler_action TEXT NOT NULL,
  handler_critical BOOLEAN NOT NULL,

  error TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,

  project_id TEXT,

  status TEXT NOT NULL DEFAULT 'failed',
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retried_at TIMESTAMPTZ,

  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_dlq_status ON dead_letter_queue(status);
CREATE INDEX idx_dlq_event_type ON dead_letter_queue(event_type, status);
```

### 7.2 DLQ Integration

```typescript
// In EventDispatchWorkflow, after handler failure:

@DBOS.step()
private async sendToDLQ(event: DomainEvent, handler: FailedHandler): Promise<void> {
  await this.db.insert(deadLetterQueue).values({
    eventId: event.eventId,
    eventType: event.eventType,
    event: event as any,
    handlerService: handler.service,
    handlerAction: handler.action,
    handlerCritical: handler.critical,
    error: handler.error,
    projectId: event.context.projectId,
  });

  console.warn("Handler sent to DLQ", {
    eventId: event.eventId,
    handler: `${handler.service}.${handler.action}`,
  });
}
```

---

## Part 8: Summary

### Architecture Flow

```
1. Workflow completes durable step (e.g., createProduct)
        ↓
2. EventEmitter.emit(event) - creates deterministic eventId
        ↓
3. EventDispatchWorkflow starts with workflowID = event:{type}:{eventId}
        ↓
4. Handlers discovered from registry
        ↓
5. Critical handlers invoked first (stop on failure)
        ↓
6. Non-critical handlers invoked (best-effort)
        ↓
7. Failed handlers optionally sent to DLQ
```

### Idempotency Guarantees

| Level | Mechanism |
|-------|-----------|
| Event dispatch | DBOS workflowID from eventId |
| Handler invocation | @DBOS.step() recording |
| Handler logic | Domain-level UPSERT/unique constraints |

### Key Files

| File | Purpose |
|------|---------|
| `packages/events/src/types.ts` | Event type definitions |
| `packages/events/src/registry.ts` | Handler registration |
| `packages/events/src/emitter.ts` | Event emission |
| `packages/events/src/workflows/EventDispatchWorkflow.ts` | Dispatch orchestration |
| `services/*/src/*BrokerActions.ts` | Handler implementations |

### What We DON'T Need

| Component | Why Not Needed |
|-----------|----------------|
| `processed_requests` table | DBOS tracks workflow/step state |
| `withIdempotency()` wrapper | DBOS step recording |
| `ActionContext` with payloadHash | WorkflowID is sufficient |
| Separate cleanup jobs | DBOS manages own state |
| Complex lease mechanism | DBOS handles internally |

This simplified approach provides robust exactly-once semantics through DBOS while keeping the codebase clean and maintainable.

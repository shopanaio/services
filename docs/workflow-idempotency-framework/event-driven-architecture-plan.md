# Event-Driven Architecture with DBOS Durability

**Author**: Generated from workflow-idempotency-plan.md
**Date**: 2026-01-19
**Based on**: [Workflow Idempotency Plan v3](./workflow-idempotency-plan.md)

## Overview

Classic event-driven architecture built on the **idempotency framework** from `workflow-idempotency-plan.md`.

**Key idea**: Events are just another way to invoke an action. We use the same `ActionRequest`/`ActionResponse` contract, the same `processed_requests` table, the same `withIdempotency()` helper.

### Architectural Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     EVENT-DRIVEN LAYER                          │
│  DomainEvent, EventEmitter, EventDispatchWorkflow               │
├─────────────────────────────────────────────────────────────────┤
│                     IDEMPOTENCY FRAMEWORK                       │
│  ActionRequest, ActionResponse, ActionContextV3                 │
│  withIdempotency(), processed_requests table                    │
├─────────────────────────────────────────────────────────────────┤
│                     DBOS DURABILITY                             │
│  Workflows, Steps, Retry policies                               │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **No Outbox** — workflow guarantees delivery only if emit is executed from a DBOS workflow/step after a durable DB transaction; otherwise an outbox/buffer is needed
2. **Parallel fan-out** — handlers are invoked in parallel (batches of CONCURRENCY_LIMIT)
3. **Unified contract** — `ActionRequest`/`ActionResponse` for everything (API, workflow, events)
4. **Per-service idempotency** — `source: "workflow"` with key `event:{type}:{id}:{service}:{action}`
5. **Critical vs Non-critical** — stop-on-failure for critical (batch level), best-effort for non-critical

---

## Part 1: Event Types & Registry

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

### 1.2 Event Handler Registration

```typescript
// packages/events/src/registry.ts

import type { DomainEvent, EventType } from "./types.js";
import type { OperationConfig } from "@shopana/idempotency";

/**
 * Metadata about registered event handler.
 *
 * NOTE: Handlers are regular BrokerActions.
 * Here we only store metadata for discovery.
 */
export interface EventHandlerRegistration {
  /** Event type this handler responds to */
  eventType: EventType;

  /** Service that owns this handler */
  service: string;

  /** Action name to call (e.g., "handleProductCreated") */
  action: string;

  /** Operation config for idempotency */
  operation: OperationConfig;

  /** Whether failure of this handler should fail the whole event dispatch */
  critical: boolean;
}

/**
 * Service-level registry of event handlers.
 * Used by EventDispatchWorkflow to discover who to call.
 */
export class EventHandlerRegistry {
  private handlers = new Map<EventType, EventHandlerRegistration[]>();

  register(registration: EventHandlerRegistration): void {
    const existing = this.handlers.get(registration.eventType) ?? [];

    // Prevent duplicates
    const isDuplicate = existing.some(
      (h) => h.service === registration.service && h.action === registration.action
    );

    if (!isDuplicate) {
      existing.push(registration);
      this.handlers.set(registration.eventType, existing);
    }
  }

  getHandlers(eventType: EventType): EventHandlerRegistration[] {
    return this.handlers.get(eventType) ?? [];
  }

  getAllEventTypes(): EventType[] {
    return Array.from(this.handlers.keys());
  }
}

export const eventRegistry = new EventHandlerRegistry();
```

### 1.3 Event Handler — Just a Regular Action

```typescript
// Event handler is simply an Action with a specific signature.
// We use the standard @Action decorator from the idempotency framework.

// packages/events/src/types.ts

import type { ActionRequest, ActionResponse } from "@shopana/idempotency";

/**
 * Payload for event handler action.
 * Event is passed as part of the payload.
 */
export interface EventHandlerPayload<TEvent extends DomainEvent = DomainEvent> {
  event: TEvent;
}

/**
 * Event handler is an Action with signature:
 *
 * ActionRequest<EventHandlerPayload<TEvent>> → ActionResponse<TResult>
 *
 * Where TResult is any result type (void for side-effect handlers).
 */
export type EventHandlerAction<TEvent extends DomainEvent, TResult = void> = (
  input: ActionRequest<EventHandlerPayload<TEvent>>
) => Promise<ActionResponse<TResult>>;
```

**Important**: There is no separate `@EventHandler` decorator. We use the standard `@Action` from the idempotency framework. Event handler registration happens at the service level during startup.

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
 * Rule: Emit events only from DBOS workflow/step after the domain write step
 * completes. Emitting from a plain HTTP handler reintroduces the outbox gap.
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

    await DBOS
      .startWorkflow(EventDispatchWorkflow, { workflowID: workflowId })
      .dispatch(event);

    return { workflowId };
  }

  /**
   * Emit event and wait for all handlers to complete.
   * Use sparingly - prefer async emission.
   *
   * If you need a timeout, wrap handle.getResult() with Promise.race at the call site.
   */
  @DBOS.step()
  async emitAndWait<TEvent extends DomainEvent>(
    event: TEvent
  ): Promise<EventDispatchResult> {
    const { workflowId } = await this.emit(event);

    // Get workflow handle and await completion
    const handle = DBOS.retrieveWorkflow(workflowId);
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
import type { ActionResponse } from "@shopana/idempotency";
import type { ServiceBroker } from "@shopana/shared-kernel";
import { buildEventHandlerContext } from "../context.js";

/**
 * Result of event dispatch workflow.
 */
export interface EventDispatchResult {
  eventId: string;
  eventType: string;

  /**
   * Final status:
   * - "completed": all handlers succeeded
   * - "completed_with_errors": critical handlers OK, some non-critical failed
   * - "failed": at least one critical handler failed
   */
  status: "completed" | "completed_with_errors" | "failed";

  handlersInvoked: number;
  handlersSucceeded: number;
  handlersFailed: number;
  results: HandlerInvocationResult[];
}

export interface HandlerInvocationResult {
  service: string;
  action: string;
  critical: boolean;
  status: "success" | "failed";
  idempotentReplay: boolean;
  error?: string;
  durationMs: number;
}

/**
 * Main event dispatch workflow.
 *
 * DBOS Workflow guarantees:
 * - Completion even if service restarts (durability)
 * - Automatic retry on transient failures
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

  /** Max concurrent handler invocations per batch */
  private static readonly CONCURRENCY_LIMIT = 5;

  @DBOS.workflow()
  async dispatch(event: DomainEvent): Promise<EventDispatchResult> {
    // Step 1: Persist event (idempotent)
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

    // Step 3: Invoke handlers in parallel batches
    // Critical handlers first (must all succeed), then non-critical (best-effort)
    const sortedHandlers = handlers
      .slice()
      .sort((a, b) => {
        if (a.critical !== b.critical) {
          return a.critical ? -1 : 1;
        }
        const serviceCmp = a.service.localeCompare(b.service);
        if (serviceCmp !== 0) {
          return serviceCmp;
        }
        return a.action.localeCompare(b.action);
      });

    const criticalHandlers = sortedHandlers.filter((h) => h.critical);
    const nonCriticalHandlers = sortedHandlers.filter((h) => !h.critical);

    const results: HandlerInvocationResult[] = [];

    // 3a: Critical handlers — parallel batches, stop on failure
    const criticalResults = await this.invokeHandlersBatch(
      event,
      criticalHandlers,
      { stopOnBatchFailure: true }
    );
    results.push(...criticalResults);

    const criticalFailed = criticalResults.some((r) => r.status === "failed");

    // 3b: Non-critical handlers — parallel batches, best-effort (only if critical succeeded)
    if (!criticalFailed && nonCriticalHandlers.length > 0) {
      const nonCriticalResults = await this.invokeHandlersBatch(
        event,
        nonCriticalHandlers,
        { stopOnBatchFailure: false }
      );
      results.push(...nonCriticalResults);
    }

    // Step 4: Determine final status
    const succeeded = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const nonCriticalFailed = results.filter(
      (r) => r.status === "failed" && !r.critical
    ).length;

    let status: EventDispatchResult["status"];
    if (criticalFailed) {
      status = "failed";
    } else if (nonCriticalFailed > 0) {
      status = "completed_with_errors";
    } else {
      status = "completed";
    }

    // Step 5: Update event status
    await this.updateEventStatus(event.eventId, status, results);

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      status,
      handlersInvoked: results.length,
      handlersSucceeded: succeeded,
      handlersFailed: failed,
      results,
    };
  }

  /**
   * Invoke handlers in parallel batches.
   *
   * DBOS durability: Each invokeHandler is a @DBOS.step(), so individual
   * handler invocations are durable. Batch coordination stays in workflow code
   * (no @DBOS.step here) to avoid nested steps and keep determinism clear.
   *
   * @param stopOnBatchFailure - If true, don't start next batch if current has failures.
   *                             NOTE: Within a batch, all handlers run to completion
   *                             (Promise.all waits for all). This is "fail-fast between
   *                             batches", not instant abort.
   */
  private async invokeHandlersBatch(
    event: DomainEvent,
    handlers: HandlerInfo[],
    options: { stopOnBatchFailure: boolean }
  ): Promise<HandlerInvocationResult[]> {
    const results: HandlerInvocationResult[] = [];
    const limit = Math.max(1, EventDispatchWorkflow.CONCURRENCY_LIMIT);

    // Process in batches of CONCURRENCY_LIMIT
    for (let i = 0; i < handlers.length; i += limit) {
      const batch = handlers.slice(i, i + limit);

      // Execute batch in parallel (all handlers in batch run to completion)
      const batchPromises = batch.map((handler) =>
        this.invokeHandlerSafe(event, handler)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Stop before next batch if any handler failed
      if (options.stopOnBatchFailure) {
        const failed = batchResults.some((r) => r.status === "failed");
        if (failed) {
          // Don't start next batch, but current batch already completed
          break;
        }
      }
    }

    return results;
  }

  /**
   * Safe wrapper that never throws (for Promise.all).
   *
   * Transient failures are retried inside the invokeHandler @DBOS.step()
   * according to its retry policy. If retries are exhausted, we treat the
   * handler as failed and continue the workflow.
   */
  private async invokeHandlerSafe(
    event: DomainEvent,
    handler: HandlerInfo
  ): Promise<HandlerInvocationResult> {
    try {
      return await this.invokeHandler(event, handler);
    } catch (error) {
      // Any error here means the step failed after retries (if configured)
      return {
        service: handler.service,
        action: handler.action,
        critical: handler.critical,
        status: "failed",
        idempotentReplay: false,
        error: String(error),
        durationMs: 0,
      };
    }
  }

  @DBOS.step()
  private async persistEvent(event: DomainEvent): Promise<void> {
    const ctx = buildEventHandlerContext(event, "events", "persistEvent");

    await this.broker.call("events.persistEvent", {
      payload: event,
      ctx,
    });
  }

  @DBOS.step()
  private async discoverHandlers(eventType: string): Promise<HandlerInfo[]> {
    const response = await this.broker.call("bootstrap.getEventHandlers", {
      eventType,
    });

    return response.result?.handlers ?? [];
  }

  /**
   * Invoke a single handler.
   *
   * Idempotency:
   * - ctx.idempotencyKey = event:{type}:{eventId}:{service}:{action}
   * - Handler service checks processed_requests table
   * - Same event + same service = execute once
   */
  @DBOS.step({
    maxAttempts: 5,
    intervalSeconds: 0.5,
    backoffRate: 2,
  })
  private async invokeCriticalHandler(
    event: DomainEvent,
    handler: HandlerInfo
  ): Promise<HandlerInvocationResult> {
    return this.invokeHandlerInner(event, handler);
  }

  @DBOS.step({
    maxAttempts: 2,
    intervalSeconds: 2,
    backoffRate: 1.5,
  })
  private async invokeBestEffortHandler(
    event: DomainEvent,
    handler: HandlerInfo
  ): Promise<HandlerInvocationResult> {
    return this.invokeHandlerInner(event, handler);
  }

  private async invokeHandler(
    event: DomainEvent,
    handler: HandlerInfo
  ): Promise<HandlerInvocationResult> {
    if (handler.critical) {
      return this.invokeCriticalHandler(event, handler);
    }
    return this.invokeBestEffortHandler(event, handler);
  }

  private async invokeHandlerInner(
    event: DomainEvent,
    handler: HandlerInfo
  ): Promise<HandlerInvocationResult> {
    const startTime = Date.now();

    // Build idempotency context
    // Key includes: eventType, eventId, service, action
    const ctx = buildEventHandlerContext(
      event,
      handler.service,
      handler.action
    );

    // Call handler action with standard ActionRequest
    const response: ActionResponse<unknown> = await this.broker.call(
      `${handler.service}.${handler.action}`,
      {
        payload: { event },
        ctx,
      }
    );

    const durationMs = Date.now() - startTime;

    // Handle response using standard ActionResponse contract
    if (response.error) {
      // Retryable error → throw so DBOS retries the step
      if (response.error.retryable) {
        throw new Error(`TRANSIENT: ${response.error.message}`);
      }

      // Non-retryable error → permanent failure
      return {
        service: handler.service,
        action: handler.action,
        critical: handler.critical,
        status: "failed",
        idempotentReplay: false,
        error: response.error.message,
        durationMs,
      };
    }

    // Success (may be idempotent replay)
    return {
      service: handler.service,
      action: handler.action,
      critical: handler.critical,
      status: "success",
      idempotentReplay: response.meta?.idempotent ?? false,
      durationMs,
    };
  }

  @DBOS.step()
  private async updateEventStatus(
    eventId: string,
    status: EventDispatchResult["status"],
    results: HandlerInvocationResult[]
  ): Promise<void> {
    await this.broker.call("events.updateEventStatus", {
      eventId,
      status,
      handlerResults: results,
    });
  }
}

interface HandlerInfo {
  service: string;
  action: string;
  critical: boolean;
}
```

#### DBOS guarantees / assumptions

- `EventDispatchWorkflow.dispatch` is a workflow, not a step; only deterministic coordination (fan-out, batching) is performed inside it.
- `invokeHandler` is the only durable `@DBOS.step()` for each handler invocation.
  - Any retry (transient) happens inside `invokeCriticalHandler`/`invokeBestEffortHandler` according to the step retry policy; after retries are exhausted, the step is considered failed and the workflow moves on.
- Parallelism is implemented at the workflow level (`Promise.all` over steps), not inside a step — this is important for correctness and execution transparency.
- Step launch order is stabilized: handlers are sorted deterministically (critical → service → action).
- For additional resilience, `Promise.all` can be replaced with `Promise.allSettled`, but in the current form `invokeHandlerSafe` ensures that a batch won't fail due to one handler's error.

#### Retry policies per handler criticality

```typescript
// packages/events/src/retry.ts
export const RetryPolicies = {
  CRITICAL: {
    maxAttempts: 5,
    intervalSeconds: 0.5,
    backoffRate: 2,
  },
  BEST_EFFORT: {
    maxAttempts: 2,
    intervalSeconds: 2,
    backoffRate: 1.5,
  },
} satisfies Record<string, RetryPolicy>;
```

```typescript
// packages/events/src/workflows/EventDispatchWorkflow.ts
@DBOS.step({ maxAttempts: 5, intervalSeconds: 0.5, backoffRate: 2 })
private async invokeCriticalHandler(event: DomainEvent, handler: HandlerInfo) {
  return this.invokeHandlerInner(event, handler);
}

@DBOS.step({ maxAttempts: 2, intervalSeconds: 2, backoffRate: 1.5 })
private async invokeBestEffortHandler(event: DomainEvent, handler: HandlerInfo) {
  return this.invokeHandlerInner(event, handler);
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
  const payloadHash = sha256(canonicalJson({ event }));

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

Event handlers are **regular Actions** using the same `ActionRequest`/`ActionResponse` contract from the idempotency framework.

### 4.1 BrokerActions with Event Handlers

```typescript
// services/inventory/src/InventoryBrokerActions.ts

import { Action, BrokerActions } from "@shopana/shared-kernel";
import {
  type ActionRequest,
  type ActionResponse,
  OperationPresets,
  withIdempotency,
} from "@shopana/idempotency";
import type { ProductCreatedEvent, ProductDeletedEvent } from "@shopana/events";

export class InventoryBrokerActions extends BrokerActions {

  // ═══════════════════════════════════════════════════════════════════
  // EVENT HANDLERS — regular Actions with payload: { event: DomainEvent }
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Handle product.created: Initialize inventory record.
   *
   * Called from EventDispatchWorkflow with idempotency context:
   * - source: "workflow"
   * - idempotencyKey: event:product.created:{eventId}:inventory:handleProductCreated
   */
  @Action("handleProductCreated", { operation: OperationPresets.CREATE })
  async handleProductCreated(
    input: ActionRequest<{ event: ProductCreatedEvent }>
  ): Promise<ActionResponse<void>> {
    const { payload, ctx } = this.unwrapRequest(input);

    return withIdempotency(ctx, payload, this.idempotencyHelpers, async (p) => {
      const { productId, storeId, sku } = p.event.payload;

      await this.kernel.runScript(InitializeInventoryScript, {
        productId,
        storeId,
        sku: sku ?? productId,
        initialQuantity: 0,
      });

      // void return = success
    });
  }

  /**
   * Handle product.deleted: Remove inventory record.
   *
   * Idempotent: deleting non-existent inventory is OK.
   */
  @Action("handleProductDeleted", { operation: OperationPresets.DELETE })
  async handleProductDeleted(
    input: ActionRequest<{ event: ProductDeletedEvent }>
  ): Promise<ActionResponse<void>> {
    const { payload, ctx } = this.unwrapRequest(input);

    return withIdempotency(ctx, payload, this.idempotencyHelpers, async (p) => {
      const { productId, storeId } = p.event.payload;

      await this.kernel.runScript(DeleteInventoryScript, {
        productId,
        storeId,
      });
    });
  }

  /**
   * Handle product.updated: Sync inventory metadata.
   *
   * Returns data (not void) — framework caches for replay.
   */
  @Action("handleProductUpdated", { operation: OperationPresets.UPDATE })
  async handleProductUpdated(
    input: ActionRequest<{ event: ProductUpdatedEvent }>
  ): Promise<ActionResponse<{ synced: boolean; updatedFields: string[] }>> {
    const { payload, ctx } = this.unwrapRequest(input);

    return withIdempotency(ctx, payload, this.idempotencyHelpers, async (p) => {
      const { productId, changes } = p.event.payload;

      const updatedFields = await this.kernel.runScript(SyncInventoryMetadataScript, {
        productId,
        changes,
      });

      // Return data = cached for idempotent replay
      return { synced: true, updatedFields };
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // REGULAR ACTIONS — for comparison, same structure
  // ═══════════════════════════════════════════════════════════════════

  @Action("getStock", { operation: OperationPresets.READ })
  async getStock(payload: { productId: string }): Promise<ActionResponse<Stock>> {
    // READ — no idempotency
    const stock = await this.kernel.runScript(GetStockScript, payload);
    return { result: stock };
  }

  @Action("setStock", { operation: OperationPresets.UPDATE })
  async setStock(
    input: ActionRequest<{ productId: string; quantity: number }>
  ): Promise<ActionResponse<Stock>> {
    const { payload, ctx } = this.unwrapRequest(input);

    return withIdempotency(ctx, payload, this.idempotencyHelpers, async (p) => {
      return this.kernel.runScript(SetStockScript, p);
    });
  }
}
```

### 4.2 Error Handling in Event Handlers

```typescript
/**
 * Errors are handled the same way as in any Action:
 * - throw → withIdempotency catches → ActionResponse.error
 * - TRANSIENT_* errors → DBOS retry
 * - Domain errors → fail permanently
 */

@Action("handleProductCreated", { operation: OperationPresets.CREATE })
async handleProductCreated(
  input: ActionRequest<{ event: ProductCreatedEvent }>
): Promise<ActionResponse<void>> {
  const { payload, ctx } = this.unwrapRequest(input);

  return withIdempotency(ctx, payload, this.idempotencyHelpers, async (p) => {
    try {
      await this.kernel.runScript(InitializeInventoryScript, {
        productId: p.event.payload.productId,
        // ...
      });
    } catch (error) {
      // Duplicate key = already initialized, idempotently OK
      if (isDuplicateKeyError(error)) {
        return; // Success (void)
      }

      // Connection error = transient, DBOS will retry
      if (isConnectionError(error)) {
        throw ServiceError.transient("inventory", "handleProductCreated", String(error));
      }

      // Validation error = permanent failure
      if (isValidationError(error)) {
        throw ServiceError.validation("inventory", "handleProductCreated", String(error));
      }

      // Unknown = internal error
      throw error;
    }
  });
}
```

### 4.3 Unified Contract: Events vs Direct Calls

```typescript
// ═══════════════════════════════════════════════════════════════════
// Event handlers and regular actions use the SAME contract
// ═══════════════════════════════════════════════════════════════════

// Call from EventDispatchWorkflow:
await broker.call("inventory.handleProductCreated", {
  payload: { event: productCreatedEvent },
  ctx: buildEventHandlerContext(event, "inventory", "handleProductCreated"),
});

// Call from another workflow:
await broker.call("inventory.setStock", {
  payload: { productId: "123", quantity: 100 },
  ctx: buildActionContext(dedupeKey, "inventory", "setStock", callId, payload),
});

// Call from GraphQL (with client idempotency key):
await broker.call("orders.createOrder", {
  payload: orderInput,
  ctx: buildClientActionContext(clientKey, "orders", "createOrder", orderInput),
});

// Response is always the same:
interface ActionResponse<T> {
  result: T;
  error?: ActionError;
  meta?: { idempotent?: boolean; attempt?: number; receipt?: ActionReceipt };
}
```

---

## Part 5: Event Handler Registration (Bootstrap)

### 5.1 Service Registration

**Note**: `GlobalEventHandlerRegistry` is in-memory. All services must register on startup.
If `discoverHandlers` returns 0 for a fresh event, consider a short backoff/retry to
avoid false "completed (0 handlers)" due to bootstrap restarts.

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
import { type ActionResponse, OperationPresets } from "@shopana/idempotency";
import { globalEventRegistry } from "./EventHandlerRegistry.js";

export class BootstrapBrokerActions extends BrokerActions {

  /**
   * Register an event handler (called by services on startup).
   *
   * READ operation — registration is idempotent by nature (deduped in registry).
   */
  @Action("registerEventHandler", { operation: OperationPresets.READ })
  async registerEventHandler(params: {
    service: string;
    action: string;
    eventType: string;
    critical: boolean;
  }): Promise<ActionResponse<{ registered: boolean }>> {
    globalEventRegistry.register(params);
    return { result: { registered: true } };
  }

  /**
   * Get handlers for an event type (called by EventDispatchWorkflow).
   */
  @Action("getEventHandlers", { operation: OperationPresets.READ })
  async getEventHandlers(params: {
    eventType: string;
  }): Promise<ActionResponse<{
    handlers: Array<{ service: string; action: string; critical: boolean }>;
  }>> {
    const handlers = globalEventRegistry.getHandlers(params.eventType as any);
    return {
      result: {
        handlers: handlers.map((h) => ({
          service: h.service,
          action: h.action,
          critical: h.critical,
        })),
      },
    };
  }

  /**
   * Get full registry state (for debugging).
   */
  @Action("getEventRegistry", { operation: OperationPresets.READ })
  async getEventRegistry(): Promise<ActionResponse<{ registry: Record<string, any[]> }>> {
    return { result: { registry: globalEventRegistry.export() } };
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
  -- 'pending': event created, not yet dispatching
  -- 'dispatching': workflow started, handlers being invoked
  -- 'completed': all handlers succeeded
  -- 'completed_with_errors': critical handlers OK, some non-critical failed
  -- 'failed': at least one critical handler failed
  status TEXT NOT NULL DEFAULT 'pending',
  dispatch_started_at TIMESTAMPTZ,
  dispatch_completed_at TIMESTAMPTZ,

  -- Handler results (per-handler outcomes)
  handler_results JSONB,  -- Array of HandlerInvocationResult

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT domain_events_status_chk
    CHECK (status IN ('pending', 'dispatching', 'completed', 'completed_with_errors', 'failed'))
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
import {
  type ActionRequest,
  type ActionResponse,
  OperationPresets,
  withIdempotency,
} from "@shopana/idempotency";

export class EventStoreBrokerActions extends BrokerActions {

  /**
   * Persist an event (idempotent).
   *
   * Uses standard ActionRequest/ActionResponse contract.
   * Status "dispatching" means the dispatch workflow has started.
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
  @Action("updateEventStatus", { operation: OperationPresets.UPDATE })
  async updateEventStatus(
    input: ActionRequest<{
      eventId: string;
      status: "completed" | "completed_with_errors" | "failed";
      handlerResults: HandlerInvocationResult[];
    }>
  ): Promise<ActionResponse<{ updated: boolean }>> {
    const { payload } = this.unwrapRequest(input);

    await this.db.update(domainEvents)
      .set({
        status: payload.status,
        dispatchCompletedAt: new Date(),
        handlerResults: payload.handlerResults,
        updatedAt: new Date(),
      })
      .where(eq(domainEvents.eventId, payload.eventId));

    return { result: { updated: true } };
  }

  /**
   * Get events for replay (e.g., new service catching up).
   *
   * READ operation — no idempotency.
   */
  @Action("getEventsForReplay", { operation: OperationPresets.READ })
  async getEventsForReplay(params: {
    eventTypes: string[];
    since: string;
    limit: number;
  }): Promise<ActionResponse<{ events: DomainEvent[] }>> {
    const events = await this.db.query.domainEvents.findMany({
      where: and(
        inArray(domainEvents.eventType, params.eventTypes),
        gte(domainEvents.timestamp, new Date(params.since))
      ),
      orderBy: asc(domainEvents.timestamp),
      limit: params.limit,
    });

    return {
      result: {
        events: events.map((e) => ({
          eventId: e.eventId,
          eventType: e.eventType as any,
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
      },
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

### 7.2 Parallel Execution with Critical/Non-Critical

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PARALLEL EXECUTION MODEL                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Configuration:                                                             │
│  ┌────────────────┬──────────┬─────────────────────────────────────────┐    │
│  │ Handler        │ Critical │ Failure behavior                        │    │
│  ├────────────────┼──────────┼─────────────────────────────────────────┤    │
│  │ inventory      │ true     │ Stop after batch, skip Phase 2          │    │
│  │ pricing        │ true     │ Stop after batch, skip Phase 2          │    │
│  │ search         │ false    │ Best-effort: log error, continue        │    │
│  │ notifications  │ false    │ Best-effort: log error, continue        │    │
│  │ analytics      │ false    │ Best-effort: log error, continue        │    │
│  └────────────────┴──────────┴─────────────────────────────────────────┘    │
│                                                                             │
│  CONCURRENCY_LIMIT = 5 (configurable)                                       │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  Execution semantics:                                                       │
│                                                                             │
│  • Within a batch: Promise.all — all handlers run to completion             │
│  • Between batches: Check for failures, stop if critical failed             │
│  • NOT instant abort (JS doesn't support true cancellation)                 │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  Phase 1: Critical handlers (parallel batch, stop-on-failure)               │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │  Batch 1 (up to CONCURRENCY_LIMIT):                     │                │
│  │  ┌──────────────┐  ┌──────────────┐                     │                │
│  │  │  inventory   │  │   pricing    │   ← parallel        │                │
│  │  │    ✅        │  │     ✅       │   (both complete)   │                │
│  │  └──────────────┘  └──────────────┘                     │                │
│  │                                                         │                │
│  │  All OK → proceed to Phase 2                            │                │
│  │  Any FAIL → skip next batches & Phase 2                 │                │
│  └─────────────────────────────────────────────────────────┘                │
│                          │                                                  │
│                          ▼                                                  │
│  Phase 2: Non-critical handlers (parallel batch, best-effort)               │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │  Batch 1:                                               │                │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │                │
│  │  │   search     │  │ notifications│  │  analytics   │   │                │
│  │  │    ❌        │  │     ✅       │  │     ✅       │   │                │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │                │
│  │                                                         │                │
│  │  Failures logged, all batches continue                  │                │
│  └─────────────────────────────────────────────────────────┘                │
│                                                                             │
│  Result: status = "completed_with_errors"                                   │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  Scenario: Critical fails — batch completes, then stops                     │
│                                                                             │
│  Phase 1: Critical handlers                                                 │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │  Batch 1:                                               │                │
│  │  ┌──────────────┐  ┌──────────────┐                     │                │
│  │  │  inventory   │  │   pricing    │                     │                │
│  │  │    ✅        │  │     ❌       │  ← fails            │                │
│  │  │  (100ms)     │  │   (50ms)     │                     │                │
│  │  └──────────────┘  └──────────────┘                     │                │
│  │                                                         │                │
│  │  Promise.all waits for BOTH to complete (100ms total)   │                │
│  │  Then sees failure → don't start Batch 2 or Phase 2     │                │
│  └─────────────────────────────────────────────────────────┘                │
│                                                                             │
│  Phase 2: SKIPPED                                                           │
│                                                                             │
│  Result: status = "failed"                                                  │
│                                                                             │
│  Note: inventory still completed even though pricing failed.                │
│  This is fine — handlers should be idempotent anyway.                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Ordering Considerations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ORDERING: WHEN DOES IT MATTER?                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Q: Do handlers need to execute in specific order?                          │
│                                                                             │
│  A: Usually NO — each handler is independent:                               │
│     • inventory.handleProductCreated — creates inventory record             │
│     • search.handleProductCreated — indexes for search                      │
│     • pricing.handleProductCreated — creates default price                  │
│                                                                             │
│     These don't depend on each other → parallel is safe.                    │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  EXCEPTION: When ordering matters                                           │
│                                                                             │
│  If handler B depends on handler A's result:                                │
│  • Use workflow steps instead of event handlers                             │
│  • Or model as separate events: A emits event → B handles that event        │
│                                                                             │
│  Example:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ BAD: pricing depends on inventory                               │        │
│  │                                                                 │        │
│  │ product.created                                                 │        │
│  │   ├── inventory.handle (creates stock record)                   │        │
│  │   └── pricing.handle (needs stock to calculate price) ← RACE!   │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ GOOD: separate events                                           │        │
│  │                                                                 │        │
│  │ product.created                                                 │        │
│  │   └── inventory.handle → creates stock → emits inventory.ready  │        │
│  │                                                                 │        │
│  │ inventory.ready                                                 │        │
│  │   └── pricing.handle (now stock exists)                         │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  Rule: Handlers for same event should be INDEPENDENT.                       │
│  If they're not → use event chaining or workflow steps.                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.4 Failure & Retry Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FAILURE & RECOVERY FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Scenario: Transient error (DBOS retries)                                   │
│                                                                             │
│  1. EventDispatchWorkflow running...                                        │
│     │                                                                       │
│     ├──[Step]─► invokeHandler(event, inventory)                             │
│     │           │                                                           │
│     │           ▼                                                           │
│     │           inventory.handleProductCreated(event)                       │
│     │           Returns: { error: { code: "TRANSIENT_ERROR", ... } }        │
│     │           │                                                           │
│     │           │  ┌───────────────────────────────────────────┐            │
│     │           │  │ ActionResponse.error.retryable = true     │            │
│     │           │  │ → throw Error("TRANSIENT: ...")           │            │
│     │           │  │ → DBOS Step Retry Policy kicks in         │            │
│     │           │  └───────────────────────────────────────────┘            │
│     │           │                                                           │
│     ├──[Retry 1]─► invokeHandler(event, inventory) ❌ FAILS                 │
│     ├──[Retry 2]─► invokeHandler(event, inventory) ✅ SUCCESS               │
│     │                                                                       │
│     └──► Continue with remaining handlers...                                │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  Scenario: Non-retryable error on critical handler                          │
│                                                                             │
│     ├──[Step]─► invokeHandler(event, pricing)  // critical=true             │
│     │           │                                                           │
│     │           ▼                                                           │
│     │           pricing.handleProductCreated(event)                         │
│     │           Returns: { error: { code: "VALIDATION_ERROR", ... } }       │
│     │           │                                                           │
│     │           │  ┌───────────────────────────────────────────┐            │
│     │           │  │ ActionResponse.error.retryable = false    │            │
│     │           │  │ → return { status: "failed", ... }        │            │
│     │           │  │ → critical handler failed                 │            │
│     │           │  │ → STOP DISPATCH (fail-fast)               │            │
│     │           │  └───────────────────────────────────────────┘            │
│     │                                                                       │
│     └──► Event status = "failed", remaining handlers SKIPPED                │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  Scenario: Service crashes mid-workflow                                     │
│                                                                             │
│  1. EventDispatchWorkflow running...                                        │
│     ├──[Step]─► invokeHandler(event, inventory) ✅                          │
│     ├──[Step]─► invokeHandler(event, search)                                │
│     │           💥 SERVICE CRASHES                                          │
│     │                                                                       │
│  2. Service restarts...                                                     │
│     │                                                                       │
│     │  ┌───────────────────────────────────────────┐                        │
│     │  │ DBOS Workflow Recovery:                   │                        │
│     │  │ - Detects incomplete workflow             │                        │
│     │  │ - Resumes from last completed step        │                        │
│     │  └───────────────────────────────────────────┘                        │
│     │                                                                       │
│     ├──[Step]─► invokeHandler(event, search)                                │
│     │           Idempotency check: NOT FOUND → execute                      │
│     │                                                                       │
│     └──[Complete]─► Workflow completes                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.5 Idempotent Replay (Duplicate Event)

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
│  DBOS.startWorkflow(EventDispatchWorkflow, { workflowID: "event:dispatch:...evt-123" }) │
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
│  │  │ - Handler returns successfully (void)     │                           │
│  │  │ - ActionResponse: { result: undefined }   │                           │
│  │  └───────────────────────────────────────────┘                           │
│  │                                                                          │
│  └──► Handler succeeds (idempotent at domain level)                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.6 Unified Contract Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     UNIFIED CONTRACT: ActionRequest → ActionResponse        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. GraphQL API (source: "client")                                          │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ request = {                                                      │    │
│     │   payload: { name: "Widget", price: 100 },                       │    │
│     │   ctx: {                                                         │    │
│     │     source: "client",                                            │    │
│     │     idempotencyKey: hash("tenant:apiKey:user-provided-key"),     │    │
│     │     ...                                                          │    │
│     │   }                                                              │    │
│     │ }                                                                │    │
│     │                                                                  │    │
│     │ response = { result: { productId: "p-123" } }                    │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  2. Workflow Step (source: "workflow")                                      │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ request = {                                                      │    │
│     │   payload: { storeId: "s-1", roles: [...] },                     │    │
│     │   ctx: {                                                         │    │
│     │     source: "workflow",                                          │    │
│     │     idempotencyKey: hash("store:create:org-1:my-store:iam:..."), │    │
│     │     workflowId: "store:create:org-1:my-store",                   │    │
│     │     stepId: "createRoles",                                       │    │
│     │     ...                                                          │    │
│     │   }                                                              │    │
│     │ }                                                                │    │
│     │                                                                  │    │
│     │ response = { result: { rolesCreated: 3 } }                       │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  3. Event Handler (source: "workflow")                                      │
│     ┌──────────────────────────────────────────────────────────────────┐    │
│     │ request = {                                                      │    │
│     │   payload: { event: ProductCreatedEvent },  // ← Event in payload │    │
│     │   ctx: {                                                         │    │
│     │     source: "workflow",                                          │    │
│     │     idempotencyKey: hash("event:product.created:evt-1:inv:..."), │    │
│     │     workflowId: "event:dispatch:product.created:evt-1",          │    │
│     │     stepId: "invoke:inventory:handleProductCreated",             │    │
│     │     ...                                                          │    │
│     │   }                                                              │    │
│     │ }                                                                │    │
│     │                                                                  │    │
│     │ response = { result: undefined }  // void handler                │    │
│     │ // or                                                             │    │
│     │ response = { result: { stockInitialized: true } }                │    │
│     └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  ALL THREE SCENARIOS:                                                       │
│  - Use ActionRequest<T> / ActionResponse<R>                                 │
│  - Use ActionContextV3                                                      │
│  - Use withIdempotency() wrapper                                            │
│  - Use processed_requests table                                             │
│  - Only differ in source and idempotencyKey formula                         │
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

## Part 9: Idempotency Source for Events

### 9.1 Why `source: "workflow"`

Of the three source types in the idempotency framework (`client`, `workflow`, `content`), `workflow` is used for event handlers:

```typescript
// packages/events/src/context.ts

export function buildEventHandlerContext(
  event: DomainEvent,
  service: string,
  action: string,
  operation: OperationConfig = OperationPresets.CREATE
): ActionContextV3 {
  return {
    version: 3,
    source: "workflow",  // ← This source

    // Key structure: event:{eventType}:{eventId}:{service}:{action}
    idempotencyKey: sha256(
      `event:${event.eventType}:${event.eventId}:${service}:${action}`
    ),

    // Payload hash for conflict detection
    payloadHash: sha256(canonicalJson({ event })),

    // Workflow context
    workflowId: EventDispatchWorkflow.workflowID(event),
    stepId: `invoke:${service}:${action}`,
    callId: event.eventId,

    // Standard fields
    service,
    action,
    operation,
    tenantId: event.context.tenantId,
    traceId: event.context.correlationId,
  };
}
```

### 9.2 Comparison of Source Types

| Aspect | `client` | `workflow` | `content` |
|--------|----------|------------|-----------|
| Key source | HTTP header | Workflow context | Payload hash |
| Use case | External API | Internal workflows, **events** | Idempotent updates |
| Key formula | `tenant:apiKey:clientKey` | `workflowId:stepId:callId` | `resourceId:operation:payloadHash` |
| For events | ❌ No header | ✅ Called from workflow | ❌ Different payload = different key |

### 9.3 Why Not `content`?

```typescript
// ❌ PROBLEM with content source:

// Event 1: product.created, eventId="evt-123"
// payload: { productId: "p1", name: "Widget", timestamp: "2024-01-01T10:00:00Z" }
// contentKey = hash(payload) = "abc123"

// Event 2: same product.created, eventId="evt-123" (retry/duplicate)
// payload: { productId: "p1", name: "Widget", timestamp: "2024-01-01T10:00:01Z" }
//                                              ^^^ timestamp changed
// contentKey = hash(payload) = "def456" ← DIFFERENT KEY!

// Result: handler executes twice — NOT exactly-once!

// ✅ With workflow source:

// Event 1: eventId="evt-123"
// workflowKey = hash("event:product.created:evt-123:inventory:handleProductCreated")

// Event 2: eventId="evt-123" (duplicate)
// workflowKey = hash("event:product.created:evt-123:inventory:handleProductCreated")
//              ^^^ SAME KEY (eventId is the same)

// Result: handler executes once — exactly-once!
```

### 9.4 Operation Presets for Event Handlers

We use standard presets from the idempotency framework:

```typescript
import { OperationPresets } from "@shopana/idempotency";

// Event handlers use the same presets:

@Action("handleProductCreated", { operation: OperationPresets.CREATE })
// CREATE: full idempotency tracking, 24h TTL, cache result

@Action("handleProductDeleted", { operation: OperationPresets.DELETE })
// DELETE: idempotent by nature, 24h TTL, receipt only

@Action("handleProductUpdated", { operation: OperationPresets.UPDATE })
// UPDATE: allowSamePayloadRetry=true, 1h TTL

@Action("handleOrderNotification", { operation: OperationPresets.ASYNC_JOB })
// ASYNC_JOB: fire-and-forget, 7d TTL, receipt only
```

### 9.5 Custom Presets for Event Handlers (optional)

```typescript
// packages/events/src/presets.ts

import { OperationPresets, type OperationConfig } from "@shopana/idempotency";

/**
 * Extended presets for event handlers with longer TTLs.
 * (Events need longer audit trail)
 */
export const EventHandlerPresets = {
  /** Standard event handler — creates data */
  STANDARD: {
    ...OperationPresets.CREATE,
    ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days (longer for audit)
  },

  /** Sync handler — updates data */
  SYNC: {
    ...OperationPresets.UPDATE,
    ttlMs: 24 * 60 * 60 * 1000,
  },

  /** Cleanup handler — deletes data */
  CLEANUP: {
    ...OperationPresets.DELETE,
    ttlMs: 7 * 24 * 60 * 60 * 1000,
  },

  /** Notification handler — fire-and-forget */
  NOTIFY: {
    ...OperationPresets.ASYNC_JOB,
    ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days for audit
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
    intervalSeconds: 1,
    backoffRate: 2,
  },

  /**
   * Aggressive retry - for critical handlers.
   */
  CRITICAL: {
    maxAttempts: 5,
    intervalSeconds: 0.5,
    backoffRate: 2,
  },

  /**
   * Lenient retry - for non-critical handlers.
   */
  BEST_EFFORT: {
    maxAttempts: 2,
    intervalSeconds: 2,
    backoffRate: 1.5,
  },

  /**
   * No retry - fail immediately.
   */
  NONE: {
    maxAttempts: 1,
    intervalSeconds: 0,
    backoffRate: 1,
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

  // Dispatch workflow - by status
  "events.dispatch.started": "Dispatch workflows started",
  "events.dispatch.completed": "Completed (all handlers OK)",
  "events.dispatch.completed_with_errors": "Completed with non-critical failures",
  "events.dispatch.failed": "Failed (critical handler failed)",
  "events.dispatch.duration_ms": "Dispatch workflow duration",

  // Handler invocation - by criticality
  "events.handler.invoked": "Handler invocations",
  "events.handler.invoked.critical": "Critical handler invocations",
  "events.handler.invoked.non_critical": "Non-critical handler invocations",
  "events.handler.succeeded": "Handler successes",
  "events.handler.failed.critical": "Critical handler failures (cause event failure)",
  "events.handler.failed.non_critical": "Non-critical failures (event continues)",
  "events.handler.skipped": "Handlers skipped (due to fail-fast)",
  "events.handler.idempotent_replay": "Idempotent replays",
  "events.handler.duration_ms": "Handler execution duration",

  // Retry metrics
  "events.handler.retried": "Handler retries (transient errors)",
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

### Unified Contract

Event-driven architecture is **fully built on the idempotency framework**:

| Component | Uses From Idempotency Framework |
|-----------|--------------------------------|
| Handler signature | `ActionRequest<{ event: TEvent }>` → `ActionResponse<TResult>` |
| Idempotency context | `ActionContextV3` with `source: "workflow"` |
| Execution wrapper | `withIdempotency()` helper |
| Storage | `processed_requests` table |
| Operation config | `OperationPresets.CREATE/UPDATE/DELETE/ASYNC_JOB` |

### Architecture Overview

| Aspect | Implementation |
|--------|----------------|
| Event Definition | Typed `DomainEvent<TType, TPayload>` with context |
| Event Emission | `EventEmitter.emit()` starts durable workflow |
| Durability | DBOS workflow guarantees delivery |
| Fan-out | Parallel batches (CONCURRENCY_LIMIT=5) |
| Idempotency Source | `source: "workflow"` (not `content`!) |
| Idempotency Key | `event:{eventType}:{eventId}:{service}:{action}` |
| Handler Contract | Standard `ActionRequest`/`ActionResponse` |
| Handler Registration | Service startup registration to bootstrap |
| Critical Handlers | Stop after batch: failure skips remaining, event = "failed" |
| Non-critical Handlers | Best-effort: failure logged, event = "completed_with_errors" |
| Event Status | `completed` / `completed_with_errors` / `failed` |
| Retry | DBOS step retry policies (transient errors only) |
| Audit | `domain_events` table with handler results |

### Key Design Decisions

1. **Unified contract** — Events use the same `ActionRequest`/`ActionResponse` as API/workflows
2. **`source: "workflow"`** — Key depends on `eventId`, not payload (exactly-once per event)
3. **No Outbox** — delivery is guaranteed only when emit is from DBOS workflow/step after durable DB transaction
4. **Handlers = Actions** — Event handlers are regular `@Action` methods
5. **Parallel fan-out** — Handlers are invoked in parallel batches (CONCURRENCY_LIMIT=5)
6. **Critical vs Non-critical** — Stop-on-failure for critical, best-effort for non-critical
7. **Independent handlers** — Handlers for the same event should not depend on each other

### Benefits

1. **Simple Mental Model**: Event → Workflow → Handlers (all use same contract)
2. **Guaranteed Delivery**: DBOS workflow durability
3. **Exactly-Once per Service**: Idempotency framework with `source: "workflow"`
4. **No New Abstractions**: Reuses existing `ActionRequest`/`ActionResponse`
5. **Parallel Execution**: Batched concurrent handler invocation (configurable limit)
6. **Granular Failure Handling**: Critical (stop-on-failure) vs non-critical (best-effort)
7. **Clear Event Status**: `completed` / `completed_with_errors` / `failed`
8. **Full Audit Trail**: `domain_events` + `processed_requests` tables
9. **No Infrastructure Overhead**: No separate message queue needed

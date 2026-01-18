# DBOS Workflow Idempotency Architecture

**Date**: 2025-01-18

## Overview

This document describes how to add idempotency support to DBOS workflows when calling external services via `ServiceBroker`. The goal is to make workflow retries and recovery safe without duplicate side effects.

## Current Architecture

### Existing Patterns

**1. ServiceBroker** (`packages/shared-kernel/src/broker/ServiceBroker.ts`)

```typescript
// Current: Direct broker calls in workflows
await this.broker.call("iam.createRoles", { ... });
await this.broker.call("media.createAssetGroup", { ... });
```

**2. BrokerActions** (`services/*/src/*BrokerActions.ts`)

Each service exposes actions via `@Action` decorator:

```typescript
// services/iam/src/IamBrokerActions.ts
@Action("createRoles")
async createRoles(params: CreateRolesParams): Promise<CreateRolesResult> {
  return this.kernel.runScript(CreateRolesScript, params);
}
```

**3. StoreCreateWorkflow** (`services/project/src/workflows/StoreCreateWorkflow.ts`)

Current implementation directly uses `this.broker.call()`:

```typescript
@DBOS.step()
async createRoles(storeId: string, organizationId: string, userId: string) {
  const result = await this.broker.call("iam.createRoles", { ... });
  if (!result.success) throw new Error(result.error);
}
```

### Problems with Current Approach

1. **No idempotency**: Retries can create duplicate data
2. **Hard to test**: Need full broker setup for unit tests
3. **No context passing**: No standard way to pass operation ID for deduplication
4. **Inconsistent error handling**: Some actions return `{success, error}`, others throw

---

## Proposed Architecture

### Core Abstractions

#### 1. ActionContext (Idempotency & Tracing)

```typescript
// packages/workflows/src/types.ts

export interface ActionContext {
  /** Schema version for future compatibility */
  version: 1;

  /**
   * Unique identifier for this workflow execution instance.
   *
   * | Concept | Purpose | Format | Source |
   * |---------|---------|--------|--------|
   * | `dedupeKey` | Prevent duplicate business operations | Human-readable: `store:create:my-store` | `Workflow.workflowID(input)` static method |
   * | `executionId` | Track calls within ONE execution | UUID: `019234ab-...` | Generated in first @DBOS.step() |
   *
   * IMPLEMENTATION:
   * - Generate UUID in first `@DBOS.step()` (result is saved by DBOS)
   * - Pass `executionId` explicitly to all subsequent methods that need it
   * - NEVER store in mutable class state (`this.executionId = ...`)
   */
  executionId: string;

  /** Target service name */
  service: string;

  /** Action being called */
  action: string;

  /**
   * Deterministic call identifier.
   * MUST be derived from workflow input or saved step results.
   * Used to distinguish multiple calls to same action within one workflow.
   */
  callId: string;

  /**
   * Unique key for idempotency lookup.
   * Generated as SHA-256 hash of: executionId + service + action + callId
   */
  idempotencyKey: string;

  /** Optional: Distributed tracing ID (observability only) */
  traceId?: string;
}
```

#### 2. ActionRequest / ActionResponse

```typescript
// packages/workflows/src/types.ts

/**
 * Standard request envelope for all service calls.
 */
export interface ActionRequest<T = unknown> {
  payload: T;
  ctx: ActionContext;
}

/**
 * Standard response envelope.
 */
export interface ActionResponse<T = unknown> {
  result: T;
  error?: ActionError;
  meta?: {
    /** True if this was a duplicate request (idempotent replay) */
    idempotent?: boolean;
  };
}

export interface ActionError {
  code: string;
  message: string;
  retryable?: boolean;
}
```

#### 3. ServiceError

```typescript
// packages/workflows/src/types.ts

/**
 * Error codes convention:
 *
 * RETRYABLE (workflow will be restarted):
 * - TRANSIENT_*: Temporary failures (timeout, unavailable, in-progress)
 *
 * NOT RETRYABLE (fail immediately):
 * - VALIDATION_*: Bad input
 * - NOT_FOUND: Resource doesn't exist
 * - CONFLICT: Already exists
 * - INTERNAL_*: Logic error
 */
export class ServiceError extends Error {
  public readonly retryable: boolean;

  constructor(
    public readonly service: string,
    public readonly action: string,
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
    retryable?: boolean
  ) {
    super(`[${service}.${action}] ${message}`);
    this.name = "ServiceError";
    this.retryable = retryable ?? code.startsWith("TRANSIENT_");
  }

  static transient(service: string, action: string, message: string, cause?: unknown): ServiceError {
    return new ServiceError(service, action, "TRANSIENT_ERROR", message, cause, true);
  }

  static validation(service: string, action: string, message: string): ServiceError {
    return new ServiceError(service, action, "VALIDATION_ERROR", message, undefined, false);
  }

  static notFound(service: string, action: string, message: string): ServiceError {
    return new ServiceError(service, action, "NOT_FOUND", message, undefined, false);
  }

  static conflict(service: string, action: string, message: string): ServiceError {
    return new ServiceError(service, action, "CONFLICT", message, undefined, false);
  }
}

/**
 * Shape-based type guard for ServiceError.
 * Use this instead of `instanceof` for cross-package compatibility.
 */
export function isServiceError(error: unknown): error is ServiceError {
  if (error === null || typeof error !== "object") return false;
  const obj = error as Record<string, unknown>;
  return (
    obj.name === "ServiceError" &&
    typeof obj.service === "string" &&
    typeof obj.action === "string" &&
    typeof obj.code === "string" &&
    typeof obj.message === "string" &&
    typeof obj.retryable === "boolean"
  );
}
```

---

## Context Builder

```typescript
// packages/workflows/src/context.ts

import crypto from "node:crypto";

export function buildActionContext(
  executionId: string,
  service: string,
  action: string,
  callId: string,
  traceId?: string
): ActionContext {
  if (!executionId || !isUUID(executionId)) {
    throw new Error(`executionId must be a valid UUID, got: "${executionId}"`);
  }

  if (!callId || !callId.trim()) {
    throw new Error(`callId is required for ${service}.${action}`);
  }

  const idempotencyKey = hashIdempotencyKey(executionId, service, action, callId);

  return {
    version: 1,
    executionId,
    service,
    action,
    callId,
    idempotencyKey,
    traceId,
  };
}

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function hashIdempotencyKey(executionId: string, service: string, action: string, callId: string): string {
  const data = [executionId, service, action, callId].join("\n");
  return crypto.createHash("sha256").update(data).digest("hex");
}
```

---

## Refactored Workflow

### Key Changes

1. Each external service call is a **separate `@DBOS.step()`** for proper retry isolation
2. Uses `callId` for idempotency when calling same action type multiple times
3. `executionId` generated in first step and passed explicitly
4. Broker calls wrapped with `ActionContext`

```typescript
// services/project/src/workflows/StoreCreateWorkflow.ts

import { DBOS } from "@dbos-inc/dbos-sdk";
import { v7 as uuidv7 } from "uuid";
import { buildActionContext } from "@shopana/workflows";
import type { ActionRequest } from "@shopana/workflows";

export class StoreCreateWorkflow extends ConfiguredInstance {
  constructor(
    name: string,
    private readonly kernel: Kernel,
    private readonly broker: ServiceBroker
  ) {
    super(name);
  }

  static workflowID(name: string): string {
    return `store:create:${name}`;
  }

  @DBOS.workflow()
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    const { organizationId, userId } = input;

    // Step 0: Get execution ID (saved by DBOS, stable on recovery)
    const { executionId } = await this.initExecution();

    // Step 1: Generate store ID (deterministic on recovery)
    const storeId = await this.generateStoreId();

    // Step 2: Create store in local database
    await this.createStore(storeId, input, organizationId);

    // Step 3: Create roles for this store domain
    await this.createStoreRoles(executionId, storeId, organizationId, userId);

    // Step 4: Assign admin role to creator
    await this.assignAdminRole(executionId, storeId, organizationId, userId);

    // Step 5: Create media asset group
    await this.createMediaAssetGroup(executionId, storeId);

    return { storeId, organizationId };
  }

  @DBOS.step()
  private async initExecution(): Promise<{ executionId: string }> {
    return { executionId: uuidv7() };
  }

  @DBOS.step()
  private async generateStoreId(): Promise<string> {
    return uuidv7();
  }

  @DBOS.step()
  private async createStore(storeId: string, input: StoreCreateInput, organizationId: string) {
    return this.kernel.getServices().repository.store.create({
      id: storeId,
      organizationId,
      name: input.name,
      displayName: input.displayName,
      locales: input.locales,
      currencies: input.currencies,
      defaultCurrency: input.defaultCurrency,
      status: input.status,
      timezone: input.timezone,
      email: input.email,
    });
  }

  @DBOS.step()
  private async createStoreRoles(executionId: string, storeId: string, organizationId: string, userId: string) {
    const ctx = buildActionContext(executionId, "iam", "createRoles", storeId);

    const request: ActionRequest = {
      payload: {
        userId,
        organizationId,
        domain: `store:${storeId}`,
        roles: buildStoreRoles(),
      },
      ctx,
    };

    const result = await this.broker.call("iam.createRoles", request);

    if (result.error) {
      throw new ServiceError(
        "iam",
        "createRoles",
        result.error.code,
        result.error.message,
        undefined,
        result.error.retryable
      );
    }
  }

  @DBOS.step()
  private async assignAdminRole(executionId: string, storeId: string, organizationId: string, userId: string) {
    const ctx = buildActionContext(executionId, "iam", "assignRole", `${storeId}:admin:${userId}`);

    const request: ActionRequest = {
      payload: {
        userId,
        organizationId,
        domain: `store:${storeId}`,
        roleName: "admin",
      },
      ctx,
    };

    const result = await this.broker.call("iam.assignRole", request);

    if (result.error) {
      throw new ServiceError(
        "iam",
        "assignRole",
        result.error.code,
        result.error.message,
        undefined,
        result.error.retryable
      );
    }
  }

  @DBOS.step()
  private async createMediaAssetGroup(executionId: string, storeId: string) {
    const ctx = buildActionContext(executionId, "media", "createAssetGroup", storeId);

    const request: ActionRequest = {
      payload: {
        ownerType: "store",
        ownerId: storeId,
      },
      ctx,
    };

    const result = await this.broker.call("media.createAssetGroup", request);

    if (result.error) {
      throw new ServiceError(
        "media",
        "createAssetGroup",
        result.error.code,
        result.error.message,
        undefined,
        result.error.retryable
      );
    }
  }
}
```

---

## Service-Side: Idempotency Implementation

### Database Table

```sql
-- In each service's migrations
CREATE TABLE IF NOT EXISTS processed_requests (
  idempotency_key TEXT PRIMARY KEY,

  -- Components for debugging/querying
  execution_id TEXT NOT NULL,
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  call_id TEXT NOT NULL,

  -- Result caching (opt-in)
  result JSONB,
  result_cached BOOLEAN NOT NULL DEFAULT FALSE,

  -- Status for atomic reservation
  status TEXT NOT NULL DEFAULT 'reserved',  -- 'reserved' | 'completed' | 'failed'

  -- Retry tracking
  attempt INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_processed_requests_created_at ON processed_requests(created_at);
CREATE INDEX idx_processed_requests_execution_id ON processed_requests(execution_id);
CREATE INDEX idx_processed_requests_status ON processed_requests(status);
```

### Updated BrokerActions Pattern

```typescript
// services/iam/src/IamBrokerActions.ts

@Injectable()
export class IamBrokerActions extends BrokerActions {

  @Action("createRoles")
  async createRoles(
    input: ActionRequest<CreateRolesPayload> | CreateRolesPayload
  ): Promise<ActionResponse<CreateRolesResult>> {
    const { payload, ctx } = this.unwrapRequest(input);

    // No context = legacy call, execute directly
    if (!ctx) {
      const result = await this.kernel.runScript(CreateRolesScript, payload);
      return { result };
    }

    // Step 1: Try to reserve idempotency key
    const canExecute = await this.reserveIdempotencyKey(ctx);

    if (!canExecute) {
      const existing = await this.getIdempotencyRecord(ctx.idempotencyKey);

      if (existing?.status === 'completed') {
        return {
          result: existing.result_cached ? existing.result : { success: true },
          meta: { idempotent: true },
        };
      }

      if (existing?.status === 'reserved') {
        return {
          result: null as any,
          error: {
            code: "TRANSIENT_IN_PROGRESS",
            message: "Request already in progress",
            retryable: true,
          },
        };
      }

      // Status is 'failed' - claim for retry
      const claimed = await this.claimFailedIdempotencyKey(ctx.idempotencyKey);
      if (!claimed) {
        return {
          result: null as any,
          error: {
            code: "TRANSIENT_IN_PROGRESS",
            message: "Request retry already in progress",
            retryable: true,
          },
        };
      }
    }

    // Step 2: Execute
    try {
      const result = await this.kernel.runScript(CreateRolesScript, payload);
      await this.completeIdempotencyKey(ctx.idempotencyKey, result);
      return { result };
    } catch (error) {
      await this.failIdempotencyKey(ctx.idempotencyKey, String(error));
      throw error;
    }
  }

  private unwrapRequest<T>(input: ActionRequest<T> | T): { payload: T; ctx?: ActionContext } {
    if (input && typeof input === "object" && "payload" in input && "ctx" in input) {
      return input as ActionRequest<T>;
    }
    return { payload: input as T };
  }

  private async reserveIdempotencyKey(ctx: ActionContext): Promise<boolean> {
    const result = await this.db.execute(sql`
      INSERT INTO processed_requests (idempotency_key, execution_id, service, action, call_id, status)
      VALUES (${ctx.idempotencyKey}, ${ctx.executionId}, ${ctx.service}, ${ctx.action}, ${ctx.callId}, 'reserved')
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING idempotency_key
    `);
    return (result.rowCount ?? 0) > 0;
  }

  private async claimFailedIdempotencyKey(idempotencyKey: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      UPDATE processed_requests
      SET status = 'reserved', attempt = attempt + 1, updated_at = NOW()
      WHERE idempotency_key = ${idempotencyKey} AND status = 'failed'
      RETURNING idempotency_key
    `);
    return (result.rowCount ?? 0) > 0;
  }

  private async completeIdempotencyKey(idempotencyKey: string, result?: unknown): Promise<void> {
    await this.db
      .update(processedRequests)
      .set({
        status: 'completed',
        result: result ?? null,
        resultCached: result !== undefined,
        completedAt: new Date(),
      })
      .where(eq(processedRequests.idempotencyKey, idempotencyKey));
  }

  private async failIdempotencyKey(idempotencyKey: string, errorInfo?: string): Promise<void> {
    await this.db
      .update(processedRequests)
      .set({
        status: 'failed',
        lastError: errorInfo ?? null,
        updatedAt: new Date(),
      })
      .where(eq(processedRequests.idempotencyKey, idempotencyKey));
  }
}
```

### TTL Cleanup Job

```typescript
// packages/shared-kernel/src/jobs/ProcessedRequestsCleanupJob.ts

@Injectable()
export class ProcessedRequestsCleanupJob {
  private readonly logger = new Logger(ProcessedRequestsCleanupJob.name);

  constructor(private readonly db: DrizzleDatabase) {}

  /**
   * Run daily at 3 AM. Delete completed/failed records older than 7 days.
   * NEVER delete 'reserved' records.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanup(): Promise<void> {
    const retentionDays = 7;
    const batchSize = 1000;
    let totalDeleted = 0;

    while (true) {
      const result = await this.db.execute(sql`
        DELETE FROM processed_requests
        WHERE idempotency_key IN (
          SELECT idempotency_key FROM processed_requests
          WHERE status IN ('completed', 'failed')
            AND created_at < NOW() - INTERVAL '${retentionDays} days'
          LIMIT ${batchSize}
        )
        RETURNING idempotency_key
      `);

      const deleted = result.rowCount ?? 0;
      totalDeleted += deleted;

      if (deleted < batchSize) break;
    }

    this.logger.log(`Cleanup completed: deleted ${totalDeleted} records`);
  }
}
```

---

## Determinism Rules

**Any non-deterministic operation MUST be inside a `@DBOS.step()`.**

```typescript
// CORRECT - uuid generated in step, result saved by DBOS
@DBOS.step()
async generateStoreId(): Promise<string> {
  return uuidv7();
}

// WRONG - uuid in workflow body
@DBOS.workflow()
async run() {
  const id = uuidv7();  // Different on recovery!
}
```

### callId Rules

**Rule 1: callId MUST be deterministic**

Use only values from workflow input or results of previous `@DBOS.step()` calls.

```typescript
// WRONG - different key on recovery
await this.broker.call("iam.createRoles", {
  payload,
  ctx: buildActionContext(executionId, "iam", "createRoles", crypto.randomUUID())
});

// CORRECT - deterministic from saved state
await this.broker.call("iam.createRoles", {
  payload,
  ctx: buildActionContext(executionId, "iam", "createRoles", storeId)
});
```

**Rule 2: callId must distinguish parallel calls to same action**

```typescript
// Two calls to same action need different callIds
await this.broker.call("iam.assignRole", {
  payload: { userId: user1, ... },
  ctx: buildActionContext(executionId, "iam", "assignRole", `${storeId}:${user1}`)
});

await this.broker.call("iam.assignRole", {
  payload: { userId: user2, ... },
  ctx: buildActionContext(executionId, "iam", "assignRole", `${storeId}:${user2}`)
});
```

---

## Error Handling

### Retry Strategy: Workflow-Level Restart

Retries happen at the **workflow level**:
1. Step throws `ServiceError`
2. Workflow fails
3. External orchestrator restarts workflow
4. DBOS replays completed steps
5. Failed step is re-executed

### Forbidden Patterns

| Pattern | Problem |
|---------|---------|
| `setTimeout`/`sleep()` in step | Non-deterministic on recovery |
| `this.x = ...` inside step | Side effect doesn't replay |
| Retry loops inside step | Inconsistent state on recovery |

### Retry Decision Matrix

| Error Code | `retryable` | Behavior |
|------------|-------------|----------|
| `TRANSIENT_*` | `true` | Workflow restart with backoff |
| `VALIDATION_*` | `false` | Fail immediately |
| `NOT_FOUND` | `false` | Fail immediately |
| `CONFLICT` | `false` | Fail immediately |
| `INTERNAL_*` | `false` | Fail immediately |

---

## Migration Path

### Phase 1: Add Types and Context Builder

1. Create `packages/workflows/src/types.ts` with `ActionContext`, `ActionRequest`, `ActionResponse`, `ServiceError`
2. Create `packages/workflows/src/context.ts` with `buildActionContext()`

### Phase 2: Update Workflows

1. Add `initExecution()` step to generate `executionId`
2. Split multi-call steps into individual `@DBOS.step()` methods
3. Wrap broker calls with `ActionRequest` envelope

### Phase 3: Add Service-Side Idempotency

1. Create `processed_requests` table in each service
2. Update `BrokerActions` to handle `ActionRequest` envelope
3. Implement idempotency check/store logic
4. Add cleanup job

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Service calls | `broker.call("iam.action", params)` | `broker.call("iam.action", { payload, ctx })` |
| Idempotency | None | `processed_requests` table with atomic reservation |
| Context | None | `ActionContext` with executionId, callId, idempotencyKey |
| Error handling | Mixed `{success, error}` | Always `ActionResponse` with `error.retryable` |
| Retry | Unpredictable | Workflow restart, completed steps skipped |

### Files to Create

```
packages/workflows/src/
├── types.ts           # ActionContext, ActionRequest, ActionResponse, ServiceError
├── context.ts         # buildActionContext()
└── index.ts

packages/shared-kernel/src/jobs/
└── ProcessedRequestsCleanupJob.ts
```

### Files to Modify

```
services/project/src/workflows/
└── StoreCreateWorkflow.ts    # Use ActionRequest envelope, separate steps

services/*/src/*BrokerActions.ts  # Accept ActionRequest, implement idempotency
```

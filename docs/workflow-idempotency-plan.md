# DBOS Workflow Idempotency Architecture

**Author**: Generated from existing codebase patterns
**Date**: 2025-01-18
**Last Updated**: 2025-01-18

## Overview

This document describes how to add idempotency support to DBOS workflows when calling external services via `ServiceBroker`. The goal is to make workflow retries and recovery safe without duplicate side effects.

**Key insight**: Workflows need to pass context (execution ID, call ID) to services so they can deduplicate requests.

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
   * ⚠️ CRITICAL DISTINCTION:
   *
   * | Concept | Purpose | Format | Source |
   * |---------|---------|--------|--------|
   * | `dedupeKey` | Prevent duplicate business operations | Human-readable: `store:create:my-store` | `Workflow.workflowID(input)` static method |
   * | `executionId` | Track calls within ONE execution | UUID: `019234ab-...` | Generated in first @DBOS.step() and passed explicitly |
   *
   * IMPLEMENTATION:
   * - Generate UUID in first `@DBOS.step()` (result is saved by DBOS)
   * - Pass `executionId` explicitly to all subsequent methods that need it
   * - NEVER store in mutable class state (`this.executionId = ...`)
   *
   * WHY explicit passing instead of class state?
   * - Mutable state inside `@DBOS.step()` is a side effect that won't replay
   * - Calling `buildContext()` before `initExecution()` would silently fail
   * - Explicit parameter makes dependencies visible and testable
   */
  executionId: string;  // MUST be UUID, passed explicitly from initExecution() result

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
   * This avoids delimiter collision issues with raw concatenation.
   */
  idempotencyKey: string;

  /**
   * Optional: Distributed tracing ID.
   * Used for observability only, NOT for business logic.
   * May differ on retry/recovery.
   */
  traceId?: string;

  /**
   * DEPRECATED/REMOVED: Do not use timestamp field.
   *
   * WHY: Timestamps are non-deterministic and break workflow recovery.
   * - new Date() returns different values on replay
   * - Services should NOT compare/rely on this value
   * - Causes subtle bugs when services use it for ordering/validation
   *
   * If you need timestamps for observability:
   * - Log them separately (not in ActionContext)
   * - Use DBOS-provided execution timestamps
   */
  // timestamp?: string;  // INTENTIONALLY REMOVED
}
```

#### 2. ActionRequest / ActionResponse (Explicit Envelope)

```typescript
// packages/workflows/src/types.ts

/**
 * Standard request envelope for all service calls.
 * Keeps payload clean and ctx standardized.
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
  /** Explicit retryable flag. If not set, derived from code prefix. */
  retryable?: boolean;
}
```

#### 3. ServiceError

```typescript
// packages/workflows/src/types.ts

/**
 * Error codes convention:
 *
 * RETRYABLE (DBOS will retry with backoff):
 * - TRANSIENT_ERROR        : Generic transient failure
 * - TRANSIENT_TIMEOUT      : Request timed out
 * - TRANSIENT_UNAVAILABLE  : Service temporarily unavailable
 * - TRANSIENT_IN_PROGRESS  : Idempotency check - another request is processing
 *
 * NOT RETRYABLE (fail immediately):
 * - VALIDATION_*           : Bad input, schema violation
 * - VALIDATION_UNKNOWN_ACTION : Action doesn't exist
 * - NOT_FOUND              : Resource doesn't exist
 * - CONFLICT               : Already exists, duplicate (but completed)
 * - INTERNAL_*             : Invariant violated, logic error
 * - INTERNAL_ERROR         : Unknown/unexpected error
 *
 * RULE: Only codes starting with "TRANSIENT_" are auto-retryable.
 * All other codes cause immediate failure (no retry).
 */
export class ServiceError extends Error {
  public readonly retryable: boolean;

  constructor(
    public readonly service: string,
    public readonly action: string,
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
    retryable?: boolean  // Explicit override
  ) {
    super(`[${service}.${action}] ${message}`);
    this.name = "ServiceError";

    // Only TRANSIENT_* is retryable by default
    // Can be explicitly overridden via parameter
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

  static unknownAction(service: string, action: string): ServiceError {
    return new ServiceError(service, action, "VALIDATION_UNKNOWN_ACTION", `Unknown action: ${action}`, undefined, false);
  }

  /** Format for logging/aggregation */
  toJSON() {
    return {
      name: this.name,
      service: this.service,
      action: this.action,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
    };
  }
}

/**
 * Shape-based type guard for ServiceError.
 *
 * WHY NOT instanceof?
 * - ServiceError may be defined in multiple packages (workflows, shared-kernel)
 * - instanceof checks fail across package boundaries (different class instances)
 * - Shape checking works regardless of where the error was created
 *
 * This function should be used EVERYWHERE instead of `instanceof ServiceError`.
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
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { ActionContext } from "./types.js";

/**
 * Build ActionContext for a service call.
 *
 * @param executionId - UUID from initExecution() step result (passed explicitly!)
 * @param service - Target service name
 * @param action - Action being called
 * @param callId - REQUIRED: Unique identifier for this specific call.
 *                 MUST be deterministic (derived from workflow input or saved step results).
 *                 Examples: storeId, `${storeId}:${userId}`, `${orderId}:${itemId}`
 */
export function buildActionContext(
  executionId: string,
  service: string,
  action: string,
  callId: string
): ActionContext {
  // Validate executionId
  if (!executionId || !isUUID(executionId)) {
    throw new Error(
      `executionId must be a valid UUID, got: "${executionId}". ` +
      `Pass the result from initExecution() explicitly.`
    );
  }

  // Validate callId is provided and non-empty
  if (!callId || !callId.trim()) {
    throw new Error(`callId is required and must be deterministic for ${service}.${action}`);
  }

  // Generate idempotency key as SHA-256 hash to avoid delimiter collisions
  const idempotencyKey = hashIdempotencyKey(executionId, service, action, callId);

  return {
    version: 1,
    executionId,
    service,
    action,
    callId,
    idempotencyKey,
    // traceId is for observability only, may differ on recovery
    // This is acceptable - it's not used for business logic
    traceId: DBOS.traceId,
    // NOTE: Do NOT add timestamp here - it's non-deterministic
  };
}

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Generate SHA-256 hash for idempotency key.
 * Using hash avoids issues with delimiter collisions in component values.
 */
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
3. No if-checks for errors - throw `ServiceError` on failure
4. `executionId` generated in first step and passed explicitly (not stored in class state)

```typescript
// services/project/src/workflows/StoreCreateWorkflow.ts

import { DBOS, ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import { v7 as uuidv7 } from "uuid";
import { buildActionContext, ServiceError, isServiceError } from "@shopana/workflows";
import type { ActionRequest } from "@shopana/workflows";
import { Roles, RolesMeta } from "@shopana/rbac";
import type { Kernel } from "../kernel/Kernel.js";
import type { StoreCreateInput, StoreCreateOutput } from "./types.js";

function buildStoreRoles() {
  return (Object.keys(Roles.store) as Array<keyof typeof Roles.store>).map((roleName) => {
    const permissions = Roles.store[roleName];
    const meta = RolesMeta.store[roleName];
    return {
      name: roleName,
      displayName: meta.displayName,
      description: meta.description,
      permissions: permissions.map((p) => ({
        resource: p.resource,
        action: p.action,
      })),
    };
  });
}

export class StoreCreateWorkflow extends ConfiguredInstance {
  constructor(
    name: string,
    private readonly kernel: Kernel,
    private readonly broker: ServiceBroker
  ) {
    super(name);
  }

  protected get repository() {
    return this.kernel.getServices().repository;
  }

  static workflowID(name: string): string {
    return `store:create:${name}`;
  }

  @DBOS.workflow()
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    const { organizationId, userId } = input;

    // Step 0: MANDATORY - get execution ID for idempotency
    // Pass executionId explicitly to all subsequent steps that need it
    const { executionId } = await this.initExecution();

    // Step 1: Generate store ID (deterministic on recovery)
    const storeId = await this.generateStoreId();

    // Step 2: Create store in local database
    await this.createStore(storeId, input, organizationId);

    // Step 3: Create roles for this store domain
    // Note: executionId passed explicitly, NOT stored in class state
    await this.createStoreRoles(executionId, storeId, organizationId, userId);

    // Step 4: Assign admin role to creator
    await this.assignAdminRole(executionId, storeId, organizationId, userId);

    // Step 5: Create media asset group
    await this.createMediaAssetGroup(executionId, storeId);

    return { storeId, organizationId };
  }

  /**
   * MANDATORY: Call this as the FIRST step in every workflow.
   *
   * Returns executionId that is:
   * - UUID format (not human-readable)
   * - Stable across recovery (saved by DBOS step)
   * - Different from deduplication key (workflowID)
   *
   * ⚠️ DO NOT store in class state (`this.executionId = ...`) - that's a side effect
   * that won't replay on recovery!
   */
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
    return this.repository.store.create({
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

  /**
   * Step: Create roles for store domain.
   * Uses storeId as callId since this is store-scoped.
   */
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

    const response = await this.broker.call<ActionResponse>("iam.createRoles", request);

    if (response.error) {
      throw new ServiceError(
        "iam",
        "createRoles",
        response.error.code,
        response.error.message,
        undefined,
        response.error.retryable
      );
    }
  }

  /**
   * Step: Assign admin role to store creator.
   * Uses composite callId since we might assign roles to multiple users.
   */
  @DBOS.step()
  private async assignAdminRole(executionId: string, storeId: string, organizationId: string, userId: string) {
    // callId includes userId in case we assign multiple roles to different users
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

    const response = await this.broker.call<ActionResponse>("iam.assignRole", request);

    if (response.error) {
      throw new ServiceError(
        "iam",
        "assignRole",
        response.error.code,
        response.error.message,
        undefined,
        response.error.retryable
      );
    }
  }

  /**
   * Step: Create media asset group for this store.
   */
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

    const response = await this.broker.call<ActionResponse>("media.createAssetGroup", request);

    if (response.error) {
      throw new ServiceError(
        "media",
        "createAssetGroup",
        response.error.code,
        response.error.message,
        undefined,
        response.error.retryable
      );
    }
  }
}
```

---

## Service-Side: Handling ActionRequest

Services need to accept the new `ActionRequest` envelope format.

### Dispatcher Error Handling (Centralized)

**CRITICAL**: The dispatcher MUST wrap ALL errors (including unknown actions) in `ActionResponse` format.
Raw exceptions must NEVER escape as the main response path.

```typescript
// In ActionRegistry or ServiceBroker dispatcher
async dispatch(qualifiedAction: string, request: ActionRequest): Promise<ActionResponse> {
  try {
    const handler = this.registry.resolve(qualifiedAction);

    if (!handler) {
      // Unknown action - return error response (NOT throw)
      return {
        result: null,
        error: {
          code: "VALIDATION_UNKNOWN_ACTION",
          message: `Unknown action: ${qualifiedAction}`,
          retryable: false,
        },
      };
    }

    // Execute handler - MUST return ActionResponse
    const result = await handler(request);

    // Validate response format
    if (!this.isActionResponse(result)) {
      throw new Error(
        `Handler for ${qualifiedAction} returned invalid format. ` +
        `Expected ActionResponse { result, error? }, got: ${JSON.stringify(result)?.slice(0, 100)}.`
      );
    }

    return result;

  } catch (error) {
    // Convert ALL exceptions to ActionResponse.error
    return this.errorToResponse(qualifiedAction, error);
  }
}

/**
 * Convert any thrown error to ActionResponse format.
 * Use isServiceError() shape check, NOT instanceof.
 */
private errorToResponse(qualifiedAction: string, error: unknown): ActionResponse {
  if (isServiceError(error)) {
    return {
      result: null,
      error: {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
      },
    };
  }

  // Structured error with code
  if (this.isStructuredError(error)) {
    return {
      result: null,
      error: {
        code: error.code,
        message: error.message,
        retryable: error.retryable ?? false,
      },
    };
  }

  // Unknown error - INTERNAL, not retryable
  return {
    result: null,
    error: {
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : String(error),
      retryable: false,
    },
  };
}

private isStructuredError(error: unknown): error is { code: string; message: string; retryable?: boolean } {
  if (error === null || typeof error !== "object") return false;
  const obj = error as Record<string, unknown>;
  return typeof obj.code === "string" && typeof obj.message === "string";
}
```

### Updated BrokerActions Pattern

```typescript
// Example: services/iam/src/IamBrokerActions.ts

import { Injectable } from "@nestjs/common";
import { BrokerActions, Action } from "@shopana/shared-kernel";
import type { ActionRequest, ActionResponse, ActionContext } from "@shopana/workflows";

@Injectable()
export class IamBrokerActions extends BrokerActions {

  @Action("createRoles")
  async createRoles(
    input: ActionRequest<CreateRolesPayload> | CreateRolesPayload
  ): Promise<ActionResponse<CreateRolesResult>> {
    // Unwrap envelope if present
    const { payload, ctx } = this.unwrapRequest(input);

    // No context = legacy call, execute directly
    if (!ctx) {
      const result = await this.kernel.runScript(CreateRolesScript, payload);
      return { result };
    }

    // Idempotency check
    const canExecute = await this.reserveIdempotencyKey(ctx);

    if (!canExecute) {
      const existing = await this.getIdempotencyRecord(ctx.idempotencyKey);

      if (existing?.status === 'completed') {
        return {
          result: existing.resultCached ? existing.result : { success: true },
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

    // Execute
    try {
      const result = await this.kernel.runScript(CreateRolesScript, payload);
      await this.completeIdempotencyKey(ctx.idempotencyKey, result);
      return { result };
    } catch (error) {
      await this.failIdempotencyKey(ctx.idempotencyKey, String(error));
      throw error;
    }
  }

  /**
   * Unwrap ActionRequest envelope or pass through legacy payload.
   */
  private unwrapRequest<T>(input: ActionRequest<T> | T): { payload: T; ctx?: ActionContext } {
    if (input && typeof input === "object" && "payload" in input && "ctx" in input) {
      return input as ActionRequest<T>;
    }
    return { payload: input as T };
  }
}
```

---

## Idempotency Support

### Database Table

```sql
-- In each service's migrations
CREATE TABLE IF NOT EXISTS processed_requests (
  -- SHA-256 hash of (execution_id, service, action, call_id)
  idempotency_key TEXT PRIMARY KEY,

  -- Store components separately for debugging/querying
  execution_id TEXT NOT NULL,
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  call_id TEXT NOT NULL,

  -- Result caching is OPT-IN (see guidelines below)
  result JSONB,
  result_cached BOOLEAN NOT NULL DEFAULT FALSE,

  -- Status for atomic reservation pattern
  status TEXT NOT NULL DEFAULT 'reserved',  -- 'reserved' | 'completed' | 'failed'

  -- Retry tracking (no deletion on failure - preserves audit trail)
  attempt INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,  -- Error info from last failed attempt

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,  -- Last status change
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_processed_requests_created_at ON processed_requests(created_at);
CREATE INDEX idx_processed_requests_execution_id ON processed_requests(execution_id);
CREATE INDEX idx_processed_requests_lookup ON processed_requests(service, action, call_id);
CREATE INDEX idx_processed_requests_status ON processed_requests(status);
```

### Idempotency Helper Methods

```typescript
// In BrokerActions base class or mixin

/**
 * Atomic insert with ON CONFLICT DO NOTHING.
 * Returns true if we reserved the key, false if it already exists.
 */
async reserveIdempotencyKey(ctx: ActionContext): Promise<boolean> {
  const result = await this.db.execute(sql`
    INSERT INTO processed_requests (idempotency_key, execution_id, service, action, call_id, status, attempt)
    VALUES (${ctx.idempotencyKey}, ${ctx.executionId}, ${ctx.service}, ${ctx.action}, ${ctx.callId}, 'reserved', 1)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING idempotency_key
  `);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get existing idempotency record.
 */
async getIdempotencyRecord(idempotencyKey: string): Promise<ProcessedRequest | null> {
  return this.db.query.processedRequests.findFirst({
    where: eq(processedRequests.idempotencyKey, idempotencyKey),
  });
}

/**
 * Atomically claim a failed record for retry (NO DELETE - preserves audit).
 */
async claimFailedIdempotencyKey(idempotencyKey: string): Promise<boolean> {
  const result = await this.db.execute(sql`
    UPDATE processed_requests
    SET status = 'reserved',
        attempt = attempt + 1,
        updated_at = NOW()
    WHERE idempotency_key = ${idempotencyKey}
      AND status = 'failed'
    RETURNING idempotency_key
  `);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Mark as completed.
 * IMPORTANT: Use ORM for JSONB serialization, not raw SQL interpolation.
 */
async completeIdempotencyKey(idempotencyKey: string, result?: unknown, cacheResult = false): Promise<void> {
  await this.db
    .update(processedRequests)
    .set({
      status: 'completed',
      result: cacheResult ? result : null,
      resultCached: cacheResult && result !== undefined,
      completedAt: new Date(),
    })
    .where(eq(processedRequests.idempotencyKey, idempotencyKey));
}

/**
 * Mark as failed (keeps record for retry).
 */
async failIdempotencyKey(idempotencyKey: string, errorInfo?: string): Promise<void> {
  await this.db
    .update(processedRequests)
    .set({
      status: 'failed',
      lastError: errorInfo ?? null,
      updatedAt: new Date(),
    })
    .where(eq(processedRequests.idempotencyKey, idempotencyKey));
}
```

### TTL Cleanup Job

```typescript
// packages/shared-kernel/src/jobs/ProcessedRequestsCleanupJob.ts

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { sql } from "drizzle-orm";

export interface CleanupConfig {
  /** Retention period for completed/failed records (default: 7 days) */
  retentionDays: number;
  /** Threshold for stale 'reserved' records alert (default: 1 hour) */
  staleReservedThresholdMinutes: number;
  /** Batch size for deletion (default: 1000) */
  batchSize: number;
  /** Maximum batches per single job run (default: 10) */
  maxBatchesPerRun: number;
}

const DEFAULT_CONFIG: CleanupConfig = {
  retentionDays: 7,
  staleReservedThresholdMinutes: 60,
  batchSize: 1000,
  maxBatchesPerRun: 10,
};

@Injectable()
export class ProcessedRequestsCleanupJob {
  private readonly logger = new Logger(ProcessedRequestsCleanupJob.name);
  private config: CleanupConfig;

  constructor(
    private readonly db: DrizzleDatabase,
    private readonly alertService: AlertService,
    config?: Partial<CleanupConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run cleanup daily at 3 AM.
   * CRITICAL: NEVER delete 'reserved' records - they indicate in-progress work!
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredRecords(): Promise<void> {
    let totalDeleted = 0;
    let batchesProcessed = 0;

    try {
      while (batchesProcessed < this.config.maxBatchesPerRun) {
        const result = await this.db.execute(sql`
          DELETE FROM processed_requests
          WHERE idempotency_key IN (
            SELECT idempotency_key
            FROM processed_requests
            WHERE status IN ('completed', 'failed')
              AND created_at < NOW() - MAKE_INTERVAL(days => ${this.config.retentionDays})
            LIMIT ${this.config.batchSize}
          )
          RETURNING idempotency_key
        `);

        const deletedCount = result.rowCount ?? 0;
        totalDeleted += deletedCount;
        batchesProcessed++;

        if (deletedCount < this.config.batchSize) break;
      }

      this.logger.log(`Cleanup completed: deleted ${totalDeleted} records in ${batchesProcessed} batches`);
    } catch (error) {
      this.logger.error("Cleanup failed", error);
    }
  }

  /**
   * Check for stale 'reserved' records every 15 minutes.
   * These indicate dead workers or bugs.
   */
  @Cron(CronExpression.EVERY_15_MINUTES)
  async alertStaleReservedRecords(): Promise<void> {
    try {
      const staleRecords = await this.db.execute(sql`
        SELECT idempotency_key, execution_id, service, action, created_at
        FROM processed_requests
        WHERE status = 'reserved'
          AND created_at < NOW() - MAKE_INTERVAL(mins => ${this.config.staleReservedThresholdMinutes})
        ORDER BY created_at ASC
        LIMIT 100
      `);

      if (staleRecords.rowCount && staleRecords.rowCount > 0) {
        this.logger.warn(`Found ${staleRecords.rowCount} stale 'reserved' records!`);

        await this.alertService.sendAlert({
          severity: "warning",
          title: "Stale idempotency records detected",
          message: `${staleRecords.rowCount} requests stuck in 'reserved' status`,
          data: staleRecords.rows,
        });
      }
    } catch (error) {
      this.logger.error("Stale record check failed", error);
    }
  }
}
```

### Idempotency Implementation Rules

#### Rule 1: Use Atomic Reservation Pattern (No Race Conditions)

For **commands** (write operations), use INSERT-RESERVE pattern:

1. Try to INSERT with `ON CONFLICT DO NOTHING`
2. If insert **failed** (conflict) → already processed, return success with `meta.idempotent`
3. If insert **succeeded** → execute action, then UPDATE status to 'completed'
4. On failure → UPDATE status to 'failed' (allows retry)

#### Rule 2: Domain Logic Must Be Idempotent

The underlying domain logic should handle duplicates gracefully:

```typescript
// In CreateRolesScript
async execute(params: CreateRolesPayload) {
  for (const role of params.roles) {
    // Use upsert, not insert
    await this.repo.upsertRole({
      domain: params.domain,
      name: role.name,
      // ...
    });
  }
  return { success: true };
}
```

#### Rule 3: Result Caching is Opt-In

**By default: store only the fact of processing** (no result).

Cache result (`result_cached = true`) only when:
- Action is a **query** (safe to replay cached result)
- Result is small and contains no PII/secrets
- Caller needs exact same result on retry

**Never cache result** when:
- Result contains sensitive data (tokens, passwords, PII)
- Result size is unpredictable (could be large)
- Command where "success" is sufficient response

### Idempotency Key Format

**Primary key** (`idempotency_key` column): SHA-256 hash of components.

```typescript
const data = [executionId, service, action, callId].join("\n");
const idempotencyKey = crypto.createHash("sha256").update(data).digest("hex");
```

**Human-readable components** stored in separate columns for debugging/querying:

| Column | Example Value |
|--------|---------------|
| `execution_id` | `019234ab-5678-7def-...` (UUID from initExecution()) |
| `service` | `iam` |
| `action` | `createRoles` |
| `call_id` | `store-123` |
| `idempotency_key` | `a1b2c3d4e5f6...` (64-char hex) |

**Why SHA-256?**
- Avoids delimiter collision (e.g., if callId contains `:`)
- Fixed-length key for consistent indexing
- Components stored separately for human inspection

---

## Determinism Rules (MANDATORY)

**Any non-deterministic operation (uuid, timestamp, random) MUST be inside a `@DBOS.step()`.**
The result is saved by DBOS and replayed on recovery.

```typescript
// CORRECT - uuid generated in step, result saved
@DBOS.step()
async generateStoreId(): Promise<string> {
  return uuidv7();  // Saved on first run, replayed on recovery
}

// WRONG - uuid in workflow body (not a step)
@DBOS.workflow()
async run() {
  const id = uuidv7();  // Different on recovery!
}
```

### VERIFICATION REQUIRED: DBOS Step Result Persistence

**CRITICAL**: Before using `uuidv7()` or any non-deterministic operation in a `@DBOS.step()`,
you MUST verify that your DBOS version actually saves and replays step results.

```typescript
// MANDATORY TEST - add to workflow tests
describe("DBOS step determinism", () => {
  it("replays step results on recovery", async () => {
    // 1. Start workflow, capture storeId from generateStoreId() step
    // 2. Force workflow crash/restart after step completes
    // 3. Resume workflow
    // 4. Verify generateStoreId() returns SAME value (not new UUID)
  });
});
```

### callId Rules (MANDATORY)

**Rule 1: callId MUST be deterministic**

Use only values from:
- Workflow input parameters
- Results of previous `@DBOS.step()` calls (saved by DBOS)

```typescript
// WRONG - different key on recovery
ctx: buildActionContext(executionId, "iam", "createRoles", crypto.randomUUID())

// CORRECT - deterministic from input/saved state
ctx: buildActionContext(executionId, "iam", "createRoles", storeId)
```

**Rule 2: callId must distinguish parallel calls to same action**

If you call `iam.assignRole` twice in one workflow, each needs unique callId:

```typescript
// Two calls to assignRole - different callIds
ctx: buildActionContext(executionId, "iam", "assignRole", `${storeId}:${user1}`)
ctx: buildActionContext(executionId, "iam", "assignRole", `${storeId}:${user2}`)
```

**callId patterns:**

| Scenario | callId | Example |
|----------|--------|---------|
| Single call per workflow | `entityId` | `storeId` |
| User-scoped | `${entityId}:${userId}` | `store-123:user-456` |
| Role-scoped | `${entityId}:${role}:${userId}` | `store-123:admin:user-456` |
| Item in collection | `${entityId}:${itemId}` | `order-123:item-789` |

---

## Error Handling

### Design Decision: Always Throw on Error

Workflow code should throw `ServiceError` on failure, never return error objects.

**Rationale:**
- Workflow code stays linear (no if-checks)
- DBOS step retry naturally handles transient failures
- Consistent error handling across all services
- Stack traces preserved for debugging

### Compensation Pattern

For workflows needing rollback on partial failure:

```typescript
@DBOS.workflow()
async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
  const storeId = await this.generateStoreId();

  try {
    await this.createStore(storeId, input);
    await this.createStoreRoles(storeId, input.organizationId, input.userId);
    await this.assignAdminRole(storeId, input.organizationId, input.userId);
    await this.createMediaAssetGroup(storeId);
  } catch (error) {
    await this.compensate(storeId);
    throw error;
  }

  return { storeId, organizationId: input.organizationId };
}

@DBOS.step()
private async compensate(storeId: string): Promise<void> {
  // Best-effort cleanup - don't throw on compensation failures
  await Promise.allSettled([
    this.broker.call("media.deleteAssetGroup", { ownerType: "store", ownerId: storeId }),
    this.broker.call("iam.deleteRoles", { domain: `store:${storeId}` }),
  ]);
  await this.repository.store.delete(storeId);
}
```

### Retry Strategy: Workflow-Level Restart

Retries happen at the **workflow level**, not step level:

1. Step throws `ServiceError`
2. Workflow fails
3. External orchestrator (Kubernetes, job queue) restarts workflow
4. DBOS replays completed steps (skips them)
5. Failed step is re-executed

**WHY workflow-level restart?**
- DBOS step replay makes retries safe
- Service-side idempotency (`processed_requests` table) handles duplicates
- Simple mental model: fail fast, restart clean

### ⛔ FORBIDDEN PATTERNS

| Pattern | Problem |
|---------|---------|
| `setTimeout`/`sleep()` in step | Non-deterministic, breaks recovery |
| `this.x = ...` inside step | Side effect doesn't replay |
| Retry loops inside step | Inconsistent state on recovery |
| `Promise.all` on `@DBOS.step()` methods | Unpredictable recovery |

### Retry Decision Matrix

| Error Code | `retryable` | Behavior |
|------------|-------------|----------|
| `TRANSIENT_ERROR` | `true` | Retry with backoff |
| `TRANSIENT_IN_PROGRESS` | `true` | Retry with backoff |
| `TRANSIENT_TIMEOUT` | `true` | Retry with backoff |
| `TRANSIENT_UNAVAILABLE` | `true` | Retry with backoff |
| `VALIDATION_*` | `false` | Fail immediately |
| `NOT_FOUND` | `false` | Fail immediately |
| `CONFLICT` | `false` | Fail immediately |
| `INTERNAL_*` | `false` | Fail immediately |

---

## Parallel Calls in Workflows

### CRITICAL: Don't `Promise.all` on `@DBOS.step()` Methods

**WRONG** - unpredictable recovery behavior:
```typescript
await Promise.all([
  this.stepA(),  // @DBOS.step()
  this.stepB(),  // @DBOS.step()
]);
```

### Two Safe Patterns for Parallel Calls

#### Pattern A: Fanout Inside Single Step (Recommended for parallel)

One `@DBOS.step()` that internally parallelizes broker calls:

```typescript
@DBOS.step()
private async initializeAllServices(executionId: string, storeId: string, organizationId: string, userId: string) {
  const results = await Promise.allSettled([
    this.broker.call("iam.createRoles", {
      payload: { ... },
      ctx: buildActionContext(executionId, "iam", "createRoles", storeId),
    }),
    this.broker.call("media.createAssetGroup", {
      payload: { ... },
      ctx: buildActionContext(executionId, "media", "createAssetGroup", storeId),
    }),
  ]);

  const failures = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map(r => String(r.reason));

  if (failures.length > 0) {
    throw new Error(`Initialization failed: ${failures.join("; ")}`);
  }
}
```

#### Pattern B: Sequential Steps (Simplest, Safest)

For most workflows, sequential is better:

```typescript
await this.createStoreRoles(executionId, storeId, ...);
await this.assignAdminRole(executionId, storeId, ...);
await this.createMediaAssetGroup(executionId, storeId);
```

### When to Use Each Pattern

| Pattern | Use When |
|---------|----------|
| **Sequential** | Default choice; clear ordering; dependencies between calls |
| **Fanout Step** | No dependencies; latency-sensitive; ALL calls are idempotent |

---

## Testing Workflows

### Mock Broker for Unit Tests

```typescript
// services/project/src/workflows/__tests__/StoreCreateWorkflow.test.ts

describe("StoreCreateWorkflow", () => {
  let mockBroker: jest.Mocked<ServiceBroker>;
  let workflow: StoreCreateWorkflow;

  beforeEach(() => {
    mockBroker = {
      call: jest.fn(),
    } as any;

    // Configure mock responses
    mockBroker.call.mockImplementation(async (action: string) => {
      if (action === "iam.createRoles") {
        return { result: { success: true } };
      }
      if (action === "iam.assignRole") {
        return { result: { success: true } };
      }
      if (action === "media.createAssetGroup") {
        return { result: { assetGroup: { id: "ag-123" } } };
      }
      return { error: { code: "UNKNOWN_ACTION", message: "Unknown", retryable: false } };
    });

    workflow = new StoreCreateWorkflow("test", mockKernel, mockBroker);
  });

  it("calls IAM and Media services", async () => {
    await workflow.run({
      name: "test-store",
      displayName: "Test Store",
      organizationId: "org-123",
      userId: "user-456",
    });

    expect(mockBroker.call).toHaveBeenCalledWith("iam.createRoles", expect.any(Object));
    expect(mockBroker.call).toHaveBeenCalledWith("iam.assignRole", expect.any(Object));
    expect(mockBroker.call).toHaveBeenCalledWith("media.createAssetGroup", expect.any(Object));
  });

  it("propagates service errors", async () => {
    mockBroker.call.mockResolvedValueOnce({
      error: { code: "VALIDATION_ERROR", message: "Domain already exists", retryable: false },
    });

    await expect(workflow.run({ ... })).rejects.toThrow("Domain already exists");
  });
});
```

---

## Migration Path

### Phase 1: Add Types and Context Builder

1. Create `packages/workflows/src/types.ts` with `ActionContext`, `ActionRequest`, `ActionResponse`, `ServiceError`
2. Create `packages/workflows/src/context.ts` with `buildActionContext()`
3. Export from `packages/workflows/src/index.ts`

**Result**: Types available, no behavior change.

### Phase 2: Update Workflows

1. Add `initExecution()` step to generate `executionId`
2. Split multi-call steps into individual `@DBOS.step()` methods
3. Wrap broker calls with `ActionRequest` envelope
4. Add error handling with `ServiceError`

**Result**: Workflows send context, services ignore it (backwards compatible).

### Phase 3: Add Service-Side Idempotency

1. Create `processed_requests` table in each service
2. Update `BrokerActions` to accept `ActionRequest` envelope
3. Implement idempotency check/store logic
4. Add cleanup job

**Result**: Safe retries without duplicate effects.

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Service calls | `broker.call("iam.action", params)` | `broker.call("iam.action", { payload, ctx })` |
| callId | N/A | **REQUIRED**, deterministic from input/saved state |
| executionId | N/A | **UUID** from `initExecution()` step, passed explicitly |
| Context | N/A | `ActionContext` with version, executionId, idempotencyKey, traceId |
| Idempotency | None | Services return success + `meta.idempotent` on duplicate |
| In-progress state | N/A | `TRANSIENT_IN_PROGRESS` (retryable) |
| Error handling | Return `{success, error}` | Always `ActionResponse`; only `TRANSIENT_*` retryable |
| Retry | Unpredictable | Workflow restart, DBOS replays completed steps |
| Parallel calls | Multiple `@DBOS.step()` in Promise.all | Single fanout step OR sequential steps |
| Testing | Need full broker | Mock broker interface |

### Files to Create

```
packages/workflows/src/
├── index.ts
├── types.ts              # ActionContext, ActionRequest, ActionResponse, ServiceError
└── context.ts            # buildActionContext()

packages/shared-kernel/src/jobs/
└── ProcessedRequestsCleanupJob.ts
```

### Files to Modify

```
services/project/src/workflows/
└── StoreCreateWorkflow.ts    # Use ActionRequest envelope, separate steps

services/*/src/*BrokerActions.ts  # Accept ActionRequest, implement idempotency
```

# DBOS Workflow Idempotency Architecture

**Author**: Generated from existing codebase patterns
**Date**: 2025-01-18
**Last Updated**: 2025-01-18

## Overview

This document describes how to add idempotency support to DBOS workflows when calling external services via `ServiceBroker`. The goal is to make workflow retries and recovery safe without duplicate side effects.

**Key insight**: Idempotency key must be based on **business operation identity** (`dedupeKey`), not execution instance. This ensures idempotency works even when workflow is restarted by orchestrator (new pod, new DBOS execution).

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
   * Business operation identifier - the PRIMARY key for idempotency.
   *
   * ⚠️ CRITICAL: This is what makes idempotency work across restarts!
   *
   * | Concept | Purpose | Format | Source |
   * |---------|---------|--------|--------|
   * | `dedupeKey` | Global idempotency (survives restarts) | Human-readable: `store:create:my-store` | `Workflow.workflowID(input)` |
   * | `executionId` | Tracing/diagnostics only | UUID | Optional, for debugging |
   *
   * WHY dedupeKey, not executionId?
   * - Orchestrator restarts workflow → new DBOS execution → new executionId
   * - But dedupeKey stays the same → service recognizes duplicate
   * - Manual retry with same input → same dedupeKey → idempotent
   */
  dedupeKey: string;

  /** Target service name */
  service: string;

  /** Action being called */
  action: string;

  /**
   * Deterministic call identifier within the workflow.
   * MUST be derived from workflow input or deterministic computation.
   * Used to distinguish multiple calls to same action within one workflow.
   *
   * Examples: storeId, `${storeId}:${userId}`, `${orderId}:${itemId}`
   */
  callId: string;

  /**
   * Unique key for idempotency lookup.
   * Generated as SHA-256 hash of: dedupeKey + service + action + callId
   *
   * WHY hash?
   * - Avoids delimiter collision (if callId contains `:`)
   * - Fixed-length key for consistent indexing
   * - Components stored separately for human inspection
   */
  idempotencyKey: string;

  /**
   * Optional: Current execution instance ID (for tracing/diagnostics only).
   * May differ on restart - NOT used for idempotency!
   */
  executionId?: string;

  /**
   * Optional: Distributed tracing ID.
   * Used for observability only, NOT for business logic.
   */
  traceId?: string;
}
```

#### 2. ActionRequest / ActionResponse (Explicit Envelope)

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
 *
 * RULE: Action handlers ALWAYS return ActionResponse, NEVER throw.
 * Throwing is reserved for programmer errors / invariant violations only.
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

#### 3. ServiceError (for Workflow-Side)

```typescript
// packages/workflows/src/types.ts

/**
 * Error codes convention:
 *
 * RETRYABLE (workflow will be restarted):
 * - TRANSIENT_ERROR        : Generic transient failure
 * - TRANSIENT_TIMEOUT      : Request timed out
 * - TRANSIENT_UNAVAILABLE  : Service temporarily unavailable
 * - TRANSIENT_IN_PROGRESS  : Another execution is processing (will complete soon)
 *
 * NOT RETRYABLE (fail immediately):
 * - VALIDATION_*           : Bad input, schema violation
 * - VALIDATION_UNKNOWN_ACTION : Action doesn't exist
 * - NOT_FOUND              : Resource doesn't exist
 * - CONFLICT               : Already exists, duplicate (but completed)
 * - INTERNAL_*             : Invariant violated, logic error
 *
 * RULE: Only codes starting with "TRANSIENT_" are auto-retryable.
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

  static fromActionError(service: string, action: string, error: ActionError): ServiceError {
    return new ServiceError(service, action, error.code, error.message, undefined, error.retryable);
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
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { ActionContext } from "./types.js";

/**
 * Build ActionContext for a service call.
 *
 * @param dedupeKey - Business operation ID from Workflow.workflowID(input)
 * @param service - Target service name
 * @param action - Action being called
 * @param callId - Deterministic identifier for this specific call within workflow
 * @param executionId - Optional: current execution ID for tracing (NOT for idempotency!)
 */
export function buildActionContext(
  dedupeKey: string,
  service: string,
  action: string,
  callId: string,
  executionId?: string
): ActionContext {
  if (!dedupeKey || !dedupeKey.trim()) {
    throw new Error(`dedupeKey is required for ${service}.${action}`);
  }

  if (!callId || !callId.trim()) {
    throw new Error(`callId is required and must be deterministic for ${service}.${action}`);
  }

  // Idempotency key based on BUSINESS operation, not execution instance
  const idempotencyKey = hashIdempotencyKey(dedupeKey, service, action, callId);

  return {
    version: 1,
    dedupeKey,
    service,
    action,
    callId,
    idempotencyKey,
    executionId,
    traceId: DBOS.traceId,
  };
}

/**
 * Generate SHA-256 hash for idempotency key.
 */
function hashIdempotencyKey(dedupeKey: string, service: string, action: string, callId: string): string {
  const data = [dedupeKey, service, action, callId].join("\n");
  return crypto.createHash("sha256").update(data).digest("hex");
}
```

---

## Refactored Workflow

### Key Changes

1. `dedupeKey` from `Workflow.workflowID(input)` — survives restarts
2. Each external service call is a **separate `@DBOS.step()`**
3. `callId` distinguishes multiple calls to same action
4. Check `response.error` and throw `ServiceError` for workflow control flow

```typescript
// services/project/src/workflows/StoreCreateWorkflow.ts

import { DBOS, ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import { v7 as uuidv7 } from "uuid";
import { buildActionContext, ServiceError } from "@shopana/workflows";
import type { ActionRequest, ActionResponse } from "@shopana/workflows";
import { Roles, RolesMeta } from "@shopana/rbac";
import type { Kernel } from "../kernel/Kernel.js";
import type { StoreCreateInput, StoreCreateOutput } from "./types.js";

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

  /**
   * Business operation ID - MUST be deterministic from input.
   * This is what makes idempotency work across restarts!
   */
  static workflowID(input: StoreCreateInput): string {
    return `store:create:${input.name}`;
  }

  @DBOS.workflow()
  async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
    const { organizationId, userId } = input;

    // dedupeKey is deterministic from input - survives workflow restarts
    const dedupeKey = StoreCreateWorkflow.workflowID(input);

    // Step 1: Generate store ID (deterministic on DBOS recovery)
    const storeId = await this.generateStoreId();

    // Step 2: Create store in local database
    await this.createStore(storeId, input, organizationId);

    // Step 3-5: External service calls with idempotency
    await this.createStoreRoles(dedupeKey, storeId, organizationId, userId);
    await this.assignAdminRole(dedupeKey, storeId, organizationId, userId);
    await this.createMediaAssetGroup(dedupeKey, storeId);

    return { storeId, organizationId };
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
   * callId = storeId (unique within this workflow)
   */
  @DBOS.step()
  private async createStoreRoles(dedupeKey: string, storeId: string, organizationId: string, userId: string) {
    const ctx = buildActionContext(dedupeKey, "iam", "createRoles", storeId);

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
      throw ServiceError.fromActionError("iam", "createRoles", response.error);
    }
  }

  /**
   * Step: Assign admin role to store creator.
   * callId includes userId to distinguish multiple role assignments.
   */
  @DBOS.step()
  private async assignAdminRole(dedupeKey: string, storeId: string, organizationId: string, userId: string) {
    const ctx = buildActionContext(dedupeKey, "iam", "assignRole", `${storeId}:admin:${userId}`);

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
      throw ServiceError.fromActionError("iam", "assignRole", response.error);
    }
  }

  /**
   * Step: Create media asset group for this store.
   */
  @DBOS.step()
  private async createMediaAssetGroup(dedupeKey: string, storeId: string) {
    const ctx = buildActionContext(dedupeKey, "media", "createAssetGroup", storeId);

    const request: ActionRequest = {
      payload: {
        ownerType: "store",
        ownerId: storeId,
      },
      ctx,
    };

    const response = await this.broker.call<ActionResponse>("media.createAssetGroup", request);

    if (response.error) {
      throw ServiceError.fromActionError("media", "createAssetGroup", response.error);
    }
  }
}

function buildStoreRoles() {
  return (Object.keys(Roles.store) as Array<keyof typeof Roles.store>).map((roleName) => {
    const permissions = Roles.store[roleName];
    const meta = RolesMeta.store[roleName];
    return {
      name: roleName,
      displayName: meta.displayName,
      description: meta.description,
      permissions: permissions.map((p) => ({ resource: p.resource, action: p.action })),
    };
  });
}
```

---

## Service-Side: Handling ActionRequest

### Design Rule: Never Throw, Always Return

**Action handlers ALWAYS return `ActionResponse`, NEVER throw.**

- `return { result }` — success
- `return { result: null, error: { code, message, retryable } }` — expected error
- Throwing is only for programmer errors / invariant violations (and dispatcher catches those)

This makes control flow explicit and eliminates "mixed style" confusion.

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
    const { payload, ctx } = this.unwrapRequest(input);

    // No context = legacy call, execute directly
    if (!ctx) {
      const result = await this.kernel.runScript(CreateRolesScript, payload);
      return { result };
    }

    // Try to reserve idempotency key
    const reservation = await this.tryReserveIdempotencyKey(ctx);

    if (!reservation.acquired) {
      // Key already exists - check status
      if (reservation.existing.status === 'completed') {
        return {
          result: reservation.existing.resultCached
            ? reservation.existing.result
            : { success: true },
          meta: { idempotent: true },
        };
      }

      // Status is 'reserved' - check if stale
      if (reservation.existing.status === 'reserved') {
        // Try to claim stale reservation
        const claimed = await this.tryClaimStaleReservation(ctx.idempotencyKey);
        if (!claimed) {
          return {
            result: null as any,
            error: {
              code: "TRANSIENT_IN_PROGRESS",
              message: "Request already in progress, please retry",
              retryable: true,
            },
          };
        }
        // Successfully claimed stale reservation, continue to execute
      }

      // Status is 'failed' - claim for retry
      if (reservation.existing.status === 'failed') {
        const claimed = await this.tryClaimFailedKey(ctx.idempotencyKey);
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
        // Successfully claimed, continue to execute
      }
    }

    // Execute the action
    try {
      const result = await this.kernel.runScript(CreateRolesScript, payload);
      await this.completeIdempotencyKey(ctx.idempotencyKey, result);
      return { result };
    } catch (error) {
      // Mark as failed for potential retry
      await this.failIdempotencyKey(ctx.idempotencyKey, String(error));

      // Return error response (NOT throw!)
      return {
        result: null as any,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : String(error),
          retryable: false,
        },
      };
    }
  }

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
  -- SHA-256 hash of (dedupe_key, service, action, call_id)
  idempotency_key TEXT PRIMARY KEY,

  -- Components for debugging/querying
  dedupe_key TEXT NOT NULL,      -- Business operation ID (survives restarts)
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  call_id TEXT NOT NULL,

  -- Optional: which execution made this attempt (for tracing only)
  execution_id TEXT,

  -- Result caching (opt-in)
  result JSONB,
  result_cached BOOLEAN NOT NULL DEFAULT FALSE,

  -- Status for atomic reservation with lease
  status TEXT NOT NULL DEFAULT 'reserved',  -- 'reserved' | 'completed' | 'failed'

  -- Retry tracking
  attempt INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,

  -- Timestamps - ALL NOT NULL for lease mechanism
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Used for stale detection!
  completed_at TIMESTAMPTZ
);

-- Primary lookup by idempotency key (implicit from PRIMARY KEY)

-- For debugging: find all requests for a business operation
CREATE INDEX idx_processed_requests_dedupe_key ON processed_requests(dedupe_key);

-- For cleanup: find old completed/failed records
CREATE INDEX idx_processed_requests_cleanup ON processed_requests(status, created_at)
  WHERE status IN ('completed', 'failed');

-- For stale detection: find old reserved records
CREATE INDEX idx_processed_requests_stale ON processed_requests(status, updated_at)
  WHERE status = 'reserved';
```

### Idempotency Helper Methods

```typescript
// In BrokerActions base class or mixin

/** Stale reservation threshold (configurable) */
private readonly STALE_RESERVATION_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

interface ReservationResult {
  acquired: boolean;
  existing?: ProcessedRequest;
}

/**
 * Try to atomically reserve idempotency key.
 * Returns { acquired: true } if we got the key.
 * Returns { acquired: false, existing } if key already exists.
 */
async tryReserveIdempotencyKey(ctx: ActionContext): Promise<ReservationResult> {
  // First try to insert
  const insertResult = await this.db.execute(sql`
    INSERT INTO processed_requests
      (idempotency_key, dedupe_key, service, action, call_id, execution_id, status, attempt, created_at, updated_at)
    VALUES
      (${ctx.idempotencyKey}, ${ctx.dedupeKey}, ${ctx.service}, ${ctx.action}, ${ctx.callId}, ${ctx.executionId ?? null}, 'reserved', 1, NOW(), NOW())
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING idempotency_key
  `);

  if ((insertResult.rowCount ?? 0) > 0) {
    return { acquired: true };
  }

  // Key exists - fetch current state
  const existing = await this.db.query.processedRequests.findFirst({
    where: eq(processedRequests.idempotencyKey, ctx.idempotencyKey),
  });

  return { acquired: false, existing: existing ?? undefined };
}

/**
 * Try to claim a STALE 'reserved' record.
 * Only succeeds if updated_at is older than threshold.
 */
async tryClaimStaleReservation(idempotencyKey: string): Promise<boolean> {
  const result = await this.db.execute(sql`
    UPDATE processed_requests
    SET status = 'reserved',
        attempt = attempt + 1,
        updated_at = NOW()
    WHERE idempotency_key = ${idempotencyKey}
      AND status = 'reserved'
      AND updated_at < NOW() - MAKE_INTERVAL(secs => ${this.STALE_RESERVATION_THRESHOLD_MS / 1000})
    RETURNING idempotency_key
  `);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Try to claim a 'failed' record for retry.
 */
async tryClaimFailedKey(idempotencyKey: string): Promise<boolean> {
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
 */
async completeIdempotencyKey(idempotencyKey: string, result?: unknown, cacheResult = false): Promise<void> {
  await this.db
    .update(processedRequests)
    .set({
      status: 'completed',
      result: cacheResult ? result : null,
      resultCached: cacheResult && result !== undefined,
      updatedAt: new Date(),
      completedAt: new Date(),
    })
    .where(eq(processedRequests.idempotencyKey, idempotencyKey));
}

/**
 * Mark as failed (allows retry).
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
  /** Threshold for stale 'reserved' alert (default: 1 hour) */
  staleReservedAlertThresholdMinutes: number;
  /** Batch size for deletion (default: 1000) */
  batchSize: number;
  /** Maximum batches per single job run (default: 10) */
  maxBatchesPerRun: number;
}

const DEFAULT_CONFIG: CleanupConfig = {
  retentionDays: 7,
  staleReservedAlertThresholdMinutes: 60,
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
   * Only deletes 'completed' and 'failed' records.
   * 'reserved' records are handled by stale detection + claim mechanism.
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
   * Alert on very old 'reserved' records (likely dead workers that never got claimed).
   * Note: normal stale reservations are claimed automatically via tryClaimStaleReservation().
   * This alert is for records that are VERY old (threshold much higher than claim threshold).
   */
  @Cron(CronExpression.EVERY_15_MINUTES)
  async alertVeryStaleReservedRecords(): Promise<void> {
    try {
      const staleRecords = await this.db.execute(sql`
        SELECT idempotency_key, dedupe_key, service, action, created_at, updated_at
        FROM processed_requests
        WHERE status = 'reserved'
          AND updated_at < NOW() - MAKE_INTERVAL(mins => ${this.config.staleReservedAlertThresholdMinutes})
        ORDER BY updated_at ASC
        LIMIT 100
      `);

      if (staleRecords.rowCount && staleRecords.rowCount > 0) {
        this.logger.warn(`Found ${staleRecords.rowCount} very stale 'reserved' records!`);

        await this.alertService.sendAlert({
          severity: "warning",
          title: "Very stale idempotency records detected",
          message: `${staleRecords.rowCount} requests stuck in 'reserved' for > ${this.config.staleReservedAlertThresholdMinutes} minutes`,
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

#### Rule 1: Use Atomic Reservation Pattern with Stale Claim

1. Try to INSERT with `ON CONFLICT DO NOTHING`
2. If insert **failed** → check existing status:
   - `completed` → return cached result with `meta.idempotent: true`
   - `reserved` → try to claim if stale (updated_at < threshold), else return `TRANSIENT_IN_PROGRESS`
   - `failed` → claim for retry
3. If insert **succeeded** → execute action, then mark `completed` or `failed`

#### Rule 2: Domain Logic Should Also Be Idempotent

Defense in depth - the underlying logic should handle duplicates:

```typescript
// Use upsert, not insert
await this.repo.upsertRole({ domain, name, ... });
```

#### Rule 3: Result Caching is Opt-In

**By default: store only the fact of processing** (no result).

Cache result only when:
- Action is a **query** (safe to replay cached result)
- Result is small and contains no PII/secrets

### Idempotency Key Format

**Primary key**: SHA-256 hash of `(dedupeKey, service, action, callId)`

```typescript
const data = [dedupeKey, service, action, callId].join("\n");
const idempotencyKey = crypto.createHash("sha256").update(data).digest("hex");
```

**Components stored separately for debugging**:

| Column | Example Value |
|--------|---------------|
| `dedupe_key` | `store:create:my-store` (business operation) |
| `service` | `iam` |
| `action` | `createRoles` |
| `call_id` | `store-123` |
| `idempotency_key` | `a1b2c3d4e5f6...` (64-char hex) |

---

## Determinism Rules (MANDATORY)

**Any non-deterministic operation (uuid, timestamp, random) MUST be inside a `@DBOS.step()`.**

```typescript
// CORRECT - uuid generated in step, result saved by DBOS
@DBOS.step()
async generateStoreId(): Promise<string> {
  return uuidv7();  // Saved on first run, replayed on DBOS recovery
}

// WRONG - uuid in workflow body
@DBOS.workflow()
async run() {
  const id = uuidv7();  // Different on DBOS recovery!
}
```

### callId Rules (MANDATORY)

**Rule 1: callId MUST be deterministic**

Use only values from:
- Workflow input parameters
- Results of previous `@DBOS.step()` calls

```typescript
// WRONG - random value
callId: crypto.randomUUID()

// CORRECT - from input or step result
callId: storeId  // storeId came from generateStoreId() step
```

**Rule 2: callId must distinguish parallel calls to same action**

```typescript
// Two calls to assignRole need different callIds
callId: `${storeId}:${user1}`
callId: `${storeId}:${user2}`
```

**callId patterns:**

| Scenario | callId | Example |
|----------|--------|---------|
| Single call per workflow | `entityId` | `storeId` |
| User-scoped | `${entityId}:${userId}` | `store-123:user-456` |
| Role-scoped | `${entityId}:${role}:${userId}` | `store-123:admin:user-456` |

---

## Error Handling

### Retry Strategy: Workflow-Level Restart

1. Step gets `ActionResponse` with `error`
2. Workflow throws `ServiceError`
3. Workflow fails
4. External orchestrator restarts workflow
5. DBOS replays completed steps
6. Failed step re-executes → service sees same `idempotencyKey` (because `dedupeKey` is same!)

**This is why `dedupeKey` must be business operation ID, not execution ID.**

### ⛔ FORBIDDEN PATTERNS

| Pattern | Problem |
|---------|---------|
| `setTimeout`/`sleep()` in step | Non-deterministic, breaks DBOS recovery |
| `this.x = ...` inside step | Side effect doesn't replay |
| `throw` in action handlers | Use `return { error }` instead |
| `Promise.all` on `@DBOS.step()` methods | Unpredictable recovery |

### Retry Decision Matrix

| Error Code | `retryable` | Behavior |
|------------|-------------|----------|
| `TRANSIENT_*` | `true` | Orchestrator will restart workflow |
| `VALIDATION_*` | `false` | Fail immediately |
| `NOT_FOUND` | `false` | Fail immediately |
| `CONFLICT` | `false` | Fail immediately |
| `INTERNAL_*` | `false` | Fail immediately |

---

## Parallel Calls in Workflows

### Pattern A: Fanout Inside Single Step

```typescript
@DBOS.step()
private async initializeAllServices(dedupeKey: string, storeId: string, ...) {
  const results = await Promise.allSettled([
    this.broker.call("iam.createRoles", {
      payload: { ... },
      ctx: buildActionContext(dedupeKey, "iam", "createRoles", storeId),
    }),
    this.broker.call("media.createAssetGroup", {
      payload: { ... },
      ctx: buildActionContext(dedupeKey, "media", "createAssetGroup", storeId),
    }),
  ]);

  // Check for failures...
}
```

### Pattern B: Sequential Steps (Default)

```typescript
await this.createStoreRoles(dedupeKey, storeId, ...);
await this.assignAdminRole(dedupeKey, storeId, ...);
await this.createMediaAssetGroup(dedupeKey, storeId);
```

| Pattern | Use When |
|---------|----------|
| **Sequential** | Default; clear ordering; dependencies |
| **Fanout Step** | No dependencies; latency-sensitive; ALL idempotent |

---

## Testing Workflows

```typescript
describe("StoreCreateWorkflow", () => {
  let mockBroker: jest.Mocked<ServiceBroker>;

  beforeEach(() => {
    mockBroker = { call: jest.fn() } as any;

    mockBroker.call.mockImplementation(async (action: string) => {
      if (action === "iam.createRoles") return { result: { success: true } };
      if (action === "iam.assignRole") return { result: { success: true } };
      if (action === "media.createAssetGroup") return { result: { assetGroup: { id: "ag-123" } } };
      return { error: { code: "UNKNOWN_ACTION", message: "Unknown", retryable: false } };
    });
  });

  it("calls services with correct dedupeKey", async () => {
    await workflow.run({ name: "test-store", ... });

    expect(mockBroker.call).toHaveBeenCalledWith(
      "iam.createRoles",
      expect.objectContaining({
        ctx: expect.objectContaining({
          dedupeKey: "store:create:test-store",  // Based on input, not execution!
        }),
      })
    );
  });
});
```

---

## Migration Path

### Phase 1: Add Types and Context Builder

1. Create `packages/workflows/src/types.ts`
2. Create `packages/workflows/src/context.ts` with `buildActionContext()`
3. Export from `packages/workflows/src/index.ts`

### Phase 2: Update Workflows

1. Ensure `Workflow.workflowID(input)` returns deterministic business key
2. Use `dedupeKey` (not executionId) in `buildActionContext()`
3. Split multi-call steps into individual `@DBOS.step()` methods
4. Handle `response.error` by throwing `ServiceError`

### Phase 3: Add Service-Side Idempotency

1. Create `processed_requests` table with `dedupe_key` column
2. Update `BrokerActions` to:
   - Accept `ActionRequest` envelope
   - Implement reserve/claim/complete pattern
   - Always return `ActionResponse`, never throw
3. Add cleanup job

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Idempotency key based on | N/A | `dedupeKey` (business operation, survives restarts) |
| Service calls | `broker.call("iam.action", params)` | `broker.call("iam.action", { payload, ctx })` |
| Action handlers | Mixed throw/return | Always return `ActionResponse` |
| Stale reservations | Stuck forever | Auto-claimed after threshold |
| Error handling | Inconsistent | `ServiceError.fromActionError()` |

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
└── StoreCreateWorkflow.ts    # Use dedupeKey, separate steps

services/*/src/*BrokerActions.ts  # Accept ActionRequest, implement idempotency, return not throw
```

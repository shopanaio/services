# Implementation Guide: Idempotency & Event-Driven Architecture

**Author**: Implementation plan based on workflow-idempotency-plan.md and event-driven-architecture-plan.md
**Date**: 2026-01-19
**Approach**: Incremental, backward-compatible

## Overview

This guide provides step-by-step implementation of the idempotency framework and event-driven architecture.

**Key Decision**: `broker.call()` remains unchanged. New method `broker.fire()` handles idempotent calls.

```
broker.call()  → Legacy, unchanged, no idempotency
broker.fire()  → New, with ActionRequest/ActionResponse + idempotency
```

---

## Phase 1: Core Types & Infrastructure

### Step 1.1: Create Idempotency Package

```bash
mkdir -p packages/idempotency/src
```

**File: `packages/idempotency/package.json`**

```json
{
  "name": "@shopana/idempotency",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "canonicalize": "^2.0.0",
    "drizzle-orm": "^0.38.0"
  },
  "peerDependencies": {
    "pg": "^8.0.0"
  }
}
```

### Step 1.2: Define Core Types

**File: `packages/idempotency/src/types.ts`**

```typescript
// ═══════════════════════════════════════════════════════════════════
// OPERATION CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════

export type OperationType = "read" | "write" | "idempotent_write";
export type ResultMode = "full" | "minimal" | "receipt_only";

export interface OperationConfig {
  type: OperationType;
  requiresIdempotency: boolean;
  ttlMs: number;
  cacheResult: boolean;
  resultMode: ResultMode;
  allowSamePayloadRetry: boolean;
}

export const OperationPresets = {
  READ: {
    type: "read",
    requiresIdempotency: false,
    ttlMs: 0,
    cacheResult: false,
    resultMode: "receipt_only",
    allowSamePayloadRetry: true,
  },

  CREATE: {
    type: "write",
    requiresIdempotency: true,
    ttlMs: 24 * 60 * 60 * 1000, // 24 hours
    cacheResult: true,
    resultMode: "full",
    allowSamePayloadRetry: false,
  },

  UPDATE: {
    type: "idempotent_write",
    requiresIdempotency: true,
    ttlMs: 1 * 60 * 60 * 1000, // 1 hour
    cacheResult: true,
    resultMode: "minimal",
    allowSamePayloadRetry: true,
  },

  DELETE: {
    type: "idempotent_write",
    requiresIdempotency: true,
    ttlMs: 24 * 60 * 60 * 1000,
    cacheResult: false,
    resultMode: "receipt_only",
    allowSamePayloadRetry: true,
  },

  ASYNC_JOB: {
    type: "write",
    requiresIdempotency: true,
    ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    cacheResult: false,
    resultMode: "receipt_only",
    allowSamePayloadRetry: false,
  },
} as const satisfies Record<string, OperationConfig>;

// ═══════════════════════════════════════════════════════════════════
// ACTION CONTEXT
// ═══════════════════════════════════════════════════════════════════

export type IdempotencySource = "client" | "workflow" | "content" | "none";

export interface ActionContext {
  readonly version: 3;

  /** How the idempotency key was derived */
  source: IdempotencySource;

  /** Final idempotency key (hash) */
  idempotencyKey: string;

  /** SHA-256 of canonical JSON payload */
  payloadHash: string;

  /** Target service */
  service: string;

  /** Target action */
  action: string;

  /** Operation configuration */
  operation: OperationConfig;

  // === Scope ===
  projectId?: string;

  // === Workflow source fields ===
  workflowId?: string;
  stepId?: string;
  callId?: string;

  // === Client source fields ===
  clientKey?: string;
  apiKeyId?: string;

  // === Content source fields ===
  resourceId?: string;

  // === Tracing ===
  executionId?: string;
  traceId?: string;
}

// ═══════════════════════════════════════════════════════════════════
// ACTION REQUEST / RESPONSE
// ═══════════════════════════════════════════════════════════════════

/**
 * Envelope for idempotent action calls via broker.fire()
 */
export interface ActionRequest<TPayload = unknown> {
  payload: TPayload;
  ctx?: ActionContext;
}

/**
 * Standard response from idempotent actions
 */
export interface ActionResponse<TResult = unknown> {
  result: TResult;
  error?: ActionError;
  meta?: ActionResponseMeta;
}

export interface ActionResponseMeta {
  idempotent?: boolean;
  attempt?: number;
  receipt?: ActionReceipt;
  retryAfterMs?: number;
  leaseExpiresAt?: string;
}

export interface ActionReceipt {
  idempotencyKey: string;
  status: "completed";
  completedAt: string;
}

export interface ActionError {
  code: string;
  message: string;
  retryable: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// SERVICE ERROR (for workflow-side throwing)
// ═══════════════════════════════════════════════════════════════════

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

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}
```

### Step 1.3: Utility Functions

**File: `packages/idempotency/src/utils.ts`**

```typescript
import crypto from "node:crypto";
import canonicalize from "canonicalize";

/**
 * Canonical JSON for deterministic hashing (RFC 8785 compliant).
 * Uses the `canonicalize` library for proper JSON Canonicalization Scheme (JCS).
 */
export function canonicalJson(value: unknown): string {
  const result = canonicalize(value);
  if (result === undefined) {
    throw new Error("Cannot canonicalize undefined value");
  }
  return result;
}

export function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function generateLeaseOwner(): string {
  return crypto.randomUUID();
}
```

### Step 1.4: Context Builders

**File: `packages/idempotency/src/context.ts`**

```typescript
import type { ActionContext, OperationConfig } from "./types.js";
import { OperationPresets } from "./types.js";
import { canonicalJson, sha256 } from "./utils.js";

/**
 * Build context for workflow-initiated calls.
 * Use in @DBOS.step() methods.
 */
export function buildWorkflowContext<TPayload>(
  workflowId: string,
  stepId: string,
  callId: string,
  service: string,
  action: string,
  payload: TPayload,
  operation: OperationConfig = OperationPresets.CREATE,
  projectId?: string
): ActionContext {
  const keyParts = [workflowId, stepId, callId, service, action];
  const idempotencyKey = sha256(keyParts.join(":"));
  const payloadHash = sha256(canonicalJson(payload));

  return {
    version: 3,
    source: "workflow",
    idempotencyKey,
    payloadHash,
    service,
    action,
    operation,
    workflowId,
    stepId,
    callId,
    projectId,
  };
}

/**
 * Build context for client-provided idempotency keys.
 * Use in GraphQL/REST resolvers when client sends Idempotency-Key header.
 */
export function buildClientContext<TPayload>(
  clientKey: string,
  projectId: string,
  service: string,
  action: string,
  payload: TPayload,
  operation: OperationConfig = OperationPresets.CREATE,
  apiKeyId?: string
): ActionContext {
  const keyParts = [projectId, apiKeyId ?? "default", service, action, clientKey];
  const idempotencyKey = sha256(keyParts.join(":"));
  const payloadHash = sha256(canonicalJson(payload));

  return {
    version: 3,
    source: "client",
    idempotencyKey,
    payloadHash,
    service,
    action,
    operation,
    projectId,
    clientKey,
    apiKeyId,
  };
}

/**
 * Build context for content-derived idempotency (same payload = same key).
 * Use for idempotent updates like setStock().
 */
export function buildContentContext<TPayload>(
  resourceId: string,
  service: string,
  action: string,
  payload: TPayload,
  operation: OperationConfig = OperationPresets.UPDATE,
  projectId?: string
): ActionContext {
  const payloadHash = sha256(canonicalJson(payload));
  const keyParts = [resourceId, service, action, payloadHash];
  const idempotencyKey = sha256(keyParts.join(":"));

  return {
    version: 3,
    source: "content",
    idempotencyKey,
    payloadHash,
    service,
    action,
    operation,
    resourceId,
    projectId,
  };
}

/**
 * Build context for event handler invocations.
 * Used by EventDispatchWorkflow.
 */
export function buildEventHandlerContext(
  eventType: string,
  eventId: string,
  service: string,
  action: string,
  eventPayload: unknown,
  operation: OperationConfig = OperationPresets.CREATE,
  projectId?: string
): ActionContext {
  const keyParts = ["event", eventType, eventId, service, action];
  const idempotencyKey = sha256(keyParts.join(":"));
  const payloadHash = sha256(canonicalJson({ event: eventPayload }));

  return {
    version: 3,
    source: "workflow",
    idempotencyKey,
    payloadHash,
    service,
    action,
    operation,
    workflowId: `event:dispatch:${eventType}:${eventId}`,
    stepId: `invoke:${service}:${action}`,
    callId: eventId,
    projectId,
  };
}
```

### Step 1.5: Package Index

**File: `packages/idempotency/src/index.ts`**

```typescript
// Types
export type {
  OperationType,
  ResultMode,
  OperationConfig,
  IdempotencySource,
  ActionContext,
  ActionRequest,
  ActionResponse,
  ActionResponseMeta,
  ActionReceipt,
  ActionError,
} from "./types.js";

// Presets & Classes
export { OperationPresets, ServiceError, isServiceError } from "./types.js";

// Utils
export { canonicalJson, sha256, generateLeaseOwner } from "./utils.js";

// Context Builders
export {
  buildWorkflowContext,
  buildClientContext,
  buildContentContext,
  buildEventHandlerContext,
} from "./context.js";
```

---

## Phase 2: Database Schema

### Step 2.1: Create Migration for processed_requests

This table needs to exist in **each service database** that uses idempotency.

**File: `packages/idempotency/src/schema.ts`**

```typescript
import { pgSchema, text, boolean, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";

// Separate schema for idempotency data
export const idempotencySchema = pgSchema("idempotency");

export const processedRequests = idempotencySchema.table(
  "processed_requests",
  {
    // Primary key
    idempotencyKey: text("idempotency_key").primaryKey(),

    // Key source metadata
    source: text("source").notNull(), // 'client' | 'workflow' | 'content'

    // For client-provided keys
    projectId: text("project_id"),
    clientKey: text("client_key"),
    apiKeyId: text("api_key_id"),

    // For workflow-derived keys
    workflowId: text("workflow_id"),
    stepId: text("step_id"),
    callId: text("call_id"),

    // For content-derived keys
    resourceId: text("resource_id"),

    // Operation metadata
    service: text("service").notNull(),
    action: text("action").notNull(),
    operationType: text("operation_type").notNull(),

    // Payload verification
    payloadHash: text("payload_hash").notNull(),

    // Execution state
    executionId: text("execution_id"),
    status: text("status").notNull().default("reserved"),
    attempt: integer("attempt").notNull().default(1),
    lastError: text("last_error"),

    // Result caching
    result: jsonb("result"),
    resultCached: boolean("result_cached").notNull().default(false),

    // Lease mechanism
    leaseOwner: text("lease_owner"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // TTL for cleanup
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_pr_project_client").on(table.projectId, table.clientKey),
    index("idx_pr_workflow").on(table.workflowId, table.stepId),
    index("idx_pr_resource").on(table.resourceId, table.action),
    index("idx_pr_cleanup").on(table.expiresAt),
    index("idx_pr_lease").on(table.status, table.leaseExpiresAt),
  ]
);

export type ProcessedRequest = typeof processedRequests.$inferSelect;
export type NewProcessedRequest = typeof processedRequests.$inferInsert;
```

### Step 2.2: SQL Migration Template

**File: `packages/idempotency/migrations/0001_processed_requests.sql`**

```sql
-- Idempotency tracking table
-- Copy this to each service that needs idempotency support

CREATE SCHEMA IF NOT EXISTS idempotency;

CREATE TABLE IF NOT EXISTS idempotency.processed_requests (
  idempotency_key TEXT PRIMARY KEY,

  source TEXT NOT NULL CHECK (source IN ('client', 'workflow', 'content')),

  project_id TEXT,
  client_key TEXT,
  api_key_id TEXT,

  workflow_id TEXT,
  step_id TEXT,
  call_id TEXT,

  resource_id TEXT,

  service TEXT NOT NULL,
  action TEXT NOT NULL,
  operation_type TEXT NOT NULL,

  payload_hash TEXT NOT NULL,

  execution_id TEXT,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'completed', 'failed')),
  attempt INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,

  result JSONB,
  result_cached BOOLEAN NOT NULL DEFAULT FALSE,

  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pr_project_client ON idempotency.processed_requests(project_id, client_key) WHERE source = 'client';
CREATE INDEX IF NOT EXISTS idx_pr_workflow ON idempotency.processed_requests(workflow_id, step_id) WHERE source = 'workflow';
CREATE INDEX IF NOT EXISTS idx_pr_resource ON idempotency.processed_requests(resource_id, action) WHERE source = 'content';
CREATE INDEX IF NOT EXISTS idx_pr_cleanup ON idempotency.processed_requests(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pr_lease ON idempotency.processed_requests(status, lease_expires_at) WHERE status = 'reserved';
```

---

## Phase 3: Idempotency Helpers

### Step 3.1: Idempotency Repository

**File: `packages/idempotency/src/repository.ts`**

```typescript
import { eq, sql, and, lt } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { processedRequests, type ProcessedRequest } from "./schema.js";
import type { ActionContext } from "./types.js";
import { generateLeaseOwner } from "./utils.js";

const LEASE_MS = 5 * 60 * 1000; // 5 minutes

export interface ReservationResult {
  acquired: boolean;
  existing?: ProcessedRequest;
  attemptOwner?: string;
}

export interface ClaimResult {
  claimed: boolean;
  attemptOwner?: string;
}

export class IdempotencyRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  private leaseExpiry(): Date {
    return new Date(Date.now() + LEASE_MS);
  }

  /**
   * Try to reserve an idempotency key (atomic insert).
   */
  async tryReserve(ctx: ActionContext): Promise<ReservationResult> {
    const attemptOwner = generateLeaseOwner();

    const insertResult = await this.db.execute(sql`
      INSERT INTO idempotency.processed_requests (
        idempotency_key, source, project_id, client_key, api_key_id,
        workflow_id, step_id, call_id, resource_id,
        service, action, operation_type, payload_hash,
        status, attempt, lease_owner, lease_expires_at,
        expires_at, created_at, updated_at
      ) VALUES (
        ${ctx.idempotencyKey}, ${ctx.source}, ${ctx.projectId ?? null}, ${ctx.clientKey ?? null}, ${ctx.apiKeyId ?? null},
        ${ctx.workflowId ?? null}, ${ctx.stepId ?? null}, ${ctx.callId ?? null}, ${ctx.resourceId ?? null},
        ${ctx.service}, ${ctx.action}, ${ctx.operation.type}, ${ctx.payloadHash},
        'reserved', 1, ${attemptOwner}, ${this.leaseExpiry()},
        ${this.computeExpiresAt(ctx)}, NOW(), NOW()
      )
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING idempotency_key
    `);

    if ((insertResult.rowCount ?? 0) > 0) {
      return { acquired: true, attemptOwner };
    }

    // Conflict - load existing
    const existing = await this.db
      .select()
      .from(processedRequests)
      .where(eq(processedRequests.idempotencyKey, ctx.idempotencyKey))
      .limit(1);

    return { acquired: false, existing: existing[0] };
  }

  /**
   * Claim an expired lease (for reserved status).
   */
  async tryClaimExpired(idempotencyKey: string): Promise<ClaimResult> {
    const attemptOwner = generateLeaseOwner();

    const result = await this.db.execute(sql`
      UPDATE idempotency.processed_requests
      SET lease_owner = ${attemptOwner},
          lease_expires_at = ${this.leaseExpiry()},
          attempt = attempt + 1,
          updated_at = NOW()
      WHERE idempotency_key = ${idempotencyKey}
        AND status = 'reserved'
        AND lease_expires_at IS NOT NULL
        AND lease_expires_at < NOW()
      RETURNING idempotency_key
    `);

    const claimed = (result.rowCount ?? 0) > 0;
    return { claimed, attemptOwner: claimed ? attemptOwner : undefined };
  }

  /**
   * Claim a failed record for retry.
   */
  async tryClaimFailed(idempotencyKey: string): Promise<ClaimResult> {
    const attemptOwner = generateLeaseOwner();

    const result = await this.db.execute(sql`
      UPDATE idempotency.processed_requests
      SET status = 'reserved',
          lease_owner = ${attemptOwner},
          lease_expires_at = ${this.leaseExpiry()},
          attempt = attempt + 1,
          updated_at = NOW()
      WHERE idempotency_key = ${idempotencyKey}
        AND status = 'failed'
      RETURNING idempotency_key
    `);

    const claimed = (result.rowCount ?? 0) > 0;
    return { claimed, attemptOwner: claimed ? attemptOwner : undefined };
  }

  /**
   * Complete an operation (owner-aware).
   */
  async complete(
    idempotencyKey: string,
    attemptOwner: string,
    result: unknown,
    cacheResult: boolean,
    ttlMs: number
  ): Promise<boolean> {
    const expiresAt = new Date(Date.now() + ttlMs);

    const updateResult = await this.db.execute(sql`
      UPDATE idempotency.processed_requests
      SET status = 'completed',
          result = ${cacheResult ? JSON.stringify(result) : null},
          result_cached = ${cacheResult && result !== undefined},
          updated_at = NOW(),
          completed_at = NOW(),
          lease_owner = NULL,
          lease_expires_at = NULL,
          expires_at = ${expiresAt}
      WHERE idempotency_key = ${idempotencyKey}
        AND status = 'reserved'
        AND lease_owner = ${attemptOwner}
      RETURNING idempotency_key
    `);

    return (updateResult.rowCount ?? 0) > 0;
  }

  /**
   * Mark an operation as failed (owner-aware).
   */
  async fail(
    idempotencyKey: string,
    attemptOwner: string,
    errorInfo: string,
    ttlMs: number
  ): Promise<boolean> {
    const expiresAt = new Date(Date.now() + ttlMs);

    const updateResult = await this.db.execute(sql`
      UPDATE idempotency.processed_requests
      SET status = 'failed',
          last_error = ${errorInfo},
          updated_at = NOW(),
          lease_owner = NULL,
          lease_expires_at = NULL,
          expires_at = ${expiresAt}
      WHERE idempotency_key = ${idempotencyKey}
        AND status = 'reserved'
        AND lease_owner = ${attemptOwner}
      RETURNING idempotency_key
    `);

    return (updateResult.rowCount ?? 0) > 0;
  }

  /**
   * Cleanup expired records.
   * Uses subquery because PostgreSQL doesn't support LIMIT in DELETE.
   */
  async cleanup(batchSize: number = 1000): Promise<number> {
    const result = await this.db.execute(sql`
      DELETE FROM idempotency.processed_requests
      WHERE idempotency_key IN (
        SELECT idempotency_key
        FROM idempotency.processed_requests
        WHERE expires_at IS NOT NULL AND expires_at < NOW()
        LIMIT ${batchSize}
      )
    `);

    return result.rowCount ?? 0;
  }

  private computeExpiresAt(ctx: ActionContext): Date {
    // For reserved: hard TTL of 7 days (catastrophe protection)
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
}
```

### Step 3.2: withIdempotency Helper

**File: `packages/idempotency/src/withIdempotency.ts`**

```typescript
import type {
  ActionContext,
  ActionResponse,
  ActionError,
  ProcessedRequest,
} from "./types.js";
import type { IdempotencyRepository } from "./repository.js";

export interface IdempotencyHelpers {
  repo: IdempotencyRepository;
}

/**
 * Universal idempotency wrapper for BrokerActions.
 */
export async function withIdempotency<TPayload, TResult>(
  ctx: ActionContext | undefined,
  payload: TPayload,
  helpers: IdempotencyHelpers,
  execute: (payload: TPayload) => Promise<TResult>
): Promise<ActionResponse<TResult>> {
  // 1. No context or no idempotency required = execute directly
  if (!ctx || ctx.source === "none" || !ctx.operation.requiresIdempotency) {
    const result = await execute(payload);
    return { result };
  }

  const { repo } = helpers;

  // 2. Try reserve
  const reservation = await repo.tryReserve(ctx);
  let attemptOwner = reservation.attemptOwner;

  // 3. Handle existing record
  if (!reservation.acquired) {
    const existing = reservation.existing;

    if (!existing) {
      return {
        result: null as TResult,
        error: { code: "TRANSIENT_ERROR", message: "Idempotency state unavailable", retryable: true },
      };
    }

    // Payload safety check
    if (existing.payloadHash !== ctx.payloadHash) {
      // For content-derived: this is a bug in canonicalJson
      if (ctx.source === "content") {
        console.error("CANONICAL_JSON_BUG", { key: ctx.idempotencyKey });
        return {
          result: null as TResult,
          error: { code: "INTERNAL_ERROR", message: "Canonicalization error", retryable: false },
        };
      }
      return {
        result: null as TResult,
        error: { code: "CONFLICT", message: "Idempotency key reused with different payload", retryable: false },
      };
    }

    // Completed: return cached/receipt
    if (existing.status === "completed") {
      return buildCompletedResponse(existing, ctx);
    }

    // Reserved: try claim if stale
    if (existing.status === "reserved") {
      const claim = await repo.tryClaimExpired(ctx.idempotencyKey);
      if (!claim.claimed) {
        return buildInProgressResponse(existing);
      }
      attemptOwner = claim.attemptOwner;
    }

    // Failed: retry claim
    if (existing.status === "failed") {
      const claim = await repo.tryClaimFailed(ctx.idempotencyKey);
      if (!claim.claimed) {
        return buildInProgressResponse(existing);
      }
      attemptOwner = claim.attemptOwner;
    }
  }

  if (!attemptOwner) {
    return {
      result: null as TResult,
      error: { code: "TRANSIENT_ERROR", message: "Lease owner missing", retryable: true },
    };
  }

  // 4. Execute
  try {
    const result = await execute(payload);

    const completed = await repo.complete(
      ctx.idempotencyKey,
      attemptOwner,
      result,
      ctx.operation.cacheResult,
      ctx.operation.ttlMs
    );

    if (!completed) {
      return {
        result: null as TResult,
        error: { code: "TRANSIENT_IN_PROGRESS", message: "Lost lease while completing", retryable: true },
      };
    }

    return { result };
  } catch (error) {
    const errorInfo = error instanceof Error ? error.message : String(error);
    await repo.fail(ctx.idempotencyKey, attemptOwner, errorInfo, ctx.operation.ttlMs);

    return {
      result: null as TResult,
      error: mapToActionError(error),
    };
  }
}

function buildCompletedResponse<TResult>(
  existing: ProcessedRequest,
  ctx: ActionContext
): ActionResponse<TResult> {
  if (existing.resultCached && existing.result !== null) {
    return {
      result: existing.result as TResult,
      meta: { idempotent: true, attempt: existing.attempt },
    };
  }

  // Return receipt
  return {
    result: null as TResult,
    meta: {
      idempotent: true,
      attempt: existing.attempt,
      receipt: {
        idempotencyKey: existing.idempotencyKey,
        status: "completed",
        completedAt: existing.completedAt?.toISOString() ?? new Date().toISOString(),
      },
    },
  };
}

function buildInProgressResponse<TResult>(existing: ProcessedRequest): ActionResponse<TResult> {
  const leaseExpiresAt = existing.leaseExpiresAt;
  const now = Date.now();

  let retryAfterMs: number;
  if (leaseExpiresAt && leaseExpiresAt.getTime() > now) {
    retryAfterMs = leaseExpiresAt.getTime() - now + 1000;
  } else {
    retryAfterMs = Math.min(1000 * Math.pow(2, existing.attempt - 1), 30000);
  }

  return {
    result: null as TResult,
    error: {
      code: "TRANSIENT_IN_PROGRESS",
      message: "Request already in progress, please retry",
      retryable: true,
    },
    meta: {
      attempt: existing.attempt,
      retryAfterMs,
      leaseExpiresAt: leaseExpiresAt?.toISOString(),
    },
  };
}

function mapToActionError(error: unknown): ActionError {
  const message = error instanceof Error ? error.message : String(error);

  // Transient errors
  if (message.includes("ECONNREFUSED") || message.includes("timeout")) {
    return { code: "TRANSIENT_UNAVAILABLE", message, retryable: true };
  }
  if (message.includes("deadlock") || message.includes("serialization")) {
    return { code: "TRANSIENT_ERROR", message, retryable: true };
  }

  // Domain errors
  if (message.includes("validation") || message.includes("invalid")) {
    return { code: "VALIDATION_ERROR", message, retryable: false };
  }
  if (message.includes("not found")) {
    return { code: "NOT_FOUND", message, retryable: false };
  }
  if (message.includes("conflict") || message.includes("duplicate")) {
    return { code: "CONFLICT", message, retryable: false };
  }

  return { code: "INTERNAL_ERROR", message, retryable: false };
}
```

### Step 3.3: Export withIdempotency

**Update: `packages/idempotency/src/index.ts`**

```typescript
// ... existing exports ...

// Schema
export { processedRequests, type ProcessedRequest, type NewProcessedRequest } from "./schema.js";

// Repository
export { IdempotencyRepository, type ReservationResult, type ClaimResult } from "./repository.js";

// Helper
export { withIdempotency, type IdempotencyHelpers } from "./withIdempotency.js";
```

---

## Phase 4: ServiceBroker.fire()

### Step 4.1: Add fire() Method

**File: `packages/shared-kernel/src/broker/ServiceBroker.ts`**

Add this method to the existing `ServiceBroker` class:

```typescript
import type { ActionRequest, ActionResponse, ActionContext } from "@shopana/idempotency";

// Inside ServiceBroker class:

/**
 * Fire an idempotent action with ActionRequest/ActionResponse contract.
 *
 * Unlike call(), this method:
 * - Wraps payload in ActionRequest
 * - Returns ActionResponse (never throws for business errors)
 * - Supports idempotency context
 *
 * @example
 * const response = await broker.fire("iam.createRoles", payload, ctx);
 * if (response.error) {
 *   throw ServiceError.fromActionError("iam", "createRoles", response.error);
 * }
 */
async fire<TResult = unknown, TPayload = unknown>(
  action: string,
  payload: TPayload,
  ctx?: ActionContext
): Promise<ActionResponse<TResult>> {
  const qualifiedAction = this.assertFullyQualified(action);
  const handler = this.registry.resolve<ActionRequest<TPayload>, ActionResponse<TResult>>(
    qualifiedAction + "__fire"
  );

  // If no __fire handler registered, fall back to legacy call
  if (!handler) {
    const legacyHandler = this.registry.resolve<TPayload, TResult>(qualifiedAction);
    try {
      const result = await legacyHandler(payload);
      return { result };
    } catch (error) {
      return {
        result: null as TResult,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : String(error),
          retryable: false,
        },
      };
    }
  }

  this.inFlight++;
  try {
    return await handler({ payload, ctx });
  } finally {
    this.inFlight--;
  }
}
```

### Step 4.2: Create Fire Decorator

**File: `packages/shared-kernel/src/decorators/Fire.ts`**

```typescript
import type { OperationConfig } from "@shopana/idempotency";

export const FIRE_METADATA_KEY = Symbol("fire");

export interface FireMetadata {
  actionName: string;
  operation: OperationConfig;
}

/**
 * @Fire decorator for idempotent actions (broker.fire()).
 * Registers handler as "service.action__fire".
 *
 * @example
 * @Fire("createUser", OperationPresets.CREATE)
 * async createUserFire(input: ActionRequest<CreateUserParams>): Promise<ActionResponse<User>> {
 *   return withIdempotency(input.ctx, input.payload, { repo: this.repo }, (p) => this.doCreate(p));
 * }
 */
export function Fire(actionName: string, operation: OperationConfig): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const metadata: FireMetadata = { actionName, operation };
    Reflect.defineMetadata(FIRE_METADATA_KEY, metadata, target, propertyKey);
    return descriptor;
  };
}
```

**Update: `packages/shared-kernel/src/decorators/index.ts`**

```typescript
export { Action, ACTION_METADATA_KEY, type ActionMetadata } from "./Action.js";
export { Fire, FIRE_METADATA_KEY, type FireMetadata } from "./Fire.js";
```

### Step 4.3: Update BrokerActions Registration

**File: `packages/shared-kernel/src/broker/BrokerActions.ts`**

Update the registration logic to handle both `@Action` and `@Fire` decorators:

```typescript
import { ACTION_METADATA_KEY, type ActionMetadata } from "../decorators/Action.js";
import { FIRE_METADATA_KEY, type FireMetadata } from "../decorators/Fire.js";

// In BrokerActions registration method:

protected registerActions(): void {
  const prototype = Object.getPrototypeOf(this);
  const methodNames = Object.getOwnPropertyNames(prototype);

  for (const methodName of methodNames) {
    const method = (this as any)[methodName].bind(this);

    // Legacy @Action → registers "service.action"
    const actionMeta: ActionMetadata | undefined = Reflect.getMetadata(
      ACTION_METADATA_KEY,
      prototype,
      methodName
    );

    if (actionMeta) {
      this.registry.register(
        `${this.serviceName}.${actionMeta.actionName}`,
        method
      );
    }

    // New @Fire → registers "service.action__fire"
    const fireMeta: FireMetadata | undefined = Reflect.getMetadata(
      FIRE_METADATA_KEY,
      prototype,
      methodName
    );

    if (fireMeta) {
      this.registry.register(
        `${this.serviceName}.${fireMeta.actionName}__fire`,
        this.wrapFireHandler(method, fireMeta.operation)
      );
    }
  }
}

private wrapFireHandler<TPayload, TResult>(
  method: (input: ActionRequest<TPayload>) => Promise<ActionResponse<TResult>>,
  operation: OperationConfig
): (input: ActionRequest<TPayload>) => Promise<ActionResponse<TResult>> {
  return async (input: ActionRequest<TPayload>) => {
    // Inject operation config if not provided in context
    if (input.ctx && !input.ctx.operation) {
      input.ctx = { ...input.ctx, operation };
    }
    return method(input);
  };
}
```

---

## Phase 5: Migrate Critical Workflows

### Step 5.1: Example - StoreCreateWorkflow

**File: `services/project/src/workflows/StoreCreateWorkflow.ts`**

```typescript
import { DBOS, WorkflowContext } from "@dbos-inc/dbos-sdk";
import {
  buildWorkflowContext,
  ServiceError,
  OperationPresets,
  type ActionResponse,
} from "@shopana/idempotency";

export class StoreCreateWorkflow {
  constructor(private readonly broker: ServiceBroker) {}

  /**
   * Compute deterministic workflow ID for idempotency.
   * Callers MUST use this when starting the workflow.
   */
  static workflowID(input: StoreCreateInput): string {
    const name = input.name.trim().toLowerCase().normalize("NFKC");
    return `store:create:${input.organizationId}:${name}`;
  }

  /**
   * Start workflow with idempotent ID.
   * Use this instead of calling run() directly.
   */
  static async start(input: StoreCreateInput): Promise<StoreCreateResult> {
    const workflowID = StoreCreateWorkflow.workflowID(input);
    const handle = await DBOS.startWorkflow(StoreCreateWorkflow, { workflowID });
    return handle.run(input);
  }

  @DBOS.workflow()
  async run(input: StoreCreateInput): Promise<StoreCreateResult> {
    // Get workflowID from DBOS context (was set in start())
    const dedupeKey = DBOS.workflowID;

    // Step 1: Create store
    const store = await this.createStore(dedupeKey, input);

    // Step 2: Create roles (idempotent via broker.fire)
    await this.createRoles(dedupeKey, store.id, input.organizationId, input.userId);

    // Step 3: Create media asset group
    await this.createMediaAssetGroup(dedupeKey, store.id);

    return { store };
  }

  @DBOS.step()
  private async createStore(dedupeKey: string, input: StoreCreateInput): Promise<Store> {
    // This uses legacy call (create store is the main script)
    const result = await this.broker.call("project.createStore", input);
    if (result.userErrors?.length) {
      throw new Error(result.userErrors[0].message);
    }
    return result.store;
  }

  @DBOS.step()
  private async createRoles(
    dedupeKey: string,
    storeId: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    const payload = {
      userId,
      organizationId,
      domain: `store:${storeId}`,
      roles: buildStoreRoles(),
    };

    // Build idempotency context
    const ctx = buildWorkflowContext(
      dedupeKey,
      "createRoles",
      storeId,
      "iam",
      "createRoles",
      payload,
      OperationPresets.CREATE,
      organizationId
    );

    // Use broker.fire() for idempotent call
    const response = await this.broker.fire<{ success: boolean }>(
      "iam.createRoles",
      payload,
      ctx
    );

    if (response.error) {
      throw ServiceError.fromActionError("iam", "createRoles", response.error);
    }
  }

  @DBOS.step()
  private async createMediaAssetGroup(dedupeKey: string, storeId: string): Promise<void> {
    const payload = {
      ownerType: "store",
      ownerId: storeId,
    };

    const ctx = buildWorkflowContext(
      dedupeKey,
      "createMediaAssetGroup",
      storeId,
      "media",
      "createAssetGroup",
      payload,
      OperationPresets.CREATE
    );

    const response = await this.broker.fire("media.createAssetGroup", payload, ctx);

    // Best-effort - log but don't fail
    if (response.error && !response.error.retryable) {
      console.warn("Failed to create media asset group", response.error);
    } else if (response.error) {
      throw ServiceError.fromActionError("media", "createAssetGroup", response.error);
    }
  }
}
```

### Step 5.2: Example - IamBrokerActions with Idempotency

**File: `services/iam/src/IamBrokerActions.ts`**

```typescript
import {
  Action,
  Fire,
  BrokerActions,
  ZodSchema,
} from "@shopana/shared-kernel";
import {
  type ActionRequest,
  type ActionResponse,
  OperationPresets,
  withIdempotency,
  IdempotencyRepository,
} from "@shopana/idempotency";

export class IamBrokerActions extends BrokerActions {
  private readonly idempotencyRepo: IdempotencyRepository;

  constructor(/* ... */) {
    super(/* ... */);
    this.idempotencyRepo = new IdempotencyRepository(this.db);
  }

  /**
   * Legacy handler (for broker.call compatibility)
   */
  @Action("createRoles")
  @ZodSchema(createRolesInputSchema)
  async createRoles(params: CreateRolesParams): Promise<CreateRolesResult> {
    return this.kernel.runScript(CreateRolesScript, params);
  }

  /**
   * Idempotent handler (for broker.fire)
   */
  @Fire("createRoles", OperationPresets.CREATE)
  async createRolesFire(
    input: ActionRequest<CreateRolesParams>
  ): Promise<ActionResponse<CreateRolesResult>> {
    const { payload, ctx } = input;

    return withIdempotency(
      ctx,
      payload,
      { repo: this.idempotencyRepo },
      async (p) => {
        const result = await this.kernel.runScript(CreateRolesScript, p);

        // Convert legacy result to ActionResponse-compatible
        if (result.userErrors?.length) {
          throw new Error(result.userErrors[0].message);
        }

        return result;
      }
    );
  }
}
```

---

## Phase 6: Event-Driven Layer

### Step 6.1: Event Types

**File: `packages/events/src/types.ts`**

```typescript
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  eventId: string;
  eventType: TType;
  timestamp: string;
  source: string;
  payload: TPayload;
  context: EventContext;
}

export interface EventContext {
  projectId: string;
  userId?: string;
  correlationId: string;
  causationId?: string;
}

// Concrete event types
export interface ProductCreatedEvent extends DomainEvent<"product.created", {
  productId: string;
  storeId: string;
  name: string;
}> {}

export interface StoreCreatedEvent extends DomainEvent<"store.created", {
  storeId: string;
  organizationId: string;
  name: string;
}> {}

export type ShopanaEvent = ProductCreatedEvent | StoreCreatedEvent;
export type EventType = ShopanaEvent["eventType"];
```

### Step 6.2: Event Dispatch Workflow

**File: `packages/events/src/workflows/EventDispatchWorkflow.ts`**

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { DomainEvent } from "../types.js";
import {
  buildEventHandlerContext,
  OperationPresets,
  ServiceError,
  type ActionResponse,
} from "@shopana/idempotency";
import type { ServiceBroker } from "@shopana/shared-kernel";

export interface EventDispatchResult {
  eventId: string;
  eventType: string;
  status: "completed" | "completed_with_errors" | "failed";
  handlersInvoked: number;
  handlersSucceeded: number;
  handlersFailed: number;
}

export class EventDispatchWorkflow {
  constructor(private readonly broker: ServiceBroker) {}

  static workflowID(event: DomainEvent): string {
    return `event:dispatch:${event.eventType}:${event.eventId}`;
  }

  /**
   * Start dispatch workflow with idempotent ID.
   */
  static async start(event: DomainEvent): Promise<EventDispatchResult> {
    const workflowID = EventDispatchWorkflow.workflowID(event);
    const handle = await DBOS.startWorkflow(EventDispatchWorkflow, { workflowID });
    return handle.dispatch(event);
  }

  private static readonly CONCURRENCY_LIMIT = 5;

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
      };
    }

    // Step 3: Sort handlers (critical first)
    const sorted = handlers.slice().sort((a, b) => {
      if (a.critical !== b.critical) return a.critical ? -1 : 1;
      return `${a.service}.${a.action}`.localeCompare(`${b.service}.${b.action}`);
    });

    const critical = sorted.filter((h) => h.critical);
    const nonCritical = sorted.filter((h) => !h.critical);

    // Step 4: Invoke critical handlers
    const criticalResults = await this.invokeHandlersBatch(event, critical, true);
    const criticalFailed = criticalResults.some((r) => !r.success);

    // Step 5: Invoke non-critical (only if critical succeeded)
    let nonCriticalResults: HandlerResult[] = [];
    if (!criticalFailed && nonCritical.length > 0) {
      nonCriticalResults = await this.invokeHandlersBatch(event, nonCritical, false);
    }

    const allResults = [...criticalResults, ...nonCriticalResults];
    const succeeded = allResults.filter((r) => r.success).length;
    const failed = allResults.filter((r) => !r.success).length;

    let status: EventDispatchResult["status"];
    if (criticalFailed) {
      status = "failed";
    } else if (failed > 0) {
      status = "completed_with_errors";
    } else {
      status = "completed";
    }

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      status,
      handlersInvoked: allResults.length,
      handlersSucceeded: succeeded,
      handlersFailed: failed,
    };
  }

  private async invokeHandlersBatch(
    event: DomainEvent,
    handlers: HandlerInfo[],
    stopOnFailure: boolean
  ): Promise<HandlerResult[]> {
    const results: HandlerResult[] = [];
    const limit = EventDispatchWorkflow.CONCURRENCY_LIMIT;

    for (let i = 0; i < handlers.length; i += limit) {
      const batch = handlers.slice(i, i + limit);
      const batchResults = await Promise.all(
        batch.map((h) => this.invokeHandler(event, h))
      );
      results.push(...batchResults);

      if (stopOnFailure && batchResults.some((r) => !r.success)) {
        break;
      }
    }

    return results;
  }

  @DBOS.step()
  private async persistEvent(event: DomainEvent): Promise<void> {
    await this.broker.call("events.persistEvent", event);
  }

  @DBOS.step()
  private async discoverHandlers(eventType: string): Promise<HandlerInfo[]> {
    const response = await this.broker.call("bootstrap.getEventHandlers", { eventType });
    return response.handlers ?? [];
  }

  @DBOS.step({ maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 })
  private async invokeHandler(event: DomainEvent, handler: HandlerInfo): Promise<HandlerResult> {
    const ctx = buildEventHandlerContext(
      event.eventType,
      event.eventId,
      handler.service,
      handler.action,
      event,
      OperationPresets.CREATE,
      event.context.projectId
    );

    const response: ActionResponse<unknown> = await this.broker.fire(
      `${handler.service}.${handler.action}`,
      { event },
      ctx
    );

    if (response.error) {
      if (response.error.retryable) {
        throw new Error(`TRANSIENT: ${response.error.message}`);
      }
      return { service: handler.service, action: handler.action, success: false };
    }

    return { service: handler.service, action: handler.action, success: true };
  }
}

interface HandlerInfo {
  service: string;
  action: string;
  critical: boolean;
}

interface HandlerResult {
  service: string;
  action: string;
  success: boolean;
}
```

### Step 6.3: Event Emitter

**File: `packages/events/src/emitter.ts`**

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { DomainEvent } from "./types.js";
import { EventDispatchWorkflow, type EventDispatchResult } from "./workflows/EventDispatchWorkflow.js";

export class EventEmitter {
  /**
   * Emit an event (fire-and-forget, starts durable dispatch workflow).
   * The workflow runs with idempotent ID based on eventId.
   */
  @DBOS.step()
  async emit<TEvent extends DomainEvent>(event: TEvent): Promise<{ workflowId: string }> {
    const workflowId = EventDispatchWorkflow.workflowID(event);

    // Start workflow in background (don't await result)
    DBOS.startWorkflow(EventDispatchWorkflow, { workflowID: workflowId })
      .dispatch(event)
      .catch((err) => console.error("EventDispatch failed", { workflowId, err }));

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

## Phase 7: Cleanup Job

### Step 7.1: Cleanup Cron

**File: `packages/idempotency/src/cleanup.ts`**

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { IdempotencyRepository } from "./repository.js";

export class IdempotencyCleanupJob {
  constructor(private readonly repo: IdempotencyRepository) {}

  /**
   * Run cleanup every hour.
   * Deletes expired idempotency records in batches.
   */
  @DBOS.scheduled({ crontab: "0 * * * *" })
  @DBOS.workflow()
  async cleanup(): Promise<{ deleted: number }> {
    let totalDeleted = 0;
    let batchDeleted: number;

    do {
      batchDeleted = await this.cleanupBatch();
      totalDeleted += batchDeleted;
    } while (batchDeleted > 0);

    console.log(`Idempotency cleanup: deleted ${totalDeleted} expired records`);
    return { deleted: totalDeleted };
  }

  @DBOS.step()
  private async cleanupBatch(): Promise<number> {
    return this.repo.cleanup(1000);
  }
}
```

---

## Summary: File Checklist

### New Packages

| File | Purpose |
|------|---------|
| `packages/idempotency/package.json` | Package config |
| `packages/idempotency/src/types.ts` | Core types |
| `packages/idempotency/src/utils.ts` | Utility functions |
| `packages/idempotency/src/context.ts` | Context builders |
| `packages/idempotency/src/schema.ts` | Drizzle schema |
| `packages/idempotency/src/repository.ts` | DB operations |
| `packages/idempotency/src/withIdempotency.ts` | Main helper |
| `packages/idempotency/src/cleanup.ts` | Cleanup job |
| `packages/idempotency/src/index.ts` | Exports |
| `packages/events/src/types.ts` | Event types |
| `packages/events/src/emitter.ts` | Event emitter |
| `packages/events/src/workflows/EventDispatchWorkflow.ts` | Dispatch workflow |

### New Files

| File | Purpose |
|------|---------|
| `packages/shared-kernel/src/decorators/Fire.ts` | `@Fire` decorator for idempotent actions |

### Modified Files

| File | Changes |
|------|---------|
| `packages/shared-kernel/src/broker/ServiceBroker.ts` | Add `fire()` method |
| `packages/shared-kernel/src/decorators/index.ts` | Export `Fire` decorator |
| `packages/shared-kernel/src/broker/BrokerActions.ts` | Register `__fire` handlers via `@Fire` |
| `services/*/migrations/` | Add `processed_requests` table |
| `services/*/src/*BrokerActions.ts` | Add `@Fire` handlers |
| `services/*/src/workflows/*.ts` | Use `broker.fire()` with context |

### Migration Order

1. ✅ Create `@shopana/idempotency` package
2. ✅ Update `@shopana/shared-kernel` (broker.fire, @Fire decorator)
3. ✅ Add `processed_requests` migration to IAM, Project, Media
4. ✅ Update IamBrokerActions with `@Fire` handlers
5. ✅ Update StoreCreateWorkflow to use broker.fire()
6. ✅ Create `@shopana/events` package
7. ✅ Add EventDispatchWorkflow
8. ✅ Add cleanup job

---

## Testing Checklist

- [ ] Unit test: canonicalJson produces stable output
- [ ] Unit test: buildWorkflowContext generates consistent keys
- [ ] Unit test: withIdempotency returns cached result on replay
- [ ] Unit test: withIdempotency detects payload conflict
- [ ] Integration test: broker.fire() with IdempotencyRepository
- [ ] Integration test: StoreCreateWorkflow retry produces no duplicates
- [ ] Integration test: EventDispatchWorkflow fan-out
- [ ] E2E test: Full store creation flow with idempotency

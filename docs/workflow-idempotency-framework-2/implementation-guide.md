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

/**
 * Minimal shape used by withIdempotency (storage implementation may include more fields).
 */
export interface IdempotencyRecord {
  idempotencyKey: string;
  status: "reserved" | "completed" | "failed";
  payloadHash: string;
  attempt: number;
  result?: unknown;
  resultCached: boolean;
  leaseExpiresAt?: Date | null;
  completedAt?: Date | null;
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

## Phase 2: Idempotency Storage

### Step 2.1: Provide a Service-Local Idempotency Store

Each service that uses idempotency must provide a durable storage adapter for
idempotency state. Storage is service-owned (SQL, KV, etc.) and must support
reserve/claim/complete/fail semantics plus TTL cleanup.

The adapter must return the `IdempotencyRecord` shape used by `withIdempotency()`.

---

## Phase 3: Idempotency Helpers

### Step 3.1: Idempotency Repository Interface

**File: `packages/idempotency/src/repository.ts`**

The repository is storage-agnostic; each service provides an implementation
backed by its chosen durable store.

```typescript
import type { ActionContext, IdempotencyRecord } from "./types.js";

export interface ReservationResult {
  acquired: boolean;
  existing?: IdempotencyRecord;
  attemptOwner?: string;
}

export interface ClaimResult {
  claimed: boolean;
  attemptOwner?: string;
}

export interface IdempotencyRepository {
  tryReserve(ctx: ActionContext): Promise<ReservationResult>;
  tryClaimExpired(idempotencyKey: string): Promise<ClaimResult>;
  tryClaimFailed(idempotencyKey: string): Promise<ClaimResult>;
  complete(
    idempotencyKey: string,
    attemptOwner: string,
    result: unknown,
    cacheResult: boolean,
    ttlMs: number
  ): Promise<boolean>;
  fail(
    idempotencyKey: string,
    attemptOwner: string,
    errorInfo: string,
    ttlMs: number
  ): Promise<boolean>;
  cleanup?(batchSize?: number): Promise<number>;
}
```

### Step 3.2: withIdempotency Helper

**File: `packages/idempotency/src/withIdempotency.ts`**

```typescript
import type {
  ActionContext,
  ActionResponse,
  ActionError,
  IdempotencyRecord,
} from "./types.js";
import type { IdempotencyRepository } from "./repository.js";

export interface IdempotencyHelpers {
  repo: IdempotencyRepository;
}

/**
 * Universal idempotency wrapper for BrokerActions.
 * This is invoked by shared-kernel (not by service code directly).
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

    if (existing.status === "failed" && !ctx.operation.allowSamePayloadRetry) {
      return {
        result: null as TResult,
        error: {
          code: "CONFLICT",
          message: "Idempotency key previously failed; retries disabled",
          retryable: false,
        },
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

    return buildSuccessResponse(result, ctx);
  } catch (error) {
    const errorInfo = error instanceof Error ? error.message : String(error);
    await repo.fail(ctx.idempotencyKey, attemptOwner, errorInfo, ctx.operation.ttlMs);

    return {
      result: null as TResult,
      error: mapToActionError(error),
    };
  }
}

function buildSuccessResponse<TResult>(
  result: TResult,
  ctx: ActionContext
): ActionResponse<TResult> {
  if (ctx.operation.resultMode === "full") {
    return { result };
  }

  if (ctx.operation.resultMode === "minimal") {
    return { result: null as TResult };
  }

  return {
    result: null as TResult,
    meta: {
      receipt: {
        idempotencyKey: ctx.idempotencyKey,
        status: "completed",
        completedAt: new Date().toISOString(),
      },
    },
  };
}

function buildCompletedResponse<TResult>(
  existing: IdempotencyRecord,
  ctx: ActionContext
): ActionResponse<TResult> {
  if (ctx.operation.resultMode === "full" && existing.resultCached && existing.result !== null) {
    return {
      result: existing.result as TResult,
      meta: { idempotent: true, attempt: existing.attempt },
    };
  }

  if (ctx.operation.resultMode === "minimal") {
    return {
      result: null as TResult,
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

function buildInProgressResponse<TResult>(
  existing: IdempotencyRecord
): ActionResponse<TResult> {
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
  let handler:
    | ((input: ActionRequest<TPayload>) => Promise<ActionResponse<TResult>>)
    | undefined;

  try {
    handler = this.registry.resolve<ActionRequest<TPayload>, ActionResponse<TResult>>(
      qualifiedAction + "__fire"
    );
  } catch {
    handler = undefined;
  }

  // If no __fire handler registered, fall back to legacy call
  if (!handler) {
    let legacyHandler: ((payload: TPayload) => Promise<TResult>) | undefined;
    try {
      legacyHandler = this.registry.resolve<TPayload, TResult>(qualifiedAction);
    } catch {
      return {
        result: null as TResult,
        error: {
          code: "NOT_FOUND",
          message: `Action not found: ${qualifiedAction}`,
          retryable: false,
        },
      };
    }
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
 * async createUserFire(params: CreateUserParams): Promise<User> {
 *   return this.doCreate(params);
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

### Step 4.3: Update BrokerActions Registration (Declarative Idempotency)

**File: `packages/shared-kernel/src/broker/BrokerActions.ts`**

Update the registration logic to handle both `@Action` and `@Fire` decorators,
and make idempotency automatic for `@Fire` without service-level imports.

```typescript
import { ACTION_METADATA_KEY, type ActionMetadata } from "../decorators/Action.js";
import { FIRE_METADATA_KEY, type FireMetadata } from "../decorators/Fire.js";
import {
  withIdempotency,
  type ActionRequest,
  type ActionResponse,
  type ActionContext,
  type OperationConfig,
} from "@shopana/idempotency";
import type { IdempotencyRepository } from "@shopana/idempotency";

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

/**
 * Override in services that support idempotency.
 * Keeps idempotency wiring out of service method bodies.
 */
protected getIdempotencyRepo(): IdempotencyRepository | undefined {
  return undefined;
}

private wrapFireHandler<TPayload, TResult>(
  method: (payload: TPayload) => Promise<TResult>,
  operation: OperationConfig
): (input: ActionRequest<TPayload>) => Promise<ActionResponse<TResult>> {
  return async (input: ActionRequest<TPayload>) => {
    const ctx: ActionContext | undefined = input.ctx
      ? { ...input.ctx, operation: input.ctx.operation ?? operation }
      : undefined;

    const repo = this.getIdempotencyRepo();
    if (!repo) {
      // No repo configured: fall back to direct execution
      try {
        const result = await method(input.payload);
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

    return withIdempotency(ctx, input.payload, { repo }, (payload) => method(payload));
  };
}
```

---

## Phase 5: Migrate Critical Workflows

### Step 5.1: Example - StoreCreateWorkflow

**File: `services/project/src/workflows/StoreCreateWorkflow.ts`**

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import {
  buildWorkflowContext,
  ServiceError,
  OperationPresets,
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

### Step 5.2: Example - IamBrokerActions (Declarative Idempotency)

**File: `services/iam/src/IamBrokerActions.ts`**

```typescript
import {
  Action,
  Fire,
  BrokerActions,
  ZodSchema,
} from "@shopana/shared-kernel";
import {
  OperationPresets,
  IdempotencyRepository,
} from "@shopana/idempotency";

export class IamBrokerActions extends BrokerActions {
  constructor(
    /* ... */,
    private readonly idempotencyRepo: IdempotencyRepository
  ) {
    super(/* ... */);
  }

  protected getIdempotencyRepo(): IdempotencyRepository | undefined {
    return this.idempotencyRepo;
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
   * Idempotency is handled by BrokerActions.wrapFireHandler.
   */
  @Fire("createRoles", OperationPresets.CREATE)
  async createRolesFire(params: CreateRolesParams): Promise<CreateRolesResult> {
    const result = await this.kernel.runScript(CreateRolesScript, params);
    if (result.userErrors?.length) {
      throw new Error(result.userErrors[0].message);
    }
    return result;
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

### Step 6.2: Dead Letter Queue Schema

**File: `packages/events/src/schema.ts`**

```typescript
import { pgSchema, text, integer, timestamp, jsonb, uuid, index, sql } from "drizzle-orm/pg-core";

export const eventsSchema = pgSchema("events");

/**
 * Dead Letter Queue for failed event handlers.
 * Stores events that couldn't be processed after all retries.
 */
export const deadLetterQueue = eventsSchema.table(
  "dead_letter_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Event reference
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    event: jsonb("event").notNull(),

    // Failed handler
    handlerService: text("handler_service").notNull(),
    handlerAction: text("handler_action").notNull(),
    handlerCritical: boolean("handler_critical").notNull().default(false),

    // Error info
    error: text("error").notNull(),
    errorCode: text("error_code"),
    attempts: integer("attempts").notNull(),

    // Context
    projectId: text("project_id"),
    correlationId: text("correlation_id"),

    // Status
    status: text("status").notNull().default("failed"), // failed | retried | discarded

    // Timestamps
    failedAt: timestamp("failed_at", { withTimezone: true }).notNull().defaultNow(),
    retriedAt: timestamp("retried_at", { withTimezone: true }),
    discardedAt: timestamp("discarded_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_dlq_status").on(table.status),
    index("idx_dlq_event_type").on(table.eventType, table.status),
    index("idx_dlq_project").on(table.projectId, table.status),
    index("idx_dlq_handler").on(table.handlerService, table.handlerAction),
    index("idx_dlq_expires").on(table.expiresAt).where(sql`expires_at IS NOT NULL`),
  ]
);

export type DeadLetterEntry = typeof deadLetterQueue.$inferSelect;
export type NewDeadLetterEntry = typeof deadLetterQueue.$inferInsert;
```

**SQL Migration: `packages/events/migrations/0001_dead_letter_queue.sql`**

```sql
CREATE SCHEMA IF NOT EXISTS events;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS events.dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event JSONB NOT NULL,

  handler_service TEXT NOT NULL,
  handler_action TEXT NOT NULL,
  handler_critical BOOLEAN NOT NULL DEFAULT FALSE,

  error TEXT NOT NULL,
  error_code TEXT,
  attempts INTEGER NOT NULL,

  project_id TEXT,
  correlation_id TEXT,

  status TEXT NOT NULL DEFAULT 'failed' CHECK (status IN ('failed', 'retried', 'discarded')),

  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retried_at TIMESTAMPTZ,
  discarded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_dlq_status ON events.dead_letter_queue(status);
CREATE INDEX idx_dlq_event_type ON events.dead_letter_queue(event_type, status);
CREATE INDEX idx_dlq_project ON events.dead_letter_queue(project_id, status);
CREATE INDEX idx_dlq_handler ON events.dead_letter_queue(handler_service, handler_action);
CREATE INDEX idx_dlq_expires ON events.dead_letter_queue(expires_at) WHERE expires_at IS NOT NULL;
```

### Step 6.3: Dead Letter Queue Repository

**File: `packages/events/src/dlq/repository.ts`**

```typescript
import { eq, and, sql, lt } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { deadLetterQueue, type DeadLetterEntry, type NewDeadLetterEntry } from "../schema.js";
import type { DomainEvent } from "../types.js";

export interface FailedHandlerInfo {
  event: DomainEvent;
  handler: { service: string; action: string; critical: boolean };
  error: string;
  errorCode?: string;
  attempts: number;
}

export class DeadLetterRepository {
  constructor(private readonly db: PgDatabase<any, any, any>) {}

  /**
   * Add a failed handler invocation to DLQ.
   */
  async add(info: FailedHandlerInfo): Promise<DeadLetterEntry> {
    const entry: NewDeadLetterEntry = {
      eventId: info.event.eventId,
      eventType: info.event.eventType,
      event: info.event as unknown as Record<string, unknown>,
      handlerService: info.handler.service,
      handlerAction: info.handler.action,
      handlerCritical: info.handler.critical,
      error: info.error,
      errorCode: info.errorCode,
      attempts: info.attempts,
      projectId: info.event.context.projectId,
      correlationId: info.event.context.correlationId,
      status: "failed",
      // Auto-expire after 30 days
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    const [result] = await this.db.insert(deadLetterQueue).values(entry).returning();
    return result;
  }

  /**
   * Get failed entries for retry.
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
   * Get failed entries by event type.
   */
  async getByEventType(eventType: string, limit: number = 100): Promise<DeadLetterEntry[]> {
    return this.db
      .select()
      .from(deadLetterQueue)
      .where(and(
        eq(deadLetterQueue.eventType, eventType),
        eq(deadLetterQueue.status, "failed")
      ))
      .orderBy(deadLetterQueue.failedAt)
      .limit(limit);
  }

  /**
   * Mark entry as retried (will be re-processed).
   */
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

  /**
   * Discard entry (won't be retried).
   */
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

  /**
   * Cleanup expired entries.
   */
  async cleanup(batchSize: number = 1000): Promise<number> {
    const result = await this.db.execute(sql`
      DELETE FROM events.dead_letter_queue
      WHERE id IN (
        SELECT id FROM events.dead_letter_queue
        WHERE expires_at IS NOT NULL AND expires_at < NOW()
        LIMIT ${batchSize}
      )
    `);

    return result.rowCount ?? 0;
  }

  /**
   * Get DLQ stats for monitoring.
   */
  async getStats(): Promise<DLQStats> {
    const result = await this.db.execute(sql`
      SELECT
        status,
        event_type,
        handler_service,
        COUNT(*) as count
      FROM events.dead_letter_queue
      GROUP BY status, event_type, handler_service
    `);

    return {
      total: result.rows.reduce((sum, r) => sum + Number(r.count), 0),
      byStatus: this.groupBy(result.rows, "status"),
      byEventType: this.groupBy(result.rows, "event_type"),
      byHandler: this.groupBy(result.rows, "handler_service"),
    };
  }

  private groupBy(rows: any[], key: string): Record<string, number> {
    return rows.reduce((acc, row) => {
      const k = row[key];
      acc[k] = (acc[k] || 0) + Number(row.count);
      return acc;
    }, {});
  }
}

export interface DLQStats {
  total: number;
  byStatus: Record<string, number>;
  byEventType: Record<string, number>;
  byHandler: Record<string, number>;
}
```

### Step 6.4: Event Dispatch Workflow

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
import type { DeadLetterRepository } from "../dlq/repository.js";

export interface EventDispatchResult {
  eventId: string;
  eventType: string;
  status: "completed" | "completed_with_errors" | "failed";
  handlersInvoked: number;
  handlersSucceeded: number;
  handlersFailed: number;
  dlqEntries: number;
}

export class EventDispatchWorkflow {
  constructor(
    private readonly broker: ServiceBroker,
    private readonly dlqRepo: DeadLetterRepository
  ) {}

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
  private static readonly MAX_ATTEMPTS = 3;

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
        dlqEntries: 0,
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
    const failedResults = allResults.filter((r) => !r.success);

    // Step 6: Send permanently failed handlers to DLQ
    let dlqEntries = 0;
    for (const result of failedResults) {
      await this.sendToDLQ(event, result);
      dlqEntries++;
    }

    let status: EventDispatchResult["status"];
    if (criticalFailed) {
      status = "failed";
    } else if (failedResults.length > 0) {
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
      handlersFailed: failedResults.length,
      dlqEntries,
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
        batch.map(async (h) => {
          try {
            return await this.invokeHandler(event, h);
          } catch (error) {
            return {
              service: h.service,
              action: h.action,
              critical: h.critical,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              errorCode: "TRANSIENT_MAX_RETRIES",
              attempts: EventDispatchWorkflow.MAX_ATTEMPTS,
            };
          }
        })
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
        // Transient error - throw to trigger DBOS retry
        throw new Error(`TRANSIENT: ${response.error.message}`);
      }
      // Permanent error - return failure (will go to DLQ)
      return {
        service: handler.service,
        action: handler.action,
        critical: handler.critical,
        success: false,
        error: response.error.message,
        errorCode: response.error.code,
        attempts: EventDispatchWorkflow.MAX_ATTEMPTS,
      };
    }

    return {
      service: handler.service,
      action: handler.action,
      critical: handler.critical,
      success: true,
    };
  }

  /**
   * Send permanently failed handler to Dead Letter Queue.
   */
  @DBOS.step()
  private async sendToDLQ(event: DomainEvent, result: HandlerResult): Promise<void> {
    if (result.success) return;

    await this.dlqRepo.add({
      event,
      handler: {
        service: result.service,
        action: result.action,
        critical: result.critical,
      },
      error: result.error ?? "Unknown error",
      errorCode: result.errorCode,
      attempts: result.attempts ?? EventDispatchWorkflow.MAX_ATTEMPTS,
    });

    console.warn("Handler failed permanently, sent to DLQ", {
      eventId: event.eventId,
      eventType: event.eventType,
      handler: `${result.service}.${result.action}`,
      error: result.error,
    });
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
  critical: boolean;
  success: boolean;
  error?: string;
  errorCode?: string;
  attempts?: number;
}
```

### Step 6.5: Event Emitter

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

### Step 6.6: DLQ Retry Workflow

**File: `packages/events/src/dlq/retry.ts`**

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { DeadLetterRepository, DeadLetterEntry } from "./repository.js";
import type { DomainEvent } from "../types.js";
import type { ServiceBroker } from "@shopana/shared-kernel";
import { buildEventHandlerContext, OperationPresets, type ActionResponse } from "@shopana/idempotency";

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

  /**
   * Retry a single DLQ entry.
   */
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

  /**
   * Retry all failed entries for a specific event type.
   * Useful after deploying a bug fix.
   */
  @DBOS.workflow()
  async retryByEventType(eventType: string, limit: number = 100): Promise<DLQRetryResult> {
    const entries = await this.dlqRepo.getByEventType(eventType, limit);
    return this.retryEntries(entries);
  }

  /**
   * Retry batch of failed entries.
   */
  @DBOS.workflow()
  async retryBatch(limit: number = 50): Promise<DLQRetryResult> {
    const entries = await this.dlqRepo.getFailedEntries(limit);
    return this.retryEntries(entries);
  }

  private async retryEntries(entries: DeadLetterEntry[]): Promise<DLQRetryResult> {
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

    return {
      processed: entries.length,
      succeeded,
      failed,
    };
  }

  @DBOS.step({ maxAttempts: 1 }) // No auto-retry for DLQ - we control retries
  private async invokeHandler(entry: DeadLetterEntry): Promise<{ success: boolean; error?: string }> {
    const event = entry.event as unknown as DomainEvent;

    const ctx = buildEventHandlerContext(
      entry.eventType,
      entry.eventId,
      entry.handlerService,
      entry.handlerAction,
      event,
      OperationPresets.CREATE,
      entry.projectId ?? undefined
    );

    const response: ActionResponse<unknown> = await this.broker.fire(
      `${entry.handlerService}.${entry.handlerAction}`,
      { event },
      ctx
    );

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return { success: true };
  }
}
```

### Step 6.7: DLQ Admin Operations

**File: `packages/events/src/dlq/admin.ts`**

```typescript
import type { DeadLetterRepository, DLQStats } from "./repository.js";
import { DLQRetryWorkflow, type DLQRetryResult } from "./retry.js";

/**
 * Admin operations for Dead Letter Queue.
 * Expose via internal API or CLI tool.
 */
export class DLQAdmin {
  constructor(
    private readonly dlqRepo: DeadLetterRepository,
    private readonly retryWorkflow: DLQRetryWorkflow
  ) {}

  /**
   * Get DLQ statistics for monitoring dashboard.
   */
  async getStats(): Promise<DLQStats> {
    return this.dlqRepo.getStats();
  }

  /**
   * Retry a specific failed entry.
   */
  async retryEntry(entryId: string): Promise<{ success: boolean; error?: string }> {
    return this.retryWorkflow.retryEntry(entryId);
  }

  /**
   * Retry all failed entries for an event type.
   * Use after deploying a fix for a handler bug.
   */
  async retryEventType(eventType: string, limit?: number): Promise<DLQRetryResult> {
    return this.retryWorkflow.retryByEventType(eventType, limit);
  }

  /**
   * Retry a batch of oldest failed entries.
   */
  async retryBatch(limit?: number): Promise<DLQRetryResult> {
    return this.retryWorkflow.retryBatch(limit);
  }

  /**
   * Discard an entry (won't be retried).
   * Use for known-bad data that can't be processed.
   */
  async discardEntry(entryId: string, reason: string): Promise<boolean> {
    return this.dlqRepo.discard(entryId, reason);
  }

  /**
   * Get failed entries for inspection.
   */
  async listFailed(limit: number = 100) {
    return this.dlqRepo.getFailedEntries(limit);
  }

  /**
   * Get failed entries by event type.
   */
  async listByEventType(eventType: string, limit: number = 100) {
    return this.dlqRepo.getByEventType(eventType, limit);
  }
}
```

---

## Phase 7: Cleanup Jobs

### Step 7.1: Idempotency Cleanup

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

### Step 7.2: DLQ Cleanup

**File: `packages/events/src/dlq/cleanup.ts`**

```typescript
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { DeadLetterRepository } from "./repository.js";

export class DLQCleanupJob {
  constructor(private readonly dlqRepo: DeadLetterRepository) {}

  /**
   * Run DLQ cleanup daily at 3 AM.
   * Deletes entries older than 30 days.
   */
  @DBOS.scheduled({ crontab: "0 3 * * *" })
  @DBOS.workflow()
  async cleanup(): Promise<{ deleted: number }> {
    let totalDeleted = 0;
    let batchDeleted: number;

    do {
      batchDeleted = await this.cleanupBatch();
      totalDeleted += batchDeleted;
    } while (batchDeleted > 0);

    console.log(`DLQ cleanup: deleted ${totalDeleted} expired entries`);
    return { deleted: totalDeleted };
  }

  @DBOS.step()
  private async cleanupBatch(): Promise<number> {
    return this.dlqRepo.cleanup(1000);
  }
}
```

---

## Summary: File Checklist

### New Packages

**@shopana/idempotency**

| File | Purpose |
|------|---------|
| `packages/idempotency/package.json` | Package config |
| `packages/idempotency/src/types.ts` | Core types |
| `packages/idempotency/src/utils.ts` | Utility functions |
| `packages/idempotency/src/context.ts` | Context builders |
| `packages/idempotency/src/repository.ts` | DB operations |
| `packages/idempotency/src/withIdempotency.ts` | Main helper |
| `packages/idempotency/src/cleanup.ts` | Cleanup job |
| `packages/idempotency/src/index.ts` | Exports |

**@shopana/events**

| File | Purpose |
|------|---------|
| `packages/events/src/types.ts` | Event types |
| `packages/events/src/schema.ts` | DLQ schema |
| `packages/events/src/emitter.ts` | Event emitter |
| `packages/events/src/workflows/EventDispatchWorkflow.ts` | Dispatch workflow |
| `packages/events/src/dlq/repository.ts` | DLQ repository |
| `packages/events/src/dlq/retry.ts` | DLQ retry workflow |
| `packages/events/src/dlq/admin.ts` | DLQ admin operations |
| `packages/events/src/dlq/cleanup.ts` | DLQ cleanup job |
| `packages/events/migrations/0001_dead_letter_queue.sql` | DLQ migration |

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
| `services/*/src/*BrokerActions.ts` | Add `@Fire` handlers |
| `services/*/src/workflows/*.ts` | Use `broker.fire()` with context |

### Migration Order

1. ✅ Create `@shopana/idempotency` package
2. ✅ Update `@shopana/shared-kernel` (broker.fire, @Fire decorator)
3. ✅ Update IamBrokerActions with `@Fire` handlers
4. ✅ Update StoreCreateWorkflow to use broker.fire()
5. ✅ Create `@shopana/events` package
6. ✅ Add EventDispatchWorkflow with DLQ integration
7. ✅ Add Dead Letter Queue (schema, repository, retry, admin)
8. ✅ Add cleanup jobs (idempotency + DLQ)

---

## Testing Checklist

### Idempotency

- [ ] Unit test: canonicalJson produces stable output
- [ ] Unit test: buildWorkflowContext generates consistent keys
- [ ] Unit test: withIdempotency returns cached result on replay
- [ ] Unit test: withIdempotency detects payload conflict
- [ ] Integration test: broker.fire() with idempotency storage adapter
- [ ] Integration test: StoreCreateWorkflow retry produces no duplicates

### Event Dispatch

- [ ] Integration test: EventDispatchWorkflow fan-out
- [ ] Integration test: Critical handler failure stops non-critical
- [ ] Integration test: Failed handlers go to DLQ

### Dead Letter Queue

- [ ] Unit test: DLQ repository add/get/mark operations
- [ ] Integration test: DLQ retry workflow re-invokes handler
- [ ] Integration test: DLQ cleanup removes expired entries
- [ ] Integration test: DLQ stats aggregation

### E2E

- [ ] Full store creation flow with idempotency
- [ ] Event emission with handler failure → DLQ → retry

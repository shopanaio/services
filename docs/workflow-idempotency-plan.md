---

# DBOS Workflow Idempotency Architecture (Corrected v2)

**Author**: Generated from existing codebase patterns
**Date**: 2025-01-18
**Last Updated**: 2025-01-18

## Overview

This document describes how to add idempotency support to DBOS workflows when calling external services via `ServiceBroker`. The goal is to make workflow retries and recovery safe without duplicate side effects.

**Key insight**: Idempotency must be based on **business operation identity** (`dedupeKey`), not an execution instance. This ensures idempotency survives orchestrator restarts (new pod, new DBOS execution).

✅ **Corrections included in this revision (v2)**

1. **Payload safety**: “same idempotency key” must imply **same payload** → add `payloadHash` and enforce it service-side **for all statuses**.
2. **Lease safety**: prevent dual-execution in stale-claim races → add `lease_owner` + `lease_expires_at`, and make completion **owner-aware** (only the current lease owner can complete/fail).
3. **Attempt-scoped lease owner**: `lease_owner` must be a per-attempt UUID (not `executionId`, not `"unknown"`).
4. **dedupeKey normalization**: canonical `dedupeKey` to avoid accidental mismatch (case/whitespace/unicode).
5. **Canonical JSON contract**: define stable canonicalization rules to avoid false conflicts.
6. **Result semantics**: if you don’t cache full results, return a deterministic **receipt** rather than a fake `{success:true}`.
7. **Transient/non-transient mapping**: strict contract (`TRANSIENT_*` => retryable) so orchestrator restarts correctly.

---

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
   * | Concept | Purpose | Format | Source |
   * |---------|---------|--------|--------|
   * | `dedupeKey` | Global idempotency (survives restarts) | Canonical: `store:create:org-123:my-store` | `Workflow.workflowID(input)` |
   * | `executionId` | Tracing/diagnostics only | UUID | Optional |
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
   */
  callId: string;

  /**
   * Unique key for idempotency lookup.
   * Generated as SHA-256 hash of: dedupeKey + service + action + callId
   */
  idempotencyKey: string;

  /**
   * Hash of canonical JSON payload.
   * Enforces "same idempotencyKey => same payload".
   */
  payloadHash: string;

  /**
   * Optional: Current execution instance ID (for tracing only).
   * May differ on restart - NOT used for idempotency!
   */
  executionId?: string;

  /** Optional: distributed tracing ID. */
  traceId?: string;
}
```

#### 2. ActionRequest / ActionResponse (Explicit Envelope)

```typescript
// packages/workflows/src/types.ts

export interface ActionRequest<T = unknown> {
  payload: T;
  ctx: ActionContext;
}

export interface ActionResponse<T = unknown> {
  result: T;
  error?: ActionError;
  meta?: {
    /** True if this was a duplicate request (idempotent replay) */
    idempotent?: boolean;

    /** Attempt counter from service-side record */
    attempt?: number;

    /** Optional receipt for non-cached responses */
    receipt?: ActionReceipt;
  };
}

export interface ActionReceipt {
  idempotencyKey: string;
  status: "completed";
  completedAt: string; // ISO
}

export interface ActionError {
  code: string;
  message: string;
  retryable?: boolean;
}
```

#### 3. ServiceError (for Workflow-Side)

(kept as-is)

```typescript
// packages/workflows/src/types.ts

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

✅ **Fixes applied**:

* `dedupeKey` must be **canonical** so the same business intent maps to the same key.
* Add `payloadHash`, derived from **canonical JSON** of payload.
* `idempotencyKey` stays `sha256(dedupeKey/service/action/callId)`.
* Canonical JSON rules are specified explicitly (see below).

```typescript
// packages/workflows/src/context.ts

import crypto from "node:crypto";
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { ActionContext } from "./types.js";

/**
 * Canonicalize dedupeKey inputs to avoid accidental mismatch:
 * - trim
 * - lowercase (prefer fixed locale or constrain to slug)
 * - unicode normalize (NFKC)
 *
 * If you already validate to a slug/handle, canonicalize variable parts there instead.
 */
function canonicalizeDedupeKey(dedupeKey: string): string {
  return dedupeKey.trim().toLowerCase().normalize("NFKC");
}

/**
 * Canonical JSON: stable key ordering + deterministic representation.
 *
 * Rules (MUST be consistent everywhere payloadHash is computed):
 * - Objects: keys sorted lexicographically
 * - Arrays: preserve order (do NOT sort)
 * - Date: convert to ISO string before hashing (caller responsibility or handled here)
 * - BigInt: convert to string
 * - undefined: either removed or converted (choose ONE; here we REMOVE)
 * - Functions/classes/symbols: prohibited
 */
function canonicalJson(value: unknown): string {
  return stableStringify(value); // implement/import stable stringify with the rules above
}

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function buildActionContext<TPayload>(
  dedupeKey: string,
  service: string,
  action: string,
  callId: string,
  payload: TPayload,
  executionId?: string
): ActionContext {
  if (!dedupeKey || !dedupeKey.trim()) {
    throw new Error(`dedupeKey is required for ${service}.${action}`);
  }
  if (!callId || !callId.trim()) {
    throw new Error(`callId is required and must be deterministic for ${service}.${action}`);
  }

  const canonicalKey = canonicalizeDedupeKey(dedupeKey);
  const idempotencyKey = sha256Hex([canonicalKey, service, action, callId].join("\n"));
  const payloadHash = sha256Hex(canonicalJson(payload));

  return {
    version: 1,
    dedupeKey: canonicalKey,
    service,
    action,
    callId,
    idempotencyKey,
    payloadHash,
    executionId,
    traceId: DBOS.traceId,
  };
}
```

---

## Refactored Workflow

✅ **Fix applied**: recommend making `workflowID()` produce **canonical** key (orgId + normalized store handle).

```typescript
static workflowID(input: StoreCreateInput): string {
  const name = input.name.trim().toLowerCase().normalize("NFKC");
  return `store:create:${input.organizationId}:${name}`;
}
```

Workflow steps build payload first → build ctx with payload → call broker with envelope.

```typescript
// services/project/src/workflows/StoreCreateWorkflow.ts

@DBOS.step()
private async createStoreRoles(dedupeKey: string, storeId: string, organizationId: string, userId: string) {
  const payload = {
    userId,
    organizationId,
    domain: `store:${storeId}`,
    roles: buildStoreRoles(),
  };

  const ctx = buildActionContext(dedupeKey, "iam", "createRoles", storeId, payload);

  const request: ActionRequest = { payload, ctx };

  const response = await this.broker.call<ActionResponse>("iam.createRoles", request);

  if (response.error) {
    throw ServiceError.fromActionError("iam", "createRoles", response.error);
  }
}
```

Do the same for `assignRole`, `createAssetGroup`, etc.

---

## Service-Side: Handling ActionRequest

### Design Rule: Never Throw, Always Return

**Action handlers ALWAYS return `ActionResponse`, NEVER throw** (except programmer errors; dispatcher catches them and returns `INTERNAL_ERROR`).

✅ **Fixes applied**:

* Enforce `payloadHash` consistency **for any existing key** (reserved/completed/failed).
* Use **lease owner + expiration** to prevent dual execution.
* Make completion/failure **owner-aware** so stale workers can’t overwrite a newer attempt.

---

## Idempotency Support

### Database Table (Corrected v2)

✅ **Fixes applied**:

* store `payload_hash`
* add lease fields: `lease_owner`, `lease_expires_at`
* add `lease_token` (attempt-scoped UUID) OR use `lease_owner` as that token (recommended)
* optional `status` check constraint

```sql
CREATE TABLE IF NOT EXISTS processed_requests (
  idempotency_key TEXT PRIMARY KEY,

  dedupe_key TEXT NOT NULL,
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  call_id TEXT NOT NULL,

  -- Enforce same key => same payload
  payload_hash TEXT NOT NULL,

  execution_id TEXT,

  result JSONB,
  result_cached BOOLEAN NOT NULL DEFAULT FALSE,

  status TEXT NOT NULL DEFAULT 'reserved',  -- 'reserved' | 'completed' | 'failed'

  attempt INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,

  -- Lease mechanism
  lease_owner TEXT,            -- attempt-scoped UUID (NOT executionId)
  lease_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Optional safety: status constraint
ALTER TABLE processed_requests
  ADD CONSTRAINT processed_requests_status_chk
  CHECK (status IN ('reserved', 'completed', 'failed'));

CREATE INDEX idx_processed_requests_dedupe_key ON processed_requests(dedupe_key);
CREATE INDEX idx_processed_requests_cleanup ON processed_requests(status, created_at)
  WHERE status IN ('completed', 'failed');

CREATE INDEX idx_processed_requests_lease ON processed_requests(status, lease_expires_at)
  WHERE status = 'reserved';

-- Optional debugging index
CREATE INDEX idx_processed_requests_service_action_dedupe
  ON processed_requests(service, action, dedupe_key);
```

---

## Idempotency Helper Methods (Corrected v2)

Key changes:

* Lease owner is a **new UUID per attempt** (`attemptOwner`)
* Claim only if `lease_expires_at < now()`
* Heartbeat extends lease (optional)
* **Complete/fail are owner-aware**: update only when `lease_owner = attemptOwner` and `status='reserved'`

```typescript
// In BrokerActions base class or mixin

import crypto from "node:crypto";

private readonly LEASE_MS = 5 * 60 * 1000; // 5 minutes

private leaseExpiry(): Date {
  return new Date(Date.now() + this.LEASE_MS);
}

private newAttemptOwner(): string {
  return crypto.randomUUID();
}

interface ReservationResult {
  acquired: boolean;
  existing?: ProcessedRequest;
  attemptOwner?: string; // present when this call owns the lease and may execute
}

/**
 * Reserve attempts to create a new record and acquire the lease.
 * If conflict, it loads existing record for decision logic.
 */
async tryReserveIdempotencyKey(ctx: ActionContext): Promise<ReservationResult> {
  const attemptOwner = this.newAttemptOwner();

  const insertResult = await this.db.execute(sql`
    INSERT INTO processed_requests
      (idempotency_key, dedupe_key, service, action, call_id, payload_hash,
       execution_id, status, attempt, lease_owner, lease_expires_at, created_at, updated_at)
    VALUES
      (${ctx.idempotencyKey}, ${ctx.dedupeKey}, ${ctx.service}, ${ctx.action}, ${ctx.callId}, ${ctx.payloadHash},
       ${ctx.executionId ?? null}, 'reserved', 1, ${attemptOwner}, ${this.leaseExpiry()}, NOW(), NOW())
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING idempotency_key
  `);

  if ((insertResult.rowCount ?? 0) > 0) {
    return { acquired: true, attemptOwner };
  }

  const existing = await this.db.query.processedRequests.findFirst({
    where: eq(processedRequests.idempotencyKey, ctx.idempotencyKey),
  });

  return { acquired: false, existing: existing ?? undefined };
}

/** Claim only if lease expired (reserved status) */
async tryClaimExpiredLease(idempotencyKey: string): Promise<{ claimed: boolean; attemptOwner?: string }> {
  const attemptOwner = this.newAttemptOwner();

  const result = await this.db.execute(sql`
    UPDATE processed_requests
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

  return { claimed: (result.rowCount ?? 0) > 0, attemptOwner: (result.rowCount ?? 0) > 0 ? attemptOwner : undefined };
}

/** Claim failed record for retry (become reserved + new lease) */
async tryClaimFailedKey(idempotencyKey: string): Promise<{ claimed: boolean; attemptOwner?: string }> {
  const attemptOwner = this.newAttemptOwner();

  const result = await this.db.execute(sql`
    UPDATE processed_requests
    SET status = 'reserved',
        lease_owner = ${attemptOwner},
        lease_expires_at = ${this.leaseExpiry()},
        attempt = attempt + 1,
        updated_at = NOW()
    WHERE idempotency_key = ${idempotencyKey}
      AND status = 'failed'
    RETURNING idempotency_key
  `);

  return { claimed: (result.rowCount ?? 0) > 0, attemptOwner: (result.rowCount ?? 0) > 0 ? attemptOwner : undefined };
}

/** Optional: extend lease while executing long work */
async heartbeatLease(idempotencyKey: string, attemptOwner: string): Promise<void> {
  await this.db.execute(sql`
    UPDATE processed_requests
    SET lease_expires_at = ${this.leaseExpiry()},
        updated_at = NOW()
    WHERE idempotency_key = ${idempotencyKey}
      AND status = 'reserved'
      AND lease_owner = ${attemptOwner}
  `);
}

/**
 * Complete is owner-aware to prevent stale workers overwriting newer attempts.
 */
async completeIdempotencyKey(
  idempotencyKey: string,
  attemptOwner: string,
  result?: unknown,
  cacheResult = false
): Promise<boolean> {
  const update = await this.db.execute(sql`
    UPDATE processed_requests
    SET status = 'completed',
        result = ${cacheResult ? result : null},
        result_cached = ${cacheResult && result !== undefined},
        updated_at = NOW(),
        completed_at = NOW(),
        lease_owner = NULL,
        lease_expires_at = NULL
    WHERE idempotency_key = ${idempotencyKey}
      AND status = 'reserved'
      AND lease_owner = ${attemptOwner}
    RETURNING idempotency_key
  `);

  return (update.rowCount ?? 0) > 0;
}

/**
 * Fail is owner-aware for the same reason.
 */
async failIdempotencyKey(idempotencyKey: string, attemptOwner: string, errorInfo?: string): Promise<boolean> {
  const update = await this.db.execute(sql`
    UPDATE processed_requests
    SET status = 'failed',
        last_error = ${errorInfo ?? null},
        updated_at = NOW(),
        lease_owner = NULL,
        lease_expires_at = NULL
    WHERE idempotency_key = ${idempotencyKey}
      AND status = 'reserved'
      AND lease_owner = ${attemptOwner}
    RETURNING idempotency_key
  `);

  return (update.rowCount ?? 0) > 0;
}
```

**Attempt semantics**: `attempt` counts **lease acquisitions / execution attempts**, i.e., it increments when a worker becomes eligible to execute (insert or claim). It does **not** increment on heartbeat.

---

## Service-Side BrokerActions Pattern (Corrected v2)

Key updates:

1. Reserve uses attempt-scoped `attemptOwner`.
2. On conflict: always verify payloadHash; mismatch => `CONFLICT` for any status.
3. If `completed`: return cached result if available; otherwise return deterministic **receipt**.
4. If `reserved`: claim only if lease expired; else return `TRANSIENT_IN_PROGRESS`.
5. If `failed`: claim for retry; if claim fails, return `TRANSIENT_IN_PROGRESS`.
6. Completion/failure is owner-aware; if it fails (stale owner), return transient and let retry reconcile.

```typescript
@Action("createRoles")
async createRoles(
  input: ActionRequest<CreateRolesPayload> | CreateRolesPayload
): Promise<ActionResponse<CreateRolesResult | null>> {
  const { payload, ctx } = this.unwrapRequest(input);

  // Legacy: no ctx => no idempotency
  if (!ctx) {
    const result = await this.kernel.runScript(CreateRolesScript, payload);
    return { result };
  }

  // 1) Try reserve (atomic insert + acquire lease)
  const reservation = await this.tryReserveIdempotencyKey(ctx);

  let attemptOwner: string | undefined = reservation.attemptOwner;

  if (!reservation.acquired) {
    const existing = reservation.existing!;
    if (!existing) {
      // Should be rare: conflict but record not found due to read path.
      return {
        result: null,
        error: { code: "TRANSIENT_ERROR", message: "Idempotency state unavailable", retryable: true },
      };
    }

    // ✅ Payload safety: always enforce for any existing record status
    if (existing.payloadHash !== ctx.payloadHash) {
      return {
        result: null,
        error: {
          code: "CONFLICT",
          message: "Idempotency key reused with different payload",
          retryable: false,
        },
      };
    }

    if (existing.status === "completed") {
      if (existing.resultCached) {
        return {
          result: existing.result as any,
          meta: { idempotent: true, attempt: existing.attempt },
        };
      }

      // ✅ Deterministic receipt when result is not cached
      return {
        result: null,
        meta: {
          idempotent: true,
          attempt: existing.attempt,
          receipt: {
            idempotencyKey: existing.idempotencyKey,
            status: "completed",
            completedAt: existing.completedAt?.toISOString?.() ?? new Date().toISOString(),
          },
        },
      };
    }

    if (existing.status === "reserved") {
      // 2) Try claim if lease expired
      const claim = await this.tryClaimExpiredLease(ctx.idempotencyKey);
      if (!claim.claimed) {
        return {
          result: null,
          error: {
            code: "TRANSIENT_IN_PROGRESS",
            message: "Request already in progress, please retry",
            retryable: true,
          },
        };
      }
      attemptOwner = claim.attemptOwner;
    }

    if (existing.status === "failed") {
      const claim = await this.tryClaimFailedKey(ctx.idempotencyKey);
      if (!claim.claimed) {
        return {
          result: null,
          error: {
            code: "TRANSIENT_IN_PROGRESS",
            message: "Request retry already in progress",
            retryable: true,
          },
        };
      }
      attemptOwner = claim.attemptOwner;
    }
  }

  if (!attemptOwner) {
    return {
      result: null,
      error: { code: "TRANSIENT_ERROR", message: "Lease owner missing", retryable: true },
    };
  }

  // 3) Execute + complete/fail (owner-aware)
  try {
    // Optional heartbeat for long scripts:
    // await this.heartbeatLease(ctx.idempotencyKey, attemptOwner);

    const result = await this.kernel.runScript(CreateRolesScript, payload);

    const completed = await this.completeIdempotencyKey(ctx.idempotencyKey, attemptOwner, result, /*cacheResult=*/false);

    if (!completed) {
      // We likely lost lease (expired & claimed by another worker); treat as transient
      return {
        result: null,
        error: {
          code: "TRANSIENT_IN_PROGRESS",
          message: "Lost lease while completing; retry to reconcile",
          retryable: true,
        },
      };
    }

    // If not caching result, return receipt via meta
    return {
      result: result as any,
    };
  } catch (error) {
    const mapped = mapToActionError(error);

    const failed = await this.failIdempotencyKey(ctx.idempotencyKey, attemptOwner, String(error));
    if (!failed) {
      // Lost lease while failing; transient reconcile
      return {
        result: null,
        error: {
          code: "TRANSIENT_IN_PROGRESS",
          message: "Lost lease while failing; retry to reconcile",
          retryable: true,
        },
      };
    }

    return { result: null, error: mapped };
  }
}
```

---

## Error Handling (Corrected v2)

### Retry Strategy: Workflow-Level Restart

Workflow code throws `ServiceError` and DBOS/orchestrator retries the step/workflow depending on your configuration.

### ✅ Strict Error Contract (Service-Side)

**Mandatory rule**:

* `error.retryable === true` **iff** `error.code` starts with `TRANSIENT_`
* All transient infra errors MUST map to `TRANSIENT_*`
* Domain errors MUST NOT be transient

Example mapping helper:

```ts
function mapToActionError(err: unknown): ActionError {
  // timeouts / network / 503 / connection
  if (isTimeout(err)) return { code: "TRANSIENT_TIMEOUT", message: "Timed out", retryable: true };
  if (isUnavailable(err)) return { code: "TRANSIENT_UNAVAILABLE", message: "Service unavailable", retryable: true };
  if (isDeadlockOrSerialization(err)) return { code: "TRANSIENT_ERROR", message: "Transient DB error", retryable: true };

  // domain/validation
  if (isValidation(err)) return { code: "VALIDATION_ERROR", message: getMessage(err), retryable: false };
  if (isNotFound(err)) return { code: "NOT_FOUND", message: getMessage(err), retryable: false };
  if (isConflict(err)) return { code: "CONFLICT", message: getMessage(err), retryable: false };

  // default: internal bug/invariant
  return { code: "INTERNAL_ERROR", message: getMessage(err), retryable: false };
}
```

---

## Idempotency Implementation Rules (Corrected v2)

### Rule 1: Atomic reservation + lease-claim + owner-aware completion

1. Try INSERT with lease owner + expiry (`ON CONFLICT DO NOTHING`)
2. If key exists:

   * **verify payload_hash matches** → else `CONFLICT`
   * `completed` → return cached OR receipt (meta.idempotent=true)
   * `reserved` → claim only if `lease_expires_at < now()` else `TRANSIENT_IN_PROGRESS`
   * `failed` → claim for retry (set to reserved + new lease) else `TRANSIENT_IN_PROGRESS`
3. If insert succeeded or claim succeeded → execute
4. On completion/failure: update only if `lease_owner == attemptOwner` and `status='reserved'`

   * If that update fails, return `TRANSIENT_IN_PROGRESS` (lost lease) and let retry reconcile.

### Rule 2: Domain logic should also be idempotent

Even with leases, rare double-run scenarios can happen (misconfigured TTL, manual DB edits, extreme latency). Domain scripts should:

* Use unique constraints
* Use upserts where possible
* Be safe on retry

### Rule 3: Result caching is opt-in, but must have deterministic replay semantics

If `result_cached=false`, service MUST:

* Either cache a minimal deterministic result (recommended), OR
* Return a deterministic receipt on `completed` replay (do not fake `{success:true}`)

---

## Parallel Calls in Workflows

Fanout can be supported if each call has a distinct deterministic `callId`. However, fanout increases load and the chance of “in progress” contention.

**Recommendation**: default to sequential steps unless latency is critical. If you do fanout, ensure:

* callIds are stable and unique per sub-operation
* services strictly enforce idempotency + leases

---

## Testing Workflows

Tests remain valid. Update expectations for ctx to include `payloadHash`.

Example:

* Assert ctx contains `idempotencyKey` and `payloadHash` as strings (`expect.any(String)`).
* Verify same input => same `dedupeKey`, same `payloadHash`.
* Verify different payload with same key => service returns `CONFLICT`.

---

## Migration Path

### Phase 1: Add Types + Context Builder

1. Create `packages/workflows/src/types.ts` (ActionContext includes `payloadHash`, receipts)
2. Create `packages/workflows/src/context.ts`

   * canonicalize dedupeKey
   * compute payloadHash from canonical JSON
3. Export from `packages/workflows/src/index.ts`

### Phase 2: Update Workflows

1. Ensure `Workflow.workflowID(input)` is deterministic **and canonical**
2. Use `buildActionContext(dedupeKey, service, action, callId, payload)`
3. Split multi-call steps into individual `@DBOS.step()`
4. Handle `response.error` by throwing `ServiceError`

### Phase 3: Add Service-Side Idempotency

1. Create/alter `processed_requests` table:

   * add `payload_hash`, `lease_owner`, `lease_expires_at`
   * add status constraint (optional)
2. Update `BrokerActions`:

   * accept `ActionRequest`
   * implement reserve/claim/complete with lease + payloadHash check
   * completion/failure must be owner-aware
   * always return `ActionResponse`, never throw
   * map transient errors to `TRANSIENT_*` strictly
3. Add cleanup job

---

## TTL Cleanup Job (Corrected v2)

Cleanup remains the same for `completed/failed`.

For `reserved`, alert/cleanup should be based on lease expiry:

* Alert if `lease_expires_at < now() - X` (very overdue lease)
* Optionally mark as failed (or keep reserved but visible) depending on ops policy

---

## Summary

| Aspect                   | Before                              | After                                                              |
| ------------------------ | ----------------------------------- | ------------------------------------------------------------------ |
| Idempotency key based on | N/A                                 | `dedupeKey` (business operation, survives restarts)                |
| Payload safety           | None                                | ✅ `payloadHash` enforced for all statuses                          |
| In-progress safety       | stale updated_at claim only         | ✅ lease owner + expiry prevents dual execution                     |
| Lease owner              | N/A / executionId-ish               | ✅ attempt-scoped UUID per lease acquisition                        |
| Completion safety        | overwrite possible                  | ✅ owner-aware complete/fail prevents stale worker overwrites       |
| Service calls            | `broker.call("iam.action", params)` | `broker.call("iam.action", { payload, ctx })`                      |
| Action handlers          | Mixed throw/return                  | Always return `ActionResponse`                                     |
| Result replay semantics  | ad-hoc                              | ✅ cached result OR deterministic receipt                           |
| Error handling           | Inconsistent                        | ✅ strict `TRANSIENT_*` contract + `ServiceError.fromActionError()` |

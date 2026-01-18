# DBOS Workflow Service Ports Architecture

**Author**: Generated from existing codebase patterns
**Date**: 2025-01-18
**Last Updated**: 2025-01-18

## Overview

This document describes how to evolve our DBOS workflows to use **Service Ports** - an abstraction layer that enables:

- **Today**: In-process calls via `ServiceBroker` (current pattern)
- **Future**: Architecture supports migration to gRPC if services are extracted to separate processes

The key insight: workflows should not know *how* they communicate with services, only *what* they need to call.

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

1. **Tight coupling**: Workflows know about broker internals
2. **Hard to test**: Need full broker setup for unit tests
3. **Migration pain**: Switching to gRPC requires rewriting workflows
4. **No idempotency context**: No standard way to pass operation ID for deduplication
5. **Inconsistent error handling**: Some actions return `{success, error}`, others throw

---

## Proposed Architecture

### Core Abstractions

#### 1. ActionContext (Idempotency & Tracing)

```typescript
// packages/workflows/src/ports/types.ts

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
   * | `executionId` | Track calls within ONE execution | UUID: `019234ab-...` | DBOS internal OR generated in first step |
   *
   * `operationId` in this context = `executionId` (NOT dedupeKey!)
   *
   * PROBLEM: In some DBOS configurations, `DBOS.workflowID` IS the user-provided
   * deduplication key (e.g., "store:create:my-store"), NOT a UUID.
   *
   * MANDATORY VERIFICATION before using DBOS.workflowID as operationId:
   *
   * 1. Check: Does DBOS have a separate `DBOS.executionID` or similar?
   *    - If yes → use that for operationId
   *    - If no → generate UUID in first workflow step
   *
   * 2. NEVER use DBOS.workflowID directly without validation:
   *    - If it's human-readable → it's a dedupeKey, NOT executionId
   *    - Only UUIDs are valid for operationId
   *
   * IMPLEMENTATION:
   * ```typescript
   * // In first @DBOS.step() of workflow:
   * @DBOS.step()
   * async initExecution(): Promise<{ executionId: string }> {
   *   // Option 1: DBOS provides separate execution ID
   *   const dbosExecId = (DBOS as any).executionID;
   *   if (dbosExecId && this.isUUID(dbosExecId)) {
   *     return { executionId: dbosExecId };
   *   }
   *
   *   // Option 2: DBOS.workflowID is UUID (not user-provided dedupeKey)
   *   if (DBOS.workflowID && this.isUUID(DBOS.workflowID)) {
   *     return { executionId: DBOS.workflowID };
   *   }
   *
   *   // Option 3: Generate our own UUID (saved by DBOS step)
   *   return { executionId: uuidv7() };
   * }
   * ```
   *
   * The executionId from initExecution() is saved by DBOS and replayed on recovery,
   * ensuring idempotency keys remain stable.
   */
  operationId: string;  // MUST be UUID, use executionId pattern above

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
   * Generated as SHA-256 hash of: operationId + service + action + callId
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
   * DO NOT:
   * - Auto-populate in buildContext()
   * - Set in port implementations
   * - Use for any business logic
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
// packages/workflows/src/ports/types.ts

/**
 * Standard request envelope for all service calls.
 * Keeps payload clean and ctx standardized.
 * Maps directly to gRPC proto structure.
 */
export interface ActionRequest<T = unknown> {
  payload: T;
  ctx: ActionContext;
}

/**
 * Standard response envelope.
 * Port implementations unwrap this and throw on error.
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

#### 3. ServicePort Interface

```typescript
// packages/workflows/src/ports/types.ts

export interface ServicePort {
  /** Service name (e.g., "iam", "media", "inventory") */
  readonly name: string;

  /**
   * Execute an action on this service.
   *
   * IMPORTANT: Always throws on failure (never returns error objects).
   * This keeps workflow code linear without if-checks.
   *
   * @throws ServiceError on any failure
   */
  handle<TResult = unknown>(
    action: string,
    payload: unknown,
    ctx: ActionContext
  ): Promise<TResult>;
}

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

### Port Implementations

#### LocalServicePort (Current: In-Process)

Wraps existing `ServiceBroker.call()` with explicit envelope.

**Migration strategy**: Services should migrate to return `ActionResponse<T>`. During transition,
the port handles legacy `{success, error}` format via adapter.

**ENFORCEMENT MECHANISM** (required to ensure migration happens):

```typescript
// packages/workflows/src/ports/LegacyResponseTracker.ts

interface LegacyResponseMetric {
  service: string;
  action: string;
  format: "legacy_success_error" | "raw_result";
  count: number;
  lastSeen: Date;
}

/**
 * Tracks legacy response formats for migration monitoring.
 * MANDATORY: Wire this to your metrics/alerting system.
 */
export class LegacyResponseTracker {
  private static metrics = new Map<string, LegacyResponseMetric>();

  static track(service: string, action: string, format: LegacyResponseMetric["format"]): void {
    const key = `${service}.${action}`;
    const existing = this.metrics.get(key);

    if (existing) {
      existing.count++;
      existing.lastSeen = new Date();
    } else {
      this.metrics.set(key, { service, action, format, count: 1, lastSeen: new Date() });
    }

    // REQUIRED: Emit metric to your observability system
    // metrics.increment("legacy_response_format", { service, action, format });

    // After deadline: fail instead of warn
    if (this.isPastDeadline()) {
      throw new Error(
        `[MIGRATION DEADLINE PASSED] Service ${service}.${action} still using ${format}. ` +
        `Update to ActionResponse format immediately.`
      );
    }
  }

  private static isPastDeadline(): boolean {
    // SET YOUR DEADLINE HERE
    const DEADLINE = new Date("2025-04-01");  // Example: April 1, 2025
    return new Date() > DEADLINE;
  }

  static getReport(): LegacyResponseMetric[] {
    return [...this.metrics.values()];
  }
}
```

**Configuration flag** for gradual enforcement:

```typescript
// In environment or config
LEGACY_RESPONSE_MODE: "warn" | "fail" | "allow"  // Default: "warn"

// In normalizeResponse():
if (this.config.legacyResponseMode === "fail" && isLegacyFormat) {
  throw new Error(`Legacy response format not allowed. Update ${service}.${action}`);
}
```

```typescript
// packages/workflows/src/ports/LocalServicePort.ts

import { ServiceBroker } from "@shopana/shared-kernel";
import type { ServicePort, ActionContext, ActionRequest, ActionResponse } from "./types.js";
import { ServiceError } from "./types.js";

export class LocalServicePort implements ServicePort {
  constructor(
    public readonly name: string,
    private readonly broker: ServiceBroker
  ) {}

  async handle<TResult = unknown>(
    action: string,
    payload: unknown,
    ctx: ActionContext
  ): Promise<TResult> {
    const qualifiedAction = `${this.name}.${action}`;
    const request: ActionRequest = { payload, ctx };

    try {
      const raw = await this.broker.call<unknown>(qualifiedAction, request);

      // Normalize response to ActionResponse format
      const response = this.normalizeResponse<TResult>(raw);

      if (response.error) {
        throw new ServiceError(
          this.name,
          action,
          response.error.code,
          response.error.message,
          undefined,
          response.error.retryable  // Pass explicit retryable from service
        );
      }

      return response.result;
    } catch (error) {
      // Already a ServiceError - preserve all attributes
      // Use shape check instead of instanceof for cross-package compatibility
      if (isServiceError(error)) {
        throw error;
      }

      // Check if error has structured info (e.g., from broker/service)
      if (this.isStructuredError(error)) {
        // Preserve ALL original error data for logging/telemetry
        const originalError = error as Record<string, unknown>;
        const serviceError = new ServiceError(
          this.name,
          action,
          error.code,
          error.message,
          error,  // Original error as cause
          error.retryable
        );

        // Copy additional fields for observability (status, details, etc.)
        // These are preserved but not used for business logic
        (serviceError as any).originalData = {
          status: originalError.status,
          details: originalError.details,
          stack: originalError.stack,
          // Any other fields from original error
          ...Object.fromEntries(
            Object.entries(originalError).filter(
              ([k]) => !["code", "message", "retryable"].includes(k)
            )
          ),
        };

        throw serviceError;
      }

      // ONLY network/transport errors become TRANSIENT
      // Examples: connection refused, timeout, DNS failure
      if (this.isTransportError(error)) {
        throw ServiceError.transient(
          this.name,
          action,
          error instanceof Error ? error.message : String(error),
          error
        );
      }

      // Unknown errors - do NOT assume transient!
      // Use INTERNAL_ERROR (not retryable by default)
      throw new ServiceError(
        this.name,
        action,
        "INTERNAL_ERROR",
        error instanceof Error ? error.message : String(error),
        error,
        false  // Explicitly not retryable
      );
    }
  }

  /**
   * Check if error has structured code/retryable info.
   * Both `code` and `message` must be strings.
   */
  private isStructuredError(error: unknown): error is { code: string; message: string; retryable?: boolean } {
    if (error === null || typeof error !== "object") return false;
    const obj = error as Record<string, unknown>;
    return (
      typeof obj.code === "string" &&
      typeof obj.message === "string"
    );
  }

  /**
   * Check if error is a transport/infrastructure error.
   * ONLY these should be wrapped as TRANSIENT.
   *
   * Separates:
   * - errno codes (checked against err.code)
   * - message substrings (checked against err.message)
   */
  private isTransportError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    // Standard Node.js errno codes for network/transport errors
    const ERRNO_CODES = new Set([
      "ECONNREFUSED",
      "ECONNRESET",
      "ECONNABORTED",
      "ETIMEDOUT",
      "ENOTFOUND",
      "EAI_AGAIN",
      "EPIPE",
      "ENETUNREACH",
      "EHOSTUNREACH",
    ]);

    // Message substrings indicating transport errors
    const MESSAGE_PATTERNS = [
      "socket hang up",
      "network error",
      "connection reset",
      "connection refused",
      "dns lookup failed",
    ];

    const errnoCode = (error as NodeJS.ErrnoException).code;
    if (errnoCode && ERRNO_CODES.has(errnoCode)) {
      return true;
    }

    const msgLower = error.message.toLowerCase();
    return MESSAGE_PATTERNS.some((pattern) => msgLower.includes(pattern));
  }

  /**
   * Normalize response to ActionResponse format.
   *
   * CONTRACT:
   * - PRIMARY: ActionResponse<T> is the ONLY official contract
   * - All services MUST return ActionResponse format
   *
   * MIGRATION COMPATIBILITY (temporary):
   * - { success, error?, result? } - legacy format, DEADLINE: [SET DATE]
   * - Raw result T - wrapped for compatibility, DEADLINE: [SET DATE]
   *
   * After migration deadlines, this method will ONLY accept ActionResponse.
   * All legacy handling will be removed.
   *
   * @deprecated Legacy format support - migrate services to ActionResponse
   */
  private normalizeResponse<T>(raw: unknown): ActionResponse<T> {
    // ========== PRIMARY CONTRACT ==========
    // ActionResponse format (has 'result' key, no 'success' key)
    if (raw !== null && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if ("result" in obj && !("success" in obj)) {
        return obj as ActionResponse<T>;
      }
    }

    // ========== LEGACY COMPATIBILITY (REMOVE AFTER MIGRATION) ==========

    /**
     * LEGACY FORMAT DEFINITION (strict):
     *
     * Success: { success: true, result?: T }
     * Failure: { success: false, error: string }
     *
     * NOTE: Legacy format does NOT have 'code' or 'retryable' fields!
     * All legacy errors are mapped to ACTION_FAILED (not retryable).
     */
    if (raw !== null && typeof raw === "object" && "success" in raw) {
      const obj = raw as Record<string, unknown>;

      // Log deprecation warning
      console.warn(
        `[DEPRECATED] Service returned legacy format {success, error?, result?}. ` +
        `Migrate to ActionResponse format. Deadline: [SET DATE]`
      );

      if (!obj.success) {
        // LEGACY ERROR: Only has 'error' field (string message)
        // No 'code' or 'retryable' in legacy format - use defaults
        return {
          result: undefined as T,
          error: {
            code: "ACTION_FAILED",  // Fixed code for all legacy errors
            message: typeof obj.error === "string" ? obj.error : "Action failed",
            retryable: false,  // Legacy errors are NOT retryable (no way to know)
          },
        };
      }

      // LEGACY SUCCESS
      if ("result" in obj) {
        return { result: obj.result as T };
      }
      return { result: undefined as T };
    }

    // Raw result (no envelope) - wrap for compatibility
    console.warn(
      `[DEPRECATED] Service returned raw result without envelope. ` +
      `Migrate to ActionResponse format. Deadline: [SET DATE]`
    );
    return { result: raw as T };
  }
}
```

---

## Refactored Workflow

### BaseWorkflow with Ports (Focused)

BaseWorkflow handles **only** port-related concerns. Domain services (kernel, repository) stay in concrete workflows.

```typescript
// packages/workflows/src/BaseWorkflow.ts

import crypto from "node:crypto";  // Node.js built-in, no external dependency
import { v7 as uuidv7 } from "uuid";  // Required for initExecution() fallback
import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import { DBOS } from "@dbos-inc/dbos-sdk";
import type { ServicePort, ActionContext } from "./ports/types.js";

export interface WorkflowPortServices {
  ports: Map<string, ServicePort>;
}

/**
 * Base class for workflows that call external services via ports.
 *
 * Responsibilities:
 * - Port lookup and management
 * - ActionContext building with proper idempotency keys
 * - Standardized service calls
 *
 * Does NOT include domain-specific services (kernel, repository).
 * Those belong in concrete workflow classes.
 */
export abstract class BaseWorkflow extends ConfiguredInstance {
  protected readonly ports: Map<string, ServicePort>;

  constructor(name: string, services: WorkflowPortServices) {
    super(name);
    this.ports = services.ports;
  }

  /**
   * Get port for a service.
   * @throws Error if port not registered
   */
  protected getPort(serviceName: string): ServicePort {
    const port = this.ports.get(serviceName);
    if (!port) {
      const available = [...this.ports.keys()].join(", ");
      throw new Error(`Port not found: ${serviceName}. Available: ${available}`);
    }
    return port;
  }

  /**
   * Build ActionContext for current workflow step.
   *
   * @param service - Target service name
   * @param action - Action being called
   * @param callId - REQUIRED: Unique identifier for this specific call.
   *                 MUST be deterministic (derived from workflow input or saved step results).
   *                 Examples: storeId, `${storeId}:${userId}`, `${orderId}:${itemId}`
   */
  protected buildContext(service: string, action: string, callId: string): ActionContext {
    // Validate callId is provided and non-empty
    if (!callId || !callId.trim()) {
      throw new Error(`callId is required and must be deterministic for ${service}.${action}`);
    }

    // Get operationId - MUST be UUID, not business key
    const operationId = this.getOperationId();

    // Generate idempotency key as SHA-256 hash to avoid delimiter collisions
    const idempotencyKey = this.hashIdempotencyKey(operationId, service, action, callId);

    return {
      version: 1,
      operationId,
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

  /**
   * Execution ID for idempotency tracking.
   *
   * CRITICAL: This MUST be set by the workflow's run() method AFTER calling initExecution():
   *
   *   const { executionId } = await this.initExecution();
   *   this.executionId = executionId;  // Assignment OUTSIDE the step!
   *
   * WHY: DBOS step replay returns saved result WITHOUT executing step body.
   * Any `this.x = ...` inside @DBOS.step() is a side effect that won't replay.
   */
  protected executionId?: string;

  /**
   * MANDATORY: Call this as the FIRST step in every workflow.
   *
   * Returns executionId that is:
   * - UUID format (not human-readable)
   * - Stable across recovery (saved by DBOS step)
   * - Different from deduplication key (workflowID)
   *
   * USAGE (in your workflow's run() method):
   *   const { executionId } = await this.initExecution();
   *   this.executionId = executionId;  // MUST assign outside step!
   *
   * DO NOT rely on side effects inside this step - they won't replay!
   */
  @DBOS.step()
  protected async initExecution(): Promise<{ executionId: string }> {
    // Option 1: DBOS provides separate execution ID
    const dbosExecId = (DBOS as any).executionID ?? (DBOS as any).executionId;
    if (dbosExecId && this.isUUID(dbosExecId)) {
      return { executionId: dbosExecId };
    }

    // Option 2: DBOS.workflowID is UUID (not user-provided dedupeKey)
    const workflowId = DBOS.workflowID;
    if (workflowId && this.isUUID(workflowId)) {
      return { executionId: workflowId };
    }

    // Option 3: Generate our own UUID
    // Result is saved by DBOS and replayed on recovery
    return { executionId: uuidv7() };
  }

  /**
   * Get unique operation ID for current workflow execution.
   *
   * @throws Error if executionId was not set after initExecution()
   */
  protected getOperationId(): string {
    if (!this.executionId) {
      throw new Error(
        "executionId not set. In your run() method, you MUST do:\n" +
        "  const { executionId } = await this.initExecution();\n" +
        "  this.executionId = executionId;"
      );
    }

    if (!this.isUUID(this.executionId)) {
      throw new Error(
        `executionId must be UUID format, got: "${this.executionId}".`
      );
    }

    return this.executionId;
  }

  private isUUID(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  /**
   * Generate SHA-256 hash for idempotency key.
   * Using hash avoids issues with delimiter collisions in component values.
   */
  private hashIdempotencyKey(operationId: string, service: string, action: string, callId: string): string {
    const data = [operationId, service, action, callId].join("\n");
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Call a service action through its port.
   *
   * @param serviceName - Target service (e.g., "iam", "media")
   * @param action - Action name (e.g., "createRoles")
   * @param payload - Action payload (type-safe via generic)
   * @param callId - REQUIRED: Deterministic identifier for idempotency.
   *                 Must be derived from workflow input or saved step results.
   *                 Random UUIDs are FORBIDDEN (breaks recovery).
   *
   * @throws ServiceError on any failure (never returns error objects)
   *
   * @example
   * // Good - deterministic from input
   * await this.callService("iam", "createRoles", payload, storeId);
   *
   * // Good - composite key for multiple calls
   * await this.callService("iam", "assignRole", payload, `${storeId}:${userId}`);
   *
   * // BAD - random UUID breaks recovery
   * await this.callService("iam", "createRoles", payload, crypto.randomUUID());
   */
  protected async callService<TResult = unknown>(
    serviceName: string,
    action: string,
    payload: unknown,
    callId: string  // REQUIRED - not optional
  ): Promise<TResult> {
    const port = this.getPort(serviceName);
    const ctx = this.buildContext(serviceName, action, callId);
    return port.handle<TResult>(action, payload, ctx);
  }
}
```

### Refactored StoreCreateWorkflow

**Key changes:**
1. Each external service call is a **separate `@DBOS.step()`** for proper retry isolation
2. Uses `callId` for idempotency when calling same action type multiple times
3. No if-checks for errors - `callService` throws on failure
4. Domain services (kernel, repository) injected via constructor, not in BaseWorkflow

```typescript
// services/project/src/workflows/StoreCreateWorkflow.ts

import { DBOS } from "@shopana/workflows";
import { v7 as uuidv7 } from "uuid";
import { BaseWorkflow, type WorkflowPortServices } from "@shopana/workflows";
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

export interface StoreCreateWorkflowServices extends WorkflowPortServices {
  kernel: Kernel;
}

export class StoreCreateWorkflow extends BaseWorkflow {
  private readonly kernel: Kernel;

  constructor(name: string, services: StoreCreateWorkflowServices) {
    super(name, services);
    this.kernel = services.kernel;
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

    // Step 0: MANDATORY - initialize execution ID for idempotency
    // CRITICAL: Capture return value and assign OUTSIDE the step!
    // Side effects inside @DBOS.step() don't replay on recovery.
    const { executionId } = await this.initExecution();
    this.executionId = executionId;

    // Step 1: Generate store ID (deterministic on recovery)
    const storeId = await this.generateStoreId();

    // Step 2: Create store in local database
    await this.createStore(storeId, input, organizationId);

    // Step 3: Create roles for this store domain
    await this.createStoreRoles(storeId, organizationId, userId);

    // Step 4: Assign admin role to creator
    await this.assignAdminRole(storeId, organizationId, userId);

    // Step 5: Create media asset group
    await this.createMediaAssetGroup(storeId);

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
   * Uses storeId as callId since this is store-scoped.
   */
  @DBOS.step()
  private async createStoreRoles(storeId: string, organizationId: string, userId: string) {
    // callId = storeId ensures idempotency for this store's role creation
    await this.callService(
      "iam",
      "createRoles",
      {
        userId,
        organizationId,
        domain: `store:${storeId}`,
        roles: buildStoreRoles(),
      },
      storeId // callId for idempotency
    );
  }

  /**
   * Step: Assign admin role to store creator.
   * Uses composite callId since we might assign roles to multiple users.
   */
  @DBOS.step()
  private async assignAdminRole(storeId: string, organizationId: string, userId: string) {
    // callId includes userId in case we assign multiple roles to different users
    await this.callService(
      "iam",
      "assignRole",
      {
        userId,
        organizationId,
        domain: `store:${storeId}`,
        roleName: "admin",
      },
      `${storeId}:admin:${userId}` // callId for idempotency
    );
  }

  /**
   * Step: Create media asset group for this store.
   */
  @DBOS.step()
  private async createMediaAssetGroup(storeId: string) {
    await this.callService(
      "media",
      "createAssetGroup",
      {
        ownerType: "store",
        ownerId: storeId,
      },
      storeId // callId for idempotency
    );
  }
}
```

---

## Wiring: NestJS Module

### Port Factory

```typescript
// packages/workflows/src/ports/PortFactory.ts

import { Injectable, Logger } from "@nestjs/common";
import { ServiceBroker } from "@shopana/shared-kernel";
import { LocalServicePort } from "./LocalServicePort.js";
import type { ServicePort } from "./types.js";

/**
 * Factory for creating service ports.
 * Currently supports in-process calls via ServiceBroker.
 * Architecture is designed to support gRPC in the future if needed.
 */
@Injectable()
export class PortFactory {
  private readonly logger = new Logger(PortFactory.name);

  constructor(private readonly broker: ServiceBroker) {}

  create(serviceName: string): ServicePort {
    return new LocalServicePort(serviceName, this.broker);
  }

  createMany(serviceNames: string[]): Map<string, ServicePort> {
    const ports = new Map<string, ServicePort>();
    for (const name of serviceNames) {
      ports.set(name, this.create(name));
    }
    return ports;
  }
}
```

### Module Provider Setup

```typescript
// packages/workflows/src/workflows.module.ts

import { Module } from "@nestjs/common";
import { PortFactory } from "./ports/PortFactory.js";

@Module({
  providers: [PortFactory],
  exports: [PortFactory],
})
export class WorkflowsModule {}
```

### Workflow Registration in Project Module

```typescript
// services/project/src/project.module.ts (partial)

import { Module, type OnModuleInit } from "@nestjs/common";
import { WorkflowRegistry } from "@shopana/workflows";
import { PortFactory } from "@shopana/workflows/ports";
import { StoreCreateWorkflow } from "./workflows/StoreCreateWorkflow.js";
import { Kernel } from "./kernel/Kernel.js";

@Module({})
export class ProjectModule implements OnModuleInit {
  constructor(
    private readonly workflowRegistry: WorkflowRegistry,
    private readonly portFactory: PortFactory,
  ) {}

  async onModuleInit() {
    const kernel = Kernel.getInstance();

    // Create ports for services this workflow depends on
    const ports = this.portFactory.createMany(["iam", "media", "inventory", "orders"]);

    // Register workflow with ports + domain services
    this.workflowRegistry.register(
      "storeCreate",
      new StoreCreateWorkflow("storeCreate", {
        kernel,
        ports,
      })
    );
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

    // Execute handler - may throw or return ActionResponse
    const result = await handler(request);

    // Ensure result is ActionResponse format
    if (this.isActionResponse(result)) {
      return result;
    }

    // Wrap raw result
    return { result };

  } catch (error) {
    // MANDATORY: Convert ALL exceptions to ActionResponse.error
    return this.errorToResponse(qualifiedAction, error);
  }
}

/**
 * Convert any thrown error to ActionResponse format.
 * This is the ONLY place where raw exceptions are converted.
 *
 * IMPORTANT: Use isServiceError() shape check, NOT instanceof.
 * ServiceError may be defined in different packages (workflows vs shared-kernel),
 * and instanceof fails across package boundaries.
 */
private errorToResponse(qualifiedAction: string, error: unknown): ActionResponse {
  // ServiceError - preserve all attributes
  // Use shape check instead of instanceof for cross-package compatibility
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

  // Structured error with code (not ServiceError but has similar shape)
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
      retryable: false,  // Unknown errors are NOT retryable
    },
  };
}

private isActionResponse(value: unknown): value is ActionResponse {
  return value !== null && typeof value === "object" && "result" in value;
}

private isStructuredError(error: unknown): error is { code: string; message: string; retryable?: boolean } {
  if (error === null || typeof error !== "object") return false;
  const obj = error as Record<string, unknown>;
  return (
    typeof obj.code === "string" &&
    typeof obj.message === "string"
  );
}
```

This ensures:
- **Consistent format**: All responses (success and error) are `ActionResponse`
- **No raw exceptions**: Callers never receive unexpected exception types
- **Preserved attributes**: `code` and `retryable` are passed through correctly
- **Centralized handling**: Error conversion logic is not duplicated in each handler

### Updated BrokerActions Pattern

```typescript
// Example: services/iam/src/IamBrokerActions.ts

import { Injectable } from "@nestjs/common";
import { BrokerActions, Action, ZodSchema } from "@shopana/shared-kernel";
import type { ActionRequest, ActionContext } from "@shopana/workflows/ports";

// Define input schema that accepts envelope OR legacy format
const createRolesRequestSchema = z.union([
  // New envelope format
  z.object({
    payload: createRolesPayloadSchema,
    ctx: actionContextSchema,
  }),
  // Legacy format (for backwards compatibility)
  createRolesPayloadSchema,
]);

@Injectable()
export class IamBrokerActions extends BrokerActions {

  @Action("createRoles")
  @ZodSchema(createRolesRequestSchema)
  async createRoles(
    input: ActionRequest<CreateRolesPayload> | CreateRolesPayload
  ): Promise<CreateRolesResult> {
    // Unwrap envelope if present
    const { payload, ctx } = this.unwrapRequest(input);

    // Idempotency check (optional but recommended)
    if (ctx?.idempotencyKey) {
      const existing = await this.checkIdempotency(ctx.idempotencyKey);
      if (existing) return existing;
    }

    // Execute the action
    const result = await this.kernel.runScript(CreateRolesScript, payload);

    // Store for idempotency
    if (ctx?.idempotencyKey) {
      await this.storeIdempotency(ctx.idempotencyKey, result);
    }

    return result;
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

  /**
   * Check if result is cached for idempotency.
   *
   * NOTE: `result` column is JSONB - driver returns object directly.
   * Do NOT use JSON.parse() - that's only needed if stored as TEXT.
   */
  private async checkIdempotency(key: string): Promise<CreateRolesResult | null> {
    const cached = await this.kernel.repository.processedRequest.find(key);
    if (cached?.result) {
      return cached.result as CreateRolesResult;  // JSONB returns object directly
    }
    return null;
  }

  /**
   * Store result for idempotency.
   *
   * NOTE: `result` column is JSONB - pass object directly!
   * Do NOT use JSON.stringify() - that causes double serialization.
   * The ORM/driver handles JSON serialization for JSONB columns.
   */
  private async storeIdempotency(key: string, result: CreateRolesResult): Promise<void> {
    await this.kernel.repository.processedRequest.upsert({
      idempotencyKey: key,
      result,  // Object, NOT JSON.stringify(result)
      createdAt: new Date(),
    });
  }
}
```

---

## Idempotency Support

### Database Table

```sql
-- In each service's migrations
CREATE TABLE IF NOT EXISTS processed_requests (
  -- SHA-256 hash of (operation_id, service, action, call_id)
  idempotency_key TEXT PRIMARY KEY,

  -- Store components separately for debugging/querying
  operation_id TEXT NOT NULL,
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
CREATE INDEX idx_processed_requests_operation_id ON processed_requests(operation_id);
CREATE INDEX idx_processed_requests_lookup ON processed_requests(service, action, call_id);
CREATE INDEX idx_processed_requests_status ON processed_requests(status);

/*
 * ============================================================
 * TTL CLEANUP - MANDATORY INFRASTRUCTURE COMPONENT
 * ============================================================
 *
 * CRITICAL: This is NOT optional! Without cleanup, the table will grow unbounded.
 * CRITICAL: NEVER delete 'reserved' records - they indicate in-progress work!
 *
 * Choose ONE implementation approach below.
 */

-- Option 1: PostgreSQL pg_cron extension (RECOMMENDED)
-- Requires: CREATE EXTENSION pg_cron;
--
-- SELECT cron.schedule(
--   'cleanup_processed_requests',
--   '0 3 * * *',  -- Run daily at 3 AM
--   $$DELETE FROM processed_requests
--     WHERE status IN ('completed', 'failed')
--     AND created_at < NOW() - INTERVAL '7 days'$$
-- );

-- Option 2: Application-level scheduled job
-- Add to your service startup or use a job scheduler (Bull, Agenda, etc.)
--
-- See ProcessedRequestsCleanupJob below for implementation.

-- MANDATORY: Alert on stale 'reserved' records (dead workers)
-- Records stuck in 'reserved' for > 1 hour indicate:
-- - Worker crashed mid-execution
-- - Network partition
-- - Bug in completion logic
--
-- Wire this to your alerting system (PagerDuty, Slack, etc.)
CREATE OR REPLACE FUNCTION alert_stale_reserved_requests()
RETURNS TABLE(idempotency_key TEXT, operation_id TEXT, created_at TIMESTAMPTZ, age_hours NUMERIC) AS $$
  SELECT
    idempotency_key,
    operation_id,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS age_hours
  FROM processed_requests
  WHERE status = 'reserved'
    AND created_at < NOW() - INTERVAL '1 hour'
  ORDER BY created_at ASC;
$$ LANGUAGE SQL;
```

### MANDATORY: Application-Level Cleanup Job

If not using pg_cron, implement this NestJS scheduled job:

```typescript
// packages/shared-kernel/src/jobs/ProcessedRequestsCleanupJob.ts

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { sql } from "drizzle-orm";

export interface CleanupConfig {
  /** Retention period for completed/failed records (default: 7 days) */
  retentionDays: number;
  /** Threshold for stale 'reserved' records alert (default: 1 hour) */
  staleReservedThresholdMinutes: number;
  /** Batch size for deletion (default: 1000) */
  batchSize: number;
}

const DEFAULT_CONFIG: CleanupConfig = {
  retentionDays: 7,
  staleReservedThresholdMinutes: 60,
  batchSize: 1000,
};

@Injectable()
export class ProcessedRequestsCleanupJob implements OnModuleInit {
  private readonly logger = new Logger(ProcessedRequestsCleanupJob.name);
  private config: CleanupConfig;

  constructor(
    private readonly db: DrizzleDatabase,
    private readonly alertService: AlertService,  // Your alerting integration
    config?: Partial<CleanupConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  onModuleInit() {
    this.logger.log(
      `ProcessedRequestsCleanupJob initialized. ` +
      `Retention: ${this.config.retentionDays} days, ` +
      `Stale alert threshold: ${this.config.staleReservedThresholdMinutes} minutes`
    );
  }

  /**
   * Run cleanup daily at 3 AM.
   * CRITICAL: This job is MANDATORY for production.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredRecords(): Promise<void> {
    const startTime = Date.now();

    try {
      // SAFETY CHECK: Never delete 'reserved' records!
      // NOTE: PostgreSQL doesn't support DELETE ... LIMIT directly.
      // Use subquery with LIMIT instead.
      const result = await this.db.execute(sql`
        DELETE FROM processed_requests
        WHERE idempotency_key IN (
          SELECT idempotency_key
          FROM processed_requests
          WHERE status IN ('completed', 'failed')
            AND created_at < NOW() - INTERVAL '${this.config.retentionDays} days'
          LIMIT ${this.config.batchSize}
        )
        RETURNING idempotency_key
      `);

      const deletedCount = result.rowCount ?? 0;
      const duration = Date.now() - startTime;

      this.logger.log(
        `Cleanup completed: deleted ${deletedCount} records in ${duration}ms`
      );

      // If we deleted a full batch, there might be more - schedule another run
      if (deletedCount >= this.config.batchSize) {
        this.logger.log("Batch limit reached, scheduling continuation...");
        setImmediate(() => this.cleanupExpiredRecords());
      }
    } catch (error) {
      this.logger.error("Cleanup failed", error);
      // Don't throw - job should not crash the service
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
        SELECT
          idempotency_key,
          operation_id,
          service,
          action,
          created_at,
          EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 AS age_minutes
        FROM processed_requests
        WHERE status = 'reserved'
          AND created_at < NOW() - INTERVAL '${this.config.staleReservedThresholdMinutes} minutes'
        ORDER BY created_at ASC
        LIMIT 100
      `);

      if (staleRecords.rowCount && staleRecords.rowCount > 0) {
        this.logger.warn(
          `Found ${staleRecords.rowCount} stale 'reserved' records! ` +
          `These may indicate dead workers.`
        );

        // MANDATORY: Send alert to ops team
        await this.alertService.sendAlert({
          severity: "warning",
          title: "Stale idempotency records detected",
          message: `${staleRecords.rowCount} requests stuck in 'reserved' status for > ${this.config.staleReservedThresholdMinutes} minutes`,
          data: staleRecords.rows,
        });
      }
    } catch (error) {
      this.logger.error("Stale record check failed", error);
    }
  }
}
```

### Checklist: TTL Cleanup Deployment

- [ ] **Option A (pg_cron)**: Enable pg_cron extension and schedule cleanup job in migration
- [ ] **Option B (Application)**: Register `ProcessedRequestsCleanupJob` in your service module
- [ ] **Wire AlertService**: Connect to PagerDuty/Slack/email for stale record alerts
- [ ] **Monitor**: Add dashboard for `processed_requests` table size over time
- [ ] **Test**: Verify cleanup runs and doesn't delete 'reserved' records
```

### Idempotency Implementation Rules

#### Rule 1: Use Atomic Reservation Pattern (No Race Conditions)

For **commands** (write operations), use INSERT-RESERVE pattern to prevent race conditions:

1. Try to INSERT with `ON CONFLICT DO NOTHING`
2. If insert **failed** (conflict) → already processed, return success with `meta.idempotent`
3. If insert **succeeded** → execute action, then UPDATE status to 'completed'
4. On failure → UPDATE status to 'failed' (allows retry)

```typescript
@Action("createRoles")
async createRoles(input: ActionRequest<CreateRolesPayload>): Promise<ActionResponse> {
  const { payload, ctx } = this.unwrapRequest(input);

  // Step 1: Try to reserve this idempotency key (atomic)
  let canExecute = await this.reserveIdempotencyKey(ctx);

  if (!canExecute) {
    // Already exists - check status
    const existing = await this.getIdempotencyRecord(ctx.idempotencyKey);

    if (existing?.status === 'completed') {
      // Already done - return idempotent response
      return {
        result: existing.result_cached ? existing.result : { success: true },
        meta: { idempotent: true },
      };
    }

    if (existing?.status === 'failed') {
      // Previous attempt failed - try to claim for retry
      // NEVER delete (preserves audit trail, prevents race conditions)
      canExecute = await this.claimFailedIdempotencyKey(ctx.idempotencyKey);
      if (!canExecute) {
        // Another request already claimed it
        throw new ServiceError(
          ctx.service,
          ctx.action,
          "TRANSIENT_IN_PROGRESS",
          "Request retry already in progress",
          undefined,
          true  // RETRYABLE
        );
      }
      // Successfully claimed - canExecute is now true, fall through to execute
    } else {
      // Status is 'reserved' - another request is processing
      throw new ServiceError(
        ctx.service,
        ctx.action,
        "TRANSIENT_IN_PROGRESS",
        "Request already in progress, please retry",
        undefined,
        true  // RETRYABLE
      );
    }
  }

  // Step 2: Execute (only reached if canExecute === true)
  try {
    const result = await this.kernel.runScript(CreateRolesScript, payload);

    // Step 3: Mark as completed
    await this.completeIdempotencyKey(ctx.idempotencyKey, result);

    return { result };
  } catch (error) {
    // Mark as failed (allows retry with same key)
    await this.failIdempotencyKey(ctx.idempotencyKey, String(error));
    throw error;
  }
}

// Helper: Atomic insert with ON CONFLICT DO NOTHING
async reserveIdempotencyKey(ctx: ActionContext): Promise<boolean> {
  const result = await this.db.execute(sql`
    INSERT INTO processed_requests (idempotency_key, operation_id, service, action, call_id, status, attempt)
    VALUES (${ctx.idempotencyKey}, ${ctx.operationId}, ${ctx.service}, ${ctx.action}, ${ctx.callId}, 'reserved', 1)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING idempotency_key
  `);
  return result.rowCount > 0;
}

// Helper: Atomically claim a failed record for retry (NO DELETE - preserves audit)
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
  return result.rowCount > 0;
}

// Helper: Mark as completed
// IMPORTANT: `result` column is JSONB - pass object directly, NOT JSON.stringify()
async completeIdempotencyKey(idempotencyKey: string, result?: unknown, cacheResult = false): Promise<void> {
  // For JSONB columns, the driver handles serialization
  // Passing JSON.stringify() would cause double-serialization (string inside JSON)
  await this.db.execute(sql`
    UPDATE processed_requests
    SET status = 'completed',
        result = ${cacheResult ? result : null}::jsonb,
        result_cached = ${cacheResult},
        completed_at = NOW()
    WHERE idempotency_key = ${idempotencyKey}
  `);

  /*
   * ⚠️ JSONB SERIALIZATION WARNING:
   *
   * WRONG: result = ${JSON.stringify(result)}
   *   → Stores: '"{\\"key\\":\\"value\\"}"' (string literal)
   *   → Reading back: you get a string, not an object
   *
   * CORRECT: result = ${result}::jsonb
   *   → Stores: '{"key":"value"}' (JSON object)
   *   → Reading back: you get the original object
   *
   * Most SQL drivers (pg, drizzle, etc.) automatically serialize
   * objects to JSON for JSONB columns. Check your driver's docs.
   *
   * If your driver requires explicit serialization:
   *   result = ${JSON.stringify(result)}::jsonb
   * But NEVER without the ::jsonb cast!
   */
}

// Helper: Mark as failed (keeps record for retry)
async failIdempotencyKey(idempotencyKey: string, errorInfo?: string): Promise<void> {
  await this.db.execute(sql`
    UPDATE processed_requests
    SET status = 'failed',
        last_error = ${errorInfo ?? null},
        updated_at = NOW()
    WHERE idempotency_key = ${idempotencyKey}
  `);
}
```

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

```typescript
// Query - may cache result
@Action("getAssetGroup")
// stored: { result_cached: true, result: { assetGroup: {...} } }

// Command - store fact only, return success on retry
@Action("createRoles")
// stored: { result_cached: false }
// on retry: return { success: true, idempotent: true }
```

### Idempotency Key Format

**Primary key** (`idempotency_key` column): SHA-256 hash of components.

```typescript
// Generation
const data = [operationId, service, action, callId].join("\n");
const idempotencyKey = crypto.createHash("sha256").update(data).digest("hex");
```

**Human-readable components** stored in separate columns for debugging/querying:

| Column | Example Value |
|--------|---------------|
| `operation_id` | `019234ab-5678-7def-...` (UUID from DBOS) |
| `service` | `iam` |
| `action` | `createRoles` |
| `call_id` | `store-123` |
| `idempotency_key` | `a1b2c3d4e5f6...` (64-char hex) |

**Why SHA-256?**
- Avoids delimiter collision (e.g., if callId contains `:`)
- Fixed-length key for consistent indexing
- Components stored separately for human inspection

### Determinism Rules (MANDATORY)

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

#### VERIFICATION REQUIRED: DBOS Step Result Persistence

**CRITICAL**: Before using `uuidv7()` or any non-deterministic operation in a `@DBOS.step()`,
you MUST verify that your DBOS version actually saves and replays step results.

**Verification steps:**

1. Check DBOS documentation for step result persistence guarantees
2. Write a test that:
   - Runs a workflow with a step that returns `uuidv7()`
   - Simulates recovery (restart workflow mid-execution)
   - Verifies the same UUID is returned on replay

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

**If DBOS does NOT persist step results**, use one of these alternatives:

```typescript
// Alternative 1: Use DBOS-provided deterministic ID generator (if available)
@DBOS.step()
async generateStoreId(): Promise<string> {
  return DBOS.generateDeterministicId();  // Check if this API exists
}

// Alternative 2: Derive ID from workflow input + step index
@DBOS.step()
async generateStoreId(workflowInput: StoreCreateInput): Promise<string> {
  // Hash of input + step name = deterministic
  const data = JSON.stringify({ input: workflowInput, step: "generateStoreId" });
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 32);
}
```

### callId Rules (MANDATORY)

**Rule 1: callId MUST be deterministic**

Use only values from:
- Workflow input parameters
- Results of previous `@DBOS.step()` calls (saved by DBOS)

**ALLOWED**: Generate storeId/orderId in a separate `@DBOS.step()`, then use that saved ID as callId.

**FORBIDDEN**: Random/UUID callId at the point of `callService()` call (not saved by DBOS, breaks recovery)

```typescript
// WRONG - different key on recovery
await this.callService("iam", "createRoles", payload, crypto.randomUUID());

// CORRECT - deterministic from input/saved state
await this.callService("iam", "createRoles", payload, storeId);
```

**Rule 2: callId must distinguish parallel calls to same action**

If you call `iam.assignRole` twice in one workflow, each needs unique callId:

```typescript
await this.callService("iam", "assignRole", { userId: user1, ... }, `${storeId}:${user1}`);
await this.callService("iam", "assignRole", { userId: user2, ... }, `${storeId}:${user2}`);
```

**callId patterns:**

| Scenario | callId | Example |
|----------|--------|---------|
| Single call per workflow | `"default"` or omit | `storeId` |
| Entity-scoped | `entityId` | `storeId`, `orderId` |
| User-scoped | `${entityId}:${userId}` | `store-123:user-456` |
| Role-scoped | `${entityId}:${role}:${userId}` | `store-123:admin:user-456` |
| Item in collection | `${entityId}:${itemId}` | `order-123:item-789` |

---

## Error Handling

### Design Decision: Ports Always Throw

All `ServicePort.handle()` implementations **throw on error**, never return error objects.

**Rationale:**
- Workflow code stays linear (no if-checks)
- DBOS step retry naturally handles transient failures
- Consistent error handling across all services
- Stack traces preserved for debugging

### ServiceError Structure

```typescript
export class ServiceError extends Error {
  constructor(
    public readonly service: string,    // e.g., "iam"
    public readonly action: string,     // e.g., "createRoles"
    public readonly code: string,       // e.g., "ROLE_EXISTS"
    message: string,
    public readonly cause?: unknown
  ) {
    super(`[${service}.${action}] ${message}`);
    this.name = "ServiceError";
  }

  toJSON() {
    return {
      name: this.name,
      service: this.service,
      action: this.action,
      code: this.code,
      message: this.message,
    };
  }
}
```

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
    // Compensate on failure
    await this.compensate(storeId);
    throw error;
  }

  return { storeId, organizationId: input.organizationId };
}

@DBOS.step()
private async compensate(storeId: string): Promise<void> {
  // Best-effort cleanup - don't throw on compensation failures
  const cleanupCalls = [
    this.callService("media", "deleteAssetGroup", { ownerType: "store", ownerId: storeId }, storeId),
    this.callService("iam", "deleteRoles", { domain: `store:${storeId}` }, storeId),
  ];

  await Promise.allSettled(cleanupCalls);
  await this.repository.store.delete(storeId);
}
```

### DBOS Retry Policy Configuration

**CRITICAL**: Retry behavior MUST be configured in code, not left to conventions.
DBOS steps should only retry when `ServiceError.retryable === true`.

```typescript
// packages/workflows/src/retry/RetryPolicy.ts

import { ServiceError } from "../ports/types.js";

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Determines if an error should be retried.
 * This is the SINGLE SOURCE OF TRUTH for retry decisions.
 *
 * ONLY retries when:
 * 1. Error is ServiceError with retryable === true
 * 2. Error code starts with "TRANSIENT_"
 *
 * All other errors fail immediately (no retry).
 */
export function shouldRetry(error: unknown): boolean {
  // Use shape check, not instanceof (cross-package compatibility)
  if (isServiceError(error)) {
    return error.retryable === true;
  }

  // Structured error with explicit retryable flag
  if (
    error !== null &&
    typeof error === "object" &&
    "retryable" in error &&
    typeof (error as { retryable: unknown }).retryable === "boolean"
  ) {
    return (error as { retryable: boolean }).retryable;
  }

  // Unknown errors are NOT retryable
  return false;
}

/**
 * Calculate delay for retry attempt with exponential backoff.
 */
export function calculateDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}
```

#### Retry Strategy: DBOS-Native OR Workflow Restart Only

**⛔ FORBIDDEN PATTERNS:**

1. **NO `setTimeout`/`sleep()` inside `@DBOS.step()`** - non-deterministic, breaks recovery
2. **NO custom decorator wrapping `@DBOS.step()`** - breaks DBOS step tracking
3. **NO retry loops inside step methods** - unpredictable on replay
4. **NO mutable class state (`this.x = ...`) inside `@DBOS.step()`** - side effects don't replay

Any of these patterns will cause **silent data corruption** on workflow recovery.

**✅ ALLOWED RETRY PATTERNS:**

**Option 1: DBOS Native Retry (PREFERRED - if supported)**

Check your DBOS version for native retry support:

```typescript
// Verify actual DBOS API in your version
@DBOS.step({
  retries: 3,
  retryIntervalSeconds: 1,
  backoffRate: 2,
  // CRITICAL: If DBOS supports retry predicate, use shouldRetry()
  // retryPredicate: shouldRetry,  // Check if this exists in your DBOS version
})
async createStoreRoles(storeId: string, organizationId: string, userId: string) {
  await this.callService("iam", "createRoles", { ... }, storeId);
}
```

**Option 2: Workflow Restart (External Orchestrator)**

Let step fail, rely on external mechanism to restart workflow:

```typescript
@DBOS.workflow()
async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
  await this.initExecution();  // MANDATORY first step
  const storeId = await this.generateStoreId();
  await this.createStore(storeId, input);

  // Step fails → workflow fails → external orchestrator restarts
  // On restart, DBOS replays completed steps, retries failed step
  await this.createStoreRoles(storeId, input.organizationId, input.userId);
  await this.assignAdminRole(storeId, input.organizationId, input.userId);
  await this.createMediaAssetGroup(storeId);

  return { storeId, organizationId: input.organizationId };
}

// Plain @DBOS.step() - NO custom wrapper
@DBOS.step()
private async createStoreRoles(storeId: string, organizationId: string, userId: string) {
  await this.callService("iam", "createRoles", { ... }, storeId);
}
```

**Why these restrictions?**

| Forbidden Pattern | Problem |
|-------------------|---------|
| `setTimeout`/`sleep()` | Different delay values on recovery → non-deterministic |
| Custom decorator over `@DBOS.step()` | DBOS can't track step properly → double execution or missed replay |
| Retry loop in step | Step result includes partial retries → inconsistent state on recovery |
| `this.x = ...` inside step | Side effect doesn't execute on replay → class state is stale |

**Safe retry is achieved through:**
- **Service-side idempotency**: Services use `processed_requests` table
- **DBOS step replay**: Completed steps are not re-executed
- **Workflow restart**: External orchestrator restarts failed workflows

```typescript
// packages/workflows/src/retry/RetryPolicy.ts

import { ServiceError, isServiceError } from "../ports/types.js";

/**
 * Determines if an error should be retried.
 * Used for logging/metrics ONLY - actual retry is handled by DBOS or orchestrator.
 *
 * RULE: Only returns true if error.retryable === true explicitly.
 */
export function shouldRetry(error: unknown): boolean {
  // Use shape check, not instanceof (cross-package compatibility)
  if (isServiceError(error)) {
    return error.retryable === true;
  }

  if (
    error !== null &&
    typeof error === "object" &&
    "retryable" in error &&
    (error as { retryable: unknown }).retryable === true
  ) {
    return true;
  }

  // Unknown errors are NOT retryable
  return false;
}
```

#### Retry Decision Matrix

| Error Code | `retryable` | DBOS Behavior |
|------------|-------------|---------------|
| `TRANSIENT_ERROR` | `true` | Retry with backoff |
| `TRANSIENT_IN_PROGRESS` | `true` | Retry with backoff |
| `TRANSIENT_TIMEOUT` | `true` | Retry with backoff |
| `TRANSIENT_UNAVAILABLE` | `true` | Retry with backoff |
| `VALIDATION_*` | `false` | Fail immediately |
| `NOT_FOUND` | `false` | Fail immediately |
| `CONFLICT` | `false` | Fail immediately |
| `INTERNAL_*` | `false` | Fail immediately |
| Unknown error | `false` | Fail immediately |

**Key principle**: If `retryable` is not explicitly `true`, the error is NOT retried.
This is enforced in code, not by convention.

---

## Migration Path

### Phase 1: Introduce Ports (No Behavior Change)

1. Create `packages/workflows/src/ports/` with interfaces and types
2. Implement `LocalServicePort` wrapping existing `ServiceBroker`
3. Add `PortFactory` to DI with proper NestJS patterns
4. Create `BaseWorkflow` with port support
5. Update `StoreCreateWorkflow` to extend BaseWorkflow and use `callService()`
6. Split multi-call steps into individual `@DBOS.step()` methods

**Result**: Same behavior, cleaner abstraction, better retry isolation.

### Phase 2: Add ActionRequest Envelope

1. Update `BrokerActions` to accept `ActionRequest` envelope
2. Add backwards-compatible unwrapping for legacy callers
3. Pass `ActionContext` through ports

**Result**: Services receive context for idempotency.

### Phase 3: Add Idempotency

1. Create `processed_requests` table in each service
2. Implement idempotency checks in BrokerActions
3. Add cleanup job for old entries

**Result**: Safe retries without duplicate effects.

### Phase 4: Extract Services (When Ready)

1. Define gRPC proto matching `ActionRequest`/`ActionResponse`
2. Implement gRPC server in target service (calls same `handleAction` logic)
3. Implement `GrpcServicePort`
4. Switch `TRANSPORT_MODE=grpc` for extracted services

```typescript
// Environment-based configuration
// .env
TRANSPORT_MODE=grpc
IAM_GRPC_HOST=iam-service:50051
MEDIA_GRPC_HOST=media-service:50051
```

**Result**: Workflow code unchanged, transport switched.

---

## Testing Workflows

### Mock ServicePort for Unit Tests

```typescript
// packages/workflows/src/ports/MockServicePort.ts

import type { ServicePort, ActionContext } from "./types.js";
import { ServiceError } from "./types.js";

type MockHandler = (action: string, payload: unknown, ctx: ActionContext) => unknown;

export class MockServicePort implements ServicePort {
  private handlers = new Map<string, MockHandler>();
  private calls: Array<{ action: string; payload: unknown; ctx: ActionContext }> = [];

  constructor(public readonly name: string) {}

  /**
   * Register mock handler for an action.
   */
  onAction(action: string, handler: MockHandler): this {
    this.handlers.set(action, handler);
    return this;
  }

  /**
   * Register mock to return fixed result.
   */
  onActionReturn<T>(action: string, result: T): this {
    return this.onAction(action, () => result);
  }

  /**
   * Register mock to throw error.
   */
  onActionThrow(action: string, error: ServiceError): this {
    return this.onAction(action, () => { throw error; });
  }

  async handle<TResult = unknown>(
    action: string,
    payload: unknown,
    ctx: ActionContext
  ): Promise<TResult> {
    this.calls.push({ action, payload, ctx });

    const handler = this.handlers.get(action);
    if (!handler) {
      throw new Error(`MockServicePort[${this.name}]: No handler for '${action}'`);
    }

    return handler(action, payload, ctx) as TResult;
  }

  /**
   * Get recorded calls for assertions.
   */
  getCalls(action?: string) {
    return action ? this.calls.filter(c => c.action === action) : this.calls;
  }

  /**
   * Clear recorded calls.
   */
  reset() {
    this.calls = [];
    return this;
  }
}
```

### Test Example

```typescript
// services/project/src/workflows/__tests__/StoreCreateWorkflow.test.ts

import { MockServicePort } from "@shopana/workflows/ports";
import { StoreCreateWorkflow } from "../StoreCreateWorkflow.js";

describe("StoreCreateWorkflow", () => {
  let iamPort: MockServicePort;
  let mediaPort: MockServicePort;
  let workflow: StoreCreateWorkflow;

  beforeEach(() => {
    iamPort = new MockServicePort("iam")
      .onActionReturn("createRoles", { success: true })
      .onActionReturn("assignRole", { success: true });

    mediaPort = new MockServicePort("media")
      .onActionReturn("createAssetGroup", { assetGroup: { id: "ag-123" } });

    const ports = new Map([
      ["iam", iamPort],
      ["media", mediaPort],
    ]);

    workflow = new StoreCreateWorkflow("test", {
      kernel: mockKernel,
      ports,
    });
  });

  it("calls IAM and Media services", async () => {
    await workflow.run({
      name: "test-store",
      displayName: "Test Store",
      organizationId: "org-123",
      userId: "user-456",
      // ...other fields
    });

    expect(iamPort.getCalls("createRoles")).toHaveLength(1);
    expect(iamPort.getCalls("assignRole")).toHaveLength(1);
    expect(mediaPort.getCalls("createAssetGroup")).toHaveLength(1);
  });

  it("propagates service errors", async () => {
    iamPort.onActionThrow("createRoles",
      ServiceError.validation("iam", "createRoles", "Domain already exists")
    );

    await expect(workflow.run({ ... })).rejects.toThrow("Domain already exists");
  });
});
```

---

## Type-Safe Actions (Future Improvement)

For better DX, define action types per service:

```typescript
// packages/contracts/src/iam/actions.ts

export interface IamActions {
  createRoles: {
    request: { userId: string; organizationId: string; domain: string; roles: RoleConfig[] };
    response: { success: boolean };
  };
  assignRole: {
    request: { userId: string; organizationId: string; domain: string; roleName: string };
    response: { success: boolean };
  };
}

// Type-safe callService in BaseWorkflow
protected async callService<
  TService extends keyof ServiceActions,
  TAction extends keyof ServiceActions[TService]
>(
  service: TService,
  action: TAction,
  payload: ServiceActions[TService][TAction]["request"],
  callId?: string
): Promise<ServiceActions[TService][TAction]["response"]> {
  // ...implementation
}

// Usage - fully typed
await this.callService("iam", "createRoles", {
  userId,           // TypeScript knows this is required
  organizationId,
  domain: `store:${storeId}`,
  roles: buildStoreRoles(),
}, storeId);
```

This is not required for Phase 1 but significantly improves developer experience.

---

## Parallel Calls in Workflows

### CRITICAL: Don't `Promise.all` on `@DBOS.step()` Methods

**WRONG** - unpredictable recovery behavior:
```typescript
// DON'T DO THIS - step tracking may not work as expected
await Promise.all([
  this.stepA(),  // @DBOS.step()
  this.stepB(),  // @DBOS.step()
  this.stepC(),  // @DBOS.step()
]);
```

### Two Safe Patterns for Parallel Calls

#### Pattern A: Fanout Inside Single Step (Recommended)

One `@DBOS.step()` that internally parallelizes port calls:

```typescript
@DBOS.workflow()
async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
  const storeId = await this.generateStoreId();
  await this.createStore(storeId, input);

  // Single step that fans out to multiple services
  await this.initializeAllServices(storeId, input.organizationId, input.userId);

  return { storeId, organizationId: input.organizationId };
}

/**
 * Fanout step: calls multiple services in parallel.
 * On retry, ALL calls are re-executed (must be idempotent).
 */
@DBOS.step()
private async initializeAllServices(storeId: string, organizationId: string, userId: string) {
  const services = ["iam", "media", "inventory"] as const;

  const results = await Promise.allSettled([
    this.callService("iam", "lifecycle:store:initialize", { storeId, organizationId, userId }, storeId),
    this.callService("media", "lifecycle:store:initialize", { storeId }, storeId),
    this.callService("inventory", "lifecycle:store:initialize", { storeId }, storeId),
  ]);

  // Collect failures with proper formatting
  const failures = results
    .map((r, i) => ({ result: r, service: services[i] }))
    .filter((x): x is { result: PromiseRejectedResult; service: string } =>
      x.result.status === "rejected"
    )
    .map(({ result, service }) => {
      const err = result.reason;
      // Use shape check, not instanceof (cross-package compatibility)
      if (isServiceError(err)) {
        return `${service}: [${err.code}] ${err.message}`;
      }
      return `${service}: ${String(err)}`;
    });

  if (failures.length > 0) {
    throw new Error(`Store initialization failed:\n${failures.join("\n")}`);
  }
}
```

#### Pattern B: Sequential Steps (Simplest, Safest)

For most workflows, sequential is better:

```typescript
@DBOS.workflow()
async run(input: StoreCreateInput): Promise<StoreCreateOutput> {
  const storeId = await this.generateStoreId();
  await this.createStore(storeId, input);

  // Sequential - each is a separate step with clear recovery
  await this.createStoreRoles(storeId, input.organizationId, input.userId);
  await this.assignAdminRole(storeId, input.organizationId, input.userId);
  await this.createMediaAssetGroup(storeId);

  return { storeId, organizationId: input.organizationId };
}
```

### When to Use Each Pattern

| Pattern | Use When |
|---------|----------|
| **Sequential** | Default choice; clear ordering; dependencies between calls |
| **Fanout Step** | No dependencies; latency-sensitive; ALL calls are idempotent |

### Recovery Behavior

| Pattern | On Recovery |
|---------|-------------|
| **Sequential** | DBOS replays completed steps; retries failed step |
| **Fanout Step** | Entire fanout re-executes; services must handle duplicate calls via idempotency |

**Rule**: For fanout, ALL services MUST implement idempotency via `processed_requests` table.

---

## Action Naming Convention

### Naming Structure

| Category | Format | Examples |
|----------|--------|----------|
| Domain actions | `verbNoun` | `createRoles`, `assignRole`, `getAssetGroup` |
| Lifecycle actions | `lifecycle:entity:verb` | `lifecycle:store:initialize`, `lifecycle:store:cleanup` |
| Broker (fully qualified) | `service.action` | `iam.createRoles`, `iam.lifecycle:store:initialize` |

### Why Namespace Lifecycle Actions?

Lifecycle actions (`store.initialize`) could collide with domain actions. Using `lifecycle:` prefix:
- Clearly separates orchestration concerns from domain logic
- Allows services to group handlers differently
- Maps cleanly to gRPC proto packages

```typescript
// Domain action - core IAM functionality
await this.callService("iam", "createRoles", payload, storeId);
// -> broker.call("iam.createRoles", { payload, ctx })

// Lifecycle action - orchestration concern
await this.callService("iam", "lifecycle:store:initialize", payload, storeId);
// -> broker.call("iam.lifecycle:store:initialize", { payload, ctx })
```

### Service Handler Routing

```typescript
// services/iam/src/IamBrokerActions.ts
@Action("createRoles")
async createRoles(...) { /* domain logic */ }

@Action("lifecycle:store:initialize")
async storeInitialize(...) { /* create default roles/permissions for new store */ }

@Action("lifecycle:store:cleanup")
async storeCleanup(...) { /* remove all store-related data */ }
```

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Service calls | `this.broker.call("iam.action", params)` | `this.callService("iam", "action", payload, callId)` |
| callId | N/A | **REQUIRED**, deterministic from input/saved state |
| operationId | N/A | **UUID** from `initExecution()` step (NOT DBOS.workflowID directly!) |
| Context | N/A | `ActionContext` with version, operationId, idempotencyKey, traceId |
| Payload format | Mixed into params | Explicit `{ payload, ctx }` envelope |
| Idempotency | None | Services return success + `meta.idempotent` on duplicate |
| In-progress state | N/A | `TRANSIENT_IN_PROGRESS` (retryable, DBOS backs off) |
| Error handling | Return `{success, error}` | Always throw `ServiceError`; only `TRANSIENT_*` retryable |
| Error source | Guessed | Preserved from service; TRANSIENT only for transport errors |
| Retry policy | Implicit/unpredictable | DBOS-native retry OR workflow restart (NO custom decorators) |
| Parallel calls | Multiple `@DBOS.step()` in Promise.all | Single fanout step OR sequential steps |
| Transport | Hardcoded broker calls | Abstracted via `ServicePort` (supports future gRPC) |
| Testing | Need full broker | Mock `ServicePort` interface |
| Lifecycle actions | N/A | Namespaced: `lifecycle:store:initialize` |
| Unknown action | Varies | `VALIDATION_UNKNOWN_ACTION` (not retryable) |
| Dispatcher errors | Raw exceptions | Always `ActionResponse` with proper `code`/`retryable` |

### Files to Create

```
packages/workflows/src/ports/
├── index.ts
├── types.ts              # ActionContext, ActionRequest, ActionResponse, ServicePort, ServiceError
├── LocalServicePort.ts   # With isStructuredError(), isTransportError() helpers
├── MockServicePort.ts    # For unit testing
└── PortFactory.ts

packages/workflows/src/retry/
├── index.ts
└── RetryPolicy.ts        # shouldRetry() - for logging/metrics only, NOT for custom retry
# NOTE: RetryableStep.ts is REMOVED - see "Retry Strategy" section

packages/workflows/src/
├── BaseWorkflow.ts       # Port-focused base class with initExecution()
└── workflows.module.ts   # NestJS module

packages/shared-kernel/src/jobs/
└── ProcessedRequestsCleanupJob.ts  # MANDATORY TTL cleanup job
```

### Files to Modify

```
services/project/src/workflows/
├── StoreCreateWorkflow.ts  # Use callService(), separate steps
└── types.ts                # Remove kernel from base services

services/*/src/*BrokerActions.ts  # Accept ActionRequest envelope
```

---

## Appendix: Existing Service Actions Reference

### IAM Service (`services/iam/src/IamBrokerActions.ts`)

| Action | Parameters | Result |
|--------|------------|--------|
| `getCurrentUser` | `{ accessToken }` | `{ user, userErrors }` |
| `authorize` | `{ subject, organizationId, domain, resource, action }` | `{ allowed }` |
| `batchAuthorize` | `{ requests[] }` | `{ results[] }` |
| `createRoles` | `{ userId, organizationId, domain, roles[] }` | `{ success, error? }` |
| `assignRole` | `{ userId, organizationId, domain, roleName }` | `{ success, error? }` |

### Media Service (`services/media/src/MediaBrokerActions.ts`)

| Action | Parameters | Result |
|--------|------------|--------|
| `createAssetGroup` | `{ ownerType, ownerId }` | `{ assetGroup }` |
| `deleteAssetGroup` | `{ ownerType, ownerId }` | `{ success }` |
| `getAssetGroup` | `{ ownerType, ownerId }` | `{ assetGroup }` |

### Inventory Service (`services/inventory/src/InventoryBrokerActions.ts`)

| Action | Parameters | Result |
|--------|------------|--------|
| `getOffers` | `{ productIds, variantIds }` | `{ offers[] }` |

### Actions to Add (for Store Lifecycle)

Each service should implement:

| Action | Description |
|--------|-------------|
| `store.initialize` | Create default data for new store |
| `store.cleanup` | Remove all store data (compensation) |
| `store.suspend` | Soft-disable store access |
| `store.resume` | Re-enable store access |

---

## Implementation Checklist

### Phase 1: Core Infrastructure

- [ ] Create `packages/workflows/src/ports/types.ts`
  - [ ] `ActionContext` interface:
    - [ ] `operationId` - UUID (NOT human-readable, NOT dedupeKey)
    - [ ] `callId` required field
    - [ ] NO `timestamp` field (non-deterministic, breaks recovery)
  - [ ] `ActionRequest<T>` / `ActionResponse<T>` interfaces
  - [ ] `ServicePort` interface
  - [ ] `ServiceError` class with `retryable` flag and factory methods
  - [ ] **`isServiceError()` shape-based type guard** (use instead of instanceof!)

- [ ] Create `packages/workflows/src/ports/LocalServicePort.ts`
  - [ ] `normalizeResponse()` for legacy format handling with deprecation warnings
  - [ ] `isStructuredError()` - preserve service error codes AND additional fields
  - [ ] `isTransportError()` - ONLY transport errors become TRANSIENT
  - [ ] Unknown errors → `INTERNAL_ERROR` (not retryable)
  - [ ] Use `isServiceError()` instead of `instanceof ServiceError`

- [ ] Create `packages/workflows/src/ports/LegacyResponseTracker.ts`
  - [ ] Track legacy response format usage for migration monitoring
  - [ ] Support enforcement mode (warn → fail after deadline)

- [ ] Create `packages/workflows/src/ports/MockServicePort.ts`
  - [ ] `onAction()`, `onActionReturn()`, `onActionThrow()`
  - [ ] `getCalls()` for test assertions

- [ ] Create `packages/workflows/src/ports/PortFactory.ts`

- [ ] Create `packages/workflows/src/BaseWorkflow.ts`
  - [ ] **`initExecution()` step** - MUST be called first in every workflow
  - [ ] `executionId` property (UUID, separate from dedupeKey)
  - [ ] `getOperationId()` - returns executionId, throws if not initialized
  - [ ] `buildContext()` using executionId (NOT DBOS.workflowID directly)
  - [ ] `callService()` with **required** `callId` parameter
  - [ ] Validate callId is non-empty

- [ ] Create `packages/workflows/src/workflows.module.ts`

### Phase 2: DBOS Verification (MANDATORY before any workflow code)

- [ ] **Verify DBOS step result persistence**
  - [ ] Write test: run workflow with `uuidv7()` in step → crash → resume
  - [ ] Verify: same UUID returned on recovery
  - [ ] If fails: implement `initExecution()` with DBOS-saved UUID

- [ ] **Verify DBOS.workflowID vs executionId**
  - [ ] Check if DBOS has separate `DBOS.executionID`
  - [ ] If DBOS.workflowID can be user-provided (dedupeKey), use `initExecution()` pattern

- [ ] Create `packages/workflows/src/retry/RetryPolicy.ts`
  - [ ] `shouldRetry(error)` - for logging/metrics only
  - [ ] Use `isServiceError()` shape check (not instanceof)
  - [ ] **NO custom retry decorator** (see "Retry Strategy" section)

### Phase 3: Pilot Workflow Migration (StoreCreateWorkflow)

- [ ] Update `services/project/src/workflows/StoreCreateWorkflow.ts`
  - [ ] Extend new `BaseWorkflow`
  - [ ] **FIRST in `run()`**: `const { executionId } = await this.initExecution(); this.executionId = executionId;`
  - [ ] Use plain `@DBOS.step()` - NO custom retry decorators
  - [ ] Use `callService()` with deterministic `callId`:
    - `createRoles`: `storeId`
    - `assignRole`: `${storeId}:admin:${userId}`
    - `createAssetGroup`: `storeId`
  - [ ] Choose pattern: sequential steps OR single fanout step

- [ ] Update `services/project/src/project.module.ts`
  - [ ] Inject `PortFactory`
  - [ ] Create ports for dependent services

- [ ] Write unit tests using `MockServicePort`

### Phase 4: Service-Side Envelope & Dispatcher

- [ ] Implement centralized dispatcher error handling
  - [ ] Wrap ALL handler execution in try/catch
  - [ ] Always return `ActionResponse` (never raw exceptions)
  - [ ] Unknown action → `VALIDATION_UNKNOWN_ACTION` (not retryable)
  - [ ] **Use `isServiceError()` shape check** (not instanceof - cross-package issue!)
  - [ ] Preserve `code` and `retryable` from service errors

- [ ] Update `services/*/src/*BrokerActions.ts` to accept `ActionRequest` envelope
  - [ ] Add `unwrapRequest()` helper for backwards compatibility
  - [ ] Zod schema supporting both formats

- [ ] Add lifecycle action handlers:
  - [ ] `@Action("lifecycle:store:initialize")`
  - [ ] `@Action("lifecycle:store:cleanup")`

### Phase 5: Idempotency Infrastructure

- [ ] Create `processed_requests` migration in each service
  - [ ] `idempotency_key` PRIMARY KEY (SHA-256 hash)
  - [ ] `operation_id`, `service`, `action`, `call_id` columns
  - [ ] `status` column: `'reserved' | 'completed' | 'failed'`
  - [ ] `attempt` INTEGER for retry tracking (no deletion on failure)
  - [ ] `last_error` TEXT for debugging failed attempts
  - [ ] `result` JSONB (nullable), `result_cached` flag
  - [ ] **JSONB: pass object directly, NOT JSON.stringify()** (avoids double-serialization)
  - [ ] `updated_at` TIMESTAMPTZ for status changes
  - [ ] Indexes: `created_at`, `operation_id`, `status`
  - [ ] `alert_stale_reserved_requests()` function for monitoring

- [ ] Implement atomic reservation pattern in BrokerActions:
  - [ ] `INSERT ON CONFLICT DO NOTHING` to reserve (with `attempt = 1`)
  - [ ] If already `completed` → return success + `meta.idempotent`
  - [ ] If `reserved` (in progress) → throw `TRANSIENT_IN_PROGRESS` (retryable!)
  - [ ] If `failed` → claim via `UPDATE WHERE status='failed'`, increment attempt (NO DELETE!)
  - [ ] On success → update status to `completed`
  - [ ] On error → update status to `failed` with `last_error` info

- [ ] **MANDATORY: Deploy TTL cleanup infrastructure** (choose one):
  - [ ] Option A: pg_cron extension with scheduled DELETE query
  - [ ] Option B: `ProcessedRequestsCleanupJob` NestJS scheduled job
  - [ ] Wire `AlertService` for stale 'reserved' records alerts
  - [ ] Add monitoring dashboard for table size over time
  - [ ] **Test: verify cleanup never deletes 'reserved' records!**

### Phase 6: Error Standardization

- [ ] Define error code conventions in shared-kernel:
  - [ ] `TRANSIENT_*` for retryable (network, temporary failures, in-progress)
  - [ ] `TRANSIENT_IN_PROGRESS` for idempotency "reserved" or "retry in progress" state
  - [ ] `VALIDATION_*` for bad input (not retryable)
  - [ ] `NOT_FOUND` for missing resources (not retryable)
  - [ ] `CONFLICT` for duplicates that are completed (not retryable)
  - [ ] `INTERNAL_*` for logic errors (not retryable)
  - [ ] Only `TRANSIENT_*` is auto-retryable

- [ ] Update all services to use `ActionResponse` format with `meta.idempotent`
- [ ] Remove legacy `{success, error}` pattern (set deadline for removal)

> **Note**: The `ServicePort` abstraction is designed to support gRPC in the future
> if services need to be extracted to separate processes. When that time comes,
> implement `GrpcServicePort` and add transport mode configuration to `PortFactory`.

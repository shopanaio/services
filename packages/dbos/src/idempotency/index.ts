/**
 * @file Idempotency Utilities
 * @description Deterministic workflow ID generation for idempotent execution
 */

import { createHash } from "node:crypto";
import canonicalizeModule from "canonicalize";

// canonicalize exports a default function, but TypeScript sees the module wrapper
const canonicalize = canonicalizeModule.default ?? canonicalizeModule;

// ============================================================================
// IDEMPOTENCY CONTEXT TYPES
// ============================================================================

/**
 * Client-provided idempotency key (External API).
 * Used for requests from external clients via HTTP Idempotency-Key header.
 */
export interface ClientIdempotencyContext {
  source: "client";
  /** Client-provided idempotency key from HTTP header */
  clientKey: string;
  /** Tenant/organization ID for key isolation */
  organizationId: string;
  /** API key ID used for the request */
  apiKeyId: string;
  /** Hash of the semantic request payload, excluding volatile request metadata. */
  requestHash?: string;
}

export class IdempotencyConflictError extends Error {
  readonly code = "IDEMPOTENCY_CONFLICT";

  constructor() {
    super("Idempotency key was already used with a different request payload");
    this.name = "IdempotencyConflictError";
  }
}

/**
 * Workflow-derived idempotency key (Service-Initiated).
 * Used for background jobs, event handlers, cron tasks.
 */
export interface WorkflowIdempotencyContext {
  source: "workflow";
  /** Tenant/organization ID for key isolation (optional) */
  organizationId?: string;
  /** Business ID of parent workflow */
  workflowId: string;
  /** Step name within workflow */
  stepId: string;
  /** Unique ID for fan-out operations */
  callId?: string;
}

/**
 * Content-derived idempotency key (Idempotent Updates).
 * Used for UPDATE/SET operations where same data = same operation.
 */
export interface ContentIdempotencyContext {
  source: "content";
  /** Tenant/organization ID for key isolation (optional) */
  organizationId?: string;
  /** Resource identifier (e.g., SKU, productId) */
  resourceId: string;
  /** Operation name */
  operation: string;
  /** Raw content to hash (will be hashed internally) */
  content?: unknown;
  /** Pre-computed SHA256 hash of canonicalized payload (optional, use `content` instead) */
  contentHash?: string;
}

/**
 * Content-derived idempotency scoped to a request-time window.
 * Used when equal mutations should collapse briefly but remain executable later.
 */
export interface TimeWindowIdempotencyContext {
  source: "time-window";
  /** Tenant/organization ID for key isolation (optional) */
  organizationId?: string;
  /** Resource identifier (e.g., productId) */
  resourceId: string;
  /** Operation name */
  operation: string;
  /** Raw semantic content to hash */
  content?: unknown;
  /** Pre-computed SHA256 hash of canonicalized content */
  contentHash?: string;
  /** Stable request timestamp assigned at the transport boundary, in Unix milliseconds */
  requestTimestamp: number;
  /** Size of the deduplication window, in milliseconds */
  windowMs: number;
}

export class InvalidTimeWindowIdempotencyContextError extends Error {
  readonly code = "INVALID_TIME_WINDOW_IDEMPOTENCY_CONTEXT";

  constructor(message: string) {
    super(`Invalid time-window idempotency context: ${message}`);
    this.name = "InvalidTimeWindowIdempotencyContextError";
  }
}

/**
 * Union type for all idempotency contexts.
 */
export type IdempotencyContext =
  | ClientIdempotencyContext
  | WorkflowIdempotencyContext
  | ContentIdempotencyContext
  | TimeWindowIdempotencyContext;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Helper to create content hash for ContentIdempotencyContext.
 */
export function hashContent(payload: unknown): string {
  const canonical = canonicalize(payload);
  if (!canonical) {
    throw new Error("Failed to canonicalize payload");
  }
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Build deterministic idempotency key from context.
 *
 * Format: `{prefix}:{sha256_hash}`
 *
 * The hash input is versioned and includes all context fields for collision resistance.
 * When organizationId is provided, it's included at the beginning of the hash input for isolation.
 */
export function buildIdempotencyKey(workflowName: string, ctx: IdempotencyContext): string {
  const hash = (input: string): string => {
    return createHash("sha256").update(input).digest("hex").slice(0, 32);
  };

  const tenantPrefix = (organizationId: string | undefined) =>
    organizationId ? `${organizationId}:` : "";

  switch (ctx.source) {
    case "client": {
      const input = `v1:client:${tenantPrefix(ctx.organizationId)}${ctx.apiKeyId}:${workflowName}:${ctx.clientKey}`;
      return `client:${hash(input)}`;
    }

    case "workflow": {
      const callId = ctx.callId ?? "";
      const input = `v1:workflow:${tenantPrefix(ctx.organizationId)}${ctx.workflowId}:${ctx.stepId}:${callId}:${workflowName}`;
      return `workflow:${hash(input)}`;
    }

    case "content": {
      const contentHashValue =
        ctx.contentHash ?? (ctx.content !== undefined ? hashContent(ctx.content) : undefined);
      const contentSuffix = contentHashValue ? `:${contentHashValue}` : "";
      const input = `v1:content:${tenantPrefix(ctx.organizationId)}${ctx.resourceId}:${ctx.operation}${contentSuffix}:${workflowName}`;
      return `content:${hash(input)}`;
    }

    case "time-window": {
      assertTimeWindowContext(ctx);
      const contentHashValue =
        ctx.contentHash ?? (ctx.content !== undefined ? hashContent(ctx.content) : undefined);
      if (!contentHashValue) {
        throw new InvalidTimeWindowIdempotencyContextError("content or contentHash is required");
      }
      const window = Math.floor(ctx.requestTimestamp / ctx.windowMs);
      const input = `v1:time-window:${tenantPrefix(ctx.organizationId)}${ctx.resourceId}:${ctx.operation}:${contentHashValue}:${ctx.windowMs}:${window}:${workflowName}`;
      return `time-window:${hash(input)}`;
    }
  }
}

function assertTimeWindowContext(ctx: TimeWindowIdempotencyContext): void {
  if (!Number.isSafeInteger(ctx.requestTimestamp) || ctx.requestTimestamp < 0) {
    throw new InvalidTimeWindowIdempotencyContextError(
      "requestTimestamp must be a non-negative safe integer Unix timestamp in milliseconds",
    );
  }
  if (!Number.isSafeInteger(ctx.windowMs) || ctx.windowMs <= 0) {
    throw new InvalidTimeWindowIdempotencyContextError(
      "windowMs must be a positive safe integer number of milliseconds",
    );
  }
}

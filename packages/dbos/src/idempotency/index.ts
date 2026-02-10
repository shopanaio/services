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
  tenantId: string;
  /** API key ID used for the request */
  apiKeyId: string;
}

/**
 * Workflow-derived idempotency key (Service-Initiated).
 * Used for background jobs, event handlers, cron tasks.
 */
export interface WorkflowIdempotencyContext {
  source: "workflow";
  /** Tenant/organization ID for key isolation (optional) */
  tenantId?: string;
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
  tenantId?: string;
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
 * Union type for all idempotency contexts.
 */
export type IdempotencyContext =
  | ClientIdempotencyContext
  | WorkflowIdempotencyContext
  | ContentIdempotencyContext;

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
 * When tenantId is provided, it's included at the beginning of the hash input for isolation.
 */
export function buildIdempotencyKey(
  workflowName: string,
  ctx: IdempotencyContext,
): string {
  const hash = (input: string): string => {
    return createHash("sha256").update(input).digest("hex").slice(0, 32);
  };

  const tenantPrefix = (tenantId: string | undefined) => tenantId ? `${tenantId}:` : "";

  switch (ctx.source) {
    case "client": {
      const input = `v1:client:${tenantPrefix(ctx.tenantId)}${ctx.apiKeyId}:${workflowName}:${ctx.clientKey}`;
      return `client:${hash(input)}`;
    }

    case "workflow": {
      const callId = ctx.callId ?? "";
      const input = `v1:workflow:${tenantPrefix(ctx.tenantId)}${ctx.workflowId}:${ctx.stepId}:${callId}:${workflowName}`;
      return `workflow:${hash(input)}`;
    }

    case "content": {
      const contentHashValue = ctx.contentHash ?? (ctx.content !== undefined ? hashContent(ctx.content) : undefined);
      const contentSuffix = contentHashValue ? `:${contentHashValue}` : "";
      const input = `v1:content:${tenantPrefix(ctx.tenantId)}${ctx.resourceId}:${ctx.operation}${contentSuffix}:${workflowName}`;
      return `content:${hash(input)}`;
    }
  }
}

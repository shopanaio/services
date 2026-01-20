import { createHash } from "node:crypto";
import canonicalize from "canonicalize";

/**
 * Client-provided idempotency key (External API).
 * Used for requests from external clients via HTTP Idempotency-Key header.
 */
export interface ClientIdempotencyContext {
  source: "client";
  /** Client-provided idempotency key from HTTP header */
  clientKey: string;
  /** Tenant/organization ID */
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
  /** Resource identifier (e.g., SKU, productId) */
  resourceId: string;
  /** Operation name */
  operation: string;
  /** SHA256 hash of canonicalized payload */
  contentHash: string;
}

/**
 * Union type for all idempotency contexts.
 */
export type IdempotencyContext =
  | ClientIdempotencyContext
  | WorkflowIdempotencyContext
  | ContentIdempotencyContext;

/**
 * Build deterministic idempotency key from context.
 */
export function buildIdempotencyKey(
  workflowName: string,
  ctx: IdempotencyContext,
): string {
  const hash = (input: string): string => {
    return createHash("sha256").update(input).digest("hex").slice(0, 32);
  };

  switch (ctx.source) {
    case "client": {
      const input = `v1:client:${ctx.tenantId}:${ctx.apiKeyId}:${workflowName}:${ctx.clientKey}`;
      return `client:${hash(input)}`;
    }

    case "workflow": {
      const callId = ctx.callId ?? "";
      const input = `v1:workflow:${ctx.workflowId}:${ctx.stepId}:${callId}:${workflowName}`;
      return `workflow:${hash(input)}`;
    }

    case "content": {
      const input = `v1:content:${ctx.resourceId}:${ctx.operation}:${ctx.contentHash}:${workflowName}`;
      return `content:${hash(input)}`;
    }
  }
}

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

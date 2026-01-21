import type {
  WorkflowHandle as DBOSWorkflowHandle,
  WorkflowStatus as DBOSWorkflowStatus,
} from "@dbos-inc/dbos-sdk";

// Re-export DBOS types
export type { DBOSWorkflowHandle, DBOSWorkflowStatus };

// ============================================================================
// UNIFIED OPERATION CONTRACTS
// ============================================================================

/**
 * Unified error type for all operations.
 * Includes `retryable` flag for retry management.
 */
export interface OperationError {
  message: string;
  code?: string;
  /** Whether the error is transient and operation can be retried */
  retryable: boolean;
  /** Original error name (e.g., "TypeError", "ValidationError") */
  name?: string;
  /** Stack trace (only in development) */
  stack?: string;
}

/**
 * Base result type for any operation (actions, handlers, workflows).
 */
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: OperationError;
}

/**
 * Workflow execution status.
 */
export type WorkflowStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

/**
 * Extended result for workflows with step tracking.
 */
export interface WorkflowResult<T = unknown> extends OperationResult<T> {
  status: WorkflowStatus;
  /** Step where the failure occurred */
  failedStep?: string;
  /** Attempt count per step execution (for metrics/debugging) */
  attempts: Record<string, number>;
  /** Warnings from non-critical steps */
  warnings: Array<{ step: string; message: string }>;
}

// ============================================================================
// RETRY POLICY
// ============================================================================

/**
 * Retry policy configuration.
 */
export interface RetryPolicy {
  maxAttempts: number;
  intervalSeconds: number;
  backoffRate: number;
}

/** Default retry policy (no retries) */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 1,
  intervalSeconds: 0,
  backoffRate: 1,
};

// ============================================================================
// ERROR HELPERS
// ============================================================================

/**
 * Convert any error to OperationError.
 * Unknown errors are marked as non-retryable by default.
 */
export function toOperationError(error: unknown): OperationError {
  if (error instanceof Error) {
    const isRetryable = isRetryableError(error);
    return {
      message: error.message,
      code: (error as { code?: string }).code,
      retryable: isRetryable,
      name: error.name,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }

  return {
    message: String(error),
    retryable: false,
  };
}

/**
 * Check if an error is retryable (transient).
 */
export function isRetryableError(error: unknown): boolean {
  // Check for explicit retryable property
  if (
    error &&
    typeof error === "object" &&
    "retryable" in error &&
    typeof error.retryable === "boolean"
  ) {
    return error.retryable;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    const retryablePatterns = [
      "econnrefused",
      "econnreset",
      "etimedout",
      "enotfound",
      "socket hang up",
      "network",
      "timeout",
      "unavailable",
      "service_unavailable",
      "503",
      "502",
      "504",
    ];

    if (retryablePatterns.some((p) => message.includes(p) || name.includes(p))) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base class for operation errors with retry classification.
 */
export abstract class OperationException extends Error {
  abstract readonly retryable: boolean;
  code?: string;
}

/**
 * Retryable (transient) error - network issues, timeouts, service unavailable.
 */
export class RetryableError extends OperationException {
  readonly retryable = true;

  constructor(message: string, cause?: Error) {
    super(message, cause ? { cause } : undefined);
    this.name = "RetryableError";
    this.code = "RETRYABLE_ERROR";
  }
}

/**
 * Fatal (non-retryable) error - validation, business logic, not found.
 */
export class FatalError extends OperationException {
  readonly retryable = false;

  constructor(message: string, cause?: Error, code?: string) {
    super(message, cause ? { cause } : undefined);
    this.name = "FatalError";
    this.code = code ?? "FATAL_ERROR";
  }
}

/**
 * Step execution error wrapper with step context.
 */
export class StepExecutionError extends Error {
  constructor(
    public readonly stepName: string,
    public readonly methodName: string,
    public readonly cause: Error,
  ) {
    super(`Step "${stepName}" failed: ${cause.message}`, { cause });
    this.name = "StepExecutionError";
  }
}

/**
 * Step timeout error - non-retryable.
 */
export class StepTimeoutError extends FatalError {
  constructor(stepName: string, timeoutMs: number) {
    super(`Step "${stepName}" timed out after ${timeoutMs}ms`);
    this.name = "StepTimeoutError";
    this.code = "STEP_TIMEOUT";
  }
}

// ============================================================================
// TIMEOUT HELPER
// ============================================================================

/** Default step execution timeout */
export const DEFAULT_STEP_TIMEOUT_MS = 30_000;

/**
 * Wraps a promise with timeout.
 * Throws StepTimeoutError if timeout exceeded.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  stepName: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new StepTimeoutError(stepName, timeoutMs));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Simplified workflow status for external consumers
 */
export type WorkflowStatusSimple =
  | "PENDING"
  | "SUCCESS"
  | "ERROR"
  | "RETRIES_EXCEEDED"
  | "CANCELLED"
  | "UNKNOWN";

/**
 * Simplified handle for monitoring workflows
 */
export interface WorkflowHandle<TResult> {
  workflowId: string;
  getResult(): Promise<TResult>;
  getStatus(): Promise<DBOSWorkflowStatus | null>;
}

/**
 * Options for starting a workflow
 */
export interface WorkflowStartOptions {
  /** Custom workflow ID for idempotency */
  workflowId?: string;
}

/**
 * Configuration for DBOS workflow module
 */
export interface WorkflowModuleConfig {
  /** PostgreSQL connection string for DBOS system tables */
  databaseUrl: string;
  /** Application name for DBOS (used in system tables) */
  name?: string;
  /** PostgreSQL schema for DBOS system tables (default: "dbos") */
  schema?: string;
}

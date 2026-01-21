/**
 * @file Saga Engine Types
 * @description Types, interfaces, and error classes for the saga engine
 */

// ============================================================================
// RESULT TYPES
// ============================================================================

/** Serializable error info (for API responses/logging) */
export interface ErrorInfo {
  name: string;
  message: string;
  code?: string;
  stack?: string;
}

/** Convert Error to serializable shape */
export function toErrorInfo(error: Error): ErrorInfo {
  return {
    name: error.name,
    message: error.message,
    code: (error as { code?: string }).code,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  };
}

/** Result of a saga step (fully serializable) */
export interface StepResult<T = unknown> {
  success: boolean;
  data?: T;
  /** Serializable error info (not Error object) */
  error?: ErrorInfo;
}

/** Saga execution status */
export type SagaStatus =
  | "pending"
  | "running"
  | "completed"
  | "compensating"
  | "compensated"
  | "failed";

/** Saga result (fully serializable) */
export interface SagaResult<TOutput = unknown> {
  success: boolean;
  status: SagaStatus;
  data?: TOutput;
  /** Error info (serializable) */
  error?: ErrorInfo;
  /** Step where the failure occurred */
  failedStep?: string;
  /** Attempt count per step execution (for metrics/debugging) */
  attempts: Record<string, number>;
  /** Attempt count per compensation (for metrics/debugging) */
  compAttempts: Record<string, number>;
  /** Steps that succeeded */
  succeededSteps: string[];
  /** Steps that were successfully compensated */
  compensatedSteps: string[];
  /** Whether all compensations succeeded */
  compensated: boolean;
  /** Compensation errors (serializable) */
  compensationErrors: ErrorInfo[];
  /** Warnings from non-critical steps */
  warnings: Array<{ step: string; message: string }>;
}

// ============================================================================
// RETRY POLICY
// ============================================================================

/** Retry policy (aligned with ActionMetadata from broker) */
export interface RetryPolicy {
  maxAttempts: number;
  intervalSeconds: number;
  backoffRate: number;
}

/** Default compensation retry policy */
export const DEFAULT_COMPENSATION_RETRY: RetryPolicy = {
  maxAttempts: 10,
  intervalSeconds: 1,
  backoffRate: 2,
};

// ============================================================================
// STEP CONFIGURATION
// ============================================================================

/** Saga step configuration */
export interface SagaStepConfig {
  /** Step name for logging/identification (default: method name) */
  name?: string;
  /** If false, failure does not stop the saga */
  critical?: boolean;
  /**
   * Compensation method name or false to disable.
   * - undefined/string: compensate + PascalCase(methodName) or custom name
   * - false: no compensation
   */
  compensate?: string | false;
  /** Retry policy for transient errors */
  retry?: RetryPolicy;
  /** Step execution timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/** Metadata for saga steps with compensation */
export interface SagaStepMetadata {
  stepConfig: SagaStepConfig;
  /** Resolved compensation method name */
  compensateMethod: string;
  /** Method name */
  methodName: string;
}

/** Executed step (for compensation) */
export interface ExecutedStep {
  /** Canonical identifier (method name) */
  method: string;
  /** Display name (config.name or method) */
  stepName: string;
  /** Arguments passed to the step (used for compensation) */
  args: unknown[];
  /** Step config for compensation lookup */
  config: SagaStepConfig;
}

// ============================================================================
// EXECUTOR CONFIGURATION
// ============================================================================

/** Compensation exhaustion handler (for DLQ/alerting extension point) */
export type OnCompensationExhausted = (
  stepName: string,
  methodName: string,
  error: Error,
  context: {
    sagaId: string;
    args: unknown[];
    /** Number of compensation attempts */
    compAttempts: number;
  },
) => void | Promise<void>;

/** Saga executor configuration */
export interface SagaExecutorConfig {
  /**
   * Called when compensation retries are exhausted.
   * Use for DLQ, alerting, manual intervention flags.
   */
  onCompensationExhausted?: OnCompensationExhausted;
  /**
   * Compensation retry policy override.
   * Default: { maxAttempts: 10, intervalSeconds: 1, backoffRate: 2 }
   */
  compensationRetryPolicy?: RetryPolicy;
}

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

/**
 * Base class for saga errors with retry classification.
 */
export abstract class SagaError extends Error {
  abstract readonly retryable: boolean;
  /** Optional error code for API responses */
  code?: string;
}

/**
 * Transient error - can be retried (network issues, timeouts, service unavailable).
 */
export class RetryableError extends SagaError {
  readonly retryable = true;

  constructor(message: string, cause?: Error) {
    super(message, cause ? { cause } : undefined);
    this.name = "RetryableError";
    this.code = "RETRYABLE_ERROR";
  }
}

/**
 * Fatal error - cannot be retried (validation, business logic, not found).
 */
export class FatalError extends SagaError {
  readonly retryable = false;

  constructor(message: string, cause?: Error, code?: string) {
    super(message, cause ? { cause } : undefined);
    this.name = "FatalError";
    this.code = code ?? "FATAL_ERROR";
  }
}

/**
 * Step execution error wrapper.
 * Preserves step context for observability (failedStep tracking).
 *
 * NOT a SagaError - classification is done on the cause.
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
// ERROR CLASSIFICATION HELPER
// ============================================================================

/**
 * Helper to classify unknown errors.
 * Unknown errors are treated as non-retryable by default.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof SagaError) {
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

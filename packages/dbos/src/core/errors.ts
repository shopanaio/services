/**
 * @file Error Classes
 * @description Error classes with retry classification for workflows and sagas
 */

import type { OperationError } from "./types.js";

// ============================================================================
// ERROR HELPERS
// ============================================================================

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

/**
 * Convert any error to OperationError.
 * Unknown errors are marked as non-retryable by default.
 */
export function toOperationError(error: unknown): OperationError {
  if (error instanceof Error) {
    const retryable = isRetryableError(error);
    return {
      message: error.message,
      code: (error as { code?: string }).code,
      retryable,
      name: error.name,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }

  return {
    message: String(error),
    retryable: false,
  };
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

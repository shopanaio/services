/**
 * @file Saga Engine Types
 * @description Types, interfaces, and error classes for the saga engine
 */

import {
  type OperationError,
  type OperationResult,
  type RetryPolicy,
  toOperationError,
} from "../workflow/types.js";

// Re-export base types for convenience
export type { OperationError, OperationResult, RetryPolicy };
export { toOperationError };

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

/**
 * @deprecated Use OperationError instead
 */
export type ErrorInfo = OperationError;

/**
 * @deprecated Use toOperationError instead
 */
export const toErrorInfo = toOperationError;

// ============================================================================
// RESULT TYPES
// ============================================================================

/** Result of a saga step (fully serializable) */
export interface StepResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: OperationError;
}

/** Saga execution status (extends WorkflowStatus with compensation states) */
export type SagaStatus =
  | "pending"
  | "running"
  | "completed"
  | "compensating"
  | "compensated"
  | "failed";

/**
 * Saga result - simplified.
 */
export interface SagaResult<TOutput = unknown> extends OperationResult<TOutput> {
  status: SagaStatus;
  /** Step where the failure occurred */
  failedStep?: string;
  /** Whether all compensations succeeded */
  compensated: boolean;
}

// ============================================================================
// RETRY POLICY
// ============================================================================

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
  /** If false, failure does not stop the saga (default: true) */
  critical?: boolean;
  /**
   * Compensation method name or false to disable.
   * - undefined: auto-detect compensate${PascalCase(methodName)} method
   * - string: use custom compensation method name
   * - false: explicitly disable compensation
   *
   * @default Auto-detects if compensate${PascalCase(methodName)} exists
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
// RE-EXPORT ERROR CLASSES AND HELPERS FROM WORKFLOW/TYPES
// ============================================================================

export {
  OperationException,
  RetryableError,
  FatalError,
  StepExecutionError,
  StepTimeoutError,
  isRetryableError,
  withTimeout,
  DEFAULT_STEP_TIMEOUT_MS,
} from "../workflow/types.js";

/**
 * @deprecated Use OperationException instead
 */
export { OperationException as SagaError } from "../workflow/types.js";

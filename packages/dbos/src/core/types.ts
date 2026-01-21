/**
 * @file Core Types
 * @description Unified types, interfaces, and error classes for workflows and sagas
 */

import type {
  WorkflowHandle as DBOSWorkflowHandle,
  WorkflowStatus as DBOSWorkflowStatus,
} from "@dbos-inc/dbos-sdk";

// Re-export DBOS types
export type { DBOSWorkflowHandle, DBOSWorkflowStatus };

// ============================================================================
// OPERATION CONTRACTS
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
// WORKFLOW TYPES
// ============================================================================

/**
 * Workflow execution status.
 */
export type WorkflowStatus = "pending" | "running" | "completed" | "failed";

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

// ============================================================================
// SAGA TYPES
// ============================================================================

/** Saga execution status (extends WorkflowStatus with compensation states) */
export type SagaStatus =
  | "pending"
  | "running"
  | "completed"
  | "compensating"
  | "compensated"
  | "failed";

/**
 * Saga result with compensation tracking.
 */
export interface SagaResult<TOutput = unknown> extends OperationResult<TOutput> {
  status: SagaStatus;
  /** Step where the failure occurred */
  failedStep?: string;
  /** Whether all compensations succeeded */
  compensated: boolean;
}

/** Result of a saga step (fully serializable) */
export interface StepResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: OperationError;
}

/** Saga step configuration */
export interface SagaStepConfig {
  /** Step name for logging/identification (default: method name) */
  name?: string;
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

/** Default compensation retry policy */
export const DEFAULT_COMPENSATION_RETRY: RetryPolicy = {
  maxAttempts: 10,
  intervalSeconds: 1,
  backoffRate: 2,
};

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
// MODULE CONFIGURATION
// ============================================================================

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

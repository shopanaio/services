/**
 * @file Saga Module Exports
 * @description Re-exports from @shopana/dbos + broker integration
 */

// Re-export everything from @shopana/dbos saga module
export {
  // Decorators
  Saga,
  SagaStep,
  SAGA_DEFINITION_KEY,
  SAGA_STEP_KEY,
  // Context
  SagaExecutionContext,
  sagaContextStorage,
  getSagaContext,
  // Base class (broker-independent)
  BaseSaga,
  // Error classes
  OperationException,
  RetryableError,
  FatalError,
  StepExecutionError,
  StepTimeoutError,
  // Helpers
  isRetryableError,
  toOperationError,
  withTimeout,
  // Constants
  DEFAULT_COMPENSATION_RETRY,
  DEFAULT_STEP_TIMEOUT_MS,
} from "@shopana/dbos";

// Types
export type {
  // Base contracts
  OperationError,
  OperationResult,
  RetryPolicy,
  // Saga-specific
  SagaResult,
  SagaStatus,
  StepResult,
  ExecutedStep,
  SagaStepConfig,
  SagaStepMetadata,
  SagaExecutorConfig,
  OnCompensationExhausted,
} from "@shopana/dbos";

// Broker-specific saga class
export { BrokerSaga } from "./BrokerSaga.js";

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================================

/** @deprecated Use OperationError instead */
export type { OperationError as ErrorInfo } from "@shopana/dbos";

/** @deprecated Use toOperationError instead */
export { toOperationError as toErrorInfo } from "@shopana/dbos";

/** @deprecated Use OperationException instead */
export { OperationException as SagaError } from "@shopana/dbos";

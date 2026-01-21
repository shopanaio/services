/**
 * @file Saga Engine Public API
 * @description Exports for the Saga Engine module
 */

// Decorators
export {
  Saga,
  SagaStep,
  SAGA_STEP_KEY,
  SAGA_DEFINITION_KEY,
} from "./decorators.js";

// Base class
export { BrokerSaga } from "./BrokerSaga.js";

// Context (advanced usage)
export {
  SagaExecutionContext,
  sagaContextStorage,
  getSagaContext,
} from "./SagaExecutionContext.js";

// Types - unified contracts
export type {
  // Base contracts (from workflow/types)
  OperationError,
  OperationResult,
  WorkflowResult,
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
} from "./types.js";

// Backward compatibility alias
export type { ErrorInfo } from "./types.js";

// Constants
export {
  DEFAULT_COMPENSATION_RETRY,
  DEFAULT_STEP_TIMEOUT_MS,
} from "./types.js";

// Errors and helpers
export {
  SagaError,
  OperationException,
  RetryableError,
  FatalError,
  StepExecutionError,
  StepTimeoutError,
  isRetryableError,
  toOperationError,
  withTimeout,
} from "./types.js";

// Backward compatibility
export { toErrorInfo } from "./types.js";

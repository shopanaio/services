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

// Types
export type {
  SagaResult,
  SagaStatus,
  StepResult,
  RetryPolicy,
  ErrorInfo,
  ExecutedStep,
  SagaStepConfig,
  SagaStepMetadata,
  SagaExecutorConfig,
  OnCompensationExhausted,
} from "./types.js";

// Constants
export {
  DEFAULT_COMPENSATION_RETRY,
  DEFAULT_STEP_TIMEOUT_MS,
} from "./types.js";

// Errors and helpers
export {
  SagaError,
  RetryableError,
  FatalError,
  StepExecutionError,
  StepTimeoutError,
  isRetryableError,
  toErrorInfo,
  withTimeout,
} from "./types.js";

/**
 * @file @shopana/dbos
 * @description Durable workflow and saga framework built on DBOS SDK
 *
 * This package provides a broker-independent framework for building
 * durable workflows and sagas with automatic compensation.
 *
 * @example
 * ```typescript
 * import {
 *   BaseSaga,
 *   Saga,
 *   SagaStep,
 *   WorkflowModule,
 *   WorkflowRegistry,
 * } from '@shopana/dbos';
 *
 * class OrderSaga extends BaseSaga<OrderInput, OrderResult> {
 *   constructor(registry: WorkflowRegistry, serviceName: string) {
 *     super(registry, serviceName);
 *   }
 *
 *   @Saga('createOrder')
 *   async run(input: OrderInput): Promise<SagaResult<OrderResult>> {
 *     const reservation = await this.reserveInventory(input);
 *     const payment = await this.processPayment(input, reservation);
 *     return { orderId: payment.orderId };
 *   }
 *
 *   @SagaStep()
 *   private async reserveInventory(input: OrderInput) { ... }
 *
 *   private async compensateReserveInventory(input: OrderInput) { ... }
 * }
 * ```
 */

// Re-export DBOS SDK for convenience
export { DBOS, ConfiguredInstance } from "@dbos-inc/dbos-sdk";

// ============================================================================
// CORE TYPES & ERRORS
// ============================================================================

export {
  // Types
  type OperationError,
  type OperationResult,
  type RetryPolicy,
  type WorkflowStatus,
  type WorkflowResult,
  type WorkflowStatusSimple,
  type WorkflowHandle,
  type WorkflowAdminAuthorizationContext,
  type WorkflowExecutionContext,
  type WorkflowQueueRateLimitOptions,
  type WorkflowQueueConflictResolution,
  type WorkflowQueueConfig,
  type WorkflowQueueEnqueueOptions,
  type WorkflowDuplicationPolicy,
  type WorkflowStartOptions,
  type SagaStatus,
  type SagaResult,
  type StepResult,
  type SagaStepConfig,
  type SagaStepMetadata,
  type ExecutedStep,
  type SagaExecutorConfig,
  type OnCompensationExhausted,
  type WorkflowModuleConfig,
  type DBOSWorkflowHandle,
  type DBOSWorkflowStatus,
  // Constants
  DEFAULT_RETRY_POLICY,
  DEFAULT_COMPENSATION_RETRY,
} from "./core/types.js";

export {
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
  DEFAULT_STEP_TIMEOUT_MS,
} from "./core/errors.js";

// ============================================================================
// IDEMPOTENCY
// ============================================================================

export {
  buildIdempotencyKey,
  hashContent,
  type IdempotencyContext,
  type ClientIdempotencyContext,
  type WorkflowIdempotencyContext,
  type ContentIdempotencyContext,
} from "./idempotency/index.js";

// ============================================================================
// STEP EXECUTION
// ============================================================================

export {
  runStep,
  type StepOptions,
  // Step context for abort signal
  getSignal,
  stepContextStorage,
  type StepExecutionContext,
} from "./step/index.js";

// ============================================================================
// TRANSACTIONAL STEP EXECUTION
// ============================================================================

export {
  createTransactionalStep,
  TRANSACTIONAL_STEP_METADATA_KEY,
  TransactionalStepConfigurationError,
  PostgresDbosTransactionBridge,
  PostgresDataSource,
  IsolationLevel,
  runTransactionalStep,
  type TransactionalStepMetadata,
  type DbosTransactionBridge,
  type RunTransactionalStepOptions,
  type TransactionManagerLike,
  type PostgresTransactionOptions,
  type TransactionSql,
} from "./transaction/index.js";

// ============================================================================
// WORKFLOW
// ============================================================================

export {
  // Decorators
  Workflow,
  WorkflowStep,
  SideEffectStep,
  ChildWorkflowStep,
  WORKFLOW_METADATA_KEY,
  WORKFLOW_STEP_METADATA_KEY,
  SIDE_EFFECT_STEP_METADATA_KEY,
  CHILD_WORKFLOW_STEP_METADATA_KEY,
  type WorkflowMetadata,
  type WorkflowStepMetadata,
  type SideEffectStepMetadata,
  type ChildWorkflowStepMetadata,
  // Base class
  BaseWorkflow,
  type WorkflowDescriptor,
  type WorkflowRegistrar,
} from "./workflow/index.js";

// ============================================================================
// SAGA
// ============================================================================

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
  // Base class
  BaseSaga,
} from "./saga/index.js";

// ============================================================================
// REGISTRY
// ============================================================================

export { WorkflowRegistry, WORKFLOW_REGISTRY, WORKFLOW_CONFIG } from "./registry/index.js";

// ============================================================================
// NESTJS MODULE
// ============================================================================

export { WorkflowModule } from "./module/index.js";

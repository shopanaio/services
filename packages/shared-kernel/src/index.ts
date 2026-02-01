export { Kernel } from "./Kernel";
export { NestLogger } from "./NestLogger";
export { BootstrapLogger } from "./BootstrapLogger";

// Re-export DBOS from @shopana/dbos
export { DBOS, ConfiguredInstance } from "@shopana/dbos";

export {
  TransactionManager,
  type TransactionalDatabase,
  Transactional,
  ReadOnly,
} from "./TransactionManager";
export {
  ActionRegistry,
  type ActionHandler,
  type ActionMetadata,
} from "./broker/ActionRegistry";
export {
  ServiceBroker,
  type ServiceBrokerOptions,
} from "./broker/ServiceBroker";
export { BrokerActions } from "./broker/BrokerActions";
export { EventHandlers } from "./broker/EventHandlers";
export { BrokerWorkflows } from "./broker/BrokerWorkflows";
export {
  BrokerCoreModule,
  type BrokerCoreModuleOptions,
} from "./broker/BrokerCoreModule";
export { BrokerModule, type BrokerFeatureOptions } from "./broker/BrokerModule";
export {
  SERVICE_BROKER,
  SERVICE_NAME,
  InjectBroker,
  getBrokerToken,
} from "./broker/tokens";

// Workflow module - re-export from @shopana/dbos
export {
  WorkflowModule,
  WorkflowRegistry,
  WORKFLOW_CONFIG,
  WORKFLOW_REGISTRY,
} from "@shopana/dbos";

// Workflow types from @shopana/dbos
export type {
  WorkflowHandle,
  WorkflowStatusSimple,
  WorkflowStartOptions,
  WorkflowModuleConfig,
  DBOSWorkflowHandle,
  DBOSWorkflowStatus,
  WorkflowResult,
  WorkflowStatus,
} from "@shopana/dbos";

// Idempotency from @shopana/dbos
export {
  buildIdempotencyKey,
  hashContent,
  type IdempotencyContext,
  type ClientIdempotencyContext,
  type WorkflowIdempotencyContext,
  type ContentIdempotencyContext,
} from "@shopana/dbos";

// Kernel types
export {
  type Logger,
  type BaseKernelServices,
  type KernelServices,
  type TransactionScript,
  type ScriptContext,
  type ScriptResult,
  KernelError,
  consoleLogger,
} from "./types";

// Decorators - broker-specific decorators stay here
export {
  ZodSchema,
  ValidationError,
  Policy,
  AuthorizationError,
  Action,
  ACTION_METADATA_KEY,
  EventHandler,
  EVENT_HANDLER_METADATA_KEY,
  type UserError,
  type Authorizable,
  type AuthProvider,
  type AuthorizeParams,
  type AuthorizeOptions,
  type ActionDecoratorMetadata,
  type EventHandlerMetadata,
} from "./decorators";

// Workflow decorators and base class from @shopana/dbos
export {
  Workflow,
  WorkflowStep,
  WORKFLOW_METADATA_KEY,
  WORKFLOW_STEP_METADATA_KEY,
  type WorkflowMetadata,
  type WorkflowStepMetadata,
  // Base class (broker-independent)
  BaseWorkflow,
  type WorkflowDescriptor,
  type WorkflowRegistrar,
} from "@shopana/dbos";

// Resource discovery types
export {
  type ResourceAction,
  type ResourceActionDefinition,
  type ResourceDefinition,
  type ServiceResourceDeclaration,
  type GetResourcesParams,
  type GetResourcesResult,
  type AggregatedResources,
  type FlatResourceDefinition,
} from "./resources/types";

// Database module
export {
  DatabaseModule,
  DATABASE_CLIENT,
  InjectDatabaseClient,
  type DatabaseModuleOptions,
  type DatabaseClient,
} from "./database";

// Saga Engine - re-export from @shopana/dbos + BrokerSaga
export {
  Saga,
  SagaStep,
  SAGA_STEP_KEY,
  SAGA_DEFINITION_KEY,
  BaseSaga,
  BrokerSaga,
  SagaExecutionContext,
  sagaContextStorage,
  getSagaContext,
  DEFAULT_COMPENSATION_RETRY,
  DEFAULT_STEP_TIMEOUT_MS,
  // Error classes (unified)
  SagaError,
  OperationException,
  RetryableError,
  FatalError,
  StepExecutionError,
  StepTimeoutError,
  // Helpers
  isRetryableError,
  toOperationError,
  withTimeout,
  // Backward compatibility
  toErrorInfo,
} from "./saga/index";

export type {
  // Unified contracts
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
  // Backward compatibility
  ErrorInfo,
} from "./saga/index";

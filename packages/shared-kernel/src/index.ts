export { Kernel } from "./Kernel";
export { NestLogger } from "./NestLogger";
export { DBOS } from "@dbos-inc/dbos-sdk";
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
  type EmitParams,
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
export { WorkflowModule } from "./workflow/WorkflowModule";
export { WorkflowRegistry } from "./workflow/WorkflowRegistry";
export {
  WORKFLOW_CONFIG,
  WORKFLOW_REGISTRY,
} from "./workflow/tokens";
export type {
  WorkflowHandle,
  WorkflowStatusSimple,
  WorkflowStartOptions,
  WorkflowModuleConfig,
  DBOSWorkflowHandle,
  DBOSWorkflowStatus,
} from "./workflow/types";
export {
  buildIdempotencyKey,
  hashContent,
  type IdempotencyContext,
  type ClientIdempotencyContext,
  type WorkflowIdempotencyContext,
  type ContentIdempotencyContext,
} from "./workflow/idempotency";
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
export {
  ZodSchema,
  ValidationError,
  Policy,
  AuthorizationError,
  Action,
  ACTION_METADATA_KEY,
  EventHandler,
  EVENT_HANDLER_METADATA_KEY,
  Workflow,
  WORKFLOW_METADATA_KEY,
  WorkflowStep,
  WORKFLOW_STEP_METADATA_KEY,
  type UserError,
  type Authorizable,
  type AuthProvider,
  type AuthorizeParams,
  type AuthorizeOptions,
  type ActionDecoratorMetadata,
  type EventHandlerMetadata,
  type WorkflowMetadata,
  type WorkflowStepMetadata,
} from "./decorators";

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

// Saga Engine
export {
  Saga,
  SagaStep,
  SAGA_STEP_KEY,
  SAGA_DEFINITION_KEY,
  BrokerSaga,
  SagaExecutionContext,
  sagaContextStorage,
  getSagaContext,
  DEFAULT_COMPENSATION_RETRY,
  DEFAULT_STEP_TIMEOUT_MS,
  SagaError,
  RetryableError,
  FatalError,
  StepExecutionError,
  StepTimeoutError,
  isRetryableError,
  toErrorInfo,
  withTimeout,
} from "./saga/index";

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
} from "./saga/index";

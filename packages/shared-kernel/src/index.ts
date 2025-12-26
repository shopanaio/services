export { Kernel } from "./Kernel";
export { NestLogger } from "./NestLogger";
export {
  TransactionManager,
  type TransactionalDatabase,
  Transactional,
  ReadOnly,
} from "./TransactionManager";
export { ActionRegistry, type ActionHandler } from "./broker/ActionRegistry";
export {
  ServiceBroker,
  type ServiceBrokerOptions,
} from "./broker/ServiceBroker";
export { BrokerActions } from "./broker/BrokerActions";
export {
  BrokerCoreModule,
  type BrokerCoreModuleOptions,
} from "./broker/BrokerCoreModule";
export { BrokerModule, type BrokerFeatureOptions } from "./broker/BrokerModule";
export {
  SERVICE_BROKER,
  SERVICE_NAME,
  BROKER_AMQP,
  InjectBroker,
  getBrokerToken,
} from "./broker/tokens";
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
  type UserError,
  type Authorizable,
  type AuthorizeParams,
  type AuthorizeOptions,
  type ActionMetadata,
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

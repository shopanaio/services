// Re-export DBOS decorators for convenience
export { DBOS } from '@dbos-inc/dbos-sdk';

// Core workflow classes
export { BaseWorkflow } from './BaseWorkflow.js';
export { WorkflowRegistry } from './WorkflowRegistry.js';
export { WorkflowModule, WORKFLOW_REGISTRY, WORKFLOW_CONFIG } from './WorkflowModule.js';

// Types
export type {
  WorkflowHandle,
  WorkflowStatus,
  WorkflowServices,
  WorkflowStartOptions,
  WorkflowModuleConfig,
} from './types.js';

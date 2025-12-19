import type { ServiceBroker, Logger } from '@shopana/shared-kernel';

/**
 * Workflow status values
 */
export type WorkflowStatus = 'PENDING' | 'SUCCESS' | 'ERROR' | 'RETRIES_EXCEEDED' | 'CANCELLED';

/**
 * Handle for monitoring and controlling a running workflow
 */
export interface WorkflowHandle<TResult> {
  workflowId: string;
  getResult(): Promise<TResult>;
  getStatus(): Promise<WorkflowStatus>;
}

/**
 * Base services available to all workflows
 */
export interface WorkflowServices {
  broker: ServiceBroker;
  logger: Logger;
}

/**
 * Options for starting a workflow
 */
export interface WorkflowStartOptions {
  /** Custom workflow ID for idempotency */
  workflowId?: string;
}

/**
 * Configuration for DBOS workflow module
 */
export interface WorkflowModuleConfig {
  /** PostgreSQL connection string for DBOS system tables */
  databaseUrl: string;
  /** Application name for DBOS (used in system tables) */
  appName?: string;
}

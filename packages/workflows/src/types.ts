import type {
  WorkflowHandle as DBOSWorkflowHandle,
  WorkflowStatus as DBOSWorkflowStatus,
} from "@dbos-inc/dbos-sdk";

// Re-export DBOS types
export type { DBOSWorkflowHandle, DBOSWorkflowStatus };

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

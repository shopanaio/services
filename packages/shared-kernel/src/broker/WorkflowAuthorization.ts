import type {
  WorkflowExecutionContext,
  WorkflowStartOptions,
} from "@shopana/dbos";
import type { AdminAuthorizationContext } from "@shopana/rbac";

/**
 * Structural authorization subset of shared-context's
 * ResolvedAdminAccessContext. Keeping the contract structural avoids a
 * shared-context <-> shared-kernel package cycle.
 */
export type BrokerAdminContext = AdminAuthorizationContext;

/**
 * Broker-only options for starting DBOS workflows.
 *
 * adminContext is used only for the root preflight and is stripped before the
 * DBOS call. workflowContext is the minimal durable context explicitly
 * forwarded by a parent workflow.
 */
export interface BrokerWorkflowStartOptions extends WorkflowStartOptions {
  readonly adminContext?: BrokerAdminContext;
  readonly workflowContext?: WorkflowExecutionContext;
}

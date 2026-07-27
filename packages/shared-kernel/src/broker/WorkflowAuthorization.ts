import type {
  WorkflowExecutionContext,
  WorkflowStartOptions,
} from "@shopana/dbos";
import type { Action, ResourceName } from "@shopana/rbac";

/**
 * Structural authorization subset of shared-context's
 * ResolvedAdminAccessContext. Keeping the contract structural avoids a
 * shared-context <-> shared-kernel package cycle.
 */
export interface BrokerAdminContext {
  readonly user: {
    readonly id: string;
  };
  readonly organizationId: string | null;
  readonly store: {
    readonly id: string;
    readonly organizationId: string;
  } | null;
  readonly permissions: readonly {
    readonly domain: "org" | `store:${string}`;
    readonly resource: ResourceName;
    readonly action: Action;
  }[];
  readonly isSiteAdmin: boolean;
  readonly isOrganizationOwner: boolean;
}

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

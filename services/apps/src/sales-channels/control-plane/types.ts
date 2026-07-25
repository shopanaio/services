import type { SalesChannelOperationType } from "../../control-plane/types.js";

export interface SalesChannelLifecycleWorkflowInput {
  readonly connectionId: string;
  readonly operationId: string;
  readonly type: SalesChannelOperationType;
  readonly configuration?: Readonly<Record<string, unknown>>;
  readonly displayName?: string;
  readonly expectedConfigurationVersion?: number;
}

export interface SalesChannelLifecycleAccepted {
  readonly connectionId: string;
  readonly operationId: string;
  readonly workflowId: string;
  readonly status: string;
  readonly duplicate: boolean;
}

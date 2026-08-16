import type {
  CustomerExternalReferenceSyncOperation,
  CustomerExternalReferenceSyncOperationResult,
} from "@shopana/broker-types";

export interface CustomerExternalReferenceWorkflowContext {
  organizationId: string;
  storeId: string;
  appCode: string;
  installationId: string;
  requestId: string;
}

export interface CustomerExternalReferenceSyncWorkflowInput {
  context: CustomerExternalReferenceWorkflowContext;
  operations: readonly CustomerExternalReferenceSyncOperation[];
}

export interface CustomerExternalReferenceSyncWorkflowResult {
  results: CustomerExternalReferenceSyncOperationResult[];
  appliedCount: number;
  failedCount: number;
}

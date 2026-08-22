import type { DurableWorkflowContext } from "@shopana/shared-kernel";
export interface CollectionWorkflowContext extends DurableWorkflowContext {
  readonly storeId: string;
  readonly organizationId: string;
  readonly requestId: string;
  readonly userId?: string;
  readonly locale: string;
  readonly currency: string;
  readonly defaultLocale: string;
  readonly defaultCurrency: string;
  readonly locales: readonly string[];
  readonly currencies: readonly string[];
}
export interface CollectionProductSyncWorkflowInput {
  readonly operationId: string;
  readonly collectionId: string;
  readonly context: CollectionWorkflowContext;
}

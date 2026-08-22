import type { PreviewCollectionRulesParams } from "@shopana/broker-types";
export interface CollectionRulesPreviewWorkflowInput {
  readonly organizationId: string;
  readonly storeId: string;
  readonly params: PreviewCollectionRulesParams;
}

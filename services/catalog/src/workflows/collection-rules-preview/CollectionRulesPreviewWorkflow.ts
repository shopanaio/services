import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  InjectBroker,
  Policy,
  RetryableError,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import {
  ListingCollectionActions,
  type PreviewCollectionRulesParams,
  type PreviewCollectionRulesResult,
} from "@shopana/broker-types";
import type { CollectionRulesPreviewWorkflowInput } from "./dto/index.js";
@Injectable()
export class CollectionRulesPreviewWorkflow extends BrokerWorkflows<
  CollectionRulesPreviewWorkflowInput,
  PreviewCollectionRulesResult
> {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("collectionRulesPreview")
  @Policy<CollectionRulesPreviewWorkflowInput>({
    resource: "store.data",
    action: "read",
    organizationId: (_self, input) => input.organizationId,
    domain: (_self, input) => `store:${input.storeId}`,
  })
  async run(input: CollectionRulesPreviewWorkflowInput): Promise<PreviewCollectionRulesResult> {
    try {
      return await this.preview(input.params);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        code: /timeout/i.test(message)
          ? "COLLECTION_PREVIEW_TIMEOUT"
          : "COLLECTION_PREVIEW_UNAVAILABLE",
        message: "Collection rule preview is temporarily unavailable",
        retryable: true,
      };
    }
  }

  @WorkflowStep({
    name: "previewCollectionRules",
    timeoutMs: 5_000,
    retry: { maxAttempts: 3, intervalSeconds: 1, backoffRate: 2 },
  })
  private async preview(
    params: PreviewCollectionRulesParams,
  ): Promise<PreviewCollectionRulesResult> {
    const result = await this.broker.call<
      PreviewCollectionRulesResult,
      PreviewCollectionRulesParams
    >(ListingCollectionActions.previewRules, params);
    if (!result.ok && result.retryable)
      throw new RetryableError(`${result.code}: ${result.message}`);
    return result;
  }
}

export interface CollectionProductSyncWorkflowInput {
  readonly operationId: string;
  readonly collectionId: string;
  readonly context: CollectionWorkflowContext;
}

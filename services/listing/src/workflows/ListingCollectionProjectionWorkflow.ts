import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  FatalError,
  InjectBroker,
  RetryableError,
  ServiceBroker,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import {
  CatalogCollectionActions,
  COLLECTION_LISTING_CONTRACT_VERSION,
  type CatalogCollectionSnapshot,
  type GetCollectionListingSnapshotParams,
  type GetCollectionListingSnapshotResult,
} from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";
import {
  ListingApplyCollectionProjectionScript,
  ListingCollectionProjectionError,
  type ListingApplyCollectionProjectionResult,
} from "../scripts/ListingApplyCollectionProjectionScript.js";

export interface ListingCollectionProjectionWorkflowInput {
  organizationId: string;
  storeId: string;
  collectionId: string;
  eventListingRevision: number;
  eventSequence: number;
  requestId: string;
}

@Injectable()
export class ListingCollectionProjectionWorkflow extends BrokerWorkflows<
  ListingCollectionProjectionWorkflowInput,
  ListingApplyCollectionProjectionResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("syncCollectionProjection")
  async run(
    input: ListingCollectionProjectionWorkflowInput,
  ): Promise<ListingApplyCollectionProjectionResult> {
    const snapshot = await this.hydrate(input);
    return this.apply({ input, snapshot });
  }

  @WorkflowStep({
    name: "hydrateCatalogCollectionProjection",
    timeoutMs: 30_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private async hydrate(
    input: ListingCollectionProjectionWorkflowInput,
  ): Promise<CatalogCollectionSnapshot> {
    const result = await this.broker.call<
      GetCollectionListingSnapshotResult,
      GetCollectionListingSnapshotParams
    >(CatalogCollectionActions.getListingSnapshot, {
      contractVersion: COLLECTION_LISTING_CONTRACT_VERSION,
      storeId: input.storeId,
      collectionId: input.collectionId,
    });
    if (!result.ok) {
      if (result.retryable) {
        throw new RetryableError(`${result.code}: ${result.message}`);
      }
      throw new FatalError(result.message, undefined, result.code);
    }
    return result.snapshot;
  }

  @WorkflowStep({
    name: "applyCollectionProjection",
    timeoutMs: 30_000,
    retry: { maxAttempts: 5, intervalSeconds: 1, backoffRate: 2 },
  })
  private async apply(input: {
    input: ListingCollectionProjectionWorkflowInput;
    snapshot: CatalogCollectionSnapshot;
  }): Promise<ListingApplyCollectionProjectionResult> {
    try {
      return await Kernel.getInstance().runScript(
        ListingApplyCollectionProjectionScript,
        {
          snapshot: input.snapshot,
          eventListingRevision: input.input.eventListingRevision,
          eventSequence: input.input.eventSequence,
        },
        {
          storeId: input.input.storeId,
          organizationId: input.input.organizationId,
          requestId: input.input.requestId,
        },
      );
    } catch (error) {
      if (error instanceof ListingCollectionProjectionError) {
        if (error.retryable) {
          throw new RetryableError(`${error.code}: ${error.message}`);
        }
        throw new FatalError(error.message, error, error.code);
      }
      throw error;
    }
  }
}

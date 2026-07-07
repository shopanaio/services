import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  buildIdempotencyKey,
  InjectBroker,
  ServiceBroker,
  type IdempotencyContext,
  Workflow,
} from "@shopana/shared-kernel";
import type { Listing } from "@shopana/broker-types";

export type ListingIndexProductUpdateBatchItem = {
  eventId: string;
  productId: string;
  sourceSequence: number;
  meta: Listing.ListingUpdateMeta;
};

export type ListingIndexProductUpdateBatchInput = {
  type: "batchProductUpdate";
  organizationId: string;
  storeId: string;
  // Coalesced productUpdated events, one latest event per product.
  items: ListingIndexProductUpdateBatchItem[];
  effectiveIdempotencyKey: string;
};

export type ListingIndexProductUpdateBatchResult = {
  operationId: string;
  storeId: string;
  status: "accepted";
  accepted: number;
  processedAt: string;
};

export function buildListingProductEventBatchWorkflowIdempotencyContext(input: {
  organizationId: string;
  storeId: string;
  eventsHash: string;
}): IdempotencyContext {
  return {
    source: "content",
    organizationId: input.organizationId,
    resourceId: `store:${input.storeId}:product-event-batch`,
    operation: "listing.batchProductIndex",
    contentHash: input.eventsHash,
  };
}

export function buildListingProductEventBatchWorkflowId(input: {
  idempotencyCtx: IdempotencyContext;
}): string {
  return buildIdempotencyKey("listing.batchProductIndex", input.idempotencyCtx);
}

export function buildListingProductEventBatchQueuePartitionKey(input: {
  storeId: string;
  eventsHash: string;
}): string {
  // Batch product updates use a store-scoped partition instead of item-scoped
  // partitions because a single workflow can cover many products.
  return [input.storeId, "product-event-batch", input.eventsHash].join(":");
}

@Injectable()
export class ListingBatchProductIndexWorkflow extends BrokerWorkflows<
  ListingIndexProductUpdateBatchInput,
  ListingIndexProductUpdateBatchResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("batchProductIndex")
  async run(
    input: ListingIndexProductUpdateBatchInput
  ): Promise<ListingIndexProductUpdateBatchResult> {
    // Placeholder workflow: enqueue path is wired, but batch indexing steps are
    // intentionally not implemented in this change.
    this.logger.warn(
      {
        storeId: input.storeId,
        itemCount: input.items.length,
      },
      "Listing batch product index workflow accepted input but is not implemented yet"
    );

    return {
      operationId: input.effectiveIdempotencyKey,
      storeId: input.storeId,
      status: "accepted",
      accepted: input.items.length,
      processedAt: new Date().toISOString(),
    };
  }
}

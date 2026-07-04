import { Injectable } from "@nestjs/common";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { Listing } from "@shopana/broker-types";
import {
  buildAcceptedListingUpdateResult,
  buildListingIndexEffectiveIdempotencyKey,
  buildListingIndexPayloadHash,
  buildListingIndexQueuePartitionKey,
  buildListingIndexWorkflowIdempotencyContext,
  buildListingIndexWorkflowName,
  isDuplicateWorkflowStartError,
  LISTING_INDEX_ACTIONS_QUEUE,
  LISTING_INDEX_WORKFLOW_TIMEOUT_MS,
} from "./listingIndexActionHelpers.js";

type ListingIndexActionInput =
  | {
      type: "syncSellableItem";
      params: Listing.SyncSellableItemParams;
    }
  | {
      type: "deleteSellableItem";
      params: Listing.DeleteSellableItemParams;
    };

@Injectable()
export class ListingBrokerActions extends BrokerActions {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Action("syncSellableItem")
  async syncSellableItem(
    params: Listing.SyncSellableItemParams
  ): Promise<Listing.SyncSellableItemResult> {
    await this.enqueueIndexAction({
      type: "syncSellableItem",
      params,
    });

    return buildAcceptedListingUpdateResult({
      meta: params.meta,
      projectId: params.projectId,
      itemRef: params.item,
      sourceRevision: params.item.sourceRevision,
    });
  }

  @Action("deleteSellableItem")
  async deleteSellableItem(
    params: Listing.DeleteSellableItemParams
  ): Promise<Listing.DeleteSellableItemResult> {
    await this.enqueueIndexAction({
      type: "deleteSellableItem",
      params,
    });

    return buildAcceptedListingUpdateResult({
      meta: params.meta,
      projectId: params.projectId,
      itemRef: params.itemRef,
      sourceRevision: params.sourceRevision,
    });
  }

  @Action("syncSellableItems")
  async syncSellableItems(
    params: Listing.SyncSellableItemsParams
  ): Promise<Listing.SyncSellableItemsResult> {
    this.assertNoDuplicateBatchItems(params.items);

    const enqueueResults = await Promise.allSettled(
      params.items.map(async (item) => {
        await this.enqueueIndexAction({
          type: "syncSellableItem",
          params: {
            meta: params.meta,
            projectId: params.projectId,
            item,
          },
        });

        return buildAcceptedListingUpdateResult({
          meta: params.meta,
          projectId: params.projectId,
          itemRef: item,
          sourceRevision: item.sourceRevision,
        });
      })
    );

    const results: Listing.ListingUpdateResult[] = [];
    for (const [index, result] of enqueueResults.entries()) {
      if (result.status === "fulfilled") {
        results.push(result.value);
        continue;
      }

      const item = params.items[index];
      this.logger.error(
        {
          error: result.reason,
          projectId: params.projectId,
          entityType: item?.entityType,
          itemId: item?.id,
          operationId: params.meta.operationId,
        },
        "Failed to enqueue listing index batch item"
      );
    }

    return {
      operationId: params.meta.operationId,
      status: results.length === params.items.length ? "completed" : "partial",
      results,
    };
  }

  private async enqueueIndexAction(
    input: ListingIndexActionInput
  ): Promise<void> {
    const itemRef =
      input.type === "syncSellableItem"
        ? input.params.item
        : input.params.itemRef;
    const params = input.params;
    const sourceRevision =
      input.type === "syncSellableItem"
        ? input.params.item.sourceRevision
        : input.params.sourceRevision;
    const effectiveIdempotencyKey = buildListingIndexEffectiveIdempotencyKey({
      rawIdempotencyKey: params.meta.idempotencyKey,
      projectId: params.projectId,
      entityType: itemRef.entityType,
      itemId: itemRef.id,
      actionType: input.type,
      sourceRevision,
    });
    const payloadHash = buildListingIndexPayloadHash(input);
    const idempotencyCtx = buildListingIndexWorkflowIdempotencyContext({
      projectId: params.projectId,
      entityType: itemRef.entityType,
      itemId: itemRef.id,
      actionType: input.type,
      effectiveIdempotencyKey,
    });

    try {
      await this.broker.startWorkflow(
        buildListingIndexWorkflowName(input.type),
        {
          ...input,
          effectiveIdempotencyKey,
          payloadHash,
        },
        idempotencyCtx,
        {
          queueName: LISTING_INDEX_ACTIONS_QUEUE,
          enqueueOptions: {
            queuePartitionKey: buildListingIndexQueuePartitionKey({
              projectId: params.projectId,
              entityType: itemRef.entityType,
              itemId: itemRef.id,
            }),
          },
          timeoutMS: LISTING_INDEX_WORKFLOW_TIMEOUT_MS,
        }
      );
    } catch (error) {
      if (isDuplicateWorkflowStartError(error)) {
        return;
      }

      throw error;
    }
  }

  private assertNoDuplicateBatchItems(
    items: readonly Listing.ListingSellableItemSnapshot[]
  ): void {
    const seen = new Set<string>();

    for (const item of items) {
      const key = `${item.entityType}:${item.id}`;
      if (seen.has(key)) {
        throw new Error(`Duplicate listing sync batch item: ${key}`);
      }
      seen.add(key);
    }
  }
}

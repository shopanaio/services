import { Injectable } from "@nestjs/common";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { Listing } from "@shopana/broker-types";

type ListingIndexActionInput =
  | {
      type: "syncSellableItem";
      params: Listing.SyncSellableItemParams;
    }
  | {
      type: "deleteSellableItem";
      params: Listing.DeleteSellableItemParams;
    };

const NOT_IMPLEMENTED_WARNING: Listing.ListingUpdateWarning = {
  code: "LISTING_INDEX_UPDATE_NOT_IMPLEMENTED",
  message: "Listing index update handler is registered but not implemented yet.",
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

    return this.acceptedResult({
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

    return this.acceptedResult({
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
    await Promise.all(
      params.items.map((item) =>
        this.enqueueIndexAction({
          type: "syncSellableItem",
          params: {
            meta: params.meta,
            projectId: params.projectId,
            item,
          },
        })
      )
    );

    return {
      operationId: params.meta.operationId,
      status: "completed",
      results: params.items.map((item) =>
        this.acceptedResult({
          meta: params.meta,
          projectId: params.projectId,
          itemRef: item,
          sourceRevision: item.sourceRevision,
        })
      ),
    };
  }

  private acceptedResult(params: {
    meta: Listing.ListingUpdateMeta;
    projectId: string;
    itemRef: Listing.ListingSellableItemRef;
    sourceRevision: number;
  }): Listing.ListingUpdateResult {
    return {
      operationId: params.meta.operationId,
      projectId: params.projectId,
      itemRef: {
        entityType: params.itemRef.entityType,
        id: params.itemRef.id,
      },
      sourceRevision: params.sourceRevision,
      status: "accepted",
      processedAt: new Date().toISOString(),
      warnings: [{ ...NOT_IMPLEMENTED_WARNING }],
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

    await this.broker.startWorkflow(
      "listing.indexAction",
      input,
      {
        source: "content",
        tenantId: params.projectId,
        resourceId: `${itemRef.entityType}:${itemRef.id}`,
        operation: `listing.${input.type}`,
        contentHash: params.meta.idempotencyKey,
      },
      {
        queueName: "listing_index_actions",
        enqueueOptions: {
          queuePartitionKey: [
            params.projectId,
            itemRef.entityType,
            itemRef.id,
          ].join(":"),
        },
      }
    );
  }
}

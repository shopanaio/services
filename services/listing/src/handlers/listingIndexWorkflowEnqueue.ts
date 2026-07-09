import type { ServiceBroker } from "@shopana/shared-kernel";
import type { Listing } from "@shopana/broker-types";
import {
  buildListingIndexEffectiveIdempotencyKey,
  buildListingIndexQueuePartitionKey,
  buildListingIndexWorkflowId,
  buildListingIndexWorkflowIdempotencyContext,
  buildListingIndexWorkflowName,
  isDuplicateWorkflowStartError,
  LISTING_INDEX_ACTIONS_QUEUE,
  LISTING_INDEX_WORKFLOW_TIMEOUT_MS,
} from "../workflows/listingIndexWorkflowHelpers.js";
import type { ListingIndexQueuedSyncAction } from "../scripts/listingIndexActionTypes.js";

interface WorkflowEnqueueLogger {
  error(obj: unknown, message: string): void;
}

export async function enqueueListingSyncItemIndexWorkflow(input: {
  broker: ServiceBroker;
  logger: WorkflowEnqueueLogger;
  organizationId: string;
  storeId: string;
  itemRef: Listing.ListingSellableItemRef;
  eventSequence: number;
  meta: Listing.ListingUpdateMeta;
}): Promise<void> {
  if (process.env.E2E_DISABLE_LISTING_EVENT_INDEXING === "true") {
    return;
  }

  const actionType = "syncSellableItem";
  const action: ListingIndexQueuedSyncAction = {
    type: actionType,
    params: {
      meta: input.meta,
      storeId: input.storeId,
      itemRef: input.itemRef,
      eventSequence: input.eventSequence,
    },
    organizationId: input.organizationId,
    effectiveIdempotencyKey: buildListingIndexEffectiveIdempotencyKey({
      rawIdempotencyKey: input.meta.idempotencyKey,
      storeId: input.storeId,
      entityType: input.itemRef.entityType,
      itemId: input.itemRef.id,
      actionType,
      eventSequence: input.eventSequence,
    }),
  };
  const idempotencyCtx = buildListingIndexWorkflowIdempotencyContext({
    organizationId: input.organizationId,
    storeId: input.storeId,
    entityType: input.itemRef.entityType,
    itemId: input.itemRef.id,
    actionType,
    effectiveIdempotencyKey: action.effectiveIdempotencyKey,
  });
  const workflowName = buildListingIndexWorkflowName(actionType);
  const workflowId = buildListingIndexWorkflowId({
    workflowName,
    idempotencyCtx,
  });

  try {
    await input.broker.startWorkflow(workflowName, action, idempotencyCtx, {
      queueName: LISTING_INDEX_ACTIONS_QUEUE,
      enqueueOptions: {
        queuePartitionKey: buildListingIndexQueuePartitionKey({
          storeId: input.storeId,
          entityType: input.itemRef.entityType,
          itemId: input.itemRef.id,
        }),
      },
      timeoutMS: LISTING_INDEX_WORKFLOW_TIMEOUT_MS,
      workflowId,
    });
  } catch (error) {
    if (isDuplicateWorkflowStartError(error, workflowId)) {
      return;
    }

    input.logger.error(
      {
        error,
        workflowName,
        workflowId,
        storeId: input.storeId,
        itemRef: input.itemRef,
        eventSequence: input.eventSequence,
      },
      "Failed to start listing index workflow"
    );
    throw error;
  }
}

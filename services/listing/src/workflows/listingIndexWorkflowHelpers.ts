import {
  buildIdempotencyKey,
  hashContent,
  type IdempotencyContext,
} from "@shopana/shared-kernel";
import type { Listing } from "@shopana/broker-types";

export const LISTING_INDEX_ACTIONS_QUEUE = "listing_index_actions" as const;
export const LISTING_INDEX_WORKFLOW_TIMEOUT_MS = 120_000;

export type ListingIndexActionType =
  | "syncSellableItem"
  | "deleteSellableItem";

export type ListingIndexWorkflowName =
  | "listing.syncSellableItemIndex"
  | "listing.deleteSellableItemIndex";

export function buildListingIndexEffectiveIdempotencyKey(input: {
  rawIdempotencyKey: string;
  storeId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
  actionType: ListingIndexActionType;
  sourceSequence: number;
}): string {
  return hashContent({
    v: 1,
    storeId: input.storeId,
    entityType: input.entityType,
    itemId: input.itemId,
    actionType: input.actionType,
    sourceSequence: input.sourceSequence,
    rawIdempotencyKey: input.rawIdempotencyKey,
  });
}

export function buildListingIndexWorkflowIdempotencyContext(input: {
  storeId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
  actionType: ListingIndexActionType;
  effectiveIdempotencyKey: string;
}): IdempotencyContext {
  return {
    source: "content",
    storeId: input.storeId,
    resourceId: `${input.entityType}:${input.itemId}`,
    operation: `listing.${input.actionType}`,
    contentHash: input.effectiveIdempotencyKey,
  };
}

export function buildListingIndexWorkflowName(
  actionType: ListingIndexActionType
): ListingIndexWorkflowName {
  return actionType === "syncSellableItem"
    ? "listing.syncSellableItemIndex"
    : "listing.deleteSellableItemIndex";
}

export function buildListingIndexWorkflowId(input: {
  workflowName: ListingIndexWorkflowName;
  idempotencyCtx: IdempotencyContext;
}): string {
  return buildIdempotencyKey(input.workflowName, input.idempotencyCtx);
}

export function buildListingIndexQueuePartitionKey(input: {
  storeId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
}): string {
  return [input.storeId, input.entityType, input.itemId].join(":");
}

export function buildListingIndexPayloadHash(input:
  | {
      type: "syncSellableItem";
      params: Listing.SyncSellableItemParams;
    }
  | {
      type: "deleteSellableItem";
      params: Listing.DeleteSellableItemParams;
    }): string {
  if (input.type === "syncSellableItem") {
    return hashContent({
      v: 1,
      actionType: input.type,
      storeId: input.params.storeId,
      sourceSequence: input.params.sourceSequence,
      item: input.params.item,
    });
  }

  return hashContent({
    v: 1,
    actionType: input.type,
    storeId: input.params.storeId,
    itemRef: input.params.itemRef,
    sourceSequence: input.params.sourceSequence,
    deletedAt: input.params.deletedAt,
    reason: input.params.reason,
  });
}

export function buildAcceptedListingUpdateResult(input: {
  meta: Listing.ListingUpdateMeta;
  storeId: string;
  itemRef: Listing.ListingSellableItemRef;
  sourceSequence: number;
}): Listing.ListingUpdateResult {
  return {
    operationId: input.meta.operationId,
    storeId: input.storeId,
    itemRef: {
      entityType: input.itemRef.entityType,
      id: input.itemRef.id,
    },
    sourceSequence: input.sourceSequence,
    status: "accepted",
    processedAt: new Date().toISOString(),
  };
}

export function isDuplicateWorkflowStartError(
  error: unknown,
  expectedWorkflowId: string
): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const text = `${error.name} ${error.message}`.toLowerCase();
  const mentionsWorkflow =
    text.includes("workflow") || text.includes(expectedWorkflowId.toLowerCase());
  const duplicateConflict =
    text.includes("duplicate") ||
    text.includes("already exists") ||
    text.includes("already started");

  return mentionsWorkflow && duplicateConflict;
}

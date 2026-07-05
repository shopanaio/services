import type { Listing } from "@shopana/broker-types";
import {
  buildListingIndexEffectiveIdempotencyKey,
  buildListingIndexPayloadHash,
} from "../workflows/listingIndexWorkflowHelpers.js";
import { BaseScript } from "../kernel/BaseScript.js";
import { ListingBuildSyncWriteModelScript } from "./ListingBuildSyncWriteModelScript.js";
import { ListingPrepareIndexActionScript } from "./ListingPrepareIndexActionScript.js";
import { ListingWriteIndexActionScript } from "./ListingWriteIndexActionScript.js";
import type {
  ListingIndexHydratedSyncAction,
  ListingIndexPreparedSyncAction,
} from "./listingIndexActionTypes.js";

export interface ListingBatchTransactionStrategy {
  mode: "per_item" | "per_chunk";
  chunkSize: number;
}

export interface ListingSyncSellableItemsScriptParams {
  params: Listing.SyncSellableItemsParams;
  transactionStrategy?: ListingBatchTransactionStrategy;
}

export class ListingSyncSellableItemsScript extends BaseScript<
  ListingSyncSellableItemsScriptParams,
  Listing.SyncSellableItemsResult
> {
  protected async execute(
    input: ListingSyncSellableItemsScriptParams
  ): Promise<Listing.SyncSellableItemsResult> {
    assertNoDuplicateItems(input.params.items);
    const results: Listing.ListingUpdateResult[] = [];

    for (const item of input.params.items) {
      try {
        results.push(await this.syncOne(input.params, item));
      } catch (error) {
        this.logger.error(
          {
            error,
            storeId: input.params.storeId,
            entityType: item.entityType,
            itemId: item.id,
            operationId: input.params.meta.operationId,
          },
          "Controlled listing batch item sync failed"
        );
      }
    }

    return {
      operationId: input.params.meta.operationId,
      status:
        results.length === input.params.items.length ? "completed" : "partial",
      results,
    };
  }

  protected handleError(error: unknown): never {
    throw error;
  }

  private async syncOne(
    params: Listing.SyncSellableItemsParams,
    item: Listing.ListingSellableItemSnapshot
  ): Promise<Listing.ListingUpdateResult> {
    const queued: ListingIndexHydratedSyncAction = {
      type: "syncSellableItem",
      params: {
        meta: params.meta,
        storeId: params.storeId,
        item,
      },
      effectiveIdempotencyKey: buildListingIndexEffectiveIdempotencyKey({
        rawIdempotencyKey: params.meta.idempotencyKey,
        storeId: params.storeId,
        entityType: item.entityType,
        itemId: item.id,
        actionType: "syncSellableItem",
        sourceRevision: item.sourceRevision,
      }),
      payloadHash: buildListingIndexPayloadHash({
        type: "syncSellableItem",
        params: {
          meta: params.meta,
          storeId: params.storeId,
          item,
        },
      }),
    };

    const prepared = (await this.executeScript(
      ListingPrepareIndexActionScript,
      queued
    )) as ListingIndexPreparedSyncAction;

    if (prepared.kind === "final") {
      return prepared.result;
    }

    const syncWriteModel = await this.executeScript(
      ListingBuildSyncWriteModelScript,
      {
        action: prepared.action,
      }
    );

    return this.executeScript(ListingWriteIndexActionScript, {
      action: prepared.action,
      syncWriteModel,
    });
  }
}

function assertNoDuplicateItems(
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

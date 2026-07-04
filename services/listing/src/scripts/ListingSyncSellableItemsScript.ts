import type { Listing } from "@shopana/broker-types";
import { BaseScript } from "../kernel/BaseScript.js";

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
    // Validate batch metadata and duplicate item refs.
    // Build item-scoped effectiveIdempotencyKey and payloadHash for each item.
    // Execute the same step-oriented runner as DBOS: prepare, optional build
    // sync write model, then exactly one transactional write script.
    // Default to per-item transactions; allow per-chunk only for controlled
    // backfill/repair callers that accept chunk rollback behavior.
    void input;
    throw new Error("ListingSyncSellableItemsScript is not implemented yet");
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

import { BaseScript } from "../kernel/BaseScript.js";
import type {
  ListingPreparedDeleteWriteAction,
  ListingPreparedSyncWriteAction,
} from "./listingIndexActionTypes.js";
import type { Listing } from "@shopana/broker-types";

export class ListingWriteIndexActionScript extends BaseScript<
  ListingPreparedSyncWriteAction | ListingPreparedDeleteWriteAction,
  Listing.ListingUpdateResult
> {
  protected async execute(
    input: ListingPreparedSyncWriteAction | ListingPreparedDeleteWriteAction
  ): Promise<Listing.ListingUpdateResult> {
    // Open the final item-level transaction and call lockByItem as the first
    // write-side DB operation.
    // Recheck latest item state, sourceRevision and payloadHash under the lock
    // before deciding applied/noop/ignored_stale/conflict.
    // For sync apply: allocate/read doc ids, create bootstrap product row,
    // apply the write model, delete stale variants and update latest state
    // atomically.
    // For delete apply: load current doc ids, delete dependent rows in the
    // documented order, refresh projection blocks and mark latest state deleted
    // atomically.
    // On retry after DB commit but before DBOS step persistence, use latest
    // item state guards to avoid physical write amplification.
    void input;
    throw new Error("ListingWriteIndexActionScript is not implemented yet");
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

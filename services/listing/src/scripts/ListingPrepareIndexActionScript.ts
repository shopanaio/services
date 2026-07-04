import { BaseScript } from "../kernel/BaseScript.js";
import type {
  ListingIndexPreparedDeleteAction,
  ListingIndexPreparedSyncAction,
  ListingIndexQueuedAction,
} from "./listingIndexActionTypes.js";

export class ListingPrepareIndexActionScript extends BaseScript<
  ListingIndexQueuedAction,
  ListingIndexPreparedSyncAction | ListingIndexPreparedDeleteAction
> {
  protected async execute(
    action: ListingIndexQueuedAction
  ): Promise<ListingIndexPreparedSyncAction | ListingIndexPreparedDeleteAction> {
    // Validate public contract version, project boundary, required metadata,
    // timestamps, duplicate variant ids, duplicate facet value handles and
    // currency formats.
    // Do not allocate doc ids, build physical rows or write index tables in
    // this script.
    void action;
    throw new Error("ListingPrepareIndexActionScript is not implemented yet");
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

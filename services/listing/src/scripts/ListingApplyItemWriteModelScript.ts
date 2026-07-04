import { BaseScript } from "../kernel/BaseScript.js";
import type { ListingPreparedSyncWriteAction } from "./listingIndexActionTypes.js";

export class ListingApplyItemWriteModelScript extends BaseScript<
  ListingPreparedSyncWriteAction,
  void
> {
  protected async execute(
    input: ListingPreparedSyncWriteAction
  ): Promise<void> {
    // Apply only physical index writes for an already built write model and
    // already allocated doc ids inside the parent item transaction.
    // Upsert variant rows, replace variant prices/memberships/runtime prices,
    // refresh variant projection blocks, upsert product row, replace product
    // prices/memberships/sort rows and replace localized BM25 title rows.
    // Do not accept public snapshots here and do not choose mapping rules here.
    void input;
    throw new Error("ListingApplyItemWriteModelScript is not implemented yet");
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

import { BaseScript } from "../kernel/BaseScript.js";
import type { ListingPreparedSyncWriteAction } from "./listingIndexActionTypes.js";
import { ListingWriteIndexActionScript } from "./ListingWriteIndexActionScript.js";

export class ListingApplyItemWriteModelScript extends BaseScript<
  ListingPreparedSyncWriteAction,
  void
> {
  protected async execute(input: ListingPreparedSyncWriteAction): Promise<void> {
    await this.executeScript(ListingWriteIndexActionScript, input);
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

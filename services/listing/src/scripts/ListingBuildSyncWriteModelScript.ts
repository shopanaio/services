import { BaseScript } from "../kernel/BaseScript.js";
import type {
  ListingPreparedSyncAction,
  ListingSyncWriteModel,
} from "./listingIndexActionTypes.js";

export class ListingBuildSyncWriteModelScript extends BaseScript<
  { action: ListingPreparedSyncAction },
  ListingSyncWriteModel
> {
  protected async execute(input: {
    action: ListingPreparedSyncAction;
  }): Promise<ListingSyncWriteModel> {
    // Convert the normalized public snapshot into canonical repository DTOs:
    // product/variant listing rows, price rows, posting memberships, sort rows
    // and BM25 title rows. Keep the output sorted in stable order.
    // Do not read or write database state, allocate doc ids, create bootstrap
    // rows, call Date/UUID/random or depend on mutable process state here.
    void input;
    throw new Error("ListingBuildSyncWriteModelScript is not implemented yet");
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

import { Kernel } from "../../kernel/Kernel.js";
import { ListingBuildSyncWriteModelScript } from "../../scripts/ListingBuildSyncWriteModelScript.js";
import type {
  ListingPreparedSyncAction,
  ListingSyncWriteModel,
} from "../../scripts/listingIndexActionTypes.js";

export type ListingBatchBuildSyncWriteModelsInput = {
  actions: ListingPreparedSyncAction[];
};

export type ListingBatchWriteModelItem = {
  action: ListingPreparedSyncAction;
  syncWriteModel: ListingSyncWriteModel;
};

export type ListingBatchBuildSyncWriteModelsResult = {
  items: ListingBatchWriteModelItem[];
};

export async function buildListingSyncWriteModelsBatch(
  input: ListingBatchBuildSyncWriteModelsInput,
): Promise<ListingBatchBuildSyncWriteModelsResult> {
  /*
   * Contract:
   * - Build exactly one deterministic sync write model for each prepared action.
   * - Preserve prepared action order.
   * - Keep models item-scoped; merging belongs to the transactional write step
   *   after listing_index_item_state locks are acquired.
   */
  if (input.actions.length === 0) {
    return {
      items: [],
    };
  }

  const kernel = Kernel.getInstance();
  const items = await Promise.all(
    input.actions.map(async (action) => ({
      action,
      syncWriteModel: await kernel.runScript(ListingBuildSyncWriteModelScript, {
        action,
      }),
    })),
  );

  return {
    items,
  };
}

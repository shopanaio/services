import type { Listing } from "@shopana/broker-types";
import { Kernel } from "../../kernel/Kernel.js";
import { ListingPrepareIndexActionScript } from "../../scripts/ListingPrepareIndexActionScript.js";
import type {
  ListingIndexHydratedSyncAction,
  ListingIndexPreparedSyncAction,
  ListingPreparedSyncAction,
} from "../../scripts/listingIndexActionTypes.js";

export type ListingBatchPrepareSyncIndexActionsInput = {
  actions: ListingIndexHydratedSyncAction[];
};

export type ListingBatchPrepareSyncIndexActionsResult = {
  actions: ListingPreparedSyncAction[];
  finalResults: Listing.ListingUpdateResult[];
};

export async function prepareListingSyncIndexActionsBatch(
  input: ListingBatchPrepareSyncIndexActionsInput,
): Promise<ListingBatchPrepareSyncIndexActionsResult> {
  /*
   * Contract:
   * - Apply the same validation and normalization as the single-product
   *   prepare step.
   * - Preserve batch item order inside each output bucket.
   * - Do not perform stale/noop checks that require listing_index_item_state
   *   locks; those checks belong to the write transaction.
   */
  if (input.actions.length === 0) {
    return {
      actions: [],
      finalResults: [],
    };
  }

  const kernel = Kernel.getInstance();
  const preparedResults = await Promise.all(
    input.actions.map(
      (action) =>
        kernel.runScript(
          ListingPrepareIndexActionScript,
          action,
        ) as Promise<ListingIndexPreparedSyncAction>,
    ),
  );

  const actions: ListingPreparedSyncAction[] = [];
  const finalResults: Listing.ListingUpdateResult[] = [];

  for (const prepared of preparedResults) {
    if (prepared.kind === "continue") {
      actions.push(prepared.action);
      continue;
    }

    finalResults.push(prepared.result);
  }

  return {
    actions,
    finalResults,
  };
}

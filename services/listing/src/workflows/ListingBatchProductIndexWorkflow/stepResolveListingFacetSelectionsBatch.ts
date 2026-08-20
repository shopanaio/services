import { Kernel } from "../../kernel/Kernel.js";
import { ListingResolveFacetSelectionsScript } from "../../scripts/ListingResolveFacetSelectionsScript.js";
import type { ListingIndexHydratedSyncAction } from "../../scripts/listingIndexActionTypes.js";
import type { ListingBatchHydrationStepResult } from "./stepFetchCatalogListingSnapshotsBatch.js";

export type ListingBatchFacetResolutionStepResult = {
  actions: ListingIndexHydratedSyncAction[];
};

export async function resolveListingFacetSelectionsBatch(
  input: ListingBatchHydrationStepResult,
): Promise<ListingBatchFacetResolutionStepResult> {
  /*
   * Contract:
   * - Input contains hydrated sync actions with catalog-facing facet/tag/option
   *   handles.
   * - Output contains the same actions with selections resolved to listing
   *   facet/value ids that can become posting bitmap value keys.
   * - Missing products are already represented in hydration.missing and are not
   *   part of this step.
   * - Item order and action metadata are preserved.
   * - No listing index tables are written here.
   */
  if (input.found.length === 0) {
    return { actions: [] };
  }

  const kernel = Kernel.getInstance();
  const actions = await Promise.all(
    input.found.map(async (action) => {
      const locale = action.params.item.content.defaultLocale ?? input.store.defaultLocale;
      const result = await kernel.runScript(ListingResolveFacetSelectionsScript, action, {
        storeId: action.params.storeId,
        organizationId: action.organizationId,
        requestId: action.params.meta.source.requestId ?? action.params.meta.operationId,
        locale,
        defaultLocale: locale,
      });

      return result.action;
    }),
  );

  return { actions };
}

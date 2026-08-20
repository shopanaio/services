import { Kernel } from "../../kernel/Kernel.js";
import {
  ListingBuildFacetReferenceSyncPlanScript,
  type ListingFacetReferenceSyncPlan,
} from "../../scripts/ListingBuildFacetReferenceSyncPlanScript.js";
import type { ListingBatchWriteModelItem } from "./stepBuildListingSyncWriteModelsBatch.js";

export type ListingBatchBuildFacetReferenceSyncPlansInput = {
  items: ListingBatchWriteModelItem[];
};

export type ListingBatchBuildFacetReferenceSyncPlansResult = {
  plansByProductId: Record<string, ListingFacetReferenceSyncPlan>;
};

export async function buildListingFacetReferenceSyncPlansBatch(
  input: ListingBatchBuildFacetReferenceSyncPlansInput,
): Promise<ListingBatchBuildFacetReferenceSyncPlansResult> {
  /*
   * Contract:
   * - Build exactly one durable facet reference sync plan for each write model.
   * - Preserve the per-product single-item semantics for old/new facet refs.
   * - Do not start child workflows here; startup belongs after the index write
   *   reports the applied product ids.
   */
  if (input.items.length === 0) {
    return {
      plansByProductId: {},
    };
  }

  const kernel = Kernel.getInstance();
  const plans = await Promise.all(
    input.items.map(async ({ action, syncWriteModel }) =>
      kernel.runScript(ListingBuildFacetReferenceSyncPlanScript, {
        action,
        syncWriteModel,
      }),
    ),
  );
  const plansByProductId: Record<string, ListingFacetReferenceSyncPlan> = {};

  for (const plan of plans) {
    plansByProductId[plan.productId] = plan;
  }

  return {
    plansByProductId,
  };
}

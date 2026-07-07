import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  buildIdempotencyKey,
  InjectBroker,
  ServiceBroker,
  type IdempotencyContext,
  Workflow,
  WorkflowStep,
} from "@shopana/shared-kernel";
import type { Listing } from "@shopana/broker-types";
import type { ListingFacetReferenceSyncPlan } from "../scripts/ListingBuildFacetReferenceSyncPlanScript.js";
import type {
  ListingIndexHydratedSyncAction,
  ListingPreparedSyncAction,
  ListingSyncWriteModel,
} from "../scripts/listingIndexActionTypes.js";
import {
  fetchCatalogListingSnapshotsBatch,
  type ListingBatchHydrationStepResult,
} from "./ListingBatchProductIndexWorkflow/stepFetchCatalogListingSnapshotsBatch.js";

export type ListingIndexProductUpdateBatchItem = {
  eventId: string;
  productId: string;
  sourceSequence: number;
  meta: Listing.ListingUpdateMeta;
};

export type ListingIndexProductUpdateBatchInput = {
  type: "batchProductUpdate";
  organizationId: string;
  storeId: string;
  // Coalesced productUpdated events, one latest event per product.
  items: ListingIndexProductUpdateBatchItem[];
  effectiveIdempotencyKey: string;
};

export type ListingIndexProductUpdateBatchResult = {
  operationId: string;
  storeId: string;
  status: "accepted";
  accepted: number;
  processedAt: string;
};

type ListingBatchFacetResolutionStepInput = {
  actions: ListingIndexHydratedSyncAction[];
};

type ListingBatchFacetResolutionStepResult = {
  actions: ListingIndexHydratedSyncAction[];
};

type ListingBatchPrepareStepInput = {
  actions: ListingIndexHydratedSyncAction[];
};

type ListingBatchPrepareStepResult = {
  actions: ListingPreparedSyncAction[];
  finalResults: Listing.ListingUpdateResult[];
};

type ListingBatchBuildWriteModelsStepInput = {
  actions: ListingPreparedSyncAction[];
};

type ListingBatchWriteModelItem = {
  action: ListingPreparedSyncAction;
  syncWriteModel: ListingSyncWriteModel;
};

type ListingBatchBuildWriteModelsStepResult = {
  items: ListingBatchWriteModelItem[];
};

type ListingBatchBuildFacetReferencePlansStepInput = {
  items: ListingBatchWriteModelItem[];
};

type ListingBatchBuildFacetReferencePlansStepResult = {
  plansByProductId: Record<string, ListingFacetReferenceSyncPlan>;
};

type ListingBatchWriteIndexStepInput = {
  items: ListingBatchWriteModelItem[];
};

type ListingBatchWriteIndexStepResult = {
  results: Listing.ListingUpdateResult[];
  appliedProductIds: string[];
};

type ListingBatchStartFacetReferenceSyncStepInput = {
  writeResult: ListingBatchWriteIndexStepResult;
  plansByProductId: Record<string, ListingFacetReferenceSyncPlan>;
};

type ListingBatchStartFacetReferenceSyncStepResult = {
  workflowIdsByProductId: Record<string, string | null>;
};

export function buildListingProductEventBatchWorkflowIdempotencyContext(input: {
  organizationId: string;
  storeId: string;
  eventsHash: string;
}): IdempotencyContext {
  return {
    source: "content",
    organizationId: input.organizationId,
    resourceId: `store:${input.storeId}:product-event-batch`,
    operation: "listing.batchProductIndex",
    contentHash: input.eventsHash,
  };
}

export function buildListingProductEventBatchWorkflowId(input: {
  idempotencyCtx: IdempotencyContext;
}): string {
  return buildIdempotencyKey("listing.batchProductIndex", input.idempotencyCtx);
}

export function buildListingProductEventBatchQueuePartitionKey(input: {
  storeId: string;
  eventsHash: string;
}): string {
  // Batch product updates use a store-scoped partition instead of item-scoped
  // partitions because a single workflow can cover many products.
  return [input.storeId, "product-event-batch", input.eventsHash].join(":");
}

@Injectable()
export class ListingBatchProductIndexWorkflow extends BrokerWorkflows<
  ListingIndexProductUpdateBatchInput,
  ListingIndexProductUpdateBatchResult
> {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("batchProductIndex")
  async run(
    input: ListingIndexProductUpdateBatchInput
  ): Promise<ListingIndexProductUpdateBatchResult> {
    /*
     * Intended batch indexing pipeline:
     *
     * 1. fetchCatalogListingSnapshotsBatch
     *    Hydrates all product ids from the coalesced event batch in one catalog
     *    query and fetches the store default locale once. Missing products are
     *    represented as per-item noop results and do not fail the whole batch.
     *
     * 2. resolveListingFacetSelectionsBatch
     *    Resolves source facet selections to listing facet/value ids for every
     *    hydrated product. This keeps the write model builder independent from
     *    catalog-facing handles and produces stable posting value keys later.
     *
     * 3. prepareListingSyncIndexActionsBatch
     *    Applies the same validation and item-key normalization as the single
     *    product workflow, but returns a batch contract: continue actions plus
     *    final per-item results for inputs that can stop early.
     *
     * 4. buildListingSyncWriteModelsBatch
     *    Builds one write model per prepared product. The models are not merged
     *    here because state checks happen in the write transaction; a product can
     *    still become noop or ignored_stale after locking listing_index_item_state.
     *
     * 5. buildListingFacetReferenceSyncPlansBatch
     *    Creates facet reference sync plans from the same per-product write model
     *    data that will be considered by the write step. The follow-up workflows
     *    start only after the index write commits.
     *
     * 6. writeListingBatchSyncIndexAction
     *    Opens one repository transaction, locks all item state rows, filters out
     *    noop/ignored_stale items, merges the remaining payload table-by-table,
     *    writes all listing index tables atomically, upserts latest item state,
     *    and returns per-product write results.
     *
     * 7. startFacetReferenceStateSyncBatch
     *    Starts child facet reference sync workflows for products that were
     *    actually applied and have non-empty plans. Duplicate child workflow
     *    starts are treated as success, matching the single product workflow.
     */
    const hydration = await this.stepFetchCatalogListingSnapshotsBatch(input);

    // Hydration is wired. The remaining batch indexing steps are intentionally
    // not implemented in this change.
    this.logger.warn(
      {
        storeId: input.storeId,
        itemCount: input.items.length,
        found: hydration.found.length,
        missing: hydration.missing.length,
      },
      "Listing batch product index workflow hydrated input but remaining steps are not implemented yet"
    );

    return {
      operationId: input.effectiveIdempotencyKey,
      storeId: input.storeId,
      status: "accepted",
      accepted: input.items.length,
      processedAt: new Date().toISOString(),
    };
  }

  @WorkflowStep({
    name: "fetchCatalogListingSnapshotsBatch",
    timeoutMs: 120_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  private async stepFetchCatalogListingSnapshotsBatch(
    input: ListingIndexProductUpdateBatchInput
  ): Promise<ListingBatchHydrationStepResult> {
    return fetchCatalogListingSnapshotsBatch({
      broker: this.broker,
      batch: input,
    });
  }

  @WorkflowStep({
    name: "resolveListingFacetSelectionsBatch",
    timeoutMs: 60_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  private async stepResolveListingFacetSelectionsBatch(
    input: ListingBatchFacetResolutionStepInput
  ): Promise<ListingBatchFacetResolutionStepResult> {
    /*
     * Contract:
     * - Input contains hydrated sync actions with catalog-facing facet/tag/option
     *   handles.
     * - Output contains the same actions with selections resolved to listing
     *   facet/value ids that can become posting bitmap value keys.
     *
     * Implementation notes:
     * - Prefer a batch script or repository path that resolves all products'
     *   facet selections together.
     * - Preserve item order and action metadata so per-product results can be
     *   correlated back to input.items.
     * - Return resolved actions only; no DB index writes belong in this step.
     */
    void input;
    throw new Error("Not implemented");
  }

  @WorkflowStep({
    name: "prepareListingSyncIndexActionsBatch",
    timeoutMs: 60_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  private async stepPrepareListingSyncIndexActionsBatch(
    input: ListingBatchPrepareStepInput
  ): Promise<ListingBatchPrepareStepResult> {
    /*
     * Contract:
     * - Input contains resolved hydrated sync actions.
     * - Output splits the batch into prepared actions that should continue and
     *   final ListingUpdateResult entries for actions that can stop before write.
     *
     * Implementation notes:
     * - Reuse the single-product prepare semantics: contract version validation,
     *   project/store validation, sourceSequence normalization, itemKey creation,
     *   idempotency checks that do not require row locks, and warning propagation.
     * - Do not perform stale/noop checks that require locking
     *   listing_index_item_state; those checks belong in the write transaction.
     */
    void input;
    throw new Error("Not implemented");
  }

  @WorkflowStep({
    name: "buildListingSyncWriteModelsBatch",
    timeoutMs: 120_000,
    retry: {
      maxAttempts: 3,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  private async stepBuildListingSyncWriteModelsBatch(
    input: ListingBatchBuildWriteModelsStepInput
  ): Promise<ListingBatchBuildWriteModelsStepResult> {
    /*
     * Contract:
     * - Input contains prepared sync actions.
     * - Output contains one { action, syncWriteModel } item per product.
     *
     * Implementation notes:
     * - Keep write models per product at this stage because writeModelHash and
     *   listing_index_item_state decisions are item-scoped.
     * - Do not merge table payloads here. The write step must lock current state
     *   first, exclude noop/ignored_stale products, and only then merge rows for
     *   products that will actually be applied.
     */
    void input;
    throw new Error("Not implemented");
  }

  @WorkflowStep({
    name: "buildListingFacetReferenceSyncPlansBatch",
    timeoutMs: 60_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  private async stepBuildListingFacetReferenceSyncPlansBatch(
    input: ListingBatchBuildFacetReferencePlansStepInput
  ): Promise<ListingBatchBuildFacetReferencePlansStepResult> {
    /*
     * Contract:
     * - Input contains the per-product write models produced by the previous
     *   step.
     * - Output maps productId to the facet reference sync plan for that product.
     *
     * Implementation notes:
     * - Build plans before the write so the workflow has durable child-workflow
     *   input after replay.
     * - Child workflows must not be started here. They should start only after
     *   writeListingBatchSyncIndexAction commits and reports appliedProductIds.
     */
    void input;
    throw new Error("Not implemented");
  }

  @WorkflowStep({
    name: "writeListingBatchSyncIndexAction",
    timeoutMs: 180_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  private async stepWriteListingBatchSyncIndexAction(
    input: ListingBatchWriteIndexStepInput
  ): Promise<ListingBatchWriteIndexStepResult> {
    /*
     * Contract:
     * - Input contains per-product write model items.
     * - Output contains per-product ListingUpdateResult entries and the product
     *   ids whose index rows were actually applied.
     *
     * Transaction contract:
     * - Open exactly one listing repository transaction for the whole batch.
     * - Lock listing_index_item_state rows for every product item key.
     * - For each product decide ignored_stale/noop/conflict/applied while the
     *   locks are held.
     * - Build the merged payload only from applied items.
     * - Write table-by-table inside the same transaction:
     *   1. allocate product and variant doc ids;
     *   2. ensure product bootstrap rows;
     *   3. upsert product_listing_index rows;
     *   4. replace product price, title search, sort, and product bitmap rows;
     *   5. upsert variant_listing_index rows;
     *   6. replace variant source price, runtime price, facet bitmap, and
     *      variant_product bitmap rows;
     *   7. delete stale variants and their dependent rows;
     *   8. refresh variant projection blocks for all changed variant doc ids;
     *   9. upsert listing_index_item_state rows for applied products.
     * - Commit all applied products atomically or roll back the whole write step.
     */
    void input;
    throw new Error("Not implemented");
  }

  @WorkflowStep({
    name: "startFacetReferenceStateSyncBatch",
    timeoutMs: 60_000,
    retry: {
      maxAttempts: 5,
      intervalSeconds: 1,
      backoffRate: 2,
    },
  })
  private async stepStartFacetReferenceStateSyncBatch(
    input: ListingBatchStartFacetReferenceSyncStepInput
  ): Promise<ListingBatchStartFacetReferenceSyncStepResult> {
    /*
     * Contract:
     * - Input contains write results plus durable facet sync plans.
     * - Output maps productId to the started child workflow id, or null when no
     *   child workflow is needed.
     *
     * Implementation notes:
     * - Start child workflows only for product ids listed in appliedProductIds.
     * - Skip empty plans.
     * - Use the same idempotency context, workflow id, queue, partition key, and
     *   duplicate-start handling as the single product workflow.
     * - This step intentionally runs after the DB write transaction has
     *   committed, so child workflows never observe uncommitted listing index
     *   state.
     */
    void input;
    throw new Error("Not implemented");
  }
}

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
import {
  resolveListingFacetSelectionsBatch,
  type ListingBatchFacetResolutionStepResult,
} from "./ListingBatchProductIndexWorkflow/stepResolveListingFacetSelectionsBatch.js";
import { prepareListingSyncIndexActionsBatch } from "./ListingBatchProductIndexWorkflow/stepPrepareListingSyncIndexActionsBatch.js";
import { buildListingSyncWriteModelsBatch } from "./ListingBatchProductIndexWorkflow/stepBuildListingSyncWriteModelsBatch.js";
import { buildListingFacetReferenceSyncPlansBatch } from "./ListingBatchProductIndexWorkflow/stepBuildListingFacetReferenceSyncPlansBatch.js";
import { writeListingBatchSyncIndexAction } from "./ListingBatchProductIndexWorkflow/stepWriteListingBatchSyncIndexAction.js";
import { startFacetReferenceStateSyncBatch } from "./ListingBatchProductIndexWorkflow/stepStartFacetReferenceStateSyncBatch.js";

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
    const resolution = await this.stepResolveListingFacetSelectionsBatch(hydration);
    const prepared = await this.stepPrepareListingSyncIndexActionsBatch(resolution);
    const writeModels = await this.stepBuildListingSyncWriteModelsBatch({
      actions: prepared.actions,
    });
    const facetReferencePlans =
      await this.stepBuildListingFacetReferenceSyncPlansBatch({
        items: writeModels.items,
      });
    const writeResult = await this.stepWriteListingBatchSyncIndexAction({
      items: writeModels.items,
    });

    // Facet reference child workflow startup is still intentionally not wired
    // because its batch implementation is not implemented yet.
    this.logger.debug(
      {
        storeId: input.storeId,
        itemCount: input.items.length,
        found: hydration.found.length,
        missing: hydration.missing.length,
        resolved: resolution.actions.length,
        prepared: prepared.actions.length,
        writeModels: writeModels.items.length,
        facetReferencePlans: Object.keys(
          facetReferencePlans.plansByProductId
        ).length,
        writeResults: writeResult.results.length,
        applied: writeResult.appliedProductIds.length,
        finalizedWithoutWrite:
          hydration.missing.length + prepared.finalResults.length,
        finalizedBeforeWrite: prepared.finalResults.length,
      },
      "Listing batch product index workflow wrote listing index rows"
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
    input: ListingBatchHydrationStepResult
  ): Promise<ListingBatchFacetResolutionStepResult> {
    return resolveListingFacetSelectionsBatch(input);
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
    return prepareListingSyncIndexActionsBatch(input);
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
    return buildListingSyncWriteModelsBatch(input);
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
    return buildListingFacetReferenceSyncPlansBatch(input);
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
     * - Input contains per-product write model items from
     *   buildListingSyncWriteModelsBatch. Each item keeps its own prepared action
     *   and writeModelHash because freshness/idempotency are product-scoped.
     * - Output contains one ListingUpdateResult per input item and the product ids
     *   whose rows were actually applied to listing index tables.
     *
     * Required write algorithm:
     * - Open exactly one listing repository transaction for the whole batch.
     * - Lock current listing_index_item_state rows for every input item key
     *   before deciding what to write. The lock decision and all index writes
     *   must share the same transaction.
     * - For each item, derive statePayloadHash from syncWriteModel.writeModelHash
     *   and classify it while locks are held:
     *   - ignored_stale when action.sourceSequence < current.sourceSequence;
     *   - noop when sourceSequence and effectiveIdempotencyKey match current
     *     state and statePayloadHash matches current.payloadHash;
     *   - revision conflict when the same sourceSequence is reused with a
     *     different effective idempotency key or incompatible payload;
     *   - applied when the product is fresh enough and must rewrite index rows.
     * - Build the merged payload only after classification, and only from
     *   applied items. No noop/ignored_stale product can contribute rows,
     *   delete keys, doc-id allocation input, projection refresh ids, or state
     *   upsert data.
     *
     * Merged payload requirements:
     * - Merge by target table/operation, not by executing the single-product
     *   write script in a loop. The transaction should issue table-level batch
     *   operations over arrays/maps collected from all applied products.
     * - Keep deterministic ordering for every array that goes into a repository
     *   call: productId, variantId, variantDocId, field, valueKey. This keeps
     *   DBOS replay, logs, generated hashes, and conflict diagnostics stable.
     * - Product doc ids are allocated once for all applied product ids. Variant
     *   doc ids are allocated once for all variant ids from applied write models.
     *   Every later row must use these allocated ids; do not allocate inside
     *   per-product loops after the payload is merged.
     * - Existing variants must be loaded for all applied product ids before
     *   delete planning. Stale variants are variants currently indexed for a
     *   product but absent from that product's next write model.
     * - Replacement operations are scoped to the affected product/variant ids:
     *   replacing price rows, sort rows, title rows, runtime price rows, and
     *   bitmap memberships must delete old rows only for the specific products
     *   or variants in the applied set, not for the whole store.
     * - Product-level merged groups:
     *   - product_listing_index bootstrap rows;
     *   - product_listing_index upsert rows;
     *   - product_listing_price_index rows grouped by productId;
     *   - product_title_bm25_search_index rows grouped by productId;
     *   - listing_posting_product_sort rows grouped by productDocId;
     *   - listing_posting_bitmap product memberships grouped by
     *     productDocId + field, for category, vendor, and facet.
     * - Variant-level merged groups:
     *   - variant_listing_index upsert rows;
     *   - variant_listing_price_index source price rows grouped by variantId;
     *   - listing_posting_variant_price runtime price rows grouped by
     *     variantDocId;
     *   - listing_posting_bitmap variant memberships grouped by
     *     variantDocId + field, for facet and variant_product.
     * - Stale variant merged groups:
     *   - variant bitmap memberships to delete by stale variantDocId;
     *   - runtime variant price rows to delete by stale variantDocId;
     *   - source variant price rows to delete by stale variantId;
     *   - variant_listing_index rows to delete by stale variantId.
     * - Projection refresh ids are the union of upserted variantDocIds and stale
     *   variantDocIds. Refresh each affected projection block once after variant
     *   rows/dependencies are written.
     * - listing_index_item_state upserts are also a merged payload: one row per
     *   applied product with lifecycleStatus "indexed", sourceSequence,
     *   payloadHash, lastEffectiveIdempotencyKey, lastOperationId, and updatedAt.
     *
     * Required write order inside the single transaction:
     * 1. Lock item states and classify results.
     * 2. Allocate productDocIds and variantDocIds for applied items.
     * 3. Load existing variants and compute stale variants.
     * 4. Ensure product bootstrap rows.
     * 5. Upsert product_listing_index rows.
     * 6. Replace product price, title search, sort, and product bitmap groups.
     * 7. Upsert variant_listing_index rows.
     * 8. Replace variant source price, runtime price, facet bitmap, and
     *    variant_product bitmap groups.
     * 9. Delete stale variant dependencies and stale variant rows.
     * 10. Refresh projection blocks for all changed variant doc ids.
     * 11. Upsert latest item state rows for applied products.
     *
     * Atomicity/idempotency requirements:
     * - Either every table mutation for all applied products commits, or none of
     *   them commits. The workflow must not expose a partially applied batch.
     * - Per-product results can differ inside one committed transaction:
     *   ignored_stale/noop items are returned as results but do not mutate index
     *   tables; applied items mutate tables and latest state.
     * - Duplicate replay of the same workflow input must converge to noop for
     *   already-applied products because statePayloadHash and
     *   lastEffectiveIdempotencyKey match the locked latest state.
     * - The method should return appliedProductIds from the actual applied set so
     *   startFacetReferenceStateSyncBatch never starts child workflows for noop
     *   or ignored_stale products.
     */
    return writeListingBatchSyncIndexAction(input);
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
    return startFacetReferenceStateSyncBatch({
      broker: this.broker,
      logger: this.logger,
      ...input,
    });
  }
}

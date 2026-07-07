import {
  RetryableError,
  type ServiceBroker,
} from "@shopana/shared-kernel";
import type { Catalog, Listing } from "@shopana/broker-types";
import type { ListingIndexHydratedSyncAction } from "../../scripts/listingIndexActionTypes.js";
import { ListingIndexActionScriptError } from "../../scripts/listingIndexActionTypes.js";
import { mapCatalogProductToListingSnapshot } from "../catalogListingSnapshotMapper.js";
import { buildProductSnapshotBatchSelection } from "../catalogProductSnapshotSelection.js";
import {
  buildListingIndexEffectiveIdempotencyKey,
  buildListingIndexPayloadHash,
} from "../listingIndexWorkflowHelpers.js";
import type { ListingIndexProductUpdateBatchInput } from "../ListingBatchProductIndexWorkflow.js";

export type ListingBatchHydrationStepResult = {
  store: {
    id: string;
    organizationId: string;
    defaultLocale: string;
  };
  found: ListingIndexHydratedSyncAction[];
  missing: Listing.ListingUpdateResult[];
};

export type ListingBatchGetStoreByIdResult = {
  store: {
    id: string;
    organizationId: string;
    defaultLocale: string;
  } | null;
  userErrors: Array<{
    code: string;
    message: string;
    field?: string[] | null;
  }>;
};

export async function fetchCatalogListingSnapshotsBatch(input: {
  broker: ServiceBroker;
  batch: ListingIndexProductUpdateBatchInput;
}): Promise<ListingBatchHydrationStepResult> {
  /*
   * Contract:
   * - Input is the original coalesced productUpdated batch for one store.
   * - Output contains hydrated sync actions for found catalog products and
   *   ListingUpdateResult noop entries for products missing from Catalog.
   *
   * Implementation notes:
   * - Fetch the project store once to obtain organization/defaultLocale and
   *   verify the batch store exists.
   * - Query Catalog with all input product ids in one request, preserving the
   *   event sourceSequence/meta from input.items.
   * - Map each catalog product through catalogListingSnapshotMapper.
   * - Compute payloadHash per product from the hydrated sync params.
   * - Do not write listing tables here; this step is read/hydration only.
   */
  const { batch, broker } = input;
  const productIds = [...new Set(batch.items.map((item) => item.productId))];
  const catalogQuery =
    productIds.length > 0
      ? broker.call<Catalog.CatalogQueryResult, Catalog.CatalogQueryParams>(
          "catalog.query",
          {
            storeId: batch.storeId,
            selection: buildProductSnapshotBatchSelection(productIds),
          }
        )
      : Promise.resolve<Catalog.CatalogQueryResult>({
          ok: true,
          data: { products: { edges: [] } },
        });
  const [queryResult, storeResult] = await Promise.all([
    catalogQuery,
    broker.call<ListingBatchGetStoreByIdResult, { id: string }>(
      "project.getStoreById",
      { id: batch.storeId }
    ),
  ]);

  if (!storeResult.store) {
    const message =
      storeResult.userErrors[0]?.message ??
      `Store with id "${batch.storeId}" not found`;
    throw new Error(message);
  }

  if (storeResult.store.organizationId !== batch.organizationId) {
    throw new ListingIndexActionScriptError([
      {
        code: "PROJECT_MISMATCH",
        field: ["organizationId"],
        message: "Project store organizationId does not match listing sync organizationId",
      },
    ]);
  }

  if (!queryResult.ok) {
    if (queryResult.retryable) {
      throw new RetryableError(
        `Catalog product batch query failed: ${queryResult.code}: ${queryResult.message}`
      );
    }

    throw new Error(
      `Catalog product batch query failed: ${queryResult.code}: ${queryResult.message}`
    );
  }

  const productsById = new Map<string, Catalog.CatalogProductSnapshot>();

  for (const edge of queryResult.data.products?.edges ?? []) {
    const product = edge.node;
    if (!product) continue;

    if (product.storeId !== batch.storeId) {
      throw new ListingIndexActionScriptError([
        {
          code: "PROJECT_MISMATCH",
          field: ["storeId"],
          message: "Catalog product storeId does not match listing sync storeId",
        },
      ]);
    }

    productsById.set(product.id, product);
  }

  const found: ListingIndexHydratedSyncAction[] = [];
  const missing: Listing.ListingUpdateResult[] = [];

  for (const item of batch.items) {
    const product = productsById.get(item.productId);

    if (!product) {
      missing.push({
        operationId: item.meta.operationId,
        storeId: batch.storeId,
        itemRef: {
          entityType: "product",
          id: item.productId,
        },
        sourceSequence: item.sourceSequence,
        status: "noop",
        processedAt: new Date().toISOString(),
        warnings: [
          {
            code: "CATALOG_PRODUCT_NOT_FOUND",
            field: ["itemRef", "id"],
            message: "Catalog product snapshot was not found during listing sync",
          },
        ],
      });
      continue;
    }

    const syncParams: Listing.SyncSellableItemParams = {
      meta: item.meta,
      storeId: batch.storeId,
      sourceSequence: item.sourceSequence,
      item: mapCatalogProductToListingSnapshot({
        product,
        defaultLocale: storeResult.store.defaultLocale,
      }),
    };

    found.push({
      type: "syncSellableItem",
      params: syncParams,
      organizationId: storeResult.store.organizationId,
      effectiveIdempotencyKey: buildListingIndexEffectiveIdempotencyKey({
        rawIdempotencyKey: item.meta.idempotencyKey,
        storeId: batch.storeId,
        entityType: syncParams.item.entityType,
        itemId: syncParams.item.id,
        actionType: "syncSellableItem",
        sourceSequence: item.sourceSequence,
      }),
      payloadHash: buildListingIndexPayloadHash({
        type: "syncSellableItem",
        params: syncParams,
      }),
    });
  }

  return {
    store: storeResult.store,
    found,
    missing,
  };
}

import type { Listing } from "@shopana/broker-types";
import type { ListingIndexActionType } from "../actions/listingIndexActionHelpers.js";
import type {
  ProductKind,
  ProductListingIndexUpsertInput,
  ProductListingPriceRowInput,
  ProductSortRowInput,
  ProductTitleBm25RowInput,
  RuntimeVariantPriceRowInput,
  VariantListingIndexUpsertInput,
  VariantListingPriceRowInput,
} from "../repositories/listing/listingRepositoryTypes.js";

export type ListingIndexQueuedSyncAction = {
  type: "syncSellableItem";
  params: Listing.SyncSellableItemParams;
  effectiveIdempotencyKey: string;
  payloadHash: string;
};

export type ListingIndexQueuedDeleteAction = {
  type: "deleteSellableItem";
  params: Listing.DeleteSellableItemParams;
  effectiveIdempotencyKey: string;
  payloadHash: string;
};

export type ListingIndexQueuedAction =
  | ListingIndexQueuedSyncAction
  | ListingIndexQueuedDeleteAction;

export type ListingIndexFinalStatus =
  | "applied"
  | "noop"
  | "ignored_stale";

export type ListingPreparedSyncAction = ListingIndexQueuedSyncAction & {
  actionType: "syncSellableItem";
  sourceRevision: number;
  itemKey: ListingIndexItemKey;
};

export type ListingPreparedDeleteAction = ListingIndexQueuedDeleteAction & {
  actionType: "deleteSellableItem";
  sourceRevision: number;
  itemKey: ListingIndexItemKey;
};

export type ListingIndexPreparedSyncAction =
  | {
      kind: "final";
      result: Listing.ListingUpdateResult;
    }
  | {
      kind: "continue";
      action: ListingPreparedSyncAction;
    };

export type ListingIndexPreparedDeleteAction =
  | {
      kind: "final";
      result: Listing.ListingUpdateResult;
    }
  | {
      kind: "continue";
      action: ListingPreparedDeleteAction;
    };

export type ListingIndexItemKey = {
  storeId: string;
  entityType: Listing.ListingSellableItemEntityType;
  itemId: string;
};

export type ListingSyncWriteModel = {
  version: 1;
  actionType: Extract<ListingIndexActionType, "syncSellableItem">;
  writeModelJson: ListingSyncWriteModelJson;
  writeModelHash: string;
};

export type ListingSyncWriteModelJson = {
  product: Omit<ProductListingIndexUpsertInput, "productDocId">;
  productKind: ProductKind;
  productPrices: readonly ProductListingPriceRowInput[];
  productSortRows: readonly Omit<ProductSortRowInput, "productDocId">[];
  productTitleRows: readonly ProductTitleBm25RowInput[];
  productPostingValueKeys: {
    category: readonly string[];
    vendor: readonly string[];
    facet: readonly string[];
  };
  variants: readonly Omit<
    VariantListingIndexUpsertInput,
    "productDocId" | "variantDocId"
  >[];
  variantPricesByVariantId: Record<
    string,
    readonly Omit<
      VariantListingPriceRowInput,
      "variantDocId" | "productDocId"
    >[]
  >;
  runtimePricesByVariantId: Record<
    string,
    readonly Omit<RuntimeVariantPriceRowInput, "variantDocId" | "productDocId">[]
  >;
  variantFacetValueKeysByVariantId: Record<string, readonly string[]>;
  variantProductValueKeysByVariantId: Record<string, readonly string[]>;
};

export type ListingPreparedSyncWriteAction = {
  action: ListingPreparedSyncAction;
  syncWriteModel: ListingSyncWriteModel;
};

export type ListingPreparedDeleteWriteAction = {
  action: ListingPreparedDeleteAction;
};

export type ListingIndexValidationIssue = {
  code:
    | "UNSUPPORTED_CONTRACT_VERSION"
    | "PROJECT_MISMATCH"
    | "IDEMPOTENCY_CONFLICT"
    | "REVISION_CONFLICT"
    | "VALIDATION_FAILED";
  field?: string[];
  message: string;
};

export class ListingIndexActionScriptError extends Error {
  constructor(
    public readonly issues: readonly ListingIndexValidationIssue[],
    message = "Listing index action failed"
  ) {
    super(message);
    this.name = "ListingIndexActionScriptError";
  }
}

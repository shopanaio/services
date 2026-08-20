import type { Listing } from "@shopana/broker-types";
import type { ListingIndexActionType } from "../workflows/listingIndexWorkflowHelpers.js";
import type {
  ProductEntityType,
  ProductListingIndexUpsertInput,
  ProductListingPriceRowInput,
  ProductSortRowInput,
  VariantListingIndexUpsertInput,
  VariantListingPriceRowInput,
} from "../repositories/listing/listingRepositoryTypes.js";
import type { ListingSearchIndexProductWriteModel } from "../repositories/listing/ListingSearchIndexRepository.js";
import type { ListingVariantTerm } from "../listing/variantTerms/index.js";

export type ListingIndexQueuedSyncAction = {
  type: "syncSellableItem";
  params: Listing.SyncSellableItemHydrationParams;
  organizationId: string;
  effectiveIdempotencyKey: string;
};

export type ListingIndexHydratedSyncAction = {
  type: "syncSellableItem";
  params: Listing.SyncSellableItemParams;
  organizationId: string;
  effectiveIdempotencyKey: string;
  payloadHash: string;
  warnings?: Listing.ListingUpdateWarning[];
};

export type ListingIndexQueuedDeleteAction = {
  type: "deleteSellableItem";
  params: Listing.DeleteSellableItemParams;
  organizationId: string;
  effectiveIdempotencyKey: string;
  payloadHash: string;
};

export type ListingIndexQueuedAction =
  | ListingIndexHydratedSyncAction
  | ListingIndexQueuedDeleteAction;

export type ListingIndexFinalStatus =
  | "applied"
  | "noop"
  | "ignored_stale";

export type ListingPreparedSyncAction = ListingIndexHydratedSyncAction & {
  actionType: "syncSellableItem";
  eventSequence: number;
  itemKey: ListingIndexItemKey;
};

export type ListingPreparedDeleteAction = ListingIndexQueuedDeleteAction & {
  actionType: "deleteSellableItem";
  eventSequence: number;
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
  version: 5;
  actionType: Extract<ListingIndexActionType, "syncSellableItem">;
  writeModelJson: ListingSyncWriteModelJson;
  writeModelHash: string;
};

export type ListingSyncWriteModelJson = {
  product: Omit<ProductListingIndexUpsertInput, "productDocId">;
  productEntityType: ProductEntityType;
  productPrices: readonly ProductListingPriceRowInput[];
  productSortRows: readonly Omit<ProductSortRowInput, "productDocId">[];
  /** Null preserves existing rows; an explicit payload replaces all product-bound rows. */
  searchIndex: ListingSearchIndexProductWriteModel | null;
  productPostingValueKeys: {
    category: readonly string[];
    vendor: readonly string[];
    facet: readonly string[];
    collection: readonly string[];
    ruleTerm: readonly string[];
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
  variantTermsByVariantId: Record<string, readonly ListingVariantTerm[]>;
  variantRuleTermValueKeysByVariantId: Record<string, readonly string[]>;
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
    super(formatListingIndexActionErrorMessage(message, issues));
    this.name = "ListingIndexActionScriptError";
  }
}

function formatListingIndexActionErrorMessage(
  message: string,
  issues: readonly ListingIndexValidationIssue[]
): string {
  if (issues.length === 0) {
    return message;
  }

  const details = issues
    .map((issue) => {
      const field = issue.field?.length ? ` field=${issue.field.join(".")}` : "";
      return `${issue.code}${field}: ${issue.message}`;
    })
    .join("; ");

  return `${message}: ${details}`;
}

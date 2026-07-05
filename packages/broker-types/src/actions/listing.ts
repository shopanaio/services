/**
 * Listing service broker action types.
 */

export const LISTING_UPDATE_CONTRACT_VERSION = "2026-07-04" as const;

export type ListingUpdateContractVersion =
  typeof LISTING_UPDATE_CONTRACT_VERSION;

export type ListingUpdateActor = "admin" | "system" | "migration" | "api";

export interface ListingUpdateSource {
  service: "catalog";
  actor?: ListingUpdateActor;
  requestId?: string;
  workflowId?: string;
}

export interface ListingUpdateMeta {
  contractVersion: ListingUpdateContractVersion;
  operationId: string;
  idempotencyKey: string;
  occurredAt: string;
  source: ListingUpdateSource;
}

export type ListingSellableItemEntityType = "product" | "bundle";

export interface ListingSellableItemRef {
  entityType: ListingSellableItemEntityType;
  id: string;
}

export interface ListingContentSnapshot {
  defaultLocale: string;
  translations: Record<string, ListingLocalizedContentSnapshot>;
  keywords?: string[];
}

export interface ListingLocalizedContentSnapshot {
  title: string;
  subtitle?: string | null;
  plainDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface ListingAvailabilitySnapshot {
  availableForSale: boolean;
  totalQuantity?: number | null;
}

export interface ListingPriceRangeSnapshot {
  currencyCode: string;
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
}

export interface ListingVariantPriceSnapshot {
  currencyCode: string;
  amountMinor: number | null;
}

export type ListingScopeMembershipSnapshot =
  | ListingCategoryScopeMembershipSnapshot
  | ListingCollectionScopeMembershipSnapshot;

export interface ListingCategoryScopeMembershipSnapshot {
  scopeType: "category";
  categoryId: string;
  primary: boolean;
  manualRank?: string | null;
}

export interface ListingCollectionScopeMembershipSnapshot {
  scopeType: "collection";
  collectionId: string;
  manualRank?: string | null;
}

export interface ListingFacetSelectionSnapshot {
  scope: "product" | "variant";
  facet: ListingFacetRef;
  values: ListingFacetValueRef[];
}

export interface ListingFacetRef {
  type: "tag" | "feature" | "option" | "custom";
  handle: string;
  id?: string;
}

export interface ListingFacetValueRef {
  handle: string;
  id?: string;
}

export interface ListingVariantSnapshot {
  id: string;
  productRevision?: number;
  status: "active" | "inactive" | "archived";
  availability: ListingAvailabilitySnapshot;
  prices: ListingVariantPriceSnapshot[];
  facets: ListingFacetSelectionSnapshot[];
}

export interface ListingSellableItemSnapshot extends ListingSellableItemRef {
  productRevision: number;
  sourceUpdatedAt: string;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  content: ListingContentSnapshot;
  availability: ListingAvailabilitySnapshot;
  priceRanges: ListingPriceRangeSnapshot[];
  vendorId?: string | null;
  scopes: ListingScopeMembershipSnapshot[];
  productFacets: ListingFacetSelectionSnapshot[];
  variants: ListingVariantSnapshot[];
}

export interface SyncSellableItemParams {
  meta: ListingUpdateMeta;
  storeId: string;
  /**
   * Monotonic ordering token for this listing item update.
   * For catalog-originated events this is domain_events.event_sequence.
   */
  sourceSequence: number;
  item: ListingSellableItemSnapshot;
}

export type SyncSellableItemResult = ListingUpdateResult;

export interface SyncSellableItemHydrationParams {
  meta: ListingUpdateMeta;
  storeId: string;
  itemRef: ListingSellableItemRef;
  sourceSequence: number;
  expectedRevision?: number;
}

export interface DeleteSellableItemParams {
  meta: ListingUpdateMeta;
  storeId: string;
  itemRef: ListingSellableItemRef;
  sourceSequence: number;
  deletedAt: string;
  reason?: "deleted" | "merged" | "project_removed" | "manual";
}

export type DeleteSellableItemResult = ListingUpdateResult;

export interface SyncSellableItemsParams {
  meta: ListingUpdateMeta;
  organizationId: string;
  storeId: string;
  items: ListingSellableItemSnapshot[];
}

export interface SyncSellableItemsResult {
  operationId: string;
  status: "completed" | "partial";
  results: ListingUpdateResult[];
}

export interface ListingUpdateResult {
  operationId: string;
  storeId: string;
  itemRef: ListingSellableItemRef;
  sourceSequence: number;
  status: "applied" | "noop" | "ignored_stale" | "accepted";
  processedAt: string;
  warnings?: ListingUpdateWarning[];
}

export interface ListingUpdateWarning {
  code: string;
  field?: string[];
  message: string;
}

export interface ListingUpdateError {
  code: ListingUpdateErrorCode;
  message: string;
  field?: string[];
  retryable: boolean;
}

export type ListingUpdateErrorCode =
  | "UNSUPPORTED_CONTRACT_VERSION"
  | "VALIDATION_FAILED"
  | "PROJECT_MISMATCH"
  | "TRANSIENT_UNAVAILABLE"
  | "INTERNAL_ERROR";

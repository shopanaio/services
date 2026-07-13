/**
 * Broker action types - organized by service
 */

// Shared types
export type { EntityRef, UserError, AssetOwnerType } from "../shared.js";

// Apps service actions
export * as Apps from "./apps.js";
export type {
  ExecuteParams,
  ExecuteWarning,
  ExecuteResult,
} from "./apps.js";

// Catalog service actions
export * as Catalog from "./catalog.js";
export {
  CatalogFacetCandidateActionNames,
  CatalogFacetCandidateActions,
} from "./catalog.js";
export type {
  CatalogProductAvailabilitySnapshot,
  CatalogProductAvailabilitySnapshotField,
  CatalogProductAvailabilitySnapshotSelection,
  CatalogCategoryLocalizedContentSnapshot,
  CatalogCategoryLocalizedContentSnapshotField,
  CatalogCategoryLocalizedContentSnapshotSelection,
  CatalogProductCategorySnapshot,
  CatalogProductCategorySnapshotField,
  CatalogProductCategorySnapshotPopulate,
  CatalogProductCategorySnapshotSelection,
  CatalogProductFeatureSelectionSnapshot,
  CatalogProductFeatureSelectionSnapshotField,
  CatalogProductFeatureSelectionSnapshotPopulate,
  CatalogProductFeatureSelectionSnapshotSelection,
  CatalogProductFeatureValueRef,
  CatalogProductFeatureValueRefField,
  CatalogProductFeatureValueRefSelection,
  CatalogProductKind,
  CatalogProductLocalizedContentSnapshot,
  CatalogProductLocalizedContentSnapshotField,
  CatalogProductLocalizedContentSnapshotPopulate,
  CatalogProductLocalizedContentSnapshotSelection,
  CatalogProductOptionValueRef,
  CatalogProductOptionValueRefField,
  CatalogProductOptionValueRefSelection,
  CatalogProductSeoSnapshot,
  CatalogProductSeoSnapshotField,
  CatalogProductSeoSnapshotSelection,
  CatalogProductSnapshot,
  CatalogProductSnapshotVersion,
  CatalogProductStatus,
  CatalogProductTagSnapshot,
  CatalogProductTagSnapshotField,
  CatalogProductTagSnapshotSelection,
  CatalogProductVariantOptionSelectionSnapshot,
  CatalogProductVariantOptionSelectionSnapshotField,
  CatalogProductVariantOptionSelectionSnapshotPopulate,
  CatalogProductVariantOptionSelectionSnapshotSelection,
  CatalogProductVariantPriceSnapshot,
  CatalogProductVariantPriceSnapshotField,
  CatalogProductVariantPriceSnapshotSelection,
  CatalogProductVariantSnapshot,
  CatalogProductVariantSnapshotField,
  CatalogProductVariantInventoryItemSnapshot,
  CatalogProductVariantInventoryItemSnapshotField,
  CatalogProductVariantInventoryItemSnapshotSelection,
  CatalogProductVariantSnapshotPopulate,
  CatalogProductVariantSnapshotSelection,
  CatalogProductVendorSnapshot,
  CatalogProductVendorSnapshotField,
  CatalogProductVendorSnapshotSelection,
  CatalogVariantLocalizedContentSnapshot,
  CatalogVariantLocalizedContentSnapshotField,
  CatalogVariantLocalizedContentSnapshotSelection,
  CatalogRichTextSnapshot,
  CatalogRichTextSnapshotField,
  CatalogRichTextSnapshotSelection,
  FacetCandidateRelayInput,
  FacetSourceCandidateConnectionResult,
  FacetSourceCandidateQueryParams,
  FacetSourceCandidateRef,
  FacetSourceCandidateRelayInput,
  FacetSourceCandidateView,
  FacetValueCandidateConnectionResult,
  FacetValueCandidateQueryParams,
  FacetValueCandidateRelayInput,
  FacetValueCandidateType,
  FacetValueCandidateView,
  FindFacetSourceCandidateByRefParams,
  FindFacetValueCandidatesByHandlesParams,
  FindListingFacetAffectedProductsParams,
  FindListingFacetAffectedProductsResult,
  ListingFacetAffectedProductRef,
  PageInfo,
  ProductSnapshotField,
  ProductSnapshotPopulate,
  ProductSnapshotSelection,
} from "./catalog.js";

// Listing service actions
export * as Listing from "./listing.js";
export type {
  DeleteSellableItemParams,
  DeleteSellableItemResult,
  ListingAvailabilitySnapshot,
  ListingCategoryScopeMembershipSnapshot,
  ListingCollectionScopeMembershipSnapshot,
  ListingContentSnapshot,
  ListingFacetRef,
  ListingFacetSelectionSnapshot,
  ListingFacetValueRef,
  ListingLocalizedContentSnapshot,
  ListingPriceRangeSnapshot,
  ListingScopeMembershipSnapshot,
  ListingSearchContentSnapshot,
  ListingSearchLocaleContentSnapshot,
  ListingSearchTextValueSnapshot,
  ListingSellableItemEntityType,
  ListingSellableItemRef,
  ListingSellableItemSnapshot,
  ListingUpdateActor,
  ListingUpdateContractVersion,
  ListingUpdateError,
  ListingUpdateErrorCode,
  ListingUpdateMeta,
  ListingUpdateResult,
  ListingUpdateSource,
  ListingUpdateWarning,
  ListingVariantPriceSnapshot,
  ListingVariantSnapshot,
  SyncSellableItemHydrationParams,
  SyncSellableItemParams,
  SyncSellableItemResult,
  SyncSellableItemsParams,
  SyncSellableItemsResult,
} from "./listing.js";

// Media service actions
export * as Media from "./media.js";
export type {
  // AssetGroup
  CreateAssetGroupParams,
  CreateAssetGroupResult,
  DeleteAssetGroupParams,
  DeleteAssetGroupResult,
  GetAssetGroupParams,
  GetAssetGroupResult,
  // File Link/Unlink
  FileLinkParams,
  FileLinkResult,
  FileUnlinkParams,
  FileUnlinkResult,
  FileLinkItem,
  FileLinkManyParams,
  FileLinkManyResult,
  FileUnlinkManyParams,
  FileUnlinkManyResult,
  // Entity operations
  EntityDeletedParams,
  EntityDeletedResult,
  SyncEntityFilesParams,
  SyncEntityFilesResult,
} from "./media.js";

// IAM service actions
export * as IAM from "./iam.js";
export type {
  // Roles
  Permission,
  RoleConfig,
  CreateRolesParams,
  CreateRolesResult,
  AssignRoleParams,
  AssignRoleResult,
  // Authorization
  AuthorizeParams,
  AuthorizeResult,
  BatchAuthorizeRequest,
  BatchAuthorizeParams,
  BatchAuthorizeResult,
  // User
  GetCurrentUserParams,
  GetCurrentUserResult,
} from "./iam.js";

// Inventory service actions
export * as Inventory from "./inventory.js";
export type {
  FileHardDeletedParams,
  FileHardDeletedResult,
  GetOffersParams,
  OfferItem,
  GetOffersResult,
  CreateItemParams,
  CreateItemResult,
  DeleteItemByVariantIdParams,
  DeleteItemByVariantIdResult,
} from "./inventory.js";

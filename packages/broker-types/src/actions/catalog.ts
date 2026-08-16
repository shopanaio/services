/**
 * Catalog service broker action types.
 */

export interface CatalogQueryParams {
  storeId: string;
  selection: CatalogQuerySelection;
}

export type CatalogQueryResult =
  | {
      ok: true;
      data: CatalogQueryData;
    }
  | {
      ok: false;
      code: CatalogQueryErrorCode;
      message: string;
      retryable: boolean;
    };

export type CatalogQueryErrorCode =
  | "INVALID_CATALOG_PRODUCT_READ_INPUT"
  | "CATALOG_STORE_NOT_FOUND"
  | "CATALOG_PRODUCT_READ_QUERY_FAILED";

export const CatalogComparisonActionNames = {
  resolveVariants: "resolveCustomerComparisonVariants",
} as const;

export const CatalogComparisonActions = {
  resolveVariants:
    `catalog.${CatalogComparisonActionNames.resolveVariants}`,
} as const;

export const CatalogLoyaltyActionNames = {
  validateReferences: "validateLoyaltyCatalogReferences",
} as const;

export const CatalogLoyaltyActions = {
  validateReferences:
    `catalog.${CatalogLoyaltyActionNames.validateReferences}`,
} as const;

export type LoyaltyCatalogReferenceType =
  | "PRODUCT"
  | "VARIANT"
  | "CATEGORY"
  | "TAG"
  | "FEATURE"
  | "OPTION_VALUE";

export interface ValidateLoyaltyCatalogReferencesParams {
  storeId: string;
  references: readonly Readonly<{
    type: LoyaltyCatalogReferenceType;
    ids: readonly string[];
  }>[];
}

export type ValidateLoyaltyCatalogReferencesResult =
  | Readonly<{
      ok: true;
      missing: readonly Readonly<{
        type: LoyaltyCatalogReferenceType;
        ids: readonly string[];
      }>[];
    }>
  | Readonly<{
      ok: false;
      code: "CATALOG_LOYALTY_REFERENCE_VALIDATION_FAILED";
      message: string;
      retryable: boolean;
    }>;

export interface ResolveCustomerComparisonVariantsParams {
  storeId: string;
  variantIds: readonly string[];
  /** When present, return only variants whose current primary category matches. */
  categoryId?: string;
}

export interface ResolvedCustomerComparisonVariant {
  variantId: string;
  productId: string;
  primaryCategoryId: string | null;
}

export type ResolveCustomerComparisonVariantsResult =
  | Readonly<{
      ok: true;
      variants: readonly Readonly<ResolvedCustomerComparisonVariant>[];
    }>
  | Readonly<{
      ok: false;
      code:
        | "CATEGORY_NOT_FOUND"
        | "CATALOG_COMPARISON_CALLER_FORBIDDEN"
        | "CATALOG_COMPARISON_READ_FAILED";
      message: string;
      retryable: boolean;
    }>;

/** Checkout-oriented Catalog reads. These actions never calculate discounts. */
export const CATALOG_CHECKOUT_MERCHANDISE_MAX_LINES = 250;
export const CATALOG_CHECKOUT_MERCHANDISE_MAX_NESTING_DEPTH = 8;

export const CatalogCheckoutActionNames = {
  resolveMerchandise: "resolveCheckoutMerchandise",
  resolveDeliveryFacts: "resolveCheckoutDeliveryFacts",
} as const;

export const CatalogCheckoutActions = {
  resolveMerchandise: `catalog.${CatalogCheckoutActionNames.resolveMerchandise}`,
  resolveDeliveryFacts: `catalog.${CatalogCheckoutActionNames.resolveDeliveryFacts}`,
} as const;

export interface CheckoutFulfillmentLocationAddress {
  countryCode: string;
  provinceCode: string | null;
  provinceName: string | null;
  city: string;
  postalCode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
}

export interface ResolveCheckoutDeliveryFactsParams {
  storeId: string;
  effectiveAt: string;
  lines: readonly Readonly<{
    lineId: string;
    variantId: string;
    quantity: number;
  }>[];
}

export type ResolveCheckoutDeliveryLineResult =
  | Readonly<{
      status: "RESOLVED";
      lineId: string;
      variantId: string;
      physicalRevision: string;
      weightGrams: number | null;
      dimensionsMm: Readonly<{
        width: number;
        height: number;
        length: number;
      }> | null;
      customs: Readonly<{
        harmonizedSystemCode: string | null;
        countryOfOriginCode: string;
        description: string;
      }> | null;
      fulfillmentLocations: readonly Readonly<{
        locationId: string;
        locationRevision: string;
        availableQuantity: number | null;
        address: CheckoutFulfillmentLocationAddress;
      }>[];
    }>
  | Readonly<{
      status: "REJECTED";
      lineId: string;
      variantId: string;
      code: string;
      message: string;
      retryable: boolean;
    }>;

export type ResolveCheckoutDeliveryFactsResult =
  | Readonly<{
      ok: true;
      revision: string;
      lines: readonly ResolveCheckoutDeliveryLineResult[];
    }>
  | Readonly<{
      ok: false;
      code: string;
      message: string;
      retryable: boolean;
    }>;

/**
 * One cart line to resolve. `variantId` is intentionally explicit: checkout
 * merchandise is a purchasable variant, not an ambiguous product/variant ID.
 */
export interface ResolveCheckoutMerchandiseLineInput {
  lineId: string;
  variantId: string;
  /** Null for roots; required for nested lines to identify the exact item. */
  componentSelection: { componentItemId: string } | null;
  /** Purchase intent is preserved for Pricing eligibility and future plans. */
  purchase:
    | { type: "ONE_TIME"; sellingPlanId: null }
    | { type: "SUBSCRIPTION"; sellingPlanId: string };
  /**
   * Root quantity is the absolute cart quantity. Nested quantity is the number
   * of component units required per one unit of its parent.
   */
  quantity: number;
  children: ResolveCheckoutMerchandiseLineInput[];
}

export interface ResolveCheckoutMerchandiseParams {
  storeId: string;
  currencyCode: string;
  localeCode: string | null;
  /** Immutable business-time boundary for publication and effective prices. */
  effectiveAt: string;
  lines: ResolveCheckoutMerchandiseLineInput[];
}

export interface CheckoutMerchandiseMoney {
  amountMinor: string;
  currencyCode: string;
}

export interface CheckoutMerchandisePriceSnapshot {
  price: CheckoutMerchandiseMoney;
  compareAtPrice: CheckoutMerchandiseMoney | null;
  /** Stable revision of every Catalog row used to resolve this price. */
  revision: string;
}

export interface CheckoutMerchandiseAvailabilitySnapshot {
  /**
   * True when the full effective requested quantity can be sold, or when
   * inventory is untracked / selling past available stock is allowed.
   */
  available: boolean;
  tracked: boolean;
  /** Null exactly when inventory is not tracked; otherwise non-negative. */
  availableQuantity: number | null;
  continueSellingWhenOutOfStock: boolean;
  /** Null iff available; OUT_OF_STOCK means zero sellable units. */
  unavailabilityReason: "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | null;
  /** Stable revision of inventory settings and stock rows used by the read. */
  revision: string;
}

/** Catalog identities required by native discounts and Commerce Functions. */
export interface CheckoutMerchandiseTargetingSnapshot {
  categoryIds: string[];
  tagIds: string[];
  featureIds: string[];
  optionValueIds: string[];
}

/**
 * Catalog-owned component pricing instruction. Pricing applies this instruction
 * when it builds canonical transformed lines; Catalog does not calculate cart
 * totals or discount allocations.
 */
export type CheckoutComponentPriceRuleSnapshot =
  | { strategy: "BASE" }
  | { strategy: "FREE" }
  | {
      strategy: "OVERRIDE";
      amount: CheckoutMerchandiseMoney;
    }
  | {
      strategy: "ADJUSTMENT";
      operation: "DECREASE" | "INCREASE";
      value:
        | { type: "FIXED_AMOUNT"; amount: CheckoutMerchandiseMoney }
        | { type: "PERCENTAGE"; percentageBps: number };
    };

/** Component configuration owned by the resolved parent variant. */
export interface CheckoutMerchandiseComponentConfigurationSnapshot {
  configurationId: string;
  revision: string;
}

/** Exact component item selected for a nested resolved variant. */
export interface CheckoutMerchandiseComponentSelectionSnapshot {
  configurationId: string;
  groupId: string;
  componentItemId: string;
  revision: string;
  priceRule: CheckoutComponentPriceRuleSnapshot;
}

export interface ResolvedCheckoutMerchandiseLine {
  lineId: string;
  parentLineId: string | null;
  variantId: string;
  productId: string;
  quantity: number;
  purchase:
    | { type: "ONE_TIME"; sellingPlanId: null }
    | { type: "SUBSCRIPTION"; sellingPlanId: string };
  /** Revision of all non-price merchandise fields in this snapshot. */
  revision: string;
  title: string;
  sku: string | null;
  imageUrl: string | null;
  requiresShipping: boolean;
  requiresComponents: boolean;
  price: CheckoutMerchandisePriceSnapshot;
  availability: CheckoutMerchandiseAvailabilitySnapshot;
  targeting: CheckoutMerchandiseTargetingSnapshot;
  componentConfiguration: CheckoutMerchandiseComponentConfigurationSnapshot | null;
  componentSelection: CheckoutMerchandiseComponentSelectionSnapshot | null;
}

export type CheckoutMerchandiseLineRejectionCode =
  | "VARIANT_NOT_FOUND"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_NOT_PUBLISHED"
  | "PRICE_NOT_FOUND"
  | "CURRENCY_NOT_SUPPORTED"
  | "INVALID_COMPONENT_SELECTION";

/** Every requested source line must have exactly one explicit disposition. */
export type ResolveCheckoutMerchandiseLineResolution =
  | {
      status: "RESOLVED";
      line: ResolvedCheckoutMerchandiseLine;
    }
  | {
      status: "REJECTED";
      lineId: string;
      parentLineId: string | null;
      variantId: string;
      componentItemId: string | null;
      code: CheckoutMerchandiseLineRejectionCode;
      message: string;
    };

export type ResolveCheckoutMerchandiseErrorCode =
  | "CATALOG_STORE_NOT_FOUND"
  | "CHECKOUT_MERCHANDISE_RESOLUTION_FAILED";

export type ResolveCheckoutMerchandiseResult =
  | {
      ok: true;
      /** Includes identity, content, media, physical, component and price rows. */
      merchandiseRevision: string;
      /** Includes inventory settings and every stock row used by the batch. */
      availabilityRevision: string;
      /** Flat pre-order traversal; every requested line appears exactly once. */
      lines: ResolveCheckoutMerchandiseLineResolution[];
    }
  | {
      ok: false;
      code: ResolveCheckoutMerchandiseErrorCode;
      message: string;
      retryable: boolean;
    };

export const CatalogFacetCandidateActionNames = {
  sourceCandidates: "facetSourceCandidates",
  valueCandidates: "facetValueCandidates",
  findSourceByRef: "findFacetSourceCandidateByRef",
  findValuesByHandles: "findFacetValueCandidatesByHandles",
} as const;

export const CatalogFacetCandidateActions = {
  sourceCandidates: `catalog.${CatalogFacetCandidateActionNames.sourceCandidates}`,
  valueCandidates: `catalog.${CatalogFacetCandidateActionNames.valueCandidates}`,
  findSourceByRef: `catalog.${CatalogFacetCandidateActionNames.findSourceByRef}`,
  findValuesByHandles: `catalog.${CatalogFacetCandidateActionNames.findValuesByHandles}`,
} as const;

export type FacetValueCandidateType = "TAG" | "OPTION" | "FEATURE";

export interface FacetCandidateRelayInput {
  after?: string | null;
  before?: string | null;
  first?: number | null;
  last?: number | null;
  where?: unknown;
  orderBy?: unknown;
}

export type FacetSourceCandidateRelayInput = FacetCandidateRelayInput;
export type FacetValueCandidateRelayInput = FacetCandidateRelayInput;

export interface FacetSourceCandidateView {
  id: string;
  storeId: string;
  locale: string;
  facetType: string;
  handle: string;
  name: string | null;
  sourceSortBucket: number;
  sortName: string | null;
}

export interface FacetValueCandidateView {
  id: string;
  storeId: string;
  locale: string;
  facetType: FacetValueCandidateType;
  sourceHandle: string;
  handle: string;
  label: string;
}

export interface FacetSourceCandidateRef {
  facetType: string;
  handle: string;
}

export interface FacetSourceCandidateConnectionResult {
  edges: Array<{ cursor: string; node: FacetSourceCandidateView }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface FacetValueCandidateConnectionResult {
  edges: Array<{ cursor: string; node: FacetValueCandidateView }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface FacetSourceCandidateQueryParams {
  storeId: string;
  locale: string;
  excludedSources?: FacetSourceCandidateRef[];
  input: FacetSourceCandidateRelayInput;
}

export interface FacetValueCandidateQueryParams {
  storeId: string;
  locale: string;
  candidateType: FacetValueCandidateType;
  sourceHandles: string[];
  existingSourceValueHandles?: string[];
  input: FacetValueCandidateRelayInput;
}

export interface FindFacetSourceCandidateByRefParams {
  storeId: string;
  locale: string;
  facetType: string;
  handle: string;
}

export interface FindFacetValueCandidatesByHandlesParams {
  storeId: string;
  locale: string;
  candidateType: FacetValueCandidateType;
  sourceHandles: string[];
  handles: string[];
}

export interface ListingFacetAffectedProductRef {
  facetType: "TAG" | "FEATURE" | "OPTION";
  sourceHandle: string;
  sourceValueHandle?: string;
}

export interface FindListingFacetAffectedProductsParams {
  storeId: string;
  refs: ListingFacetAffectedProductRef[];
  afterProductId?: string;
  limit?: number;
}

export interface FindListingFacetAffectedProductsResult {
  productIds: string[];
  nextCursor?: string;
}

export interface CatalogQuerySelection {
  fields?: never;
  populate?: CatalogQueryPopulate;
  args?: never;
  fieldName?: never;
}

export interface CatalogQueryPopulate {
  products?: ProductConnectionSelection;
}

export interface ProductConnectionSelection {
  args?: CatalogQueryProductsArgs;
  fields?: ProductConnectionField[];
  populate?: ProductConnectionPopulate;
  fieldName?: "products";
}

export type ProductConnectionField = "totalCount";

export interface ProductConnectionPopulate {
  edges?: ProductEdgeSelection;
  pageInfo?: PageInfoSelection;
}

export interface CatalogQueryData {
  products?: ProductConnection;
}

export type CatalogQueryProductsArgs = RelayConnectionArgs & {
  where?: ProductWhereInput | null;
};

export interface ProductEdgeSelection {
  fields?: ProductEdgeField[];
  populate?: ProductEdgePopulate;
  args?: never;
  fieldName?: "edges";
}

export type ProductEdgeField = "cursor";

export interface ProductEdgePopulate {
  node?: ProductSnapshotSelection;
}

export interface ProductSnapshotSelection {
  fields?: ProductSnapshotField[];
  populate?: ProductSnapshotPopulate;
  args?: never;
  fieldName?: never;
}

export type ProductSnapshotField =
  | "snapshotVersion"
  | "id"
  | "storeId"
  | "revision"
  | "status"
  | "publishedAt"
  | "createdAt"
  | "updatedAt"
  | "handle"
  | "vendorId";

export interface ProductSnapshotPopulate {
  content?: CatalogProductLocalizedContentSnapshotSelection;
  seo?: CatalogProductSeoSnapshotSelection;
  vendor?: CatalogProductVendorSnapshotSelection;
  availability?: CatalogProductAvailabilitySnapshotSelection;
  primaryCategory?: CatalogProductCategorySnapshotSelection;
  categories?: CatalogProductCategorySnapshotSelection;
  tags?: CatalogProductTagSnapshotSelection;
  features?: CatalogProductFeatureSelectionSnapshotSelection;
  variants?: CatalogProductVariantSnapshotSelection;
}

export interface CatalogProductVendorSnapshotSelection {
  fields?: CatalogProductVendorSnapshotField[];
  populate?: never;
  args?: never;
  fieldName?: "vendor";
}

export type CatalogProductVendorSnapshotField = "id" | "name";

export interface CatalogProductLocalizedContentSnapshotSelection {
  fields?: CatalogProductLocalizedContentSnapshotField[];
  populate?: CatalogProductLocalizedContentSnapshotPopulate;
  args?: never;
  fieldName?: "content";
}

export type CatalogProductLocalizedContentSnapshotField =
  | "locale"
  | "title";

export interface CatalogProductLocalizedContentSnapshotPopulate {
  excerpt?: CatalogRichTextSnapshotSelection;
  description?: CatalogRichTextSnapshotSelection;
}

export interface CatalogProductSeoSnapshotSelection {
  fields?: CatalogProductSeoSnapshotField[];
  populate?: never;
  args?: never;
  fieldName?: "seo";
}

export type CatalogProductSeoSnapshotField =
  | "locale"
  | "seoTitle"
  | "seoDescription";

export interface CatalogRichTextSnapshotSelection {
  fields?: CatalogRichTextSnapshotField[];
  populate?: never;
  args?: never;
  fieldName?: "excerpt" | "description";
}

export type CatalogRichTextSnapshotField = "text" | "html" | "json";

export interface CatalogProductAvailabilitySnapshotSelection {
  fields?: CatalogProductAvailabilitySnapshotField[];
  populate?: never;
  args?: never;
  fieldName?: "availability";
}

export type CatalogProductAvailabilitySnapshotField =
  | "availableForSale"
  | "totalQuantity";

export interface CatalogProductCategorySnapshotSelection {
  fields?: CatalogProductCategorySnapshotField[];
  populate?: CatalogProductCategorySnapshotPopulate;
  args?: never;
  fieldName?: "primaryCategory" | "categories";
}

export type CatalogProductCategorySnapshotField =
  | "id"
  | "primary"
  | "manualRank";

export interface CatalogProductCategorySnapshotPopulate {
  content?: CatalogCategoryLocalizedContentSnapshotSelection;
}

export interface CatalogCategoryLocalizedContentSnapshotSelection {
  fields?: CatalogCategoryLocalizedContentSnapshotField[];
  populate?: never;
  args?: never;
  fieldName?: "content";
}

export type CatalogCategoryLocalizedContentSnapshotField = "locale" | "name";

export interface CatalogProductTagSnapshotSelection {
  fields?: CatalogProductTagSnapshotField[];
  populate?: never;
  args?: never;
  fieldName?: "tags";
}

export type CatalogProductTagSnapshotField = "id" | "handle";

export interface CatalogProductFeatureSelectionSnapshotSelection {
  fields?: CatalogProductFeatureSelectionSnapshotField[];
  populate?: CatalogProductFeatureSelectionSnapshotPopulate;
  args?: never;
  fieldName?: "features";
}

export type CatalogProductFeatureSelectionSnapshotField = "id" | "handle";

export interface CatalogProductFeatureSelectionSnapshotPopulate {
  values?: CatalogProductFeatureValueRefSelection;
}

export interface CatalogProductFeatureValueRefSelection {
  fields?: CatalogProductFeatureValueRefField[];
  populate?: never;
  args?: never;
  fieldName?: "values";
}

export type CatalogProductFeatureValueRefField = "id" | "handle";

export interface CatalogProductVariantSnapshotSelection {
  fields?: CatalogProductVariantSnapshotField[];
  populate?: CatalogProductVariantSnapshotPopulate;
  args?: never;
  fieldName?: "variants";
}

export type CatalogProductVariantSnapshotField =
  | "id"
  | "handle"
  | "isDefault"
  | "createdAt"
  | "updatedAt";

export interface CatalogProductVariantSnapshotPopulate {
  availability?: CatalogProductAvailabilitySnapshotSelection;
  prices?: CatalogProductVariantPriceSnapshotSelection;
  options?: CatalogProductVariantOptionSelectionSnapshotSelection;
  content?: CatalogVariantLocalizedContentSnapshotSelection;
  inventoryItem?: CatalogProductVariantInventoryItemSnapshotSelection;
}

export interface CatalogVariantLocalizedContentSnapshotSelection {
  fields?: CatalogVariantLocalizedContentSnapshotField[];
  populate?: never;
  args?: never;
  fieldName?: "content";
}

export type CatalogVariantLocalizedContentSnapshotField = "locale" | "title";

export interface CatalogProductVariantInventoryItemSnapshotSelection {
  fields?: CatalogProductVariantInventoryItemSnapshotField[];
  populate?: never;
  args?: never;
  fieldName?: "inventoryItem";
}

export type CatalogProductVariantInventoryItemSnapshotField = "id" | "sku";

export interface CatalogProductVariantPriceSnapshotSelection {
  fields?: CatalogProductVariantPriceSnapshotField[];
  populate?: never;
  args?: never;
  fieldName?: "prices";
}

export type CatalogProductVariantPriceSnapshotField =
  | "currencyCode"
  | "amountMinor";

export interface CatalogProductVariantOptionSelectionSnapshotSelection {
  fields?: CatalogProductVariantOptionSelectionSnapshotField[];
  populate?: CatalogProductVariantOptionSelectionSnapshotPopulate;
  args?: never;
  fieldName?: "options";
}

export type CatalogProductVariantOptionSelectionSnapshotField = "id" | "handle";

export interface CatalogProductVariantOptionSelectionSnapshotPopulate {
  values?: CatalogProductOptionValueRefSelection;
}

export interface CatalogProductOptionValueRefSelection {
  fields?: CatalogProductOptionValueRefField[];
  populate?: never;
  args?: never;
  fieldName?: "values";
}

export type CatalogProductOptionValueRefField = "id" | "handle";

export type CatalogProductSnapshotVersion = "2026-07-13";

export type CatalogProductStatus = "draft" | "published";

export interface ProductSnapshot {
  /** Source: contract constant, not stored in catalog DB. */
  snapshotVersion: CatalogProductSnapshotVersion;
  /** Source: catalog.product.id. */
  id: string;
  /** Source: catalog.product.store_id. */
  storeId: string;
  /** Source: catalog.product.revision. */
  revision: number;
  /** Source: derived from catalog.product.published_at. */
  status: CatalogProductStatus;
  /** Source: catalog.product.published_at. */
  publishedAt: string | null;
  /** Source: catalog.product.created_at. */
  createdAt: string;
  /** Source: catalog.product.updated_at. */
  updatedAt: string;
  /** Source: catalog.product.handle. Nullable for drafts. */
  handle: string | null;
  /** Source: catalog.product.vendor_id. */
  vendorId?: string | null;
  /** Source: catalog.product_translation rows. */
  content: CatalogProductLocalizedContentSnapshot[];
  /** Source: catalog.product_seo rows. */
  seo: CatalogProductSeoSnapshot[];
  /** Source: catalog.vendor. */
  vendor: CatalogProductVendorSnapshot | null;
  /** Source: computed from catalog.inventory_item and catalog.warehouse_stock. */
  availability: CatalogProductAvailabilitySnapshot;
  /** Source: catalog.product_category where is_primary = true. */
  primaryCategory?: CatalogProductCategorySnapshot | null;
  /** Source: catalog.product_category. */
  categories: CatalogProductCategorySnapshot[];
  /** Source: catalog.product_tag joined with catalog.tag. */
  tags: CatalogProductTagSnapshot[];
  /** Source: catalog.product_feature and catalog.product_feature_value. */
  features: CatalogProductFeatureSelectionSnapshot[];
  /** Source: catalog.variant plus variant-related pricing, inventory, and options. */
  variants: CatalogProductVariantSnapshot[];
}

export type CatalogProductSnapshot = ProductSnapshot;

export interface CatalogProductVendorSnapshot {
  /** Source: catalog.vendor.id. */
  id: string;
  /** Source: catalog.vendor.name. */
  name: string;
}

export interface CatalogProductLocalizedContentSnapshot {
  /** Source: catalog.product_translation.locale. */
  locale: string;
  /** Source: catalog.product_translation.name. */
  title: string;
  /** Source: catalog.product_translation.excerpt_text/html/json. */
  excerpt?: CatalogRichTextSnapshot | null;
  /** Source: catalog.product_translation.description_text/html/json. */
  description?: CatalogRichTextSnapshot | null;
}

export interface CatalogProductSeoSnapshot {
  /** Source: catalog.product_seo.locale. */
  locale: string;
  /** Source: catalog.product_seo.seo_title. */
  seoTitle?: string | null;
  /** Source: catalog.product_seo.seo_description. */
  seoDescription?: string | null;
}

export interface CatalogRichTextSnapshot {
  /** Source: *_text rich text storage column. */
  text: string;
  /** Source: *_html rich text storage column. */
  html: string;
  /** Source: *_json rich text storage column. */
  json: unknown;
}

export interface CatalogProductAvailabilitySnapshot {
  /** Source: computed from available stock and continue_selling_when_out_of_stock. */
  availableForSale: boolean;
  /** Source: computed from catalog.warehouse_stock quantity totals. */
  totalQuantity?: number | null;
}

export interface CatalogProductCategorySnapshot {
  /** Source: catalog.product_category.category_id. */
  id: string;
  /** Source: catalog.product_category.is_primary. */
  primary?: boolean;
  /** Source: catalog.product_category.lexo_rank. */
  manualRank?: string | null;
  /** Source: catalog.category_translation rows. */
  content: CatalogCategoryLocalizedContentSnapshot[];
}

export interface CatalogCategoryLocalizedContentSnapshot {
  /** Source: catalog.category_translation.locale. */
  locale: string;
  /** Source: catalog.category_translation.name. */
  name: string;
}

export interface CatalogProductTagSnapshot {
  /** Source: catalog.tag.id. */
  id?: string;
  /** Source: catalog.tag.handle. */
  handle: string;
}

export interface CatalogProductFeatureSelectionSnapshot {
  /** Source: catalog.product_feature.id. */
  id?: string;
  /** Source: catalog.product_feature.slug. */
  handle: string;
  /** Source: catalog.product_feature_value. */
  values: CatalogProductFeatureValueRef[];
}

export interface CatalogProductFeatureValueRef {
  /** Source: catalog.product_feature_value.id. */
  id?: string;
  /** Source: catalog.product_feature_value.slug. */
  handle: string;
}

export interface CatalogProductVariantSnapshot {
  /** Source: catalog.variant.id. */
  id: string;
  /** Source: catalog.variant.handle. */
  handle: string;
  /** Source: catalog.variant.is_default. */
  isDefault: boolean;
  /** Source: catalog.variant.created_at. */
  createdAt: string;
  /** Source: catalog.variant.updated_at. */
  updatedAt: string;
  /** Source: computed from catalog.inventory_item and catalog.warehouse_stock. */
  availability: CatalogProductAvailabilitySnapshot;
  /** Source: catalog.variant_prices_current view. */
  prices: CatalogProductVariantPriceSnapshot[];
  /** Source: catalog.product_option_variant_link joined with option/value tables. */
  options: CatalogProductVariantOptionSelectionSnapshot[];
  /** Source: catalog.variant_translation rows. */
  content: CatalogVariantLocalizedContentSnapshot[];
  /** Source: catalog.inventory_item. */
  inventoryItem: CatalogProductVariantInventoryItemSnapshot | null;
}

export interface CatalogVariantLocalizedContentSnapshot {
  /** Source: catalog.variant_translation.locale. */
  locale: string;
  /** Source: catalog.variant_translation.title. */
  title: string;
}

export interface CatalogProductVariantInventoryItemSnapshot {
  /** Stable source identity for the inventory/SKU element. */
  id: string;
  /** Source: catalog.inventory_item.sku. */
  sku: string | null;
}

export interface CatalogProductVariantPriceSnapshot {
  /** Source: catalog.variant_prices_current.currency. */
  currencyCode: string;
  /** Source: catalog.variant_prices_current.amount_minor. */
  amountMinor: number | null;
}

export interface CatalogProductVariantOptionSelectionSnapshot {
  /** Source: catalog.product_option.id. */
  id?: string;
  /** Source: catalog.product_option.slug. */
  handle: string;
  /** Source: catalog.product_option_value. */
  values: CatalogProductOptionValueRef[];
}

export interface CatalogProductOptionValueRef {
  /** Source: catalog.product_option_value.id. */
  id?: string;
  /** Source: catalog.product_option_value.slug. */
  handle: string;
}

export interface ProductWhereInput {
  id?: IdFilter | null;
}

export interface IdFilter {
  _eq?: string | null;
  _neq?: string | null;
  _in?: string[] | null;
  _notIn?: string[] | null;
  _is?: boolean | null;
  _isNot?: boolean | null;
}

export interface RelayConnectionArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface PageInfoSelection {
  fields?: PageInfoField[];
  populate?: never;
  args?: never;
  fieldName?: "pageInfo";
}

export type PageInfoField =
  | "hasNextPage"
  | "hasPreviousPage"
  | "startCursor"
  | "endCursor";

export interface ProductConnection {
  edges?: ProductEdge[];
  pageInfo?: PageInfo;
  totalCount?: number;
}

export interface ProductEdge {
  node?: ProductSnapshot;
  cursor?: string;
}

export interface PageInfo {
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

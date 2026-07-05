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
  populate?: never;
  args?: never;
  fieldName?: never;
}

export type ProductSnapshotField =
  | "snapshotVersion"
  | "id"
  | "storeId"
  | "revision"
  | "kind"
  | "status"
  | "publishedAt"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "handle"
  | "vendorId"
  | "translations"
  | "availability"
  | "primaryCategory"
  | "categories"
  | "tags"
  | "features"
  | "variants";

export type CatalogProductSnapshotVersion = "2026-07-05";

export type CatalogProductKind = "BASE" | "BUNDLE";

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
  /** Source: catalog.product.kind. */
  kind: CatalogProductKind;
  /** Source: derived from catalog.product.published_at. */
  status: CatalogProductStatus;
  /** Source: catalog.product.published_at. */
  publishedAt: string | null;
  /** Source: catalog.product.created_at. */
  createdAt: string;
  /** Source: catalog.product.updated_at. */
  updatedAt: string;
  /** Source: catalog.product.deleted_at. Usually null for hydrated snapshots. */
  deletedAt: string | null;
  /** Source: catalog.product.handle. Nullable for drafts. */
  handle: string | null;
  /** Source: catalog.product.vendor_id. */
  vendorId?: string | null;
  /** Source: catalog.product_translation rows. */
  content: CatalogProductLocalizedContentSnapshot[];
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

export interface CatalogProductLocalizedContentSnapshot {
  /** Source: catalog.product_translation.locale. */
  locale: string;
  /** Source: catalog.product_translation.name. */
  title: string;
  /** Source: catalog.product_translation.excerpt_text/html/json. */
  excerpt?: CatalogRichTextSnapshot | null;
  /** Source: catalog.product_translation.description_text/html/json. */
  description?: CatalogRichTextSnapshot | null;
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
}

export interface CatalogProductTagSnapshot {
  /** Source: catalog.tag.id. */
  id?: string;
  /** Source: catalog.tag.handle. */
  handle: string;
}

export interface CatalogProductFeatureSelectionSnapshot {
  /** Source: catalog.product_feature. */
  feature: CatalogProductFeatureRef;
  /** Source: catalog.product_feature_value. */
  values: CatalogProductFeatureValueRef[];
}

export interface CatalogProductFeatureRef {
  /** Source: catalog.product_feature.id. */
  id?: string;
  /** Source: catalog.product_feature.slug. */
  handle: string;
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
  /** Source: catalog.variant.sku. */
  sku?: string | null;
  /** Source: catalog.variant.is_default. */
  isDefault: boolean;
  /** Source: catalog.variant.created_at. */
  createdAt: string;
  /** Source: catalog.variant.updated_at. */
  updatedAt: string;
  /** Source: catalog.variant.deleted_at. Usually null for hydrated snapshots. */
  deletedAt: string | null;
  /** Source: computed from catalog.inventory_item and catalog.warehouse_stock. */
  availability: CatalogProductAvailabilitySnapshot;
  /** Source: catalog.variant_prices_current view. */
  pricing: CatalogProductVariantPricingSnapshot;
  /** Source: catalog.product_option_variant_link joined with option/value tables. */
  options: CatalogProductVariantOptionSelectionSnapshot[];
}

export interface CatalogProductVariantPricingSnapshot {
  /** Source: catalog.variant_prices_current view. */
  prices: CatalogProductVariantPriceSnapshot[];
}

export interface CatalogProductVariantPriceSnapshot {
  /** Source: catalog.variant_prices_current.currency. */
  currencyCode: string;
  /** Source: catalog.variant_prices_current.amount_minor. */
  amountMinor: number | null;
}

export interface CatalogProductVariantOptionSelectionSnapshot {
  /** Source: catalog.product_option. */
  option: CatalogProductOptionRef;
  /** Source: catalog.product_option_value. */
  values: CatalogProductOptionValueRef[];
}

export interface CatalogProductOptionRef {
  /** Source: catalog.product_option.id. */
  id?: string;
  /** Source: catalog.product_option.slug. */
  handle: string;
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

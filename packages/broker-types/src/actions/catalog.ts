/**
 * Catalog service broker action types
 */

export interface GetProductSnapshotsParams {
  storeId: string;
  productIds: string[];
  selection: ProductSnapshotSelection;
}

export type GetProductSnapshotsResult =
  | {
      ok: true;
      products: ProductSnapshotResolved[];
    }
  | {
      ok: false;
      code: ProductReadErrorCode;
      message: string;
      retryable: boolean;
    };

export type ProductReadErrorCode =
  | "INVALID_CATALOG_PRODUCT_READ_INPUT"
  | "CATALOG_STORE_NOT_FOUND"
  | "CATALOG_PRODUCT_READ_QUERY_FAILED";

export interface ProductSnapshotSelection {
  fields?: ProductSnapshotField[];
  populate?: ProductSnapshotPopulate;
  args?: never;
  fieldName?: never;
}

export interface ProductSnapshotPopulate {
  vendor?: VendorSelection;
  variants?: VariantConnectionSelection;
  media?: ProductMediaItemSelection;
  options?: ProductOptionSelection;
  features?: ProductFeatureSelection;
  primaryCategory?: CategorySelection;
  categoryAssignments?: ProductCategoryAssignmentSelection;
  tags?: TagSelection;
  description?: RichTextSelection;
  excerpt?: RichTextSelection;
  seo?: ProductSeoSelection;
  priceRange?: ProductPriceRangeSelection;
}

export type ProductSnapshotField =
  | "id"
  | "kind"
  | "handle"
  | "publishedAt"
  | "isPublished"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "revision"
  | "variantsCount"
  | "title";

export interface RelayConnectionArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface VariantConnectionSelection {
  args?: RelayConnectionArgs;
  fields?: VariantConnectionField[];
  populate?: VariantConnectionPopulate;
  fieldName?: "variants";
}

export type VariantConnectionField = "totalCount";

export interface VariantConnectionPopulate {
  edges?: VariantEdgeSelection;
  pageInfo?: PageInfoSelection;
}

export interface VariantEdgeSelection {
  fields?: VariantEdgeField[];
  populate?: VariantEdgePopulate;
  args?: never;
  fieldName?: "edges";
}

export type VariantEdgeField = "cursor";

export interface VariantEdgePopulate {
  node?: VariantSelection;
}

export interface VariantSelection {
  fields?: VariantField[];
  populate?: VariantPopulate;
  args?: never;
  fieldName?: "node";
}

export interface VariantPopulate {
  product?: ProductSnapshotSelection;
  price?: VariantPriceSelection;
  priceHistory?: VariantPriceConnectionSelection;
  selectedOptions?: SelectedOptionSelection;
  media?: VariantMediaItemSelection;
}

export type VariantField =
  | "id"
  | "kind"
  | "isDefault"
  | "handle"
  | "externalSystem"
  | "externalId"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "title";

export interface ProductPriceRangeSelection {
  fields?: ProductPriceRangeField[];
  populate?: never;
  args?: never;
  fieldName?: "priceRange";
}

export type ProductPriceRangeField =
  | "minPriceAmount"
  | "maxPriceAmount"
  | "currency";

export interface VariantPriceSelection {
  fields?: VariantPriceField[];
  populate?: never;
  args?: never;
  fieldName?: "price";
}

export type VariantPriceField =
  | "id"
  | "currency"
  | "amountMinor"
  | "compareAtMinor"
  | "effectiveFrom"
  | "effectiveTo"
  | "recordedAt"
  | "isCurrent";

export interface VariantPriceConnectionSelection {
  args?: RelayConnectionArgs;
  fields?: VariantPriceConnectionField[];
  populate?: VariantPriceConnectionPopulate;
  fieldName?: "priceHistory";
}

export type VariantPriceConnectionField = "totalCount";

export interface VariantPriceConnectionPopulate {
  edges?: VariantPriceEdgeSelection;
  pageInfo?: PageInfoSelection;
}

export interface VariantPriceEdgeSelection {
  fields?: VariantPriceEdgeField[];
  populate?: VariantPriceEdgePopulate;
  args?: never;
  fieldName?: "edges";
}

export type VariantPriceEdgeField = "cursor";

export interface VariantPriceEdgePopulate {
  node?: VariantPriceSelection;
}

export interface ProductMediaItemSelection {
  fields?: ProductMediaItemField[];
  populate?: ProductMediaItemPopulate;
  args?: never;
  fieldName?: "media";
}

export interface ProductMediaItemPopulate {
  file?: FileSelection;
}

export type ProductMediaItemField = "sortIndex";

export interface VariantMediaItemSelection {
  fields?: VariantMediaItemField[];
  populate?: VariantMediaItemPopulate;
  args?: never;
  fieldName?: "media";
}

export interface VariantMediaItemPopulate {
  file?: FileSelection;
}

export type VariantMediaItemField = "sortIndex";

export interface FileSelection {
  fields?: FileField[];
  populate?: FilePopulate;
  args?: never;
  fieldName?: "file" | "ogImage";
}

export interface FilePopulate {
  dimensions?: MediaDimensionsSelection;
}

export type FileField =
  | "id"
  | "provider"
  | "url"
  | "mimeType"
  | "ext"
  | "sizeBytes"
  | "originalName"
  | "durationMs"
  | "altText"
  | "sourceUrl"
  | "isProcessed";

export interface MediaDimensionsSelection {
  fields?: MediaDimensionsField[];
  populate?: never;
  args?: never;
  fieldName?: "dimensions";
}

export type MediaDimensionsField = "width" | "height";

export interface ProductOptionSelection {
  fields?: ProductOptionField[];
  populate?: ProductOptionPopulate;
  args?: never;
  fieldName?: "options";
}

export interface ProductOptionPopulate {
  values?: ProductOptionValueSelection;
}

export type ProductOptionField =
  | "id"
  | "slug"
  | "name"
  | "displayType"
  | "sortIndex";

export interface ProductOptionValueSelection {
  fields?: ProductOptionValueField[];
  populate?: ProductOptionValuePopulate;
  args?: never;
  fieldName?: "values";
}

export interface ProductOptionValuePopulate {
  swatch?: ProductOptionSwatchSelection;
}

export type ProductOptionValueField =
  | "id"
  | "slug"
  | "name"
  | "sortIndex";

export interface ProductOptionSwatchSelection {
  fields?: ProductOptionSwatchField[];
  populate?: ProductOptionSwatchPopulate;
  args?: never;
  fieldName?: "swatch";
}

export interface ProductOptionSwatchPopulate {
  file?: FileSelection;
}

export type ProductOptionSwatchField =
  | "id"
  | "swatchType"
  | "colorOne"
  | "colorTwo"
  | "metadata";

export interface SelectedOptionSelection {
  fields?: SelectedOptionField[];
  populate?: never;
  args?: never;
  fieldName?: "selectedOptions";
}

export type SelectedOptionField = "optionId" | "optionValueId";

export interface ProductFeatureSelection {
  fields?: ProductFeatureField[];
  populate?: ProductFeaturePopulate;
  args?: never;
  fieldName?: "features" | "parent" | "children";
}

export interface ProductFeaturePopulate {
  parent?: ProductFeatureSelection;
  children?: ProductFeatureSelection;
  values?: ProductFeatureValueSelection;
}

export type ProductFeatureField =
  | "id"
  | "slug"
  | "index"
  | "isGroup"
  | "name";

export interface ProductFeatureValueSelection {
  fields?: ProductFeatureValueField[];
  populate?: never;
  args?: never;
  fieldName?: "values";
}

export type ProductFeatureValueField = "id" | "slug" | "index" | "name";

export interface CategorySelection {
  fields?: CategoryField[];
  populate?: CategoryPopulate;
  args?: never;
  fieldName?:
    | "primaryCategory"
    | "category"
    | "parent"
    | "children"
    | "ancestors";
}

export interface CategoryPopulate {
  description?: RichTextSelection;
  excerpt?: RichTextSelection;
  seo?: SeoSelection;
  parent?: CategorySelection;
  children?: CategorySelection;
  ancestors?: CategorySelection;
}

export type CategoryField =
  | "id"
  | "handle"
  | "publishedAt"
  | "isPublished"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "revision"
  | "depth"
  | "path"
  | "name"
  | "defaultSort"
  | "defaultSortDirection";

export interface ProductCategoryAssignmentSelection {
  fields?: ProductCategoryAssignmentField[];
  populate?: ProductCategoryAssignmentPopulate;
  args?: never;
  fieldName?: "categoryAssignments";
}

export type ProductCategoryAssignmentField = "isPrimary";

export interface ProductCategoryAssignmentPopulate {
  category?: CategorySelection;
}

export interface TagSelection {
  fields?: TagField[];
  populate?: never;
  args?: never;
  fieldName?: "tags";
}

export type TagField =
  | "id"
  | "handle"
  | "createdAt"
  | "name"
  | "productsCount";

export interface VendorSelection {
  fields?: VendorField[];
  populate?: never;
  args?: never;
  fieldName?: "vendor";
}

export type VendorField = "id" | "name";

export interface RichTextSelection {
  fields?: RichTextField[];
  populate?: never;
  args?: never;
  fieldName?: "description" | "excerpt";
}

export type RichTextField = "text" | "html" | "json";

export interface ProductSeoSelection {
  fields?: ProductSeoField[];
  populate?: ProductSeoPopulate;
  args?: never;
  fieldName?: "seo";
}

export interface ProductSeoPopulate {
  ogImage?: FileSelection;
}

export type ProductSeoField =
  | "seoTitle"
  | "seoDescription"
  | "ogTitle"
  | "ogDescription";

export interface SeoSelection {
  fields?: SeoField[];
  populate?: SeoPopulate;
  args?: never;
  fieldName?: "seo";
}

export interface SeoPopulate {
  ogImage?: FileSelection;
}

export type SeoField =
  | "seoTitle"
  | "seoDescription"
  | "ogTitle"
  | "ogDescription";

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

export interface ProductSnapshotResolved {
  id?: string;
  kind?: ProductKind;
  handle?: string;
  publishedAt?: string | null;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  revision?: number;
  vendor?: VendorResolved | null;
  variants?: VariantConnectionResolved;
  media?: ProductMediaItemResolved[];
  options?: ProductOptionResolved[];
  features?: ProductFeatureResolved[];
  variantsCount?: number;
  primaryCategory?: CategoryResolved | null;
  categoryAssignments?: ProductCategoryAssignmentResolved[];
  tags?: TagResolved[];
  title?: string;
  description?: RichTextResolved | null;
  excerpt?: RichTextResolved | null;
  seo?: ProductSeoResolved | null;
  priceRange?: ProductPriceRangeResolved | null;
}

export type ProductKind = "BASE" | "BUNDLE";

export interface ProductPriceRangeResolved {
  minPriceAmount?: string;
  maxPriceAmount?: string;
  currency?: string;
}

export interface VariantConnectionResolved {
  edges?: VariantEdgeResolved[];
  pageInfo?: PageInfoResolved;
  totalCount?: number;
}

export interface VariantEdgeResolved {
  node?: VariantResolved;
  cursor?: string;
}

export interface VariantResolved {
  id?: string;
  kind?: ProductKind;
  product?: ProductSnapshotResolved;
  isDefault?: boolean;
  handle?: string;
  externalSystem?: string | null;
  externalId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  price?: VariantPriceResolved | null;
  priceHistory?: VariantPriceConnectionResolved;
  selectedOptions?: SelectedOptionResolved[];
  title?: string | null;
  media?: VariantMediaItemResolved[];
}

export interface VariantPriceResolved {
  id?: string;
  currency?: string;
  amountMinor?: string;
  compareAtMinor?: string | null;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  recordedAt?: string;
  isCurrent?: boolean;
}

export interface VariantPriceConnectionResolved {
  edges?: VariantPriceEdgeResolved[];
  pageInfo?: PageInfoResolved;
  totalCount?: number;
}

export interface VariantPriceEdgeResolved {
  node?: VariantPriceResolved;
  cursor?: string;
}

export interface SelectedOptionResolved {
  optionId?: string;
  optionValueId?: string;
}

export interface ProductMediaItemResolved {
  file?: FileResolved;
  sortIndex?: number;
}

export interface VariantMediaItemResolved {
  file?: FileResolved;
  sortIndex?: number;
}

export interface FileResolved {
  id?: string;
  provider?: string;
  url?: string;
  mimeType?: string | null;
  ext?: string | null;
  sizeBytes?: string;
  originalName?: string | null;
  dimensions?: MediaDimensionsResolved | null;
  durationMs?: number | null;
  altText?: string | null;
  sourceUrl?: string | null;
  isProcessed?: boolean;
}

export interface MediaDimensionsResolved {
  width?: number;
  height?: number;
}

export interface ProductOptionResolved {
  id?: string;
  slug?: string;
  name?: string;
  displayType?: string;
  sortIndex?: number;
  values?: ProductOptionValueResolved[];
}

export interface ProductOptionValueResolved {
  id?: string;
  slug?: string;
  name?: string;
  sortIndex?: number;
  swatch?: ProductOptionSwatchResolved | null;
}

export interface ProductOptionSwatchResolved {
  id?: string;
  swatchType?: string;
  colorOne?: string | null;
  colorTwo?: string | null;
  file?: FileResolved | null;
  metadata?: unknown;
}

export interface ProductFeatureResolved {
  id?: string;
  slug?: string;
  index?: number[];
  isGroup?: boolean;
  name?: string;
  parent?: ProductFeatureResolved | null;
  children?: ProductFeatureResolved[];
  values?: ProductFeatureValueResolved[];
}

export interface ProductFeatureValueResolved {
  id?: string;
  slug?: string;
  index?: number;
  name?: string;
}

export interface CategoryResolved {
  id?: string;
  handle?: string;
  publishedAt?: string | null;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  revision?: number;
  depth?: number;
  path?: string;
  name?: string;
  description?: RichTextResolved | null;
  excerpt?: RichTextResolved | null;
  defaultSort?: string;
  defaultSortDirection?: string;
  seo?: SeoResolved | null;
  parent?: CategoryResolved | null;
  children?: CategoryResolved[];
  ancestors?: CategoryResolved[];
}

export interface ProductCategoryAssignmentResolved {
  category?: CategoryResolved;
  isPrimary?: boolean;
}

export interface TagResolved {
  id?: string;
  handle?: string;
  createdAt?: string;
  name?: string;
  productsCount?: number;
}

export interface VendorResolved {
  id?: string;
  name?: string;
}

export interface RichTextResolved {
  text?: string;
  html?: string;
  json?: unknown;
}

export interface ProductSeoResolved {
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: FileResolved | null;
}

export interface SeoResolved {
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: FileResolved | null;
}

export interface PageInfoResolved {
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}

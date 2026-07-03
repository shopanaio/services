export type ProductKind = "BASE" | "BUNDLE";
export type ListingStatus = "published" | "draft";
export type PostingEntityType = "product" | "variant";

export type PostingField =
  | "category"
  | "collection"
  | "vendor"
  | "facet"
  | "variant_product"
  | string;

export interface PostingKeyInput {
  entityType: PostingEntityType;
  field: PostingField;
  valueKey: string;
}

export interface ProductListingIndexUpsertInput {
  productId: string;
  productDocId: number;
  kind: ProductKind;
  vendorId?: string | null;
  handle?: string | null;
  status: ListingStatus;
  publishedAt?: string | null;
  productCreatedAt: string;
  productUpdatedAt: string;
  productRevision: number;
  inStock: boolean;
  totalStock: number;
}

export interface ProductListingIndexBootstrapInput {
  productId: string;
  productDocId: number;
  kind?: ProductKind;
  productCreatedAt?: string;
  productUpdatedAt?: string;
}

export type ProductListingIndexPatchInput = Partial<
  Omit<ProductListingIndexUpsertInput, "productId" | "productDocId">
>;

export interface ProductListingPriceRowInput {
  productId: string;
  currency: string;
  hasPrice: boolean;
  minPriceMinor?: number | null;
  maxPriceMinor?: number | null;
}

export interface VariantListingIndexUpsertInput {
  productId: string;
  productDocId: number;
  variantId: string;
  variantDocId: number;
  signatureKey?: string | null;
  inStock: boolean;
  totalStock: number;
}

export type VariantListingIndexPatchInput = Partial<
  Omit<VariantListingIndexUpsertInput, "variantId" | "variantDocId">
>;

export interface VariantListingPriceRowInput {
  variantId: string;
  currency: string;
  variantDocId?: number | null;
  productDocId?: number | null;
  productId?: string | null;
  signatureKey?: string | null;
  hasPrice: boolean;
  priceMinor?: number | null;
}

export interface ProductSortKeyInput {
  productDocId: number;
  sortKind: string;
  locale?: string;
  currency?: string;
  manualScopeId?: string;
}

export interface ProductSortRowInput extends ProductSortKeyInput {
  productId: string;
  boolValue?: boolean | null;
  timestamptzValue?: string | null;
  timestamptzValue2?: string | null;
  bigintValue?: number | null;
  textValue?: string | null;
  numericValue?: string | null;
}

export interface RuntimeVariantPriceRowInput {
  currency: string;
  variantDocId: number;
  productDocId: number;
  productId: string;
  priceMinor: number;
}

export interface ProjectionBlockRowInput {
  blockId: number;
  variantDocFrom: number;
  variantDocTo: number;
  variantBitmap: string;
  productBitmap: string;
  variantCount: number;
  productCount: number;
}

export interface ProductTitleBm25RowInput {
  productId: string;
  locale: string;
  kind: ProductKind;
  status: ListingStatus;
  publishedAt?: string | null;
  productCreatedAt: string;
  productUpdatedAt: string;
  productRevision: number;
  title: string;
}

export interface PostingBitmapUpsertInput extends PostingKeyInput {
  bitmap: string;
  cardinality: number;
  metadata?: Record<string, unknown>;
}

export interface PostingBitmapReplaceInput extends PostingBitmapUpsertInput {}

export interface PostingDocIdsMutationInput extends PostingKeyInput {
  docIds: readonly number[];
}

export interface PostingMembershipReplaceResult {
  addedMemberships: number;
  removedMemberships: number;
  touchedRows: number;
  deletedEmptyRows: number;
}

export interface BulkWriteResult {
  inserted: number;
  updated: number;
  deleted: number;
}

export const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
export const DEFAULT_VARIANT_PROJECTION_BLOCK_SIZE = 4096;
export const LISTING_REPOSITORY_BULK_CHUNK_SIZE = 500;

export function nowIso(): string {
  return new Date().toISOString();
}

export function chunkArray<T>(
  values: readonly T[],
  chunkSize = LISTING_REPOSITORY_BULK_CHUNK_SIZE
): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }
  return chunks;
}

export function uniqueValues<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

export function assertNonEmptyString(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

export function assertPositiveDocId(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

export function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

export function assertProductKind(value: ProductKind): void {
  if (value !== "BASE" && value !== "BUNDLE") {
    throw new Error(`Unsupported product kind: ${value}`);
  }
}

export function assertListingStatus(value: ListingStatus): void {
  if (value !== "published" && value !== "draft") {
    throw new Error(`Unsupported listing status: ${value}`);
  }
}

export function assertCurrency(value: string): void {
  if (!/^[A-Z]{3}$/.test(value)) {
    throw new Error(`Currency must be a 3-letter uppercase code: ${value}`);
  }
}

export function assertPostingEntityType(value: PostingEntityType): void {
  if (value !== "product" && value !== "variant") {
    throw new Error(`Unsupported posting entity type: ${value}`);
  }
}

export function assertWritablePostingField(field: PostingField): void {
  assertNonEmptyString(field, "field");
  if (field === "price" || field === "in_stock") {
    throw new Error(`${field} is a virtual facet and must not be stored as a posting bitmap`);
  }
}

export function assertPostingKey(input: PostingKeyInput): void {
  assertPostingEntityType(input.entityType);
  assertWritablePostingField(input.field);
  assertNonEmptyString(input.valueKey, "valueKey");
}

export function assertUniqueBy<T>(
  values: readonly T[],
  getKey: (value: T) => string,
  label: string
): void {
  const seen = new Set<string>();
  for (const value of values) {
    const key = getKey(value);
    if (seen.has(key)) {
      throw new Error(`Duplicate ${label}: ${key}`);
    }
    seen.add(key);
  }
}

export function matchesAnyPrefix(
  value: string,
  prefixes?: readonly string[]
): boolean {
  if (!prefixes || prefixes.length === 0) {
    return true;
  }
  return prefixes.some((prefix) => value.startsWith(prefix));
}

export function assertValueKeysMatchPrefixes(
  valueKeys: readonly string[],
  prefixes?: readonly string[]
): void {
  if (!prefixes || prefixes.length === 0) {
    return;
  }

  for (const valueKey of valueKeys) {
    if (!matchesAnyPrefix(valueKey, prefixes)) {
      throw new Error(`valueKey does not match the requested replacement scope: ${valueKey}`);
    }
  }
}

export function normalizeSortKey<T extends ProductSortKeyInput>(input: T): T & {
  locale: string;
  currency: string;
  manualScopeId: string;
} {
  return {
    ...input,
    locale: input.locale ?? "",
    currency: input.currency ?? "",
    manualScopeId: input.manualScopeId ?? ZERO_UUID,
  };
}

import type { SQL } from "drizzle-orm";

export class StorefrontRepositoryValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: readonly string[]
  ) {
    super(message);
    this.name = "StorefrontRepositoryValidationError";
  }
}

export type StorefrontSortKind =
  | "manual"
  | "newest"
  | "created"
  | "name"
  | "price_asc"
  | "price_desc"
  | "relevance";

export type ProductPostingField =
  | "category"
  | "collection"
  | "vendor"
  | "facet";

export type VariantPostingField = "facet" | "variant_product";

export type FacetRuntimeType =
  | "TAG"
  | "FEATURE"
  | "OPTION"
  | "PRICE"
  | "IN_STOCK";

export interface StorefrontListingInput {
  scope: StorefrontListingScope;
  locale: string;
  currency: string;
  query?: string;
  filters: StorefrontListingFilterInput[];
  sort?: StorefrontSortInput;
  first: number;
  after?: string | null;
  includeTotalCount: boolean;
  includeFacets: boolean;
  includePriceRange: boolean;
  includeInStockCount: boolean;
}

export type StorefrontListingFilterInput =
  | {
      kind: "facet";
      facetSlug: string;
      valueHandles: string[];
    }
  | {
      kind: "vendor";
      vendorIds: string[];
    }
  | {
      kind: "price";
      minPriceMinor?: number;
      maxPriceMinor?: number;
    }
  | {
      kind: "in_stock";
      value: boolean;
    };

export interface StorefrontSortInput {
  kind: StorefrontSortKind;
}

export type StorefrontListingScope =
  | { kind: "category"; categoryId: string; manualSortScopeId?: string }
  | { kind: "manual_collection"; collectionId: string }
  | { kind: "rule_collection"; collectionId: string; rules: RuleCollectionPredicate[] }
  | { kind: "global" }
  | { kind: "search" };

export type RuleCollectionPredicate =
  | { kind: "category"; categoryId: string }
  | { kind: "collection"; collectionId: string }
  | { kind: "vendor"; vendorId: string }
  | { kind: "product_facet"; facetId: string; valueKeys: string[] }
  | { kind: "option_facet"; facetId: string; valueKeys: string[] }
  | { kind: "price"; minPriceMinor?: number; maxPriceMinor?: number }
  | { kind: "in_stock"; value: boolean };

export interface ResolvedFacetFilterGroup {
  facetId: string;
  facetType: FacetRuntimeType;
  valueKeys: string[];
}

export interface StorefrontFilterPlan {
  productFacetGroups: ResolvedFacetFilterGroup[];
  optionFacetGroups: ResolvedFacetFilterGroup[];
  vendorIds: string[];
  priceRange?: { minPriceMinor?: number; maxPriceMinor?: number };
  inStock?: boolean;
}

export interface ResolvedFacetValue {
  facetId: string;
  facetSlug: string;
  facetType: FacetRuntimeType;
  facetValueId: string;
  valueHandle: string;
  valueKey: string;
}

export type RoaringBitmapSqlValue = string;

export interface BitmapExpr {
  sql: SQL;
  empty: boolean;
  source: string;
}

export interface DecodedListingCursor {
  payload: ListingCursorPayload;
  raw: string;
}

export interface ListingCursorPayload {
  version: 1;
  hash: string;
  sort: StorefrontSortKind;
  inStock: boolean;
  productId: string;
  publishedAt?: string | null;
  productCreatedAt?: string | null;
  textValue?: string | null;
  bigintValue?: number | null;
  priceMinor?: number | null;
  variantDocId?: number | null;
  relevanceScore?: number | null;
}

export type ListingCollectorKind =
  | "product_sort"
  | "matched_variant_price"
  | "relevance";

export interface SearchTieBreakerSql {
  relevanceScoreSql: SQL;
}

export interface ListingPageCollectResult {
  rows: ListingPageRow[];
  hasNextPage: boolean;
}

export type ProductSortCollectKind =
  | "manual"
  | "newest"
  | "created"
  | "name"
  | "price_asc"
  | "price_desc";

export interface ResolvedListingRequest {
  input: StorefrontListingInput;
  filterPlan: StorefrontFilterPlan;
  normalizedQuery: string | null;
  sort: StorefrontSortInput;
  cursor: DecodedListingCursor | null;
  filterHash: string;
}

export interface ListingPageRow {
  productDocId: number;
  productId: string;
  inStock: boolean;
  cursor?: string;
  cursorValues: Record<string, string | number | boolean | null>;
  matchedVariantDocId?: number;
  matchedPriceMinor?: number;
  relevanceScore?: number;
}

export interface StorefrontListingRepositoryResult {
  rows: ListingPageRow[];
  hasNextPage: boolean;
  totalCount?: number;
  facets?: FacetCountResult[];
  priceRange?: PriceRangeResult | null;
  inStockCount?: number;
}

export interface FacetCountResult {
  facetId: string;
  facetType: FacetRuntimeType;
  valueKey: string;
  count: number;
}

export interface PriceRangeResult {
  minPriceMinor: number;
  maxPriceMinor: number;
  currency: string;
}

export interface ListingAggregatesResult {
  totalCount?: number;
  facets?: FacetCountResult[];
  priceRange?: PriceRangeResult | null;
  inStockCount?: number;
}

export interface BitmapSqlRow extends Record<string, unknown> {
  bitmap: RoaringBitmapSqlValue;
}

export interface CountSqlRow extends Record<string, unknown> {
  count: number;
}

export interface ProductSortPageSqlRow extends Record<string, unknown> {
  productDocId: number;
  productId: string;
  inStock: boolean;
  boolValue: boolean | null;
  timestamptzValue: string | null;
  timestamptzValue2: string | null;
  bigintValue: number | null;
  textValue: string | null;
}

export interface VariantPricePageSqlRow extends Record<string, unknown> {
  productDocId: number;
  productId: string;
  inStock: boolean;
  variantDocId: number;
  priceMinor: number;
}

export interface SearchPageSqlRow extends Record<string, unknown> {
  productDocId: number;
  productId: string;
  inStock: boolean;
  relevanceScore: number;
}

export interface FacetCountSqlRow extends Record<string, unknown> {
  facetId: string;
  facetType: FacetRuntimeType;
  valueKey: string;
  count: number;
}

export interface PriceRangeSqlRow extends Record<string, unknown> {
  minPriceMinor: number | null;
  maxPriceMinor: number | null;
}

import { encodeListingCursor } from "../cursor.js";
import {
  StorefrontRepositoryValidationError,
  type FacetCountResult,
  type FacetRuntimeType,
  type ListingCursorPayload,
  type ListingPageCollectResult,
  type ListingPageRow,
  type PriceRangeResult,
  type ResolvedListingRequest,
  type StorefrontListingFacetResult,
} from "../types.js";

export interface FacetGuardSqlRow extends Record<string, unknown> {
  facetErrorCode: string | null;
  facetErrorValue: string | null;
}

export interface ParallelPageSqlRow extends FacetGuardSqlRow {
  collectorKind: string | null;
  productDocId: number | null;
  productId: string | null;
  inStock: boolean | null;
  boolValue: boolean | null;
  timestamptzValue: string | null;
  timestamptzValue2: string | null;
  bigintValue: number | null;
  textValue: string | null;
  variantDocId: number | null;
  priceMinor: number | null;
  relevanceScore: number | null;
}

export interface TotalCountSqlRow extends FacetGuardSqlRow {
  totalCount: number | null;
}

export interface FacetMetadataSqlRow extends FacetGuardSqlRow {
  facetId: string | null;
  facetSlug: string | null;
  facetLabel: string | null;
  facetType: string | null;
  facetUiType: string | null;
  facetRank: string | null;
  facetValueId: string | null;
  valueHandle: string | null;
  valueLabel: string | null;
  valueKey: string | null;
  swatchId: string | null;
  valueSort: number | null;
}

export interface FacetCountMapSqlRow extends FacetGuardSqlRow {
  facetId: string | null;
  facetType: string | null;
  valueKey: string | null;
  count: number | null;
}

export interface VirtualFacetsSqlRow extends FacetGuardSqlRow {
  priceRange: unknown | null;
  inStockCount: number | null;
}

export function mapPageRows(input: {
  rows: readonly ParallelPageSqlRow[];
  request: ResolvedListingRequest;
}): ListingPageCollectResult {
  assertNoFacetResolutionError(input.rows);

  const rawRows = input.rows.filter(
    (row): row is ParallelPageSqlRow & { productId: string; productDocId: number } =>
      row.productId !== null && row.productDocId !== null
  );
  const visibleRows = rawRows.slice(0, input.request.input.first);

  return {
    rows: visibleRows.map((row) => toListingPageRow(row, input.request)),
    hasNextPage: rawRows.length > input.request.input.first,
  };
}

export function mapTotalCountRows(rows: readonly TotalCountSqlRow[]): number {
  assertNoFacetResolutionError(rows);
  return Number(rows[0]?.totalCount ?? 0);
}

export function mapFacetMetadataRows(
  rows: readonly FacetMetadataSqlRow[]
): StorefrontListingFacetResult[] {
  assertNoFacetResolutionError(rows);

  const facets = new Map<string, StorefrontListingFacetResult>();
  for (const row of rows) {
    if (
      !row.facetId ||
      !row.facetSlug ||
      !row.facetType ||
      !row.facetValueId ||
      !row.valueHandle ||
      !row.valueKey
    ) {
      continue;
    }

    const facetType = assertFacetRuntimeType(row.facetType);
    const existing = facets.get(row.facetId);
    if (existing) {
      existing.values.push({
        facetValueId: row.facetValueId,
        valueHandle: row.valueHandle,
        valueLabel: row.valueLabel,
        valueKey: row.valueKey,
        swatchId: row.swatchId,
        count: 0,
      });
      continue;
    }

    facets.set(row.facetId, {
      facetId: row.facetId,
      facetSlug: row.facetSlug,
      facetLabel: row.facetLabel,
      facetType,
      uiType: row.facetUiType,
      values: [
        {
          facetValueId: row.facetValueId,
          valueHandle: row.valueHandle,
          valueLabel: row.valueLabel,
          valueKey: row.valueKey,
          swatchId: row.swatchId,
          count: 0,
        },
      ],
    });
  }

  return [...facets.values()];
}

export function mapFacetCountRows(
  rows: readonly FacetCountMapSqlRow[]
): Map<string, FacetCountResult> {
  assertNoFacetResolutionError(rows);

  const counts = new Map<string, FacetCountResult>();
  for (const row of rows) {
    if (!row.facetId || !row.facetType || !row.valueKey) {
      continue;
    }
    counts.set(row.valueKey, {
      facetId: row.facetId,
      facetType: assertFacetRuntimeType(row.facetType),
      valueKey: row.valueKey,
      count: Number(row.count ?? 0),
    });
  }

  return counts;
}

export function mergeFacetCounts(input: {
  facets: readonly StorefrontListingFacetResult[];
  countsByValueKey: ReadonlyMap<string, FacetCountResult>;
}): StorefrontListingFacetResult[] {
  return input.facets.map((facet) => ({
    ...facet,
    values: facet.values.map((value) => ({
      ...value,
      count: input.countsByValueKey.get(value.valueKey)?.count ?? 0,
    })),
  }));
}

export function mapVirtualFacetsRows(rows: readonly VirtualFacetsSqlRow[]): {
  priceRange: PriceRangeResult | null;
  inStockCount: number;
} {
  assertNoFacetResolutionError(rows);
  const row = rows[0];

  return {
    priceRange: toPriceRange(row?.priceRange ?? null),
    inStockCount: Number(row?.inStockCount ?? 0),
  };
}

function toListingPageRow(
  row: ParallelPageSqlRow & { productId: string; productDocId: number },
  request: ResolvedListingRequest
): ListingPageRow {
  const cursorValues: ListingPageRow["cursorValues"] = {
    inStock: row.inStock ?? false,
    productId: row.productId,
  };

  switch (row.collectorKind) {
    case "matched_variant_price":
      cursorValues.priceMinor = row.priceMinor;
      cursorValues.variantDocId = row.variantDocId;
      break;
    case "relevance":
      cursorValues.relevanceScore = row.relevanceScore;
      break;
    case "product_sort":
    default:
      switch (request.sort.kind) {
        case "manual":
        case "name":
          cursorValues.textValue = row.textValue;
          break;
        case "newest":
          cursorValues.publishedAt = row.timestamptzValue;
          cursorValues.productCreatedAt = row.timestamptzValue2;
          break;
        case "created":
          cursorValues.productCreatedAt = row.timestamptzValue;
          break;
        case "price_asc":
        case "price_desc":
          cursorValues.bigintValue = row.bigintValue;
          break;
        case "relevance":
          cursorValues.relevanceScore = row.relevanceScore;
          break;
      }
      break;
  }

  const payload = {
    ...cursorValues,
    version: 1,
    hash: request.filterHash,
    sort: request.sort.kind,
  } as ListingCursorPayload;

  return {
    productDocId: row.productDocId,
    productId: row.productId,
    inStock: row.inStock ?? false,
    matchedVariantDocId: row.variantDocId ?? undefined,
    matchedPriceMinor: row.priceMinor ?? undefined,
    relevanceScore: row.relevanceScore ?? undefined,
    cursor: encodeListingCursor(payload),
    cursorValues: payload as unknown as Record<string, string | number | boolean | null>,
  };
}

function assertNoFacetResolutionError(
  rows: readonly FacetGuardSqlRow[]
): void {
  const errorRow = rows.find((row) => row.facetErrorCode);
  if (!errorRow?.facetErrorCode) {
    return;
  }

  switch (errorRow.facetErrorCode) {
    case "UNKNOWN_FACET_VALUE":
      throw new StorefrontRepositoryValidationError(
        `Unknown storefront facet value: ${errorRow.facetErrorValue}`,
        ["filters"]
      );
    case "UNSUPPORTED_PRICE_FACET_FILTER":
      throw new StorefrontRepositoryValidationError(
        "PRICE facet filters must use price range input",
        ["filters"]
      );
    case "INVALID_IN_STOCK_FACET_VALUE":
      throw new StorefrontRepositoryValidationError(
        "IN_STOCK facet value must be boolean-like",
        ["filters"]
      );
    case "CONFLICTING_IN_STOCK_FILTERS":
      throw new StorefrontRepositoryValidationError(
        "Conflicting in-stock filters",
        ["filters"]
      );
    default:
      throw new StorefrontRepositoryValidationError(
        `Invalid storefront facet filter: ${errorRow.facetErrorValue ?? errorRow.facetErrorCode}`,
        ["filters"]
      );
  }
}

function assertFacetRuntimeType(value: string): FacetRuntimeType {
  if (
    value === "TAG" ||
    value === "FEATURE" ||
    value === "OPTION" ||
    value === "PRICE" ||
    value === "IN_STOCK"
  ) {
    return value;
  }
  throw new StorefrontRepositoryValidationError(`Unsupported facet type: ${value}`);
}

function toPriceRange(value: unknown): PriceRangeResult | null {
  if (!value) {
    return null;
  }

  const record =
    typeof value === "string"
      ? (JSON.parse(value) as Record<string, unknown>)
      : (value as Record<string, unknown>);

  if (
    record.minPriceMinor === undefined ||
    record.maxPriceMinor === undefined ||
    typeof record.currency !== "string"
  ) {
    return null;
  }

  return {
    minPriceMinor: Number(record.minPriceMinor),
    maxPriceMinor: Number(record.maxPriceMinor),
    currency: record.currency,
  };
}

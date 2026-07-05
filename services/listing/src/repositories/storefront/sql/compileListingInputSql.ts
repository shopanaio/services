import { sql, type SQL } from "drizzle-orm";
import type {
  ResolvedListingRequest,
  StorefrontListingScope,
  StorefrontSortKind,
} from "../types.js";

export const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export interface ListingSqlRequest {
  storeId: string;
  locale: string;
  currency: string;
  scopeKind: StorefrontListingScope["kind"];
  scopeId: string;
  manualScopeId: string;
  sortKind: StorefrontSortKind;
  first: number;
  facetFiltersJson: string;
  vendorIdsJson: string;
  priceFilterJson: string;
  stockFilterJson: string;
  cursorJson: string;
  normalizedQuery: string | null;
  scope: StorefrontListingScope;
  request: ResolvedListingRequest;
  heavyOptionFacetCountsEnabled: boolean;
}

export function toListingSqlRequest(input: {
  storeId: string;
  request: ResolvedListingRequest;
  heavyOptionFacetCountsEnabled: boolean;
}): ListingSqlRequest {
  const { request } = input;

  return {
    storeId: input.storeId,
    locale: request.input.locale,
    currency: request.input.currency,
    scopeKind: request.input.scope.kind,
    scopeId: scopeIdFor(request.input.scope),
    manualScopeId: request.manualScopeId ?? ZERO_UUID,
    sortKind: request.sort.kind,
    first: request.input.first,
    facetFiltersJson: JSON.stringify(
      request.filters.facetFilters.map((filter) => ({
        facet_slug: filter.facetSlug,
        value_handle: filter.valueHandle,
      }))
    ),
    vendorIdsJson: JSON.stringify(request.filters.vendorIds),
    priceFilterJson: JSON.stringify(request.filters.priceRange ?? {}),
    stockFilterJson: JSON.stringify(
      request.filters.inStock === undefined
        ? {}
        : { value: request.filters.inStock }
    ),
    cursorJson: JSON.stringify(request.cursor?.payload ?? {}),
    normalizedQuery: request.normalizedQuery,
    scope: request.input.scope,
    request,
    heavyOptionFacetCountsEnabled: input.heavyOptionFacetCountsEnabled,
  };
}

export function compileListingInputSql(request: ListingSqlRequest): SQL {
  return sql`
    input AS (
      SELECT
        ${request.storeId}::uuid AS store_id,
        ${request.locale}::text AS locale,
        ${request.currency}::text AS currency,
        ${request.scopeKind}::text AS scope_kind,
        ${request.scopeId}::uuid AS scope_id,
        ${request.manualScopeId}::uuid AS manual_scope_id,
        ${request.sortKind}::text AS sort_kind,
        ${request.first}::int AS first,
        ${request.facetFiltersJson}::jsonb AS facet_filters_json,
        ${request.vendorIdsJson}::jsonb AS vendor_ids_json,
        ${request.priceFilterJson}::jsonb AS price_filter_json,
        ${request.stockFilterJson}::jsonb AS stock_filter_json,
        ${request.cursorJson}::jsonb AS cursor_json,
        NULLIF(${request.normalizedQuery ?? ""}::text, '') AS normalized_search_query
    )
  `;
}

function scopeIdFor(scope: StorefrontListingScope): string {
  switch (scope.kind) {
    case "category":
      return scope.categoryId;
    case "search":
      return ZERO_UUID;
  }
}

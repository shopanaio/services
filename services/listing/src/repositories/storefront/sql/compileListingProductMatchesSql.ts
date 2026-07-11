import { sql, type SQL } from "drizzle-orm";
import { StorefrontRepositoryValidationError } from "../types.js";
import type {
  ListingVariantTermGroup,
} from "../../../listing/variantTerms/index.js";
import {
  encodeListingVariantTerm,
} from "../../../listing/variantTerms/index.js";
import { coalesceBitmapSql, emptyRoaringBitmapSql } from "../sqlHelpers.js";
import type { ListingSqlRequest } from "./compileListingInputSql.js";

export function compileInputCte(request: ListingSqlRequest): SQL {
  return sql`
    input AS (
      SELECT
        ${request.storeId}::uuid AS store_id,
        ${request.locale}::text AS locale,
        ${request.currency}::text AS currency,
        ${request.first}::int AS first
    )
  `;
}

export function compileScopeProductCtes(request: ListingSqlRequest): SQL {
  const searchCandidates = needsSearchCandidates(request)
    ? sql`${compileSearchCandidateRowsCte(request)},`
    : sql``;
  return sql`
    ${searchCandidates}
    scope_products AS (
      SELECT ${compileScopeProductBitmapSql(request)} AS bitmap
    )
  `;
}

export function compileProductMatchesBitmapSql(
  request: ListingSqlRequest,
  options: {
    includeProductStock: boolean;
    includeVariantProjection: boolean;
  }
): SQL {
  const parts: SQL[] = [compileProductBaseBitmapSql(request)];

  if (options.includeVariantProjection && hasVariantPredicate(request)) {
    parts.push(
      compileProjectedVariantProductsBitmapSql(
        request,
        compileVariantCandidatesBitmapSql(request)
      )
    );
  }
  return andBitmapSql(parts);
}

export function compileProductBaseBitmapSql(
  request: ListingSqlRequest,
  options?: { excludeProductFacetId?: string }
): SQL {
  const parts: SQL[] = [sql`(SELECT bitmap FROM scope_products)`];
  const productFacetBitmap = compileProductFacetGroupsBitmapSql(
    request,
    options?.excludeProductFacetId
  );
  const vendorBitmap = compileVendorBitmapSql(request);
  if (productFacetBitmap) parts.push(productFacetBitmap);
  if (vendorBitmap) parts.push(vendorBitmap);
  return andBitmapSql(parts);
}

export function compilePricePredicateSql(
  request: ListingSqlRequest,
  alias: SQL
): SQL {
  const range = request.request.filterPlan.priceRange;
  if (!range) return sql``;
  const min = range.minPriceMinor === undefined
    ? sql``
    : sql`AND ${alias}.price_minor >= ${range.minPriceMinor}`;
  const max = range.maxPriceMinor === undefined
    ? sql``
    : sql`AND ${alias}.price_minor <= ${range.maxPriceMinor}`;
  return sql`${min} ${max}`;
}

export function compileOptionVariantPredicateSql(
  request: ListingSqlRequest,
  alias: SQL
): SQL {
  const bitmap = compileVariantTermGroupsBitmapSql(request);
  return bitmap ? sql`AND ${bitmap} @> ${alias}.variant_doc_id` : sql``;
}

/** Compatibility export: now returns all canonical term groups, not only OPTION. */
export function compileOptionVariantBitmapSql(
  request: ListingSqlRequest
): SQL | null {
  return compileVariantTermGroupsBitmapSql(request);
}

export function compileVariantTermGroupsBitmapSql(
  request: ListingSqlRequest,
  options?: { excludeGroupKey?: string }
): SQL | null {
  const groups = request.request.filterPlan.variantTermGroups.filter(
    (group) => group.groupKey !== options?.excludeGroupKey
  );
  if (groups.length === 0) return null;
  return andBitmapSql([
    compileIndexableUniverseBitmapSql(request),
    ...groups.map((group) => compileVariantTermGroupBitmapSql(request, group)),
  ]);
}

export function compileVariantCandidatesBitmapSql(
  request: ListingSqlRequest,
  options?: { excludeGroupKey?: string; excludePrice?: boolean }
): SQL {
  const parts: SQL[] = [compileIndexableUniverseBitmapSql(request)];
  const terms = compileVariantTermGroupsBitmapSql(request, options);
  if (terms) parts.push(terms);
  if (request.request.filterPlan.priceRange && !options?.excludePrice) {
    parts.push(compilePriceVariantBitmapSql(request));
  }
  return andBitmapSql(parts);
}

export function compileVariantCandidateDiagnosticsSql(
  request: ListingSqlRequest
): SQL {
  const termCandidates = compileVariantCandidatesBitmapSql(request, {
    excludePrice: true,
  });
  const numericCandidates = request.request.filterPlan.priceRange
    ? compilePriceVariantBitmapSql(request)
    : null;
  const finalCandidates = compileVariantCandidatesBitmapSql(request);
  const projected = compileProjectedVariantProductsBitmapSql(
    request,
    finalCandidates
  );
  return sql`
    /* listing:variantDiagnostics */
    SELECT
      rb_cardinality(${termCandidates})::int AS "termCandidateCardinality",
      ${numericCandidates
        ? sql`rb_cardinality(${numericCandidates})::int`
        : sql`NULL::int`} AS "numericCandidateCardinality",
      rb_cardinality(${finalCandidates})::int AS "finalVariantCandidateCardinality",
      rb_cardinality(${projected})::int AS "projectedProductCardinality"
  `;
}

export function compileProjectedVariantProductsBitmapSql(
  request: ListingSqlRequest,
  variantBitmap: SQL
): SQL {
  return coalesceBitmapSql(sql`(
    WITH variant_matches AS MATERIALIZED (
      SELECT ${variantBitmap} AS bitmap
    )
    SELECT rb_build_agg(vli.product_doc_id)
    FROM variant_matches vm
    CROSS JOIN LATERAL rb_iterate(vm.bitmap) AS matched(variant_doc_id)
    JOIN listing.variant_listing_index vli
      ON vli.store_id = ${request.storeId}::uuid
     AND vli.variant_doc_id = matched.variant_doc_id
  )`);
}

export function hasVariantPredicate(request: ListingSqlRequest): boolean {
  const plan = request.request.filterPlan;
  return plan.variantTermGroups.length > 0 || !!plan.priceRange;
}

/** Product availability is ordering/diagnostics only. */
export function shouldApplyProductStockAtProductLevel(
  _request: ListingSqlRequest
): boolean {
  return false;
}

export function compileVariantTermPostingBitmapSql(
  request: ListingSqlRequest,
  encodedValueKey: string
): SQL {
  return coalesceBitmapSql(sql`(
    SELECT p.bitmap
    FROM listing.listing_posting_bitmap p
    WHERE p.store_id = ${request.storeId}::uuid
      AND p.entity_type = 'variant'
      AND p.field = 'term'
      AND p.value_key = ${encodedValueKey}
  )`);
}

function compileVariantTermGroupBitmapSql(
  request: ListingSqlRequest,
  group: ListingVariantTermGroup
): SQL {
  if (group.terms.length === 0) return emptyRoaringBitmapSql();
  const encoded = group.terms.map(encodeListingVariantTerm);
  return coalesceBitmapSql(sql`(
    SELECT rb_or_agg(p.bitmap)
    FROM listing.listing_posting_bitmap p
    WHERE p.store_id = ${request.storeId}::uuid
      AND p.entity_type = 'variant'
      AND p.field = 'term'
      AND p.value_key IN (${joinTextValues(encoded)})
  )`);
}

function compileIndexableUniverseBitmapSql(request: ListingSqlRequest): SQL {
  const encoded = encodeListingVariantTerm({
    fieldKey: "system.state",
    valueKey: "indexable",
  });
  return coalesceBitmapSql(sql`(
    SELECT p.bitmap
    FROM listing.listing_posting_bitmap p
    WHERE p.store_id = ${request.storeId}::uuid
      AND p.entity_type = 'variant'
      AND p.field = 'term'
      AND p.value_key = ${encoded}
  )`);
}

function compilePriceVariantBitmapSql(request: ListingSqlRequest): SQL {
  return coalesceBitmapSql(sql`(
    SELECT rb_build_agg(vp.variant_doc_id)
    FROM listing.variant_listing_price_index vp
    WHERE vp.store_id = ${request.storeId}::uuid
      AND vp.currency = ${request.currency}
      AND vp.has_price = true
      AND vp.price_minor IS NOT NULL
      ${compilePricePredicateSql(request, sql`vp`)}
  )`);
}

function compileProductFacetGroupsBitmapSql(
  request: ListingSqlRequest,
  excludeFacetId?: string
): SQL | null {
  const groups = request.request.filterPlan.productFacetGroups.filter(
    (group) => group.facetId !== excludeFacetId
  );
  if (groups.length === 0) return null;
  return andBitmapSql(groups.map((group) => {
    if (group.valueKeys.length === 0) return emptyRoaringBitmapSql();
    return coalesceBitmapSql(sql`(
      SELECT rb_or_agg(p.bitmap)
      FROM listing.listing_posting_bitmap p
      WHERE p.store_id = ${request.storeId}::uuid
        AND p.entity_type = 'product'
        AND p.field = 'facet'
        AND p.value_key IN (${joinTextValues(group.valueKeys)})
    )`);
  }));
}

function compileVendorBitmapSql(request: ListingSqlRequest): SQL | null {
  const values = request.request.filterPlan.vendorIds;
  if (values.length === 0) return null;
  return coalesceBitmapSql(sql`(
    SELECT rb_or_agg(p.bitmap)
    FROM listing.listing_posting_bitmap p
    WHERE p.store_id = ${request.storeId}::uuid
      AND p.entity_type = 'product'
      AND p.field = 'vendor'
      AND p.value_key IN (${joinTextValues(values)})
  )`);
}

function compileSearchCandidateRowsCte(request: ListingSqlRequest): SQL {
  if (!request.normalizedQuery) {
    throw new StorefrontRepositoryValidationError(
      "Search scope requires a non-empty query"
    );
  }
  return sql`
    search_candidate_rows AS (
      SELECT
        pli.product_doc_id::int AS product_doc_id,
        pli.product_id AS product_id,
        pli.in_stock AS in_stock,
        pdb.score(ptsi.search_id)::double precision AS relevance_score
      FROM listing.product_title_bm25_search_index ptsi
      JOIN listing.product_listing_index pli
        ON pli.store_id = ptsi.store_id
       AND pli.product_id = ptsi.product_id
       AND pli.status = 'published'
      WHERE ptsi.store_id = ${request.storeId}::uuid
        AND ptsi.locale = ${request.locale}
        AND ptsi.status = 'published'
        AND ptsi.title @@@ ${request.normalizedQuery}
    )
  `;
}

function compileScopeProductBitmapSql(request: ListingSqlRequest): SQL {
  if (request.scopeKind === "category") {
    return sql`(
      ${compilePublishedProductBitmapSql(request)}
      & ${coalesceBitmapSql(sql`(
        SELECT p.bitmap FROM listing.listing_posting_bitmap p
        WHERE p.store_id = ${request.storeId}::uuid
          AND p.entity_type = 'product'
          AND p.field = 'category'
          AND p.value_key = ${request.scopeId}
      )`)}
    )`;
  }
  if (request.scopeKind === "search") {
    return coalesceBitmapSql(sql`(
      SELECT rb_build_agg(c.product_doc_id) FROM search_candidate_rows c
    )`);
  }
  return emptyRoaringBitmapSql();
}

function compilePublishedProductBitmapSql(request: ListingSqlRequest): SQL {
  return coalesceBitmapSql(sql`(
    SELECT rb_build_agg(pli.product_doc_id)
    FROM listing.product_listing_index pli
    WHERE pli.store_id = ${request.storeId}::uuid
      AND pli.status = 'published'
  )`);
}

function andBitmapSql(parts: readonly SQL[]): SQL {
  if (parts.length === 0) return emptyRoaringBitmapSql();
  return parts.slice(1).reduce((acc, part) => sql`(${acc} & ${part})`, parts[0]);
}

function joinTextValues(values: readonly string[]): SQL {
  return sql.join(values.map((value) => sql`${value}`), sql`, `);
}

function needsSearchCandidates(request: ListingSqlRequest): boolean {
  return request.scopeKind === "search" || request.sortKind === "relevance";
}

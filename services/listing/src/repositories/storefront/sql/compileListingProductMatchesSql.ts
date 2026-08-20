import { sql, type SQL } from "drizzle-orm";
import { StorefrontRepositoryValidationError } from "../types.js";
import type {
  ListingVariantTermGroup,
} from "../../../listing/variantTerms/index.js";
import {
  buildAvailabilityVariantTerm,
  encodeListingVariantTerm,
} from "../../../listing/variantTerms/index.js";
import { coalesceBitmapSql, emptyRoaringBitmapSql } from "../sqlHelpers.js";
import {
  ZERO_UUID,
  type ListingSqlRequest,
} from "./compileListingInputSql.js";
import { compileVariantProjectionSql } from "./compileVariantProjectionSql.js";

export function compileInputCte(request: ListingSqlRequest): SQL {
  return sql`
    input AS (
      SELECT
        ${request.storeId}::uuid AS store_id,
        ${request.locale}::listing.locale_code AS locale,
        ${request.currency}::listing.currency_code AS currency,
        ${request.first}::int AS first
    )
  `;
}

export function compileScopeProductCtes(request: ListingSqlRequest): SQL {
  const searchCandidates = request.sortKind === "relevance"
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
  const statusBitmap = compileProductStatusBitmapSql(request);
  if (productFacetBitmap) parts.push(productFacetBitmap);
  if (vendorBitmap) parts.push(vendorBitmap);
  if (statusBitmap) parts.push(statusBitmap);
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
  const policyAvailability = shouldHideOutOfStock(request)
    ? compileVariantTermPostingBitmapSql(
        request,
        encodeListingVariantTerm(buildAvailabilityVariantTerm(true)),
      )
    : null;
  if (groups.length === 0 && !policyAvailability) return null;
  return andBitmapSql([
    compileIndexableUniverseBitmapSql(request),
    ...groups.map((group) => compileVariantTermGroupBitmapSql(request, group)),
    ...(policyAvailability ? [policyAvailability] : []),
  ]);
}

export function compileVariantCandidatesBitmapSql(
  request: ListingSqlRequest,
  options?: {
    excludeGroupKey?: string;
    excludePrice?: boolean;
    priceBitmapSql?: SQL;
  }
): SQL {
  const terms = compileVariantTermGroupsBitmapSql(request, options);
  const collectionVariant =
    request.input.scope.kind === "collection" &&
    request.input.scope.variantBitmap
      ? sql`${request.input.scope.variantBitmap}::roaringbitmap`
      : null;
  const parts: SQL[] = [
    collectionVariant ?? compileIndexableUniverseBitmapSql(request),
  ];
  if (terms) parts.push(terms);
  if (request.request.filterPlan.priceRange && !options?.excludePrice) {
    parts.push(
      options?.priceBitmapSql ?? compilePriceVariantBitmapSql(request)
    );
  }
  return andBitmapSql(parts);
}

export function compileVariantCandidateDiagnosticsSql(
  request: ListingSqlRequest
): SQL {
  const termCandidates = compileVariantCandidatesBitmapSql(request, {
    excludePrice: true,
  });
  const hasNumericCandidates = !!request.request.filterPlan.priceRange;
  const numericCandidatesCte = hasNumericCandidates
    ? sql`,
      numeric_candidates AS MATERIALIZED (
        SELECT ${compilePriceVariantBitmapSql(request)} AS bitmap
      )`
    : sql``;
  const finalCandidates = hasNumericCandidates
    ? sql`(
      (SELECT bitmap FROM term_candidates)
      & (SELECT bitmap FROM numeric_candidates)
    )`
    : sql`(SELECT bitmap FROM term_candidates)`;
  const projected = compileProjectedVariantProductsBitmapSql(
    request,
    sql`(SELECT bitmap FROM final_candidates)`
  );
  return sql`
    /* listing:variantDiagnostics */
    WITH
    term_candidates AS MATERIALIZED (
      SELECT ${termCandidates} AS bitmap
    )
    ${numericCandidatesCte},
    final_candidates AS MATERIALIZED (
      SELECT ${finalCandidates} AS bitmap
    )
    SELECT
      rb_cardinality(
        (SELECT bitmap FROM term_candidates)
      )::int AS "termCandidateCardinality",
      ${hasNumericCandidates
        ? sql`rb_cardinality(
            (SELECT bitmap FROM numeric_candidates)
          )::int`
        : sql`NULL::int`} AS "numericCandidateCardinality",
      rb_cardinality(
        (SELECT bitmap FROM final_candidates)
      )::int AS "finalVariantCandidateCardinality",
      rb_cardinality(${projected})::int AS "projectedProductCardinality"
  `;
}

export function compileProjectedVariantProductsBitmapSql(
  request: ListingSqlRequest,
  variantBitmap: SQL
): SQL {
  return compileVariantProjectionSql({
    projectIdSql: sql`${request.storeId}::uuid`,
    variantBitmapSql: variantBitmap,
  });
}

export function hasVariantPredicate(request: ListingSqlRequest): boolean {
  const plan = request.request.filterPlan;
  return (
    (request.input.scope.kind === "collection" &&
      !!request.input.scope.variantBitmap) ||
    plan.variantTermGroups.length > 0 ||
    !!plan.priceRange ||
    shouldHideOutOfStock(request)
  );
}

export function shouldHideOutOfStock(request: ListingSqlRequest): boolean {
  return searchOutOfStockPolicy(request) === "HIDE";
}

export function shouldPlaceOutOfStockLast(request: ListingSqlRequest): boolean {
  return searchOutOfStockPolicy(request) === "PLACE_LAST";
}

export function shouldUseAvailabilityOrderBucket(
  request: ListingSqlRequest,
): boolean {
  return !request.searchCandidates || shouldPlaceOutOfStockLast(request);
}

/** Product availability is ordering/diagnostics only. */
export function shouldApplyProductStockAtProductLevel(
  _request: ListingSqlRequest
): boolean {
  return false;
}

function searchOutOfStockPolicy(request: ListingSqlRequest) {
  return request.searchCandidates?.request.configuration.settings
    .outOfStockPolicy ?? null;
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

export function compilePriceVariantBitmapSql(request: ListingSqlRequest): SQL {
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

function compileProductStatusBitmapSql(
  request: ListingSqlRequest,
): SQL | null {
  const statuses = request.request.filterPlan.productStatuses;
  if (statuses.length === 0) return null;
  return coalesceBitmapSql(sql`(
    SELECT rb_build_agg(p.product_doc_id)
    FROM listing.product_listing_index p
    WHERE p.store_id = ${request.storeId}::uuid
      AND p.status IN (${joinTextValues(statuses)})
  )`);
}

function compileSearchCandidateRowsCte(request: ListingSqlRequest): SQL {
  const contract = request.searchCandidates;
  if (!contract?.rankedCandidateRelationSql) {
    throw new StorefrontRepositoryValidationError(
      "Relevance sort requires a ranked search candidate relation"
    );
  }
  return sql`
    search_candidate_rows AS MATERIALIZED (
      SELECT
        ranked.product_doc_id::int AS product_doc_id,
        ranked.product_id AS product_id,
        availability.bool_value AS in_stock,
        ranked.identifier_priority::int AS identifier_priority,
        ranked.boosted AS boosted,
        ranked.relevance_rank::double precision AS relevance_rank,
        ranked.total_edit_distance::int AS total_edit_distance,
        ranked.minimum_trigram_similarity::double precision
          AS minimum_trigram_similarity
      FROM (${contract.rankedCandidateRelationSql}) ranked
      JOIN listing.product_listing_index pli
        ON pli.store_id = ${request.storeId}::uuid
       AND ranked.store_id = pli.store_id
       AND pli.product_doc_id = ranked.product_doc_id
       AND pli.product_id = ranked.product_id
      JOIN listing.listing_posting_product_sort availability
        ON availability.store_id = pli.store_id
       AND availability.product_doc_id = pli.product_doc_id
       AND availability.product_id = pli.product_id
       AND availability.sort_kind = 'availability'
       AND availability.locale IS NULL
       AND availability.currency IS NULL
       AND availability.manual_scope_id = ${ZERO_UUID}::uuid
      WHERE ranked.store_id = ${request.storeId}::uuid
        AND pli.status = 'published'
        AND ${contract.membershipBitmap}::roaringbitmap @> ranked.product_doc_id
    )
  `;
}

function compileScopeProductBitmapSql(request: ListingSqlRequest): SQL {
  const searchMembership = request.searchCandidates
    ? compileSearchMembershipBitmapSql(request)
    : null;
  let scopeBitmap: SQL;

  if (request.scopeKind === "category") {
    scopeBitmap = sql`(
      ${compilePublishedProductBitmapSql(request)}
      & ${coalesceBitmapSql(sql`(
        SELECT p.bitmap FROM listing.listing_posting_bitmap p
        WHERE p.store_id = ${request.storeId}::uuid
          AND p.entity_type = 'product'
          AND p.field = 'category'
          AND p.value_key = ${request.scopeId}
      )`)}
    )`;
  } else if (request.scopeKind === "collection") {
    const scope = request.input.scope;
    if (scope.kind !== "collection" || !scope.productBitmap.trim()) {
      return emptyRoaringBitmapSql();
    }
    scopeBitmap = sql`${scope.productBitmap}::roaringbitmap`;
  } else if (request.scopeKind === "global") {
    scopeBitmap = compilePublishedProductBitmapSql(request);
  } else {
    return emptyRoaringBitmapSql();
  }

  return searchMembership
    ? sql`(${scopeBitmap} & ${searchMembership})`
    : scopeBitmap;
}

function compileSearchMembershipBitmapSql(request: ListingSqlRequest): SQL {
  const contract = request.searchCandidates;
  if (!contract) {
    return emptyRoaringBitmapSql();
  }
  return sql`${contract.membershipBitmap}::roaringbitmap`;
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

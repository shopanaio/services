import { sql, type SQL } from "drizzle-orm";
import {
  buildOptionVariantTerm,
  encodeListingVariantTerm,
} from "../../../listing/variantTerms/index.js";
import type { ListingSqlRequest } from "./compileListingInputSql.js";
import {
  compileInputCte,
  compileProductBaseBitmapSql,
  compileProjectedVariantProductsBitmapSql,
  compileScopeProductCtes,
  compileVariantCandidatesBitmapSql,
  compileVariantTermPostingBitmapSql,
  hasVariantPredicate,
} from "./compileListingProductMatchesSql.js";

export const FACET_COUNTS_PROFILE_TARGETS = [
  "candidate_values",
  "visible_facet_values",
  "option_facet_values",
  "option_facet_counts",
] as const;
export const SIMPLE_FACET_COUNTS_PROFILE_TARGETS = FACET_COUNTS_PROFILE_TARGETS;
export type FacetCountsProfileTarget =
  (typeof FACET_COUNTS_PROFILE_TARGETS)[number];

export interface FacetCountsVisibleFacetValue {
  facetId: string;
  facetType: string;
  valueKey: string;
}

export function compileFacetCountsQuerySql(
  request: ListingSqlRequest,
  options: { visibleFacetValues?: readonly FacetCountsVisibleFacetValue[] } = {}
): SQL {
  const values = normalizeVisibleValues(options.visibleFacetValues ?? []);
  const producers = values.map((value) => compileValueCountSql(request, value));
  return sql`
    /* listing:facetCounts */
    WITH
    ${compileInputCte(request)},
    ${compileScopeProductCtes(request)}
    ${producers.length > 0
      ? sql.join(producers, sql` UNION ALL `)
      : emptyCountSelectSql()}
  `;
}

export function facetCountsProfileTargetsForRequest(
  _request: ListingSqlRequest
): readonly FacetCountsProfileTarget[] {
  return SIMPLE_FACET_COUNTS_PROFILE_TARGETS;
}

export function compileFacetCountsProfileQuerySql(
  request: ListingSqlRequest,
  target: FacetCountsProfileTarget,
  options: { visibleFacetValues?: readonly FacetCountsVisibleFacetValue[] } = {}
): SQL {
  const counts = compileFacetCountsQuerySql(request, options);
  return sql`
    /* listing:facetCountsProfile:${sql.raw(target)} */
    WITH measured AS MATERIALIZED (${counts})
    SELECT
      ${target}::text AS "target",
      COUNT(*)::int AS "rowCount",
      NULL::int AS "distinctSignatureCount",
      NULL::int AS "bitmapCardinality",
      COALESCE(SUM(measured."count"), 0)::int AS "countSum"
    FROM measured
  `;
}

function compileValueCountSql(
  request: ListingSqlRequest,
  value: FacetCountsVisibleFacetValue
): SQL {
  if (value.facetType === "OPTION") {
    const facetValueId = value.valueKey.slice(value.valueKey.indexOf(":") + 1);
    const encoded = encodeListingVariantTerm(
      buildOptionVariantTerm({ facetId: value.facetId, facetValueId })
    );
    const baseCandidates = compileVariantCandidatesBitmapSql(request, {
      excludeGroupKey: `option:${value.facetId}`,
    });
    const targetPosting = compileVariantTermPostingBitmapSql(request, encoded);
    const projected = compileProjectedVariantProductsBitmapSql(
      request,
      sql`(${baseCandidates} & ${targetPosting})`
    );
    const productBase = compileProductBaseBitmapSql(request);
    return countSelectSql(
      value,
      sql`rb_cardinality(${productBase} & ${projected})`
    );
  }

  const productBase = compileProductBaseBitmapSql(request, {
    excludeProductFacetId: value.facetId,
  });
  const targetPosting = sql`COALESCE((
    SELECT p.bitmap
    FROM listing.listing_posting_bitmap p
    WHERE p.store_id = ${request.storeId}::uuid
      AND p.entity_type = 'product'
      AND p.field = 'facet'
      AND p.value_key = ${value.valueKey}
  ), (
    SELECT rb_build_agg(doc_id) - rb_build_agg(doc_id)
    FROM (VALUES (0::int)) AS empty_seed(doc_id)
  ))`;
  const parts = [productBase, targetPosting];
  if (hasVariantPredicate(request)) {
    parts.push(
      compileProjectedVariantProductsBitmapSql(
        request,
        compileVariantCandidatesBitmapSql(request)
      )
    );
  }
  return countSelectSql(
    value,
    sql`rb_cardinality(${andBitmaps(parts)})`
  );
}

function countSelectSql(
  value: FacetCountsVisibleFacetValue,
  count: SQL
): SQL {
  return sql`
    SELECT
      NULL::text AS "facetErrorCode",
      NULL::text AS "facetErrorValue",
      ${value.facetId}::text AS "facetId",
      ${value.facetType}::text AS "facetType",
      ${value.valueKey}::text AS "valueKey",
      ${count}::int AS "count"
  `;
}

function emptyCountSelectSql(): SQL {
  return sql`
    SELECT
      NULL::text AS "facetErrorCode",
      NULL::text AS "facetErrorValue",
      NULL::text AS "facetId",
      NULL::text AS "facetType",
      NULL::text AS "valueKey",
      NULL::int AS "count"
    WHERE false
  `;
}

function normalizeVisibleValues(
  values: readonly FacetCountsVisibleFacetValue[]
): FacetCountsVisibleFacetValue[] {
  const byKey = new Map<string, FacetCountsVisibleFacetValue>();
  for (const value of values) {
    if (!value.facetId || !value.facetType || !value.valueKey) continue;
    byKey.set(`${value.facetId}\u0000${value.valueKey}`, value);
  }
  return [...byKey.values()].sort(
    (left, right) =>
      left.facetId.localeCompare(right.facetId) ||
      left.valueKey.localeCompare(right.valueKey)
  );
}

function andBitmaps(parts: readonly SQL[]): SQL {
  return parts.slice(1).reduce((acc, part) => sql`(${acc} & ${part})`, parts[0]);
}

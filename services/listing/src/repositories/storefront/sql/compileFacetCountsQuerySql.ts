import { sql, type SQL } from "drizzle-orm";
import {
  buildOptionVariantTerm,
  encodeListingVariantTerm,
} from "../../../listing/variantTerms/index.js";
import type { ListingSqlRequest } from "./compileListingInputSql.js";
import {
  compileInputCte,
  compileProductBaseBitmapSql,
  compilePriceVariantBitmapSql,
  compileProjectedVariantProductsBitmapSql,
  compileScopeProductCtes,
  compileVariantCandidatesBitmapSql,
  compileVariantTermPostingBitmapSql,
  hasVariantPredicate,
} from "./compileListingProductMatchesSql.js";

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
  const optionFacetIds = uniqueFacetIds(values, "OPTION");
  const productFacetIds = uniqueProductFacetIds(values);
  const sharedPriceBitmap = request.request.filterPlan.priceRange
    ? sql`(SELECT bitmap FROM price_variant_candidates)`
    : undefined;
  const producers = values.map((value) => compileValueCountSql(request, value));
  const priceCandidatesCte = request.request.filterPlan.priceRange
    ? sql`,
      price_variant_candidates AS MATERIALIZED (
        SELECT ${compilePriceVariantBitmapSql(request)} AS bitmap
      )`
    : sql``;
  const sharedVariantProductsCte =
    productFacetIds.length > 0 && hasVariantPredicate(request)
      ? sql`,
      shared_variant_products AS MATERIALIZED (
        SELECT ${compileProjectedVariantProductsBitmapSql(
          request,
          compileVariantCandidatesBitmapSql(request, {
            priceBitmapSql: sharedPriceBitmap,
          })
        )} AS bitmap
      )`
      : sql``;
  const optionFacetBasesCte = compileOptionFacetBasesCte(
    request,
    optionFacetIds,
    sharedPriceBitmap
  );
  const productFacetBasesCte = compileProductFacetBasesCte(
    request,
    productFacetIds
  );
  return sql`
    /* listing:facetCounts */
    WITH
    ${compileInputCte(request)},
    ${compileScopeProductCtes(request)}
    ${priceCandidatesCte},
    shared_product_base AS MATERIALIZED (
      SELECT ${compileProductBaseBitmapSql(request)} AS bitmap
    )
    ${sharedVariantProductsCte}
    ${optionFacetBasesCte}
    ${productFacetBasesCte}
    ${producers.length > 0
      ? sql.join(producers, sql` UNION ALL `)
      : emptyCountSelectSql()}
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
    const targetPosting = compileVariantTermPostingBitmapSql(request, encoded);
    const projected = compileProjectedVariantProductsBitmapSql(
      request,
      sql`(
        (SELECT bitmap FROM option_facet_bases
         WHERE facet_id = ${value.facetId})
        & ${targetPosting}
      )`
    );
    return countSelectSql(
      value,
      sql`rb_cardinality(
        (SELECT bitmap FROM shared_product_base) & ${projected}
      )`
    );
  }

  const productBase = sql`(
    SELECT bitmap FROM product_facet_bases
    WHERE facet_id = ${value.facetId}
  )`;
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
    parts.push(sql`(SELECT bitmap FROM shared_variant_products)`);
  }
  return countSelectSql(
    value,
    sql`rb_cardinality(${andBitmaps(parts)})`
  );
}

function compileOptionFacetBasesCte(
  request: ListingSqlRequest,
  facetIds: readonly string[],
  sharedPriceBitmap: SQL | undefined
): SQL {
  if (facetIds.length === 0) return sql``;
  const rows = facetIds.map((facetId) => sql`
    SELECT
      ${facetId}::text AS facet_id,
      ${compileVariantCandidatesBitmapSql(request, {
        excludeGroupKey: `option:${facetId}`,
        priceBitmapSql: sharedPriceBitmap,
      })} AS bitmap
  `);
  return sql`,
    option_facet_bases AS MATERIALIZED (
      ${sql.join(rows, sql` UNION ALL `)}
    )`;
}

function compileProductFacetBasesCte(
  request: ListingSqlRequest,
  facetIds: readonly string[]
): SQL {
  if (facetIds.length === 0) return sql``;
  const rows = facetIds.map((facetId) => sql`
    SELECT
      ${facetId}::text AS facet_id,
      ${compileProductBaseBitmapSql(request, {
        excludeProductFacetId: facetId,
      })} AS bitmap
  `);
  return sql`,
    product_facet_bases AS MATERIALIZED (
      ${sql.join(rows, sql` UNION ALL `)}
    )`;
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

function uniqueFacetIds(
  values: readonly FacetCountsVisibleFacetValue[],
  facetType: string
): string[] {
  return [
    ...new Set(
      values
        .filter((value) => value.facetType === facetType)
        .map((value) => value.facetId)
    ),
  ].sort();
}

function uniqueProductFacetIds(
  values: readonly FacetCountsVisibleFacetValue[]
): string[] {
  return [
    ...new Set(
      values
        .filter((value) => value.facetType !== "OPTION")
        .map((value) => value.facetId)
    ),
  ].sort();
}

function andBitmaps(parts: readonly SQL[]): SQL {
  return parts.slice(1).reduce((acc, part) => sql`(${acc} & ${part})`, parts[0]);
}

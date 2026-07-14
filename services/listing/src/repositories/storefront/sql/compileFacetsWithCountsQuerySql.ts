import { sql, type SQL } from "drizzle-orm";
import type { ListingSqlRequest } from "./compileListingInputSql.js";
import {
  compileInputCte,
  compilePriceVariantBitmapSql,
  compileProductBaseBitmapSql,
  compileScopeProductCtes,
  compileVariantCandidatesBitmapSql,
  hasVariantPredicate,
} from "./compileListingProductMatchesSql.js";
import { NARROW_VARIANT_PROJECTION_THRESHOLD } from "./compileVariantProjectionSql.js";
import { compileEligibleFacetIdsSql } from "../../facet/facetScopes.js";

const PRODUCT_FACET_VARIANT_BASE_KEY = "__product_facet_variant_base__";

export function compileFacetsWithCountsQuerySql(
  request: ListingSqlRequest
): SQL {
  const selectedValues = [
    ...request.request.filterPlan.productFacetGroups.flatMap((group) =>
      group.valueKeys
    ),
    ...request.request.filterPlan.optionFacetGroups.flatMap((group) =>
      group.valueKeys
    ),
  ];
  const selectedValuesCte = selectedValues.length > 0
    ? sql`SELECT value_key FROM (VALUES ${sql.join(
        [...new Set(selectedValues)].sort().map((value) => sql`(${value}::text)`),
        sql`, `
      )}) AS selected(value_key)`
    : sql`SELECT NULL::text AS value_key WHERE false`;
  const sharedPriceBitmap = request.request.filterPlan.priceRange
    ? sql`(SELECT bitmap FROM price_variant_candidates)`
    : undefined;
  const priceCandidatesCte = request.request.filterPlan.priceRange
    ? sql`,
      price_variant_candidates AS MATERIALIZED (
        SELECT ${compilePriceVariantBitmapSql(request)} AS bitmap
      )`
    : sql``;
  const optionFacetBasesCte = compileOptionFacetBasesCte(
    request,
    sharedPriceBitmap
  );
  const productFacetBasesCte = compileProductFacetBasesCte(request);
  const productFacetProjectionInput = hasVariantPredicate(request)
    ? sql`
      UNION ALL

      SELECT
        ${PRODUCT_FACET_VARIANT_BASE_KEY}::text AS projection_key,
        (SELECT bitmap FROM scope_variants)
          & (SELECT bitmap FROM shared_variant_base) AS bitmap
      WHERE EXISTS (
        SELECT 1
        FROM facet_values fv
        WHERE fv.facet_type <> 'OPTION'
      )
    `
    : sql``;
  const productFacetVariantIntersection = hasVariantPredicate(request)
    ? sql`& COALESCE(
        (
          SELECT p.product_bitmap
          FROM projected_variant_values p
          WHERE p.projection_key = ${PRODUCT_FACET_VARIANT_BASE_KEY}
        ),
        empty.bitmap
      )`
    : sql``;

  return sql`
    /* listing:facetsWithCounts */
    WITH
    ${compileInputCte(request)},
    ${compileScopeProductCtes(request)},
    eligible_facets AS MATERIALIZED (
      ${compileEligibleFacetIdsSql({
        storeIdSql: sql`${request.storeId}::uuid`,
        scope: request.scope,
      })}
    ),
    scoped_variant_rows AS MATERIALIZED (
      SELECT COALESCE(
        rb_build_agg(vli.variant_doc_id),
        (
          SELECT rb_build_agg(doc_id) - rb_build_agg(doc_id)
          FROM (VALUES (0::int)) AS empty_seed(doc_id)
        )
      ) AS bitmap
      FROM scope_products sp
      JOIN listing.variant_listing_index vli
        ON vli.store_id = ${request.storeId}::uuid
       AND sp.bitmap @> vli.product_doc_id
    ),
    scope_variants AS MATERIALIZED (
      SELECT scoped.bitmap & universe.bitmap AS bitmap
      FROM scoped_variant_rows scoped
      JOIN listing.listing_posting_bitmap universe
        ON universe.store_id = ${request.storeId}::uuid
       AND universe.entity_type = 'variant'
       AND universe.field = 'term'
       AND universe.value_key = '["v1","system.state","indexable"]'
    ),
    selected_values AS (
      ${selectedValuesCte}
    ),
    candidate_values AS (
      SELECT DISTINCT p.value_key
      FROM input i
      CROSS JOIN scope_products sp
      JOIN listing.listing_posting_bitmap p
        ON p.store_id = i.store_id
       AND p.entity_type = 'product'
       AND p.field = 'facet'
       AND rb_cardinality(sp.bitmap & p.bitmap) > 0

      UNION

      SELECT DISTINCT f.id::text || ':' || fv.id::text AS value_key
      FROM input i
      CROSS JOIN scope_variants sv
      JOIN listing.facet f
        ON f.store_id = i.store_id
       AND f.facet_type = 'OPTION'
      JOIN eligible_facets ef
        ON ef.facet_id = f.id
      JOIN listing.facet_value fv
        ON fv.store_id = f.store_id
       AND fv.facet_id = f.id
      JOIN listing.listing_posting_bitmap p
        ON p.store_id = i.store_id
       AND p.entity_type = 'variant'
       AND p.field = 'term'
       AND p.value_key = (
         '["v1","option:' || f.id::text || '","' || fv.id::text || '"]'
       )
       AND rb_cardinality(sv.bitmap & p.bitmap) > 0

      UNION

      SELECT value_key FROM selected_values
    ),
    facet_values AS MATERIALIZED (
      SELECT
        f.id::text AS facet_id,
        f.slug AS facet_slug,
        COALESCE(ft.label, f.slug) AS facet_label,
        f.facet_type,
        f.ui_type AS facet_ui_type,
        f.lexo_rank AS facet_rank,
        fv.id::text AS facet_value_id,
        fv.handle AS value_handle,
        COALESCE(fvt.label, fv.handle) AS value_label,
        fv.swatch_id::text AS swatch_id,
        fv.sort_index AS value_sort,
        f.id::text || ':' || fv.id::text AS value_key
      FROM input i
      JOIN listing.facet f
        ON f.store_id = i.store_id
      JOIN eligible_facets ef
        ON ef.facet_id = f.id
      LEFT JOIN listing.facet_translation ft
        ON ft.store_id = f.store_id
       AND ft.facet_id = f.id
       AND ft.locale = i.locale
      JOIN listing.facet_value fv
        ON fv.store_id = f.store_id
       AND fv.facet_id = f.id
       AND fv.parent_id IS NULL
       AND fv.kind IN ('group', 'source')
       AND fv.enabled = true
       AND fv.reference_status = 'VALID'
      LEFT JOIN listing.facet_value_translation fvt
        ON fvt.store_id = fv.store_id
       AND fvt.facet_value_id = fv.id
       AND fvt.locale = i.locale
      JOIN candidate_values cv
        ON cv.value_key = f.id::text || ':' || fv.id::text
      WHERE f.facet_type IN ('TAG', 'FEATURE', 'OPTION')
    )
    ${priceCandidatesCte},
    empty_bitmap AS MATERIALIZED (
      SELECT rb_build_agg(doc_id) - rb_build_agg(doc_id) AS bitmap
      FROM (VALUES (0::int)) AS empty_seed(doc_id)
    ),
    shared_product_base AS MATERIALIZED (
      SELECT ${compileProductBaseBitmapSql(request)} AS bitmap
    ),
    shared_variant_base AS MATERIALIZED (
      SELECT ${compileVariantCandidatesBitmapSql(request, {
        priceBitmapSql: sharedPriceBitmap,
      })} AS bitmap
    )
    ${optionFacetBasesCte}
    ${productFacetBasesCte},
    variant_projection_inputs AS MATERIALIZED (
      SELECT
        fv.value_key AS projection_key,
        sv.bitmap
          & COALESCE(ofb.bitmap, shared.bitmap)
          & posting.bitmap AS bitmap
      FROM facet_values fv
      CROSS JOIN scope_variants sv
      CROSS JOIN shared_variant_base shared
      LEFT JOIN option_facet_bases ofb
        ON ofb.facet_id = fv.facet_id
      JOIN listing.listing_posting_bitmap posting
        ON posting.store_id = ${request.storeId}::uuid
       AND posting.entity_type = 'variant'
       AND posting.field = 'term'
       AND posting.value_key = (
         '["v1","option:' || fv.facet_id || '","'
         || fv.facet_value_id || '"]'
       )
      WHERE fv.facet_type = 'OPTION'

      ${productFacetProjectionInput}
    ),
    variant_projection_matches AS MATERIALIZED (
      SELECT
        input.projection_key,
        input.bitmap,
        rb_cardinality(input.bitmap) AS matched_count
      FROM variant_projection_inputs input
    ),
    narrow_variant_projection_matches AS MATERIALIZED (
      SELECT
        matches.projection_key,
        matches.bitmap
      FROM variant_projection_matches matches
      WHERE matches.matched_count BETWEEN 1 AND ${NARROW_VARIANT_PROJECTION_THRESHOLD}
    ),
    narrow_projected_variant_values AS (
      SELECT
        matches.projection_key,
        rb_build_agg(vli.product_doc_id) AS product_bitmap
      FROM narrow_variant_projection_matches matches
      CROSS JOIN LATERAL rb_iterate(matches.bitmap) AS matched(variant_doc_id)
      JOIN listing.variant_listing_index vli
        ON vli.store_id = ${request.storeId}::uuid
       AND vli.variant_doc_id = matched.variant_doc_id
      GROUP BY matches.projection_key
      HAVING COUNT(vli.product_doc_id) > 0
    ),
    matched_projection_blocks AS MATERIALIZED (
      SELECT
        matches.projection_key,
        block.variant_bitmap,
        block.product_bitmap,
        block.variant_count,
        matches.bitmap & block.variant_bitmap AS block_match
      FROM variant_projection_matches matches
      JOIN listing.listing_posting_variant_storeion_block block
        ON block.store_id = ${request.storeId}::uuid
       AND rb_cardinality(matches.bitmap & block.variant_bitmap) > 0
      WHERE matches.matched_count > ${NARROW_VARIANT_PROJECTION_THRESHOLD}
    ),
    full_block_projected_variant_values AS (
      SELECT
        blocks.projection_key,
        rb_or_agg(blocks.product_bitmap) AS product_bitmap
      FROM matched_projection_blocks blocks
      WHERE rb_cardinality(blocks.block_match) = blocks.variant_count
      GROUP BY blocks.projection_key
    ),
    partial_block_projected_variant_values AS (
      SELECT
        blocks.projection_key,
        rb_build_agg(vli.product_doc_id) AS product_bitmap
      FROM matched_projection_blocks blocks
      CROSS JOIN LATERAL rb_iterate(blocks.block_match) AS matched(variant_doc_id)
      JOIN listing.variant_listing_index vli
        ON vli.store_id = ${request.storeId}::uuid
       AND vli.variant_doc_id = matched.variant_doc_id
      WHERE rb_cardinality(blocks.block_match) < blocks.variant_count
      GROUP BY blocks.projection_key
    ),
    projected_variant_values AS MATERIALIZED (
      SELECT
        projected.projection_key,
        rb_or_agg(projected.product_bitmap)
          FILTER (WHERE projected.product_bitmap IS NOT NULL) AS product_bitmap
      FROM (
        SELECT projection_key, product_bitmap
        FROM narrow_projected_variant_values

        UNION ALL

        SELECT projection_key, product_bitmap
        FROM full_block_projected_variant_values

        UNION ALL

        SELECT projection_key, product_bitmap
        FROM partial_block_projected_variant_values
      ) projected
      GROUP BY projected.projection_key
    ),
    option_counts AS (
      SELECT
        fv.value_key,
        rb_cardinality(
          product_base.bitmap & COALESCE(projected.product_bitmap, empty.bitmap)
        )::int AS count
      FROM facet_values fv
      CROSS JOIN shared_product_base product_base
      CROSS JOIN empty_bitmap empty
      LEFT JOIN projected_variant_values projected
        ON projected.projection_key = fv.value_key
      WHERE fv.facet_type = 'OPTION'
    ),
    product_facet_counts AS (
      SELECT
        fv.value_key,
        rb_cardinality(
          COALESCE(isolated_base.bitmap, shared_base.bitmap)
          & posting.bitmap
          ${productFacetVariantIntersection}
        )::int AS count
      FROM facet_values fv
      CROSS JOIN shared_product_base shared_base
      CROSS JOIN empty_bitmap empty
      LEFT JOIN product_facet_bases isolated_base
        ON isolated_base.facet_id = fv.facet_id
      JOIN listing.listing_posting_bitmap posting
        ON posting.store_id = ${request.storeId}::uuid
       AND posting.entity_type = 'product'
       AND posting.field = 'facet'
       AND posting.value_key = fv.value_key
      WHERE fv.facet_type <> 'OPTION'
    ),
    facet_counts AS (
      SELECT value_key, count FROM option_counts
      UNION ALL
      SELECT value_key, count FROM product_facet_counts
    )
    SELECT
      NULL::text AS "facetErrorCode",
      NULL::text AS "facetErrorValue",
      fv.facet_id AS "facetId",
      fv.facet_slug AS "facetSlug",
      fv.facet_label AS "facetLabel",
      fv.facet_type AS "facetType",
      fv.facet_ui_type AS "facetUiType",
      fv.facet_rank AS "facetRank",
      fv.facet_value_id AS "facetValueId",
      fv.value_handle AS "valueHandle",
      fv.value_label AS "valueLabel",
      fv.value_key AS "valueKey",
      fv.swatch_id AS "swatchId",
      fv.value_sort::int AS "valueSort",
      COALESCE(counts.count, 0)::int AS "count"
    FROM facet_values fv
    LEFT JOIN facet_counts counts
      ON counts.value_key = fv.value_key
    ORDER BY
      fv.facet_rank ASC NULLS LAST,
      fv.facet_id ASC NULLS LAST,
      fv.value_sort ASC NULLS LAST,
      fv.facet_value_id ASC NULLS LAST
  `;
}

function compileOptionFacetBasesCte(
  request: ListingSqlRequest,
  sharedPriceBitmap: SQL | undefined
): SQL {
  const facetIds = [
    ...new Set(
      request.request.filterPlan.optionFacetGroups.map((group) => group.facetId)
    ),
  ].sort();
  if (facetIds.length === 0) {
    return sql`,
      option_facet_bases AS MATERIALIZED (
        SELECT NULL::text AS facet_id, NULL::roaringbitmap AS bitmap
        WHERE false
      )`;
  }
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

function compileProductFacetBasesCte(request: ListingSqlRequest): SQL {
  const facetIds = [
    ...new Set(
      request.request.filterPlan.productFacetGroups.map((group) => group.facetId)
    ),
  ].sort();
  if (facetIds.length === 0) {
    return sql`,
      product_facet_bases AS MATERIALIZED (
        SELECT NULL::text AS facet_id, NULL::roaringbitmap AS bitmap
        WHERE false
      )`;
  }
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

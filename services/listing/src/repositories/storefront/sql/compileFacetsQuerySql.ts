import { sql, type SQL } from "drizzle-orm";
import type { ListingSqlRequest } from "./compileListingInputSql.js";
import {
  compileInputCte,
  compileScopeProductCtes,
} from "./compileListingProductMatchesSql.js";

export function compileFacetsQuerySql(request: ListingSqlRequest): SQL {
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
  return sql`
    /* listing:facetsMetadata */
    WITH
    ${compileInputCte(request)},
    ${compileScopeProductCtes(request)},
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
    facet_values AS (
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
      fv.value_sort::int AS "valueSort"
    FROM facet_values fv
    ORDER BY
      fv.facet_rank ASC NULLS LAST,
      fv.facet_id ASC NULLS LAST,
      fv.value_sort ASC NULLS LAST,
      fv.facet_value_id ASC NULLS LAST
  `;
}

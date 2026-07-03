import { sql, type SQL } from "drizzle-orm";
import { emptyRoaringBitmapSql } from "../sqlHelpers.js";
import type { ListingSqlRequest } from "./compileListingInputSql.js";
import { compileCoreListingSql } from "./compileMatchesSql.js";

export function compileFacetsQuerySql(request: ListingSqlRequest): SQL {
  return sql`
    WITH
    ${compileCoreListingSql(request)},
    scope_product_base AS (
      SELECT sp.bitmap & pp.bitmap AS bitmap
      FROM scope_products sp
      CROSS JOIN published_products pp
    ),
    scope_variants AS (
      SELECT COALESCE(rb_build_agg(vli.variant_doc_id), ${emptyRoaringBitmapSql()}) AS bitmap
      FROM listing.variant_listing_index vli
      JOIN input i ON true
      CROSS JOIN scope_product_base sp
      CROSS JOIN scope_variant_filters svf
      WHERE vli.project_id = i.project_id
        AND vli.in_stock = true
        AND sp.bitmap @> vli.product_doc_id
        AND (svf.bitmap IS NULL OR svf.bitmap @> vli.variant_doc_id)
    ),
    candidate_values AS (
      SELECT DISTINCT p.value_key
      FROM input i
      CROSS JOIN scope_product_base sp
      JOIN listing.listing_posting_bitmap p
        ON p.project_id = i.project_id
       AND p.entity_type = 'product'
       AND p.field = 'facet'
       AND rb_cardinality(sp.bitmap & p.bitmap) > 0

      UNION

      SELECT DISTINCT p.value_key
      FROM input i
      CROSS JOIN scope_variants sv
      JOIN listing.listing_posting_bitmap p
        ON p.project_id = i.project_id
       AND p.entity_type = 'variant'
       AND p.field = 'facet'
       AND rb_cardinality(sv.bitmap & p.bitmap) > 0
    ),
    facet_values AS (
      SELECT DISTINCT
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
      JOIN catalog.facet f
        ON f.project_id = i.project_id
      LEFT JOIN catalog.facet_translation ft
        ON ft.project_id = f.project_id
       AND ft.facet_id = f.id
       AND ft.locale = i.locale
      JOIN catalog.facet_value fv
        ON fv.project_id = f.project_id
       AND fv.facet_id = f.id
       AND fv.kind = 'display'
       AND fv.parent_id IS NULL
       AND fv.enabled = true
       AND fv.reference_status = 'VALID'
      LEFT JOIN catalog.facet_value_translation fvt
        ON fvt.project_id = fv.project_id
       AND fvt.facet_value_id = fv.id
       AND fvt.locale = i.locale
      JOIN candidate_values cv
        ON cv.value_key = f.id::text || ':' || fv.id::text
    )
    SELECT
      frg.error_code AS "facetErrorCode",
      frg.error_value AS "facetErrorValue",
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
    FROM facet_resolution_guard frg
    LEFT JOIN facet_values fv
      ON frg.error_code IS NULL
    ORDER BY
      fv.facet_rank ASC NULLS LAST,
      fv.facet_id ASC NULLS LAST,
      fv.value_sort ASC NULLS LAST,
      fv.facet_value_id ASC NULLS LAST
  `;
}

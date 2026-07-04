import { sql, type SQL } from "drizzle-orm";
import type { ListingSqlRequest } from "./compileListingInputSql.js";
import {
  compileInputCte,
  compileScopeProductCtes,
} from "./compileListingProductMatchesSql.js";

export function compileFacetsQuerySql(request: ListingSqlRequest): SQL {
  return sql`
    /* listing:facetsMetadata */
    WITH
    ${compileInputCte(request)},
    ${compileScopeProductCtes(request)},
    candidate_values AS (
      SELECT DISTINCT p.value_key
      FROM input i
      CROSS JOIN scope_products sp
      JOIN listing.listing_posting_bitmap p
        ON p.project_id = i.project_id
       AND p.entity_type = 'product'
       AND p.field = 'facet'
       AND rb_cardinality(sp.bitmap & p.bitmap) > 0

      UNION

      SELECT DISTINCT sv.value_key
      FROM input i
      CROSS JOIN scope_products sp
      JOIN listing.listing_option_signature os
        ON os.project_id = i.project_id
       AND rb_cardinality(sp.bitmap & os.product_bitmap) > 0
      JOIN listing.listing_option_signature_value sv
        ON sv.option_signature_id = os.option_signature_id
       AND sv.project_id = os.project_id
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
        ON f.project_id = i.project_id
      LEFT JOIN listing.facet_translation ft
        ON ft.project_id = f.project_id
       AND ft.facet_id = f.id
       AND ft.locale = i.locale
      JOIN listing.facet_value fv
        ON fv.project_id = f.project_id
       AND fv.facet_id = f.id
       AND fv.kind = 'display'
       AND fv.parent_id IS NULL
       AND fv.enabled = true
       AND fv.reference_status = 'VALID'
      LEFT JOIN listing.facet_value_translation fvt
        ON fvt.project_id = fv.project_id
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

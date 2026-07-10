import { sql, type SQL } from "drizzle-orm";

const TRUE_STOCK_HANDLES = ["true", "1", "yes", "in_stock", "available"];
const FALSE_STOCK_HANDLES = [
  "false",
  "0",
  "no",
  "out_of_stock",
  "unavailable",
];

export function compileFacetResolutionSql(): SQL {
  return sql`
    requested_facets AS (
      SELECT DISTINCT
        NULLIF(BTRIM(r.facet_slug), '') AS facet_slug,
        NULLIF(BTRIM(r.value_handle), '') AS value_handle
      FROM input i
      CROSS JOIN LATERAL jsonb_to_recordset(i.facet_filters_json)
        AS r(facet_slug text, value_handle text)
      WHERE NULLIF(BTRIM(r.facet_slug), '') IS NOT NULL
        AND NULLIF(BTRIM(r.value_handle), '') IS NOT NULL
    ),
    candidate_facets AS (
      SELECT
        r.facet_slug AS requested_facet_slug,
        r.value_handle AS requested_value_handle,
        f.id::text AS facet_id,
        f.slug AS facet_slug,
        f.facet_type,
        COALESCE(parent_fv.id, fv.id)::text AS facet_value_id,
        COALESCE(parent_fv.handle, fv.handle) AS value_handle,
        f.id::text || ':' || COALESCE(parent_fv.id, fv.id)::text AS value_key,
        CASE
          WHEN f.id IS NULL THEN 'FACET_MISSING'
          WHEN fv.id IS NULL THEN 'VALUE_MISSING'
          WHEN fv.kind = 'display' AND fv.parent_id IS NOT NULL THEN 'DISPLAY_NOT_ROOT'
          WHEN fv.kind = 'display' AND fv.enabled = false THEN 'VALUE_DISABLED'
          WHEN fv.kind = 'display' AND fv.reference_status <> 'VALID' THEN 'VALUE_REFERENCE_INVALID'
          WHEN fv.kind = 'display' THEN 'VALID'
          WHEN fv.kind = 'source' AND fv.enabled = false THEN 'VALUE_DISABLED'
          WHEN fv.kind = 'source' AND fv.reference_status <> 'VALID' THEN 'VALUE_REFERENCE_INVALID'
          WHEN fv.kind = 'source' AND parent_fv.id IS NULL THEN 'DISPLAY_PARENT_MISSING'
          WHEN fv.kind = 'source' AND parent_fv.enabled = false THEN 'DISPLAY_PARENT_DISABLED'
          WHEN fv.kind = 'source' AND parent_fv.reference_status <> 'VALID' THEN 'DISPLAY_PARENT_REFERENCE_INVALID'
          WHEN fv.kind = 'source' THEN 'VALID'
          ELSE 'VALUE_KIND_UNSUPPORTED'
        END AS resolution_status,
        fv.parent_id IS NULL AS is_root,
        fv.kind = 'display' AS is_display
      FROM requested_facets r
      JOIN input i ON true
      LEFT JOIN listing.facet f
        ON f.store_id = i.store_id
       AND f.slug = r.facet_slug
      LEFT JOIN listing.facet_value fv
        ON fv.store_id = f.store_id
       AND fv.facet_id = f.id
       AND fv.handle = r.value_handle
      LEFT JOIN listing.facet_value parent_fv
        ON parent_fv.store_id = fv.store_id
       AND parent_fv.id = fv.parent_id
       AND parent_fv.kind = 'display'
       AND parent_fv.parent_id IS NULL
    ),
    resolved_facets AS (
      SELECT DISTINCT ON (requested_facet_slug, requested_value_handle)
        requested_facet_slug,
        requested_value_handle,
        facet_id,
        facet_slug,
        facet_type,
        facet_value_id,
        value_handle,
        value_key
      FROM candidate_facets
      WHERE resolution_status = 'VALID'
      ORDER BY
        requested_facet_slug,
        requested_value_handle,
        is_root DESC NULLS LAST,
        is_display DESC NULLS LAST,
        facet_value_id ASC
    ),
    missing_requested_facets AS (
      SELECT cf.requested_facet_slug AS facet_slug, cf.requested_value_handle AS value_handle
      FROM candidate_facets cf
      WHERE cf.resolution_status IN ('FACET_MISSING', 'VALUE_MISSING')
    ),
    invalid_requested_facets AS (
      SELECT DISTINCT ON (cf.requested_facet_slug, cf.requested_value_handle)
        cf.requested_facet_slug AS facet_slug,
        cf.requested_value_handle AS value_handle,
        cf.resolution_status AS error_code,
        CASE cf.resolution_status
          WHEN 'VALUE_DISABLED' THEN 10
          WHEN 'VALUE_REFERENCE_INVALID' THEN 20
          WHEN 'DISPLAY_NOT_ROOT' THEN 30
          WHEN 'DISPLAY_PARENT_MISSING' THEN 40
          WHEN 'DISPLAY_PARENT_DISABLED' THEN 50
          WHEN 'DISPLAY_PARENT_REFERENCE_INVALID' THEN 60
          WHEN 'VALUE_KIND_UNSUPPORTED' THEN 70
          ELSE 100
        END AS priority
      FROM candidate_facets cf
      WHERE cf.resolution_status NOT IN ('VALID', 'FACET_MISSING', 'VALUE_MISSING')
        AND NOT EXISTS (
          SELECT 1
          FROM candidate_facets valid_cf
          WHERE valid_cf.requested_facet_slug = cf.requested_facet_slug
            AND valid_cf.requested_value_handle = cf.requested_value_handle
            AND valid_cf.resolution_status = 'VALID'
        )
      ORDER BY
        cf.requested_facet_slug,
        cf.requested_value_handle,
        priority ASC,
        cf.facet_value_id ASC NULLS LAST
    ),
    unsupported_price_facet_filters AS (
      SELECT
        rf.requested_facet_slug AS facet_slug,
        rf.requested_value_handle AS value_handle
      FROM resolved_facets rf
      WHERE rf.facet_type = 'PRICE'
    ),
    stock_facet_values AS (
      SELECT DISTINCT
        rf.requested_facet_slug AS facet_slug,
        rf.requested_value_handle AS value_handle,
        LOWER(BTRIM(rf.requested_value_handle)) AS normalized_value
      FROM resolved_facets rf
      WHERE rf.facet_type = 'IN_STOCK'
    ),
    stock_facet_filter AS (
      SELECT
        COUNT(*) FILTER (
          WHERE normalized_value NOT IN (${sql.join(
            [...TRUE_STOCK_HANDLES, ...FALSE_STOCK_HANDLES].map(
              (handle) => sql`${handle}`
            ),
            sql`, `
          )})
        )::int AS invalid_count,
        MIN(facet_slug || ':' || value_handle) FILTER (
          WHERE normalized_value NOT IN (${sql.join(
            [...TRUE_STOCK_HANDLES, ...FALSE_STOCK_HANDLES].map(
              (handle) => sql`${handle}`
            ),
            sql`, `
          )})
        ) AS first_invalid_value,
        COALESCE(BOOL_OR(normalized_value IN (${sql.join(
          TRUE_STOCK_HANDLES.map((handle) => sql`${handle}`),
          sql`, `
        )})), false) AS has_true,
        COALESCE(BOOL_OR(normalized_value IN (${sql.join(
          FALSE_STOCK_HANDLES.map((handle) => sql`${handle}`),
          sql`, `
        )})), false) AS has_false
      FROM stock_facet_values
    ),
    direct_stock_filter AS (
      SELECT
        i.stock_filter_json ? 'value' AS has_value,
        CASE
          WHEN i.stock_filter_json ? 'value'
          THEN (i.stock_filter_json->>'value')::boolean
          ELSE NULL
        END AS value
      FROM input i
    ),
    stock_filter_state AS (
      SELECT
        CASE
          WHEN sff.invalid_count > 0 THEN false
          WHEN sff.has_true AND sff.has_false THEN false
          WHEN dsf.has_value THEN true
          WHEN sff.has_true OR sff.has_false THEN true
          ELSE false
        END AS has_value,
        CASE
          WHEN dsf.has_value THEN dsf.value
          WHEN sff.has_true THEN true
          WHEN sff.has_false THEN false
          ELSE NULL
        END AS value,
        CASE
          WHEN sff.invalid_count > 0 THEN 'INVALID_IN_STOCK_FACET_VALUE'
          WHEN sff.has_true AND sff.has_false THEN 'CONFLICTING_IN_STOCK_FILTERS'
          WHEN dsf.has_value
           AND (
             (dsf.value = true AND sff.has_false)
             OR (dsf.value = false AND sff.has_true)
           )
          THEN 'CONFLICTING_IN_STOCK_FILTERS'
          ELSE NULL
        END AS error_code,
        CASE
          WHEN sff.invalid_count > 0 THEN sff.first_invalid_value
          WHEN sff.has_true AND sff.has_false THEN 'in_stock'
          WHEN dsf.has_value
           AND (
             (dsf.value = true AND sff.has_false)
             OR (dsf.value = false AND sff.has_true)
           )
          THEN 'in_stock'
          ELSE NULL
        END AS error_value
      FROM direct_stock_filter dsf
      CROSS JOIN stock_facet_filter sff
    ),
    facet_resolution_guard AS (
      SELECT
        CASE
          WHEN missing.missing_count > 0 THEN 'UNKNOWN_FACET_VALUE'
          WHEN invalid.invalid_count > 0 THEN invalid.first_error_code
          WHEN unsupported_price.unsupported_count > 0
            THEN 'UNSUPPORTED_PRICE_FACET_FILTER'
          WHEN sfs.error_code IS NOT NULL THEN sfs.error_code
          ELSE NULL
        END AS error_code,
        CASE
          WHEN missing.missing_count > 0 THEN missing.first_missing_value
          WHEN invalid.invalid_count > 0 THEN invalid.first_invalid_value
          WHEN unsupported_price.unsupported_count > 0
            THEN unsupported_price.first_unsupported_value
          WHEN sfs.error_code IS NOT NULL THEN sfs.error_value
          ELSE NULL
        END AS error_value
      FROM (
        SELECT
          COUNT(*)::int AS missing_count,
          MIN(facet_slug || ':' || value_handle) AS first_missing_value
        FROM missing_requested_facets
      ) missing
      CROSS JOIN (
        SELECT
          COUNT(*)::int AS invalid_count,
          (ARRAY_AGG(error_code ORDER BY priority ASC, facet_slug || ':' || value_handle ASC))[1] AS first_error_code,
          (ARRAY_AGG(facet_slug || ':' || value_handle ORDER BY priority ASC, facet_slug || ':' || value_handle ASC))[1] AS first_invalid_value
        FROM invalid_requested_facets
      ) invalid
      CROSS JOIN (
        SELECT
          COUNT(*)::int AS unsupported_count,
          MIN(facet_slug || ':' || value_handle) AS first_unsupported_value
        FROM unsupported_price_facet_filters
      ) unsupported_price
      CROSS JOIN stock_filter_state sfs
    )
  `;
}

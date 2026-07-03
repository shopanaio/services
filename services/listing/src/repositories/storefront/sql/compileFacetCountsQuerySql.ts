import { sql } from "drizzle-orm";
import { emptyRoaringBitmapSql } from "../sqlHelpers.js";
import type { ListingSqlRequest } from "./compileListingInputSql.js";
import { compileCoreListingSql } from "./compileMatchesSql.js";

export function compileFacetCountsQuerySql(request: ListingSqlRequest) {
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
    visible_facet_values AS (
      SELECT DISTINCT
        f.id::text AS facet_id,
        f.facet_type,
        fv.id::text AS facet_value_id,
        fv.sort_index AS value_sort,
        f.id::text || ':' || fv.id::text AS value_key
      FROM input i
      JOIN catalog.facet f
        ON f.project_id = i.project_id
      JOIN catalog.facet_value fv
        ON fv.project_id = f.project_id
       AND fv.facet_id = f.id
       AND fv.kind = 'display'
       AND fv.parent_id IS NULL
       AND fv.enabled = true
       AND fv.reference_status = 'VALID'
      JOIN candidate_values cv
        ON cv.value_key = f.id::text || ':' || fv.id::text
    ),
    product_facet_values AS (
      SELECT *
      FROM visible_facet_values
      WHERE facet_type IN ('TAG', 'FEATURE')
    ),
    option_facet_values AS (
      SELECT *
      FROM visible_facet_values
      WHERE facet_type = 'OPTION'
    ),
    product_facet_value_bitmaps AS (
      SELECT
        fv.facet_id,
        fv.facet_type,
        fv.value_key,
        p.bitmap AS value_bitmap
      FROM product_facet_values fv
      JOIN input i ON true
      JOIN listing.listing_posting_bitmap p
        ON p.project_id = i.project_id
       AND p.entity_type = 'product'
       AND p.field = 'facet'
       AND p.value_key = fv.value_key
    ),
    product_facet_counts AS (
      SELECT
        pvb.facet_id,
        pvb.facet_type,
        pvb.value_key,
        rb_cardinality(
          (
            SELECT
              CASE
                WHEN isolated_product_filters.bitmap IS NOT NULL
                 AND projected_variant_products.bitmap IS NOT NULL
                THEN scope_products.bitmap
                  & published_products.bitmap
                  & isolated_product_filters.bitmap
                  & projected_variant_products.bitmap
                WHEN isolated_product_filters.bitmap IS NOT NULL
                THEN scope_products.bitmap
                  & published_products.bitmap
                  & isolated_product_filters.bitmap
                WHEN projected_variant_products.bitmap IS NOT NULL
                THEN scope_products.bitmap
                  & published_products.bitmap
                  & projected_variant_products.bitmap
                ELSE scope_products.bitmap & published_products.bitmap
              END
            FROM scope_products
            CROSS JOIN published_products
            CROSS JOIN projected_variant_products
            CROSS JOIN LATERAL (
              SELECT rb_and_agg(bitmap) AS bitmap
              FROM (
                SELECT pfg.bitmap
                FROM product_filter_groups pfg
                WHERE pfg.facet_id <> pvb.facet_id

                UNION ALL

                SELECT bitmap FROM vendor_filter_group
                WHERE EXISTS (
                  SELECT 1
                  FROM input i
                  CROSS JOIN LATERAL jsonb_array_elements_text(i.vendor_ids_json)
                    v(vendor_id)
                )

                UNION ALL

                SELECT bitmap
                FROM active_stock_product_filter
                WHERE bitmap IS NOT NULL
              ) isolated_product_filter_parts
            ) isolated_product_filters
          )
          & pvb.value_bitmap
        )::int AS count
      FROM product_facet_value_bitmaps pvb
    ),
    option_facet_value_bitmaps AS (
      SELECT
        fv.facet_id,
        fv.facet_type,
        fv.value_key,
        p.bitmap AS value_bitmap
      FROM option_facet_values fv
      JOIN input i ON true
      JOIN listing.listing_posting_bitmap p
        ON p.project_id = i.project_id
       AND p.entity_type = 'variant'
       AND p.field = 'facet'
       AND p.value_key = fv.value_key
    ),
    option_facet_counts AS (
      SELECT
        ovb.facet_id,
        ovb.facet_type,
        ovb.value_key,
        rb_cardinality(
          (
            SELECT COALESCE(rb_build_agg(vli.product_doc_id), ${emptyRoaringBitmapSql()})
            FROM (
              SELECT rb_and_agg(option_variant_parts.bitmap) AS bitmap
              FROM in_stock_variants
              CROSS JOIN LATERAL (
                SELECT COALESCE(
                  (SELECT bitmap FROM active_stock_variant_filter),
                  in_stock_variants.bitmap
                ) AS bitmap
              ) option_count_stock_filter
              CROSS JOIN price_variant_filter
              CROSS JOIN LATERAL (
                SELECT rb_and_agg(ofg.bitmap) AS bitmap
                FROM option_filter_groups ofg
                WHERE ofg.facet_id <> ovb.facet_id
              ) isolated_option_filters
              CROSS JOIN LATERAL (
                SELECT bitmap
                FROM (
                  SELECT option_count_stock_filter.bitmap
                  UNION ALL
                  SELECT scope_variant_filters.bitmap
                  FROM scope_variant_filters
                  WHERE scope_variant_filters.bitmap IS NOT NULL
                  UNION ALL
                  SELECT isolated_option_filters.bitmap
                  WHERE isolated_option_filters.bitmap IS NOT NULL
                  UNION ALL
                  SELECT price_variant_filter.bitmap
                  WHERE price_variant_filter.bitmap IS NOT NULL
                  UNION ALL
                  SELECT ovb.value_bitmap
                ) option_variant_parts
              ) option_variant_parts
            ) option_variant_bitmap
            JOIN input i ON true
            JOIN listing.variant_listing_index vli
              ON vli.project_id = i.project_id
             AND option_variant_bitmap.bitmap @> vli.variant_doc_id
          )
          & (
            SELECT
              CASE
                WHEN product_filters.bitmap IS NOT NULL
                THEN scope_products.bitmap & published_products.bitmap & product_filters.bitmap
                ELSE scope_products.bitmap & published_products.bitmap
              END
            FROM scope_products
            CROSS JOIN published_products
            CROSS JOIN product_filters
          )
        )::int AS count
      FROM option_facet_value_bitmaps ovb
    ),
    counts AS (
      SELECT * FROM product_facet_counts
      UNION ALL
      SELECT * FROM option_facet_counts
    )
    SELECT
      frg.error_code AS "facetErrorCode",
      frg.error_value AS "facetErrorValue",
      c.facet_id AS "facetId",
      c.facet_type AS "facetType",
      c.value_key AS "valueKey",
      c.count::int AS "count"
    FROM facet_resolution_guard frg
    LEFT JOIN counts c
      ON frg.error_code IS NULL
  `;
}

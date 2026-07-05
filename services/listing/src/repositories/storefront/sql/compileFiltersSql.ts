import { sql, type SQL } from "drizzle-orm";
import { emptyRoaringBitmapSql } from "../sqlHelpers.js";
import { compileVariantProjectionSql } from "./compileVariantProjectionSql.js";

export function compileFiltersSql(): SQL {
  return sql`
    product_filter_groups AS (
      SELECT
        rf.facet_id,
        COALESCE(
          rb_or_agg(p.bitmap) FILTER (WHERE p.bitmap IS NOT NULL),
          ${emptyRoaringBitmapSql()}
        ) AS bitmap
      FROM resolved_facets rf
      JOIN input i ON true
      LEFT JOIN listing.listing_posting_bitmap p
        ON p.store_id = i.store_id
       AND p.entity_type = 'product'
       AND p.field = 'facet'
       AND p.value_key = rf.value_key
      WHERE rf.facet_type IN ('TAG', 'FEATURE')
      GROUP BY rf.facet_id
    ),
    vendor_filter_group AS (
      SELECT
        '__vendor__'::text AS facet_id,
        COALESCE(
          rb_or_agg(p.bitmap) FILTER (WHERE p.bitmap IS NOT NULL),
          ${emptyRoaringBitmapSql()}
        ) AS bitmap
      FROM input i
      CROSS JOIN LATERAL jsonb_array_elements_text(i.vendor_ids_json) v(vendor_id)
      LEFT JOIN listing.listing_posting_bitmap p
        ON p.store_id = i.store_id
       AND p.entity_type = 'product'
       AND p.field = 'vendor'
       AND p.value_key = v.vendor_id
    ),
    option_filter_groups AS (
      SELECT
        rf.facet_id,
        COALESCE(
          rb_or_agg(p.bitmap) FILTER (WHERE p.bitmap IS NOT NULL),
          ${emptyRoaringBitmapSql()}
        ) AS bitmap
      FROM resolved_facets rf
      JOIN input i ON true
      LEFT JOIN listing.listing_posting_bitmap p
        ON p.store_id = i.store_id
       AND p.entity_type = 'variant'
       AND p.field = 'facet'
       AND p.value_key = rf.value_key
      WHERE rf.facet_type = 'OPTION'
      GROUP BY rf.facet_id
    ),
    active_stock_product_filter AS (
      SELECT
        CASE
          WHEN sfs.has_value
           AND NOT EXISTS (SELECT 1 FROM option_filter_groups)
           AND i.price_filter_json = '{}'::jsonb
           AND (SELECT bitmap FROM scope_variant_filters) IS NULL
          THEN COALESCE((
            SELECT rb_build_agg(pli.product_doc_id)
            FROM listing.product_listing_index pli
            WHERE pli.store_id = i.store_id
              AND pli.status = 'published'
              AND pli.in_stock = sfs.value
          ), ${emptyRoaringBitmapSql()})
          ELSE NULL
        END AS bitmap
      FROM input i
      CROSS JOIN stock_filter_state sfs
    ),
    product_filters AS (
      SELECT rb_and_agg(bitmap) AS bitmap
      FROM (
        SELECT bitmap FROM product_filter_groups
        UNION ALL
        SELECT bitmap FROM vendor_filter_group
        WHERE EXISTS (
          SELECT 1
          FROM input i
          CROSS JOIN LATERAL jsonb_array_elements_text(i.vendor_ids_json) v(vendor_id)
        )
        UNION ALL
        SELECT bitmap FROM active_stock_product_filter WHERE bitmap IS NOT NULL
      ) x
    ),
    in_stock_variants AS (
      SELECT COALESCE(rb_build_agg(vli.variant_doc_id), ${emptyRoaringBitmapSql()}) AS bitmap
      FROM listing.variant_listing_index vli
      JOIN input i ON true
      WHERE vli.store_id = i.store_id
        AND vli.in_stock = true
    ),
    active_stock_variant_filter AS (
      SELECT
        CASE
          WHEN sfs.has_value
          THEN COALESCE((
            SELECT rb_build_agg(vli.variant_doc_id)
            FROM listing.variant_listing_index vli
            WHERE vli.store_id = i.store_id
              AND vli.in_stock = sfs.value
          ), ${emptyRoaringBitmapSql()})
          WHEN EXISTS (SELECT 1 FROM option_filter_groups)
            OR i.price_filter_json <> '{}'::jsonb
          THEN (SELECT bitmap FROM in_stock_variants)
          ELSE NULL
        END AS bitmap
      FROM input i
      CROSS JOIN stock_filter_state sfs
    ),
    price_variant_filter AS (
      SELECT
        CASE
          WHEN i.price_filter_json <> '{}'::jsonb
          THEN COALESCE((
            SELECT rb_build_agg(vp.variant_doc_id)
            FROM listing.variant_listing_price_index vp
            JOIN listing.variant_listing_index vli
              ON vli.store_id = vp.store_id
             AND vli.variant_id = vp.variant_id
             AND vli.in_stock = true
            WHERE vp.store_id = i.store_id
              AND vp.currency = i.currency
              AND vp.has_price = true
              AND vp.price_minor IS NOT NULL
              AND vp.variant_doc_id IS NOT NULL
              AND vp.product_doc_id IS NOT NULL
              AND vp.product_id IS NOT NULL
              AND (
                NOT (i.price_filter_json ? 'minPriceMinor')
                OR vp.price_minor >= (i.price_filter_json->>'minPriceMinor')::bigint
              )
              AND (
                NOT (i.price_filter_json ? 'maxPriceMinor')
                OR vp.price_minor <= (i.price_filter_json->>'maxPriceMinor')::bigint
              )
          ), ${emptyRoaringBitmapSql()})
          ELSE NULL
        END AS bitmap
      FROM input i
    ),
    variant_filters AS (
      SELECT
        CASE
          WHEN EXISTS (SELECT 1 FROM option_filter_groups)
            OR (SELECT bitmap FROM price_variant_filter) IS NOT NULL
            OR (SELECT bitmap FROM active_stock_variant_filter) IS NOT NULL
            OR (SELECT bitmap FROM scope_variant_filters) IS NOT NULL
          THEN (
            SELECT rb_and_agg(bitmap)
            FROM (
              SELECT bitmap FROM scope_variant_filters WHERE bitmap IS NOT NULL
              UNION ALL
              SELECT bitmap FROM option_filter_groups
              UNION ALL
              SELECT bitmap FROM price_variant_filter WHERE bitmap IS NOT NULL
              UNION ALL
              SELECT bitmap FROM active_stock_variant_filter WHERE bitmap IS NOT NULL
            ) x
          )
          ELSE NULL
        END AS bitmap
    ),
    projected_variant_products AS (
      SELECT
        CASE
          WHEN (SELECT bitmap FROM variant_filters) IS NULL
          THEN NULL
          ELSE ${compileVariantProjectionSql({
            projectIdSql: sql`(SELECT store_id FROM input)`,
            variantBitmapSql: sql`(SELECT bitmap FROM variant_filters)`,
          })}
        END AS bitmap
    )
  `;
}

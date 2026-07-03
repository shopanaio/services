import { sql } from "drizzle-orm";
import { emptyRoaringBitmapSql } from "../sqlHelpers.js";
import type { ListingSqlRequest } from "./compileListingInputSql.js";
import { compileCoreListingSql } from "./compileMatchesSql.js";

export function compileVirtualFacetsQuerySql(request: ListingSqlRequest) {
  return sql`
    WITH
    ${compileCoreListingSql(request)},
    product_filters_without_stock AS (
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
      ) x
    ),
    product_base AS (
      SELECT
        CASE
          WHEN product_filters_without_stock.bitmap IS NOT NULL
          THEN scope_products.bitmap
            & published_products.bitmap
            & product_filters_without_stock.bitmap
          ELSE scope_products.bitmap & published_products.bitmap
        END AS bitmap
      FROM scope_products
      CROSS JOIN published_products
      CROSS JOIN product_filters_without_stock
    ),
    option_variant_filters AS (
      SELECT rb_and_agg(bitmap) AS bitmap
      FROM (
        SELECT bitmap
        FROM scope_variant_filters
        WHERE bitmap IS NOT NULL
        UNION ALL
        SELECT bitmap
        FROM option_filter_groups
      ) option_variant_filter_parts
    ),
    price_range_stock_filter AS (
      SELECT
        CASE
          WHEN sfs.has_value AND sfs.value = true
          THEN (SELECT bitmap FROM in_stock_variants)
          WHEN sfs.has_value AND sfs.value = false
          THEN ${emptyRoaringBitmapSql()}
          ELSE NULL
        END AS bitmap
      FROM stock_filter_state sfs
    ),
    variant_filters_without_price AS (
      SELECT
        CASE
          WHEN ovf.bitmap IS NOT NULL AND prsf.bitmap IS NOT NULL
          THEN ovf.bitmap & prsf.bitmap
          WHEN ovf.bitmap IS NOT NULL
          THEN ovf.bitmap
          WHEN prsf.bitmap IS NOT NULL
          THEN prsf.bitmap
          ELSE NULL
        END AS bitmap
      FROM option_variant_filters ovf
      CROSS JOIN price_range_stock_filter prsf
    ),
    variant_filters_without_stock AS (
      SELECT
        CASE
          WHEN ovf.bitmap IS NOT NULL AND pvf.bitmap IS NOT NULL
          THEN ovf.bitmap & pvf.bitmap
          WHEN ovf.bitmap IS NOT NULL
          THEN ovf.bitmap
          WHEN pvf.bitmap IS NOT NULL
          THEN pvf.bitmap
          ELSE NULL
        END AS bitmap
      FROM option_variant_filters ovf
      CROSS JOIN price_variant_filter pvf
    ),
    price_range AS (
      SELECT
        CASE
          WHEN bounds.min_price_minor IS NULL OR bounds.max_price_minor IS NULL
          THEN NULL
          ELSE jsonb_build_object(
            'minPriceMinor', bounds.min_price_minor,
            'maxPriceMinor', bounds.max_price_minor,
            'currency', (SELECT currency FROM input)
          )
        END AS value
      FROM (
        SELECT
          MIN(vp.price_minor)::bigint AS min_price_minor,
          MAX(vp.price_minor)::bigint AS max_price_minor
        FROM listing.listing_posting_variant_price vp
        JOIN listing.variant_listing_index vli
          ON vli.project_id = vp.project_id
         AND vli.variant_doc_id = vp.variant_doc_id
         AND vli.product_doc_id = vp.product_doc_id
         AND vli.product_id = vp.product_id
         AND vli.in_stock = true
        JOIN input i ON true
        CROSS JOIN product_base pb
        WHERE vp.project_id = i.project_id
          AND vp.currency = i.currency
          AND pb.bitmap @> vp.product_doc_id
          AND (
            (SELECT bitmap FROM variant_filters_without_price) IS NULL
            OR (SELECT bitmap FROM variant_filters_without_price) @> vp.variant_doc_id
          )
      ) bounds
    ),
    in_stock_variant_matches AS (
      SELECT
        CASE
          WHEN (SELECT bitmap FROM variant_filters_without_stock) IS NULL
          THEN in_stock_variants.bitmap
          ELSE in_stock_variants.bitmap
            & (SELECT bitmap FROM variant_filters_without_stock)
        END AS bitmap
      FROM in_stock_variants
    ),
    in_stock_products AS (
      SELECT COALESCE(rb_build_agg(vli.product_doc_id), ${emptyRoaringBitmapSql()}) AS bitmap
      FROM in_stock_variant_matches isvm
      JOIN input i ON true
      JOIN listing.variant_listing_index vli
        ON vli.project_id = i.project_id
       AND isvm.bitmap @> vli.variant_doc_id
    ),
    in_stock_count AS (
      SELECT rb_cardinality(isp.bitmap & pb.bitmap)::int AS value
      FROM in_stock_products isp
      CROSS JOIN product_base pb
    )
    SELECT
      frg.error_code AS "facetErrorCode",
      frg.error_value AS "facetErrorValue",
      (SELECT value FROM price_range) AS "priceRange",
      (SELECT value FROM in_stock_count) AS "inStockCount"
    FROM facet_resolution_guard frg
  `;
}

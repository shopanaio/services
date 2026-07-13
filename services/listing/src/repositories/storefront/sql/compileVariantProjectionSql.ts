import { sql, type SQL } from "drizzle-orm";
import { coalesceBitmapSql } from "../sqlHelpers.js";

export const NARROW_VARIANT_PROJECTION_THRESHOLD = 10_000;

export function compileVariantProjectionSql(input: {
  projectIdSql: SQL;
  variantBitmapSql: SQL;
}): SQL {
  return coalesceBitmapSql(sql`(
    WITH variant_bitmap AS MATERIALIZED (
      SELECT ${input.variantBitmapSql} AS bitmap
    ),
    variant_matches AS MATERIALIZED (
      SELECT
        vb.bitmap,
        rb_cardinality(vb.bitmap) AS matched_count
      FROM variant_bitmap vb
    ),
    narrow_matches AS MATERIALIZED (
      SELECT vm.bitmap
      FROM variant_matches vm
      WHERE vm.matched_count BETWEEN 1 AND ${NARROW_VARIANT_PROJECTION_THRESHOLD}
    ),
    narrow_projected AS (
      SELECT rb_build_agg(vli.product_doc_id) AS product_bitmap
      FROM narrow_matches vm
      CROSS JOIN LATERAL rb_iterate(vm.bitmap) AS matched(variant_doc_id)
      JOIN listing.variant_listing_index vli
        ON vli.store_id = ${input.projectIdSql}
       AND vli.variant_doc_id = matched.variant_doc_id
      HAVING COUNT(vli.product_doc_id) > 0
    ),
    matched_blocks AS MATERIALIZED (
      SELECT
        b.variant_doc_from,
        b.variant_doc_to,
        b.variant_bitmap,
        b.product_bitmap,
        b.variant_count,
        (vm.bitmap & b.variant_bitmap) AS block_match
      FROM variant_matches vm
      JOIN listing.listing_posting_variant_storeion_block b
        ON b.store_id = ${input.projectIdSql}
       AND rb_cardinality(vm.bitmap & b.variant_bitmap) > 0
      WHERE vm.matched_count > ${NARROW_VARIANT_PROJECTION_THRESHOLD}
    ),
    full_block_products AS (
      SELECT mb.product_bitmap
      FROM matched_blocks mb
      WHERE rb_cardinality(mb.block_match) = mb.variant_count
    ),
    partial_block_products AS (
      SELECT rb_build_agg(vli.product_doc_id) AS product_bitmap
      FROM (
        SELECT block_match
        FROM matched_blocks
        WHERE rb_cardinality(block_match) < variant_count
      ) mb
      CROSS JOIN LATERAL rb_iterate(mb.block_match) AS matched(variant_doc_id)
      JOIN listing.variant_listing_index vli
        ON vli.store_id = ${input.projectIdSql}
       AND vli.variant_doc_id = matched.variant_doc_id
      HAVING COUNT(vli.product_doc_id) > 0
    ),
    projected AS (
      SELECT rb_or_agg(product_bitmap)
        FILTER (WHERE product_bitmap IS NOT NULL) AS product_bitmap
      FROM (
        SELECT product_bitmap FROM narrow_projected
        UNION ALL
        SELECT product_bitmap FROM full_block_products
        UNION ALL
        SELECT product_bitmap FROM partial_block_products
      ) x
    )
    SELECT product_bitmap
    FROM projected
  )`);
}

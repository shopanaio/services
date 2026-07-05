import { sql, type SQL } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import { coalesceBitmapSql, emptyBitmapExpr } from "./sqlHelpers.js";
import type { BitmapExpr } from "./types.js";

export class StorefrontVariantProjectionQueryRepository extends BaseRepository {
  @ReadOnly()
  async projectVariantBitmapToProducts(input: {
    variantBitmap: BitmapExpr;
    strategy?: "projection_blocks" | "narrow_iterate_fallback";
  }): Promise<BitmapExpr> {
    if (input.variantBitmap.empty) {
      return emptyBitmapExpr(`project:${input.variantBitmap.source}`);
    }

    if (input.strategy === "narrow_iterate_fallback") {
      return {
        sql: coalesceBitmapSql(sql`(
          WITH variant_matches AS MATERIALIZED (
            SELECT ${input.variantBitmap.sql} AS bitmap
          )
          SELECT rb_build_agg(vli.product_doc_id)
          FROM variant_matches vm
          CROSS JOIN LATERAL rb_iterate(vm.bitmap) AS matched(variant_doc_id)
          JOIN listing.variant_listing_index vli
            ON vli.store_id = ${this.storeId}::uuid
           AND vli.variant_doc_id = matched.variant_doc_id
        )`),
        empty: false,
        source: `project-narrow(${input.variantBitmap.source})`,
      };
    }

    return {
      sql: this.buildProjectionSql({ variantBitmapSql: input.variantBitmap.sql }),
      empty: false,
      source: `project(${input.variantBitmap.source})`,
    };
  }

  buildProjectionSql(input: { variantBitmapSql: SQL }): SQL {
    const variantBitmapSql = input.variantBitmapSql;

    return coalesceBitmapSql(sql`(
      WITH variant_matches AS MATERIALIZED (
        SELECT ${variantBitmapSql} AS bitmap
      ),
      matched_blocks AS (
        SELECT
          b.block_id,
          b.variant_doc_from,
          b.variant_doc_to,
          b.variant_bitmap,
          b.product_bitmap,
          b.variant_count,
          (vm.bitmap & b.variant_bitmap) AS block_match
        FROM variant_matches vm
        JOIN listing.listing_posting_variant_storeion_block b
          ON b.store_id = ${this.storeId}::uuid
         AND rb_cardinality(vm.bitmap & b.variant_bitmap) > 0
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
          ON vli.store_id = ${this.storeId}::uuid
         AND vli.variant_doc_id = matched.variant_doc_id
      ),
      projected AS (
        SELECT rb_or_agg(product_bitmap) AS product_bitmap
        FROM (
          SELECT product_bitmap FROM full_block_products
          UNION ALL
          SELECT product_bitmap FROM partial_block_products
        ) x
      )
      SELECT product_bitmap
      FROM projected
    )`);
  }
}

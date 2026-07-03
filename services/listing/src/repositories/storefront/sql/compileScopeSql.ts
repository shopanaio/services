import { sql, type SQL } from "drizzle-orm";
import { emptyRoaringBitmapSql } from "../sqlHelpers.js";
import type { ListingSqlRequest } from "./compileListingInputSql.js";

export function compileScopeSql(request: ListingSqlRequest): SQL {
  return sql`
    search_candidate_rows AS (
      SELECT
        pli.product_doc_id::int AS product_doc_id,
        pli.product_id AS product_id,
        pli.in_stock AS in_stock,
        pdb.score(ptsi.search_id)::double precision AS relevance_score
      FROM input i
      JOIN listing.product_title_bm25_search_index ptsi
        ON ptsi.project_id = i.project_id
       AND ptsi.locale = i.locale
       AND ptsi.status = 'published'
       AND i.normalized_search_query IS NOT NULL
       AND ptsi.title @@@ i.normalized_search_query
      JOIN listing.product_listing_index pli
        ON pli.project_id = ptsi.project_id
       AND pli.product_id = ptsi.product_id
       AND pli.status = 'published'
    ),
    search_candidate_products AS (
      SELECT
        CASE
          WHEN i.normalized_search_query IS NOT NULL
          THEN COALESCE((
            SELECT rb_build_agg(scr.product_doc_id)
            FROM search_candidate_rows scr
          ), ${emptyRoaringBitmapSql()})
          ELSE NULL
        END AS bitmap
      FROM input i
    ),
    scope_variant_filters AS (
      SELECT NULL::roaringbitmap AS bitmap
    ),
    raw_scope_products AS (
      SELECT
        CASE
          WHEN i.scope_kind = 'category'
          THEN COALESCE((
            SELECT p.bitmap
            FROM listing.listing_posting_bitmap p
            WHERE p.project_id = i.project_id
              AND p.entity_type = 'product'
              AND p.field = 'category'
              AND p.value_key = i.scope_id::text
          ), ${emptyRoaringBitmapSql()})
          WHEN i.scope_kind = 'search'
          THEN COALESCE((SELECT bitmap FROM search_candidate_products), ${emptyRoaringBitmapSql()})
          ELSE ${emptyRoaringBitmapSql()}
        END AS bitmap
      FROM input i
    ),
    published_products AS (
      SELECT COALESCE(rb_build_agg(pli.product_doc_id), ${emptyRoaringBitmapSql()}) AS bitmap
      FROM listing.product_listing_index pli
      JOIN input i ON true
      WHERE pli.project_id = i.project_id
        AND pli.status = 'published'
    ),
    scope_products AS (
      SELECT
        CASE
          WHEN scp.bitmap IS NOT NULL
          THEN rsp.bitmap & pp.bitmap & scp.bitmap
          ELSE rsp.bitmap & pp.bitmap
        END AS bitmap
      FROM raw_scope_products rsp
      CROSS JOIN published_products pp
      CROSS JOIN search_candidate_products scp
    )
  `;
}

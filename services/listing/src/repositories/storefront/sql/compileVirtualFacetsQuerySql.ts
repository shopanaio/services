import { sql, type SQL } from "drizzle-orm";
import { emptyRoaringBitmapSql } from "../sqlHelpers.js";
import type { ListingSqlRequest } from "./compileListingInputSql.js";
import {
  compileInputCte,
  compileOptionVariantPredicateSql,
  compilePricePredicateSql,
  compileProductMatchesBitmapSql,
  compileScopeProductCtes,
} from "./compileListingProductMatchesSql.js";

export function compileVirtualFacetsQuerySql(request: ListingSqlRequest): SQL {
  return sql`
    /* listing:virtualFacets */
    WITH
    ${compileInputCte(request)},
    ${compileScopeProductCtes(request)},
    product_base AS (
      SELECT ${compileProductMatchesBitmapSql(request, {
        includeProductStock: false,
        includeVariantProjection: false,
      })} AS bitmap
    ),
    price_range_bounds AS (
      SELECT
        (${compilePriceBoundSql(request, "asc")}) AS min_price_minor,
        (${compilePriceBoundSql(request, "desc")}) AS max_price_minor
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
      FROM price_range_bounds bounds
    ),
    in_stock_products AS (
      SELECT COALESCE(rb_build_agg(product_doc_id), ${emptyRoaringBitmapSql()}) AS bitmap
      FROM (${compileInStockProductRowsSql(request)}) rows(product_doc_id)
    ),
    in_stock_count AS (
      SELECT rb_cardinality(isp.bitmap & pb.bitmap)::int AS value
      FROM in_stock_products isp
      CROSS JOIN product_base pb
    )
    SELECT
      NULL::text AS "facetErrorCode",
      NULL::text AS "facetErrorValue",
      (SELECT value FROM price_range) AS "priceRange",
      (SELECT value FROM in_stock_count) AS "inStockCount"
  `;
}

function compilePriceRangeStockPredicateSql(request: ListingSqlRequest): SQL {
  return request.request.filterPlan.inStock === false ? sql`AND false` : sql``;
}

function compilePriceBoundSql(
  request: ListingSqlRequest,
  direction: "asc" | "desc"
): SQL {
  const orderBy =
    direction === "asc"
      ? sql`vp.price_minor ASC, vp.product_id ASC, vp.variant_doc_id ASC, vp.product_doc_id ASC`
      : sql`vp.price_minor DESC, vp.product_id ASC, vp.variant_doc_id ASC, vp.product_doc_id ASC`;

  return sql`
    SELECT vp.price_minor::bigint
    FROM listing.listing_posting_variant_price vp
    JOIN input i ON true
    CROSS JOIN product_base pb
    WHERE vp.project_id = i.project_id
      AND vp.currency = i.currency
      AND pb.bitmap @> vp.product_doc_id
      ${compilePriceRangeStockPredicateSql(request)}
      ${compileOptionVariantPredicateSql(request, sql`vp`)}
    ORDER BY ${orderBy}
    LIMIT 1
  `;
}

function compileInStockProductRowsSql(request: ListingSqlRequest): SQL {
  const plan = request.request.filterPlan;

  if (plan.priceRange) {
    return compilePricedInStockProductRowsSql(request);
  }

  if (plan.optionFacetGroups.length > 0) {
    return compileOptionInStockProductRowsSql(request);
  }

  return compileProductInStockRowsSql(request);
}

function compilePricedInStockProductRowsSql(request: ListingSqlRequest): SQL {
  return sql`
    SELECT vp.product_doc_id
    FROM listing.listing_posting_variant_price vp
    JOIN input i ON true
    CROSS JOIN product_base pb
    WHERE vp.project_id = i.project_id
      AND vp.currency = i.currency
      AND pb.bitmap @> vp.product_doc_id
      ${compilePricePredicateSql(request, sql`vp`)}
      ${compileOptionVariantPredicateSql(request, sql`vp`)}
  `;
}

function compileOptionInStockProductRowsSql(request: ListingSqlRequest): SQL {
  return sql`
    SELECT vli.product_doc_id
    FROM listing.variant_listing_index vli
    JOIN input i ON true
    CROSS JOIN product_base pb
    WHERE vli.project_id = i.project_id
      AND vli.in_stock = true
      AND pb.bitmap @> vli.product_doc_id
      ${compileOptionVariantPredicateSql(request, sql`vli`)}
  `;
}

function compileProductInStockRowsSql(request: ListingSqlRequest): SQL {
  return sql`
    SELECT pli.product_doc_id
    FROM listing.product_listing_index pli
    JOIN input i ON true
    CROSS JOIN product_base pb
    WHERE pli.project_id = i.project_id
      AND pli.status = 'published'
      AND pli.in_stock = true
      AND pb.bitmap @> pli.product_doc_id
  `;
}

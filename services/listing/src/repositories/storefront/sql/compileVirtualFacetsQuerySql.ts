import { sql, type SQL } from "drizzle-orm";
import { emptyRoaringBitmapSql } from "../sqlHelpers.js";
import { ZERO_UUID, type ListingSqlRequest } from "./compileListingInputSql.js";
import {
  compileInputCte,
  compileOptionVariantBitmapSql,
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
    ${compileOptionVariantMatchesCte(request)}
    ${compileOptionMatchingSignatureKeysCte(request)}
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
      SELECT ${compileInStockProductsBitmapSql(request)} AS bitmap
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

function compileOptionVariantMatchesCte(request: ListingSqlRequest): SQL {
  const optionBitmap = compileOptionVariantBitmapSql(request);
  if (!optionBitmap) {
    return sql``;
  }

  return sql`
    option_variant_matches AS MATERIALIZED (
      SELECT ${optionBitmap} AS bitmap
    ),
  `;
}

function compileOptionMatchingSignatureKeysCte(
  request: ListingSqlRequest
): SQL {
  const groups = request.request.filterPlan.optionFacetGroups;
  if (groups.length === 0 || request.request.filterPlan.priceRange) {
    return sql``;
  }

  const valueRows = groups.flatMap((group, groupIndex) =>
    [...new Set(group.valueKeys)].map(
      (valueKey) => sql`(${groupIndex + 1}::int, ${valueKey}::text)`
    )
  );

  return sql`
    option_required_values AS (
      ${valuesOrEmpty(
        valueRows,
        "option_required_values_input",
        sql`group_ordinal, value_key`,
        sql`SELECT NULL::int AS group_ordinal, NULL::text AS value_key WHERE false`
      )}
    ),
    option_required_group_count AS (
      SELECT ${groups.length}::int AS value
    ),
    option_matching_signature_keys AS (
      SELECT sv.signature_key
      FROM input i
      JOIN option_required_values rv ON true
      JOIN listing.listing_option_signature_value sv
        ON sv.project_id = i.project_id
       AND sv.value_key = rv.value_key
      GROUP BY sv.signature_key
      HAVING COUNT(DISTINCT rv.group_ordinal) = (
        SELECT value FROM option_required_group_count
      )
    ),
  `;
}

function compilePriceRangeStockPredicateSql(request: ListingSqlRequest): SQL {
  return request.request.filterPlan.inStock === false ? sql`AND false` : sql``;
}

function compilePriceBoundSql(
  request: ListingSqlRequest,
  direction: "asc" | "desc"
): SQL {
  if (request.request.filterPlan.optionFacetGroups.length === 0) {
    return compileProductPriceBoundSql(request, direction);
  }

  return compileVariantPriceBoundSql(request, direction);
}

function compileProductPriceBoundSql(
  request: ListingSqlRequest,
  direction: "asc" | "desc"
): SQL {
  const sortKind = direction === "asc" ? "price_asc" : "price_desc";
  const orderBy =
    direction === "asc"
      ? sql`s.bool_value DESC, s.bigint_value ASC NULLS LAST, s.product_id ASC`
      : sql`s.bool_value DESC, s.bigint_value DESC NULLS LAST, s.product_id ASC`;

  return sql`
    SELECT s.bigint_value::bigint
    FROM listing.listing_posting_product_sort s
    JOIN input i ON true
    CROSS JOIN product_base pb
    WHERE s.project_id = i.project_id
      AND s.sort_kind = ${sortKind}
      AND s.locale = ''
      AND s.currency = i.currency
      AND s.manual_scope_id = ${ZERO_UUID}::uuid
      AND s.bool_value = true
      AND s.bigint_value IS NOT NULL
      AND pb.bitmap @> s.product_doc_id
      ${compilePriceRangeStockPredicateSql(request)}
    ORDER BY ${orderBy}
    LIMIT 1
  `;
}

function compileVariantPriceBoundSql(
  request: ListingSqlRequest,
  direction: "asc" | "desc"
): SQL {
  const orderBy =
    direction === "asc"
      ? sql`vp.price_minor ASC, vp.product_id ASC, vp.variant_doc_id ASC, vp.product_doc_id ASC`
      : sql`vp.price_minor DESC, vp.product_id ASC, vp.variant_doc_id ASC, vp.product_doc_id ASC`;

  return sql`
    SELECT vp.price_minor::bigint
    FROM input i
    CROSS JOIN product_base pb
    CROSS JOIN option_variant_matches ovm
    JOIN listing.listing_posting_variant_price vp
      ON vp.project_id = i.project_id
     AND vp.currency = i.currency
    JOIN listing.variant_listing_index vli
      ON vli.project_id = vp.project_id
     AND vli.variant_doc_id = vp.variant_doc_id
     AND vli.product_doc_id = vp.product_doc_id
     AND vli.product_id = vp.product_id
     AND vli.in_stock = true
    WHERE true
      AND ovm.bitmap @> vp.variant_doc_id
      AND pb.bitmap @> vp.product_doc_id
      ${compilePriceRangeStockPredicateSql(request)}
    ORDER BY ${orderBy}
    LIMIT 1
  `;
}

function compileInStockProductsBitmapSql(request: ListingSqlRequest): SQL {
  const plan = request.request.filterPlan;

  if (plan.priceRange && plan.optionFacetGroups.length > 0) {
    return compileOptionPricedInStockProductsBitmapSql(request);
  }

  if (plan.priceRange) {
    return compilePricedInStockProductsBitmapSql(request);
  }

  if (plan.optionFacetGroups.length > 0) {
    return compileOptionInStockProductsBitmapSql();
  }

  return compileProductInStockProductsBitmapSql();
}

function compileOptionPricedInStockProductsBitmapSql(
  request: ListingSqlRequest
): SQL {
  return sql`
    COALESCE((
      SELECT rb_build_agg(vp.product_doc_id)
      FROM input i
      CROSS JOIN product_base pb
      CROSS JOIN option_variant_matches ovm
      JOIN listing.listing_posting_variant_price vp
        ON vp.project_id = i.project_id
       AND vp.currency = i.currency
      JOIN listing.variant_listing_index vli
        ON vli.project_id = vp.project_id
       AND vli.variant_doc_id = vp.variant_doc_id
       AND vli.product_doc_id = vp.product_doc_id
       AND vli.product_id = vp.product_id
       AND vli.in_stock = true
      WHERE ovm.bitmap @> vp.variant_doc_id
        AND pb.bitmap @> vp.product_doc_id
        ${compilePricePredicateSql(request, sql`vp`)}
    ), ${emptyRoaringBitmapSql()})
  `;
}

function compilePricedInStockProductsBitmapSql(
  request: ListingSqlRequest
): SQL {
  return sql`
    COALESCE((
      SELECT rb_build_agg(vp.product_doc_id)
      FROM listing.listing_posting_variant_price vp
      JOIN input i ON true
      CROSS JOIN product_base pb
      WHERE vp.project_id = i.project_id
        AND vp.currency = i.currency
        AND pb.bitmap @> vp.product_doc_id
        ${compilePricePredicateSql(request, sql`vp`)}
    ), ${emptyRoaringBitmapSql()})
  `;
}

function compileOptionInStockProductsBitmapSql(): SQL {
  return sql`
    COALESCE((
      SELECT rb_or_agg(os.product_bitmap & pb.bitmap)
      FROM input i
      CROSS JOIN product_base pb
      JOIN option_matching_signature_keys ms ON true
      JOIN listing.listing_option_signature os
        ON os.project_id = i.project_id
       AND os.signature_key = ms.signature_key
    ), ${emptyRoaringBitmapSql()})
  `;
}

function compileProductInStockProductsBitmapSql(): SQL {
  return sql`
    COALESCE((
      SELECT rb_build_agg(pli.product_doc_id)
      FROM listing.product_listing_index pli
      JOIN input i ON true
      CROSS JOIN product_base pb
      WHERE pli.project_id = i.project_id
        AND pli.status = 'published'
        AND pli.in_stock = true
        AND pb.bitmap @> pli.product_doc_id
    ), ${emptyRoaringBitmapSql()})
  `;
}

function valuesOrEmpty(
  rows: readonly SQL[],
  alias: string,
  columns: SQL,
  emptySelect: SQL
): SQL {
  if (rows.length === 0) {
    return emptySelect;
  }

  return sql`SELECT * FROM (VALUES ${sql.join([...rows], sql`, `)}) AS ${sql.raw(alias)}(${columns})`;
}

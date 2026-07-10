import { sql, type SQL } from "drizzle-orm";
import { StorefrontRepositoryValidationError } from "../types.js";
import type {
  DecodedListingCursor,
  ProductSortCollectKind,
  StorefrontSortKind,
} from "../types.js";
import {
  ZERO_UUID,
  type ListingSqlRequest,
} from "./compileListingInputSql.js";
import {
  compileInputCte,
  compileOptionVariantBitmapSql,
  compileOptionVariantPredicateSql,
  compilePricePredicateSql,
  compileProductMatchesBitmapSql,
  compileScopeProductCtes,
  hasVariantPredicate,
  shouldApplyProductStockAtProductLevel,
} from "./compileListingProductMatchesSql.js";

export function compilePageQuerySql(request: ListingSqlRequest): SQL {
  if (request.sortKind === "relevance") {
    return compileRelevancePageQuerySql(request);
  }
  if (isMatchedVariantPricePage(request)) {
    return compileMatchedVariantPricePageQuerySql(request);
  }
  return compileProductSortPageQuerySql(request);
}

function compileProductSortPageQuerySql(request: ListingSqlRequest): SQL {
  const productConfig = productSortConfig(request);
  const productSeek = buildProductSortSeekPredicate(
    productConfig.sort,
    request.request.cursor
  );
  const limitSql = sql`(SELECT first + 1 FROM input)`;

  return sql`
    /* listing:page */
    WITH
    ${compileInputCte(request)},
    ${compileScopeProductCtes(request)},
    product_matches AS (
      SELECT ${compileProductMatchesBitmapSql(request, {
        includeProductStock: shouldApplyProductStockAtProductLevel(request),
        includeVariantProjection: hasVariantPredicate(request),
      })} AS bitmap
    ),
    product_page_ordered AS (
      SELECT
        'product_sort'::text AS collector_kind,
        s.product_doc_id,
        s.product_id,
        COALESCE(s.bool_value, false) AS in_stock,
        s.bool_value,
        s.timestamptz_value,
        s.timestamptz_value_2,
        s.bigint_value,
        s.text_value,
        NULL::int AS variant_doc_id,
        NULL::bigint AS price_minor,
        NULL::double precision AS relevance_score
      FROM listing.listing_posting_product_sort s
      JOIN input i ON true
      CROSS JOIN product_matches m
      WHERE s.store_id = i.store_id
        AND s.sort_kind = ${productConfig.sortKind}
        AND s.locale = ${productConfig.locale}
        AND s.currency = ${productConfig.currency}
        AND s.manual_scope_id = ${productConfig.manualScopeId}::uuid
        AND m.bitmap @> s.product_doc_id
        ${productSeek}
      ORDER BY ${productConfig.orderBy}
      LIMIT ${limitSql}
    ),
    product_page_scan AS (
      SELECT row_number() OVER ()::int AS page_ordinal, *
      FROM product_page_ordered
    )
    ${compilePageSelectSql(sql`product_page_scan`)}
  `;
}

function compileMatchedVariantPricePageQuerySql(
  request: ListingSqlRequest
): SQL {
  const plan = request.request.filterPlan;
  if (plan.inStock === false) {
    return compileEmptyPageQuerySql();
  }
  if (plan.optionFacetGroups.length > 0) {
    return compileOptionBitmapMatchedVariantPricePageQuerySql(request);
  }

  const variantDirection = request.sortKind === "price_desc" ? "desc" : "asc";
  const variantSeek = buildVariantPriceSeek(
    variantDirection,
    request.request.cursor
  );
  const limitSql = sql`(SELECT first + 1 FROM input)`;
  const pricePredicate = compilePricePredicateSql(request, sql`vp`);
  const optionPredicate = compileOptionVariantPredicateSql(request, sql`vp`);

  // listing_posting_variant_price stores only priced runtime-eligible variants.
  return sql`
    /* listing:page */
    WITH
    ${compileInputCte(request)},
    ${compileScopeProductCtes(request)},
    product_base AS (
      SELECT ${compileProductMatchesBitmapSql(request, {
        includeProductStock: false,
        includeVariantProjection: false,
      })} AS bitmap
    ),
    variant_price_candidates AS (
      SELECT
        vp.product_doc_id,
        vp.product_id,
        vp.variant_doc_id,
        vp.price_minor
      FROM listing.listing_posting_variant_price vp
      JOIN input i ON true
      CROSS JOIN product_base pb
      WHERE vp.store_id = i.store_id
        AND vp.currency = i.currency
        AND pb.bitmap @> vp.product_doc_id
        ${pricePredicate}
        ${optionPredicate}
    ),
    variant_price_chosen AS (
      SELECT DISTINCT ON (vp.product_id)
        vp.product_doc_id,
        vp.product_id,
        vp.variant_doc_id,
        vp.price_minor
      FROM variant_price_candidates vp
      ORDER BY ${variantCandidateOrderBy(variantDirection)}
    ),
    variant_price_ordered AS (
      SELECT
        'matched_variant_price'::text AS collector_kind,
        chosen.product_doc_id,
        chosen.product_id,
        pli.in_stock,
        pli.in_stock AS bool_value,
        NULL::timestamptz AS timestamptz_value,
        NULL::timestamptz AS timestamptz_value_2,
        NULL::bigint AS bigint_value,
        NULL::text AS text_value,
        chosen.variant_doc_id,
        chosen.price_minor,
        NULL::double precision AS relevance_score
      FROM variant_price_chosen chosen
      JOIN input i ON true
      JOIN listing.product_listing_index pli
        ON pli.store_id = i.store_id
       AND pli.product_doc_id = chosen.product_doc_id
       AND pli.product_id = chosen.product_id
      WHERE true
        ${variantSeek}
      ORDER BY ${variantFinalOrderBy(variantDirection)}
      LIMIT ${limitSql}
    ),
    variant_price_page_scan AS (
      SELECT row_number() OVER ()::int AS page_ordinal, *
      FROM variant_price_ordered
    )
    ${compilePageSelectSql(sql`variant_price_page_scan`)}
  `;
}

function compileOptionBitmapMatchedVariantPricePageQuerySql(
  request: ListingSqlRequest
): SQL {
  const optionBitmap = compileOptionVariantBitmapSql(request);
  if (!optionBitmap) {
    return compileMatchedVariantPricePageQuerySql(request);
  }

  const variantDirection = request.sortKind === "price_desc" ? "desc" : "asc";
  const variantSeek = buildVariantPriceSeek(
    variantDirection,
    request.request.cursor
  );
  const limitSql = sql`(SELECT first + 1 FROM input)`;
  const pricePredicate = compilePricePredicateSql(request, sql`vp`);

  return sql`
    /* listing:page */
    WITH
    ${compileInputCte(request)},
    ${compileScopeProductCtes(request)},
    product_base AS (
      SELECT ${compileProductMatchesBitmapSql(request, {
        includeProductStock: false,
        includeVariantProjection: false,
      })} AS bitmap
    ),
    option_variant_matches AS (
      SELECT ${optionBitmap} AS bitmap
    ),
    option_variant_ids AS (
      SELECT ov.variant_doc_id::int AS variant_doc_id
      FROM option_variant_matches ovm
      CROSS JOIN LATERAL rb_iterate(ovm.bitmap) AS ov(variant_doc_id)
    ),
    variant_price_candidates AS (
      SELECT
        vp.product_doc_id,
        vp.product_id,
        vp.variant_doc_id,
        vp.price_minor
      FROM option_variant_ids ov
      JOIN input i ON true
      JOIN listing.listing_posting_variant_price vp
        ON vp.store_id = i.store_id
       AND vp.currency = i.currency
       AND vp.variant_doc_id = ov.variant_doc_id
      CROSS JOIN product_base pb
      WHERE pb.bitmap @> vp.product_doc_id
        ${pricePredicate}
    ),
    variant_price_chosen AS (
      SELECT DISTINCT ON (vp.product_id)
        vp.product_doc_id,
        vp.product_id,
        vp.variant_doc_id,
        vp.price_minor
      FROM variant_price_candidates vp
      ORDER BY ${variantCandidateOrderBy(variantDirection)}
    ),
    variant_price_ordered AS (
      SELECT
        'matched_variant_price'::text AS collector_kind,
        chosen.product_doc_id,
        chosen.product_id,
        pli.in_stock,
        pli.in_stock AS bool_value,
        NULL::timestamptz AS timestamptz_value,
        NULL::timestamptz AS timestamptz_value_2,
        NULL::bigint AS bigint_value,
        NULL::text AS text_value,
        chosen.variant_doc_id,
        chosen.price_minor,
        NULL::double precision AS relevance_score
      FROM variant_price_chosen chosen
      JOIN input i ON true
      JOIN listing.product_listing_index pli
        ON pli.store_id = i.store_id
       AND pli.product_doc_id = chosen.product_doc_id
       AND pli.product_id = chosen.product_id
      WHERE true
        ${variantSeek}
      ORDER BY ${variantFinalOrderBy(variantDirection)}
      LIMIT ${limitSql}
    ),
    variant_price_page_scan AS (
      SELECT row_number() OVER ()::int AS page_ordinal, *
      FROM variant_price_ordered
    )
    ${compilePageSelectSql(sql`variant_price_page_scan`)}
  `;
}

function compileRelevancePageQuerySql(request: ListingSqlRequest): SQL {
  if (!request.normalizedQuery) {
    throw new StorefrontRepositoryValidationError(
      "Relevance sort requires a non-empty query"
    );
  }

  const relevanceSeek = buildRelevanceSeek(request.request.cursor);
  const limitSql = sql`(SELECT first + 1 FROM input)`;

  return sql`
    /* listing:page */
    WITH
    ${compileInputCte(request)},
    ${compileScopeProductCtes(request)},
    product_matches AS (
      SELECT ${compileProductMatchesBitmapSql(request, {
        includeProductStock: shouldApplyProductStockAtProductLevel(request),
        includeVariantProjection: hasVariantPredicate(request),
      })} AS bitmap
    ),
    relevance_ordered AS (
      SELECT
        'relevance'::text AS collector_kind,
        c.product_doc_id,
        c.product_id,
        c.in_stock,
        c.in_stock AS bool_value,
        NULL::timestamptz AS timestamptz_value,
        NULL::timestamptz AS timestamptz_value_2,
        NULL::bigint AS bigint_value,
        NULL::text AS text_value,
        NULL::int AS variant_doc_id,
        NULL::bigint AS price_minor,
        c.relevance_score
      FROM search_candidate_rows c
      CROSS JOIN product_matches m
      WHERE m.bitmap @> c.product_doc_id
        ${relevanceSeek}
      ORDER BY c.in_stock DESC, c.relevance_score DESC NULLS LAST, c.product_id ASC
      LIMIT ${limitSql}
    ),
    relevance_page_scan AS (
      SELECT row_number() OVER ()::int AS page_ordinal, *
      FROM relevance_ordered
    )
    ${compilePageSelectSql(sql`relevance_page_scan`)}
  `;
}

function compileEmptyPageQuerySql(): SQL {
  return sql`
    /* listing:page */
    SELECT
      NULL::text AS "facetErrorCode",
      NULL::text AS "facetErrorValue",
      NULL::text AS "collectorKind",
      NULL::int AS "productDocId",
      NULL::text AS "productId",
      NULL::boolean AS "inStock",
      NULL::boolean AS "boolValue",
      NULL::timestamptz AS "timestamptzValue",
      NULL::timestamptz AS "timestamptzValue2",
      NULL::double precision AS "bigintValue",
      NULL::text AS "textValue",
      NULL::int AS "variantDocId",
      NULL::double precision AS "priceMinor",
      NULL::double precision AS "relevanceScore"
    WHERE false
  `;
}

function compilePageSelectSql(pageScanSql: SQL): SQL {
  return sql`
    SELECT
      NULL::text AS "facetErrorCode",
      NULL::text AS "facetErrorValue",
      ps.collector_kind AS "collectorKind",
      ps.product_doc_id::int AS "productDocId",
      ps.product_id::text AS "productId",
      ps.in_stock AS "inStock",
      ps.bool_value AS "boolValue",
      ps.timestamptz_value AS "timestamptzValue",
      ps.timestamptz_value_2 AS "timestamptzValue2",
      ps.bigint_value::double precision AS "bigintValue",
      ps.text_value AS "textValue",
      ps.variant_doc_id::int AS "variantDocId",
      ps.price_minor::double precision AS "priceMinor",
      ps.relevance_score::double precision AS "relevanceScore"
    FROM ${pageScanSql} ps
    ORDER BY ps.page_ordinal ASC NULLS LAST
  `;
}

function isMatchedVariantPricePage(request: ListingSqlRequest): boolean {
  return (
    (request.sortKind === "price_asc" || request.sortKind === "price_desc") &&
    hasVariantPredicate(request)
  );
}

function productSortConfig(request: ListingSqlRequest): {
  sort: ProductSortCollectKind;
  sortKind: string;
  locale: string;
  currency: string;
  manualScopeId: string;
  orderBy: SQL;
} {
  switch (request.sortKind) {
    case "manual":
      return {
        sort: "manual",
        sortKind: "manual",
        locale: "",
        currency: "",
        manualScopeId: request.manualScopeId,
        orderBy: sql`s.bool_value DESC, s.text_value ASC NULLS LAST, s.product_id ASC`,
      };
    case "created":
      return {
        sort: "created",
        sortKind: "created",
        locale: "",
        currency: "",
        manualScopeId: ZERO_UUID,
        orderBy: sql`s.bool_value DESC, s.timestamptz_value DESC, s.product_id ASC`,
      };
    case "name_asc":
      return {
        sort: "name_asc",
        sortKind: "name",
        locale: request.locale,
        currency: "",
        manualScopeId: ZERO_UUID,
        orderBy: sql`s.bool_value DESC, s.text_value ASC NULLS LAST, s.product_id ASC`,
      };
    case "name_desc":
      return {
        sort: "name_desc",
        sortKind: "name",
        locale: request.locale,
        currency: "",
        manualScopeId: ZERO_UUID,
        orderBy: sql`s.bool_value DESC, s.text_value DESC NULLS LAST, s.product_id ASC`,
      };
    case "price_asc":
      return {
        sort: "price_asc",
        sortKind: "price_asc",
        locale: "",
        currency: request.currency,
        manualScopeId: ZERO_UUID,
        orderBy: sql`s.bool_value DESC, s.bigint_value ASC NULLS LAST, s.product_id ASC`,
      };
    case "price_desc":
      return {
        sort: "price_desc",
        sortKind: "price_desc",
        locale: "",
        currency: request.currency,
        manualScopeId: ZERO_UUID,
        orderBy: sql`s.bool_value DESC, s.bigint_value DESC NULLS LAST, s.product_id ASC`,
      };
    case "newest":
    case "relevance":
      return {
        sort: "newest",
        sortKind: "newest",
        locale: "",
        currency: "",
        manualScopeId: ZERO_UUID,
        orderBy: sql`s.bool_value DESC, s.timestamptz_value DESC NULLS LAST, s.timestamptz_value_2 DESC NULLS LAST, s.product_id ASC`,
      };
    default:
      assertNeverSort(request.sortKind);
  }
}

function buildProductSortSeekPredicate(
  sort: ProductSortCollectKind,
  cursor: DecodedListingCursor | null
): SQL {
  if (!cursor) {
    return sql``;
  }

  const payload = cursor.payload;
  if (payload.sort !== sort) {
    return sql``;
  }

  const productSeek = sql`s.product_id > ${payload.productId}::uuid`;
  let downstream: SQL;

  switch (sort) {
    case "manual":
    case "name_asc":
      downstream = ascNullsLastSeek(
        sql`s.text_value`,
        payload.textValue ?? null,
        productSeek
      );
      break;
    case "name_desc":
      downstream = descNullsLastSeek(
        sql`s.text_value`,
        payload.textValue ?? null,
        productSeek
      );
      break;
    case "newest":
      downstream = descNullsLastSeek(
        sql`s.timestamptz_value`,
        payload.publishedAt ?? null,
        descNullsLastSeek(
          sql`s.timestamptz_value_2`,
          payload.productCreatedAt ?? null,
          productSeek
        )
      );
      break;
    case "created":
      if (!payload.productCreatedAt) {
        throw new StorefrontRepositoryValidationError(
          "Created sort cursor is missing productCreatedAt"
        );
      }
      downstream = sql`(
        s.timestamptz_value < ${payload.productCreatedAt}
        OR (s.timestamptz_value = ${payload.productCreatedAt} AND ${productSeek})
      )`;
      break;
    case "price_asc":
      downstream = ascNullsLastSeek(
        sql`s.bigint_value`,
        payload.bigintValue ?? null,
        productSeek
      );
      break;
    case "price_desc":
      downstream = descNullsLastSeek(
        sql`s.bigint_value`,
        payload.bigintValue ?? null,
        productSeek
      );
      break;
  }

  return sql`AND ${boolDescSeek(sql`s.bool_value`, payload.inStock, downstream)}`;
}

function buildVariantPriceSeek(
  direction: "asc" | "desc",
  cursor: DecodedListingCursor | null
): SQL {
  if (!cursor) {
    return sql``;
  }
  const payload = cursor.payload;
  if (payload.sort !== "price_asc" && payload.sort !== "price_desc") {
    return sql``;
  }
  if (
    payload.priceMinor === undefined ||
    payload.priceMinor === null ||
    payload.variantDocId === undefined ||
    payload.variantDocId === null
  ) {
    return sql``;
  }

  const priceComparison =
    direction === "asc"
      ? sql`chosen.price_minor > ${payload.priceMinor}`
      : sql`chosen.price_minor < ${payload.priceMinor}`;

  return sql`AND (
    ${priceComparison}
    OR (
      chosen.price_minor = ${payload.priceMinor}
      AND (
        chosen.product_id > ${payload.productId}::uuid
        OR (
          chosen.product_id = ${payload.productId}::uuid
          AND chosen.variant_doc_id > ${payload.variantDocId}
        )
      )
    )
  )`;
}

function buildRelevanceSeek(cursor: DecodedListingCursor | null): SQL {
  if (!cursor) {
    return sql``;
  }
  const payload = cursor.payload;
  if (payload.sort !== "relevance") {
    return sql``;
  }
  if (payload.relevanceScore === undefined || payload.relevanceScore === null) {
    throw new StorefrontRepositoryValidationError(
      "Relevance cursor is missing relevance score"
    );
  }

  const productSeek = sql`c.product_id > ${payload.productId}::uuid`;
  const scoreSeek = sql`(
    c.relevance_score < ${payload.relevanceScore}
    OR c.relevance_score IS NULL
    OR (c.relevance_score = ${payload.relevanceScore} AND ${productSeek})
  )`;

  if (payload.inStock) {
    return sql`AND (
      c.in_stock = false
      OR (c.in_stock = true AND ${scoreSeek})
    )`;
  }

  return sql`AND (c.in_stock = false AND ${scoreSeek})`;
}

function boolDescSeek(column: SQL, cursorValue: boolean, downstream: SQL): SQL {
  if (cursorValue) {
    return sql`(
      COALESCE(${column}, false) = false
      OR (COALESCE(${column}, false) = true AND ${downstream})
    )`;
  }
  return sql`(COALESCE(${column}, false) = false AND ${downstream})`;
}

function ascNullsLastSeek(
  column: SQL,
  value: string | number | null,
  next: SQL
): SQL {
  if (value === null) {
    return sql`(${column} IS NULL AND ${next})`;
  }
  return sql`(
    ${column} > ${value}
    OR ${column} IS NULL
    OR (${column} = ${value} AND ${next})
  )`;
}

function descNullsLastSeek(
  column: SQL,
  value: string | number | null,
  next: SQL
): SQL {
  if (value === null) {
    return sql`(${column} IS NULL AND ${next})`;
  }
  return sql`(
    ${column} < ${value}
    OR ${column} IS NULL
    OR (${column} = ${value} AND ${next})
  )`;
}

function variantCandidateOrderBy(direction: "asc" | "desc"): SQL {
  return direction === "asc"
    ? sql`vp.product_id ASC, vp.price_minor ASC, vp.variant_doc_id ASC`
    : sql`vp.product_id ASC, vp.price_minor DESC, vp.variant_doc_id ASC`;
}

function variantFinalOrderBy(direction: "asc" | "desc"): SQL {
  return direction === "asc"
    ? sql`chosen.price_minor ASC, chosen.product_id ASC, chosen.variant_doc_id ASC`
    : sql`chosen.price_minor DESC, chosen.product_id ASC, chosen.variant_doc_id ASC`;
}

function assertNeverSort(value: StorefrontSortKind): never {
  throw new StorefrontRepositoryValidationError(`Unsupported listing sort: ${value}`);
}

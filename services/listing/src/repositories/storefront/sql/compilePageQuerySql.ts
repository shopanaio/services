import { sql, type SQL } from "drizzle-orm";
import { StorefrontRepositoryValidationError } from "../types.js";
import type {
  DecodedListingCursor,
  ProductSortCollectKind,
  ResolvedFacetFilterGroup,
  StorefrontSortKind,
} from "../types.js";
import {
  ZERO_UUID,
  type ListingSqlRequest,
} from "./compileListingInputSql.js";
import { compileVariantProjectionSql } from "./compileVariantProjectionSql.js";
import { coalesceBitmapSql, emptyRoaringBitmapSql } from "../sqlHelpers.js";

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
      WHERE s.project_id = i.project_id
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

  const variantDirection = request.sortKind === "price_desc" ? "desc" : "asc";
  const variantSeek = buildVariantPriceSeek(
    variantDirection,
    request.request.cursor
  );
  const limitSql = sql`(SELECT first + 1 FROM input)`;
  const pricePredicate = compilePricePredicateSql(request, sql`vp`);
  const optionPredicate = compileOptionVariantPredicateSql(request, sql`vp`);

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
        ON pli.project_id = i.project_id
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

function compileInputCte(request: ListingSqlRequest): SQL {
  return sql`
    input AS (
      SELECT
        ${request.projectId}::uuid AS project_id,
        ${request.locale}::text AS locale,
        ${request.currency}::text AS currency,
        ${request.first}::int AS first
    )
  `;
}

function compileScopeProductCtes(request: ListingSqlRequest): SQL {
  const searchCandidates = needsSearchCandidates(request)
    ? sql`${compileSearchCandidateRowsCte(request)},`
    : sql``;

  return sql`
    ${searchCandidates}
    scope_products AS (
      SELECT ${compileScopeProductBitmapSql(request)} AS bitmap
    )
  `;
}

function compileSearchCandidateRowsCte(request: ListingSqlRequest): SQL {
  if (!request.normalizedQuery) {
    throw new StorefrontRepositoryValidationError(
      "Search scope requires a non-empty query"
    );
  }

  return sql`
    search_candidate_rows AS (
      SELECT
        pli.product_doc_id::int AS product_doc_id,
        pli.product_id AS product_id,
        pli.in_stock AS in_stock,
        pdb.score(ptsi.search_id)::double precision AS relevance_score
      FROM listing.product_title_bm25_search_index ptsi
      JOIN listing.product_listing_index pli
        ON pli.project_id = ptsi.project_id
       AND pli.product_id = ptsi.product_id
       AND pli.status = 'published'
      WHERE ptsi.project_id = ${request.projectId}::uuid
        AND ptsi.locale = ${request.locale}
        AND ptsi.status = 'published'
        AND ptsi.title @@@ ${request.normalizedQuery}
    )
  `;
}

function compileScopeProductBitmapSql(request: ListingSqlRequest): SQL {
  switch (request.scopeKind) {
    case "category":
      return sql`(
        ${compilePublishedProductBitmapSql(request)}
        & ${coalesceBitmapSql(sql`(
          SELECT p.bitmap
          FROM listing.listing_posting_bitmap p
          WHERE p.project_id = ${request.projectId}::uuid
            AND p.entity_type = 'product'
            AND p.field = 'category'
            AND p.value_key = ${request.scopeId}
        )`)}
      )`;
    case "search":
      return coalesceBitmapSql(sql`(
        SELECT rb_build_agg(c.product_doc_id)
        FROM search_candidate_rows c
      )`);
    default:
      return emptyRoaringBitmapSql();
  }
}

function compilePublishedProductBitmapSql(request: ListingSqlRequest): SQL {
  return coalesceBitmapSql(sql`(
    SELECT rb_build_agg(pli.product_doc_id)
    FROM listing.product_listing_index pli
    WHERE pli.project_id = ${request.projectId}::uuid
      AND pli.status = 'published'
  )`);
}

function compileProductMatchesBitmapSql(
  request: ListingSqlRequest,
  options: {
    includeProductStock: boolean;
    includeVariantProjection: boolean;
  }
): SQL {
  const parts: SQL[] = [sql`(SELECT bitmap FROM scope_products)`];
  const productFacetBitmap = compileFacetGroupsBitmapSql(
    request,
    "product",
    request.request.filterPlan.productFacetGroups
  );
  const vendorBitmap = compileVendorBitmapSql(request);

  if (productFacetBitmap) {
    parts.push(productFacetBitmap);
  }
  if (vendorBitmap) {
    parts.push(vendorBitmap);
  }
  if (
    options.includeProductStock &&
    request.request.filterPlan.inStock !== undefined
  ) {
    parts.push(compileProductStockBitmapSql(request));
  }

  if (options.includeVariantProjection) {
    const projectedVariantProducts = compileProjectedVariantProductsBitmapSql(
      request
    );
    if (projectedVariantProducts) {
      parts.push(projectedVariantProducts);
    }
  }

  return andBitmapSql(parts);
}

function compileProjectedVariantProductsBitmapSql(
  request: ListingSqlRequest
): SQL | null {
  const variantMatches = compileVariantMatchesBitmapSql(request);
  if (!variantMatches) {
    return null;
  }

  return compileVariantProjectionSql({
    projectIdSql: sql`${request.projectId}::uuid`,
    variantBitmapSql: variantMatches,
  });
}

function compileVariantMatchesBitmapSql(request: ListingSqlRequest): SQL | null {
  if (!hasVariantPredicate(request)) {
    return null;
  }

  const plan = request.request.filterPlan;
  const parts: SQL[] = [];
  const optionBitmap = compileFacetGroupsBitmapSql(
    request,
    "variant",
    plan.optionFacetGroups
  );

  if (optionBitmap) {
    parts.push(optionBitmap);
  }
  if (plan.priceRange) {
    parts.push(compilePriceVariantBitmapSql(request));
  }
  if (plan.inStock !== undefined) {
    parts.push(compileVariantStockBitmapSql(request, plan.inStock));
  } else if (optionBitmap && !plan.priceRange) {
    parts.push(compileVariantStockBitmapSql(request, true));
  }

  return parts.length > 0 ? andBitmapSql(parts) : null;
}

function compileFacetGroupsBitmapSql(
  request: ListingSqlRequest,
  entityType: "product" | "variant",
  groups: readonly ResolvedFacetFilterGroup[]
): SQL | null {
  if (groups.length === 0) {
    return null;
  }

  return andBitmapSql(
    groups.map((group) => compileFacetGroupBitmapSql(request, entityType, group))
  );
}

function compileFacetGroupBitmapSql(
  request: ListingSqlRequest,
  entityType: "product" | "variant",
  group: ResolvedFacetFilterGroup
): SQL {
  if (group.valueKeys.length === 0) {
    return emptyRoaringBitmapSql();
  }

  return coalesceBitmapSql(sql`(
    SELECT rb_or_agg(p.bitmap)
    FROM listing.listing_posting_bitmap p
    WHERE p.project_id = ${request.projectId}::uuid
      AND p.entity_type = ${entityType}
      AND p.field = 'facet'
      AND p.value_key IN (${joinTextValues(group.valueKeys)})
  )`);
}

function compileVendorBitmapSql(request: ListingSqlRequest): SQL | null {
  const vendorIds = request.request.filterPlan.vendorIds;
  if (vendorIds.length === 0) {
    return null;
  }

  return coalesceBitmapSql(sql`(
    SELECT rb_or_agg(p.bitmap)
    FROM listing.listing_posting_bitmap p
    WHERE p.project_id = ${request.projectId}::uuid
      AND p.entity_type = 'product'
      AND p.field = 'vendor'
      AND p.value_key IN (${joinTextValues(vendorIds)})
  )`);
}

function compileProductStockBitmapSql(request: ListingSqlRequest): SQL {
  return coalesceBitmapSql(sql`(
    SELECT rb_build_agg(pli.product_doc_id)
    FROM listing.product_listing_index pli
    WHERE pli.project_id = ${request.projectId}::uuid
      AND pli.status = 'published'
      AND pli.in_stock = ${request.request.filterPlan.inStock}
  )`);
}

function compileVariantStockBitmapSql(
  request: ListingSqlRequest,
  inStock: boolean
): SQL {
  return coalesceBitmapSql(sql`(
    SELECT rb_build_agg(vli.variant_doc_id)
    FROM listing.variant_listing_index vli
    WHERE vli.project_id = ${request.projectId}::uuid
      AND vli.in_stock = ${inStock}
  )`);
}

function compilePriceVariantBitmapSql(request: ListingSqlRequest): SQL {
  return coalesceBitmapSql(sql`(
    SELECT rb_build_agg(vp.variant_doc_id)
    FROM listing.listing_posting_variant_price vp
    JOIN listing.variant_listing_index vli
      ON vli.project_id = vp.project_id
     AND vli.variant_doc_id = vp.variant_doc_id
     AND vli.product_doc_id = vp.product_doc_id
     AND vli.product_id = vp.product_id
     AND vli.in_stock = true
    WHERE vp.project_id = ${request.projectId}::uuid
      AND vp.currency = ${request.currency}
      ${compilePricePredicateSql(request, sql`vp`)}
  )`);
}

function compilePricePredicateSql(request: ListingSqlRequest, alias: SQL): SQL {
  const range = request.request.filterPlan.priceRange;
  if (!range) {
    return sql``;
  }

  const minPredicate =
    range.minPriceMinor === undefined
      ? sql``
      : sql`AND ${alias}.price_minor >= ${range.minPriceMinor}`;
  const maxPredicate =
    range.maxPriceMinor === undefined
      ? sql``
      : sql`AND ${alias}.price_minor <= ${range.maxPriceMinor}`;

  return sql`${minPredicate} ${maxPredicate}`;
}

function compileOptionVariantPredicateSql(
  request: ListingSqlRequest,
  alias: SQL
): SQL {
  const optionBitmap = compileFacetGroupsBitmapSql(
    request,
    "variant",
    request.request.filterPlan.optionFacetGroups
  );

  return optionBitmap
    ? sql`AND ${optionBitmap} @> ${alias}.variant_doc_id`
    : sql``;
}

function andBitmapSql(parts: readonly SQL[]): SQL {
  if (parts.length === 0) {
    return emptyRoaringBitmapSql();
  }
  return parts
    .slice(1)
    .reduce((acc, part) => sql`(${acc} & ${part})`, parts[0]);
}

function joinTextValues(values: readonly string[]): SQL {
  return sql.join(values.map((value) => sql`${value}`), sql`, `);
}

function needsSearchCandidates(request: ListingSqlRequest): boolean {
  return request.scopeKind === "search" || request.sortKind === "relevance";
}

function isMatchedVariantPricePage(request: ListingSqlRequest): boolean {
  return (
    (request.sortKind === "price_asc" || request.sortKind === "price_desc") &&
    hasVariantPredicate(request)
  );
}

function hasVariantPredicate(request: ListingSqlRequest): boolean {
  const plan = request.request.filterPlan;
  return plan.optionFacetGroups.length > 0 || !!plan.priceRange;
}

function shouldApplyProductStockAtProductLevel(request: ListingSqlRequest): boolean {
  return request.request.filterPlan.inStock !== undefined && !hasVariantPredicate(request);
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
    case "name":
      return {
        sort: "name",
        sortKind: "name",
        locale: request.locale,
        currency: "",
        manualScopeId: ZERO_UUID,
        orderBy: sql`s.bool_value DESC, s.text_value ASC NULLS LAST, s.product_id ASC`,
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
    case "name":
      downstream = ascNullsLastSeek(
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

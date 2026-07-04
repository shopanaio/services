import { sql, type SQL } from "drizzle-orm";
import { StorefrontRepositoryValidationError } from "../types.js";
import type { ResolvedFacetFilterGroup } from "../types.js";
import { coalesceBitmapSql, emptyRoaringBitmapSql } from "../sqlHelpers.js";
import type { ListingSqlRequest } from "./compileListingInputSql.js";

export function compileInputCte(request: ListingSqlRequest): SQL {
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

export function compileScopeProductCtes(request: ListingSqlRequest): SQL {
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

export function compileProductMatchesBitmapSql(
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

export function compilePricePredicateSql(
  request: ListingSqlRequest,
  alias: SQL
): SQL {
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

export function compileOptionVariantPredicateSql(
  request: ListingSqlRequest,
  alias: SQL
): SQL {
  const optionBitmap = compileOptionVariantBitmapSql(request);

  return optionBitmap
    ? sql`AND ${optionBitmap} @> ${alias}.variant_doc_id`
    : sql``;
}

export function compileOptionVariantBitmapSql(
  request: ListingSqlRequest
): SQL | null {
  return compileFacetGroupsBitmapSql(
    request,
    "variant",
    request.request.filterPlan.optionFacetGroups
  );
}

export function hasVariantPredicate(request: ListingSqlRequest): boolean {
  const plan = request.request.filterPlan;
  return plan.optionFacetGroups.length > 0 || !!plan.priceRange;
}

export function shouldApplyProductStockAtProductLevel(
  request: ListingSqlRequest
): boolean {
  return (
    request.request.filterPlan.inStock !== undefined &&
    !hasVariantPredicate(request)
  );
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

function compileProjectedVariantProductsBitmapSql(
  request: ListingSqlRequest
): SQL | null {
  if (!hasVariantPredicate(request)) {
    return null;
  }

  const plan = request.request.filterPlan;
  const optionBitmap = compileFacetGroupsBitmapSql(
    request,
    "variant",
    plan.optionFacetGroups
  );

  if (plan.priceRange) {
    return compilePricedVariantProductsBitmapSql(request, optionBitmap);
  }

  return optionBitmap
    ? compileOptionVariantProductsBitmapSql(
        request,
        optionBitmap,
        plan.inStock ?? true
      )
    : null;
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

function compilePricedVariantProductsBitmapSql(
  request: ListingSqlRequest,
  optionBitmap: SQL | null
): SQL {
  if (request.request.filterPlan.inStock === false) {
    return emptyRoaringBitmapSql();
  }

  // listing_posting_variant_price stores only priced active in-stock variants.
  if (optionBitmap) {
    return coalesceBitmapSql(sql`(
      WITH option_variant_matches AS MATERIALIZED (
        SELECT ${optionBitmap} AS bitmap
      )
      SELECT rb_build_agg(vp.product_doc_id)
      FROM option_variant_matches ovm
      JOIN listing.listing_posting_variant_price vp
        ON vp.project_id = ${request.projectId}::uuid
       AND vp.currency = ${request.currency}
      WHERE ovm.bitmap @> vp.variant_doc_id
        ${compilePricePredicateSql(request, sql`vp`)}
    )`);
  }

  return coalesceBitmapSql(sql`(
    SELECT rb_build_agg(vp.product_doc_id)
    FROM listing.listing_posting_variant_price vp
    WHERE vp.project_id = ${request.projectId}::uuid
      AND vp.currency = ${request.currency}
      ${compilePricePredicateSql(request, sql`vp`)}
  )`);
}

function compileOptionVariantProductsBitmapSql(
  request: ListingSqlRequest,
  optionBitmap: SQL,
  inStock: boolean
): SQL {
  return coalesceBitmapSql(sql`(
    WITH option_variant_matches AS MATERIALIZED (
      SELECT ${optionBitmap} AS bitmap
    )
    SELECT rb_build_agg(vli.product_doc_id)
    FROM option_variant_matches ovm
    CROSS JOIN LATERAL rb_iterate(ovm.bitmap) AS ov(variant_doc_id)
    JOIN listing.variant_listing_index vli
      ON vli.project_id = ${request.projectId}::uuid
     AND vli.variant_doc_id = ov.variant_doc_id
     AND vli.in_stock = ${inStock}
  )`);
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

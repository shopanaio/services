import { sql, type SQL } from "drizzle-orm";
import {
  coalesceBitmapSql,
  emptyRoaringBitmapSql,
} from "../sqlHelpers.js";
import type { ListingSqlRequest } from "./compileListingInputSql.js";
import { compileVariantProjectionSql } from "./compileVariantProjectionSql.js";
import type { RuleCollectionPredicate } from "../types.js";

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
    rule_collection_scope AS (
      SELECT
        CASE
          WHEN i.scope_kind = 'rule_collection'
          THEN ${compileRuleCollectionProductScopeSql(request.scope)}
          ELSE NULL
        END AS product_bitmap,
        CASE
          WHEN i.scope_kind = 'rule_collection'
          THEN ${compileRuleCollectionVariantScopeSql(request.scope)}
          ELSE NULL
        END AS variant_bitmap
      FROM input i
    ),
    scope_variant_filters AS (
      SELECT variant_bitmap AS bitmap
      FROM rule_collection_scope
    ),
    raw_scope_products AS (
      SELECT
        CASE
          WHEN i.scope_kind IN ('category', 'manual_collection')
          THEN COALESCE((
            SELECT p.bitmap
            FROM listing.listing_posting_bitmap p
            WHERE p.project_id = i.project_id
              AND p.entity_type = 'product'
              AND p.field = CASE
                WHEN i.scope_kind = 'category' THEN 'category'
                ELSE 'collection'
              END
              AND p.value_key = i.scope_id::text
          ), ${emptyRoaringBitmapSql()})
          WHEN i.scope_kind = 'global'
          THEN COALESCE((
            SELECT rb_build_agg(pli.product_doc_id)
            FROM listing.product_listing_index pli
            WHERE pli.project_id = i.project_id
              AND pli.status = 'published'
          ), ${emptyRoaringBitmapSql()})
          WHEN i.scope_kind = 'search'
          THEN COALESCE((SELECT bitmap FROM search_candidate_products), ${emptyRoaringBitmapSql()})
          WHEN i.scope_kind = 'rule_collection'
          THEN COALESCE((SELECT product_bitmap FROM rule_collection_scope), ${emptyRoaringBitmapSql()})
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

function compileRuleCollectionProductScopeSql(
  scope: ListingSqlRequest["scope"]
): SQL {
  if (scope.kind !== "rule_collection") {
    return sql`NULL::roaringbitmap`;
  }

  const productRuleBitmaps: SQL[] = [];
  const variantRuleBitmaps = compileVariantRuleBitmaps(scope.rules);

  for (const rule of scope.rules) {
    switch (rule.kind) {
      case "category":
        productRuleBitmaps.push(productPostingBitmapSql("category", rule.categoryId));
        break;
      case "collection":
        productRuleBitmaps.push(
          productPostingBitmapSql("collection", rule.collectionId)
        );
        break;
      case "vendor":
        productRuleBitmaps.push(productPostingBitmapSql("vendor", rule.vendorId));
        break;
      case "product_facet":
        productRuleBitmaps.push(
          postingValuesBitmapSql("product", "facet", rule.valueKeys)
        );
        break;
      case "option_facet":
      case "price":
      case "in_stock":
        break;
    }
  }

  const scopeParts: SQL[] = [];
  if (productRuleBitmaps.length > 0) {
    scopeParts.push(orBitmapsSql(productRuleBitmaps));
  }
  if (variantRuleBitmaps.variantRuleScopeSql) {
    scopeParts.push(
      compileVariantProjectionSql({
        projectIdSql: sql`i.project_id`,
        variantBitmapSql: variantRuleBitmaps.variantRuleScopeSql,
      })
    );
  }

  if (scopeParts.length === 0) {
    return coalesceBitmapSql(sql`(
      SELECT rb_build_agg(pli.product_doc_id)
      FROM listing.product_listing_index pli
      WHERE pli.project_id = i.project_id
        AND pli.status = 'published'
    )`);
  }

  return orBitmapsSql(scopeParts);
}

function compileRuleCollectionVariantScopeSql(
  scope: ListingSqlRequest["scope"]
): SQL {
  if (scope.kind !== "rule_collection") {
    return sql`NULL::roaringbitmap`;
  }

  const hasProductRules = scope.rules.some((rule) =>
    ["category", "collection", "vendor", "product_facet"].includes(rule.kind)
  );
  if (hasProductRules) {
    return sql`NULL::roaringbitmap`;
  }

  return compileVariantRuleBitmaps(scope.rules).variantRuleScopeSql
    ?? sql`NULL::roaringbitmap`;
}

function compileVariantRuleBitmaps(rules: readonly RuleCollectionPredicate[]): {
  variantRuleScopeSql: SQL | null;
} {
  const variantRuleBitmaps: SQL[] = [];
  let hasOptionRule = false;
  let hasExplicitStockRule = false;

  for (const rule of rules) {
    switch (rule.kind) {
      case "option_facet":
        hasOptionRule = true;
        variantRuleBitmaps.push(
          postingValuesBitmapSql("variant", "facet", rule.valueKeys)
        );
        break;
      case "price":
        variantRuleBitmaps.push(priceRuleVariantBitmapSql(rule));
        break;
      case "in_stock":
        hasExplicitStockRule = true;
        variantRuleBitmaps.push(variantStockBitmapSql(rule.value));
        break;
      case "category":
      case "collection":
      case "vendor":
      case "product_facet":
        break;
    }
  }

  if (hasOptionRule && !hasExplicitStockRule) {
    variantRuleBitmaps.push(variantStockBitmapSql(true));
  }

  return {
    variantRuleScopeSql:
      variantRuleBitmaps.length > 0 ? andBitmapsSql(variantRuleBitmaps) : null,
  };
}

function productPostingBitmapSql(
  field: "category" | "collection" | "vendor" | "facet",
  valueKey: string
): SQL {
  return coalesceBitmapSql(sql`(
    SELECT p.bitmap
    FROM listing.listing_posting_bitmap p
    WHERE p.project_id = i.project_id
      AND p.entity_type = 'product'
      AND p.field = ${field}
      AND p.value_key = ${valueKey}
  )`);
}

function postingValuesBitmapSql(
  entityType: "product" | "variant",
  field: "facet",
  valueKeys: readonly string[]
): SQL {
  const uniqueValueKeys = [...new Set(valueKeys.map((value) => value.trim()))].filter(
    Boolean
  );
  if (uniqueValueKeys.length === 0) {
    return emptyRoaringBitmapSql();
  }

  return coalesceBitmapSql(sql`(
    SELECT rb_or_agg(p.bitmap)
    FROM listing.listing_posting_bitmap p
    WHERE p.project_id = i.project_id
      AND p.entity_type = ${entityType}
      AND p.field = ${field}
      AND p.value_key IN (${sql.join(
        uniqueValueKeys.map((valueKey) => sql`${valueKey}`),
        sql`, `
      )})
  )`);
}

function priceRuleVariantBitmapSql(
  rule: Extract<RuleCollectionPredicate, { kind: "price" }>
): SQL {
  const minPredicate =
    rule.minPriceMinor !== undefined
      ? sql`AND vp.price_minor >= ${rule.minPriceMinor}`
      : sql``;
  const maxPredicate =
    rule.maxPriceMinor !== undefined
      ? sql`AND vp.price_minor <= ${rule.maxPriceMinor}`
      : sql``;

  return coalesceBitmapSql(sql`(
    SELECT rb_build_agg(vp.variant_doc_id)
    FROM listing.variant_listing_price_index vp
    JOIN listing.variant_listing_index vli
      ON vli.project_id = vp.project_id
     AND vli.variant_id = vp.variant_id
     AND vli.in_stock = true
    WHERE vp.project_id = i.project_id
      AND vp.currency = i.currency
      AND vp.has_price = true
      AND vp.price_minor IS NOT NULL
      AND vp.variant_doc_id IS NOT NULL
      AND vp.product_doc_id IS NOT NULL
      AND vp.product_id IS NOT NULL
      ${minPredicate}
      ${maxPredicate}
  )`);
}

function variantStockBitmapSql(inStock: boolean): SQL {
  return coalesceBitmapSql(sql`(
    SELECT rb_build_agg(vli.variant_doc_id)
    FROM listing.variant_listing_index vli
    WHERE vli.project_id = i.project_id
      AND vli.in_stock = ${inStock}
  )`);
}

function orBitmapsSql(bitmaps: readonly SQL[]): SQL {
  if (bitmaps.length === 0) {
    return emptyRoaringBitmapSql();
  }
  return bitmaps
    .slice(1)
    .reduce((acc, bitmapSql) => sql`(${acc} | ${bitmapSql})`, bitmaps[0]);
}

function andBitmapsSql(bitmaps: readonly SQL[]): SQL {
  if (bitmaps.length === 0) {
    return emptyRoaringBitmapSql();
  }
  return bitmaps
    .slice(1)
    .reduce((acc, bitmapSql) => sql`(${acc} & ${bitmapSql})`, bitmaps[0]);
}

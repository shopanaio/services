import { sql, type SQL } from "drizzle-orm";
import { emptyRoaringBitmapSql } from "../sqlHelpers.js";
import { compileFacetResolutionSql } from "./compileFacetResolutionSql.js";
import {
  compileListingInputSql,
  type ListingSqlRequest,
} from "./compileListingInputSql.js";
import { compileScopeSql } from "./compileScopeSql.js";
import { compileFiltersSql } from "./compileFiltersSql.js";

const MAX_OPTION_FACET_CHECK_ESTIMATE = Number.MAX_SAFE_INTEGER;

export const FACET_COUNTS_PROFILE_TARGETS = [
  "candidate_values",
  "visible_facet_values",
  "option_facet_values",
  "option_candidate_signature_keys",
  "option_required_signature_matches",
  "option_matching_signature_keys",
  "option_price_signature_product_bitmaps",
  "option_signature_price_product_bitmaps",
  "option_signature_facet_counts",
  "option_facet_counts",
] as const;

export const SIMPLE_FACET_COUNTS_PROFILE_TARGETS = [
  "candidate_values",
  "visible_facet_values",
  "option_facet_values",
  "option_facet_counts",
] as const;

export type FacetCountsProfileTarget =
  | (typeof FACET_COUNTS_PROFILE_TARGETS)[number]
  | (typeof SIMPLE_FACET_COUNTS_PROFILE_TARGETS)[number];

export interface FacetCountsVisibleFacetValue {
  facetId: string;
  facetType: string;
  valueKey: string;
}

export function compileFacetCountsQuerySql(
  request: ListingSqlRequest,
  options: {
    visibleFacetValues?: readonly FacetCountsVisibleFacetValue[];
  } = {}
) {
  return compileFacetCountsQuerySqlWithOptions(request, {
    heavyStrategyEnabled: request.heavyOptionFacetCountsEnabled,
    visibleFacetValues: options.visibleFacetValues,
  });
}

export function facetCountsProfileTargetsForRequest(
  request: ListingSqlRequest
): readonly FacetCountsProfileTarget[] {
  return canUseSimpleOptionFacetCounts(request)
    ? SIMPLE_FACET_COUNTS_PROFILE_TARGETS
    : FACET_COUNTS_PROFILE_TARGETS;
}

export function compileFacetCountsProfileQuerySql(
  request: ListingSqlRequest,
  target: FacetCountsProfileTarget,
  options: {
    visibleFacetValues?: readonly FacetCountsVisibleFacetValue[];
  } = {}
): SQL {
  return sql`
    /* listing:facetCountsProfile:${sql.raw(target)} */
    WITH
    ${compileFacetCountsCtesSql(request, {
      heavyStrategyEnabled: request.heavyOptionFacetCountsEnabled,
      visibleFacetValues: options.visibleFacetValues,
    })}
    ${compileFacetCountsProfileSelectSql(target)}
  `;
}

function compileFacetCountsQuerySqlWithOptions(
  request: ListingSqlRequest,
  options: FacetCountStrategyOptions
) {
  return sql`
    /* listing:facetCounts */
    WITH
    ${compileFacetCountsCtesSql(request, options)}
    SELECT
      frg.error_code AS "facetErrorCode",
      frg.error_value AS "facetErrorValue",
      c.facet_id AS "facetId",
      c.facet_type AS "facetType",
      c.value_key AS "valueKey",
      c.count::int AS "count"
    FROM facet_resolution_guard frg
    LEFT JOIN counts c
      ON frg.error_code IS NULL
  `;
}

function compileFacetCountsCtesSql(
  request: ListingSqlRequest,
  options: FacetCountStrategyOptions
): SQL {
  const forcedTargetFacetIds = normalizeFacetIds(
    options.forceHeavyOptionFacetCountFacetIds ?? []
  );
  const heavyStrategyEnabled =
    options.heavyStrategyEnabled || forcedTargetFacetIds.length > 0;
  const simpleOptionFacetCounts = canUseSimpleOptionFacetCounts(request);
  const optionActiveFilterValueRowsSql =
    compileOptionActiveFilterValueRowsSql(request);
  const optionFacetCountStrategySql = heavyStrategyEnabled
    ? sql`${compileOptionFacetCountStrategySql({
        request,
        autoHeavyOptionFacetCountsEnabled: options.heavyStrategyEnabled,
        forceHeavyOptionFacetCountFacetIds: forcedTargetFacetIds,
      })},`
    : sql``;
  const optionSignatureSql = simpleOptionFacetCounts
    ? sql``
    : sql`${compileOptionSignatureBaseStateSql(heavyStrategyEnabled)},
    ${compileOptionSignatureMatchingSql({
      optimizePriceSignatureLookup: !heavyStrategyEnabled,
    })},`;
  const optionFacetCountsProducerSql = simpleOptionFacetCounts
    ? compileSimpleOptionFacetCountsProducerSql()
    : heavyStrategyEnabled
      ? compileHeavyOptionFacetCountsProducerSql()
      : compileCandidateOnlyOptionFacetCountsProducerSql();
  const facetValueDiscoverySql = options.visibleFacetValues
    ? compileProvidedFacetValueCtesSql(options.visibleFacetValues)
    : compileDiscoveredFacetValueCtesSql();

  return sql`
    ${compileFacetCountsCoreSql(request)},
    scope_product_base AS (
      SELECT sp.bitmap & pp.bitmap AS bitmap
      FROM scope_products sp
      CROSS JOIN published_products pp
    ),
    ${facetValueDiscoverySql}
    product_facet_values AS (
      SELECT *
      FROM visible_facet_values
      WHERE facet_type IN ('TAG', 'FEATURE')
    ),
    option_facet_values AS (
      SELECT *
      FROM visible_facet_values
      WHERE facet_type = 'OPTION'
    ),
    ${optionFacetCountStrategySql}
    product_facet_value_bitmaps AS (
      SELECT
        fv.facet_id,
        fv.facet_type,
        fv.value_key,
        p.bitmap AS value_bitmap
      FROM product_facet_values fv
      JOIN input i ON true
      JOIN listing.listing_posting_bitmap p
        ON p.project_id = i.project_id
       AND p.entity_type = 'product'
       AND p.field = 'facet'
       AND p.value_key = fv.value_key
    ),
    product_facet_counts AS (
      SELECT
        pvb.facet_id,
        pvb.facet_type,
        pvb.value_key,
        rb_cardinality(
          (
            SELECT
              CASE
                WHEN isolated_product_filters.bitmap IS NOT NULL
                 AND projected_variant_products.bitmap IS NOT NULL
                THEN scope_products.bitmap
                  & published_products.bitmap
                  & isolated_product_filters.bitmap
                  & projected_variant_products.bitmap
                WHEN isolated_product_filters.bitmap IS NOT NULL
                THEN scope_products.bitmap
                  & published_products.bitmap
                  & isolated_product_filters.bitmap
                WHEN projected_variant_products.bitmap IS NOT NULL
                THEN scope_products.bitmap
                  & published_products.bitmap
                  & projected_variant_products.bitmap
                ELSE scope_products.bitmap & published_products.bitmap
              END
            FROM scope_products
            CROSS JOIN published_products
            CROSS JOIN projected_variant_products
            CROSS JOIN LATERAL (
              SELECT rb_and_agg(bitmap) AS bitmap
              FROM (
                SELECT pfg.bitmap
                FROM product_filter_groups pfg
                WHERE pfg.facet_id <> pvb.facet_id

                UNION ALL

                SELECT bitmap FROM vendor_filter_group
                WHERE EXISTS (
                  SELECT 1
                  FROM input i
                  CROSS JOIN LATERAL jsonb_array_elements_text(i.vendor_ids_json)
                    v(vendor_id)
                )

                UNION ALL

                SELECT bitmap
                FROM active_stock_product_filter
                WHERE bitmap IS NOT NULL
              ) isolated_product_filter_parts
            ) isolated_product_filters
          )
          & pvb.value_bitmap
        )::int AS count
      FROM product_facet_value_bitmaps pvb
    ),
    option_count_product_scope AS (
      SELECT
        CASE
          WHEN product_filters.bitmap IS NOT NULL
          THEN scope_product_base.bitmap & product_filters.bitmap
          ELSE scope_product_base.bitmap
        END AS bitmap
      FROM scope_product_base
      CROSS JOIN product_filters
    ),
    ${optionActiveFilterValueRowsSql},
    ${optionSignatureSql}
    ${optionFacetCountsProducerSql},
    counts AS (
      SELECT * FROM product_facet_counts
      UNION ALL
      SELECT * FROM option_facet_counts
    )
  `;
}

function compileProvidedFacetValueCtesSql(
  values: readonly FacetCountsVisibleFacetValue[]
): SQL {
  const rows = values.map(
    (value) =>
      sql`(${value.facetId}::text, ${value.facetType}::text, ${value.valueKey}::text)`
  );

  return sql`
    visible_facet_values AS (
      ${valuesOrEmpty(
        rows,
        "visible_facet_value_input",
        sql`facet_id, facet_type, value_key`,
        sql`SELECT
          NULL::text AS facet_id,
          NULL::text AS facet_type,
          NULL::text AS value_key
        WHERE false`
      )}
    ),
    candidate_values AS (
      SELECT DISTINCT value_key
      FROM visible_facet_values
    ),
  `;
}

function compileDiscoveredFacetValueCtesSql(): SQL {
  return sql`
    scope_variants AS (
      SELECT COALESCE(rb_build_agg(vli.variant_doc_id), ${emptyRoaringBitmapSql()}) AS bitmap
      FROM listing.variant_listing_index vli
      JOIN input i ON true
      CROSS JOIN scope_product_base sp
      CROSS JOIN scope_variant_filters svf
      WHERE vli.project_id = i.project_id
        AND vli.in_stock = true
        AND sp.bitmap @> vli.product_doc_id
        AND (svf.bitmap IS NULL OR svf.bitmap @> vli.variant_doc_id)
    ),
    candidate_values AS (
      SELECT DISTINCT p.value_key
      FROM input i
      CROSS JOIN scope_product_base sp
      JOIN listing.listing_posting_bitmap p
        ON p.project_id = i.project_id
       AND p.entity_type = 'product'
       AND p.field = 'facet'
       AND rb_cardinality(sp.bitmap & p.bitmap) > 0

      UNION

      SELECT DISTINCT p.value_key
      FROM input i
      CROSS JOIN scope_variants sv
      JOIN listing.listing_posting_bitmap p
        ON p.project_id = i.project_id
       AND p.entity_type = 'variant'
       AND p.field = 'facet'
       AND rb_cardinality(sv.bitmap & p.bitmap) > 0
    ),
    visible_facet_values AS (
      SELECT DISTINCT
        f.id::text AS facet_id,
        f.slug AS facet_slug,
        f.facet_type,
        fv.id::text AS facet_value_id,
        fv.sort_index AS value_sort,
        f.id::text || ':' || fv.id::text AS value_key
      FROM input i
      JOIN catalog.facet f
        ON f.project_id = i.project_id
      JOIN catalog.facet_value fv
        ON fv.project_id = f.project_id
       AND fv.facet_id = f.id
       AND fv.kind = 'display'
       AND fv.parent_id IS NULL
       AND fv.enabled = true
       AND fv.reference_status = 'VALID'
      JOIN candidate_values cv
        ON cv.value_key = f.id::text || ':' || fv.id::text
    ),
  `;
}

function compileFacetCountsProfileSelectSql(
  target: FacetCountsProfileTarget
): SQL {
  switch (target) {
    case "candidate_values":
      return sql`
        SELECT
          'candidate_values'::text AS "target",
          COUNT(*)::int AS "rowCount",
          NULL::int AS "distinctSignatureCount",
          NULL::int AS "bitmapCardinality",
          NULL::int AS "countSum"
        FROM candidate_values
      `;
    case "visible_facet_values":
      return sql`
        SELECT
          'visible_facet_values'::text AS "target",
          COUNT(*)::int AS "rowCount",
          NULL::int AS "distinctSignatureCount",
          NULL::int AS "bitmapCardinality",
          NULL::int AS "countSum"
        FROM visible_facet_values
      `;
    case "option_facet_values":
      return sql`
        SELECT
          'option_facet_values'::text AS "target",
          COUNT(*)::int AS "rowCount",
          NULL::int AS "distinctSignatureCount",
          NULL::int AS "bitmapCardinality",
          NULL::int AS "countSum"
        FROM option_facet_values
      `;
    case "option_candidate_signature_keys":
      return sql`
        SELECT
          'option_candidate_signature_keys'::text AS "target",
          COUNT(*)::int AS "rowCount",
          COUNT(DISTINCT signature_key)::int AS "distinctSignatureCount",
          NULL::int AS "bitmapCardinality",
          NULL::int AS "countSum"
        FROM option_candidate_signature_keys
      `;
    case "option_required_signature_matches":
      return sql`
        SELECT
          'option_required_signature_matches'::text AS "target",
          COUNT(*)::int AS "rowCount",
          COUNT(DISTINCT signature_key)::int AS "distinctSignatureCount",
          NULL::int AS "bitmapCardinality",
          NULL::int AS "countSum"
        FROM option_required_signature_matches
      `;
    case "option_matching_signature_keys":
      return sql`
        SELECT
          'option_matching_signature_keys'::text AS "target",
          COUNT(*)::int AS "rowCount",
          COUNT(DISTINCT signature_key)::int AS "distinctSignatureCount",
          NULL::int AS "bitmapCardinality",
          NULL::int AS "countSum"
        FROM option_matching_signature_keys
      `;
    case "option_price_signature_product_bitmaps":
      return sql`
        SELECT
          'option_price_signature_product_bitmaps'::text AS "target",
          COUNT(*)::int AS "rowCount",
          NULL::int AS "distinctSignatureCount",
          COALESCE(SUM(rb_cardinality(product_bitmap)), 0)::int AS "bitmapCardinality",
          NULL::int AS "countSum"
        FROM option_price_signature_product_bitmaps
      `;
    case "option_signature_price_product_bitmaps":
      return sql`
        SELECT
          'option_signature_price_product_bitmaps'::text AS "target",
          COUNT(*)::int AS "rowCount",
          NULL::int AS "distinctSignatureCount",
          COALESCE(SUM(rb_cardinality(bitmap)), 0)::int AS "bitmapCardinality",
          NULL::int AS "countSum"
        FROM option_signature_price_product_bitmaps
      `;
    case "option_signature_facet_counts":
      return sql`
        SELECT
          'option_signature_facet_counts'::text AS "target",
          COUNT(*)::int AS "rowCount",
          NULL::int AS "distinctSignatureCount",
          NULL::int AS "bitmapCardinality",
          COALESCE(SUM(count), 0)::int AS "countSum"
        FROM option_signature_facet_counts
      `;
    case "option_facet_counts":
      return sql`
        SELECT
          'option_facet_counts'::text AS "target",
          COUNT(*)::int AS "rowCount",
          NULL::int AS "distinctSignatureCount",
          NULL::int AS "bitmapCardinality",
          COALESCE(SUM(count), 0)::int AS "countSum"
        FROM option_facet_counts
      `;
  }
}

function compileFacetCountsCoreSql(request: ListingSqlRequest): SQL {
  return sql.join(
    [
      compileListingInputSql(request),
      compileFacetResolutionSql(),
      compileScopeSql(request),
      compileFiltersSql(),
    ],
    sql`, `
  );
}

function canUseSimpleOptionFacetCounts(request: ListingSqlRequest): boolean {
  const plan = request.request.filterPlan;
  return plan.optionFacetGroups.length === 0 && !plan.priceRange;
}

export function compileFacetCountsHeavyParityQuerySql(input: {
  request: ListingSqlRequest;
  targetFacetIds: readonly string[];
}): SQL {
  const targetFacetIds = normalizeFacetIds(input.targetFacetIds);
  const targetRows = targetFacetIds.map((facetId) => sql`(${facetId}::text)`);
  const candidateQuery = compileFacetCountsQuerySqlWithOptions({
    ...input.request,
    heavyOptionFacetCountsEnabled: false,
  }, {
    heavyStrategyEnabled: false,
  });
  const heavyQuery = compileFacetCountsQuerySqlWithOptions({
    ...input.request,
    heavyOptionFacetCountsEnabled: false,
  }, {
    heavyStrategyEnabled: true,
    forceHeavyOptionFacetCountFacetIds: targetFacetIds,
  });

  return sql`
    WITH parity_target_facets AS (
      ${valuesOrEmpty(
        targetRows,
        "target_facet_values",
        sql`facet_id`,
        sql`SELECT NULL::text AS facet_id WHERE false`
      )}
    ),
    candidate_counts AS (
      SELECT
        candidate."facetId"::text AS facet_id,
        candidate."facetType"::text AS facet_type,
        candidate."valueKey"::text AS value_key,
        candidate."count"::int AS count
      FROM (${candidateQuery}) candidate
      JOIN parity_target_facets target
        ON target.facet_id = candidate."facetId"
      WHERE candidate."facetErrorCode" IS NULL
        AND candidate."facetId" IS NOT NULL
        AND candidate."valueKey" IS NOT NULL
    ),
    heavy_counts AS (
      SELECT
        heavy."facetId"::text AS facet_id,
        heavy."facetType"::text AS facet_type,
        heavy."valueKey"::text AS value_key,
        heavy."count"::int AS count
      FROM (${heavyQuery}) heavy
      JOIN parity_target_facets target
        ON target.facet_id = heavy."facetId"
      WHERE heavy."facetErrorCode" IS NULL
        AND heavy."facetId" IS NOT NULL
        AND heavy."valueKey" IS NOT NULL
    )
    SELECT
      COALESCE(candidate.facet_id, heavy.facet_id) AS "facetId",
      COALESCE(candidate.facet_type, heavy.facet_type) AS "facetType",
      COALESCE(candidate.value_key, heavy.value_key) AS "valueKey",
      candidate.count AS "candidateCount",
      heavy.count AS "heavyCount"
    FROM candidate_counts candidate
    FULL OUTER JOIN heavy_counts heavy
      ON heavy.facet_id = candidate.facet_id
     AND heavy.value_key = candidate.value_key
    WHERE candidate.count IS DISTINCT FROM heavy.count
    ORDER BY
      COALESCE(candidate.facet_id, heavy.facet_id),
      COALESCE(candidate.value_key, heavy.value_key)
  `;
}

function compileOptionSignatureBaseStateSql(heavyStrategyEnabled: boolean): SQL {
  if (!heavyStrategyEnabled) {
    return sql`
      option_signature_base_state AS (
        SELECT
          ofv.value_key,
          false AS use_heavy_signature_path,
          COALESCE(sfs.has_value AND sfs.value = false, false) AS force_zero,
          NOT COALESCE(sfs.has_value AND sfs.value = false, false)
            AS signature_lookup_enabled
        FROM option_facet_values ofv
        CROSS JOIN stock_filter_state sfs
      )
    `;
  }

  return sql`
    option_signature_base_state AS (
      SELECT
        ofv.value_key,
        strategy.use_heavy_signature_path,
        COALESCE(sfs.has_value AND sfs.value = false, false) AS force_zero,
        NOT strategy.use_heavy_signature_path
          AND NOT COALESCE(sfs.has_value AND sfs.value = false, false)
          AS signature_lookup_enabled
      FROM option_facet_values ofv
      CROSS JOIN stock_filter_state sfs
      JOIN option_facet_count_strategy strategy
        ON strategy.facet_id = ofv.facet_id
    )
  `;
}

function compileOptionSignatureMatchingSql(input: {
  optimizePriceSignatureLookup: boolean;
}): SQL {
  const priceSignatureProductBitmapsSql = input.optimizePriceSignatureLookup
    ? compileOptimizedOptionPriceSignatureProductBitmapsSql()
    : compileWideOptionPriceSignatureProductBitmapsSql();

  return sql`
    option_candidate_signature_keys AS (
      SELECT
        ofv.facet_id,
        state.value_key AS candidate_value_key,
        sv.signature_key
      FROM option_signature_base_state state
      JOIN option_facet_values ofv
        ON ofv.value_key = state.value_key
      JOIN input i ON true
      JOIN listing.listing_option_signature_value sv
        ON sv.project_id = i.project_id
       AND sv.value_key = state.value_key
      WHERE state.signature_lookup_enabled
    ),
    option_required_facet_counts AS (
      SELECT
        candidate.candidate_value_key,
        COUNT(DISTINCT active.facet_id)::int AS required_facet_count
      FROM option_candidate_signature_keys candidate
      LEFT JOIN option_active_filter_value_rows active
        ON active.facet_id <> candidate.facet_id
      GROUP BY candidate.candidate_value_key
    ),
    option_required_signature_matches AS (
      SELECT
        candidate.candidate_value_key,
        candidate.signature_key,
        COUNT(DISTINCT active.facet_id)::int AS matched_required_facet_count
      FROM option_candidate_signature_keys candidate
      JOIN input i ON true
      JOIN option_active_filter_value_rows active
        ON active.facet_id <> candidate.facet_id
      JOIN listing.listing_option_signature_value sv
        ON sv.project_id = i.project_id
       AND sv.signature_key = candidate.signature_key
       AND sv.value_key = active.value_key
      GROUP BY candidate.candidate_value_key, candidate.signature_key
    ),
    option_matching_signature_keys AS (
      SELECT DISTINCT
        candidate.candidate_value_key,
        candidate.signature_key
      FROM option_candidate_signature_keys candidate
      JOIN option_required_facet_counts required
        ON required.candidate_value_key = candidate.candidate_value_key
      LEFT JOIN option_required_signature_matches matched
        ON matched.candidate_value_key = candidate.candidate_value_key
       AND matched.signature_key = candidate.signature_key
      WHERE required.required_facet_count = 0
        OR matched.matched_required_facet_count = required.required_facet_count
    ),
    option_signature_state AS (
      SELECT
        state.value_key,
        state.use_heavy_signature_path,
        state.force_zero,
        state.signature_lookup_enabled AS use_signature
      FROM option_signature_base_state state
    ),
    option_signature_product_bitmaps AS (
      SELECT
        state.value_key,
        COALESCE(
          rb_or_agg(os.product_bitmap) FILTER (WHERE os.product_bitmap IS NOT NULL),
          ${emptyRoaringBitmapSql()}
        ) AS bitmap
      FROM option_signature_state state
      JOIN input i ON i.price_filter_json = '{}'::jsonb
      LEFT JOIN option_matching_signature_keys ms
        ON ms.candidate_value_key = state.value_key
      LEFT JOIN listing.listing_option_signature os
        ON os.project_id = i.project_id
       AND os.signature_key = ms.signature_key
      WHERE state.use_signature
      GROUP BY state.value_key
    ),
    ${priceSignatureProductBitmapsSql},
    option_signature_price_product_bitmaps AS (
      SELECT
        state.value_key,
        COALESCE(
          rb_or_agg(price_signature.product_bitmap)
            FILTER (WHERE price_signature.product_bitmap IS NOT NULL),
          ${emptyRoaringBitmapSql()}
        ) AS bitmap
      FROM option_signature_state state
      JOIN input i
        ON i.price_filter_json <> '{}'::jsonb
      LEFT JOIN option_matching_signature_keys ms
        ON ms.candidate_value_key = state.value_key
      LEFT JOIN option_price_signature_product_bitmaps price_signature
        ON price_signature.signature_key = ms.signature_key
      WHERE state.use_signature
      GROUP BY state.value_key
    ),
    option_signature_facet_counts AS (
      SELECT
        ofv.facet_id,
        ofv.facet_type,
        ofv.value_key,
        CASE
          WHEN state.force_zero THEN 0
          WHEN i.price_filter_json <> '{}'::jsonb
          THEN rb_cardinality(
            COALESCE(price_bitmaps.bitmap, ${emptyRoaringBitmapSql()})
            & option_count_product_scope.bitmap
          )::int
          ELSE rb_cardinality(
            COALESCE(signature_bitmaps.bitmap, ${emptyRoaringBitmapSql()})
            & option_count_product_scope.bitmap
          )::int
        END AS count
      FROM option_facet_values ofv
      JOIN option_signature_state state
        ON state.value_key = ofv.value_key
      CROSS JOIN input i
      CROSS JOIN option_count_product_scope
      LEFT JOIN option_signature_product_bitmaps signature_bitmaps
        ON signature_bitmaps.value_key = ofv.value_key
      LEFT JOIN option_signature_price_product_bitmaps price_bitmaps
        ON price_bitmaps.value_key = ofv.value_key
      WHERE NOT state.use_heavy_signature_path
        AND (state.force_zero OR state.use_signature)
    )
  `;
}

function compileOptimizedOptionPriceSignatureProductBitmapsSql(): SQL {
  return sql`
    option_price_signature_lookup_keys AS (
      SELECT DISTINCT
        ms.signature_key
      FROM option_matching_signature_keys ms
      WHERE ms.signature_key IS NOT NULL
    ),
    option_price_signature_product_bitmaps AS MATERIALIZED (
      SELECT
        lookup.signature_key,
        COALESCE(
          rb_build_agg(vp.product_doc_id),
          ${emptyRoaringBitmapSql()}
        ) AS product_bitmap
      FROM option_price_signature_lookup_keys lookup
      JOIN input i
        ON i.price_filter_json <> '{}'::jsonb
      CROSS JOIN option_count_product_scope price_scope
      JOIN listing.variant_listing_price_index vp
        ON vp.project_id = i.project_id
       AND vp.signature_key = lookup.signature_key
       AND vp.signature_key IS NOT NULL
       AND vp.currency = i.currency
       AND vp.has_price = true
       AND vp.price_minor IS NOT NULL
       AND price_scope.bitmap @> vp.product_doc_id
       AND (
         NOT (i.price_filter_json ? 'minPriceMinor')
         OR vp.price_minor >= (i.price_filter_json->>'minPriceMinor')::bigint
       )
       AND (
         NOT (i.price_filter_json ? 'maxPriceMinor')
         OR vp.price_minor <= (i.price_filter_json->>'maxPriceMinor')::bigint
       )
      GROUP BY lookup.signature_key
    )
  `;
}

function compileWideOptionPriceSignatureProductBitmapsSql(): SQL {
  return sql`
    option_price_signature_product_bitmaps AS MATERIALIZED (
      SELECT
        vp.signature_key,
        COALESCE(
          rb_build_agg(vp.product_doc_id),
          ${emptyRoaringBitmapSql()}
        ) AS product_bitmap
      FROM input i
      CROSS JOIN option_count_product_scope price_scope
      JOIN listing.variant_listing_price_index vp
        ON vp.project_id = i.project_id
       AND vp.currency = i.currency
       AND vp.has_price = true
       AND vp.signature_key IS NOT NULL
       AND vp.price_minor IS NOT NULL
       AND price_scope.bitmap @> vp.product_doc_id
       AND (
         NOT (i.price_filter_json ? 'minPriceMinor')
         OR vp.price_minor >= (i.price_filter_json->>'minPriceMinor')::bigint
       )
       AND (
         NOT (i.price_filter_json ? 'maxPriceMinor')
         OR vp.price_minor <= (i.price_filter_json->>'maxPriceMinor')::bigint
       )
      WHERE i.price_filter_json <> '{}'::jsonb
      GROUP BY vp.signature_key
    )
  `;
}

function compileSimpleOptionFacetCountsProducerSql(): SQL {
  return sql`
    option_facet_counts AS (
      SELECT
        ofv.facet_id,
        ofv.facet_type,
        ofv.value_key,
        CASE
          WHEN COALESCE(sfs.has_value AND sfs.value = false, false) THEN 0
          ELSE rb_cardinality(
            COALESCE(
              rb_or_agg(os.product_bitmap)
                FILTER (WHERE os.product_bitmap IS NOT NULL),
              ${emptyRoaringBitmapSql()}
            )
            & (SELECT bitmap FROM option_count_product_scope)
          )::int
        END AS count
      FROM option_facet_values ofv
      JOIN input i ON true
      CROSS JOIN stock_filter_state sfs
      LEFT JOIN listing.listing_option_signature_value sv
        ON sv.project_id = i.project_id
       AND sv.value_key = ofv.value_key
      LEFT JOIN listing.listing_option_signature os
        ON os.project_id = i.project_id
       AND os.signature_key = sv.signature_key
      GROUP BY
        ofv.facet_id,
        ofv.facet_type,
        ofv.value_key,
        sfs.has_value,
        sfs.value
    )
  `;
}

function compileCandidateOnlyOptionFacetCountsProducerSql(): SQL {
  return sql`
    option_facet_counts AS (
      SELECT * FROM option_signature_facet_counts
    )
  `;
}

function compileHeavyOptionFacetCountsProducerSql(): SQL {
  return sql`
    option_heavy_targets AS (
      SELECT DISTINCT
        strategy.facet_id AS target_facet_id
      FROM option_facet_count_strategy strategy
      WHERE strategy.use_heavy_signature_path
    ),
    option_active_filter_values AS (
      SELECT *
      FROM option_active_filter_value_rows
    ),
    option_heavy_required_values AS (
      SELECT
        target.target_facet_id,
        active.facet_id AS required_facet_id,
        active.value_key
      FROM option_heavy_targets target
      JOIN option_active_filter_values active
        ON active.facet_id <> target.target_facet_id
    ),
    option_heavy_required_counts AS (
      SELECT
        target.target_facet_id,
        COUNT(DISTINCT required.required_facet_id)::int AS required_facet_count
      FROM option_heavy_targets target
      LEFT JOIN option_heavy_required_values required
        ON required.target_facet_id = target.target_facet_id
      GROUP BY target.target_facet_id
    ),
    option_heavy_base_signatures AS (
      SELECT
        required.target_facet_id,
        sv.signature_key
      FROM option_heavy_required_values required
      JOIN input i ON true
      JOIN option_heavy_required_counts counts
        ON counts.target_facet_id = required.target_facet_id
       AND counts.required_facet_count > 0
      JOIN listing.listing_option_signature_value sv
        ON sv.project_id = i.project_id
       AND sv.facet_id = required.required_facet_id::uuid
       AND sv.value_key = required.value_key
      GROUP BY
        required.target_facet_id,
        sv.signature_key,
        counts.required_facet_count
      HAVING COUNT(DISTINCT required.required_facet_id)
        = counts.required_facet_count
    ),
    option_heavy_bucket_signatures AS (
      SELECT DISTINCT
        ofv.facet_id,
        ofv.facet_type,
        ofv.value_key,
        base.signature_key
      FROM option_heavy_base_signatures base
      JOIN input i ON true
      JOIN listing.listing_option_signature_value sv
        ON sv.project_id = i.project_id
       AND sv.signature_key = base.signature_key
       AND sv.facet_id = base.target_facet_id::uuid
      JOIN option_facet_values ofv
        ON ofv.facet_id = base.target_facet_id
       AND ofv.value_key = sv.value_key
    ),
    option_heavy_signature_product_bitmaps AS (
      SELECT
        bucket.facet_id,
        bucket.value_key,
        COALESCE(
          rb_or_agg(os.product_bitmap) FILTER (WHERE os.product_bitmap IS NOT NULL),
          ${emptyRoaringBitmapSql()}
        ) AS bitmap
      FROM option_heavy_bucket_signatures bucket
      JOIN input i ON i.price_filter_json = '{}'::jsonb
      JOIN listing.listing_option_signature os
        ON os.project_id = i.project_id
       AND os.signature_key = bucket.signature_key
      GROUP BY bucket.facet_id, bucket.value_key
    ),
    option_heavy_signature_price_product_bitmaps AS (
      SELECT
        bucket.facet_id,
        bucket.value_key,
        COALESCE(
          rb_or_agg(price_signature.product_bitmap)
            FILTER (WHERE price_signature.product_bitmap IS NOT NULL),
          ${emptyRoaringBitmapSql()}
        ) AS bitmap
      FROM option_heavy_bucket_signatures bucket
      JOIN input i
        ON i.price_filter_json <> '{}'::jsonb
      LEFT JOIN option_price_signature_product_bitmaps price_signature
        ON price_signature.signature_key = bucket.signature_key
      GROUP BY bucket.facet_id, bucket.value_key
    ),
    option_heavy_signature_facet_counts AS (
      SELECT
        ofv.facet_id,
        ofv.facet_type,
        ofv.value_key,
        CASE
          WHEN COALESCE(sfs.has_value AND sfs.value = false, false) THEN 0
          WHEN i.price_filter_json <> '{}'::jsonb
          THEN rb_cardinality(
            COALESCE(price_bitmaps.bitmap, ${emptyRoaringBitmapSql()})
            & option_count_product_scope.bitmap
          )::int
          ELSE rb_cardinality(
            COALESCE(signature_bitmaps.bitmap, ${emptyRoaringBitmapSql()})
            & option_count_product_scope.bitmap
          )::int
        END AS count
      FROM option_facet_values ofv
      CROSS JOIN input i
      CROSS JOIN stock_filter_state sfs
      CROSS JOIN option_count_product_scope
      JOIN option_facet_count_strategy strategy
        ON strategy.facet_id = ofv.facet_id
      LEFT JOIN option_heavy_signature_product_bitmaps signature_bitmaps
        ON signature_bitmaps.facet_id = ofv.facet_id
       AND signature_bitmaps.value_key = ofv.value_key
      LEFT JOIN option_heavy_signature_price_product_bitmaps price_bitmaps
        ON price_bitmaps.facet_id = ofv.facet_id
       AND price_bitmaps.value_key = ofv.value_key
      WHERE strategy.use_heavy_signature_path
    ),
    option_facet_counts AS (
      SELECT * FROM option_signature_facet_counts
      UNION ALL
      SELECT * FROM option_heavy_signature_facet_counts
    )
  `;
}

function normalizeFacetIds(facetIds: readonly string[]): string[] {
  return [...new Set(facetIds.map((facetId) => facetId.trim()).filter(Boolean))];
}

interface OptionFacetCombinationEstimate {
  defaultCombinationCount: number;
  defaultRequiredFacetCount: number;
  perActiveFacet: readonly {
    facetId: string;
    combinationCount: number;
    requiredFacetCount: number;
  }[];
}

interface FacetCountStrategyOptions {
  heavyStrategyEnabled: boolean;
  forceHeavyOptionFacetCountFacetIds?: readonly string[];
  visibleFacetValues?: readonly FacetCountsVisibleFacetValue[];
}

interface RequiredCombinationValue {
  facetId: string;
  valueKey: string;
}

function compileOptionFacetCountStrategySql(input: {
  request: ListingSqlRequest;
  forceHeavyOptionFacetCountFacetIds: readonly string[];
  autoHeavyOptionFacetCountsEnabled: boolean;
}): SQL {
  const { request } = input;
  const estimate = buildOptionFacetCombinationEstimate(request);
  const estimateRows = estimate.perActiveFacet.map(
    (row) =>
      sql`(${row.facetId}::text, ${row.combinationCount}::numeric, ${row.requiredFacetCount}::int)`
  );
  const forcedTargetRows = input.forceHeavyOptionFacetCountFacetIds.map(
    (facetId) => sql`(${facetId}::text)`
  );

  return sql`
    option_facet_combination_estimates AS (
      ${valuesOrEmpty(
        estimateRows,
        "estimate_values",
        sql`facet_id, combination_count, required_facet_count`,
        sql`SELECT
          NULL::text AS facet_id,
          NULL::numeric AS combination_count,
          NULL::int AS required_facet_count
        WHERE false`
      )}
    ),
    forced_heavy_option_facet_targets AS (
      ${valuesOrEmpty(
        forcedTargetRows,
        "forced_target_values",
        sql`facet_id`,
        sql`SELECT NULL::text AS facet_id WHERE false`
      )}
    ),
    option_facet_bucket_counts AS (
      SELECT
        ofv.facet_id,
        COUNT(*)::numeric AS bucket_count
      FROM option_facet_values ofv
      GROUP BY ofv.facet_id
    ),
    option_candidate_check_estimate AS (
      SELECT
        bucket_counts.facet_id,
        (
          bucket_counts.bucket_count
          * COALESCE(
              estimates.combination_count,
              ${estimate.defaultCombinationCount}::numeric
            )
        )::numeric AS candidate_combination_checks,
        COALESCE(
          estimates.required_facet_count,
          ${estimate.defaultRequiredFacetCount}::int
        ) AS required_facet_count
      FROM option_facet_bucket_counts bucket_counts
      LEFT JOIN option_facet_combination_estimates estimates
        ON estimates.facet_id = bucket_counts.facet_id
    ),
    option_facet_count_strategy AS (
      SELECT
        estimate.facet_id,
        estimate.candidate_combination_checks,
        estimate.required_facet_count,
        estimate.required_facet_count > 0
          AND (
            ${input.autoHeavyOptionFacetCountsEnabled}::boolean
            OR forced.facet_id IS NOT NULL
          ) AS use_heavy_signature_path
      FROM option_candidate_check_estimate estimate
      LEFT JOIN forced_heavy_option_facet_targets forced
        ON forced.facet_id = estimate.facet_id
    )
  `;
}

function compileOptionActiveFilterValueRowsSql(
  request: ListingSqlRequest
): SQL {
  const activeValueRows = buildActiveOptionFilterValues(request).map(
    (value) => sql`(${value.facetId}::text, ${value.valueKey}::text)`
  );

  return sql`
    option_active_filter_value_rows AS (
      ${valuesOrEmpty(
        activeValueRows,
        "active_filter_values",
        sql`facet_id, value_key`,
        sql`SELECT
          NULL::text AS facet_id,
          NULL::text AS value_key
        WHERE false`
      )}
    )
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

function buildOptionFacetCombinationEstimate(
  request: ListingSqlRequest
): OptionFacetCombinationEstimate {
  const groups = request.request.filterPlan.optionFacetGroups
    .map((group) => ({
      facetId: group.facetId,
      selectedValueCount: new Set(group.valueKeys).size,
    }))
    .filter((group) => group.selectedValueCount > 0);

  const selectedCounts = groups.map((group) => group.selectedValueCount);
  const defaultCombinationCount = multiplyClamped(selectedCounts);

  return {
    defaultCombinationCount,
    defaultRequiredFacetCount: groups.length,
    perActiveFacet: groups.map((group) => {
      const requiredGroups = groups.filter(
        (other) => other.facetId !== group.facetId
      );

      return {
        facetId: group.facetId,
        combinationCount: multiplyClamped(
          requiredGroups.map((other) => other.selectedValueCount)
        ),
        requiredFacetCount: requiredGroups.length,
      };
    }),
  };
}

function multiplyClamped(values: readonly number[]): number {
  return values.reduce((acc, value) => {
    if (acc >= MAX_OPTION_FACET_CHECK_ESTIMATE) {
      return MAX_OPTION_FACET_CHECK_ESTIMATE;
    }

    const next = acc * value;
    return Number.isSafeInteger(next)
      ? next
      : MAX_OPTION_FACET_CHECK_ESTIMATE;
  }, 1);
}

function buildActiveOptionFilterValues(
  request: ListingSqlRequest
): RequiredCombinationValue[] {
  return [...groupOptionFacetFilters(request).values()].flatMap((values) => [
    ...values,
  ]);
}

function groupOptionFacetFilters(
  request: ListingSqlRequest
): Map<string, RequiredCombinationValue[]> {
  const groups = new Map<string, RequiredCombinationValue[]>();

  for (const group of request.request.filterPlan.optionFacetGroups) {
    const facetId = group.facetId.trim();
    if (!facetId) {
      continue;
    }

    const valueKeys = [
      ...new Set(group.valueKeys.map((valueKey) => valueKey.trim()).filter(Boolean)),
    ].sort();
    if (valueKeys.length === 0) {
      continue;
    }

    groups.set(
      facetId,
      valueKeys.map((valueKey) => ({
        facetId,
        valueKey,
      }))
    );
  }

  return groups;
}

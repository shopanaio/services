import { sql, type SQL } from "drizzle-orm";
import { emptyRoaringBitmapSql } from "../sqlHelpers.js";
import type { ListingSqlRequest } from "./compileListingInputSql.js";
import { compileCoreListingSql } from "./compileMatchesSql.js";

export function compileFacetCountsQuerySql(request: ListingSqlRequest) {
  const optionRequiredCombinationSetSql =
    compileOptionRequiredCombinationSetSql(request);

  return sql`
    WITH
    ${compileCoreListingSql(request)},
    scope_product_base AS (
      SELECT sp.bitmap & pp.bitmap AS bitmap
      FROM scope_products sp
      CROSS JOIN published_products pp
    ),
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
    ${optionRequiredCombinationSetSql},
    option_candidate_combination_set AS (
      SELECT
        ofv.value_key,
        COALESCE(facet_set.excluded_facet_slug, default_set.excluded_facet_slug)
          AS excluded_facet_slug
      FROM option_facet_values ofv
      JOIN option_required_combination_set default_set
        ON default_set.excluded_facet_slug IS NULL
      LEFT JOIN option_required_combination_set facet_set
        ON facet_set.excluded_facet_slug = ofv.facet_slug
    ),
    option_signature_base_state AS (
      SELECT
        ofv.value_key,
        COALESCE(sfs.has_value AND sfs.value = false, false) AS force_zero,
        NOT COALESCE(sfs.has_value AND sfs.value = false, false)
          AS signature_lookup_enabled
      FROM option_facet_values ofv
      JOIN option_candidate_combination_set combination_set
        ON combination_set.value_key = ofv.value_key
      CROSS JOIN stock_filter_state sfs
    ),
    option_required_set_arrays AS (
      SELECT
        required_sets.candidate_value_key,
        row_number() OVER (
          PARTITION BY required_sets.candidate_value_key
          ORDER BY required_sets.value_keys
        )::int AS required_set_ordinal,
        required_sets.value_keys
      FROM (
        SELECT DISTINCT
          ofv.value_key AS candidate_value_key,
          ARRAY(
            SELECT DISTINCT required_value.value_key
            FROM (
              SELECT ofv.value_key

              UNION ALL

              SELECT rf.value_key
              FROM option_active_filter_combination_values combo
              JOIN resolved_facets rf
                ON rf.requested_facet_slug = combo.facet_slug
               AND rf.requested_value_handle = combo.value_handle
               AND rf.facet_type = 'OPTION'
              WHERE combo.excluded_facet_slug IS NOT DISTINCT FROM combination_set.excluded_facet_slug
                AND combo.combination_ordinal = ord.combination_ordinal
                AND rf.facet_id <> ofv.facet_id
            ) required_value(value_key)
            ORDER BY required_value.value_key
          )::text[] AS value_keys
        FROM option_facet_values ofv
        JOIN option_candidate_combination_set combination_set
          ON combination_set.value_key = ofv.value_key
        JOIN option_signature_base_state signature_state
          ON signature_state.value_key = ofv.value_key
         AND signature_state.signature_lookup_enabled = true
        JOIN option_required_combination_ordinals ord
          ON ord.excluded_facet_slug IS NOT DISTINCT FROM combination_set.excluded_facet_slug
      ) required_sets
    ),
    option_required_set_values AS (
      SELECT
        arrays.candidate_value_key,
        arrays.required_set_ordinal,
        required_value.value_key
      FROM option_required_set_arrays arrays
      CROSS JOIN LATERAL unnest(arrays.value_keys) AS required_value(value_key)
    ),
    option_required_set_value_counts AS (
      SELECT
        rsv.candidate_value_key,
        rsv.required_set_ordinal,
        COUNT(DISTINCT rsv.value_key)::int AS value_count
      FROM option_required_set_values rsv
      GROUP BY rsv.candidate_value_key, rsv.required_set_ordinal
    ),
    option_matching_signature_rows AS (
      SELECT
        rsv.candidate_value_key,
        rsv.required_set_ordinal,
        sv.signature_key
      FROM option_required_set_values rsv
      JOIN input i ON true
      JOIN option_required_set_value_counts rvc
        ON rvc.candidate_value_key = rsv.candidate_value_key
       AND rvc.required_set_ordinal = rsv.required_set_ordinal
      JOIN listing.listing_option_signature_value sv
        ON sv.project_id = i.project_id
       AND sv.value_key = rsv.value_key
      GROUP BY
        rsv.candidate_value_key,
        rsv.required_set_ordinal,
        sv.signature_key,
        rvc.value_count
      HAVING COUNT(DISTINCT sv.value_key) = rvc.value_count
    ),
    option_matching_signature_keys AS (
      SELECT DISTINCT
        candidate_value_key,
        signature_key
      FROM option_matching_signature_rows
    ),
    option_signature_state AS (
      SELECT
        state.value_key,
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
      JOIN input i ON true
      LEFT JOIN option_matching_signature_keys ms
        ON ms.candidate_value_key = state.value_key
      LEFT JOIN listing.listing_option_signature os
        ON os.project_id = i.project_id
       AND os.signature_key = ms.signature_key
      WHERE state.use_signature
      GROUP BY state.value_key
    ),
    option_signature_price_product_bitmaps AS (
      SELECT
        state.value_key,
        COALESCE(
          rb_build_agg(vp.product_doc_id) FILTER (WHERE vp.product_doc_id IS NOT NULL),
          ${emptyRoaringBitmapSql()}
        ) AS bitmap
      FROM option_signature_state state
      JOIN input i
        ON i.price_filter_json <> '{}'::jsonb
      LEFT JOIN option_matching_signature_keys ms
        ON ms.candidate_value_key = state.value_key
      LEFT JOIN listing.variant_listing_price_index vp
        ON vp.project_id = i.project_id
       AND vp.signature_key = ms.signature_key
       AND vp.currency = i.currency
       AND vp.has_price = true
       AND vp.signature_key IS NOT NULL
       AND vp.price_minor IS NOT NULL
       AND vp.variant_doc_id IS NOT NULL
       AND vp.product_doc_id IS NOT NULL
       AND vp.product_id IS NOT NULL
       AND (
         NOT (i.price_filter_json ? 'minPriceMinor')
         OR vp.price_minor >= (i.price_filter_json->>'minPriceMinor')::bigint
       )
       AND (
         NOT (i.price_filter_json ? 'maxPriceMinor')
         OR vp.price_minor <= (i.price_filter_json->>'maxPriceMinor')::bigint
       )
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
      WHERE state.force_zero OR state.use_signature
    ),
    option_facet_counts AS (
      SELECT * FROM option_signature_facet_counts
    ),
    counts AS (
      SELECT * FROM product_facet_counts
      UNION ALL
      SELECT * FROM option_facet_counts
    )
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

interface RequiredCombinationSet {
  excludedFacetSlug: string | null;
  combinations: readonly RequiredCombination[];
}

type RequiredCombination = readonly RequiredCombinationValue[];

interface RequiredCombinationValue {
  facetSlug: string;
  valueHandle: string;
}

function compileOptionRequiredCombinationSetSql(request: ListingSqlRequest): SQL {
  const combinationSets = buildRequiredCombinationSets(request);
  const combinationSetRows = combinationSets.map(
    (combinationSet) => sql`(${combinationSet.excludedFacetSlug}::text)`
  );
  const ordinalRows = combinationSets.flatMap((combinationSet) =>
    combinationSet.combinations.map(
      (_combination, index) =>
        sql`(${combinationSet.excludedFacetSlug}::text, ${index + 1}::int)`
    )
  );
  const valueRows = combinationSets.flatMap((combinationSet) =>
    combinationSet.combinations.flatMap((combination, combinationIndex) =>
      combination.map(
        (value) =>
          sql`(${combinationSet.excludedFacetSlug}::text, ${
            combinationIndex + 1
          }::int, ${value.facetSlug}::text, ${value.valueHandle}::text)`
      )
    )
  );

  return sql`
    option_required_combination_set AS (
      SELECT *
      FROM (VALUES ${sql.join(combinationSetRows, sql`, `)})
        AS combination_set(excluded_facet_slug)
    ),
    option_required_combination_ordinals AS (
      ${valuesOrEmpty(
        ordinalRows,
        "ordinal_values",
        sql`excluded_facet_slug, combination_ordinal`,
        sql`SELECT NULL::text AS excluded_facet_slug, NULL::int AS combination_ordinal WHERE false`
      )}
    ),
    option_active_filter_combination_values AS (
      ${valuesOrEmpty(
        valueRows,
        "combination_values",
        sql`excluded_facet_slug, combination_ordinal, facet_slug, value_handle`,
        sql`SELECT
          NULL::text AS excluded_facet_slug,
          NULL::int AS combination_ordinal,
          NULL::text AS facet_slug,
          NULL::text AS value_handle
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

function buildRequiredCombinationSets(
  request: ListingSqlRequest
): RequiredCombinationSet[] {
  const groups = groupFacetFilters(request);
  const activeFacetSlugs = [...groups.keys()].sort();
  const excludedFacetSlugs = [null, ...activeFacetSlugs];

  return excludedFacetSlugs.map((excludedFacetSlug) => {
    const combinationGroups = activeFacetSlugs
      .filter((facetSlug) => facetSlug !== excludedFacetSlug)
      .map((facetSlug) => groups.get(facetSlug) ?? []);

    return {
      excludedFacetSlug,
      combinations: buildCombinations(combinationGroups),
    };
  });
}

function groupFacetFilters(
  request: ListingSqlRequest
): Map<string, RequiredCombinationValue[]> {
  const groups = new Map<string, RequiredCombinationValue[]>();

  for (const filter of request.request.filters.facetFilters) {
    const values = groups.get(filter.facetSlug) ?? [];
    values.push({
      facetSlug: filter.facetSlug,
      valueHandle: filter.valueHandle,
    });
    groups.set(filter.facetSlug, values);
  }

  return groups;
}

function buildCombinations(
  groups: readonly (readonly RequiredCombinationValue[])[]
): RequiredCombination[] {
  if (groups.length === 0) {
    return [[]];
  }

  return groups.reduce<RequiredCombination[]>(
    (combinations, group) =>
      combinations.flatMap((combination) =>
        group.map((value) => [...combination, value])
      ),
    [[]]
  );
}

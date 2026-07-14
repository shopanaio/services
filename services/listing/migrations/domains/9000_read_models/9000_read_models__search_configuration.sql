CREATE INDEX search_synonym_group_list_order_idx
  ON listing.search_synonym_group (store_id, updated_at DESC, group_id DESC);

CREATE INDEX search_product_boost_list_order_idx
  ON listing.search_product_boost (store_id, updated_at DESC, boost_id DESC);

CREATE INDEX search_product_boost_product_reverse_idx
  ON listing.search_product_boost_product (store_id, product_id, boost_id);

CREATE VIEW listing.search_synonym_group_list_view AS
SELECT
  synonym_group.store_id,
  synonym_group.group_id AS id,
  synonym_group.locale,
  synonym_group.name,
  synonym_group.enabled,
  synonym_group.version,
  COALESCE(synonym_values.terms, '') AS terms,
  COALESCE(synonym_values.values_count, 0)::int AS values_count,
  COALESCE(synonym_values.value_items, '[]'::jsonb) AS value_items,
  synonym_group.created_at,
  synonym_group.updated_at
FROM listing.search_synonym_group synonym_group
LEFT JOIN LATERAL (
  SELECT
    string_agg(
      concat_ws(' ', synonym_value.display_value, synonym_value.normalized_value),
      ' ' ORDER BY synonym_value.position
    ) AS terms,
    count(*)::int AS values_count,
    jsonb_agg(
      jsonb_build_object(
        'value', synonym_value.display_value,
        'position', synonym_value.position
      ) ORDER BY synonym_value.position
    ) AS value_items
  FROM listing.search_synonym_value synonym_value
  WHERE synonym_value.store_id = synonym_group.store_id
    AND synonym_value.group_id = synonym_group.group_id
) synonym_values ON true;

CREATE VIEW listing.search_product_boost_list_view AS
SELECT
  product_boost.store_id,
  product_boost.boost_id AS id,
  product_boost.locale,
  product_boost.name,
  product_boost.enabled,
  product_boost.version,
  COALESCE(boost_phrases.phrases, '') AS phrases,
  COALESCE(boost_phrases.phrases_count, 0)::int AS phrases_count,
  COALESCE(boost_phrases.phrase_items, '[]'::jsonb) AS phrase_items,
  COALESCE(boost_products.product_ids, ARRAY[]::uuid[]) AS product_ids,
  COALESCE(boost_products.products_count, 0)::int AS products_count,
  product_boost.created_at,
  product_boost.updated_at
FROM listing.search_product_boost product_boost
LEFT JOIN LATERAL (
  SELECT
    string_agg(
      concat_ws(' ', boost_phrase.display_phrase, boost_phrase.normalized_phrase),
      ' ' ORDER BY boost_phrase.position
    ) AS phrases,
    count(*)::int AS phrases_count,
    jsonb_agg(
      jsonb_build_object(
        'phrase', boost_phrase.display_phrase,
        'position', boost_phrase.position
      ) ORDER BY boost_phrase.position
    ) AS phrase_items
  FROM listing.search_product_boost_phrase boost_phrase
  WHERE boost_phrase.store_id = product_boost.store_id
    AND boost_phrase.boost_id = product_boost.boost_id
) boost_phrases ON true
LEFT JOIN LATERAL (
  SELECT
    array_agg(boost_product.product_id ORDER BY boost_product.position) AS product_ids,
    count(*)::int AS products_count
  FROM listing.search_product_boost_product boost_product
  WHERE boost_product.store_id = product_boost.store_id
    AND boost_product.boost_id = product_boost.boost_id
) boost_products ON true;

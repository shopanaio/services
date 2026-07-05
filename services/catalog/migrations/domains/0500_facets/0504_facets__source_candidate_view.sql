-- Up Migration

CREATE VIEW "catalog"."facet_source_candidate_view" AS
WITH project_locale_source AS (
  SELECT DISTINCT store_id, locale
  FROM "catalog"."product_translation"

  UNION
  SELECT DISTINCT store_id, locale
  FROM "catalog"."tag_translation"

  UNION
  SELECT DISTINCT store_id, locale
  FROM "catalog"."product_option_translation"

  UNION
  SELECT DISTINCT store_id, locale
  FROM "catalog"."product_feature_translation"

),
candidates AS (
  SELECT
    pls.store_id,
    pls.locale,
    'PRICE'::text AS facet_type,
    'price'::text AS handle,
    NULL::text AS name,
    0 AS source_sort_bucket
  FROM project_locale_source pls

  UNION ALL
  SELECT
    pls.store_id,
    pls.locale,
    'IN_STOCK'::text AS facet_type,
    'availability'::text AS handle,
    NULL::text AS name,
    1 AS source_sort_bucket
  FROM project_locale_source pls

  UNION ALL
  SELECT
    pls.store_id,
    pls.locale,
    'TAG'::text AS facet_type,
    'tags'::text AS handle,
    NULL::text AS name,
    2 AS source_sort_bucket
  FROM project_locale_source pls

  UNION ALL
  SELECT
    po.store_id,
    pot.locale,
    'OPTION'::text AS facet_type,
    po.slug AS handle,
    MIN(pot.name) AS name,
    3 AS source_sort_bucket
  FROM "catalog"."product_option" po
  INNER JOIN "catalog"."product_option_translation" pot
    ON pot.store_id = po.store_id
   AND pot.option_id = po.id
  GROUP BY po.store_id, pot.locale, po.slug

  UNION ALL
  SELECT
    pf.store_id,
    pft.locale,
    'FEATURE'::text AS facet_type,
    pf.slug AS handle,
    MIN(pft.name) AS name,
    4 AS source_sort_bucket
  FROM "catalog"."product_feature" pf
  INNER JOIN "catalog"."product_feature_translation" pft
    ON pft.store_id = pf.store_id
   AND pft.feature_id = pf.id
  WHERE pf.is_group = false
  GROUP BY pf.store_id, pft.locale, pf.slug
)
SELECT
  c.facet_type || ':' || c.handle AS id,
  c.store_id,
  c.locale,
  c.facet_type,
  c.handle,
  c.name,
  c.source_sort_bucket,
  c.name AS sort_name
FROM candidates c
;

CREATE INDEX IF NOT EXISTS "idx_product_option_store_slug"
  ON "catalog"."product_option" ("store_id", "slug");

CREATE INDEX IF NOT EXISTS "idx_product_option_translation_store_locale_option"
  ON "catalog"."product_option_translation" ("store_id", "locale", "option_id");

CREATE INDEX IF NOT EXISTS "idx_product_feature_store_group_slug"
  ON "catalog"."product_feature" ("store_id", "is_group", "slug");

CREATE INDEX IF NOT EXISTS "idx_product_feature_translation_store_locale_feature"
  ON "catalog"."product_feature_translation" ("store_id", "locale", "feature_id");

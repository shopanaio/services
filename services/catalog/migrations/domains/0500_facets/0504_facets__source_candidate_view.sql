-- Up Migration

CREATE VIEW "catalog"."facet_source_candidate_view" AS
WITH project_locale_source AS (
  SELECT DISTINCT project_id, locale
  FROM "catalog"."product_translation"

  UNION
  SELECT DISTINCT project_id, locale
  FROM "catalog"."tag_translation"

  UNION
  SELECT DISTINCT project_id, locale
  FROM "catalog"."product_option_translation"

  UNION
  SELECT DISTINCT project_id, locale
  FROM "catalog"."product_feature_translation"

  UNION
  SELECT DISTINCT project_id, locale
  FROM "catalog"."facet_translation"
),
candidates AS (
  SELECT
    pls.project_id,
    pls.locale,
    'PRICE'::text AS facet_type,
    'price'::text AS handle,
    NULL::text AS name,
    0 AS source_sort_bucket
  FROM project_locale_source pls

  UNION ALL
  SELECT
    pls.project_id,
    pls.locale,
    'IN_STOCK'::text AS facet_type,
    'availability'::text AS handle,
    NULL::text AS name,
    1 AS source_sort_bucket
  FROM project_locale_source pls

  UNION ALL
  SELECT
    pls.project_id,
    pls.locale,
    'TAG'::text AS facet_type,
    'tags'::text AS handle,
    NULL::text AS name,
    2 AS source_sort_bucket
  FROM project_locale_source pls

  UNION ALL
  SELECT
    po.project_id,
    pot.locale,
    'OPTION'::text AS facet_type,
    po.slug AS handle,
    MIN(pot.name) AS name,
    3 AS source_sort_bucket
  FROM "catalog"."product_option" po
  INNER JOIN "catalog"."product_option_translation" pot
    ON pot.project_id = po.project_id
   AND pot.option_id = po.id
  GROUP BY po.project_id, pot.locale, po.slug

  UNION ALL
  SELECT
    pf.project_id,
    pft.locale,
    'FEATURE'::text AS facet_type,
    pf.slug AS handle,
    MIN(pft.name) AS name,
    4 AS source_sort_bucket
  FROM "catalog"."product_feature" pf
  INNER JOIN "catalog"."product_feature_translation" pft
    ON pft.project_id = pf.project_id
   AND pft.feature_id = pf.id
  WHERE pf.is_group = false
  GROUP BY pf.project_id, pft.locale, pf.slug
)
SELECT
  c.facet_type || ':' || c.handle AS id,
  c.project_id,
  c.locale,
  c.facet_type,
  c.handle,
  c.name,
  c.source_sort_bucket,
  c.name AS sort_name
FROM candidates c
WHERE NOT EXISTS (
  SELECT 1
  FROM "catalog"."facet_source" fs
  WHERE fs.project_id = c.project_id
    AND fs.facet_type = c.facet_type
    AND fs.handle = c.handle
);

CREATE INDEX IF NOT EXISTS "idx_product_option_project_slug"
  ON "catalog"."product_option" ("project_id", "slug");

CREATE INDEX IF NOT EXISTS "idx_product_option_translation_project_locale_option"
  ON "catalog"."product_option_translation" ("project_id", "locale", "option_id");

CREATE INDEX IF NOT EXISTS "idx_product_feature_project_group_slug"
  ON "catalog"."product_feature" ("project_id", "is_group", "slug");

CREATE INDEX IF NOT EXISTS "idx_product_feature_translation_project_locale_feature"
  ON "catalog"."product_feature_translation" ("project_id", "locale", "feature_id");

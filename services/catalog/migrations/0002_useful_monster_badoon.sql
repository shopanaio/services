ALTER TABLE "catalog"."product_feature" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "catalog"."product_feature_value" ADD COLUMN "slug" varchar(255);--> statement-breakpoint

WITH feature_slug_source AS (
  SELECT
    pf.id,
    pf.product_id,
    COALESCE(
      NULLIF(
        trim(
          both '-' from regexp_replace(
            lower(COALESCE(ft.name, '')),
            '[^a-z0-9]+',
            '-',
            'g'
          )
        ),
        ''
      ),
      'feature'
    ) AS base_slug
  FROM "catalog"."product_feature" pf
  LEFT JOIN LATERAL (
    SELECT pft.name
    FROM "catalog"."product_feature_translation" pft
    WHERE pft.feature_id = pf.id
    ORDER BY CASE WHEN pft.locale = 'en' THEN 0 ELSE 1 END, pft.locale
    LIMIT 1
  ) ft ON true
), feature_slug_ranked AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY product_id, base_slug ORDER BY id) AS slug_rank,
    base_slug
  FROM feature_slug_source
), feature_slug_final AS (
  SELECT
    id,
    CASE
      WHEN slug_rank = 1 THEN base_slug
      ELSE base_slug || '-' || slug_rank::text
    END AS slug
  FROM feature_slug_ranked
)
UPDATE "catalog"."product_feature" pf
SET slug = fsf.slug
FROM feature_slug_final fsf
WHERE fsf.id = pf.id;--> statement-breakpoint

WITH feature_value_slug_source AS (
  SELECT
    pfv.id,
    pfv.feature_id,
    COALESCE(
      NULLIF(
        trim(
          both '-' from regexp_replace(
            lower(COALESCE(fvt.name, '')),
            '[^a-z0-9]+',
            '-',
            'g'
          )
        ),
        ''
      ),
      'value'
    ) AS base_slug
  FROM "catalog"."product_feature_value" pfv
  LEFT JOIN LATERAL (
    SELECT pfvt.name
    FROM "catalog"."product_feature_value_translation" pfvt
    WHERE pfvt.feature_value_id = pfv.id
    ORDER BY CASE WHEN pfvt.locale = 'en' THEN 0 ELSE 1 END, pfvt.locale
    LIMIT 1
  ) fvt ON true
), feature_value_slug_ranked AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY feature_id, base_slug ORDER BY id) AS slug_rank,
    base_slug
  FROM feature_value_slug_source
), feature_value_slug_final AS (
  SELECT
    id,
    CASE
      WHEN slug_rank = 1 THEN base_slug
      ELSE base_slug || '-' || slug_rank::text
    END AS slug
  FROM feature_value_slug_ranked
)
UPDATE "catalog"."product_feature_value" pfv
SET slug = fvsf.slug
FROM feature_value_slug_final fvsf
WHERE fvsf.id = pfv.id;--> statement-breakpoint

ALTER TABLE "catalog"."product_feature" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog"."product_feature_value" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog"."product_feature" ADD CONSTRAINT "product_feature_product_id_slug_uniq" UNIQUE("product_id","slug");--> statement-breakpoint
ALTER TABLE "catalog"."product_feature_value" ADD CONSTRAINT "product_feature_value_feature_id_slug_uniq" UNIQUE("feature_id","slug");

ALTER TABLE "catalog"."tag" ADD COLUMN "products_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "catalog"."tag" t
SET "products_count" = counts.products_count
FROM (
  SELECT pt."tag_id", count(pt."product_id")::int AS products_count
  FROM "catalog"."product_tag" pt
  GROUP BY pt."tag_id"
) counts
WHERE counts."tag_id" = t."id";--> statement-breakpoint
INSERT INTO "catalog"."tag_translation" ("project_id", "tag_id", "locale", "name")
SELECT t."project_id", t."id", 'uk', t."handle"
FROM "catalog"."tag" t
WHERE NOT EXISTS (
  SELECT 1
  FROM "catalog"."tag_translation" tt
  WHERE tt."tag_id" = t."id"
    AND tt."locale" = 'uk'
);--> statement-breakpoint
CREATE VIEW "catalog"."tag_list_view" AS (select "catalog"."tag"."project_id", "catalog"."tag"."id", "catalog"."tag"."handle", "catalog"."tag"."created_at", "catalog"."tag"."products_count", "catalog"."tag_translation"."locale", "catalog"."tag_translation"."name" from "catalog"."tag" inner join "catalog"."tag_translation" on "catalog"."tag_translation"."project_id" = "catalog"."tag"."project_id" AND "catalog"."tag_translation"."tag_id" = "catalog"."tag"."id");

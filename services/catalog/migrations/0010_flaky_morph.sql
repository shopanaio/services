ALTER TABLE "catalog"."category" ADD COLUMN "products_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "catalog"."category" AS c
SET "products_count" = counts.products_count
FROM (
  SELECT
    pc."project_id",
    pc."category_id",
    count(pc."product_id")::integer AS products_count
  FROM "catalog"."product_category" AS pc
  INNER JOIN "catalog"."product" AS p
    ON p."id" = pc."product_id"
   AND p."project_id" = pc."project_id"
  WHERE p."deleted_at" IS NULL
  GROUP BY pc."project_id", pc."category_id"
) AS counts
WHERE c."project_id" = counts."project_id"
  AND c."id" = counts."category_id";

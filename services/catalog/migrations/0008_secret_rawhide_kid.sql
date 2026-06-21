ALTER TABLE "catalog"."product_option" ADD COLUMN "sort_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
WITH ranked AS (
	SELECT
		"id",
		(row_number() OVER (
			PARTITION BY "project_id", "product_id"
			ORDER BY "id"
		) - 1)::integer AS "sort_index"
	FROM "catalog"."product_option"
)
UPDATE "catalog"."product_option"
SET "sort_index" = ranked."sort_index"
FROM ranked
WHERE "catalog"."product_option"."id" = ranked."id";--> statement-breakpoint
CREATE INDEX "idx_product_option_sort" ON "catalog"."product_option" USING btree ("project_id","product_id","sort_index");

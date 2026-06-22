DROP INDEX IF EXISTS "catalog"."idx_product_category_primary";--> statement-breakpoint
ALTER TABLE "catalog"."category" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "product_category_one_primary_per_product_idx" ON "catalog"."product_category" USING btree ("project_id","product_id") WHERE is_primary = true;

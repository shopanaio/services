ALTER TABLE "inventory"."variant" DROP CONSTRAINT "variant_project_id_sku_key";--> statement-breakpoint
ALTER TABLE "inventory"."variant" DROP CONSTRAINT "variant_project_id_external_system_external_id_key";--> statement-breakpoint
DROP INDEX "inventory"."idx_variant_sku";--> statement-breakpoint
ALTER TABLE "inventory"."product" ADD COLUMN "handle" varchar(255);--> statement-breakpoint
ALTER TABLE "inventory"."variant" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory"."variant" ADD COLUMN "handle" varchar(255) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "product_project_id_handle_key" ON "inventory"."product" USING btree ("project_id","handle") WHERE deleted_at IS NULL AND handle IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_product_id_default_key" ON "inventory"."variant" USING btree ("product_id") WHERE is_default = true AND deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_product_id_handle_key" ON "inventory"."variant" USING btree ("product_id","handle") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_project_id_sku_key" ON "inventory"."variant" USING btree ("project_id","sku") WHERE deleted_at IS NULL AND sku IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_project_id_external_system_external_id_key" ON "inventory"."variant" USING btree ("project_id","external_system","external_id") WHERE deleted_at IS NULL AND external_id IS NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory"."product" ADD CONSTRAINT "product_published_requires_handle" CHECK (published_at IS NULL OR handle IS NOT NULL);--> statement-breakpoint
ALTER TABLE "inventory"."variant" ADD CONSTRAINT "variant_handle_required_if_not_default" CHECK (is_default = true OR length(handle) > 0);
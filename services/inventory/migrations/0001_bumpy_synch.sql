CREATE TABLE "inventory"."product_seo" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"seo_title" varchar(70),
	"seo_description" varchar(160),
	"og_title" varchar(95),
	"og_description" text,
	"og_image_id" uuid,
	CONSTRAINT "product_seo_product_id_locale_pk" PRIMARY KEY("product_id","locale")
);
--> statement-breakpoint
ALTER TABLE "inventory"."product_seo" ADD CONSTRAINT "product_seo_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "inventory"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_product_seo_project" ON "inventory"."product_seo" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_seo_project_locale" ON "inventory"."product_seo" USING btree ("project_id","locale");
DROP TABLE "catalog"."variant_media";--> statement-breakpoint
ALTER TABLE "catalog"."product" ADD CONSTRAINT "product_project_id_id_unique" UNIQUE("project_id","id");--> statement-breakpoint
ALTER TABLE "catalog"."variant" ADD CONSTRAINT "variant_project_id_product_id_id_unique" UNIQUE("project_id","product_id","id");--> statement-breakpoint
CREATE TABLE "catalog"."product_media" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"file_id" uuid NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_media_project_id_product_id_file_id_unique" UNIQUE("project_id","product_id","file_id"),
	CONSTRAINT "product_media_project_id_product_id_id_unique" UNIQUE("project_id","product_id","id"),
	CONSTRAINT "product_media_project_id_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "product_media_product_fk" FOREIGN KEY ("project_id","product_id") REFERENCES "catalog"."product"("project_id","id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "idx_product_media_project" ON "catalog"."product_media" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_media_product" ON "catalog"."product_media" USING btree ("project_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_product_media_file" ON "catalog"."product_media" USING btree ("project_id","file_id");--> statement-breakpoint
CREATE INDEX "idx_product_media_sort" ON "catalog"."product_media" USING btree ("project_id","product_id","sort_index");--> statement-breakpoint
CREATE TABLE "catalog"."variant_media" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"product_media_id" uuid NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "variant_media_project_id_variant_id_product_media_id_pk" PRIMARY KEY("project_id","variant_id","product_media_id"),
	CONSTRAINT "variant_media_product_media_fk" FOREIGN KEY ("project_id","product_id","product_media_id") REFERENCES "catalog"."product_media"("project_id","product_id","id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "variant_media_variant_fk" FOREIGN KEY ("project_id","product_id","variant_id") REFERENCES "catalog"."variant"("project_id","product_id","id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "idx_variant_media_project" ON "catalog"."variant_media" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_product" ON "catalog"."variant_media" USING btree ("project_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_variant" ON "catalog"."variant_media" USING btree ("project_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_product_media" ON "catalog"."variant_media" USING btree ("project_id","product_media_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_sort" ON "catalog"."variant_media" USING btree ("project_id","variant_id","sort_index");

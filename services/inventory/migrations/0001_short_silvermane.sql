CREATE TABLE "variant_media" (
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "variant_media_variant_id_file_id_pk" PRIMARY KEY("variant_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "product_feature_translation" (
	"project_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "product_feature_translation_feature_id_locale_pk" PRIMARY KEY("feature_id","locale")
);
--> statement-breakpoint
CREATE TABLE "product_feature_value_translation" (
	"project_id" uuid NOT NULL,
	"feature_value_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "product_feature_value_translation_feature_value_id_locale_pk" PRIMARY KEY("feature_value_id","locale")
);
--> statement-breakpoint
CREATE TABLE "product_option_translation" (
	"project_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "product_option_translation_option_id_locale_pk" PRIMARY KEY("option_id","locale")
);
--> statement-breakpoint
CREATE TABLE "product_option_value_translation" (
	"project_id" uuid NOT NULL,
	"option_value_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "product_option_value_translation_option_value_id_locale_pk" PRIMARY KEY("option_value_id","locale")
);
--> statement-breakpoint
CREATE TABLE "product_translation" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"title" text NOT NULL,
	"description_text" text,
	"description_html" text,
	"description_json" jsonb,
	"excerpt" text,
	"seo_title" varchar(255),
	"seo_description" text,
	CONSTRAINT "product_translation_product_id_locale_pk" PRIMARY KEY("product_id","locale")
);
--> statement-breakpoint
CREATE TABLE "variant_translation" (
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"title" text,
	CONSTRAINT "variant_translation_variant_id_locale_pk" PRIMARY KEY("variant_id","locale")
);
--> statement-breakpoint
CREATE TABLE "warehouse_translation" (
	"project_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "warehouse_translation_warehouse_id_locale_pk" PRIMARY KEY("warehouse_id","locale")
);
--> statement-breakpoint
ALTER TABLE "variant_media" ADD CONSTRAINT "variant_media_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_feature_translation" ADD CONSTRAINT "product_feature_translation_feature_id_product_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."product_feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_feature_value_translation" ADD CONSTRAINT "product_feature_value_translation_feature_value_id_product_feature_value_id_fk" FOREIGN KEY ("feature_value_id") REFERENCES "public"."product_feature_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_translation" ADD CONSTRAINT "product_option_translation_option_id_product_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."product_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_value_translation" ADD CONSTRAINT "product_option_value_translation_option_value_id_product_option_value_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "public"."product_option_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_translation" ADD CONSTRAINT "product_translation_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_translation" ADD CONSTRAINT "variant_translation_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_translation" ADD CONSTRAINT "warehouse_translation_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_variant_media_project" ON "variant_media" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_variant" ON "variant_media" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_file" ON "variant_media" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_sort" ON "variant_media" USING btree ("variant_id","sort_index");--> statement-breakpoint
CREATE INDEX "idx_product_feature_translation_project" ON "product_feature_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_feature_value_translation_project" ON "product_feature_value_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_translation_project" ON "product_option_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_value_translation_project" ON "product_option_value_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_translation_project" ON "product_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_translation_project_locale" ON "product_translation" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "idx_variant_translation_project" ON "variant_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_warehouse_translation_project" ON "warehouse_translation" USING btree ("project_id");
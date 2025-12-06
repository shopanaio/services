CREATE SCHEMA "inventory";
--> statement-breakpoint
CREATE TYPE "inventory"."currency" AS ENUM('UAH', 'USD', 'EUR');--> statement-breakpoint
CREATE TYPE "inventory"."dimension_unit" AS ENUM('mm', 'cm', 'm', 'in', 'ft', 'yd');--> statement-breakpoint
CREATE TYPE "inventory"."weight_unit" AS ENUM('g', 'kg', 'lb', 'oz');--> statement-breakpoint
CREATE TABLE "inventory"."product" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "inventory"."variant" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"sku" varchar(64),
	"external_system" varchar(32),
	"external_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "variant_project_id_sku_key" UNIQUE("project_id","sku"),
	CONSTRAINT "variant_project_id_external_system_external_id_key" UNIQUE("project_id","external_system","external_id")
);
--> statement-breakpoint
CREATE TABLE "inventory"."item_pricing" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"variant_id" uuid NOT NULL,
	"currency" "inventory"."currency" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"compare_at_minor" bigint,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_pricing_amount_minor_check" CHECK ("inventory"."item_pricing"."amount_minor" >= 0),
	CONSTRAINT "item_pricing_compare_at_minor_check" CHECK ("inventory"."item_pricing"."compare_at_minor" >= 0),
	CONSTRAINT "item_pricing_effective_interval_check" CHECK ("inventory"."item_pricing"."effective_to" IS NULL OR "inventory"."item_pricing"."effective_to" > "inventory"."item_pricing"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "inventory"."product_variant_cost_history" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"variant_id" uuid NOT NULL,
	"currency" "inventory"."currency" NOT NULL,
	"unit_cost_minor" bigint NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variant_cost_history_unit_cost_minor_check" CHECK ("inventory"."product_variant_cost_history"."unit_cost_minor" >= 0),
	CONSTRAINT "product_variant_cost_history_effective_interval_check" CHECK ("inventory"."product_variant_cost_history"."effective_to" IS NULL OR "inventory"."product_variant_cost_history"."effective_to" > "inventory"."product_variant_cost_history"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "inventory"."product_option" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	"display_type" varchar(32) NOT NULL,
	CONSTRAINT "product_option_product_id_slug_key" UNIQUE("product_id","slug")
);
--> statement-breakpoint
CREATE TABLE "inventory"."product_option_swatch" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"color_one" varchar(32),
	"color_two" varchar(32),
	"image_id" uuid,
	"swatch_type" varchar(32) NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "inventory"."product_option_value" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"swatch_id" uuid,
	"slug" varchar(255) NOT NULL,
	"sort_index" integer NOT NULL,
	CONSTRAINT "product_option_value_option_id_slug_key" UNIQUE("option_id","slug")
);
--> statement-breakpoint
CREATE TABLE "inventory"."product_option_variant_link" (
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"option_value_id" uuid,
	CONSTRAINT "product_option_variant_link_variant_id_option_id_pk" PRIMARY KEY("variant_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "inventory"."product_feature" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	CONSTRAINT "product_feature_product_id_slug_key" UNIQUE("product_id","slug")
);
--> statement-breakpoint
CREATE TABLE "inventory"."product_feature_value" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	"sort_index" integer NOT NULL,
	CONSTRAINT "product_feature_value_feature_id_slug_key" UNIQUE("feature_id","slug")
);
--> statement-breakpoint
CREATE TABLE "inventory"."item_dimensions" (
	"variant_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"w_mm" integer NOT NULL,
	"l_mm" integer NOT NULL,
	"h_mm" integer NOT NULL,
	"display_unit" "inventory"."dimension_unit" NOT NULL,
	CONSTRAINT "item_dimensions_positive_check" CHECK ("inventory"."item_dimensions"."w_mm" > 0 AND "inventory"."item_dimensions"."l_mm" > 0 AND "inventory"."item_dimensions"."h_mm" > 0)
);
--> statement-breakpoint
CREATE TABLE "inventory"."item_weight" (
	"variant_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"weight_gr" integer NOT NULL,
	"display_unit" "inventory"."weight_unit" DEFAULT 'g' NOT NULL,
	CONSTRAINT "item_weight_positive_check" CHECK ("inventory"."item_weight"."weight_gr" > 0)
);
--> statement-breakpoint
CREATE TABLE "inventory"."warehouse_stock" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warehouse_stock_project_id_warehouse_id_variant_id_key" UNIQUE("project_id","warehouse_id","variant_id"),
	CONSTRAINT "warehouse_stock_quantity_check" CHECK ("inventory"."warehouse_stock"."quantity_on_hand" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory"."warehouses" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warehouses_project_id_code_key" UNIQUE("project_id","code"),
	CONSTRAINT "warehouses_project_id_id_unique" UNIQUE("project_id","id")
);
--> statement-breakpoint
CREATE TABLE "inventory"."variant_media" (
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "variant_media_variant_id_file_id_pk" PRIMARY KEY("variant_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "inventory"."product_feature_translation" (
	"project_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "product_feature_translation_feature_id_locale_pk" PRIMARY KEY("feature_id","locale")
);
--> statement-breakpoint
CREATE TABLE "inventory"."product_feature_value_translation" (
	"project_id" uuid NOT NULL,
	"feature_value_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "product_feature_value_translation_feature_value_id_locale_pk" PRIMARY KEY("feature_value_id","locale")
);
--> statement-breakpoint
CREATE TABLE "inventory"."product_option_translation" (
	"project_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "product_option_translation_option_id_locale_pk" PRIMARY KEY("option_id","locale")
);
--> statement-breakpoint
CREATE TABLE "inventory"."product_option_value_translation" (
	"project_id" uuid NOT NULL,
	"option_value_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "product_option_value_translation_option_value_id_locale_pk" PRIMARY KEY("option_value_id","locale")
);
--> statement-breakpoint
CREATE TABLE "inventory"."product_translation" (
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
CREATE TABLE "inventory"."variant_translation" (
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"title" text,
	CONSTRAINT "variant_translation_variant_id_locale_pk" PRIMARY KEY("variant_id","locale")
);
--> statement-breakpoint
CREATE TABLE "inventory"."warehouse_translation" (
	"project_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "warehouse_translation_warehouse_id_locale_pk" PRIMARY KEY("warehouse_id","locale")
);
--> statement-breakpoint
ALTER TABLE "inventory"."variant" ADD CONSTRAINT "variant_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "inventory"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."item_pricing" ADD CONSTRAINT "item_pricing_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_variant_cost_history" ADD CONSTRAINT "product_variant_cost_history_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_option" ADD CONSTRAINT "product_option_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "inventory"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_option_value" ADD CONSTRAINT "product_option_value_option_id_product_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "inventory"."product_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_option_value" ADD CONSTRAINT "product_option_value_swatch_id_product_option_swatch_id_fk" FOREIGN KEY ("swatch_id") REFERENCES "inventory"."product_option_swatch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_option_variant_link" ADD CONSTRAINT "product_option_variant_link_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_option_variant_link" ADD CONSTRAINT "product_option_variant_link_option_id_product_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "inventory"."product_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_option_variant_link" ADD CONSTRAINT "product_option_variant_link_option_value_id_product_option_value_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "inventory"."product_option_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_feature" ADD CONSTRAINT "product_feature_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "inventory"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_value" ADD CONSTRAINT "product_feature_value_feature_id_product_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "inventory"."product_feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."item_dimensions" ADD CONSTRAINT "item_dimensions_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."item_weight" ADD CONSTRAINT "item_weight_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD CONSTRAINT "warehouse_stock_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD CONSTRAINT "warehouse_stock_warehouse_fk" FOREIGN KEY ("project_id","warehouse_id") REFERENCES "inventory"."warehouses"("project_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."variant_media" ADD CONSTRAINT "variant_media_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_translation" ADD CONSTRAINT "product_feature_translation_feature_id_product_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "inventory"."product_feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_value_translation" ADD CONSTRAINT "product_feature_value_translation_feature_value_id_product_feature_value_id_fk" FOREIGN KEY ("feature_value_id") REFERENCES "inventory"."product_feature_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_option_translation" ADD CONSTRAINT "product_option_translation_option_id_product_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "inventory"."product_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_option_value_translation" ADD CONSTRAINT "product_option_value_translation_option_value_id_product_option_value_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "inventory"."product_option_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_translation" ADD CONSTRAINT "product_translation_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "inventory"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."variant_translation" ADD CONSTRAINT "variant_translation_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_translation" ADD CONSTRAINT "warehouse_translation_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_product_project_id" ON "inventory"."product" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_created_at" ON "inventory"."product" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_product_updated_at" ON "inventory"."product" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_product_deleted_at" ON "inventory"."product" USING btree ("deleted_at") WHERE deleted_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_variant_project_id" ON "inventory"."variant" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_variant_product_id" ON "inventory"."variant" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_variant_created_at" ON "inventory"."variant" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_variant_updated_at" ON "inventory"."variant" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_variant_deleted_at" ON "inventory"."variant" USING btree ("deleted_at") WHERE deleted_at IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_variant_sku" ON "inventory"."variant" USING btree ("project_id","sku") WHERE sku IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_item_pricing_variant_currency_effective_from" ON "inventory"."item_pricing" USING btree ("project_id","variant_id","currency","effective_from");--> statement-breakpoint
CREATE INDEX "idx_item_pricing_variant_effective_from" ON "inventory"."item_pricing" USING btree ("project_id","variant_id","effective_from");--> statement-breakpoint
CREATE INDEX "idx_item_pricing_recorded_at" ON "inventory"."item_pricing" USING btree ("project_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_item_pricing_effective_to" ON "inventory"."item_pricing" USING btree ("project_id","effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_item_pricing_current_unique" ON "inventory"."item_pricing" USING btree ("project_id","variant_id","currency") WHERE effective_to IS NULL;--> statement-breakpoint
CREATE INDEX "idx_product_variant_cost_history_variant_currency_effective_from" ON "inventory"."product_variant_cost_history" USING btree ("project_id","variant_id","currency","effective_from");--> statement-breakpoint
CREATE INDEX "idx_product_variant_cost_history_variant_effective_from" ON "inventory"."product_variant_cost_history" USING btree ("project_id","variant_id","effective_from");--> statement-breakpoint
CREATE INDEX "idx_product_variant_cost_history_recorded_at" ON "inventory"."product_variant_cost_history" USING btree ("project_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_product_variant_cost_history_effective_to" ON "inventory"."product_variant_cost_history" USING btree ("project_id","effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_variant_cost_history_current_unique" ON "inventory"."product_variant_cost_history" USING btree ("project_id","variant_id","currency") WHERE effective_to IS NULL;--> statement-breakpoint
CREATE INDEX "idx_product_option_product_id" ON "inventory"."product_option" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_swatch_project_id" ON "inventory"."product_option_swatch" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_value_option_id" ON "inventory"."product_option_value" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_variant_link_project_id" ON "inventory"."product_option_variant_link" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_feature_product_id" ON "inventory"."product_feature" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_feature_value_feature_id" ON "inventory"."product_feature_value" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "idx_item_dimensions_project_id" ON "inventory"."item_dimensions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_item_weight_project_id" ON "inventory"."item_weight" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_warehouse_stock_variant" ON "inventory"."warehouse_stock" USING btree ("project_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warehouses_default_unique" ON "inventory"."warehouses" USING btree ("project_id") WHERE is_default = true;--> statement-breakpoint
CREATE INDEX "idx_variant_media_project" ON "inventory"."variant_media" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_variant" ON "inventory"."variant_media" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_file" ON "inventory"."variant_media" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_variant_media_sort" ON "inventory"."variant_media" USING btree ("variant_id","sort_index");--> statement-breakpoint
CREATE INDEX "idx_product_feature_translation_project" ON "inventory"."product_feature_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_feature_value_translation_project" ON "inventory"."product_feature_value_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_translation_project" ON "inventory"."product_option_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_option_value_translation_project" ON "inventory"."product_option_value_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_translation_project" ON "inventory"."product_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_translation_project_locale" ON "inventory"."product_translation" USING btree ("project_id","locale");--> statement-breakpoint
CREATE INDEX "idx_variant_translation_project" ON "inventory"."variant_translation" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_warehouse_translation_project" ON "inventory"."warehouse_translation" USING btree ("project_id");--> statement-breakpoint
CREATE VIEW "inventory"."variant_prices_current" AS (select "id", "project_id", "variant_id", "currency", "amount_minor", "compare_at_minor", "effective_from", "effective_to", "recorded_at" from "inventory"."item_pricing" where "inventory"."item_pricing"."effective_to" IS NULL);--> statement-breakpoint
CREATE VIEW "inventory"."variant_costs_current" AS (select "id", "project_id", "variant_id", "currency", "unit_cost_minor", "effective_from", "effective_to", "recorded_at" from "inventory"."product_variant_cost_history" where "inventory"."product_variant_cost_history"."effective_to" IS NULL);
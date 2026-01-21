CREATE SCHEMA "inventory";
--> statement-breakpoint
CREATE TYPE "inventory"."currency" AS ENUM('UAH', 'USD', 'EUR');--> statement-breakpoint
CREATE TYPE "inventory"."dimension_unit" AS ENUM('mm', 'cm', 'm', 'in', 'ft', 'yd');--> statement-breakpoint
CREATE TYPE "inventory"."weight_unit" AS ENUM('g', 'kg', 'lb', 'oz');--> statement-breakpoint
CREATE TYPE "inventory"."stock_apply_status" AS ENUM('APPLIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "inventory"."stock_movement_reason" AS ENUM('DAMAGE', 'INVENTORY_COUNT', 'MANUAL', 'CUSTOMER_RETURN');--> statement-breakpoint
CREATE TYPE "inventory"."stock_movement_type" AS ENUM('SEED', 'RECEIVE', 'SELL', 'RETURN', 'ADJUST', 'RESERVE', 'RELEASE', 'TRANSFER');--> statement-breakpoint
CREATE TYPE "inventory"."stock_transfer_direction" AS ENUM('IN', 'OUT');--> statement-breakpoint
CREATE TYPE "inventory"."reservation_status" AS ENUM('ACTIVE', 'RELEASED', 'FULFILLED');--> statement-breakpoint
CREATE TABLE "inventory"."product" (
	"project_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"handle" varchar(255),
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "product_published_requires_handle" CHECK (published_at IS NULL OR handle IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "inventory"."variant" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"handle" varchar(255) NOT NULL,
	"sku" varchar(64),
	"external_system" varchar(32),
	"external_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "variant_handle_required_if_not_default" CHECK (is_default = true OR length(handle) > 0)
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
	"index" integer[] NOT NULL,
	"is_group" boolean DEFAULT false NOT NULL,
	"parent_id" uuid,
	CONSTRAINT "product_feature_product_id_index_uniq" UNIQUE("product_id","index"),
	CONSTRAINT "feature_group_no_parent" CHECK ("inventory"."product_feature"."is_group" = false OR "inventory"."product_feature"."parent_id" IS NULL),
	CONSTRAINT "feature_index_not_empty" CHECK (array_length("inventory"."product_feature"."index", 1) > 0),
	CONSTRAINT "feature_group_root_only" CHECK ("inventory"."product_feature"."is_group" = false OR array_length("inventory"."product_feature"."index", 1) = 1)
);
--> statement-breakpoint
CREATE TABLE "inventory"."product_feature_value" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	"index" integer NOT NULL,
	CONSTRAINT "product_feature_value_feature_id_index_uniq" UNIQUE("feature_id","index")
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
	"reserved_qty" integer DEFAULT 0 NOT NULL,
	"unavailable_qty" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warehouse_stock_project_id_warehouse_id_variant_id_key" UNIQUE("project_id","warehouse_id","variant_id"),
	CONSTRAINT "warehouse_stock_quantity_check" CHECK ("inventory"."warehouse_stock"."quantity_on_hand" >= 0),
	CONSTRAINT "warehouse_stock_reserved_check" CHECK ("inventory"."warehouse_stock"."reserved_qty" >= 0),
	CONSTRAINT "warehouse_stock_unavailable_check" CHECK ("inventory"."warehouse_stock"."unavailable_qty" >= 0),
	CONSTRAINT "warehouse_stock_unavailable_le_onhand_check" CHECK ("inventory"."warehouse_stock"."unavailable_qty" <= "inventory"."warehouse_stock"."quantity_on_hand")
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
CREATE TABLE "inventory"."stock_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "inventory"."stock_changes_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"delta_on_hand" integer DEFAULT 0 NOT NULL,
	"delta_reserved" integer DEFAULT 0 NOT NULL,
	"delta_unavailable" integer DEFAULT 0 NOT NULL,
	"on_hand_after" integer NOT NULL,
	"reserved_after" integer NOT NULL,
	"unavailable_after" integer NOT NULL,
	"movement_type" "inventory"."stock_movement_type" NOT NULL,
	"transfer_direction" "inventory"."stock_transfer_direction",
	"reason" "inventory"."stock_movement_reason",
	"source_system" varchar(30) NOT NULL,
	"source_event_id" varchar(128) NOT NULL,
	"correlation_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"apply_status" "inventory"."stock_apply_status" DEFAULT 'APPLIED' NOT NULL,
	CONSTRAINT "stock_changes_delta_check" CHECK ("inventory"."stock_changes"."movement_type" = 'SEED' OR "inventory"."stock_changes"."delta_on_hand" <> 0 OR "inventory"."stock_changes"."delta_reserved" <> 0 OR "inventory"."stock_changes"."delta_unavailable" <> 0),
	CONSTRAINT "stock_changes_on_hand_after_check" CHECK ("inventory"."stock_changes"."on_hand_after" >= 0),
	CONSTRAINT "stock_changes_reserved_after_check" CHECK ("inventory"."stock_changes"."reserved_after" >= 0),
	CONSTRAINT "stock_changes_unavailable_after_check" CHECK ("inventory"."stock_changes"."unavailable_after" >= 0),
	CONSTRAINT "stock_changes_unavailable_le_onhand_check" CHECK ("inventory"."stock_changes"."unavailable_after" <= "inventory"."stock_changes"."on_hand_after"),
	CONSTRAINT "stock_changes_transfer_dir_check" CHECK (CASE WHEN "inventory"."stock_changes"."movement_type" = 'TRANSFER' THEN "inventory"."stock_changes"."transfer_direction" IS NOT NULL ELSE "inventory"."stock_changes"."transfer_direction" IS NULL END),
	CONSTRAINT "stock_changes_transfer_correlation_check" CHECK ("inventory"."stock_changes"."movement_type" <> 'TRANSFER' OR "inventory"."stock_changes"."correlation_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "inventory"."reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"order_system" varchar(50) NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"status" "inventory"."reservation_status" DEFAULT 'ACTIVE' NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now(),
	"released_at" timestamp with time zone,
	CONSTRAINT "reservations_project_order_variant_warehouse_key" UNIQUE("project_id","order_system","order_id","variant_id","warehouse_id"),
	CONSTRAINT "reservations_quantity_check" CHECK ("inventory"."reservations"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "inventory"."product_inventory_settings" (
	"project_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"alert_threshold_method" varchar(20) DEFAULT 'SAFETY_STOCK' NOT NULL,
	"alert_minimum_stock" integer DEFAULT 10 NOT NULL,
	"backorder_enabled" boolean DEFAULT false NOT NULL,
	"backorder_max_days" integer,
	"backorder_max_qty" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "product_inventory_settings_project_id_product_id_pk" PRIMARY KEY("project_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "inventory"."inbound_supply" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"source_type" varchar(30) NOT NULL,
	"source_id" uuid NOT NULL,
	"expected_at" timestamp with time zone NOT NULL,
	"qty_expected" integer NOT NULL,
	"qty_received" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'PLANNED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "inbound_supply_project_source_variant_warehouse_key" UNIQUE("project_id","source_type","source_id","variant_id","warehouse_id"),
	CONSTRAINT "inbound_supply_qty_expected_check" CHECK ("inventory"."inbound_supply"."qty_expected" > 0),
	CONSTRAINT "inbound_supply_qty_received_check" CHECK ("inventory"."inbound_supply"."qty_received" >= 0)
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
ALTER TABLE "inventory"."product_feature" ADD CONSTRAINT "product_feature_parent_id_product_feature_id_fk" FOREIGN KEY ("parent_id") REFERENCES "inventory"."product_feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_value" ADD CONSTRAINT "product_feature_value_feature_id_product_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "inventory"."product_feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."item_dimensions" ADD CONSTRAINT "item_dimensions_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."item_weight" ADD CONSTRAINT "item_weight_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD CONSTRAINT "warehouse_stock_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD CONSTRAINT "warehouse_stock_warehouse_fk" FOREIGN KEY ("project_id","warehouse_id") REFERENCES "inventory"."warehouses"("project_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."stock_changes" ADD CONSTRAINT "stock_changes_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."stock_changes" ADD CONSTRAINT "stock_changes_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."reservations" ADD CONSTRAINT "reservations_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."reservations" ADD CONSTRAINT "reservations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_inventory_settings" ADD CONSTRAINT "product_inventory_settings_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "inventory"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."inbound_supply" ADD CONSTRAINT "inbound_supply_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."inbound_supply" ADD CONSTRAINT "inbound_supply_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."variant_media" ADD CONSTRAINT "variant_media_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_translation" ADD CONSTRAINT "product_feature_translation_feature_id_product_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "inventory"."product_feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_value_translation" ADD CONSTRAINT "product_feature_value_translation_feature_value_id_product_feature_value_id_fk" FOREIGN KEY ("feature_value_id") REFERENCES "inventory"."product_feature_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_option_translation" ADD CONSTRAINT "product_option_translation_option_id_product_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "inventory"."product_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_option_value_translation" ADD CONSTRAINT "product_option_value_translation_option_value_id_product_option_value_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "inventory"."product_option_value"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_translation" ADD CONSTRAINT "product_translation_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "inventory"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."variant_translation" ADD CONSTRAINT "variant_translation_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_translation" ADD CONSTRAINT "warehouse_translation_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_seo" ADD CONSTRAINT "product_seo_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "inventory"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_project_id_handle_key" ON "inventory"."product" USING btree ("project_id","handle") WHERE deleted_at IS NULL AND handle IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_product_project_id" ON "inventory"."product" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_created_at" ON "inventory"."product" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_product_updated_at" ON "inventory"."product" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_product_deleted_at" ON "inventory"."product" USING btree ("deleted_at") WHERE deleted_at IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_product_id_default_key" ON "inventory"."variant" USING btree ("product_id") WHERE is_default = true AND deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_product_id_handle_key" ON "inventory"."variant" USING btree ("product_id","handle") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_project_id_sku_key" ON "inventory"."variant" USING btree ("project_id","sku") WHERE deleted_at IS NULL AND sku IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "variant_project_id_external_system_external_id_key" ON "inventory"."variant" USING btree ("project_id","external_system","external_id") WHERE deleted_at IS NULL AND external_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_variant_project_id" ON "inventory"."variant" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_variant_product_id" ON "inventory"."variant" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_variant_product_active" ON "inventory"."variant" USING btree ("product_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_variant_created_at" ON "inventory"."variant" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_variant_updated_at" ON "inventory"."variant" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_variant_deleted_at" ON "inventory"."variant" USING btree ("deleted_at") WHERE deleted_at IS NOT NULL;--> statement-breakpoint
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
CREATE INDEX "product_feature_sort_idx" ON "inventory"."product_feature" USING btree ("product_id","index");--> statement-breakpoint
CREATE INDEX "idx_product_feature_product_id" ON "inventory"."product_feature" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_feature_children_idx" ON "inventory"."product_feature" USING btree ("product_id","parent_id","index");--> statement-breakpoint
CREATE INDEX "idx_product_feature_value_feature_id" ON "inventory"."product_feature_value" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "idx_item_dimensions_project_id" ON "inventory"."item_dimensions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_item_weight_project_id" ON "inventory"."item_weight" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_warehouse_stock_variant" ON "inventory"."warehouse_stock" USING btree ("project_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_warehouses_default_unique" ON "inventory"."warehouses" USING btree ("project_id") WHERE is_default = true;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_changes_seq_unique" ON "inventory"."stock_changes" USING btree ("seq");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_stock_changes_idempotency" ON "inventory"."stock_changes" USING btree ("project_id","source_system","source_event_id","warehouse_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_stock_changes_idempo_lookup" ON "inventory"."stock_changes" USING btree ("project_id","source_system","source_event_id");--> statement-breakpoint
CREATE INDEX "idx_stock_changes_variant_created_seq" ON "inventory"."stock_changes" USING btree ("variant_id","created_at","seq");--> statement-breakpoint
CREATE INDEX "idx_stock_changes_variant_warehouse_created_seq" ON "inventory"."stock_changes" USING btree ("variant_id","warehouse_id","created_at","seq");--> statement-breakpoint
CREATE INDEX "idx_stock_changes_project_seq" ON "inventory"."stock_changes" USING btree ("project_id","seq");--> statement-breakpoint
CREATE INDEX "idx_stock_changes_type_seq" ON "inventory"."stock_changes" USING btree ("movement_type","seq");--> statement-breakpoint
CREATE INDEX "idx_stock_changes_reason_seq" ON "inventory"."stock_changes" USING btree ("reason","seq");--> statement-breakpoint
CREATE INDEX "idx_reservations_variant" ON "inventory"."reservations" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_reservations_order" ON "inventory"."reservations" USING btree ("order_system","order_id");--> statement-breakpoint
CREATE INDEX "idx_inbound_supply_variant_date" ON "inventory"."inbound_supply" USING btree ("variant_id","warehouse_id","expected_at");--> statement-breakpoint
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
CREATE INDEX "idx_product_seo_project" ON "inventory"."product_seo" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_seo_project_locale" ON "inventory"."product_seo" USING btree ("project_id","locale");--> statement-breakpoint
CREATE VIEW "inventory"."variant_prices_current" AS (select "id", "project_id", "variant_id", "currency", "amount_minor", "compare_at_minor", "effective_from", "effective_to", "recorded_at" from "inventory"."item_pricing" where "inventory"."item_pricing"."effective_to" IS NULL);--> statement-breakpoint
CREATE VIEW "inventory"."variant_costs_current" AS (select "id", "project_id", "variant_id", "currency", "unit_cost_minor", "effective_from", "effective_to", "recorded_at" from "inventory"."product_variant_cost_history" where "inventory"."product_variant_cost_history"."effective_to" IS NULL);
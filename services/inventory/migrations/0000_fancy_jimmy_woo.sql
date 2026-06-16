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
CREATE TABLE "inventory"."inventory_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"sku" varchar(255),
	"track_inventory" boolean DEFAULT true NOT NULL,
	"continue_selling_when_out_of_stock" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_item_variant_id_unique" UNIQUE("variant_id"),
	CONSTRAINT "inventory_item_sku_unique" UNIQUE("project_id","sku")
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
	"created_by" text,
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
CREATE TABLE "inventory"."warehouse_translation" (
	"project_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"locale" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "warehouse_translation_warehouse_id_locale_pk" PRIMARY KEY("warehouse_id","locale")
);
--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD CONSTRAINT "warehouse_stock_warehouse_fk" FOREIGN KEY ("project_id","warehouse_id") REFERENCES "inventory"."warehouses"("project_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."stock_changes" ADD CONSTRAINT "stock_changes_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."reservations" ADD CONSTRAINT "reservations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."inbound_supply" ADD CONSTRAINT "inbound_supply_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_translation" ADD CONSTRAINT "warehouse_translation_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_inventory_item_variant" ON "inventory"."inventory_item" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_item_project" ON "inventory"."inventory_item" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_product_variant_cost_history_variant_currency_effective_from" ON "inventory"."product_variant_cost_history" USING btree ("project_id","variant_id","currency","effective_from");--> statement-breakpoint
CREATE INDEX "idx_product_variant_cost_history_variant_effective_from" ON "inventory"."product_variant_cost_history" USING btree ("project_id","variant_id","effective_from");--> statement-breakpoint
CREATE INDEX "idx_product_variant_cost_history_recorded_at" ON "inventory"."product_variant_cost_history" USING btree ("project_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_product_variant_cost_history_effective_to" ON "inventory"."product_variant_cost_history" USING btree ("project_id","effective_to");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_variant_cost_history_current_unique" ON "inventory"."product_variant_cost_history" USING btree ("project_id","variant_id","currency") WHERE effective_to IS NULL;--> statement-breakpoint
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
CREATE INDEX "idx_warehouse_translation_project" ON "inventory"."warehouse_translation" USING btree ("project_id");--> statement-breakpoint
CREATE VIEW "inventory"."variant_costs_current" AS (select "id", "project_id", "variant_id", "currency", "unit_cost_minor", "effective_from", "effective_to", "recorded_at" from "inventory"."product_variant_cost_history" where "inventory"."product_variant_cost_history"."effective_to" IS NULL);
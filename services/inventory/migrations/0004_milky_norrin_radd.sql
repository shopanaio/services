CREATE TYPE "inventory"."stock_apply_status" AS ENUM('APPLIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "inventory"."stock_movement_reason" AS ENUM('DAMAGE', 'INVENTORY_COUNT', 'MANUAL', 'CUSTOMER_RETURN');--> statement-breakpoint
CREATE TYPE "inventory"."stock_movement_type" AS ENUM('SEED', 'RECEIVE', 'SELL', 'RETURN', 'ADJUST', 'RESERVE', 'RELEASE', 'TRANSFER');--> statement-breakpoint
CREATE TYPE "inventory"."stock_transfer_direction" AS ENUM('IN', 'OUT');--> statement-breakpoint
CREATE TYPE "inventory"."reservation_status" AS ENUM('ACTIVE', 'RELEASED', 'FULFILLED');--> statement-breakpoint
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
ALTER TABLE "inventory"."product_feature" DROP CONSTRAINT "product_feature_product_id_slug_key";--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_value" DROP CONSTRAINT "product_feature_value_feature_id_slug_key";--> statement-breakpoint
ALTER TABLE "inventory"."product_feature" ADD COLUMN "index" integer[] NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory"."product_feature" ADD COLUMN "is_group" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory"."product_feature" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_value" ADD COLUMN "index" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD COLUMN "reserved_qty" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD COLUMN "unavailable_qty" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory"."stock_changes" ADD CONSTRAINT "stock_changes_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."stock_changes" ADD CONSTRAINT "stock_changes_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."reservations" ADD CONSTRAINT "reservations_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."reservations" ADD CONSTRAINT "reservations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."product_inventory_settings" ADD CONSTRAINT "product_inventory_settings_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "inventory"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."inbound_supply" ADD CONSTRAINT "inbound_supply_variant_id_variant_id_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory"."inbound_supply" ADD CONSTRAINT "inbound_supply_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "inventory"."product_feature" ADD CONSTRAINT "product_feature_parent_id_product_feature_id_fk" FOREIGN KEY ("parent_id") REFERENCES "inventory"."product_feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_variant_product_active" ON "inventory"."variant" USING btree ("product_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "product_feature_sort_idx" ON "inventory"."product_feature" USING btree ("product_id","index");--> statement-breakpoint
CREATE INDEX "product_feature_children_idx" ON "inventory"."product_feature" USING btree ("product_id","parent_id","index");--> statement-breakpoint
ALTER TABLE "inventory"."product_feature" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_value" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_value" DROP COLUMN "sort_index";--> statement-breakpoint
ALTER TABLE "inventory"."product_feature" ADD CONSTRAINT "product_feature_product_id_index_uniq" UNIQUE("product_id","index");--> statement-breakpoint
ALTER TABLE "inventory"."product_feature_value" ADD CONSTRAINT "product_feature_value_feature_id_index_uniq" UNIQUE("feature_id","index");--> statement-breakpoint
ALTER TABLE "inventory"."product_feature" ADD CONSTRAINT "feature_group_no_parent" CHECK ("inventory"."product_feature"."is_group" = false OR "inventory"."product_feature"."parent_id" IS NULL);--> statement-breakpoint
ALTER TABLE "inventory"."product_feature" ADD CONSTRAINT "feature_index_not_empty" CHECK (array_length("inventory"."product_feature"."index", 1) > 0);--> statement-breakpoint
ALTER TABLE "inventory"."product_feature" ADD CONSTRAINT "feature_group_root_only" CHECK ("inventory"."product_feature"."is_group" = false OR array_length("inventory"."product_feature"."index", 1) = 1);--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD CONSTRAINT "warehouse_stock_reserved_check" CHECK ("inventory"."warehouse_stock"."reserved_qty" >= 0);--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD CONSTRAINT "warehouse_stock_unavailable_check" CHECK ("inventory"."warehouse_stock"."unavailable_qty" >= 0);--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD CONSTRAINT "warehouse_stock_unavailable_le_onhand_check" CHECK ("inventory"."warehouse_stock"."unavailable_qty" <= "inventory"."warehouse_stock"."quantity_on_hand");
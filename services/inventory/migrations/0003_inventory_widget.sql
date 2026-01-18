CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE TYPE "inventory"."stock_movement_type" AS ENUM('SEED', 'RECEIVE', 'SELL', 'RETURN', 'ADJUST', 'RESERVE', 'RELEASE', 'TRANSFER');
--> statement-breakpoint
CREATE TYPE "inventory"."stock_movement_reason" AS ENUM('DAMAGE', 'INVENTORY_COUNT', 'MANUAL', 'CUSTOMER_RETURN');
--> statement-breakpoint
CREATE TYPE "inventory"."stock_transfer_direction" AS ENUM('IN', 'OUT');
--> statement-breakpoint
CREATE TYPE "inventory"."stock_apply_status" AS ENUM('APPLIED', 'REJECTED');
--> statement-breakpoint
CREATE TYPE "inventory"."reservation_status" AS ENUM('ACTIVE', 'RELEASED', 'FULFILLED');
--> statement-breakpoint
CREATE TABLE "inventory"."stock_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
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
ALTER TABLE "inventory"."stock_changes" ADD CONSTRAINT "stock_changes_variant_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "inventory"."stock_changes" ADD CONSTRAINT "stock_changes_warehouse_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE UNIQUE INDEX "stock_changes_seq_unique" ON "inventory"."stock_changes" ("seq");
--> statement-breakpoint
CREATE INDEX "idx_stock_changes_variant_created_seq" ON "inventory"."stock_changes" ("variant_id", "created_at", "seq");
--> statement-breakpoint
CREATE INDEX "idx_stock_changes_variant_warehouse_created_seq" ON "inventory"."stock_changes" ("variant_id", "warehouse_id", "created_at", "seq");
--> statement-breakpoint
CREATE INDEX "idx_stock_changes_project_seq" ON "inventory"."stock_changes" ("project_id", "seq");
--> statement-breakpoint
CREATE INDEX "idx_stock_changes_type_seq" ON "inventory"."stock_changes" ("movement_type", "seq");
--> statement-breakpoint
CREATE INDEX "idx_stock_changes_reason_seq" ON "inventory"."stock_changes" ("reason", "seq");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_stock_changes_idempotency" ON "inventory"."stock_changes" ("project_id", "source_system", "source_event_id", "warehouse_id", "variant_id");
--> statement-breakpoint
CREATE INDEX "idx_stock_changes_idempo_lookup" ON "inventory"."stock_changes" ("project_id", "source_system", "source_event_id");
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
	CONSTRAINT "reservations_quantity_check" CHECK ("inventory"."reservations"."quantity" > 0),
	CONSTRAINT "reservations_project_order_variant_warehouse_key" UNIQUE("project_id","order_system","order_id","variant_id","warehouse_id")
);
--> statement-breakpoint
ALTER TABLE "inventory"."reservations" ADD CONSTRAINT "reservations_variant_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id");
--> statement-breakpoint
ALTER TABLE "inventory"."reservations" ADD CONSTRAINT "reservations_warehouse_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX "idx_reservations_variant" ON "inventory"."reservations" ("variant_id");
--> statement-breakpoint
CREATE INDEX "idx_reservations_order" ON "inventory"."reservations" ("order_system", "order_id");
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
	CONSTRAINT "product_inventory_settings_pkey" PRIMARY KEY("project_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "inventory"."product_inventory_settings" ADD CONSTRAINT "product_inventory_settings_product_fk" FOREIGN KEY ("product_id") REFERENCES "inventory"."product"("id") ON DELETE cascade;
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
	CONSTRAINT "inbound_supply_qty_expected_check" CHECK ("inventory"."inbound_supply"."qty_expected" > 0),
	CONSTRAINT "inbound_supply_qty_received_check" CHECK ("inventory"."inbound_supply"."qty_received" >= 0),
	CONSTRAINT "inbound_supply_project_source_variant_warehouse_key" UNIQUE("project_id","source_type","source_id","variant_id","warehouse_id")
);
--> statement-breakpoint
ALTER TABLE "inventory"."inbound_supply" ADD CONSTRAINT "inbound_supply_variant_fk" FOREIGN KEY ("variant_id") REFERENCES "inventory"."variant"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "inventory"."inbound_supply" ADD CONSTRAINT "inbound_supply_warehouse_fk" FOREIGN KEY ("warehouse_id") REFERENCES "inventory"."warehouses"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX "idx_inbound_supply_variant_date" ON "inventory"."inbound_supply" ("variant_id", "warehouse_id", "expected_at");
--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD COLUMN "reserved_qty" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD COLUMN "unavailable_qty" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD CONSTRAINT "warehouse_stock_reserved_check" CHECK ("inventory"."warehouse_stock"."reserved_qty" >= 0);
--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD CONSTRAINT "warehouse_stock_unavailable_check" CHECK ("inventory"."warehouse_stock"."unavailable_qty" >= 0);
--> statement-breakpoint
ALTER TABLE "inventory"."warehouse_stock" ADD CONSTRAINT "warehouse_stock_unavailable_le_onhand_check" CHECK ("inventory"."warehouse_stock"."unavailable_qty" <= "inventory"."warehouse_stock"."quantity_on_hand");
--> statement-breakpoint
CREATE INDEX "idx_variant_product_active" ON "inventory"."variant" ("product_id") WHERE deleted_at IS NULL;
--> statement-breakpoint
INSERT INTO "inventory"."stock_changes" (
  "project_id",
  "warehouse_id",
  "variant_id",
  "delta_on_hand",
  "delta_reserved",
  "delta_unavailable",
  "on_hand_after",
  "reserved_after",
  "unavailable_after",
  "movement_type",
  "source_system",
  "source_event_id",
  "created_at"
)
SELECT
  ws."project_id",
  ws."warehouse_id",
  ws."variant_id",
  0,
  0,
  0,
  ws."quantity_on_hand",
  COALESCE(ws."reserved_qty", 0),
  COALESCE(ws."unavailable_qty", 0),
  'SEED',
  'MIGRATION',
  'seed:' || encode(digest(concat_ws(':', ws."project_id"::text, ws."warehouse_id"::text, ws."variant_id"::text), 'sha256'), 'hex'),
  COALESCE(ws."updated_at", ws."created_at", now())
FROM "inventory"."warehouse_stock" ws;

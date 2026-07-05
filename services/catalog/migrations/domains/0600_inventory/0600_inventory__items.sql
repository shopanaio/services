-- Up Migration

CREATE TABLE "catalog"."inventory_item" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "store_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "sku" varchar(255),
  "track_inventory" boolean NOT NULL DEFAULT true,
  "continue_selling_when_out_of_stock" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "inventory_item_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_item_variant_id_unique" UNIQUE ("variant_id"),
  CONSTRAINT "inventory_item_sku_unique" UNIQUE ("store_id", "sku")
);

CREATE INDEX "idx_inventory_item_variant"
  ON "catalog"."inventory_item" ("variant_id");

CREATE INDEX "idx_inventory_item_store"
  ON "catalog"."inventory_item" ("store_id");

CREATE TABLE "catalog"."item_dimensions" (
  "variant_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "w_mm" integer NOT NULL,
  "l_mm" integer NOT NULL,
  "h_mm" integer NOT NULL,
  "display_unit" "catalog"."dimension_unit" NOT NULL,
  CONSTRAINT "item_dimensions_pkey" PRIMARY KEY ("variant_id"),
  CONSTRAINT "item_dimensions_positive_check"
    CHECK ("w_mm" > 0 AND "l_mm" > 0 AND "h_mm" > 0)
);

CREATE INDEX "idx_item_dimensions_store_id"
  ON "catalog"."item_dimensions" ("store_id");

CREATE TABLE "catalog"."item_weight" (
  "variant_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "weight_gr" integer NOT NULL,
  "display_unit" "catalog"."weight_unit" NOT NULL DEFAULT 'g',
  CONSTRAINT "item_weight_pkey" PRIMARY KEY ("variant_id"),
  CONSTRAINT "item_weight_positive_check" CHECK ("weight_gr" > 0)
);

CREATE INDEX "idx_item_weight_store_id"
  ON "catalog"."item_weight" ("store_id");

CREATE TABLE "catalog"."product_inventory_settings" (
  "store_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "alert_threshold_method" varchar(20) NOT NULL DEFAULT 'SAFETY_STOCK',
  "alert_minimum_stock" integer NOT NULL DEFAULT 10,
  "backorder_enabled" boolean NOT NULL DEFAULT false,
  "backorder_max_days" integer,
  "backorder_max_qty" integer,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "product_inventory_settings_pkey" PRIMARY KEY ("product_id")
);

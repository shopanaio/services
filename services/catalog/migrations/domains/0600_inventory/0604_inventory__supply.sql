-- Up Migration

CREATE TABLE "catalog"."inbound_supply" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "warehouse_id" uuid NOT NULL,
  "source_type" varchar(30) NOT NULL,
  "source_id" uuid NOT NULL,
  "expected_at" timestamp with time zone NOT NULL,
  "qty_expected" integer NOT NULL,
  "qty_received" integer NOT NULL DEFAULT 0,
  "status" varchar(20) NOT NULL DEFAULT 'PLANNED',
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "inbound_supply_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inbound_supply_warehouse_id_fk"
    FOREIGN KEY ("warehouse_id")
    REFERENCES "catalog"."warehouses" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "inbound_supply_qty_expected_check" CHECK ("qty_expected" > 0),
  CONSTRAINT "inbound_supply_qty_received_check" CHECK ("qty_received" >= 0),
  CONSTRAINT "inbound_supply_project_source_variant_warehouse_key"
    UNIQUE ("project_id", "source_type", "source_id", "variant_id", "warehouse_id")
);

CREATE INDEX "idx_inbound_supply_variant_date"
  ON "catalog"."inbound_supply" ("variant_id", "warehouse_id", "expected_at");

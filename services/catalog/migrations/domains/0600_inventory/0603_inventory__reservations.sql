-- Up Migration

CREATE TABLE "catalog"."reservations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "warehouse_id" uuid NOT NULL,
  "order_system" varchar(50) NOT NULL,
  "order_id" varchar(255) NOT NULL,
  "quantity" integer NOT NULL,
  "status" "catalog"."reservation_status" NOT NULL DEFAULT 'ACTIVE',
  "reserved_at" timestamp with time zone DEFAULT now(),
  "released_at" timestamp with time zone,
  CONSTRAINT "reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reservations_warehouse_id_fk"
    FOREIGN KEY ("warehouse_id")
    REFERENCES "catalog"."warehouses" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "reservations_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "reservations_project_order_variant_warehouse_key"
    UNIQUE ("project_id", "order_system", "order_id", "variant_id", "warehouse_id")
);

CREATE INDEX "idx_reservations_variant"
  ON "catalog"."reservations" ("variant_id");

CREATE INDEX "idx_reservations_order"
  ON "catalog"."reservations" ("order_system", "order_id");

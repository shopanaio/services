-- Up Migration

CREATE TABLE "catalog"."warehouse_stock" (
  "project_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "warehouse_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "quantity_on_hand" integer NOT NULL DEFAULT 0,
  "reserved_qty" integer NOT NULL DEFAULT 0,
  "unavailable_qty" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "warehouse_stock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "warehouse_stock_quantity_check" CHECK ("quantity_on_hand" >= 0),
  CONSTRAINT "warehouse_stock_reserved_check" CHECK ("reserved_qty" >= 0),
  CONSTRAINT "warehouse_stock_unavailable_check" CHECK ("unavailable_qty" >= 0),
  CONSTRAINT "warehouse_stock_unavailable_le_onhand_check"
    CHECK ("unavailable_qty" <= "quantity_on_hand"),
  CONSTRAINT "warehouse_stock_project_id_warehouse_id_variant_id_key"
    UNIQUE ("project_id", "warehouse_id", "variant_id"),
  CONSTRAINT "warehouse_stock_warehouse_fk"
    FOREIGN KEY ("project_id", "warehouse_id")
    REFERENCES "catalog"."warehouses" ("project_id", "id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_warehouse_stock_variant"
  ON "catalog"."warehouse_stock" ("project_id", "variant_id");

CREATE TABLE "catalog"."stock_changes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "seq" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "project_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "warehouse_id" uuid NOT NULL,
  "delta_on_hand" integer NOT NULL DEFAULT 0,
  "delta_reserved" integer NOT NULL DEFAULT 0,
  "delta_unavailable" integer NOT NULL DEFAULT 0,
  "on_hand_after" integer NOT NULL,
  "reserved_after" integer NOT NULL,
  "unavailable_after" integer NOT NULL,
  "movement_type" "catalog"."stock_movement_type" NOT NULL,
  "transfer_direction" "catalog"."stock_transfer_direction",
  "reason" "catalog"."stock_movement_reason",
  "source_system" varchar(30) NOT NULL,
  "source_event_id" varchar(128) NOT NULL,
  "correlation_id" uuid,
  "note" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" text,
  "apply_status" "catalog"."stock_apply_status" NOT NULL DEFAULT 'APPLIED',
  CONSTRAINT "stock_changes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_changes_warehouse_id_fk"
    FOREIGN KEY ("warehouse_id")
    REFERENCES "catalog"."warehouses" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "stock_changes_delta_check"
    CHECK (
      "movement_type" = 'SEED'
      OR "delta_on_hand" <> 0
      OR "delta_reserved" <> 0
      OR "delta_unavailable" <> 0
    ),
  CONSTRAINT "stock_changes_on_hand_after_check" CHECK ("on_hand_after" >= 0),
  CONSTRAINT "stock_changes_reserved_after_check" CHECK ("reserved_after" >= 0),
  CONSTRAINT "stock_changes_unavailable_after_check" CHECK ("unavailable_after" >= 0),
  CONSTRAINT "stock_changes_unavailable_le_onhand_check"
    CHECK ("unavailable_after" <= "on_hand_after"),
  CONSTRAINT "stock_changes_transfer_dir_check"
    CHECK (
      CASE
        WHEN "movement_type" = 'TRANSFER' THEN "transfer_direction" IS NOT NULL
        ELSE "transfer_direction" IS NULL
      END
    ),
  CONSTRAINT "stock_changes_transfer_correlation_check"
    CHECK ("movement_type" <> 'TRANSFER' OR "correlation_id" IS NOT NULL)
);

CREATE UNIQUE INDEX "stock_changes_seq_unique"
  ON "catalog"."stock_changes" ("seq");

CREATE UNIQUE INDEX "idx_stock_changes_idempotency"
  ON "catalog"."stock_changes" (
    "project_id",
    "source_system",
    "source_event_id",
    "warehouse_id",
    "variant_id"
  );

CREATE INDEX "idx_stock_changes_idempo_lookup"
  ON "catalog"."stock_changes" ("project_id", "source_system", "source_event_id");

CREATE INDEX "idx_stock_changes_variant_created_seq"
  ON "catalog"."stock_changes" ("variant_id", "created_at", "seq");

CREATE INDEX "idx_stock_changes_variant_warehouse_created_seq"
  ON "catalog"."stock_changes" ("variant_id", "warehouse_id", "created_at", "seq");

CREATE INDEX "idx_stock_changes_project_seq"
  ON "catalog"."stock_changes" ("project_id", "seq");

CREATE INDEX "idx_stock_changes_type_seq"
  ON "catalog"."stock_changes" ("movement_type", "seq");

CREATE INDEX "idx_stock_changes_reason_seq"
  ON "catalog"."stock_changes" ("reason", "seq");

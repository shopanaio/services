-- Up Migration

CREATE TABLE "orders"."order_checkout_placements" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "organization_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "placement_id" uuid NOT NULL,
  "checkout_id" uuid NOT NULL,
  "checkout_version" integer NOT NULL,
  "result_revision" text NOT NULL,
  "final_quote_id" text NOT NULL,
  "final_quote_revision" text NOT NULL,
  "payment_methods_revision" text NOT NULL,
  "delivery_revision" text NOT NULL,
  "requested_order_id" uuid NOT NULL,
  "contract_version" integer NOT NULL DEFAULT 1,
  "snapshot_hash" varchar(64) NOT NULL,
  "snapshot" jsonb NOT NULL,
  "status" "orders"."order_placement_status" NOT NULL DEFAULT 'AWAITING_FINALIZATION',
  "idempotency_key" text NOT NULL,
  "correlation_id" uuid NOT NULL,
  "workflow_id" text NOT NULL,
  "confirmed_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "failure_code" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_checkout_placements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_checkout_placements_order_unique" UNIQUE ("store_id", "order_id"),
  CONSTRAINT "order_checkout_placements_placement_unique" UNIQUE ("store_id", "placement_id"),
  CONSTRAINT "order_checkout_placements_checkout_unique" UNIQUE ("store_id", "checkout_id"),
  CONSTRAINT "order_checkout_placements_requested_order_unique" UNIQUE ("store_id", "requested_order_id"),
  CONSTRAINT "order_checkout_placements_idempotency_unique" UNIQUE ("store_id", "idempotency_key"),
  CONSTRAINT "order_checkout_placements_order_fk" FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_checkout_placements_requested_id_check" CHECK ("requested_order_id" = "order_id"),
  CONSTRAINT "order_checkout_placements_versions_check" CHECK ("checkout_version" > 0 AND "contract_version" = 1),
  CONSTRAINT "order_checkout_placements_snapshot_hash_check" CHECK ("snapshot_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "order_checkout_placements_snapshot_check" CHECK (jsonb_typeof("snapshot") = 'object'),
  CONSTRAINT "order_checkout_placements_terminal_check" CHECK (
    ("status" = 'AWAITING_FINALIZATION' AND "confirmed_at" IS NULL AND "failed_at" IS NULL)
    OR ("status" = 'CONFIRMED' AND "confirmed_at" IS NOT NULL AND "failed_at" IS NULL)
    OR ("status" = 'FAILED' AND "failed_at" IS NOT NULL AND "failure_code" IS NOT NULL)
  )
);

CREATE INDEX "order_checkout_placements_status_idx"
  ON "orders"."order_checkout_placements" ("store_id", "status", "updated_at", "id");

CREATE TRIGGER "order_checkout_placements_touch_updated_at"
BEFORE UPDATE ON "orders"."order_checkout_placements"
FOR EACH ROW EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_checkout_commitments" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "placement_id" uuid NOT NULL,
  "inventory_reservation_key" text NOT NULL,
  "inventory_expires_at" timestamp with time zone NOT NULL,
  "pricing_reservation_ids" text[] NOT NULL DEFAULT '{}',
  "pricing_redemption_ids" text[] NOT NULL DEFAULT '{}',
  "loyalty_commitment" jsonb,
  "delivery_commitments" jsonb NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_checkout_commitments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_checkout_commitments_order_unique" UNIQUE ("store_id", "order_id"),
  CONSTRAINT "order_checkout_commitments_placement_fk" FOREIGN KEY ("store_id", "placement_id")
    REFERENCES "orders"."order_checkout_placements" ("store_id", "placement_id"),
  CONSTRAINT "order_checkout_commitments_delivery_check" CHECK (jsonb_typeof("delivery_commitments") = 'array'),
  CONSTRAINT "order_checkout_commitments_loyalty_check" CHECK (
    "loyalty_commitment" IS NULL OR jsonb_typeof("loyalty_commitment") = 'object'
  )
);

CREATE TRIGGER "order_checkout_commitments_append_only"
BEFORE UPDATE OR DELETE ON "orders"."order_checkout_commitments"
FOR EACH ROW EXECUTE FUNCTION "orders"."reject_row_mutation"();

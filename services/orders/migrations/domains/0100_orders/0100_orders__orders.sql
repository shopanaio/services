-- Up Migration

CREATE TABLE "orders"."order_number_counters" (
  "store_id" uuid NOT NULL,
  "last_number" bigint NOT NULL DEFAULT 0,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_number_counters_pkey" PRIMARY KEY ("store_id"),
  CONSTRAINT "order_number_counters_last_number_check" CHECK ("last_number" >= 0)
);

CREATE TABLE "orders"."orders" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_number" bigint NOT NULL,
  "revision" integer NOT NULL DEFAULT 1,
  "status" "orders"."order_status" NOT NULL DEFAULT 'DRAFT',
  "payment_status" "orders"."order_payment_status" NOT NULL DEFAULT 'PENDING',
  "fulfillment_status" "orders"."order_fulfillment_status" NOT NULL DEFAULT 'UNFULFILLED',
  "delivery_status" "orders"."order_delivery_status" NOT NULL DEFAULT 'NOT_SHIPPED',
  "return_status" "orders"."order_return_status" NOT NULL DEFAULT 'NONE',
  "risk_level" "orders"."order_risk_level" NOT NULL DEFAULT 'NONE',
  "customer_id" uuid,
  "created_by_type" "orders"."order_actor_type" NOT NULL,
  "created_by_id" uuid,
  "sales_channel" varchar(64),
  "checkout_id" uuid,
  "external_source" varchar(128),
  "external_id" text,
  "locale_code" varchar(16),
  "currency_code" varchar(3) NOT NULL,
  "subtotal_amount" bigint NOT NULL,
  "discount_amount" bigint NOT NULL DEFAULT 0,
  "shipping_amount" bigint NOT NULL DEFAULT 0,
  "tax_amount" bigint NOT NULL DEFAULT 0,
  "duty_amount" bigint NOT NULL DEFAULT 0,
  "adjustment_amount" bigint NOT NULL DEFAULT 0,
  "total_amount" bigint NOT NULL,
  "checkout_snapshot" jsonb NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "placed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "closed_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_store_id_id_unique" UNIQUE ("store_id", "id"),
  CONSTRAINT "orders_store_id_id_currency_unique"
    UNIQUE ("store_id", "id", "currency_code"),
  CONSTRAINT "orders_store_number_unique" UNIQUE ("store_id", "order_number"),
  CONSTRAINT "orders_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "orders_order_number_check" CHECK ("order_number" > 0),
  CONSTRAINT "orders_currency_code_check" CHECK ("currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "orders_checkout_snapshot_check" CHECK (
    jsonb_typeof("checkout_snapshot") = 'object'
  ),
  CONSTRAINT "orders_metadata_check" CHECK (jsonb_typeof("metadata") = 'object'),
  CONSTRAINT "orders_actor_check" CHECK (
    "created_by_type" = 'SYSTEM' OR "created_by_id" IS NOT NULL
  ),
  CONSTRAINT "orders_external_identity_check" CHECK (
    ("external_source" IS NULL) = ("external_id" IS NULL)
  ),
  CONSTRAINT "orders_amounts_non_negative_check" CHECK (
    "subtotal_amount" >= 0
    AND "discount_amount" >= 0
    AND "shipping_amount" >= 0
    AND "tax_amount" >= 0
    AND "duty_amount" >= 0
    AND "total_amount" >= 0
  ),
  CONSTRAINT "orders_total_formula_check" CHECK (
    "total_amount" =
      "subtotal_amount"
      - "discount_amount"
      + "shipping_amount"
      + "tax_amount"
      + "duty_amount"
      + "adjustment_amount"
  ),
  CONSTRAINT "orders_lifecycle_timestamps_check" CHECK (
    ("cancelled_at" IS NULL OR "cancelled_at" >= "created_at")
    AND ("placed_at" IS NULL OR "placed_at" >= "created_at")
    AND ("closed_at" IS NULL OR "closed_at" >= COALESCE("placed_at", "created_at"))
    AND ("expires_at" IS NULL OR "expires_at" >= "created_at")
    AND ("archived_at" IS NULL OR "archived_at" >= "created_at")
  ),
  CONSTRAINT "orders_status_timestamps_check" CHECK (
    ("status" NOT IN ('ACTIVE', 'CLOSED') OR "placed_at" IS NOT NULL)
    AND ("status" <> 'CLOSED' OR "closed_at" IS NOT NULL)
    AND ("status" <> 'CANCELLED' OR "cancelled_at" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "orders_store_checkout_key"
  ON "orders"."orders" ("store_id", "checkout_id")
  WHERE "checkout_id" IS NOT NULL;

CREATE UNIQUE INDEX "orders_store_external_key"
  ON "orders"."orders" ("store_id", "external_source", "external_id")
  WHERE "external_source" IS NOT NULL AND "external_id" IS NOT NULL;

CREATE INDEX "orders_store_created_at_idx"
  ON "orders"."orders" ("store_id", "created_at" DESC, "id" DESC);

CREATE INDEX "orders_store_updated_at_idx"
  ON "orders"."orders" ("store_id", "updated_at" DESC, "id" DESC);

CREATE INDEX "orders_store_status_created_at_idx"
  ON "orders"."orders" ("store_id", "status", "created_at" DESC, "id" DESC);

CREATE INDEX "orders_store_payment_status_created_at_idx"
  ON "orders"."orders" ("store_id", "payment_status", "created_at" DESC, "id" DESC);

CREATE INDEX "orders_store_fulfillment_status_created_at_idx"
  ON "orders"."orders" ("store_id", "fulfillment_status", "created_at" DESC, "id" DESC);

CREATE INDEX "orders_store_customer_created_at_idx"
  ON "orders"."orders" ("store_id", "customer_id", "created_at" DESC, "id" DESC)
  WHERE "customer_id" IS NOT NULL;

CREATE INDEX "orders_store_placed_at_idx"
  ON "orders"."orders" ("store_id", "placed_at" DESC, "id" DESC)
  WHERE "placed_at" IS NOT NULL;

CREATE INDEX "orders_store_active_idx"
  ON "orders"."orders" ("store_id", "created_at" DESC, "id" DESC)
  WHERE "archived_at" IS NULL;

CREATE TRIGGER "orders_touch_updated_at"
BEFORE UPDATE ON "orders"."orders"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TRIGGER "orders_prevent_delete"
BEFORE DELETE ON "orders"."orders"
FOR EACH ROW
EXECUTE FUNCTION "orders"."reject_row_mutation"();

CREATE TABLE "orders"."order_tags" (
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "tag" varchar(255) NOT NULL,
  "added_by_type" "orders"."order_actor_type" NOT NULL,
  "added_by_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_tags_pkey" PRIMARY KEY ("store_id", "order_id", "tag"),
  CONSTRAINT "order_tags_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_tags_tag_check" CHECK (btrim("tag") <> ''),
  CONSTRAINT "order_tags_actor_check" CHECK (
    "added_by_type" = 'SYSTEM' OR "added_by_id" IS NOT NULL
  )
);

CREATE INDEX "order_tags_store_tag_idx"
  ON "orders"."order_tags" ("store_id", "tag", "order_id");

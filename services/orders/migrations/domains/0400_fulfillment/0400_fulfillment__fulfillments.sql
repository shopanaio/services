-- Up Migration

CREATE TABLE "orders"."order_fulfillment_orders" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "delivery_group_id" uuid,
  "status" "orders"."order_fulfillment_order_status" NOT NULL DEFAULT 'OPEN',
  "request_status" "orders"."order_fulfillment_request_status" NOT NULL DEFAULT 'UNSUBMITTED',
  "assigned_location_id" uuid,
  "hold_reason" text,
  "external_source" varchar(128),
  "external_id" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "scheduled_at" timestamp with time zone,
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_fulfillment_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_fulfillment_orders_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_fulfillment_orders_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_fulfillment_orders_delivery_group_fk"
    FOREIGN KEY ("store_id", "order_id", "delivery_group_id")
    REFERENCES "orders"."order_delivery_groups" ("store_id", "order_id", "id"),
  CONSTRAINT "order_fulfillment_orders_external_identity_check" CHECK (
    ("external_source" IS NULL) = ("external_id" IS NULL)
  ),
  CONSTRAINT "order_fulfillment_orders_hold_reason_check" CHECK (
    "status" <> 'ON_HOLD' OR "hold_reason" IS NOT NULL
  ),
  CONSTRAINT "order_fulfillment_orders_timestamps_check" CHECK (
    ("scheduled_at" IS NULL OR "scheduled_at" >= "created_at")
    AND ("closed_at" IS NULL OR "closed_at" >= "created_at")
  )
);

CREATE UNIQUE INDEX "order_fulfillment_orders_external_key"
  ON "orders"."order_fulfillment_orders" (
    "store_id", "external_source", "external_id"
  )
  WHERE "external_source" IS NOT NULL AND "external_id" IS NOT NULL;

CREATE INDEX "order_fulfillment_orders_store_order_idx"
  ON "orders"."order_fulfillment_orders" ("store_id", "order_id", "created_at", "id");

CREATE INDEX "order_fulfillment_orders_location_status_idx"
  ON "orders"."order_fulfillment_orders" (
    "store_id", "assigned_location_id", "status", "updated_at"
  )
  WHERE "assigned_location_id" IS NOT NULL;

CREATE TRIGGER "order_fulfillment_orders_touch_updated_at"
BEFORE UPDATE ON "orders"."order_fulfillment_orders"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_fulfillment_order_lines" (
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "fulfillment_order_id" uuid NOT NULL,
  "order_line_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  CONSTRAINT "order_fulfillment_order_lines_pkey"
    PRIMARY KEY ("store_id", "order_id", "fulfillment_order_id", "order_line_id"),
  CONSTRAINT "order_fulfillment_order_lines_fulfillment_order_fk"
    FOREIGN KEY ("store_id", "order_id", "fulfillment_order_id")
    REFERENCES "orders"."order_fulfillment_orders" ("store_id", "order_id", "id"),
  CONSTRAINT "order_fulfillment_order_lines_line_fk"
    FOREIGN KEY ("store_id", "order_id", "order_line_id")
    REFERENCES "orders"."order_lines" ("store_id", "order_id", "id"),
  CONSTRAINT "order_fulfillment_order_lines_quantity_check" CHECK ("quantity" > 0)
);

CREATE INDEX "order_fulfillment_order_lines_line_idx"
  ON "orders"."order_fulfillment_order_lines" ("store_id", "order_id", "order_line_id");

CREATE TABLE "orders"."order_fulfillments" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "fulfillment_order_id" uuid NOT NULL,
  "status" "orders"."order_fulfillment_operation_status" NOT NULL DEFAULT 'PENDING',
  "location_id" uuid,
  "external_source" varchar(128),
  "external_id" text,
  "idempotency_key" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "opened_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_fulfillments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_fulfillments_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_fulfillments_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_fulfillments_fulfillment_order_fk"
    FOREIGN KEY ("store_id", "order_id", "fulfillment_order_id")
    REFERENCES "orders"."order_fulfillment_orders" ("store_id", "order_id", "id"),
  CONSTRAINT "order_fulfillments_external_identity_check" CHECK (
    ("external_source" IS NULL) = ("external_id" IS NULL)
  ),
  CONSTRAINT "order_fulfillments_timestamps_check" CHECK (
    ("opened_at" IS NULL OR "opened_at" >= "created_at")
    AND ("completed_at" IS NULL OR "completed_at" >= COALESCE("opened_at", "created_at"))
    AND ("cancelled_at" IS NULL OR "cancelled_at" >= "created_at")
  ),
  CONSTRAINT "order_fulfillments_idempotency_key"
    UNIQUE ("store_id", "order_id", "idempotency_key")
);

CREATE UNIQUE INDEX "order_fulfillments_external_key"
  ON "orders"."order_fulfillments" (
    "store_id", "external_source", "external_id"
  )
  WHERE "external_source" IS NOT NULL AND "external_id" IS NOT NULL;

CREATE INDEX "order_fulfillments_store_order_created_idx"
  ON "orders"."order_fulfillments" ("store_id", "order_id", "created_at", "id");

CREATE INDEX "order_fulfillments_store_status_idx"
  ON "orders"."order_fulfillments" ("store_id", "status", "updated_at" DESC);

CREATE INDEX "order_fulfillments_fulfillment_order_idx"
  ON "orders"."order_fulfillments" (
    "store_id", "order_id", "fulfillment_order_id", "created_at", "id"
  );

CREATE INDEX "order_fulfillments_location_idx"
  ON "orders"."order_fulfillments" ("store_id", "location_id", "status")
  WHERE "location_id" IS NOT NULL;

CREATE TRIGGER "order_fulfillments_touch_updated_at"
BEFORE UPDATE ON "orders"."order_fulfillments"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_fulfillment_lines" (
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "fulfillment_id" uuid NOT NULL,
  "order_line_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  CONSTRAINT "order_fulfillment_lines_pkey"
    PRIMARY KEY ("store_id", "order_id", "fulfillment_id", "order_line_id"),
  CONSTRAINT "order_fulfillment_lines_fulfillment_fk"
    FOREIGN KEY ("store_id", "order_id", "fulfillment_id")
    REFERENCES "orders"."order_fulfillments" ("store_id", "order_id", "id"),
  CONSTRAINT "order_fulfillment_lines_line_fk"
    FOREIGN KEY ("store_id", "order_id", "order_line_id")
    REFERENCES "orders"."order_lines" ("store_id", "order_id", "id"),
  CONSTRAINT "order_fulfillment_lines_quantity_check" CHECK ("quantity" > 0)
);

CREATE INDEX "order_fulfillment_lines_line_idx"
  ON "orders"."order_fulfillment_lines" ("store_id", "order_id", "order_line_id");

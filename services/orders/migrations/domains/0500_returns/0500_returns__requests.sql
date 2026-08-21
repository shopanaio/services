-- Up Migration

CREATE TABLE "orders"."order_return_requests" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "status" "orders"."order_return_request_status" NOT NULL DEFAULT 'REQUESTED',
  "customer_note" text,
  "merchant_note" text,
  "idempotency_key" text NOT NULL,
  "requested_by_type" "orders"."order_actor_type" NOT NULL,
  "requested_by_id" uuid,
  "resolved_by_type" "orders"."order_actor_type",
  "resolved_by_id" uuid,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "requested_at" timestamp with time zone NOT NULL DEFAULT now(),
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_return_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_return_requests_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_return_requests_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_return_requests_requested_actor_check" CHECK (
    "requested_by_type" = 'SYSTEM' OR "requested_by_id" IS NOT NULL
  ),
  CONSTRAINT "order_return_requests_resolved_actor_check" CHECK (
    ("resolved_by_type" IS NULL AND "resolved_by_id" IS NULL)
    OR "resolved_by_type" = 'SYSTEM'
    OR ("resolved_by_type" IS NOT NULL AND "resolved_by_id" IS NOT NULL)
  ),
  CONSTRAINT "order_return_requests_resolved_at_check" CHECK (
    "resolved_at" IS NULL OR "resolved_at" >= "requested_at"
  ),
  CONSTRAINT "order_return_requests_idempotency_key"
    UNIQUE ("store_id", "order_id", "idempotency_key")
);

CREATE INDEX "order_return_requests_store_order_created_idx"
  ON "orders"."order_return_requests" (
    "store_id", "order_id", "created_at" DESC, "id" DESC
  );

CREATE INDEX "order_return_requests_store_status_idx"
  ON "orders"."order_return_requests" ("store_id", "status", "updated_at" DESC);

CREATE TRIGGER "order_return_requests_touch_updated_at"
BEFORE UPDATE ON "orders"."order_return_requests"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_return_request_lines" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "return_request_id" uuid NOT NULL,
  "order_line_id" uuid NOT NULL,
  "requested_quantity" integer NOT NULL,
  "approved_quantity" integer NOT NULL DEFAULT 0,
  "received_quantity" integer NOT NULL DEFAULT 0,
  "restockable_quantity" integer NOT NULL DEFAULT 0,
  "damaged_quantity" integer NOT NULL DEFAULT 0,
  "other_disposition_quantity" integer NOT NULL DEFAULT 0,
  "reason" "orders"."order_return_reason" NOT NULL,
  "note" text,
  "disposition" "orders"."order_return_disposition" NOT NULL DEFAULT 'PENDING',
  "restock_location_id" uuid,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "order_return_request_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_return_request_lines_store_order_return_id_id_unique"
    UNIQUE ("store_id", "order_id", "return_request_id", "id"),
  CONSTRAINT "order_return_request_lines_store_order_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_return_request_lines_request_fk"
    FOREIGN KEY ("store_id", "order_id", "return_request_id")
    REFERENCES "orders"."order_return_requests" ("store_id", "order_id", "id"),
  CONSTRAINT "order_return_request_lines_line_fk"
    FOREIGN KEY ("store_id", "order_id", "order_line_id")
    REFERENCES "orders"."order_lines" ("store_id", "order_id", "id"),
  CONSTRAINT "order_return_request_lines_quantities_check" CHECK (
    "requested_quantity" > 0
    AND "approved_quantity" >= 0
    AND "approved_quantity" <= "requested_quantity"
    AND "received_quantity" >= 0
    AND "received_quantity" <= "approved_quantity"
    AND "restockable_quantity" >= 0
    AND "damaged_quantity" >= 0
    AND "other_disposition_quantity" >= 0
    AND "received_quantity" = "restockable_quantity" + "damaged_quantity" + "other_disposition_quantity"
  ),
  CONSTRAINT "order_return_request_lines_business_key"
    UNIQUE ("store_id", "order_id", "return_request_id", "order_line_id")
);

CREATE INDEX "order_return_request_lines_line_idx"
  ON "orders"."order_return_request_lines" ("store_id", "order_id", "order_line_id");

CREATE TABLE "orders"."order_exchange_lines" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "return_request_id" uuid NOT NULL,
  "source_order_line_id" uuid NOT NULL,
  "status" "orders"."order_exchange_status" NOT NULL DEFAULT 'REQUESTED',
  "replacement_purchasable_id" text NOT NULL,
  "replacement_title" text NOT NULL,
  "replacement_sku" text,
  "replacement_snapshot" jsonb NOT NULL,
  "quantity" integer NOT NULL,
  "price_difference_amount" bigint NOT NULL DEFAULT 0,
  "replacement_order_line_id" uuid,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_exchange_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_exchange_lines_request_fk"
    FOREIGN KEY ("store_id", "order_id", "return_request_id")
    REFERENCES "orders"."order_return_requests" ("store_id", "order_id", "id"),
  CONSTRAINT "order_exchange_lines_source_line_fk"
    FOREIGN KEY ("store_id", "order_id", "source_order_line_id")
    REFERENCES "orders"."order_lines" ("store_id", "order_id", "id"),
  CONSTRAINT "order_exchange_lines_replacement_line_fk"
    FOREIGN KEY ("store_id", "order_id", "replacement_order_line_id")
    REFERENCES "orders"."order_lines" ("store_id", "order_id", "id"),
  CONSTRAINT "order_exchange_lines_quantity_check" CHECK ("quantity" > 0)
);

CREATE INDEX "order_exchange_lines_request_idx"
  ON "orders"."order_exchange_lines" (
    "store_id", "order_id", "return_request_id", "created_at", "id"
  );

CREATE TRIGGER "order_exchange_lines_touch_updated_at"
BEFORE UPDATE ON "orders"."order_exchange_lines"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

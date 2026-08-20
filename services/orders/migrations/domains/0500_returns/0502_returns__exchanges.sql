-- Up Migration

CREATE TABLE "orders"."order_exchanges" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "return_request_id" uuid NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "status" "orders"."order_exchange_status" NOT NULL DEFAULT 'REQUESTED',
  "currency_code" varchar(3) NOT NULL,
  "inbound_amount" bigint NOT NULL DEFAULT 0,
  "outbound_amount" bigint NOT NULL DEFAULT 0,
  "balance_amount" bigint NOT NULL DEFAULT 0,
  "idempotency_key" text NOT NULL,
  "created_by_type" "orders"."order_actor_type" NOT NULL,
  "created_by_id" uuid,
  "completed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_exchanges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_exchanges_store_order_id_unique" UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_exchanges_return_fk" FOREIGN KEY ("store_id", "order_id", "return_request_id")
    REFERENCES "orders"."order_return_requests" ("store_id", "order_id", "id"),
  CONSTRAINT "order_exchanges_order_currency_fk" FOREIGN KEY ("store_id", "order_id", "currency_code")
    REFERENCES "orders"."orders" ("store_id", "id", "currency_code"),
  CONSTRAINT "order_exchanges_idempotency_unique" UNIQUE ("store_id", "order_id", "idempotency_key"),
  CONSTRAINT "order_exchanges_version_check" CHECK ("version" > 0),
  CONSTRAINT "order_exchanges_balance_check" CHECK ("balance_amount" = "outbound_amount" - "inbound_amount"),
  CONSTRAINT "order_exchanges_actor_check" CHECK ("created_by_type" = 'SYSTEM' OR "created_by_id" IS NOT NULL),
  CONSTRAINT "order_exchanges_terminal_check" CHECK (
    ("status" = 'COMPLETED' AND "completed_at" IS NOT NULL AND "cancelled_at" IS NULL)
    OR ("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL AND "completed_at" IS NULL)
    OR ("status" IN ('REQUESTED', 'OPEN') AND "completed_at" IS NULL AND "cancelled_at" IS NULL)
  )
);

CREATE INDEX "order_exchanges_order_idx"
  ON "orders"."order_exchanges" ("store_id", "order_id", "created_at" DESC, "id" DESC);

CREATE TRIGGER "order_exchanges_touch_updated_at"
BEFORE UPDATE ON "orders"."order_exchanges"
FOR EACH ROW EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_exchange_inbound_lines" (
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "exchange_id" uuid NOT NULL,
  "return_request_line_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  "amount" bigint NOT NULL,
  CONSTRAINT "order_exchange_inbound_lines_pkey" PRIMARY KEY ("store_id", "order_id", "exchange_id", "return_request_line_id"),
  CONSTRAINT "order_exchange_inbound_lines_exchange_fk" FOREIGN KEY ("store_id", "order_id", "exchange_id")
    REFERENCES "orders"."order_exchanges" ("store_id", "order_id", "id"),
  CONSTRAINT "order_exchange_inbound_lines_return_line_fk" FOREIGN KEY ("store_id", "order_id", "return_request_line_id")
    REFERENCES "orders"."order_return_request_lines" ("store_id", "order_id", "id"),
  CONSTRAINT "order_exchange_inbound_lines_values_check" CHECK ("quantity" > 0 AND "amount" >= 0)
);

CREATE TABLE "orders"."order_exchange_outbound_lines" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "exchange_id" uuid NOT NULL,
  "purchasable_id" text NOT NULL,
  "product_id" text,
  "variant_id" text,
  "title" text NOT NULL,
  "sku" text,
  "image_url" text,
  "snapshot" jsonb NOT NULL,
  "quantity" integer NOT NULL,
  "unit_price_amount" bigint NOT NULL,
  "total_amount" bigint NOT NULL,
  "replacement_order_line_id" uuid,
  CONSTRAINT "order_exchange_outbound_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_exchange_outbound_lines_exchange_fk" FOREIGN KEY ("store_id", "order_id", "exchange_id")
    REFERENCES "orders"."order_exchanges" ("store_id", "order_id", "id"),
  CONSTRAINT "order_exchange_outbound_lines_replacement_fk" FOREIGN KEY ("store_id", "order_id", "replacement_order_line_id")
    REFERENCES "orders"."order_lines" ("store_id", "order_id", "id"),
  CONSTRAINT "order_exchange_outbound_lines_values_check" CHECK (
    "quantity" > 0 AND "unit_price_amount" >= 0 AND "total_amount" = "unit_price_amount" * "quantity"
  ),
  CONSTRAINT "order_exchange_outbound_lines_snapshot_check" CHECK (jsonb_typeof("snapshot") = 'object')
);

CREATE INDEX "order_exchange_outbound_lines_exchange_idx"
  ON "orders"."order_exchange_outbound_lines" ("store_id", "order_id", "exchange_id", "id");

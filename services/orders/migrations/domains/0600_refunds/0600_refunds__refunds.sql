-- Up Migration

CREATE TABLE "orders"."order_refunds" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "return_request_id" uuid,
  "currency_code" varchar(3) NOT NULL,
  "status" "orders"."order_refund_status" NOT NULL DEFAULT 'PENDING',
  "destination" "orders"."order_refund_destination" NOT NULL,
  "total_amount" bigint NOT NULL,
  "reason" text,
  "note" text,
  "idempotency_key" text NOT NULL,
  "created_by_type" "orders"."order_actor_type" NOT NULL,
  "created_by_id" uuid,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_refunds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_refunds_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_refunds_order_currency_fk"
    FOREIGN KEY ("store_id", "order_id", "currency_code")
    REFERENCES "orders"."orders" ("store_id", "id", "currency_code"),
  CONSTRAINT "order_refunds_return_request_fk"
    FOREIGN KEY ("store_id", "order_id", "return_request_id")
    REFERENCES "orders"."order_return_requests" ("store_id", "order_id", "id"),
  CONSTRAINT "order_refunds_total_amount_check" CHECK ("total_amount" > 0),
  CONSTRAINT "order_refunds_actor_check" CHECK (
    "created_by_type" = 'SYSTEM' OR "created_by_id" IS NOT NULL
  ),
  CONSTRAINT "order_refunds_processed_at_check" CHECK (
    "processed_at" IS NULL OR "processed_at" >= "created_at"
  ),
  CONSTRAINT "order_refunds_idempotency_key"
    UNIQUE ("store_id", "order_id", "idempotency_key")
);

CREATE INDEX "order_refunds_store_order_created_idx"
  ON "orders"."order_refunds" ("store_id", "order_id", "created_at" DESC, "id" DESC);

CREATE INDEX "order_refunds_store_status_idx"
  ON "orders"."order_refunds" ("store_id", "status", "updated_at" DESC);

CREATE INDEX "order_refunds_return_request_idx"
  ON "orders"."order_refunds" ("store_id", "order_id", "return_request_id")
  WHERE "return_request_id" IS NOT NULL;

CREATE TRIGGER "order_refunds_touch_updated_at"
BEFORE UPDATE ON "orders"."order_refunds"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_refund_lines" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "refund_id" uuid NOT NULL,
  "order_line_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  "subtotal_amount" bigint NOT NULL,
  "tax_amount" bigint NOT NULL DEFAULT 0,
  "duty_amount" bigint NOT NULL DEFAULT 0,
  "total_amount" bigint NOT NULL,
  "restock" boolean NOT NULL DEFAULT false,
  "restock_location_id" uuid,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "order_refund_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_refund_lines_refund_fk"
    FOREIGN KEY ("store_id", "order_id", "refund_id")
    REFERENCES "orders"."order_refunds" ("store_id", "order_id", "id"),
  CONSTRAINT "order_refund_lines_line_fk"
    FOREIGN KEY ("store_id", "order_id", "order_line_id")
    REFERENCES "orders"."order_lines" ("store_id", "order_id", "id"),
  CONSTRAINT "order_refund_lines_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "order_refund_lines_amounts_check" CHECK (
    "subtotal_amount" >= 0
    AND "tax_amount" >= 0
    AND "duty_amount" >= 0
    AND "total_amount" > 0
  ),
  CONSTRAINT "order_refund_lines_total_formula_check" CHECK (
    "total_amount" = "subtotal_amount" + "tax_amount" + "duty_amount"
  ),
  CONSTRAINT "order_refund_lines_restock_check" CHECK (
    "restock" = true OR "restock_location_id" IS NULL
  ),
  CONSTRAINT "order_refund_lines_business_key"
    UNIQUE ("store_id", "order_id", "refund_id", "order_line_id")
);

CREATE INDEX "order_refund_lines_line_idx"
  ON "orders"."order_refund_lines" ("store_id", "order_id", "order_line_id");

CREATE TABLE "orders"."order_refund_adjustments" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "refund_id" uuid NOT NULL,
  "type" "orders"."order_refund_adjustment_type" NOT NULL,
  "amount" bigint NOT NULL,
  "reason" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "order_refund_adjustments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_refund_adjustments_refund_fk"
    FOREIGN KEY ("store_id", "order_id", "refund_id")
    REFERENCES "orders"."order_refunds" ("store_id", "order_id", "id"),
  CONSTRAINT "order_refund_adjustments_amount_check" CHECK (
    ("type" IN ('SHIPPING', 'TAX', 'DUTY', 'FEE') AND "amount" > 0)
    OR ("type" IN ('ROUNDING', 'OTHER') AND "amount" <> 0)
  )
);

CREATE INDEX "order_refund_adjustments_refund_idx"
  ON "orders"."order_refund_adjustments" ("store_id", "order_id", "refund_id");

CREATE TABLE "orders"."order_refund_transaction_allocations" (
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "refund_id" uuid NOT NULL,
  "transaction_id" uuid NOT NULL,
  "amount" bigint NOT NULL,
  CONSTRAINT "order_refund_transaction_allocations_pkey"
    PRIMARY KEY ("store_id", "order_id", "refund_id", "transaction_id"),
  CONSTRAINT "order_refund_transaction_allocations_refund_fk"
    FOREIGN KEY ("store_id", "order_id", "refund_id")
    REFERENCES "orders"."order_refunds" ("store_id", "order_id", "id"),
  CONSTRAINT "order_refund_transaction_allocations_transaction_fk"
    FOREIGN KEY ("store_id", "order_id", "transaction_id")
    REFERENCES "orders"."order_payment_transactions" ("store_id", "order_id", "id"),
  CONSTRAINT "order_refund_transaction_allocations_amount_check" CHECK ("amount" > 0)
);

CREATE INDEX "order_refund_transaction_allocations_transaction_idx"
  ON "orders"."order_refund_transaction_allocations" (
    "store_id", "order_id", "transaction_id"
  );

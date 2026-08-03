-- Up Migration

CREATE TABLE "orders"."order_payment_methods" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "billing_address_id" uuid,
  "code" text NOT NULL,
  "provider" text NOT NULL,
  "title" text,
  "flow" "orders"."order_payment_flow" NOT NULL,
  "is_selected" boolean NOT NULL DEFAULT false,
  "provider_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "customer_input_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_payment_methods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_payment_methods_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_payment_methods_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_payment_methods_billing_address_fk"
    FOREIGN KEY ("store_id", "order_id", "billing_address_id")
    REFERENCES "orders"."order_addresses" ("store_id", "order_id", "id"),
  CONSTRAINT "order_payment_methods_code_provider_check" CHECK (
    btrim("code") <> '' AND btrim("provider") <> ''
  ),
  CONSTRAINT "order_payment_methods_business_key"
    UNIQUE ("store_id", "order_id", "code", "provider")
);

CREATE UNIQUE INDEX "order_payment_methods_one_selected_idx"
  ON "orders"."order_payment_methods" ("store_id", "order_id")
  WHERE "is_selected" = true;

CREATE INDEX "order_payment_methods_store_order_idx"
  ON "orders"."order_payment_methods" ("store_id", "order_id", "id");

CREATE TRIGGER "order_payment_methods_touch_updated_at"
BEFORE UPDATE ON "orders"."order_payment_methods"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_payment_attempts" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "payment_method_id" uuid NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "status" "orders"."order_payment_attempt_status" NOT NULL DEFAULT 'PENDING',
  "requested_amount" bigint NOT NULL,
  "provider_attempt_id" text,
  "idempotency_key" text NOT NULL,
  "customer_action_type" "orders"."order_payment_customer_action_type",
  "customer_action_url" text,
  "customer_action_payload" jsonb,
  "failure_code" text,
  "failure_message" text,
  "expires_at" timestamp with time zone,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_payment_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_payment_attempts_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_payment_attempts_order_currency_fk"
    FOREIGN KEY ("store_id", "order_id", "currency_code")
    REFERENCES "orders"."orders" ("store_id", "id", "currency_code"),
  CONSTRAINT "order_payment_attempts_method_fk"
    FOREIGN KEY ("store_id", "order_id", "payment_method_id")
    REFERENCES "orders"."order_payment_methods" ("store_id", "order_id", "id"),
  CONSTRAINT "order_payment_attempts_requested_amount_check" CHECK ("requested_amount" > 0),
  CONSTRAINT "order_payment_attempts_customer_action_check" CHECK (
    ("customer_action_type" IS NULL AND "customer_action_url" IS NULL AND "customer_action_payload" IS NULL)
    OR "customer_action_type" IS NOT NULL
  ),
  CONSTRAINT "order_payment_attempts_failure_check" CHECK (
    "status" <> 'FAILED' OR "failure_code" IS NOT NULL
  ),
  CONSTRAINT "order_payment_attempts_timestamps_check" CHECK (
    ("expires_at" IS NULL OR "expires_at" >= "created_at")
    AND ("processed_at" IS NULL OR "processed_at" >= "created_at")
  ),
  CONSTRAINT "order_payment_attempts_idempotency_key"
    UNIQUE ("store_id", "order_id", "idempotency_key")
);

CREATE UNIQUE INDEX "order_payment_attempts_provider_key"
  ON "orders"."order_payment_attempts" (
    "store_id", "order_id", "payment_method_id", "provider_attempt_id"
  )
  WHERE "provider_attempt_id" IS NOT NULL;

CREATE INDEX "order_payment_attempts_store_order_created_idx"
  ON "orders"."order_payment_attempts" ("store_id", "order_id", "created_at" DESC, "id" DESC);

CREATE INDEX "order_payment_attempts_pending_expiry_idx"
  ON "orders"."order_payment_attempts" ("expires_at")
  WHERE "status" IN ('REQUIRES_ACTION', 'PENDING') AND "expires_at" IS NOT NULL;

CREATE TRIGGER "order_payment_attempts_touch_updated_at"
BEFORE UPDATE ON "orders"."order_payment_attempts"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

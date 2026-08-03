-- Up Migration

CREATE TABLE "orders"."order_payment_transactions" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "sequence" bigint GENERATED ALWAYS AS IDENTITY,
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "payment_attempt_id" uuid,
  "parent_transaction_id" uuid,
  "currency_code" varchar(3) NOT NULL,
  "kind" "orders"."order_payment_transaction_kind" NOT NULL,
  "status" "orders"."order_payment_transaction_status" NOT NULL DEFAULT 'PENDING',
  "amount" bigint NOT NULL,
  "provider" text NOT NULL,
  "provider_transaction_id" text,
  "authorization_expires_at" timestamp with time zone,
  "settlement_currency_code" varchar(3),
  "settlement_amount" bigint,
  "exchange_rate" numeric(28, 12),
  "failure_code" text,
  "failure_message" text,
  "receipt" jsonb,
  "provider_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_payment_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_payment_transactions_sequence_unique" UNIQUE ("sequence"),
  CONSTRAINT "order_payment_transactions_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_payment_transactions_order_currency_fk"
    FOREIGN KEY ("store_id", "order_id", "currency_code")
    REFERENCES "orders"."orders" ("store_id", "id", "currency_code"),
  CONSTRAINT "order_payment_transactions_attempt_fk"
    FOREIGN KEY ("store_id", "order_id", "payment_attempt_id")
    REFERENCES "orders"."order_payment_attempts" ("store_id", "order_id", "id"),
  CONSTRAINT "order_payment_transactions_parent_fk"
    FOREIGN KEY ("store_id", "order_id", "parent_transaction_id")
    REFERENCES "orders"."order_payment_transactions" ("store_id", "order_id", "id"),
  CONSTRAINT "order_payment_transactions_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "order_payment_transactions_provider_check" CHECK (btrim("provider") <> ''),
  CONSTRAINT "order_payment_transactions_settlement_check" CHECK (
    (
      "settlement_currency_code" IS NULL
      AND "settlement_amount" IS NULL
      AND "exchange_rate" IS NULL
    ) OR (
      "settlement_currency_code" ~ '^[A-Z]{3}$'
      AND "settlement_amount" IS NOT NULL
      AND "settlement_amount" >= 0
      AND "exchange_rate" IS NOT NULL
      AND "exchange_rate" > 0
    )
  ),
  CONSTRAINT "order_payment_transactions_failure_check" CHECK (
    "status" <> 'FAILURE' OR "failure_code" IS NOT NULL
  ),
  CONSTRAINT "order_payment_transactions_processed_at_check" CHECK (
    "processed_at" IS NULL OR "processed_at" >= "created_at"
  )
);

CREATE UNIQUE INDEX "order_payment_transactions_provider_key"
  ON "orders"."order_payment_transactions" (
    "store_id", "provider", "provider_transaction_id"
  )
  WHERE "provider_transaction_id" IS NOT NULL;

CREATE INDEX "order_payment_transactions_store_order_created_idx"
  ON "orders"."order_payment_transactions" ("store_id", "order_id", "created_at", "sequence");

CREATE INDEX "order_payment_transactions_attempt_idx"
  ON "orders"."order_payment_transactions" (
    "store_id", "order_id", "payment_attempt_id", "created_at"
  )
  WHERE "payment_attempt_id" IS NOT NULL;

CREATE INDEX "order_payment_transactions_parent_idx"
  ON "orders"."order_payment_transactions" (
    "store_id", "order_id", "parent_transaction_id"
  )
  WHERE "parent_transaction_id" IS NOT NULL;

CREATE TRIGGER "order_payment_transactions_touch_updated_at"
BEFORE UPDATE ON "orders"."order_payment_transactions"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_payment_transaction_fees" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "transaction_id" uuid NOT NULL,
  "type" varchar(64) NOT NULL,
  "amount" bigint NOT NULL,
  "tax_amount" bigint NOT NULL DEFAULT 0,
  "description" text,
  CONSTRAINT "order_payment_transaction_fees_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_payment_transaction_fees_transaction_fk"
    FOREIGN KEY ("store_id", "order_id", "transaction_id")
    REFERENCES "orders"."order_payment_transactions" ("store_id", "order_id", "id"),
  CONSTRAINT "order_payment_transaction_fees_amount_check" CHECK (
    "amount" >= 0 AND "tax_amount" >= 0
  )
);

CREATE INDEX "order_payment_transaction_fees_transaction_idx"
  ON "orders"."order_payment_transaction_fees" (
    "store_id", "order_id", "transaction_id"
  );

CREATE TABLE "orders"."order_payment_voids" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "authorization_transaction_id" uuid NOT NULL,
  "void_transaction_id" uuid,
  "status" "orders"."order_void_status" NOT NULL DEFAULT 'PENDING',
  "amount" bigint NOT NULL,
  "reason" text,
  "idempotency_key" text NOT NULL,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_payment_voids_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_payment_voids_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_payment_voids_order_currency_fk"
    FOREIGN KEY ("store_id", "order_id", "currency_code")
    REFERENCES "orders"."orders" ("store_id", "id", "currency_code"),
  CONSTRAINT "order_payment_voids_authorization_transaction_fk"
    FOREIGN KEY ("store_id", "order_id", "authorization_transaction_id")
    REFERENCES "orders"."order_payment_transactions" ("store_id", "order_id", "id"),
  CONSTRAINT "order_payment_voids_void_transaction_fk"
    FOREIGN KEY ("store_id", "order_id", "void_transaction_id")
    REFERENCES "orders"."order_payment_transactions" ("store_id", "order_id", "id"),
  CONSTRAINT "order_payment_voids_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "order_payment_voids_idempotency_key"
    UNIQUE ("store_id", "order_id", "idempotency_key")
);

CREATE INDEX "order_payment_voids_authorization_idx"
  ON "orders"."order_payment_voids" (
    "store_id", "order_id", "authorization_transaction_id"
  );

CREATE TRIGGER "order_payment_voids_touch_updated_at"
BEFORE UPDATE ON "orders"."order_payment_voids"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

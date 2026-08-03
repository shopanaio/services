-- Up Migration

CREATE TABLE "orders"."order_risk_assessments" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "level" "orders"."order_risk_level" NOT NULL,
  "recommendation" text,
  "score" numeric(10, 6),
  "facts" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "assessed_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_risk_assessments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_risk_assessments_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_risk_assessments_provider_check" CHECK (btrim("provider") <> ''),
  CONSTRAINT "order_risk_assessments_score_check" CHECK (
    "score" IS NULL OR ("score" >= 0 AND "score" <= 1)
  ),
  CONSTRAINT "order_risk_assessments_facts_check" CHECK (
    jsonb_typeof("facts") = 'array'
  )
);

CREATE INDEX "order_risk_assessments_store_order_idx"
  ON "orders"."order_risk_assessments" (
    "store_id", "order_id", "assessed_at" DESC, "id" DESC
  );

CREATE INDEX "order_risk_assessments_store_level_idx"
  ON "orders"."order_risk_assessments" ("store_id", "level", "assessed_at" DESC);

CREATE TABLE "orders"."order_payment_disputes" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "transaction_id" uuid,
  "currency_code" varchar(3) NOT NULL,
  "provider" text NOT NULL,
  "provider_dispute_id" text NOT NULL,
  "status" "orders"."order_dispute_status" NOT NULL,
  "reason" text,
  "amount" bigint NOT NULL,
  "evidence" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "response_due_at" timestamp with time zone,
  "submitted_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_payment_disputes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_payment_disputes_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_payment_disputes_order_currency_fk"
    FOREIGN KEY ("store_id", "order_id", "currency_code")
    REFERENCES "orders"."orders" ("store_id", "id", "currency_code"),
  CONSTRAINT "order_payment_disputes_transaction_fk"
    FOREIGN KEY ("store_id", "order_id", "transaction_id")
    REFERENCES "orders"."order_payment_transactions" ("store_id", "order_id", "id"),
  CONSTRAINT "order_payment_disputes_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "order_payment_disputes_provider_key"
    UNIQUE ("store_id", "provider", "provider_dispute_id")
);

CREATE INDEX "order_payment_disputes_store_status_idx"
  ON "orders"."order_payment_disputes" ("store_id", "status", "created_at" DESC);

CREATE INDEX "order_payment_disputes_store_order_idx"
  ON "orders"."order_payment_disputes" ("store_id", "order_id", "created_at" DESC);

CREATE TRIGGER "order_payment_disputes_touch_updated_at"
BEFORE UPDATE ON "orders"."order_payment_disputes"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

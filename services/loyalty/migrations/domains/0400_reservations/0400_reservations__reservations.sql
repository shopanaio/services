CREATE TABLE "loyalty"."reservation" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "program_id" uuid NOT NULL,
  "program_version_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "checkout_id" uuid NOT NULL,
  "checkout_version" integer NOT NULL,
  "quote_id" uuid NOT NULL,
  "quote_revision" varchar(64) NOT NULL,
  "points" bigint NOT NULL,
  "discount_amount_minor" bigint NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "status" "loyalty"."reservation_status" NOT NULL DEFAULT 'ACTIVE',
  "idempotency_key" varchar(255) NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "order_id" uuid,
  "order_revision" integer,
  "committed_at" timestamptz,
  "released_at" timestamptz,
  "expired_at" timestamptz,
  "reversed_at" timestamptz,
  "revision" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_reservation_program_fk"
    FOREIGN KEY ("program_id", "store_id")
    REFERENCES "loyalty"."program" ("id", "store_id"),
  CONSTRAINT "loyalty_reservation_program_version_fk"
    FOREIGN KEY ("program_version_id", "program_id", "store_id")
    REFERENCES "loyalty"."program_version" ("id", "program_id", "store_id"),
  CONSTRAINT "loyalty_reservation_account_fk"
    FOREIGN KEY ("account_id", "program_id", "store_id")
    REFERENCES "loyalty"."account" ("id", "program_id", "store_id"),
  CONSTRAINT "loyalty_reservation_id_store_unique"
    UNIQUE ("id", "store_id"),
  CONSTRAINT "loyalty_reservation_store_idempotency_unique"
    UNIQUE ("store_id", "idempotency_key"),
  CONSTRAINT "loyalty_reservation_checkout_version_check" CHECK ("checkout_version" > 0),
  CONSTRAINT "loyalty_reservation_points_check" CHECK ("points" > 0),
  CONSTRAINT "loyalty_reservation_discount_check" CHECK ("discount_amount_minor" > 0),
  CONSTRAINT "loyalty_reservation_currency_check" CHECK ("currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "loyalty_reservation_request_hash_check"
    CHECK ("request_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "loyalty_reservation_quote_revision_check"
    CHECK ("quote_revision" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "loyalty_reservation_expiry_check" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "loyalty_reservation_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "loyalty_reservation_order_pair_check"
    CHECK (("order_id" IS NULL) = ("order_revision" IS NULL)),
  CONSTRAINT "loyalty_reservation_state_check" CHECK (
    ("status" = 'ACTIVE' AND "committed_at" IS NULL AND "released_at" IS NULL
      AND "expired_at" IS NULL AND "reversed_at" IS NULL AND "order_id" IS NULL)
    OR ("status" = 'COMMITTED' AND "committed_at" IS NOT NULL
      AND "order_id" IS NOT NULL AND "released_at" IS NULL
      AND "expired_at" IS NULL AND "reversed_at" IS NULL)
    OR ("status" = 'RELEASED' AND "released_at" IS NOT NULL
      AND "committed_at" IS NULL AND "expired_at" IS NULL
      AND "reversed_at" IS NULL AND "order_id" IS NULL)
    OR ("status" = 'EXPIRED' AND "expired_at" IS NOT NULL
      AND "committed_at" IS NULL AND "released_at" IS NULL
      AND "reversed_at" IS NULL AND "order_id" IS NULL)
    OR ("status" = 'REVERSED' AND "committed_at" IS NOT NULL
      AND "reversed_at" IS NOT NULL AND "order_id" IS NOT NULL
      AND "released_at" IS NULL AND "expired_at" IS NULL)
  )
);

CREATE UNIQUE INDEX "loyalty_reservation_one_active_checkout_idx"
  ON "loyalty"."reservation" ("store_id", "account_id", "checkout_id")
  WHERE "status" = 'ACTIVE';

CREATE INDEX "loyalty_reservation_expiry_idx"
  ON "loyalty"."reservation" ("store_id", "expires_at", "id")
  WHERE "status" = 'ACTIVE';

CREATE INDEX "loyalty_reservation_order_idx"
  ON "loyalty"."reservation" ("store_id", "order_id", "id")
  WHERE "order_id" IS NOT NULL;

CREATE TABLE "loyalty"."reservation_event" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "reservation_id" uuid NOT NULL,
  "event_type" "loyalty"."reservation_event_type" NOT NULL,
  "previous_status" "loyalty"."reservation_status",
  "status" "loyalty"."reservation_status" NOT NULL,
  "transaction_id" uuid NOT NULL,
  "event_id" varchar(128),
  "idempotency_key" varchar(255) NOT NULL,
  "reason_code" varchar(128) NOT NULL,
  "actor_type" "loyalty"."actor_type" NOT NULL,
  "actor_id" text,
  "occurred_at" timestamptz NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_reservation_event_reservation_fk"
    FOREIGN KEY ("reservation_id", "store_id")
    REFERENCES "loyalty"."reservation" ("id", "store_id"),
  CONSTRAINT "loyalty_reservation_event_transaction_fk"
    FOREIGN KEY ("transaction_id", "store_id")
    REFERENCES "loyalty"."transaction" ("id", "store_id"),
  CONSTRAINT "loyalty_reservation_event_idempotency_unique"
    UNIQUE ("reservation_id", "idempotency_key"),
  CONSTRAINT "loyalty_reservation_event_reason_check" CHECK (btrim("reason_code") <> ''),
  CONSTRAINT "loyalty_reservation_event_metadata_check"
    CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE INDEX "loyalty_reservation_event_history_idx"
  ON "loyalty"."reservation_event" ("reservation_id", "occurred_at", "id");

CREATE TRIGGER "loyalty_reservation_event_append_only"
BEFORE UPDATE OR DELETE ON "loyalty"."reservation_event"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."reject_immutable_ledger_mutation"();

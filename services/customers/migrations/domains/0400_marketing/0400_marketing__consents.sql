CREATE TABLE "customers"."customer_consent" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "channel" "customers"."consent_channel" NOT NULL,
  "state" "customers"."consent_state" NOT NULL DEFAULT 'NOT_SUBSCRIBED',
  "opt_in_level" "customers"."consent_opt_in_level" NOT NULL DEFAULT 'UNKNOWN',
  "contact_point" varchar(320) NOT NULL,
  "source" varchar(64) NOT NULL DEFAULT 'unknown',
  "source_location_id" uuid,
  "source_ip" inet,
  "user_agent" text,
  "consented_at" timestamptz,
  "withdrawn_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "customer_consent_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_consent_contact_point_check"
    CHECK (length(btrim("contact_point")) > 0),
  CONSTRAINT "customer_consent_state_timestamps_check"
    CHECK (
      ("state" <> 'SUBSCRIBED' OR ("consented_at" IS NOT NULL AND "withdrawn_at" IS NULL))
      AND
      ("state" <> 'UNSUBSCRIBED' OR "withdrawn_at" IS NOT NULL)
    ),
  CONSTRAINT "customer_consent_withdrawal_order_check"
    CHECK (
      "withdrawn_at" IS NULL
      OR "consented_at" IS NULL
      OR "withdrawn_at" >= "consented_at"
    ),
  CONSTRAINT "customer_consent_customer_channel_unique"
    UNIQUE ("customer_id", "channel")
);

CREATE INDEX "customer_consent_store_state_idx"
  ON "customers"."customer_consent" ("store_id", "channel", "state", "customer_id");

CREATE INDEX "customer_consent_store_customer_channel_idx"
  ON "customers"."customer_consent" ("store_id", "customer_id", "channel");

CREATE INDEX "customer_consent_customer_idx"
  ON "customers"."customer_consent" ("customer_id");

CREATE TABLE "customers"."customer_consent_event" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "consent_id" uuid NOT NULL,
  "channel" "customers"."consent_channel" NOT NULL,
  "previous_state" "customers"."consent_state",
  "new_state" "customers"."consent_state" NOT NULL,
  "opt_in_level" "customers"."consent_opt_in_level" NOT NULL DEFAULT 'UNKNOWN',
  "contact_point" varchar(320) NOT NULL,
  "source" varchar(64) NOT NULL DEFAULT 'unknown',
  "source_location_id" uuid,
  "source_ip" inet,
  "user_agent" text,
  "actor_type" varchar(32) NOT NULL DEFAULT 'system',
  "actor_id" text,
  "request_id" text,
  "idempotency_key" text,
  "evidence" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "occurred_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "customer_consent_event_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_consent_event_consent_fk"
    FOREIGN KEY ("consent_id")
    REFERENCES "customers"."customer_consent" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_consent_event_contact_point_check"
    CHECK (length(btrim("contact_point")) > 0)
);

CREATE UNIQUE INDEX "customer_consent_event_idempotency_unique"
  ON "customers"."customer_consent_event" ("store_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX "customer_consent_event_customer_time_idx"
  ON "customers"."customer_consent_event" ("customer_id", "occurred_at" DESC, "id");

CREATE INDEX "customer_consent_event_store_channel_time_idx"
  ON "customers"."customer_consent_event" ("store_id", "channel", "occurred_at" DESC, "id");

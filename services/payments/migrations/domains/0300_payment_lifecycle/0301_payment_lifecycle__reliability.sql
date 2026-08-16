-- Up Migration
CREATE TYPE "payments"."payment_dispute_state" AS ENUM (
  'NEEDS_RESPONSE', 'UNDER_REVIEW', 'WON', 'LOST', 'ACCEPTED', 'CLOSED'
);

CREATE TABLE "payments"."payment_provider_event" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "provider_account_id" uuid NOT NULL,
  "provider_event_id" text NOT NULL,
  "event_hash" text NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "payment_provider_event_identity_unique"
    UNIQUE ("store_id", "provider_account_id", "provider_event_id"),
  CONSTRAINT "payment_provider_event_account_fk"
    FOREIGN KEY ("store_id", "provider_account_id")
    REFERENCES "payments"."provider_account" ("store_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "payment_provider_event_payload_check"
    CHECK (jsonb_typeof("payload") = 'object')
);

CREATE INDEX "payment_provider_event_account_idx"
  ON "payments"."payment_provider_event"
  ("store_id", "provider_account_id", "occurred_at");

CREATE TABLE "payments"."payment_dispute" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "payment_collection_id" uuid NOT NULL,
  "payment_session_id" uuid NOT NULL,
  "provider_account_id" uuid NOT NULL,
  "provider_dispute_reference" text NOT NULL,
  "provider_reference" text NOT NULL,
  "state" "payments"."payment_dispute_state" NOT NULL,
  "revision" integer NOT NULL,
  "payload" jsonb NOT NULL,
  "opened_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "payment_dispute_provider_identity_unique"
    UNIQUE ("store_id", "provider_account_id", "provider_dispute_reference"),
  CONSTRAINT "payment_dispute_account_fk"
    FOREIGN KEY ("store_id", "provider_account_id")
    REFERENCES "payments"."provider_account" ("store_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "payment_dispute_collection_fk"
    FOREIGN KEY ("store_id", "payment_collection_id")
    REFERENCES "payments"."payment_collection" ("store_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "payment_dispute_session_fk"
    FOREIGN KEY ("store_id", "payment_session_id")
    REFERENCES "payments"."payment_session" ("store_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "payment_dispute_revision_check" CHECK ("revision" >= 0),
  CONSTRAINT "payment_dispute_payload_check" CHECK (jsonb_typeof("payload") = 'object')
);

CREATE INDEX "payment_dispute_session_idx"
  ON "payments"."payment_dispute" ("store_id", "payment_session_id", "updated_at");

ALTER TABLE "payments"."payment_session"
  ADD CONSTRAINT "payment_session_provider_account_fk"
  FOREIGN KEY ("store_id", "provider_account_id")
  REFERENCES "payments"."provider_account" ("store_id", "id") ON DELETE RESTRICT;

CREATE TABLE "payments"."payment_event_outbox" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "organization_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "operation_id" uuid,
  "event_key" text NOT NULL,
  "event_type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "correlation_id" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "emitted_at" timestamptz,
  CONSTRAINT "payment_event_outbox_key_unique" UNIQUE ("event_key"),
  CONSTRAINT "payment_event_outbox_operation_fk"
    FOREIGN KEY ("store_id", "operation_id")
    REFERENCES "payments"."payment_operation" ("store_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "payment_event_outbox_payload_check" CHECK (jsonb_typeof("payload") = 'object')
);

CREATE INDEX "payment_event_outbox_pending_idx"
  ON "payments"."payment_event_outbox" ("store_id", "created_at")
  WHERE "emitted_at" IS NULL;
CREATE INDEX "payment_event_outbox_operation_idx"
  ON "payments"."payment_event_outbox" ("operation_id", "created_at");

-- Up Migration
CREATE TYPE "payments"."payment_collection_state" AS ENUM (
  'OPEN', 'PENDING', 'PARTIALLY_AUTHORIZED', 'AUTHORIZED',
  'PARTIALLY_PAID', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CANCELLED'
);
CREATE TYPE "payments"."payment_session_kind" AS ENUM ('SALE', 'AUTHORIZATION');
CREATE TYPE "payments"."payment_session_state" AS ENUM (
  'CREATED', 'PROCESSING', 'REQUIRES_ACTION', 'REQUIRES_CONFIRMATION',
  'PENDING', 'AUTHORIZED', 'PARTIALLY_CAPTURED', 'CAPTURED', 'VOIDED',
  'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED', 'EXPIRED', 'CANCELLED'
);
CREATE TYPE "payments"."payment_operation_type" AS ENUM (
  'SALE', 'AUTHORIZE', 'CONFIRM', 'CANCEL', 'CAPTURE', 'VOID', 'REFUND', 'RECONCILE'
);
CREATE TYPE "payments"."payment_operation_state" AS ENUM (
  'REQUESTED', 'PROCESSING', 'REQUIRES_ACTION', 'REQUIRES_CONFIRMATION',
  'PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED'
);

CREATE TABLE "payments"."payment_collection" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "organization_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "checkout_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "state" "payments"."payment_collection_state" NOT NULL,
  "revision" integer NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "payment_collection_store_id_unique" UNIQUE ("store_id", "id"),
  CONSTRAINT "payment_collection_order_unique" UNIQUE ("store_id", "order_id"),
  CONSTRAINT "payment_collection_idempotency_unique" UNIQUE ("store_id", "idempotency_key"),
  CONSTRAINT "payment_collection_revision_check" CHECK ("revision" >= 0),
  CONSTRAINT "payment_collection_payload_check" CHECK (jsonb_typeof("payload") = 'object')
);

CREATE TABLE "payments"."payment_session" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "payment_collection_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "checkout_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "attempt_sequence" integer NOT NULL,
  "kind" "payments"."payment_session_kind" NOT NULL,
  "state" "payments"."payment_session_state" NOT NULL,
  "provider_account_id" uuid NOT NULL,
  "method_handle" text NOT NULL,
  "provider_reference" text,
  "revision" integer NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "payment_session_collection_fk"
    FOREIGN KEY ("store_id", "payment_collection_id")
    REFERENCES "payments"."payment_collection" ("store_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "payment_session_store_id_unique" UNIQUE ("store_id", "id"),
  CONSTRAINT "payment_session_attempt_unique" UNIQUE ("payment_collection_id", "attempt_sequence"),
  CONSTRAINT "payment_session_idempotency_unique" UNIQUE ("payment_collection_id", "idempotency_key"),
  CONSTRAINT "payment_session_attempt_check" CHECK ("attempt_sequence" > 0),
  CONSTRAINT "payment_session_revision_check" CHECK ("revision" >= 0),
  CONSTRAINT "payment_session_payload_check" CHECK (jsonb_typeof("payload") = 'object')
);

CREATE TABLE "payments"."payment_operation" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "payment_session_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "type" "payments"."payment_operation_type" NOT NULL,
  "state" "payments"."payment_operation_state" NOT NULL,
  "revision" integer NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "payment_operation_session_fk"
    FOREIGN KEY ("store_id", "payment_session_id")
    REFERENCES "payments"."payment_session" ("store_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "payment_operation_store_id_unique" UNIQUE ("store_id", "id"),
  CONSTRAINT "payment_operation_idempotency_unique" UNIQUE ("payment_session_id", "idempotency_key"),
  CONSTRAINT "payment_operation_revision_check" CHECK ("revision" >= 0),
  CONSTRAINT "payment_operation_payload_check" CHECK (jsonb_typeof("payload") = 'object')
);

CREATE INDEX "payment_collection_checkout_idx"
  ON "payments"."payment_collection" ("store_id", "checkout_id");
CREATE INDEX "payment_session_collection_idx"
  ON "payments"."payment_session" ("store_id", "payment_collection_id", "attempt_sequence");
CREATE UNIQUE INDEX "payment_session_provider_reference_unique"
  ON "payments"."payment_session" ("store_id", "provider_account_id", "provider_reference")
  WHERE "provider_reference" IS NOT NULL;
CREATE INDEX "payment_operation_session_idx"
  ON "payments"."payment_operation" ("store_id", "payment_session_id", "created_at");

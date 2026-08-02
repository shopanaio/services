DROP TABLE "platform"."checkout_selected_payment_methods";
DROP TABLE "platform"."checkout_payment_methods";
DROP TABLE "platform"."checkout_delivery_methods";
DROP TABLE "platform"."checkout_delivery_groups";
DROP TABLE "platform"."checkout_delivery_addresses";
DROP TABLE "platform"."checkout_recipients";
DROP TABLE "platform"."checkout_applied_discounts";
DROP TABLE "platform"."checkout_line_items";
DROP TABLE "platform"."checkout_tags";
DROP TABLE "platform"."checkout_customer_identities";

ALTER TABLE "platform"."checkouts"
  DROP COLUMN "api_key_id",
  DROP COLUMN "admin_id",
  DROP COLUMN "sales_channel",
  ADD COLUMN "version" integer NOT NULL,
  ADD COLUMN "channel_code" text NOT NULL,
  ADD COLUMN "result_revision" text NOT NULL,
  ADD COLUMN "checkout_valid" boolean NOT NULL,
  ADD COLUMN "pipeline_issues" jsonb NOT NULL;

ALTER TABLE "platform"."checkouts"
  ADD CONSTRAINT "checkouts_version_positive_check" CHECK ("version" > 0),
  ADD CONSTRAINT "checkouts_channel_code_not_blank_check"
    CHECK (char_length(btrim("channel_code")) BETWEEN 1 AND 128),
  ADD CONSTRAINT "checkouts_result_revision_not_blank_check"
    CHECK (char_length(btrim("result_revision")) > 0),
  ADD CONSTRAINT "checkouts_store_id_id_unique" UNIQUE ("store_id", "id"),
  ADD CONSTRAINT "checkouts_store_id_id_version_unique" UNIQUE ("store_id", "id", "version");

CREATE TABLE "platform"."checkout_current_snapshots" (
  "checkout_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "checkout_version" integer NOT NULL,
  "snapshot" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "checkout_current_snapshots_version_positive_check" CHECK ("checkout_version" > 0),
  CONSTRAINT "checkout_current_snapshots_checkout_owner_fk"
    FOREIGN KEY ("store_id", "checkout_id")
    REFERENCES "platform"."checkouts"("store_id", "id") ON DELETE CASCADE,
  CONSTRAINT "checkout_current_snapshots_store_checkout_version_unique"
    UNIQUE ("store_id", "checkout_id", "checkout_version")
);

CREATE TABLE "platform"."checkout_create_idempotency" (
  "store_id" uuid NOT NULL,
  "connection_id" uuid NOT NULL,
  "operation" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "checkout_id" uuid NOT NULL,
  "initiating_credential_id" uuid NOT NULL,
  "reserved_ids" jsonb NOT NULL,
  "status" text NOT NULL,
  "lease_token" uuid NOT NULL,
  "lease_expires_at" timestamptz,
  "public_failure" jsonb,
  "committed_checkout_id" uuid,
  "committed_checkout_version" integer,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "checkout_create_idempotency_identity_unique"
    UNIQUE ("store_id", "connection_id", "operation", "idempotency_key"),
  CONSTRAINT "checkout_create_idempotency_operation_check"
    CHECK ("operation" = 'CHECKOUT_CREATE'),
  CONSTRAINT "checkout_create_idempotency_key_length_check"
    CHECK (char_length("idempotency_key") BETWEEN 1 AND 256),
  CONSTRAINT "checkout_create_idempotency_request_hash_check"
    CHECK ("request_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "checkout_create_idempotency_status_check"
    CHECK ("status" IN ('IN_PROGRESS', 'RETRYABLE_FAILED', 'FINAL_FAILED', 'COMMITTED')),
  CONSTRAINT "checkout_create_idempotency_committed_checkout_owner_fk"
    FOREIGN KEY ("store_id", "committed_checkout_id")
    REFERENCES "platform"."checkouts"("store_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "checkout_create_idempotency_commit_shape_check" CHECK (
    ("status" = 'COMMITTED' AND "committed_checkout_id" IS NOT NULL AND "committed_checkout_version" = 1)
    OR
    ("status" <> 'COMMITTED' AND "committed_checkout_id" IS NULL AND "committed_checkout_version" IS NULL)
  )
);

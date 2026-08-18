-- Up Migration

CREATE OR REPLACE FUNCTION "checkout"."strip_customer_input"(value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  stripped jsonb;
BEGIN
  CASE jsonb_typeof(value)
    WHEN 'object' THEN
      SELECT COALESCE(
        jsonb_object_agg(
          entry.key,
          CASE
            WHEN entry.key = 'customerInput' THEN 'null'::jsonb
            ELSE checkout.strip_customer_input(entry.value)
          END
        ),
        '{}'::jsonb
      )
      INTO stripped
      FROM jsonb_each(value) AS entry;
      RETURN stripped;
    WHEN 'array' THEN
      SELECT COALESCE(
        jsonb_agg(checkout.strip_customer_input(entry.value) ORDER BY entry.ordinality),
        '[]'::jsonb
      )
      INTO stripped
      FROM jsonb_array_elements(value) WITH ORDINALITY AS entry(value, ordinality);
      RETURN stripped;
    ELSE
      RETURN value;
  END CASE;
END
$$;

CREATE OR REPLACE FUNCTION "checkout"."strip_snapshot_pii"(value jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT CASE
    WHEN jsonb_typeof(value) = 'object' THEN checkout.strip_customer_input(jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            value, '{draft,buyerIdentity}', 'null'::jsonb, false
          ),
          '{draft,billingAddress}', 'null'::jsonb, false
        ),
        '{draft,customerNote}', 'null'::jsonb, false
      ),
      '{draft,cartIntent,destinations}', '[]'::jsonb, false
    ))
    ELSE checkout.strip_customer_input(value)
  END
$$;

CREATE TABLE "checkout"."checkout_current_snapshots" (
  "checkout_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "checkout_version" integer NOT NULL,
  "snapshot" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "checkout_current_snapshots_version_positive_check" CHECK ("checkout_version" > 0),
  CONSTRAINT "checkout_current_snapshots_checkout_owner_fk"
    FOREIGN KEY ("store_id", "checkout_id")
    REFERENCES "checkout"."checkouts"("store_id", "id") ON DELETE CASCADE,
  CONSTRAINT "checkout_current_snapshots_store_checkout_version_unique"
    UNIQUE ("store_id", "checkout_id", "checkout_version")
);

CREATE TABLE "checkout"."checkout_snapshot_quarantine" (
  "checkout_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "snapshot" jsonb NOT NULL,
  "reason" text NOT NULL,
  "quarantined_at" timestamptz NOT NULL,
  PRIMARY KEY ("store_id", "checkout_id")
);

CREATE TABLE "checkout"."checkout_create_idempotency" (
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
    REFERENCES "checkout"."checkouts"("store_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "checkout_create_idempotency_commit_shape_check" CHECK (
    ("status" = 'COMMITTED' AND "committed_checkout_id" IS NOT NULL AND "committed_checkout_version" = 1)
    OR
    ("status" <> 'COMMITTED' AND "committed_checkout_id" IS NULL AND "committed_checkout_version" IS NULL)
  )
);

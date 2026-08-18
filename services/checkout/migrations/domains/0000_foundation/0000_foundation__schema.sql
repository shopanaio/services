-- Up Migration
CREATE SCHEMA IF NOT EXISTS "checkout";

CREATE TABLE "checkout"."checkouts" (
  "id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "version" integer NOT NULL,
  "channel_code" text NOT NULL,
  "external_source" text,
  "external_id" text,
  "customer_note" text,
  "locale_code" text,
  "currency_code" varchar(3) NOT NULL,
  "subtotal" bigint NOT NULL,
  "shipping_total" bigint NOT NULL,
  "discount_total" bigint NOT NULL,
  "tax_total" bigint NOT NULL,
  "grand_total" bigint NOT NULL,
  "status" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "pii_anonymized_at" timestamptz,
  "retention_until" timestamptz NOT NULL,
  "result_revision" text NOT NULL,
  "checkout_valid" boolean NOT NULL,
  "pipeline_issues" jsonb NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL,
  CONSTRAINT "checkouts_version_positive_check"
    CHECK ("version" > 0),
  CONSTRAINT "checkouts_channel_code_not_blank_check"
    CHECK (char_length(btrim("channel_code")) BETWEEN 1 AND 128),
  CONSTRAINT "checkouts_result_revision_not_blank_check"
    CHECK (char_length(btrim("result_revision")) > 0),
  CONSTRAINT "checkouts_status_check"
    CHECK ("status" IN ('OPEN', 'READY', 'PLACED', 'EXPIRED', 'ABANDONED')),
  CONSTRAINT "checkouts_retention_check"
    CHECK ("retention_until" >= "expires_at"),
  CONSTRAINT "checkouts_store_id_id_unique"
    UNIQUE ("store_id", "id"),
  CONSTRAINT "checkouts_store_id_id_version_unique"
    UNIQUE ("store_id", "id", "version")
);

CREATE INDEX "checkouts_store_updated_at_idx"
  ON "checkout"."checkouts" ("store_id", "updated_at" DESC);

CREATE INDEX "checkouts_expiration_idx"
  ON "checkout"."checkouts" ("expires_at")
  WHERE "status" IN ('OPEN', 'READY');

CREATE INDEX "checkouts_retention_idx"
  ON "checkout"."checkouts" ("retention_until")
  WHERE "pii_anonymized_at" IS NULL;

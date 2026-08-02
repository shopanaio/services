-- Up Migration
CREATE TABLE "payments"."checkout_method_snapshot" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(), "store_id" uuid NOT NULL, "checkout_id" uuid NOT NULL,
  "based_on_checkout_version" integer NOT NULL, "target_checkout_version" integer NOT NULL,
  "final_quote_revision" text NOT NULL, "delivery_revision" text NOT NULL,
  "discovery_revision" text NOT NULL, "customization_revision" text NOT NULL, "payment_revision" text NOT NULL,
  "payload" jsonb NOT NULL, "retain_until" timestamptz NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "checkout_method_snapshot_target_unique" UNIQUE ("store_id", "checkout_id", "target_checkout_version"),
  CONSTRAINT "checkout_method_snapshot_store_id_id_unique" UNIQUE ("store_id", "id"),
  CONSTRAINT "checkout_method_snapshot_version_check" CHECK ("based_on_checkout_version" >= 0 AND "target_checkout_version" = "based_on_checkout_version" + 1),
  CONSTRAINT "checkout_method_snapshot_payload_check" CHECK (jsonb_typeof("payload") = 'object')
);
CREATE INDEX "checkout_method_snapshot_expiry_idx" ON "payments"."checkout_method_snapshot" ("retain_until");

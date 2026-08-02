-- Up Migration
CREATE TABLE "payments"."payment_method_handle" (
  "store_id" uuid NOT NULL, "checkout_id" uuid NOT NULL, "method_handle" text NOT NULL,
  "semantic_revision" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "payment_method_handle_pkey" PRIMARY KEY ("store_id", "checkout_id", "method_handle")
);

CREATE TABLE "payments"."checkout_method_binding" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(), "snapshot_id" uuid NOT NULL, "store_id" uuid NOT NULL, "checkout_id" uuid NOT NULL,
  "based_on_checkout_version" integer NOT NULL, "target_checkout_version" integer NOT NULL, "method_handle" text NOT NULL,
  "method" jsonb NOT NULL, "provider_account_id" uuid NOT NULL, "provider_code" text NOT NULL, "provider_method_key" text NOT NULL,
  "configuration_revision" text NOT NULL, "provider_discovery_revision" text NOT NULL, "discovery_route" jsonb NOT NULL,
  "semantic_revision" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "checkout_method_binding_snapshot_fk" FOREIGN KEY ("store_id", "snapshot_id") REFERENCES "payments"."checkout_method_snapshot" ("store_id", "id") ON DELETE CASCADE,
  CONSTRAINT "checkout_method_binding_handle_fk" FOREIGN KEY ("store_id", "checkout_id", "method_handle") REFERENCES "payments"."payment_method_handle" ("store_id", "checkout_id", "method_handle") ON DELETE RESTRICT,
  CONSTRAINT "checkout_method_binding_provider_account_fk" FOREIGN KEY ("store_id", "provider_account_id") REFERENCES "payments"."provider_account" ("store_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "checkout_method_binding_target_handle_unique" UNIQUE ("store_id", "checkout_id", "target_checkout_version", "method_handle"),
  CONSTRAINT "checkout_method_binding_version_check" CHECK ("target_checkout_version" = "based_on_checkout_version" + 1 AND jsonb_typeof("method") = 'object' AND jsonb_typeof("discovery_route") = 'object')
);
CREATE INDEX "checkout_method_binding_resolve_idx" ON "payments"."checkout_method_binding" ("store_id", "checkout_id", "target_checkout_version", "method_handle");

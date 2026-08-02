-- Up Migration
CREATE TABLE "payments"."provider_account" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(), "organization_id" uuid NOT NULL, "store_id" uuid NOT NULL,
  "installation_id" uuid NOT NULL, "app_code" text NOT NULL, "app_version" text NOT NULL,
  "provider_code" text NOT NULL, "display_name" text NOT NULL,
  "status" "payments"."provider_account_status" NOT NULL,
  "mode" "payments"."provider_mode" NOT NULL, "capture_mode" "payments"."capture_mode" NOT NULL,
  "capabilities" jsonb NOT NULL, "configuration_revision" text NOT NULL,
  "supported_currency_codes" jsonb NOT NULL, "supported_country_codes" jsonb NOT NULL,
  "supported_session_kinds" jsonb NOT NULL, "supported_operations" jsonb NOT NULL,
  "enabled_method_keys" jsonb NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "provider_account_store_installation_unique" UNIQUE ("store_id", "installation_id"),
  CONSTRAINT "provider_account_store_id_id_unique" UNIQUE ("store_id", "id"),
  CONSTRAINT "provider_account_json_check" CHECK (jsonb_typeof("capabilities") = 'object' AND jsonb_typeof("supported_currency_codes") = 'array' AND jsonb_typeof("supported_country_codes") = 'array' AND jsonb_typeof("supported_session_kinds") = 'array' AND jsonb_typeof("supported_operations") = 'array' AND jsonb_typeof("enabled_method_keys") = 'array')
);
CREATE INDEX "provider_account_active_idx" ON "payments"."provider_account" ("store_id", "id") WHERE "status" = 'ACTIVE';

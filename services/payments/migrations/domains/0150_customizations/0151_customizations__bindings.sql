-- Up Migration
CREATE TABLE "payments"."payment_customization_binding" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(), "store_id" uuid NOT NULL, "customization_id" uuid NOT NULL,
  "installation_id" uuid NOT NULL, "function_key" text NOT NULL, "contract_version" integer NOT NULL,
  "precedence" integer NOT NULL, "activation_sequence" bigint NOT NULL,
  "failure_mode" "payments"."customization_failure_mode" NOT NULL,
  "configuration_snapshot" jsonb NOT NULL, "configuration_revision" text NOT NULL, "route_revision" text NOT NULL,
  "status" "payments"."customization_status" NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "payment_customization_binding_owner_fk" FOREIGN KEY ("store_id", "customization_id") REFERENCES "payments"."payment_customization" ("store_id", "id") ON DELETE CASCADE,
  CONSTRAINT "payment_customization_binding_owner_unique" UNIQUE ("customization_id", "id"),
  CONSTRAINT "payment_customization_binding_contract_check" CHECK ("contract_version" = 1 AND jsonb_typeof("configuration_snapshot") = 'object')
);
CREATE INDEX "payment_customization_binding_active_idx" ON "payments"."payment_customization_binding" ("store_id", "precedence", "activation_sequence", "id") WHERE "status" = 'ACTIVE';

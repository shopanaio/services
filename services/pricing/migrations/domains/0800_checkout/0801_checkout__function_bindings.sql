-- Up Migration

CREATE TABLE "pricing"."discount_function_binding" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "target" "pricing"."discount_function_target" NOT NULL,
  "contract_version" integer NOT NULL,
  "installation_id" uuid NOT NULL,
  "function_key" text NOT NULL,
  "precedence" integer NOT NULL,
  "activation_sequence" bigint NOT NULL,
  "status" "pricing"."discount_function_binding_status" NOT NULL,
  "failure_mode" "pricing"."discount_function_failure_mode" NOT NULL,
  "configuration_snapshot" jsonb NOT NULL,
  "configuration_revision" text NOT NULL,
  "route_revision" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "discount_function_binding_store_id_id_unique" UNIQUE ("store_id", "id"),
  CONSTRAINT "discount_function_binding_discount_target_unique" UNIQUE ("discount_id", "target"),
  CONSTRAINT "discount_function_binding_discount_fk" FOREIGN KEY ("discount_id") REFERENCES "pricing"."discount" ("id") ON DELETE CASCADE,
  CONSTRAINT "discount_function_binding_contract_check" CHECK ("contract_version" > 0),
  CONSTRAINT "discount_function_binding_order_check" CHECK ("precedence" >= 0 AND "activation_sequence" >= 0),
  CONSTRAINT "discount_function_binding_configuration_check" CHECK (jsonb_typeof("configuration_snapshot") = 'object'),
  CONSTRAINT "discount_function_binding_revision_check" CHECK (length("configuration_revision") > 0 AND length("route_revision") > 0 AND length("function_key") > 0)
);

CREATE INDEX "discount_function_binding_active_target_idx" ON "pricing"."discount_function_binding" ("store_id", "target", "precedence", "activation_sequence", "id") WHERE "status" = 'ACTIVE';

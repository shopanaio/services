CREATE TABLE "loyalty"."config_mutation" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "operation" varchar(96) NOT NULL,
  "idempotency_key" varchar(255) NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "result_kind" varchar(64),
  "result_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "loyalty_config_mutation_identity_unique"
    UNIQUE ("store_id", "operation", "idempotency_key"),
  CONSTRAINT "loyalty_config_mutation_values_check" CHECK (
    btrim("operation") <> ''
    AND btrim("idempotency_key") <> ''
    AND "request_hash" ~ '^[0-9a-f]{64}$'
    AND (("result_kind" IS NULL) = ("result_id" IS NULL))
  )
);

CREATE INDEX "loyalty_config_mutation_created_idx"
  ON "loyalty"."config_mutation" ("store_id", "created_at" DESC);

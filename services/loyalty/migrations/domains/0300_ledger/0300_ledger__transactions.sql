CREATE TABLE "loyalty"."transaction" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "program_id" uuid NOT NULL,
  "program_version_id" uuid,
  "kind" "loyalty"."transaction_kind" NOT NULL,
  "source" "loyalty"."transaction_source" NOT NULL,
  "source_id" varchar(255),
  "source_revision" varchar(128),
  "idempotency_key" varchar(255) NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "correlation_id" varchar(255),
  "causation_id" varchar(255),
  "event_id" varchar(128),
  "workflow_id" varchar(255),
  "actor_type" "loyalty"."actor_type" NOT NULL,
  "actor_id" uuid,
  "reason_code" varchar(128) NOT NULL,
  "description" varchar(1000),
  "occurred_at" timestamptz NOT NULL,
  "effective_at" timestamptz NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_transaction_account_fk"
    FOREIGN KEY ("account_id") REFERENCES "loyalty"."account" ("id"),
  CONSTRAINT "loyalty_transaction_program_fk"
    FOREIGN KEY ("program_id") REFERENCES "loyalty"."program" ("id"),
  CONSTRAINT "loyalty_transaction_program_version_fk"
    FOREIGN KEY ("program_version_id") REFERENCES "loyalty"."program_version" ("id"),
  CONSTRAINT "loyalty_transaction_store_idempotency_unique"
    UNIQUE ("store_id", "idempotency_key"),
  CONSTRAINT "loyalty_transaction_idempotency_check"
    CHECK (btrim("idempotency_key") <> ''),
  CONSTRAINT "loyalty_transaction_request_hash_check"
    CHECK ("request_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "loyalty_transaction_source_pair_check"
    CHECK (("source_id" IS NULL) = ("source_revision" IS NULL)),
  CONSTRAINT "loyalty_transaction_actor_check" CHECK (
    ("actor_type" IN ('ADMIN_USER', 'CUSTOMER') AND "actor_id" IS NOT NULL)
    OR ("actor_type" IN ('SERVICE', 'SYSTEM'))
  ),
  CONSTRAINT "loyalty_transaction_reason_check" CHECK (btrim("reason_code") <> ''),
  CONSTRAINT "loyalty_transaction_time_check" CHECK ("effective_at" >= "occurred_at"),
  CONSTRAINT "loyalty_transaction_metadata_check"
    CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE UNIQUE INDEX "loyalty_transaction_source_operation_unique_idx"
  ON "loyalty"."transaction"
    ("store_id", "account_id", "source", "source_id", "source_revision", "kind")
  WHERE "source_id" IS NOT NULL;

CREATE INDEX "loyalty_transaction_account_history_idx"
  ON "loyalty"."transaction" ("store_id", "account_id", "occurred_at" DESC, "id" DESC);

CREATE INDEX "loyalty_transaction_source_idx"
  ON "loyalty"."transaction" ("store_id", "source", "source_id", "source_revision");

CREATE TABLE "loyalty"."ledger_entry" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "transaction_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "bucket" "loyalty"."balance_bucket" NOT NULL,
  "points_delta" bigint NOT NULL,
  "sequence" smallint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_ledger_entry_transaction_fk"
    FOREIGN KEY ("transaction_id") REFERENCES "loyalty"."transaction" ("id"),
  CONSTRAINT "loyalty_ledger_entry_account_fk"
    FOREIGN KEY ("account_id") REFERENCES "loyalty"."account" ("id"),
  CONSTRAINT "loyalty_ledger_entry_transaction_sequence_unique"
    UNIQUE ("transaction_id", "sequence"),
  CONSTRAINT "loyalty_ledger_entry_points_check" CHECK ("points_delta" <> 0),
  CONSTRAINT "loyalty_ledger_entry_sequence_check" CHECK ("sequence" > 0)
);

CREATE INDEX "loyalty_ledger_entry_account_bucket_idx"
  ON "loyalty"."ledger_entry" ("store_id", "account_id", "bucket", "created_at" DESC, "id" DESC);

CREATE FUNCTION "loyalty"."reject_immutable_ledger_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Loyalty ledger records are append-only';
END;
$$;

CREATE TRIGGER "loyalty_transaction_append_only"
BEFORE UPDATE OR DELETE ON "loyalty"."transaction"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."reject_immutable_ledger_mutation"();

CREATE TRIGGER "loyalty_ledger_entry_append_only"
BEFORE UPDATE OR DELETE ON "loyalty"."ledger_entry"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."reject_immutable_ledger_mutation"();

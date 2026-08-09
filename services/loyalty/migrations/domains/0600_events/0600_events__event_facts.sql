CREATE TABLE "loyalty"."event_fact" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "producer" varchar(128) NOT NULL,
  "external_event_id" varchar(255) NOT NULL,
  "event_type" varchar(128) NOT NULL,
  "subject_type" varchar(64) NOT NULL,
  "subject_id" varchar(255) NOT NULL,
  "customer_id" uuid,
  "occurred_at" timestamptz NOT NULL,
  "payload_schema_version" integer NOT NULL DEFAULT 1,
  "payload_hash" varchar(64) NOT NULL,
  "payload" jsonb NOT NULL,
  "received_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_event_fact_identity_unique"
    UNIQUE ("store_id", "producer", "external_event_id"),
  CONSTRAINT "loyalty_event_fact_names_check" CHECK (
    btrim("producer") <> ''
    AND btrim("event_type") <> ''
    AND btrim("subject_type") <> ''
    AND btrim("subject_id") <> ''
    AND btrim("external_event_id") <> ''
  ),
  CONSTRAINT "loyalty_event_fact_payload_check" CHECK (
    "payload_schema_version" > 0
    AND "payload_hash" ~ '^[0-9a-f]{64}$'
    AND jsonb_typeof("payload") = 'object'
  )
);

CREATE INDEX "loyalty_event_fact_customer_history_idx"
  ON "loyalty"."event_fact"
    ("store_id", "customer_id", "occurred_at" DESC, "id" DESC)
  WHERE "customer_id" IS NOT NULL;

CREATE INDEX "loyalty_event_fact_type_history_idx"
  ON "loyalty"."event_fact"
    ("store_id", "event_type", "occurred_at" DESC, "id" DESC);

CREATE TABLE "loyalty"."event_evaluation" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "event_fact_id" uuid NOT NULL,
  "earning_rule_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "decision" "loyalty"."loyalty_event_evaluation_decision" NOT NULL,
  "reason_code" varchar(128) NOT NULL,
  "points_awarded" bigint,
  "monetary_amount_minor" bigint,
  "currency_code" varchar(3),
  "transaction_id" uuid,
  "result_schema_version" integer NOT NULL DEFAULT 1,
  "result" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "evaluated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_event_evaluation_fact_fk"
    FOREIGN KEY ("event_fact_id") REFERENCES "loyalty"."event_fact" ("id"),
  CONSTRAINT "loyalty_event_evaluation_rule_fk"
    FOREIGN KEY ("earning_rule_id") REFERENCES "loyalty"."earning_rule" ("id"),
  CONSTRAINT "loyalty_event_evaluation_account_fk"
    FOREIGN KEY ("account_id") REFERENCES "loyalty"."account" ("id"),
  CONSTRAINT "loyalty_event_evaluation_transaction_fk"
    FOREIGN KEY ("transaction_id") REFERENCES "loyalty"."transaction" ("id"),
  CONSTRAINT "loyalty_event_evaluation_once_unique"
    UNIQUE ("event_fact_id", "earning_rule_id", "account_id"),
  CONSTRAINT "loyalty_event_evaluation_reason_check"
    CHECK (btrim("reason_code") <> ''),
  CONSTRAINT "loyalty_event_evaluation_award_check" CHECK (
    ("decision" = 'AWARDED' AND (
      COALESCE("points_awarded", 0) > 0
      OR COALESCE("monetary_amount_minor", 0) > 0
      OR "transaction_id" IS NOT NULL
      OR "result" <> '{}'::jsonb
    ))
    OR ("decision" <> 'AWARDED'
      AND "points_awarded" IS NULL
      AND "monetary_amount_minor" IS NULL
      AND "transaction_id" IS NULL)
  ),
  CONSTRAINT "loyalty_event_evaluation_money_check" CHECK (
    ("monetary_amount_minor" IS NULL) = ("currency_code" IS NULL)
    AND ("monetary_amount_minor" IS NULL OR "monetary_amount_minor" > 0)
    AND ("currency_code" IS NULL OR "currency_code" ~ '^[A-Z]{3}$')
  ),
  CONSTRAINT "loyalty_event_evaluation_result_check" CHECK (
    "result_schema_version" > 0 AND jsonb_typeof("result") = 'object'
  )
);

CREATE INDEX "loyalty_event_evaluation_account_history_idx"
  ON "loyalty"."event_evaluation"
    ("store_id", "account_id", "evaluated_at" DESC, "id" DESC);

CREATE TABLE "loyalty"."earning_rule_usage" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "earning_rule_id" uuid NOT NULL,
  "scope_key" varchar(255) NOT NULL,
  "window_started_at" timestamptz NOT NULL,
  "window_ended_at" timestamptz,
  "occurrence_count" bigint NOT NULL DEFAULT 0,
  "points_awarded" bigint NOT NULL DEFAULT 0,
  "monetary_amounts" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "revision" integer NOT NULL DEFAULT 1,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_earning_rule_usage_rule_fk"
    FOREIGN KEY ("earning_rule_id") REFERENCES "loyalty"."earning_rule" ("id"),
  CONSTRAINT "loyalty_earning_rule_usage_scope_unique"
    UNIQUE ("earning_rule_id", "scope_key", "window_started_at"),
  CONSTRAINT "loyalty_earning_rule_usage_window_check"
    CHECK ("window_ended_at" IS NULL OR "window_ended_at" > "window_started_at"),
  CONSTRAINT "loyalty_earning_rule_usage_values_check" CHECK (
    btrim("scope_key") <> ''
    AND "occurrence_count" >= 0
    AND "points_awarded" >= 0
    AND jsonb_typeof("monetary_amounts") = 'object'
    AND "revision" > 0
  )
);

CREATE INDEX "loyalty_earning_rule_usage_scope_idx"
  ON "loyalty"."earning_rule_usage"
    ("store_id", "scope_key", "window_started_at" DESC, "id" DESC);

CREATE FUNCTION "loyalty"."validate_event_evaluation_context"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  fact_store_id uuid;
  rule_store_id uuid;
  rule_program_id uuid;
  account_store_id uuid;
  account_program_id uuid;
  transaction_account_id uuid;
BEGIN
  SELECT "store_id" INTO fact_store_id
    FROM "loyalty"."event_fact" WHERE "id" = NEW."event_fact_id";

  SELECT rule."store_id", version."program_id"
    INTO rule_store_id, rule_program_id
    FROM "loyalty"."earning_rule" AS rule
    JOIN "loyalty"."program_version" AS version
      ON version."id" = rule."program_version_id"
   WHERE rule."id" = NEW."earning_rule_id";

  SELECT "store_id", "program_id"
    INTO account_store_id, account_program_id
    FROM "loyalty"."account" WHERE "id" = NEW."account_id";

  IF NEW."store_id" IS DISTINCT FROM fact_store_id
    OR NEW."store_id" IS DISTINCT FROM rule_store_id
    OR NEW."store_id" IS DISTINCT FROM account_store_id
    OR rule_program_id IS DISTINCT FROM account_program_id THEN
    RAISE EXCEPTION 'Loyalty event evaluation context crosses store or program boundaries';
  END IF;

  IF NEW."transaction_id" IS NOT NULL THEN
    SELECT "account_id" INTO transaction_account_id
      FROM "loyalty"."transaction" WHERE "id" = NEW."transaction_id";
    IF transaction_account_id IS DISTINCT FROM NEW."account_id" THEN
      RAISE EXCEPTION 'Loyalty event evaluation transaction belongs to another account';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "loyalty_event_evaluation_context_integrity"
BEFORE INSERT ON "loyalty"."event_evaluation"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."validate_event_evaluation_context"();

CREATE TRIGGER "loyalty_event_fact_append_only"
BEFORE UPDATE OR DELETE ON "loyalty"."event_fact"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."reject_immutable_ledger_mutation"();

CREATE TRIGGER "loyalty_event_evaluation_append_only"
BEFORE UPDATE OR DELETE ON "loyalty"."event_evaluation"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."reject_immutable_ledger_mutation"();

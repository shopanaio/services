CREATE TABLE "loyalty"."earning_rule" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "program_version_id" uuid NOT NULL,
  "code" varchar(64) NOT NULL,
  "name" varchar(160) NOT NULL,
  "priority" integer NOT NULL DEFAULT 0,
  "trigger_type" "loyalty"."earning_trigger_type" NOT NULL,
  "trigger_schema_version" integer NOT NULL DEFAULT 1,
  "trigger_config" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "condition_schema_version" integer NOT NULL DEFAULT 1,
  "conditions" jsonb NOT NULL DEFAULT '{"type":"ALL","conditions":[]}'::jsonb,
  "action_type" "loyalty"."earning_action_type" NOT NULL,
  "action_schema_version" integer NOT NULL DEFAULT 1,
  "action" jsonb NOT NULL,
  "limit_schema_version" integer NOT NULL DEFAULT 1,
  "limits" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "stop_processing" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_earning_rule_program_version_fk"
    FOREIGN KEY ("program_version_id")
    REFERENCES "loyalty"."program_version" ("id"),
  CONSTRAINT "loyalty_earning_rule_version_code_unique"
    UNIQUE ("program_version_id", "code"),
  CONSTRAINT "loyalty_earning_rule_code_check"
    CHECK ("code" ~ '^[a-z][a-z0-9_-]{1,63}$'),
  CONSTRAINT "loyalty_earning_rule_name_check" CHECK (btrim("name") <> ''),
  CONSTRAINT "loyalty_earning_rule_priority_check" CHECK ("priority" >= 0),
  CONSTRAINT "loyalty_earning_rule_schema_versions_check" CHECK (
    "trigger_schema_version" > 0
    AND "condition_schema_version" > 0
    AND "action_schema_version" > 0
    AND "limit_schema_version" > 0
  ),
  CONSTRAINT "loyalty_earning_rule_json_check" CHECK (
    jsonb_typeof("trigger_config") = 'object'
    AND jsonb_typeof("conditions") = 'object'
    AND jsonb_typeof("action") = 'object'
    AND jsonb_typeof("limits") = 'object'
  ),
  CONSTRAINT "loyalty_earning_rule_action_check" CHECK (
    ("action_type" = 'AWARD_FIXED_POINTS'
      AND "action"->>'points' ~ '^[1-9][0-9]*$')
    OR ("action_type" = 'AWARD_SPEND_RATIO'
      AND "action"->>'points' ~ '^[1-9][0-9]*$'
      AND "action"->>'amountMinor' ~ '^[1-9][0-9]*$')
    OR ("action_type" = 'AWARD_CASHBACK'
      AND ("action"->>'basisPoints')::integer BETWEEN 1 AND 10000
      AND COALESCE("action"->>'settlement', '') IN ('POINTS', 'MONETARY'))
    OR ("action_type" = 'APPLY_MULTIPLIER'
      AND ("action"->>'multiplierBps')::integer > 0)
    OR ("action_type" = 'ISSUE_REWARD'
      AND btrim(COALESCE("action"->>'rewardDefinitionCode', '')) <> '')
  )
);

CREATE INDEX "loyalty_earning_rule_match_idx"
  ON "loyalty"."earning_rule"
    ("store_id", "program_version_id", "trigger_type", "priority", "id");

CREATE FUNCTION "loyalty"."guard_earning_rule_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_version_status "loyalty"."program_version_status";
  new_version_status "loyalty"."program_version_status";
  new_version_store_id uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT "status" INTO old_version_status
      FROM "loyalty"."program_version"
     WHERE "id" = OLD."program_version_id";

    IF old_version_status <> 'DRAFT' THEN
      RAISE EXCEPTION 'Earning rules of a published loyalty program version are immutable';
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    SELECT "status", "store_id" INTO new_version_status, new_version_store_id
      FROM "loyalty"."program_version"
     WHERE "id" = NEW."program_version_id";

    IF new_version_status <> 'DRAFT' THEN
      RAISE EXCEPTION 'Earning rules may only be attached to draft program versions';
    END IF;

    IF new_version_store_id IS DISTINCT FROM NEW."store_id" THEN
      RAISE EXCEPTION 'Version-scoped loyalty definition must use its program version store';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW."program_version_id" <> OLD."program_version_id" THEN
    RAISE EXCEPTION 'Earning rules cannot be moved between program versions';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "loyalty_earning_rule_version_immutability"
BEFORE INSERT OR UPDATE OR DELETE ON "loyalty"."earning_rule"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."guard_earning_rule_mutation"();

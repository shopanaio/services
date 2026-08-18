CREATE TABLE "loyalty"."tier_policy" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "program_version_id" uuid NOT NULL,
  "window_type" "loyalty"."tier_evaluation_window_type" NOT NULL,
  "rolling_window_days" integer,
  "calendar_period" "loyalty"."tier_calendar_period",
  "program_year_starts_month" smallint,
  "membership_duration_days" integer,
  "grace_period_days" integer NOT NULL DEFAULT 0,
  "downgrade_policy" "loyalty"."tier_downgrade_policy" NOT NULL DEFAULT 'IMMEDIATE',
  "requalification_policy" "loyalty"."tier_requalification_policy"
    NOT NULL DEFAULT 'AUTOMATIC',
  "metric_schema_version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_tier_policy_program_version_fk"
    FOREIGN KEY ("program_version_id")
    REFERENCES "loyalty"."program_version" ("id"),
  CONSTRAINT "loyalty_tier_policy_program_version_unique"
    UNIQUE ("program_version_id"),
  CONSTRAINT "loyalty_tier_policy_window_check" CHECK (
    ("window_type" = 'LIFETIME'
      AND "rolling_window_days" IS NULL
      AND "calendar_period" IS NULL
      AND "program_year_starts_month" IS NULL)
    OR ("window_type" = 'ROLLING'
      AND "rolling_window_days" IS NOT NULL
      AND "rolling_window_days" > 0
      AND "calendar_period" IS NULL
      AND "program_year_starts_month" IS NULL)
    OR ("window_type" = 'CALENDAR'
      AND "rolling_window_days" IS NULL
      AND "calendar_period" IS NOT NULL
      AND (
        ("calendar_period" = 'PROGRAM_YEAR'
          AND "program_year_starts_month" IS NOT NULL
          AND "program_year_starts_month" BETWEEN 1 AND 12)
        OR ("calendar_period" <> 'PROGRAM_YEAR'
          AND "program_year_starts_month" IS NULL)
      ))
  ),
  CONSTRAINT "loyalty_tier_policy_duration_check" CHECK (
    ("membership_duration_days" IS NULL OR "membership_duration_days" > 0)
    AND "grace_period_days" >= 0
    AND ("downgrade_policy" = 'GRACE_PERIOD' OR "grace_period_days" = 0)
  ),
  CONSTRAINT "loyalty_tier_policy_metric_schema_check"
    CHECK ("metric_schema_version" > 0)
);

CREATE TABLE "loyalty"."tier" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "program_version_id" uuid NOT NULL,
  "code" varchar(64) NOT NULL,
  "name" varchar(160) NOT NULL,
  "rank" integer NOT NULL,
  "qualification_schema_version" integer NOT NULL DEFAULT 1,
  "qualification" jsonb NOT NULL,
  "maintenance" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_tier_program_version_fk"
    FOREIGN KEY ("program_version_id", "store_id")
    REFERENCES "loyalty"."program_version" ("id", "store_id"),
  CONSTRAINT "loyalty_tier_id_store_unique" UNIQUE ("id", "store_id"),
  CONSTRAINT "loyalty_tier_version_code_unique"
    UNIQUE ("program_version_id", "code"),
  CONSTRAINT "loyalty_tier_version_rank_unique"
    UNIQUE ("program_version_id", "rank"),
  CONSTRAINT "loyalty_tier_code_check" CHECK ("code" ~ '^[a-z][a-z0-9_-]{1,63}$'),
  CONSTRAINT "loyalty_tier_name_check" CHECK (btrim("name") <> ''),
  CONSTRAINT "loyalty_tier_rank_check" CHECK ("rank" >= 0),
  CONSTRAINT "loyalty_tier_qualification_check" CHECK (
    "qualification_schema_version" > 0
    AND jsonb_typeof("qualification") = 'object'
    AND ("maintenance" IS NULL OR jsonb_typeof("maintenance") = 'object')
  )
);

CREATE TABLE "loyalty"."tier_membership" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "tier_id" uuid NOT NULL,
  "status" "loyalty"."tier_membership_status" NOT NULL DEFAULT 'ACTIVE',
  "evaluation_period_started_at" timestamptz NOT NULL,
  "evaluation_period_ended_at" timestamptz NOT NULL,
  "qualified_at" timestamptz NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  "revision" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_tier_membership_account_fk"
    FOREIGN KEY ("account_id", "store_id")
    REFERENCES "loyalty"."account" ("id", "store_id"),
  CONSTRAINT "loyalty_tier_membership_tier_fk"
    FOREIGN KEY ("tier_id", "store_id")
    REFERENCES "loyalty"."tier" ("id", "store_id"),
  CONSTRAINT "loyalty_tier_membership_id_store_unique"
    UNIQUE ("id", "store_id"),
  CONSTRAINT "loyalty_tier_membership_evaluation_check"
    CHECK ("evaluation_period_ended_at" > "evaluation_period_started_at"),
  CONSTRAINT "loyalty_tier_membership_effective_check"
    CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from"),
  CONSTRAINT "loyalty_tier_membership_status_check" CHECK (
    ("status" = 'ACTIVE' AND ("effective_to" IS NULL OR "effective_to" > "effective_from"))
    OR ("status" <> 'ACTIVE' AND "effective_to" IS NOT NULL)
  ),
  CONSTRAINT "loyalty_tier_membership_revision_check" CHECK ("revision" > 0)
);

CREATE FUNCTION "loyalty"."guard_tier_mutation"()
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
      RAISE EXCEPTION 'Tiers of a published loyalty program version are immutable';
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    SELECT "status", "store_id" INTO new_version_status, new_version_store_id
      FROM "loyalty"."program_version"
     WHERE "id" = NEW."program_version_id";

    IF new_version_status <> 'DRAFT' THEN
      RAISE EXCEPTION 'Tiers may only be attached to draft program versions';
    END IF;

    IF new_version_store_id IS DISTINCT FROM NEW."store_id" THEN
      RAISE EXCEPTION 'Tier definition must use its program version store';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW."program_version_id" <> OLD."program_version_id" THEN
    RAISE EXCEPTION 'Tiers cannot be moved between program versions';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "loyalty_tier_version_immutability"
BEFORE INSERT OR UPDATE OR DELETE ON "loyalty"."tier"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."guard_tier_mutation"();

CREATE TRIGGER "loyalty_tier_policy_version_immutability"
BEFORE INSERT OR UPDATE OR DELETE ON "loyalty"."tier_policy"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."guard_tier_mutation"();

CREATE UNIQUE INDEX "loyalty_tier_membership_one_active_idx"
  ON "loyalty"."tier_membership" ("account_id")
  WHERE "status" = 'ACTIVE';

CREATE INDEX "loyalty_tier_membership_store_tier_idx"
  ON "loyalty"."tier_membership" ("store_id", "tier_id", "status", "effective_from" DESC, "id" DESC);

CREATE TABLE "loyalty"."tier_membership_event" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "membership_id" uuid NOT NULL,
  "previous_tier_id" uuid,
  "tier_id" uuid NOT NULL,
  "event_type" "loyalty"."tier_membership_event_type" NOT NULL,
  "evaluation_revision" varchar(64) NOT NULL,
  "reason_code" varchar(128) NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_tier_membership_event_account_fk"
    FOREIGN KEY ("account_id", "store_id")
    REFERENCES "loyalty"."account" ("id", "store_id"),
  CONSTRAINT "loyalty_tier_membership_event_membership_fk"
    FOREIGN KEY ("membership_id", "store_id")
    REFERENCES "loyalty"."tier_membership" ("id", "store_id"),
  CONSTRAINT "loyalty_tier_membership_event_previous_tier_fk"
    FOREIGN KEY ("previous_tier_id", "store_id")
    REFERENCES "loyalty"."tier" ("id", "store_id"),
  CONSTRAINT "loyalty_tier_membership_event_tier_fk"
    FOREIGN KEY ("tier_id", "store_id")
    REFERENCES "loyalty"."tier" ("id", "store_id"),
  CONSTRAINT "loyalty_tier_membership_event_revision_check"
    CHECK ("evaluation_revision" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "loyalty_tier_membership_event_reason_check" CHECK (btrim("reason_code") <> ''),
  CONSTRAINT "loyalty_tier_membership_event_metadata_check"
    CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE INDEX "loyalty_tier_membership_event_history_idx"
  ON "loyalty"."tier_membership_event" ("account_id", "occurred_at" DESC, "id" DESC);

CREATE TRIGGER "loyalty_tier_membership_event_append_only"
BEFORE UPDATE OR DELETE ON "loyalty"."tier_membership_event"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."reject_immutable_ledger_mutation"();

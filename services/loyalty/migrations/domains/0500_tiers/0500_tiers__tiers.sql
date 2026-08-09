CREATE TABLE "loyalty"."tier" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "program_version_id" uuid NOT NULL,
  "code" varchar(64) NOT NULL,
  "name" varchar(160) NOT NULL,
  "rank" integer NOT NULL,
  "qualification_points" bigint,
  "qualification_spend_minor" bigint,
  "qualification_currency_code" varchar(3),
  "benefits" jsonb NOT NULL DEFAULT '{}'::jsonb,
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
  CONSTRAINT "loyalty_tier_points_check"
    CHECK ("qualification_points" IS NULL OR "qualification_points" >= 0),
  CONSTRAINT "loyalty_tier_spend_pair_check" CHECK (
    ("qualification_spend_minor" IS NULL) = ("qualification_currency_code" IS NULL)
    AND ("qualification_spend_minor" IS NULL OR "qualification_spend_minor" >= 0)
    AND ("qualification_currency_code" IS NULL OR "qualification_currency_code" ~ '^[A-Z]{3}$')
  ),
  CONSTRAINT "loyalty_tier_benefits_check" CHECK (jsonb_typeof("benefits") = 'object')
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
  owning_version_id uuid;
  owning_version_status "loyalty"."program_version_status";
BEGIN
  owning_version_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD."program_version_id"
    ELSE NEW."program_version_id"
  END;

  SELECT "status"
    INTO owning_version_status
    FROM "loyalty"."program_version"
   WHERE "id" = owning_version_id;

  IF owning_version_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Tiers of a published loyalty program version are immutable';
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

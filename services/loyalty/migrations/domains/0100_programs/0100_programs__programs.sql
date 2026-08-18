CREATE TABLE "loyalty"."program" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "code" varchar(64) NOT NULL,
  "name" varchar(160) NOT NULL,
  "status" "loyalty"."program_status" NOT NULL DEFAULT 'DRAFT',
  "is_default" boolean NOT NULL DEFAULT false,
  "default_currency_code" varchar(3) NOT NULL,
  "revision" integer NOT NULL DEFAULT 1,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "archived_at" timestamptz,

  CONSTRAINT "loyalty_program_store_code_unique" UNIQUE ("store_id", "code"),
  CONSTRAINT "loyalty_program_id_store_unique" UNIQUE ("id", "store_id"),
  CONSTRAINT "loyalty_program_code_check"
    CHECK ("code" ~ '^[a-z][a-z0-9_-]{1,63}$'),
  CONSTRAINT "loyalty_program_name_check" CHECK (btrim("name") <> ''),
  CONSTRAINT "loyalty_program_currency_check"
    CHECK ("default_currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "loyalty_program_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "loyalty_program_metadata_check"
    CHECK (jsonb_typeof("metadata") = 'object'),
  CONSTRAINT "loyalty_program_archive_check" CHECK (
    ("status" = 'ARCHIVED' AND "archived_at" IS NOT NULL)
    OR ("status" <> 'ARCHIVED' AND "archived_at" IS NULL)
  )
);

CREATE UNIQUE INDEX "loyalty_program_one_default_per_store_idx"
  ON "loyalty"."program" ("store_id")
  WHERE "is_default" AND "archived_at" IS NULL;

CREATE INDEX "loyalty_program_store_status_idx"
  ON "loyalty"."program" ("store_id", "status", "created_at" DESC, "id" DESC);

CREATE TABLE "loyalty"."program_version" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "program_id" uuid NOT NULL,
  "version" integer NOT NULL,
  "status" "loyalty"."program_version_status" NOT NULL DEFAULT 'DRAFT',
  "revision" integer NOT NULL DEFAULT 1,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "earning_enabled" boolean NOT NULL DEFAULT true,
  "redemption_enabled" boolean NOT NULL DEFAULT true,
  "activation_delay_seconds" integer NOT NULL DEFAULT 0,
  "points_expiry_days" integer,
  "earn_points" bigint NOT NULL,
  "earn_amount_minor" bigint NOT NULL,
  "minimum_eligible_amount_minor" bigint NOT NULL DEFAULT 0,
  "redeem_points" bigint NOT NULL,
  "redeem_amount_minor" bigint NOT NULL,
  "minimum_redeem_points" bigint NOT NULL DEFAULT 1,
  "maximum_redeem_points_per_order" bigint,
  "maximum_order_percentage_bps" integer NOT NULL DEFAULT 10000,
  "rounding_mode" "loyalty"."rounding_mode" NOT NULL DEFAULT 'DOWN',
  "refund_policy" "loyalty"."refund_policy" NOT NULL DEFAULT 'PROPORTIONAL',
  "debt_policy" "loyalty"."debt_policy" NOT NULL DEFAULT 'TRACK_DEBT',
  "restored_points_expiry_policy" "loyalty"."restored_points_expiry_policy"
    NOT NULL DEFAULT 'ORIGINAL_EXPIRY',
  "rules_schema_version" integer NOT NULL DEFAULT 1,
  "rules" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by_id" text,
  "published_by_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "published_at" timestamptz,

  CONSTRAINT "loyalty_program_version_program_fk"
    FOREIGN KEY ("program_id", "store_id")
    REFERENCES "loyalty"."program" ("id", "store_id"),
  CONSTRAINT "loyalty_program_version_number_unique"
    UNIQUE ("program_id", "version"),
  CONSTRAINT "loyalty_program_version_id_store_unique"
    UNIQUE ("id", "store_id"),
  CONSTRAINT "loyalty_program_version_id_program_store_unique"
    UNIQUE ("id", "program_id", "store_id"),
  CONSTRAINT "loyalty_program_version_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "loyalty_program_version_schedule_check" CHECK (
    ("status" = 'DRAFT' OR "effective_from" IS NOT NULL)
    AND (
      "effective_to" IS NULL
      OR ("effective_from" IS NOT NULL AND "effective_to" > "effective_from")
    )
  ),
  CONSTRAINT "loyalty_program_version_published_check" CHECK (
    ("status" = 'DRAFT' AND "published_at" IS NULL AND "published_by_id" IS NULL)
    OR ("status" <> 'DRAFT' AND "published_at" IS NOT NULL)
  ),
  CONSTRAINT "loyalty_program_version_activation_delay_check"
    CHECK ("activation_delay_seconds" >= 0),
  CONSTRAINT "loyalty_program_version_expiry_check"
    CHECK ("points_expiry_days" IS NULL OR "points_expiry_days" > 0),
  CONSTRAINT "loyalty_program_version_earning_ratio_check"
    CHECK ("earn_points" > 0 AND "earn_amount_minor" > 0),
  CONSTRAINT "loyalty_program_version_eligible_amount_check"
    CHECK ("minimum_eligible_amount_minor" >= 0),
  CONSTRAINT "loyalty_program_version_redemption_ratio_check"
    CHECK ("redeem_points" > 0 AND "redeem_amount_minor" > 0),
  CONSTRAINT "loyalty_program_version_redemption_limits_check" CHECK (
    "minimum_redeem_points" > 0
    AND (
      "maximum_redeem_points_per_order" IS NULL
      OR "maximum_redeem_points_per_order" >= "minimum_redeem_points"
    )
    AND "maximum_order_percentage_bps" BETWEEN 0 AND 10000
  ),
  CONSTRAINT "loyalty_program_version_rules_schema_check"
    CHECK ("rules_schema_version" > 0 AND jsonb_typeof("rules") = 'object')
);

CREATE UNIQUE INDEX "loyalty_program_one_active_version_idx"
  ON "loyalty"."program_version" ("program_id")
  WHERE "status" = 'ACTIVE';

CREATE INDEX "loyalty_program_version_effective_idx"
  ON "loyalty"."program_version"
    ("store_id", "program_id", "status", "effective_from" DESC, "version" DESC);

CREATE FUNCTION "loyalty"."guard_published_program_version"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."status" <> 'DRAFT' AND (
    NEW."program_id",
    NEW."store_id",
    NEW."version",
    NEW."effective_from",
    NEW."effective_to",
    NEW."earning_enabled",
    NEW."redemption_enabled",
    NEW."activation_delay_seconds",
    NEW."points_expiry_days",
    NEW."earn_points",
    NEW."earn_amount_minor",
    NEW."minimum_eligible_amount_minor",
    NEW."redeem_points",
    NEW."redeem_amount_minor",
    NEW."minimum_redeem_points",
    NEW."maximum_redeem_points_per_order",
    NEW."maximum_order_percentage_bps",
    NEW."rounding_mode",
    NEW."refund_policy",
    NEW."debt_policy",
    NEW."restored_points_expiry_policy",
    NEW."rules_schema_version",
    NEW."rules",
    NEW."published_by_id",
    NEW."published_at"
  ) IS DISTINCT FROM (
    OLD."program_id",
    OLD."store_id",
    OLD."version",
    OLD."effective_from",
    OLD."effective_to",
    OLD."earning_enabled",
    OLD."redemption_enabled",
    OLD."activation_delay_seconds",
    OLD."points_expiry_days",
    OLD."earn_points",
    OLD."earn_amount_minor",
    OLD."minimum_eligible_amount_minor",
    OLD."redeem_points",
    OLD."redeem_amount_minor",
    OLD."minimum_redeem_points",
    OLD."maximum_redeem_points_per_order",
    OLD."maximum_order_percentage_bps",
    OLD."rounding_mode",
    OLD."refund_policy",
    OLD."debt_policy",
    OLD."restored_points_expiry_policy",
    OLD."rules_schema_version",
    OLD."rules",
    OLD."published_by_id",
    OLD."published_at"
  ) THEN
    RAISE EXCEPTION 'Published loyalty program versions are immutable';
  END IF;

  IF OLD."status" = 'SCHEDULED' AND NEW."status" NOT IN ('SCHEDULED', 'ACTIVE', 'RETIRED') THEN
    RAISE EXCEPTION 'Invalid scheduled loyalty program version transition';
  ELSIF OLD."status" = 'ACTIVE' AND NEW."status" NOT IN ('ACTIVE', 'RETIRED') THEN
    RAISE EXCEPTION 'Invalid active loyalty program version transition';
  ELSIF OLD."status" = 'RETIRED' AND NEW."status" <> 'RETIRED' THEN
    RAISE EXCEPTION 'Retired loyalty program versions cannot be reactivated';
  END IF;

  IF OLD."status" = 'DRAFT' AND NEW."status" <> 'DRAFT' THEN
    IF EXISTS (
      SELECT 1 FROM "loyalty"."tier"
       WHERE "program_version_id" = NEW."id"
    ) AND NOT EXISTS (
      SELECT 1 FROM "loyalty"."tier_policy"
       WHERE "program_version_id" = NEW."id"
    ) THEN
      RAISE EXCEPTION 'A loyalty program version with tiers requires a tier policy';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM "loyalty"."earning_rule" AS rule
       WHERE rule."program_version_id" = NEW."id"
         AND rule."action_type" = 'ISSUE_REWARD'
         AND NOT EXISTS (
           SELECT 1
             FROM "loyalty"."reward_definition" AS reward
            WHERE reward."program_version_id" = NEW."id"
              AND reward."code" = rule."action"->>'rewardDefinitionCode'
         )
    ) THEN
      RAISE EXCEPTION 'Every ISSUE_REWARD action must reference a reward definition in the same version';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "loyalty_program_version_immutability"
BEFORE UPDATE ON "loyalty"."program_version"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."guard_published_program_version"();

CREATE FUNCTION "loyalty"."guard_program_version_delete"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."status" <> 'DRAFT' THEN
    RAISE EXCEPTION 'Only draft loyalty program versions may be deleted';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER "loyalty_program_version_delete_guard"
BEFORE DELETE ON "loyalty"."program_version"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."guard_program_version_delete"();

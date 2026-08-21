CREATE TABLE "loyalty"."reward_definition" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "program_version_id" uuid NOT NULL,
  "code" varchar(64) NOT NULL,
  "name" varchar(160) NOT NULL,
  "reward_type" "loyalty"."reward_type" NOT NULL,
  "configuration_schema_version" integer NOT NULL DEFAULT 1,
  "configuration" jsonb NOT NULL,
  "validity_days" integer,
  "starts_at" timestamptz,
  "ends_at" timestamptz,
  "issuance_limit" bigint,
  "per_account_limit" bigint,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_reward_definition_program_version_fk"
    FOREIGN KEY ("program_version_id")
    REFERENCES "loyalty"."program_version" ("id"),
  CONSTRAINT "loyalty_reward_definition_version_code_unique"
    UNIQUE ("program_version_id", "code"),
  CONSTRAINT "loyalty_reward_definition_code_check"
    CHECK ("code" ~ '^[a-z][a-z0-9_-]{1,63}$'),
  CONSTRAINT "loyalty_reward_definition_name_check" CHECK (btrim("name") <> ''),
  CONSTRAINT "loyalty_reward_definition_configuration_check" CHECK (
    "configuration_schema_version" > 0
    AND jsonb_typeof("configuration") = 'object'
  ),
  CONSTRAINT "loyalty_reward_definition_validity_check" CHECK (
    ("validity_days" IS NULL OR "validity_days" > 0)
    AND ("ends_at" IS NULL OR ("starts_at" IS NOT NULL AND "ends_at" > "starts_at"))
  ),
  CONSTRAINT "loyalty_reward_definition_limits_check" CHECK (
    ("issuance_limit" IS NULL OR "issuance_limit" > 0)
    AND ("per_account_limit" IS NULL OR "per_account_limit" > 0)
    AND ("issuance_limit" IS NULL OR "per_account_limit" IS NULL
      OR "per_account_limit" <= "issuance_limit")
  )
);

CREATE INDEX "loyalty_reward_definition_type_idx"
  ON "loyalty"."reward_definition"
    ("store_id", "program_version_id", "reward_type", "code", "id");

CREATE TRIGGER "loyalty_reward_definition_version_immutability"
BEFORE INSERT OR UPDATE OR DELETE ON "loyalty"."reward_definition"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."guard_earning_rule_mutation"();

CREATE TABLE "loyalty"."reward_entitlement" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "reward_definition_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "source_event_fact_id" uuid,
  "issuance_transaction_id" uuid,
  "monetary_transaction_id" uuid,
  "status" "loyalty"."reward_entitlement_status" NOT NULL DEFAULT 'ISSUED',
  "idempotency_key" varchar(255) NOT NULL,
  "configuration_schema_version" integer NOT NULL DEFAULT 1,
  "configuration_snapshot" jsonb NOT NULL,
  "quantity" bigint NOT NULL DEFAULT 1,
  "valid_from" timestamptz NOT NULL DEFAULT now(),
  "valid_to" timestamptz,
  "reserved_for_checkout_id" uuid,
  "redeemed_order_id" uuid,
  "external_reference" varchar(255),
  "issued_at" timestamptz NOT NULL DEFAULT now(),
  "reserved_at" timestamptz,
  "redeemed_at" timestamptz,
  "expired_at" timestamptz,
  "revoked_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_reward_entitlement_definition_fk"
    FOREIGN KEY ("reward_definition_id")
    REFERENCES "loyalty"."reward_definition" ("id"),
  CONSTRAINT "loyalty_reward_entitlement_account_fk"
    FOREIGN KEY ("account_id") REFERENCES "loyalty"."account" ("id"),
  CONSTRAINT "loyalty_reward_entitlement_source_event_fk"
    FOREIGN KEY ("source_event_fact_id") REFERENCES "loyalty"."event_fact" ("id"),
  CONSTRAINT "loyalty_reward_entitlement_points_transaction_fk"
    FOREIGN KEY ("issuance_transaction_id") REFERENCES "loyalty"."transaction" ("id"),
  CONSTRAINT "loyalty_reward_entitlement_monetary_transaction_fk"
    FOREIGN KEY ("monetary_transaction_id")
    REFERENCES "loyalty"."monetary_transaction" ("id"),
  CONSTRAINT "loyalty_reward_entitlement_idempotency_unique"
    UNIQUE ("account_id", "reward_definition_id", "idempotency_key"),
  CONSTRAINT "loyalty_reward_entitlement_idempotency_check"
    CHECK (btrim("idempotency_key") <> ''),
  CONSTRAINT "loyalty_reward_entitlement_configuration_check" CHECK (
    "configuration_schema_version" > 0
    AND jsonb_typeof("configuration_snapshot") = 'object'
  ),
  CONSTRAINT "loyalty_reward_entitlement_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "loyalty_reward_entitlement_validity_check"
    CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from"),
  CONSTRAINT "loyalty_reward_entitlement_state_check" CHECK (
    ("status" = 'ISSUED' AND "reserved_at" IS NULL AND "redeemed_at" IS NULL
      AND "expired_at" IS NULL AND "revoked_at" IS NULL
      AND "reserved_for_checkout_id" IS NULL AND "redeemed_order_id" IS NULL)
    OR ("status" = 'RESERVED' AND "reserved_at" IS NOT NULL
      AND "reserved_for_checkout_id" IS NOT NULL AND "redeemed_at" IS NULL
      AND "expired_at" IS NULL AND "revoked_at" IS NULL
      AND "redeemed_order_id" IS NULL)
    OR ("status" = 'REDEEMED' AND "redeemed_at" IS NOT NULL
      AND "redeemed_order_id" IS NOT NULL AND "expired_at" IS NULL
      AND "revoked_at" IS NULL)
    OR ("status" = 'EXPIRED' AND "expired_at" IS NOT NULL
      AND "redeemed_at" IS NULL AND "revoked_at" IS NULL
      AND "redeemed_order_id" IS NULL)
    OR ("status" = 'REVOKED' AND "revoked_at" IS NOT NULL
      AND "redeemed_at" IS NULL AND "expired_at" IS NULL
      AND "redeemed_order_id" IS NULL)
  )
);

CREATE INDEX "loyalty_reward_entitlement_account_status_idx"
  ON "loyalty"."reward_entitlement"
    ("store_id", "account_id", "status", "valid_to", "id");

CREATE FUNCTION "loyalty"."validate_reward_entitlement_context"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  definition_store_id uuid;
  definition_program_id uuid;
  account_store_id uuid;
  account_program_id uuid;
  fact_store_id uuid;
  point_transaction_account_id uuid;
  monetary_transaction_account_id uuid;
BEGIN
  SELECT definition."store_id", version."program_id"
    INTO definition_store_id, definition_program_id
    FROM "loyalty"."reward_definition" AS definition
    JOIN "loyalty"."program_version" AS version
      ON version."id" = definition."program_version_id"
   WHERE definition."id" = NEW."reward_definition_id";

  SELECT "store_id", "program_id" INTO account_store_id, account_program_id
    FROM "loyalty"."account" WHERE "id" = NEW."account_id";

  IF NEW."store_id" IS DISTINCT FROM definition_store_id
    OR NEW."store_id" IS DISTINCT FROM account_store_id
    OR definition_program_id IS DISTINCT FROM account_program_id THEN
    RAISE EXCEPTION 'Reward entitlement crosses store or program boundaries';
  END IF;

  IF NEW."source_event_fact_id" IS NOT NULL THEN
    SELECT "store_id" INTO fact_store_id
      FROM "loyalty"."event_fact" WHERE "id" = NEW."source_event_fact_id";
    IF fact_store_id IS DISTINCT FROM NEW."store_id" THEN
      RAISE EXCEPTION 'Reward entitlement source event belongs to another store';
    END IF;
  END IF;

  IF NEW."issuance_transaction_id" IS NOT NULL THEN
    SELECT "account_id" INTO point_transaction_account_id
      FROM "loyalty"."transaction" WHERE "id" = NEW."issuance_transaction_id";
    IF point_transaction_account_id IS DISTINCT FROM NEW."account_id" THEN
      RAISE EXCEPTION 'Reward entitlement points transaction belongs to another account';
    END IF;
  END IF;

  IF NEW."monetary_transaction_id" IS NOT NULL THEN
    SELECT wallet."account_id" INTO monetary_transaction_account_id
      FROM "loyalty"."monetary_transaction" AS monetary_tx
      JOIN "loyalty"."monetary_wallet" AS wallet ON wallet."id" = monetary_tx."wallet_id"
     WHERE monetary_tx."id" = NEW."monetary_transaction_id";
    IF monetary_transaction_account_id IS DISTINCT FROM NEW."account_id" THEN
      RAISE EXCEPTION 'Reward entitlement monetary transaction belongs to another account';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "loyalty_reward_entitlement_context_integrity"
BEFORE INSERT OR UPDATE ON "loyalty"."reward_entitlement"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."validate_reward_entitlement_context"();

CREATE FUNCTION "loyalty"."guard_reward_entitlement_identity"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    NEW."id",
    NEW."store_id",
    NEW."reward_definition_id",
    NEW."account_id",
    NEW."source_event_fact_id",
    NEW."issuance_transaction_id",
    NEW."monetary_transaction_id",
    NEW."idempotency_key",
    NEW."configuration_schema_version",
    NEW."configuration_snapshot",
    NEW."quantity",
    NEW."valid_from",
    NEW."valid_to",
    NEW."issued_at"
  ) IS DISTINCT FROM (
    OLD."id",
    OLD."store_id",
    OLD."reward_definition_id",
    OLD."account_id",
    OLD."source_event_fact_id",
    OLD."issuance_transaction_id",
    OLD."monetary_transaction_id",
    OLD."idempotency_key",
    OLD."configuration_schema_version",
    OLD."configuration_snapshot",
    OLD."quantity",
    OLD."valid_from",
    OLD."valid_to",
    OLD."issued_at"
  ) THEN
    RAISE EXCEPTION 'Issued reward entitlement identity and snapshot are immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "loyalty_reward_entitlement_identity_immutability"
BEFORE UPDATE ON "loyalty"."reward_entitlement"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."guard_reward_entitlement_identity"();

CREATE TABLE "loyalty"."reward_entitlement_event" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "entitlement_id" uuid NOT NULL,
  "event_type" "loyalty"."reward_entitlement_event_type" NOT NULL,
  "previous_status" "loyalty"."reward_entitlement_status",
  "status" "loyalty"."reward_entitlement_status" NOT NULL,
  "idempotency_key" varchar(255) NOT NULL,
  "actor_type" "loyalty"."actor_type" NOT NULL,
  "actor_id" text,
  "reason_code" varchar(128) NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_reward_entitlement_event_entitlement_fk"
    FOREIGN KEY ("entitlement_id") REFERENCES "loyalty"."reward_entitlement" ("id"),
  CONSTRAINT "loyalty_reward_entitlement_event_idempotency_unique"
    UNIQUE ("entitlement_id", "idempotency_key"),
  CONSTRAINT "loyalty_reward_entitlement_event_names_check" CHECK (
    btrim("idempotency_key") <> '' AND btrim("reason_code") <> ''
  ),
  CONSTRAINT "loyalty_reward_entitlement_event_actor_check" CHECK (
    ("actor_type" IN ('ADMIN_USER', 'CUSTOMER') AND "actor_id" IS NOT NULL)
    OR ("actor_type" IN ('SERVICE', 'SYSTEM') AND "actor_id" IS NULL)
  ),
  CONSTRAINT "loyalty_reward_entitlement_event_metadata_check"
    CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE INDEX "loyalty_reward_entitlement_event_history_idx"
  ON "loyalty"."reward_entitlement_event"
    ("entitlement_id", "occurred_at", "id");

CREATE TABLE "loyalty"."tier_reward_benefit" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "tier_id" uuid NOT NULL,
  "reward_definition_id" uuid NOT NULL,
  "grant_policy_schema_version" integer NOT NULL DEFAULT 1,
  "grant_policy" jsonb NOT NULL DEFAULT '{"type":"ON_QUALIFICATION"}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_tier_reward_benefit_tier_fk"
    FOREIGN KEY ("tier_id") REFERENCES "loyalty"."tier" ("id"),
  CONSTRAINT "loyalty_tier_reward_benefit_definition_fk"
    FOREIGN KEY ("reward_definition_id")
    REFERENCES "loyalty"."reward_definition" ("id"),
  CONSTRAINT "loyalty_tier_reward_benefit_unique"
    UNIQUE ("tier_id", "reward_definition_id"),
  CONSTRAINT "loyalty_tier_reward_benefit_policy_check" CHECK (
    "grant_policy_schema_version" > 0 AND jsonb_typeof("grant_policy") = 'object'
  )
);

CREATE FUNCTION "loyalty"."guard_tier_reward_benefit_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_tier_version_id uuid;
  old_version_status "loyalty"."program_version_status";
  new_tier_version_id uuid;
  new_reward_version_id uuid;
  new_version_status "loyalty"."program_version_status";
  new_version_store_id uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT tier."program_version_id", version."status"
      INTO old_tier_version_id, old_version_status
      FROM "loyalty"."tier" AS tier
      JOIN "loyalty"."program_version" AS version
        ON version."id" = tier."program_version_id"
     WHERE tier."id" = OLD."tier_id";

    IF old_version_status <> 'DRAFT' THEN
      RAISE EXCEPTION 'Tier rewards of a published program version are immutable';
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    SELECT "program_version_id" INTO new_tier_version_id
      FROM "loyalty"."tier" WHERE "id" = NEW."tier_id";
    SELECT "program_version_id" INTO new_reward_version_id
      FROM "loyalty"."reward_definition" WHERE "id" = NEW."reward_definition_id";
    SELECT "status", "store_id" INTO new_version_status, new_version_store_id
      FROM "loyalty"."program_version" WHERE "id" = new_tier_version_id;

    IF new_tier_version_id IS DISTINCT FROM new_reward_version_id THEN
      RAISE EXCEPTION 'Tier and reward benefit must belong to the same program version';
    END IF;
    IF new_version_status <> 'DRAFT' THEN
      RAISE EXCEPTION 'Tier rewards may only be attached to draft program versions';
    END IF;
    IF NEW."store_id" IS DISTINCT FROM new_version_store_id THEN
      RAISE EXCEPTION 'Tier reward benefit must use its program version store';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "loyalty_tier_reward_benefit_version_immutability"
BEFORE INSERT OR UPDATE OR DELETE ON "loyalty"."tier_reward_benefit"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."guard_tier_reward_benefit_mutation"();

CREATE TRIGGER "loyalty_reward_entitlement_event_append_only"
BEFORE UPDATE OR DELETE ON "loyalty"."reward_entitlement_event"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."reject_immutable_ledger_mutation"();

CREATE TABLE "loyalty"."monetary_wallet" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "program_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "wallet_type" "loyalty"."monetary_wallet_type" NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "status" "loyalty"."monetary_wallet_status" NOT NULL DEFAULT 'ACTIVE',
  "merged_into_wallet_id" uuid,
  "opened_at" timestamptz NOT NULL DEFAULT now(),
  "closed_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_monetary_wallet_program_fk"
    FOREIGN KEY ("program_id") REFERENCES "loyalty"."program" ("id"),
  CONSTRAINT "loyalty_monetary_wallet_account_fk"
    FOREIGN KEY ("account_id") REFERENCES "loyalty"."account" ("id"),
  CONSTRAINT "loyalty_monetary_wallet_merged_into_fk"
    FOREIGN KEY ("merged_into_wallet_id") REFERENCES "loyalty"."monetary_wallet" ("id"),
  CONSTRAINT "loyalty_monetary_wallet_identity_unique"
    UNIQUE ("account_id", "wallet_type", "currency_code"),
  CONSTRAINT "loyalty_monetary_wallet_id_program_unique"
    UNIQUE ("id", "program_id"),
  CONSTRAINT "loyalty_monetary_wallet_currency_check"
    CHECK ("currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "loyalty_monetary_wallet_merge_check" CHECK (
    ("status" = 'MERGED' AND "merged_into_wallet_id" IS NOT NULL
      AND "merged_into_wallet_id" <> "id" AND "closed_at" IS NOT NULL)
    OR ("status" = 'CLOSED' AND "merged_into_wallet_id" IS NULL
      AND "closed_at" IS NOT NULL)
    OR ("status" IN ('ACTIVE', 'SUSPENDED')
      AND "merged_into_wallet_id" IS NULL AND "closed_at" IS NULL)
  )
);

CREATE INDEX "loyalty_monetary_wallet_account_idx"
  ON "loyalty"."monetary_wallet"
    ("store_id", "account_id", "status", "currency_code", "id");

CREATE FUNCTION "loyalty"."validate_monetary_wallet_context"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  account_store_id uuid;
  account_program_id uuid;
  target_store_id uuid;
  target_program_id uuid;
  target_type "loyalty"."monetary_wallet_type";
  target_currency_code varchar(3);
BEGIN
  SELECT "store_id", "program_id" INTO account_store_id, account_program_id
    FROM "loyalty"."account" WHERE "id" = NEW."account_id";

  IF NEW."store_id" IS DISTINCT FROM account_store_id
    OR NEW."program_id" IS DISTINCT FROM account_program_id THEN
    RAISE EXCEPTION 'Monetary wallet must use its loyalty account store and program';
  END IF;

  IF NEW."merged_into_wallet_id" IS NOT NULL THEN
    SELECT "store_id", "program_id", "wallet_type", "currency_code"
      INTO target_store_id, target_program_id, target_type, target_currency_code
      FROM "loyalty"."monetary_wallet"
     WHERE "id" = NEW."merged_into_wallet_id";

    IF (target_store_id, target_program_id, target_type, target_currency_code)
      IS DISTINCT FROM
      (NEW."store_id", NEW."program_id", NEW."wallet_type", NEW."currency_code") THEN
      RAISE EXCEPTION 'Merged monetary wallets must share store, program, type, and currency';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "loyalty_monetary_wallet_context_integrity"
BEFORE INSERT OR UPDATE ON "loyalty"."monetary_wallet"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."validate_monetary_wallet_context"();

CREATE TABLE "loyalty"."monetary_transaction" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "wallet_id" uuid NOT NULL,
  "program_id" uuid NOT NULL,
  "program_version_id" uuid,
  "kind" "loyalty"."monetary_transaction_kind" NOT NULL,
  "source_type" varchar(128) NOT NULL,
  "source_id" varchar(255),
  "source_revision" varchar(128),
  "idempotency_key" varchar(255) NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "actor_type" "loyalty"."actor_type" NOT NULL,
  "actor_id" text,
  "reason_code" varchar(128) NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "effective_at" timestamptz NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "entries_finalized" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_monetary_transaction_wallet_fk"
    FOREIGN KEY ("wallet_id", "program_id")
    REFERENCES "loyalty"."monetary_wallet" ("id", "program_id"),
  CONSTRAINT "loyalty_monetary_transaction_program_version_fk"
    FOREIGN KEY ("program_version_id")
    REFERENCES "loyalty"."program_version" ("id"),
  CONSTRAINT "loyalty_monetary_transaction_id_wallet_unique"
    UNIQUE ("id", "wallet_id"),
  CONSTRAINT "loyalty_monetary_transaction_idempotency_unique"
    UNIQUE ("wallet_id", "idempotency_key"),
  CONSTRAINT "loyalty_monetary_transaction_names_check" CHECK (
    btrim("source_type") <> ''
    AND btrim("idempotency_key") <> ''
    AND btrim("reason_code") <> ''
  ),
  CONSTRAINT "loyalty_monetary_transaction_source_pair_check"
    CHECK (("source_id" IS NULL) = ("source_revision" IS NULL)),
  CONSTRAINT "loyalty_monetary_transaction_request_hash_check"
    CHECK ("request_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "loyalty_monetary_transaction_actor_check" CHECK (
    ("actor_type" IN ('ADMIN_USER', 'CUSTOMER') AND "actor_id" IS NOT NULL)
    OR ("actor_type" IN ('SERVICE', 'SYSTEM') AND "actor_id" IS NULL)
  ),
  CONSTRAINT "loyalty_monetary_transaction_time_check"
    CHECK ("effective_at" >= "occurred_at"),
  CONSTRAINT "loyalty_monetary_transaction_metadata_check"
    CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE INDEX "loyalty_monetary_transaction_wallet_history_idx"
  ON "loyalty"."monetary_transaction"
    ("store_id", "wallet_id", "occurred_at" DESC, "id" DESC);

CREATE UNIQUE INDEX "loyalty_monetary_transaction_source_operation_unique_idx"
  ON "loyalty"."monetary_transaction"
    ("wallet_id", "source_type", "source_id", "source_revision", "kind")
  WHERE "source_id" IS NOT NULL;

CREATE FUNCTION "loyalty"."validate_monetary_transaction_context"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  wallet_store_id uuid;
  wallet_program_id uuid;
  version_program_id uuid;
BEGIN
  SELECT "store_id", "program_id" INTO wallet_store_id, wallet_program_id
    FROM "loyalty"."monetary_wallet" WHERE "id" = NEW."wallet_id";

  IF NEW."store_id" IS DISTINCT FROM wallet_store_id
    OR NEW."program_id" IS DISTINCT FROM wallet_program_id THEN
    RAISE EXCEPTION 'Monetary transaction must use its wallet store and program';
  END IF;

  IF NEW."program_version_id" IS NOT NULL THEN
    SELECT "program_id" INTO version_program_id
      FROM "loyalty"."program_version" WHERE "id" = NEW."program_version_id";
    IF version_program_id IS DISTINCT FROM NEW."program_id" THEN
      RAISE EXCEPTION 'Monetary transaction program version belongs to another program';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "loyalty_monetary_transaction_context_integrity"
BEFORE INSERT ON "loyalty"."monetary_transaction"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."validate_monetary_transaction_context"();

CREATE TABLE "loyalty"."monetary_ledger_entry" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "transaction_id" uuid NOT NULL,
  "wallet_id" uuid NOT NULL,
  "bucket" "loyalty"."monetary_balance_bucket" NOT NULL,
  "amount_minor_delta" bigint NOT NULL,
  "sequence" smallint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_monetary_ledger_entry_transaction_fk"
    FOREIGN KEY ("transaction_id", "wallet_id")
    REFERENCES "loyalty"."monetary_transaction" ("id", "wallet_id"),
  CONSTRAINT "loyalty_monetary_ledger_entry_transaction_sequence_unique"
    UNIQUE ("transaction_id", "sequence"),
  CONSTRAINT "loyalty_monetary_ledger_entry_amount_check"
    CHECK ("amount_minor_delta" <> 0),
  CONSTRAINT "loyalty_monetary_ledger_entry_sequence_check" CHECK ("sequence" > 0)
);

CREATE INDEX "loyalty_monetary_ledger_entry_wallet_bucket_idx"
  ON "loyalty"."monetary_ledger_entry"
    ("store_id", "wallet_id", "bucket", "created_at" DESC, "id" DESC);

CREATE FUNCTION "loyalty"."validate_monetary_ledger_entry_context"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  transaction_store_id uuid;
  transaction_wallet_id uuid;
  transaction_entries_finalized boolean;
BEGIN
  SELECT "store_id", "wallet_id", "entries_finalized"
    INTO transaction_store_id, transaction_wallet_id, transaction_entries_finalized
    FROM "loyalty"."monetary_transaction"
   WHERE "id" = NEW."transaction_id"
   FOR UPDATE;

  IF transaction_store_id IS DISTINCT FROM NEW."store_id"
    OR transaction_wallet_id IS DISTINCT FROM NEW."wallet_id" THEN
    RAISE EXCEPTION 'Monetary ledger entry must use its transaction store and wallet';
  END IF;

  IF transaction_entries_finalized THEN
    RAISE EXCEPTION 'Finalized monetary transactions cannot accept new ledger entries';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "loyalty_monetary_ledger_entry_context_integrity"
BEFORE INSERT ON "loyalty"."monetary_ledger_entry"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."validate_monetary_ledger_entry_context"();

CREATE FUNCTION "loyalty"."validate_monetary_transaction_entries"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  transaction_kind "loyalty"."monetary_transaction_kind";
  transaction_entries_finalized boolean;
  entry_count integer;
  pending_delta bigint;
  available_delta bigint;
  reserved_delta bigint;
  debt_delta bigint;
BEGIN
  SELECT monetary_tx."kind", monetary_tx."entries_finalized"
    INTO transaction_kind, transaction_entries_finalized
    FROM "loyalty"."monetary_transaction" AS monetary_tx
   WHERE monetary_tx."id" = NEW."id";

  IF NOT transaction_entries_finalized THEN
    RAISE EXCEPTION 'Monetary transaction must be finalized before commit';
  END IF;

  SELECT
    count(*)::integer,
    COALESCE(sum("amount_minor_delta") FILTER (WHERE "bucket" = 'PENDING'), 0),
    COALESCE(sum("amount_minor_delta") FILTER (WHERE "bucket" = 'AVAILABLE'), 0),
    COALESCE(sum("amount_minor_delta") FILTER (WHERE "bucket" = 'RESERVED'), 0),
    COALESCE(sum("amount_minor_delta") FILTER (WHERE "bucket" = 'DEBT'), 0)
  INTO entry_count, pending_delta, available_delta, reserved_delta, debt_delta
  FROM "loyalty"."monetary_ledger_entry"
  WHERE "transaction_id" = NEW."id";

  IF entry_count = 0 THEN
    RAISE EXCEPTION 'Monetary transaction must contain ledger entries';
  END IF;

  IF transaction_kind = 'EARN_PENDING'
    AND NOT (pending_delta >= 0 AND available_delta >= 0
      AND NOT (pending_delta > 0 AND available_delta > 0)
      AND reserved_delta = 0 AND debt_delta <= 0
      AND (pending_delta > 0 OR available_delta > 0 OR debt_delta < 0)) THEN
    RAISE EXCEPTION 'Invalid EARN_PENDING monetary ledger entries';
  ELSIF transaction_kind = 'ACTIVATE'
    AND NOT (pending_delta < 0 AND available_delta = -pending_delta
      AND reserved_delta = 0 AND debt_delta = 0) THEN
    RAISE EXCEPTION 'Invalid ACTIVATE monetary ledger entries';
  ELSIF transaction_kind = 'RESERVE'
    AND NOT (available_delta < 0 AND reserved_delta = -available_delta
      AND pending_delta = 0 AND debt_delta = 0) THEN
    RAISE EXCEPTION 'Invalid RESERVE monetary ledger entries';
  ELSIF transaction_kind = 'RELEASE'
    AND NOT (reserved_delta < 0 AND available_delta = -reserved_delta
      AND pending_delta = 0 AND debt_delta = 0) THEN
    RAISE EXCEPTION 'Invalid RELEASE monetary ledger entries';
  ELSIF transaction_kind = 'SPEND'
    AND NOT (reserved_delta < 0 AND pending_delta = 0
      AND available_delta = 0 AND debt_delta = 0) THEN
    RAISE EXCEPTION 'Invalid SPEND monetary ledger entries';
  ELSIF transaction_kind = 'EXPIRE'
    AND NOT (available_delta < 0 AND pending_delta = 0
      AND reserved_delta = 0 AND debt_delta = 0) THEN
    RAISE EXCEPTION 'Invalid EXPIRE monetary ledger entries';
  ELSIF transaction_kind = 'REVERSE_EARN'
    AND NOT (pending_delta <= 0 AND available_delta <= 0
      AND reserved_delta = 0 AND debt_delta >= 0
      AND (pending_delta < 0 OR available_delta < 0 OR debt_delta > 0)) THEN
    RAISE EXCEPTION 'Invalid REVERSE_EARN monetary ledger entries';
  ELSIF transaction_kind = 'RESTORE_SPEND'
    AND NOT (available_delta > 0 AND pending_delta = 0
      AND reserved_delta = 0 AND debt_delta = 0) THEN
    RAISE EXCEPTION 'Invalid RESTORE_SPEND monetary ledger entries';
  ELSIF transaction_kind = 'ADJUST_CREDIT'
    AND NOT (available_delta > 0 AND pending_delta = 0
      AND reserved_delta = 0 AND debt_delta = 0) THEN
    RAISE EXCEPTION 'Invalid ADJUST_CREDIT monetary ledger entries';
  ELSIF transaction_kind = 'ADJUST_DEBIT'
    AND NOT (available_delta < 0 AND pending_delta = 0
      AND reserved_delta = 0 AND debt_delta = 0) THEN
    RAISE EXCEPTION 'Invalid ADJUST_DEBIT monetary ledger entries';
  ELSIF transaction_kind = 'MERGE_TRANSFER'
    AND NOT (
      (pending_delta >= 0 AND available_delta >= 0
        AND reserved_delta >= 0 AND debt_delta >= 0
        AND (pending_delta > 0 OR available_delta > 0
          OR reserved_delta > 0 OR debt_delta > 0))
      OR (pending_delta <= 0 AND available_delta <= 0
        AND reserved_delta <= 0 AND debt_delta <= 0
        AND (pending_delta < 0 OR available_delta < 0
          OR reserved_delta < 0 OR debt_delta < 0))
    ) THEN
    RAISE EXCEPTION 'Invalid MERGE_TRANSFER monetary ledger entries';
  ELSIF transaction_kind = 'DEBT_RECOVERY'
    AND NOT (debt_delta < 0 AND pending_delta = 0
      AND available_delta = 0 AND reserved_delta = 0) THEN
    RAISE EXCEPTION 'Invalid DEBT_RECOVERY monetary ledger entries';
  ELSIF transaction_kind NOT IN (
    'EARN_PENDING', 'ACTIVATE', 'RESERVE', 'RELEASE', 'SPEND', 'EXPIRE',
    'REVERSE_EARN', 'RESTORE_SPEND', 'ADJUST_CREDIT', 'ADJUST_DEBIT',
    'MERGE_TRANSFER', 'DEBT_RECOVERY'
  ) THEN
    RAISE EXCEPTION 'Unsupported monetary transaction kind: %', transaction_kind;
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "loyalty_monetary_transaction_entry_integrity"
AFTER INSERT OR UPDATE ON "loyalty"."monetary_transaction"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "loyalty"."validate_monetary_transaction_entries"();

CREATE TABLE "loyalty"."monetary_credit_lot" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "wallet_id" uuid NOT NULL,
  "origin_entry_id" uuid NOT NULL,
  "amount_issued_minor" bigint NOT NULL,
  "activated_at" timestamptz NOT NULL,
  "expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_monetary_credit_lot_wallet_fk"
    FOREIGN KEY ("wallet_id") REFERENCES "loyalty"."monetary_wallet" ("id"),
  CONSTRAINT "loyalty_monetary_credit_lot_origin_entry_fk"
    FOREIGN KEY ("origin_entry_id") REFERENCES "loyalty"."monetary_ledger_entry" ("id"),
  CONSTRAINT "loyalty_monetary_credit_lot_origin_unique" UNIQUE ("origin_entry_id"),
  CONSTRAINT "loyalty_monetary_credit_lot_amount_check"
    CHECK ("amount_issued_minor" > 0),
  CONSTRAINT "loyalty_monetary_credit_lot_expiry_check"
    CHECK ("expires_at" IS NULL OR "expires_at" > "activated_at")
);

CREATE INDEX "loyalty_monetary_credit_lot_fifo_idx"
  ON "loyalty"."monetary_credit_lot"
    ("store_id", "wallet_id", "expires_at" ASC NULLS LAST, "activated_at", "id");

CREATE FUNCTION "loyalty"."validate_monetary_credit_lot"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  entry_store_id uuid;
  entry_wallet_id uuid;
  entry_bucket "loyalty"."monetary_balance_bucket";
  entry_amount bigint;
BEGIN
  SELECT "store_id", "wallet_id", "bucket", "amount_minor_delta"
    INTO entry_store_id, entry_wallet_id, entry_bucket, entry_amount
    FROM "loyalty"."monetary_ledger_entry"
   WHERE "id" = NEW."origin_entry_id";

  IF entry_store_id IS DISTINCT FROM NEW."store_id"
    OR entry_wallet_id IS DISTINCT FROM NEW."wallet_id"
    OR entry_bucket NOT IN ('PENDING', 'AVAILABLE')
    OR entry_amount <> NEW."amount_issued_minor" THEN
    RAISE EXCEPTION 'Monetary credit lot must exactly match a positive credit entry';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "loyalty_monetary_credit_lot_origin_integrity"
BEFORE INSERT ON "loyalty"."monetary_credit_lot"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."validate_monetary_credit_lot"();

CREATE TABLE "loyalty"."monetary_lot_allocation" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "lot_id" uuid NOT NULL,
  "debit_entry_id" uuid NOT NULL,
  "amount_minor" bigint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_monetary_lot_allocation_lot_fk"
    FOREIGN KEY ("lot_id") REFERENCES "loyalty"."monetary_credit_lot" ("id"),
  CONSTRAINT "loyalty_monetary_lot_allocation_debit_entry_fk"
    FOREIGN KEY ("debit_entry_id") REFERENCES "loyalty"."monetary_ledger_entry" ("id"),
  CONSTRAINT "loyalty_monetary_lot_allocation_entry_lot_unique"
    UNIQUE ("debit_entry_id", "lot_id"),
  CONSTRAINT "loyalty_monetary_lot_allocation_amount_check" CHECK ("amount_minor" > 0)
);

CREATE TABLE "loyalty"."monetary_wallet_balance" (
  "wallet_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "pending_amount_minor" bigint NOT NULL DEFAULT 0,
  "available_amount_minor" bigint NOT NULL DEFAULT 0,
  "reserved_amount_minor" bigint NOT NULL DEFAULT 0,
  "debt_amount_minor" bigint NOT NULL DEFAULT 0,
  "last_transaction_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_monetary_wallet_balance_wallet_fk"
    FOREIGN KEY ("wallet_id") REFERENCES "loyalty"."monetary_wallet" ("id"),
  CONSTRAINT "loyalty_monetary_wallet_balance_transaction_fk"
    FOREIGN KEY ("last_transaction_id", "wallet_id")
    REFERENCES "loyalty"."monetary_transaction" ("id", "wallet_id"),
  CONSTRAINT "loyalty_monetary_wallet_balance_values_check" CHECK (
    "pending_amount_minor" >= 0
    AND "available_amount_minor" >= 0
    AND "reserved_amount_minor" >= 0
    AND "debt_amount_minor" >= 0
  )
);

CREATE FUNCTION "loyalty"."validate_monetary_lot_allocation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  lot_store_id uuid;
  lot_wallet_id uuid;
  lot_amount bigint;
  entry_store_id uuid;
  entry_wallet_id uuid;
  entry_amount bigint;
  lot_allocated bigint;
  entry_allocated bigint;
BEGIN
  SELECT "store_id", "wallet_id", "amount_issued_minor"
    INTO lot_store_id, lot_wallet_id, lot_amount
    FROM "loyalty"."monetary_credit_lot"
   WHERE "id" = NEW."lot_id"
   FOR UPDATE;

  SELECT "store_id", "wallet_id", "amount_minor_delta"
    INTO entry_store_id, entry_wallet_id, entry_amount
    FROM "loyalty"."monetary_ledger_entry"
   WHERE "id" = NEW."debit_entry_id"
   FOR UPDATE;

  IF NEW."store_id" IS DISTINCT FROM lot_store_id
    OR NEW."store_id" IS DISTINCT FROM entry_store_id
    OR lot_wallet_id IS DISTINCT FROM entry_wallet_id
    OR entry_amount >= 0 THEN
    RAISE EXCEPTION 'Monetary lot allocation must use its store and a debit entry from the same wallet';
  END IF;

  SELECT COALESCE(sum("amount_minor"), 0) INTO lot_allocated
    FROM "loyalty"."monetary_lot_allocation" WHERE "lot_id" = NEW."lot_id";
  IF lot_allocated > lot_amount THEN
    RAISE EXCEPTION 'Monetary lot allocation exceeds issued amount';
  END IF;

  SELECT COALESCE(sum("amount_minor"), 0) INTO entry_allocated
    FROM "loyalty"."monetary_lot_allocation" WHERE "debit_entry_id" = NEW."debit_entry_id";
  IF entry_allocated > -entry_amount THEN
    RAISE EXCEPTION 'Monetary lot allocations exceed debit entry amount';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "loyalty_monetary_lot_allocation_integrity"
AFTER INSERT ON "loyalty"."monetary_lot_allocation"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "loyalty"."validate_monetary_lot_allocation"();

CREATE FUNCTION "loyalty"."validate_monetary_wallet_balance_context"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  wallet_store_id uuid;
  transaction_store_id uuid;
  transaction_wallet_id uuid;
BEGIN
  SELECT "store_id" INTO wallet_store_id
    FROM "loyalty"."monetary_wallet" WHERE "id" = NEW."wallet_id";

  IF NEW."store_id" IS DISTINCT FROM wallet_store_id THEN
    RAISE EXCEPTION 'Monetary wallet balance must use its wallet store';
  END IF;

  IF NEW."last_transaction_id" IS NOT NULL THEN
    SELECT "store_id", "wallet_id"
      INTO transaction_store_id, transaction_wallet_id
      FROM "loyalty"."monetary_transaction"
     WHERE "id" = NEW."last_transaction_id";

    IF transaction_store_id IS DISTINCT FROM NEW."store_id"
      OR transaction_wallet_id IS DISTINCT FROM NEW."wallet_id" THEN
      RAISE EXCEPTION 'Monetary wallet balance transaction crosses store or wallet boundaries';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "loyalty_monetary_wallet_balance_context_integrity"
BEFORE INSERT OR UPDATE ON "loyalty"."monetary_wallet_balance"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."validate_monetary_wallet_balance_context"();

CREATE FUNCTION "loyalty"."guard_monetary_transaction_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Loyalty ledger records are append-only';
  END IF;

  IF OLD."entries_finalized"
    OR NOT NEW."entries_finalized"
    OR (to_jsonb(NEW) - 'entries_finalized')
      IS DISTINCT FROM (to_jsonb(OLD) - 'entries_finalized') THEN
    RAISE EXCEPTION 'Only monetary transaction entry finalization is allowed';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "loyalty_monetary_transaction_append_only"
BEFORE UPDATE OR DELETE ON "loyalty"."monetary_transaction"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."guard_monetary_transaction_mutation"();

CREATE TRIGGER "loyalty_monetary_ledger_entry_append_only"
BEFORE UPDATE OR DELETE ON "loyalty"."monetary_ledger_entry"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."reject_immutable_ledger_mutation"();

CREATE TRIGGER "loyalty_monetary_credit_lot_append_only"
BEFORE UPDATE OR DELETE ON "loyalty"."monetary_credit_lot"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."reject_immutable_ledger_mutation"();

CREATE TRIGGER "loyalty_monetary_lot_allocation_append_only"
BEFORE UPDATE OR DELETE ON "loyalty"."monetary_lot_allocation"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."reject_immutable_ledger_mutation"();

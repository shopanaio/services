CREATE TABLE "loyalty"."point_lot" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "program_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "origin_entry_id" uuid NOT NULL,
  "points_issued" bigint NOT NULL,
  "activated_at" timestamptz NOT NULL,
  "expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_point_lot_program_fk"
    FOREIGN KEY ("program_id") REFERENCES "loyalty"."program" ("id"),
  CONSTRAINT "loyalty_point_lot_account_fk"
    FOREIGN KEY ("account_id") REFERENCES "loyalty"."account" ("id"),
  CONSTRAINT "loyalty_point_lot_origin_entry_fk"
    FOREIGN KEY ("origin_entry_id") REFERENCES "loyalty"."ledger_entry" ("id"),
  CONSTRAINT "loyalty_point_lot_origin_entry_unique" UNIQUE ("origin_entry_id"),
  CONSTRAINT "loyalty_point_lot_points_check" CHECK ("points_issued" > 0),
  CONSTRAINT "loyalty_point_lot_expiry_check"
    CHECK ("expires_at" IS NULL OR "expires_at" > "activated_at")
);

CREATE INDEX "loyalty_point_lot_fifo_idx"
  ON "loyalty"."point_lot"
    ("store_id", "account_id", "expires_at" ASC NULLS LAST, "activated_at", "id");

CREATE TABLE "loyalty"."lot_allocation" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "lot_id" uuid NOT NULL,
  "debit_entry_id" uuid NOT NULL,
  "transaction_id" uuid NOT NULL,
  "allocation_type" "loyalty"."lot_allocation_type" NOT NULL,
  "points" bigint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_lot_allocation_lot_fk"
    FOREIGN KEY ("lot_id") REFERENCES "loyalty"."point_lot" ("id"),
  CONSTRAINT "loyalty_lot_allocation_debit_entry_fk"
    FOREIGN KEY ("debit_entry_id") REFERENCES "loyalty"."ledger_entry" ("id"),
  CONSTRAINT "loyalty_lot_allocation_transaction_fk"
    FOREIGN KEY ("transaction_id") REFERENCES "loyalty"."transaction" ("id"),
  CONSTRAINT "loyalty_lot_allocation_entry_lot_unique"
    UNIQUE ("debit_entry_id", "lot_id"),
  CONSTRAINT "loyalty_lot_allocation_points_check" CHECK ("points" > 0)
);

CREATE INDEX "loyalty_lot_allocation_lot_idx"
  ON "loyalty"."lot_allocation" ("lot_id", "created_at", "id");

CREATE FUNCTION "loyalty"."validate_lot_allocation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  issued_points bigint;
  allocated_points bigint;
  lot_account_id uuid;
  entry_account_id uuid;
  entry_points bigint;
BEGIN
  SELECT "points_issued", "account_id"
    INTO issued_points, lot_account_id
    FROM "loyalty"."point_lot"
   WHERE "id" = NEW."lot_id"
   FOR UPDATE;

  SELECT "account_id", "points_delta"
    INTO entry_account_id, entry_points
    FROM "loyalty"."ledger_entry"
   WHERE "id" = NEW."debit_entry_id";

  IF lot_account_id IS DISTINCT FROM entry_account_id OR entry_points >= 0 THEN
    RAISE EXCEPTION 'Lot allocation must reference a debit entry on the same account';
  END IF;

  SELECT COALESCE(sum("points"), 0)
    INTO allocated_points
    FROM "loyalty"."lot_allocation"
   WHERE "lot_id" = NEW."lot_id";

  IF allocated_points > issued_points THEN
    RAISE EXCEPTION 'Point lot allocation exceeds issued points';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "loyalty_lot_allocation_integrity"
AFTER INSERT ON "loyalty"."lot_allocation"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "loyalty"."validate_lot_allocation"();

CREATE TRIGGER "loyalty_point_lot_append_only"
BEFORE UPDATE OR DELETE ON "loyalty"."point_lot"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."reject_immutable_ledger_mutation"();

CREATE TRIGGER "loyalty_lot_allocation_append_only"
BEFORE UPDATE OR DELETE ON "loyalty"."lot_allocation"
FOR EACH ROW EXECUTE FUNCTION "loyalty"."reject_immutable_ledger_mutation"();

CREATE TABLE "loyalty"."account_balance" (
  "account_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "pending_points" bigint NOT NULL DEFAULT 0,
  "available_points" bigint NOT NULL DEFAULT 0,
  "reserved_points" bigint NOT NULL DEFAULT 0,
  "debt_points" bigint NOT NULL DEFAULT 0,
  "lifetime_earned_points" bigint NOT NULL DEFAULT 0,
  "lifetime_redeemed_points" bigint NOT NULL DEFAULT 0,
  "lifetime_expired_points" bigint NOT NULL DEFAULT 0,
  "lifetime_adjusted_points" bigint NOT NULL DEFAULT 0,
  "last_transaction_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_account_balance_account_fk"
    FOREIGN KEY ("account_id", "store_id")
    REFERENCES "loyalty"."account" ("id", "store_id"),
  CONSTRAINT "loyalty_account_balance_last_transaction_fk"
    FOREIGN KEY ("last_transaction_id", "account_id", "store_id")
    REFERENCES "loyalty"."transaction" ("id", "account_id", "store_id"),
  CONSTRAINT "loyalty_account_balance_nonnegative_check" CHECK (
    "pending_points" >= 0
    AND "available_points" >= 0
    AND "reserved_points" >= 0
    AND "debt_points" >= 0
    AND "lifetime_earned_points" >= 0
    AND "lifetime_redeemed_points" >= 0
    AND "lifetime_expired_points" >= 0
  )
);

CREATE INDEX "loyalty_account_balance_store_available_idx"
  ON "loyalty"."account_balance" ("store_id", "available_points" DESC, "account_id");

CREATE VIEW "loyalty"."account_expiring_points" AS
SELECT
  lot."store_id",
  lot."account_id",
  lot."id" AS "lot_id",
  lot."expires_at",
  lot."points_issued" - COALESCE(sum(allocation."points"), 0) AS "remaining_points"
FROM "loyalty"."point_lot" AS lot
LEFT JOIN "loyalty"."lot_allocation" AS allocation
  ON allocation."lot_id" = lot."id"
WHERE lot."expires_at" IS NOT NULL
GROUP BY lot."store_id", lot."account_id", lot."id", lot."expires_at", lot."points_issued"
HAVING lot."points_issued" - COALESCE(sum(allocation."points"), 0) > 0;

COMMENT ON TABLE "loyalty"."account_balance" IS
  'Rebuildable projection. The immutable transaction and ledger_entry tables are authoritative.';

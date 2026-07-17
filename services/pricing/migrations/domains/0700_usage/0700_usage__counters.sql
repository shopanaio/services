-- Up Migration

-- These rows are transactionally maintained projections. Reservation writes
-- lock the counter row before checking the aggregate or code usage limit.
CREATE TABLE "pricing"."discount_usage_counter" (
  "discount_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "reserved_count" bigint NOT NULL DEFAULT 0,
  "committed_count" bigint NOT NULL DEFAULT 0,
  "reversed_count" bigint NOT NULL DEFAULT 0,
  "version" bigint NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_usage_counter_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "discount_usage_counter_counts_check"
    CHECK (
      "reserved_count" >= 0
      AND "committed_count" >= 0
      AND "reversed_count" >= 0
      AND "reversed_count" <= "committed_count"
    ),
  CONSTRAINT "discount_usage_counter_version_check"
    CHECK ("version" >= 0)
);

CREATE INDEX "discount_usage_counter_store_idx"
  ON "pricing"."discount_usage_counter" ("store_id", "discount_id");

CREATE TABLE "pricing"."discount_code_usage_counter" (
  "code_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "reserved_count" bigint NOT NULL DEFAULT 0,
  "committed_count" bigint NOT NULL DEFAULT 0,
  "reversed_count" bigint NOT NULL DEFAULT 0,
  "version" bigint NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_code_usage_counter_code_fk"
    FOREIGN KEY ("discount_id", "code_id")
    REFERENCES "pricing"."discount_code" ("discount_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "discount_code_usage_counter_counts_check"
    CHECK (
      "reserved_count" >= 0
      AND "committed_count" >= 0
      AND "reversed_count" >= 0
      AND "reversed_count" <= "committed_count"
    ),
  CONSTRAINT "discount_code_usage_counter_version_check"
    CHECK ("version" >= 0)
);

CREATE INDEX "discount_code_usage_counter_store_discount_idx"
  ON "pricing"."discount_code_usage_counter" (
    "store_id",
    "discount_id",
    "code_id"
  );

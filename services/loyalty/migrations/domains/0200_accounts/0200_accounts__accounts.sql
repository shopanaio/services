CREATE TABLE "loyalty"."account" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "program_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "status" "loyalty"."account_status" NOT NULL DEFAULT 'ACTIVE',
  "revision" integer NOT NULL DEFAULT 1,
  "merged_into_account_id" uuid,
  "suspended_reason" varchar(500),
  "opened_at" timestamptz NOT NULL DEFAULT now(),
  "suspended_at" timestamptz,
  "closed_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "loyalty_account_program_fk"
    FOREIGN KEY ("program_id") REFERENCES "loyalty"."program" ("id"),
  CONSTRAINT "loyalty_account_merged_into_fk"
    FOREIGN KEY ("merged_into_account_id") REFERENCES "loyalty"."account" ("id"),
  CONSTRAINT "loyalty_account_program_customer_unique"
    UNIQUE ("program_id", "customer_id"),
  CONSTRAINT "loyalty_account_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "loyalty_account_merge_check" CHECK (
    ("status" = 'MERGED' AND "merged_into_account_id" IS NOT NULL
      AND "merged_into_account_id" <> "id" AND "closed_at" IS NOT NULL)
    OR ("status" <> 'MERGED' AND "merged_into_account_id" IS NULL)
  ),
  CONSTRAINT "loyalty_account_suspension_check" CHECK (
    ("status" = 'SUSPENDED' AND "suspended_at" IS NOT NULL
      AND btrim(COALESCE("suspended_reason", '')) <> '')
    OR ("status" <> 'SUSPENDED' AND "suspended_at" IS NULL)
  ),
  CONSTRAINT "loyalty_account_close_check" CHECK (
    ("status" IN ('CLOSED', 'MERGED') AND "closed_at" IS NOT NULL)
    OR ("status" NOT IN ('CLOSED', 'MERGED') AND "closed_at" IS NULL)
  )
);

CREATE INDEX "loyalty_account_store_customer_idx"
  ON "loyalty"."account" ("store_id", "customer_id", "status", "id");

CREATE INDEX "loyalty_account_store_program_status_idx"
  ON "loyalty"."account" ("store_id", "program_id", "status", "opened_at" DESC, "id" DESC);

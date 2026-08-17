CREATE TABLE "customers"."customer" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "iam_principal_id" text,
  "iam_principal_status" varchar(16),
  "iam_lifecycle_disabled" boolean NOT NULL DEFAULT false,
  "lifecycle_status" "customers"."customer_lifecycle_status" NOT NULL DEFAULT 'ACTIVE',
  "account_status" "customers"."customer_account_status" NOT NULL DEFAULT 'GUEST',
  "email" varchar(320),
  "normalized_email" varchar(320),
  "email_domain_normalized" varchar(255),
  "email_verified" boolean NOT NULL DEFAULT false,
  "phone_e164" varchar(32),
  "phone_verified" boolean NOT NULL DEFAULT false,
  "prefix" varchar(32),
  "first_name" varchar(128),
  "middle_name" varchar(128),
  "last_name" varchar(128),
  "suffix" varchar(32),
  "preferred_locale" varchar(35),
  "preferred_locale_normalized" varchar(35),
  "date_of_birth" date,
  "birthday_month_day" varchar(4),
  "gender" varchar(32),
  "company_name" varchar(255),
  "company_name_normalized" varchar(255),
  "job_title" varchar(255),
  "note" text,
  "blocked_reason" text,
  "moderation_note" text,
  "source" varchar(64) NOT NULL DEFAULT 'unknown',
  "created_by_user_id" text,
  "revision" integer NOT NULL DEFAULT 1,
  "last_activity_at" timestamptz,
  "merged_into_customer_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  "redacted_at" timestamptz,

  CONSTRAINT "customer_merged_into_customer_fk"
    FOREIGN KEY ("merged_into_customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE RESTRICT,
  CONSTRAINT "customer_email_projection_check"
    CHECK (
      ("email" IS NULL) = ("normalized_email" IS NULL)
      AND ("email" IS NULL) = ("email_domain_normalized" IS NULL)
    ),
  CONSTRAINT "customer_birthday_month_day_check"
    CHECK (
      ("date_of_birth" IS NULL AND "birthday_month_day" IS NULL)
      OR
      ("date_of_birth" IS NOT NULL AND "birthday_month_day" ~ '^(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$')
    ),
  CONSTRAINT "customer_iam_principal_status_check"
    CHECK (
      ("iam_principal_id" IS NULL AND "iam_principal_status" IS NULL)
      OR
      ("iam_principal_id" IS NOT NULL AND "iam_principal_status" IN ('active', 'blocked'))
    ),
  CONSTRAINT "customer_iam_lifecycle_disabled_check"
    CHECK (
      NOT "iam_lifecycle_disabled"
      OR
      ("iam_principal_id" IS NOT NULL
        AND "iam_principal_status" = 'blocked'
        AND "lifecycle_status" = 'DISABLED')
    ),
  CONSTRAINT "customer_email_verified_check"
    CHECK (NOT "email_verified" OR "email" IS NOT NULL),
  CONSTRAINT "customer_phone_verified_check"
    CHECK (NOT "phone_verified" OR "phone_e164" IS NOT NULL),
  CONSTRAINT "customer_phone_e164_check"
    CHECK ("phone_e164" IS NULL OR "phone_e164" ~ '^\+[1-9][0-9]{6,14}$'),
  CONSTRAINT "customer_revision_nonnegative_check"
    CHECK ("revision" >= 1),
  CONSTRAINT "customer_blocked_reason_check"
    CHECK (
      ("lifecycle_status" <> 'BLOCKED' AND "blocked_reason" IS NULL)
      OR
      ("lifecycle_status" = 'BLOCKED'
        AND "blocked_reason" IS NOT NULL
        AND length(btrim("blocked_reason")) > 0)
    ),
  CONSTRAINT "customer_moderation_note_check"
    CHECK (
      "moderation_note" IS NULL
      OR length(btrim("moderation_note")) > 0
    ),
  CONSTRAINT "customer_merge_target_check"
    CHECK (
      ("lifecycle_status" = 'MERGED' AND "merged_into_customer_id" IS NOT NULL)
      OR
      ("lifecycle_status" <> 'MERGED' AND "merged_into_customer_id" IS NULL)
    ),
  CONSTRAINT "customer_not_merged_into_self_check"
    CHECK ("merged_into_customer_id" IS NULL OR "merged_into_customer_id" <> "id"),
  CONSTRAINT "customer_redaction_timestamp_check"
    CHECK (
      ("lifecycle_status" = 'REDACTED' AND "redacted_at" IS NOT NULL)
      OR
      ("lifecycle_status" <> 'REDACTED' AND "redacted_at" IS NULL)
    ),
  CONSTRAINT "customer_deleted_at_check"
    CHECK ("deleted_at" IS NULL OR "deleted_at" >= "created_at"),
  CONSTRAINT "customer_redacted_at_check"
    CHECK ("redacted_at" IS NULL OR "redacted_at" >= "created_at")
);

CREATE UNIQUE INDEX "customer_store_principal_unique"
  ON "customers"."customer" ("store_id", "iam_principal_id")
  WHERE "iam_principal_id" IS NOT NULL;

CREATE UNIQUE INDEX "customer_store_email_unique"
  ON "customers"."customer" ("store_id", "normalized_email")
  WHERE "normalized_email" IS NOT NULL AND "deleted_at" IS NULL;

CREATE INDEX "customer_store_status_created_idx"
  ON "customers"."customer" ("store_id", "lifecycle_status", "created_at" DESC, "id");

CREATE INDEX "customer_store_lifecycle_status_idx"
  ON "customers"."customer" ("store_id", "lifecycle_status", "id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_store_account_status_idx"
  ON "customers"."customer" ("store_id", "account_status", "id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_store_name_idx"
  ON "customers"."customer" (
    "store_id",
    lower("last_name"),
    lower("first_name"),
    "id"
  )
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_store_phone_idx"
  ON "customers"."customer" ("store_id", "phone_e164")
  WHERE "phone_e164" IS NOT NULL AND "deleted_at" IS NULL;

CREATE INDEX "customer_store_activity_idx"
  ON "customers"."customer" ("store_id", "last_activity_at" DESC, "id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_merge_target_idx"
  ON "customers"."customer" ("merged_into_customer_id")
  WHERE "merged_into_customer_id" IS NOT NULL;

CREATE INDEX "customer_store_root_scan_idx"
  ON "customers"."customer" ("store_id", "id")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "customer_store_id_unique"
  ON "customers"."customer" ("store_id", "id");

CREATE INDEX "customer_store_email_domain_idx"
  ON "customers"."customer" ("store_id", "email_domain_normalized", "id")
  WHERE "deleted_at" IS NULL AND "email_domain_normalized" IS NOT NULL;

CREATE INDEX "customer_store_locale_idx"
  ON "customers"."customer" ("store_id", "preferred_locale_normalized", "id")
  WHERE "deleted_at" IS NULL AND "preferred_locale_normalized" IS NOT NULL;

CREATE INDEX "customer_store_company_idx"
  ON "customers"."customer" ("store_id", "company_name_normalized", "id")
  WHERE "deleted_at" IS NULL AND "company_name_normalized" IS NOT NULL;

CREATE INDEX "customer_store_source_idx"
  ON "customers"."customer" ("store_id", "source", "id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_store_created_idx"
  ON "customers"."customer" ("store_id", "created_at", "id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_store_updated_idx"
  ON "customers"."customer" ("store_id", "updated_at", "id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_store_birth_date_idx"
  ON "customers"."customer" ("store_id", "date_of_birth", "id")
  WHERE "deleted_at" IS NULL AND "date_of_birth" IS NOT NULL;

CREATE INDEX "customer_store_birthday_idx"
  ON "customers"."customer" ("store_id", "birthday_month_day", "id")
  WHERE "deleted_at" IS NULL AND "birthday_month_day" IS NOT NULL;

CREATE INDEX "customer_store_email_verified_idx"
  ON "customers"."customer" ("store_id", "email_verified", "id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_store_phone_verified_idx"
  ON "customers"."customer" ("store_id", "phone_verified", "id")
  WHERE "deleted_at" IS NULL;

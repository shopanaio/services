CREATE TABLE "customers"."customer_group" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "code" varchar(64) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "is_default" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,

  CONSTRAINT "customer_group_code_check"
    CHECK ("code" ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  CONSTRAINT "customer_group_name_check"
    CHECK (length(btrim("name")) > 0)
);

CREATE UNIQUE INDEX "customer_group_store_code_unique"
  ON "customers"."customer_group" ("store_id", "code")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "customer_group_store_default_unique"
  ON "customers"."customer_group" ("store_id")
  WHERE "is_default" = true AND "is_active" = true AND "deleted_at" IS NULL;

CREATE INDEX "customer_group_store_active_idx"
  ON "customers"."customer_group" ("store_id", "is_active", lower("name"), "id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE "customers"."customer_group_membership" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "is_primary" boolean NOT NULL DEFAULT false,
  "source" "customers"."assignment_source" NOT NULL DEFAULT 'MANUAL',
  "assigned_by_id" text,
  "assigned_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz,

  CONSTRAINT "customer_group_membership_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_group_membership_group_fk"
    FOREIGN KEY ("group_id")
    REFERENCES "customers"."customer_group" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_group_membership_customer_group_unique"
    UNIQUE ("customer_id", "group_id")
);

CREATE UNIQUE INDEX "customer_group_membership_primary_unique"
  ON "customers"."customer_group_membership" ("customer_id")
  WHERE "is_primary" = true AND "expires_at" IS NULL;

CREATE INDEX "customer_group_membership_store_group_idx"
  ON "customers"."customer_group_membership" ("store_id", "group_id", "customer_id");

CREATE INDEX "customer_group_membership_customer_idx"
  ON "customers"."customer_group_membership" ("customer_id");

CREATE INDEX "customer_group_membership_store_customer_group_idx"
  ON "customers"."customer_group_membership"
  ("store_id", "customer_id", "group_id", "expires_at");

CREATE INDEX "customer_group_membership_store_group_expiry_idx"
  ON "customers"."customer_group_membership"
  ("store_id", "group_id", "expires_at", "customer_id");

CREATE TABLE "customers"."customer_segment" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "type" "customers"."customer_segment_type" NOT NULL,
  "status" "customers"."customer_segment_status" NOT NULL DEFAULT 'draft',
  "query" text,
  "definition" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,

  CONSTRAINT "customer_segment_name_check"
    CHECK (length(btrim("name")) > 0),
  CONSTRAINT "customer_segment_dynamic_definition_check"
    CHECK ("type" <> 'dynamic' OR "query" IS NOT NULL OR "definition" <> '{}'::jsonb)
);

CREATE UNIQUE INDEX "customer_segment_store_name_unique"
  ON "customers"."customer_segment" ("store_id", lower("name"))
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_segment_store_status_idx"
  ON "customers"."customer_segment" ("store_id", "status", "type", "id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE "customers"."customer_segment_membership" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "segment_id" uuid NOT NULL,
  "source" "customers"."assignment_source" NOT NULL,
  "evaluated_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz,

  CONSTRAINT "customer_segment_membership_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_segment_membership_segment_fk"
    FOREIGN KEY ("segment_id")
    REFERENCES "customers"."customer_segment" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_segment_membership_customer_segment_unique"
    UNIQUE ("customer_id", "segment_id"),
  CONSTRAINT "customer_segment_membership_expiry_check"
    CHECK ("expires_at" IS NULL OR "expires_at" > "evaluated_at")
);

CREATE INDEX "customer_segment_membership_store_segment_idx"
  ON "customers"."customer_segment_membership" ("store_id", "segment_id", "customer_id");

CREATE INDEX "customer_segment_membership_customer_idx"
  ON "customers"."customer_segment_membership" ("customer_id");

CREATE INDEX "customer_segment_membership_expiry_idx"
  ON "customers"."customer_segment_membership" ("expires_at")
  WHERE "expires_at" IS NOT NULL;

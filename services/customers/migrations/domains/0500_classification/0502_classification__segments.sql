CREATE TABLE "customers"."customer_segment" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "color" varchar(7),
  "type" "customers"."customer_segment_type" NOT NULL,
  "status" "customers"."customer_segment_status" NOT NULL DEFAULT 'DRAFT',
  "query" text,
  "definition" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by_id" text,
  "revision" integer NOT NULL DEFAULT 0,
  "definition_revision" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,

  CONSTRAINT "customer_segment_name_check"
    CHECK (length(btrim("name")) > 0),
  CONSTRAINT "customer_segment_dynamic_definition_check"
    CHECK ("type" <> 'DYNAMIC' OR "query" IS NOT NULL OR "definition" <> '{}'::jsonb),
  CONSTRAINT "customer_segment_color_check"
    CHECK ("color" IS NULL OR "color" ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT "customer_segment_revision_nonnegative_check"
    CHECK ("revision" >= 0),
  CONSTRAINT "customer_segment_definition_revision_nonnegative_check"
    CHECK ("definition_revision" >= 0)
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
  "evaluated_definition_revision" integer,
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
    CHECK ("expires_at" IS NULL OR "expires_at" > "evaluated_at"),
  CONSTRAINT "customer_segment_membership_definition_revision_check"
    CHECK (
      ("source" = 'RULE' AND "evaluated_definition_revision" IS NOT NULL)
      OR
      ("source" <> 'RULE' AND "evaluated_definition_revision" IS NULL)
    ),
  CONSTRAINT "customer_segment_membership_definition_revision_nonnegative_check"
    CHECK (
      "evaluated_definition_revision" IS NULL
      OR "evaluated_definition_revision" >= 0
    )
);

CREATE INDEX "customer_segment_membership_store_segment_idx"
  ON "customers"."customer_segment_membership" ("store_id", "segment_id", "customer_id");

CREATE INDEX "customer_segment_membership_customer_idx"
  ON "customers"."customer_segment_membership" ("customer_id");

CREATE INDEX "customer_segment_membership_expiry_idx"
  ON "customers"."customer_segment_membership" ("expires_at")
  WHERE "expires_at" IS NOT NULL;

CREATE INDEX "customer_segment_membership_store_customer_expiry_idx"
  ON "customers"."customer_segment_membership"
  ("store_id", "customer_id", "expires_at", "segment_id");

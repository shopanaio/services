CREATE TABLE "customers"."customer_tag" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "normalized_name" varchar(255) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,

  CONSTRAINT "customer_tag_name_check"
    CHECK (length(btrim("normalized_name")) > 0)
);

CREATE UNIQUE INDEX "customer_tag_store_name_unique"
  ON "customers"."customer_tag" ("store_id", "normalized_name")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_tag_store_name_idx"
  ON "customers"."customer_tag" ("store_id", "normalized_name", "id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE "customers"."customer_tag_assignment" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "assigned_by_id" text,
  "assigned_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "customer_tag_assignment_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_tag_assignment_tag_fk"
    FOREIGN KEY ("tag_id")
    REFERENCES "customers"."customer_tag" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_tag_assignment_customer_tag_unique"
    UNIQUE ("customer_id", "tag_id")
);

CREATE INDEX "customer_tag_assignment_store_tag_idx"
  ON "customers"."customer_tag_assignment" ("store_id", "tag_id", "customer_id");

CREATE INDEX "customer_tag_assignment_customer_idx"
  ON "customers"."customer_tag_assignment" ("customer_id");

CREATE INDEX "customer_tag_assignment_store_customer_tag_idx"
  ON "customers"."customer_tag_assignment" ("store_id", "customer_id", "tag_id");

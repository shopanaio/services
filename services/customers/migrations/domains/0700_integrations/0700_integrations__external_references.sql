CREATE TABLE "customers"."customer_external_reference" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "external_system" varchar(64) NOT NULL,
  "external_type" varchar(64) NOT NULL DEFAULT 'customer',
  "external_id" varchar(255) NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,

  CONSTRAINT "customer_external_reference_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_external_reference_system_check"
    CHECK (length(btrim("external_system")) > 0),
  CONSTRAINT "customer_external_reference_type_check"
    CHECK (length(btrim("external_type")) > 0),
  CONSTRAINT "customer_external_reference_id_check"
    CHECK (length(btrim("external_id")) > 0)
);

CREATE UNIQUE INDEX "customer_external_reference_lookup_unique"
  ON "customers"."customer_external_reference" (
    "store_id",
    "external_system",
    "external_type",
    "external_id"
  )
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "customer_external_reference_customer_unique"
  ON "customers"."customer_external_reference" (
    "customer_id",
    "external_system",
    "external_type"
  )
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_external_reference_customer_idx"
  ON "customers"."customer_external_reference" ("customer_id");

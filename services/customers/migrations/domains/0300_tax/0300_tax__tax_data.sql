CREATE TABLE "customers"."customer_tax_identifier" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "identifier_type" varchar(64) NOT NULL,
  "country_code" char(2),
  "value" varchar(255) NOT NULL,
  "normalized_value" varchar(255) NOT NULL,
  "status" "customers"."tax_identifier_status" NOT NULL DEFAULT 'UNVERIFIED',
  "is_primary" boolean NOT NULL DEFAULT false,
  "verified_at" timestamptz,
  "valid_from" date,
  "valid_to" date,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,

  CONSTRAINT "customer_tax_identifier_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_tax_identifier_type_check"
    CHECK (length(btrim("identifier_type")) > 0),
  CONSTRAINT "customer_tax_identifier_value_check"
    CHECK (length(btrim("normalized_value")) > 0),
  CONSTRAINT "customer_tax_identifier_country_code_check"
    CHECK ("country_code" IS NULL OR "country_code" ~ '^[A-Z]{2}$'),
  CONSTRAINT "customer_tax_identifier_verified_at_check"
    CHECK ("status" <> 'VERIFIED' OR "verified_at" IS NOT NULL),
  CONSTRAINT "customer_tax_identifier_validity_check"
    CHECK ("valid_to" IS NULL OR "valid_from" IS NULL OR "valid_to" >= "valid_from")
);

CREATE UNIQUE INDEX "customer_tax_identifier_active_unique"
  ON "customers"."customer_tax_identifier" (
    "customer_id",
    "identifier_type",
    COALESCE("country_code", ''),
    "normalized_value"
  )
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "customer_tax_identifier_primary_unique"
  ON "customers"."customer_tax_identifier" ("customer_id")
  WHERE "is_primary" = true AND "deleted_at" IS NULL;

CREATE INDEX "customer_tax_identifier_store_customer_idx"
  ON "customers"."customer_tax_identifier" ("store_id", "customer_id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE "customers"."customer_tax_exemption" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "code" varchar(128) NOT NULL,
  "country_code" char(2),
  "region_code" varchar(64),
  "reason" text,
  "status" "customers"."tax_exemption_status" NOT NULL DEFAULT 'ACTIVE',
  "certificate_file_id" uuid,
  "valid_from" date,
  "valid_to" date,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,

  CONSTRAINT "customer_tax_exemption_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_tax_exemption_code_check"
    CHECK (length(btrim("code")) > 0),
  CONSTRAINT "customer_tax_exemption_country_code_check"
    CHECK ("country_code" IS NULL OR "country_code" ~ '^[A-Z]{2}$'),
  CONSTRAINT "customer_tax_exemption_validity_check"
    CHECK ("valid_to" IS NULL OR "valid_from" IS NULL OR "valid_to" >= "valid_from")
);

CREATE UNIQUE INDEX "customer_tax_exemption_active_unique"
  ON "customers"."customer_tax_exemption" (
    "customer_id",
    "code",
    COALESCE("country_code", ''),
    COALESCE("region_code", '')
  )
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_tax_exemption_store_customer_idx"
  ON "customers"."customer_tax_exemption" ("store_id", "customer_id", "status")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_tax_exemption_certificate_idx"
  ON "customers"."customer_tax_exemption" ("certificate_file_id")
  WHERE "certificate_file_id" IS NOT NULL;

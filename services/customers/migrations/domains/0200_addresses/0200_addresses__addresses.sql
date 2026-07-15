CREATE TABLE "customers"."customer_address" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "label" varchar(64),
  "prefix" varchar(32),
  "first_name" varchar(128),
  "middle_name" varchar(128),
  "last_name" varchar(128),
  "suffix" varchar(32),
  "company_name" varchar(255),
  "phone_e164" varchar(32),
  "address1" varchar(255) NOT NULL,
  "address2" varchar(255),
  "city" varchar(128) NOT NULL,
  "region_name" varchar(128),
  "region_code" varchar(64),
  "postal_code" varchar(32),
  "country_code" char(2) NOT NULL,
  "is_default_shipping" boolean NOT NULL DEFAULT false,
  "is_default_billing" boolean NOT NULL DEFAULT false,
  "validation_status" "customers"."address_validation_status" NOT NULL DEFAULT 'unvalidated',
  "validated_at" timestamptz,
  "latitude" numeric(9, 6),
  "longitude" numeric(9, 6),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,

  CONSTRAINT "customer_address_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_address_country_code_check"
    CHECK ("country_code" ~ '^[A-Z]{2}$'),
  CONSTRAINT "customer_address_phone_e164_check"
    CHECK ("phone_e164" IS NULL OR "phone_e164" ~ '^\+[1-9][0-9]{6,14}$'),
  CONSTRAINT "customer_address_coordinates_pair_check"
    CHECK (("latitude" IS NULL) = ("longitude" IS NULL)),
  CONSTRAINT "customer_address_latitude_check"
    CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
  CONSTRAINT "customer_address_longitude_check"
    CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180),
  CONSTRAINT "customer_address_validation_timestamp_check"
    CHECK ("validation_status" = 'unvalidated' OR "validated_at" IS NOT NULL),
  CONSTRAINT "customer_address_deleted_at_check"
    CHECK ("deleted_at" IS NULL OR "deleted_at" >= "created_at")
);

CREATE UNIQUE INDEX "customer_address_default_shipping_unique"
  ON "customers"."customer_address" ("customer_id")
  WHERE "is_default_shipping" = true AND "deleted_at" IS NULL;

CREATE UNIQUE INDEX "customer_address_default_billing_unique"
  ON "customers"."customer_address" ("customer_id")
  WHERE "is_default_billing" = true AND "deleted_at" IS NULL;

CREATE INDEX "customer_address_store_customer_idx"
  ON "customers"."customer_address" ("store_id", "customer_id", "created_at", "id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_address_customer_idx"
  ON "customers"."customer_address" ("customer_id");

CREATE INDEX "customer_address_store_geography_idx"
  ON "customers"."customer_address" ("store_id", "country_code", "region_code", "city")
  WHERE "deleted_at" IS NULL;

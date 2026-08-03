-- Up Migration

CREATE FUNCTION "orders"."prevent_pii_unredaction"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD."redacted_at" IS NOT NULL
     AND NEW."redacted_at" IS DISTINCT FROM OLD."redacted_at" THEN
    RAISE EXCEPTION 'Redacted PII in % cannot be restored', TG_TABLE_NAME
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TABLE "orders"."order_contacts" (
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "type" "orders"."order_address_type" NOT NULL,
  "first_name" text,
  "last_name" text,
  "middle_name" text,
  "email" text,
  "phone_e164" text,
  "customer_note" text,
  "country_code" varchar(2),
  "email_hash" bytea,
  "phone_hash" bytea,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "expires_at" timestamp with time zone,
  "redacted_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_contacts_pkey" PRIMARY KEY ("store_id", "order_id"),
  CONSTRAINT "order_contacts_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_contacts_country_code_check" CHECK (
    "country_code" IS NULL OR "country_code" ~ '^[A-Z]{2}$'
  ),
  CONSTRAINT "order_contacts_retention_check" CHECK (
    ("expires_at" IS NULL OR "expires_at" >= "created_at")
    AND ("redacted_at" IS NULL OR "redacted_at" >= "created_at")
  ),
  CONSTRAINT "order_contacts_redaction_check" CHECK (
    "redacted_at" IS NULL OR (
      "first_name" IS NULL
      AND "last_name" IS NULL
      AND "middle_name" IS NULL
      AND "email" IS NULL
      AND "phone_e164" IS NULL
      AND "customer_note" IS NULL
      AND "email_hash" IS NULL
      AND "phone_hash" IS NULL
      AND "metadata" = '{}'::jsonb
    )
  )
);

CREATE INDEX "order_contacts_expiry_idx"
  ON "orders"."order_contacts" ("expires_at")
  WHERE "expires_at" IS NOT NULL AND "redacted_at" IS NULL;

CREATE INDEX "order_contacts_store_email_hash_idx"
  ON "orders"."order_contacts" ("store_id", "email_hash")
  WHERE "email_hash" IS NOT NULL AND "redacted_at" IS NULL;

CREATE INDEX "order_contacts_store_phone_hash_idx"
  ON "orders"."order_contacts" ("store_id", "phone_hash")
  WHERE "phone_hash" IS NOT NULL AND "redacted_at" IS NULL;

CREATE TRIGGER "order_contacts_touch_updated_at"
BEFORE UPDATE ON "orders"."order_contacts"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TRIGGER "order_contacts_prevent_unredaction"
BEFORE UPDATE ON "orders"."order_contacts"
FOR EACH ROW
EXECUTE FUNCTION "orders"."prevent_pii_unredaction"();

CREATE TABLE "orders"."order_addresses" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "address1" text,
  "address2" text,
  "city" text,
  "country_code" varchar(2),
  "province_code" text,
  "postal_code" text,
  "company" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "expires_at" timestamp with time zone,
  "redacted_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_addresses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_addresses_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_addresses_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_addresses_country_code_check" CHECK (
    "country_code" IS NULL OR "country_code" ~ '^[A-Z]{2}$'
  ),
  CONSTRAINT "order_addresses_retention_check" CHECK (
    ("expires_at" IS NULL OR "expires_at" >= "created_at")
    AND ("redacted_at" IS NULL OR "redacted_at" >= "created_at")
  ),
  CONSTRAINT "order_addresses_redaction_check" CHECK (
    "redacted_at" IS NULL OR (
      "address1" IS NULL
      AND "address2" IS NULL
      AND "city" IS NULL
      AND "province_code" IS NULL
      AND "postal_code" IS NULL
      AND "company" IS NULL
      AND "metadata" = '{}'::jsonb
    )
  )
);

CREATE INDEX "order_addresses_store_order_idx"
  ON "orders"."order_addresses" ("store_id", "order_id", "id");

CREATE UNIQUE INDEX "order_addresses_one_billing_idx"
  ON "orders"."order_addresses" ("store_id", "order_id")
  WHERE "type" = 'BILLING';

CREATE INDEX "order_addresses_expiry_idx"
  ON "orders"."order_addresses" ("expires_at")
  WHERE "expires_at" IS NOT NULL AND "redacted_at" IS NULL;

CREATE TRIGGER "order_addresses_touch_updated_at"
BEFORE UPDATE ON "orders"."order_addresses"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TRIGGER "order_addresses_prevent_unredaction"
BEFORE UPDATE ON "orders"."order_addresses"
FOR EACH ROW
EXECUTE FUNCTION "orders"."prevent_pii_unredaction"();

CREATE TABLE "orders"."order_recipients" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "first_name" text,
  "last_name" text,
  "middle_name" text,
  "email" text,
  "phone" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "expires_at" timestamp with time zone,
  "redacted_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_recipients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_recipients_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_recipients_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_recipients_retention_check" CHECK (
    ("expires_at" IS NULL OR "expires_at" >= "created_at")
    AND ("redacted_at" IS NULL OR "redacted_at" >= "created_at")
  ),
  CONSTRAINT "order_recipients_redaction_check" CHECK (
    "redacted_at" IS NULL OR (
      "first_name" IS NULL
      AND "last_name" IS NULL
      AND "middle_name" IS NULL
      AND "email" IS NULL
      AND "phone" IS NULL
      AND "metadata" = '{}'::jsonb
    )
  )
);

CREATE INDEX "order_recipients_store_order_idx"
  ON "orders"."order_recipients" ("store_id", "order_id", "id");

CREATE INDEX "order_recipients_expiry_idx"
  ON "orders"."order_recipients" ("expires_at")
  WHERE "expires_at" IS NOT NULL AND "redacted_at" IS NULL;

CREATE TRIGGER "order_recipients_touch_updated_at"
BEFORE UPDATE ON "orders"."order_recipients"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TRIGGER "order_recipients_prevent_unredaction"
BEFORE UPDATE ON "orders"."order_recipients"
FOR EACH ROW
EXECUTE FUNCTION "orders"."prevent_pii_unredaction"();

-- Up Migration
CREATE SCHEMA IF NOT EXISTS "orders";

CREATE TABLE "orders"."orders" (
  "id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "order_number" bigint NOT NULL,
  "api_key_id" uuid,
  "user_id" uuid,
  "sales_channel" varchar(32),
  "external_source" text,
  "external_id" text,
  "locale_code" varchar(16),
  "currency_code" varchar(3) NOT NULL,
  "subtotal" bigint NOT NULL CHECK ("subtotal" >= 0),
  "shipping_total" bigint NOT NULL CHECK ("shipping_total" >= 0),
  "discount_total" bigint NOT NULL CHECK ("discount_total" >= 0),
  "tax_total" bigint NOT NULL CHECK ("tax_total" >= 0),
  "grand_total" bigint NOT NULL CHECK ("grand_total" >= 0),
  "status" varchar(255) NOT NULL,
  "placed_at" timestamptz,
  "closed_at" timestamptz,
  "expires_at" timestamptz,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "checkout_snapshot" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "orders_store_number_unique" UNIQUE ("store_id", "order_number")
);

CREATE INDEX "orders_store_created_at_idx"
  ON "orders"."orders" ("store_id", "created_at" DESC);

CREATE TABLE "orders"."order_number_counters" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL UNIQUE,
  "last_number" bigint NOT NULL CHECK ("last_number" >= 0),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "orders"."order_items" (
  "id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"."orders" ("id") ON DELETE CASCADE,
  "quantity" integer NOT NULL CHECK ("quantity" > 0),
  "subtotal_amount" bigint NOT NULL CHECK ("subtotal_amount" >= 0),
  "discount_amount" bigint NOT NULL CHECK ("discount_amount" >= 0),
  "tax_amount" bigint NOT NULL CHECK ("tax_amount" >= 0),
  "total_amount" bigint NOT NULL CHECK ("total_amount" >= 0),
  "unit_id" text,
  "unit_title" text,
  "unit_price" bigint,
  "unit_compare_at_price" bigint,
  "unit_sku" text,
  "unit_image_url" text,
  "unit_snapshot" jsonb,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

CREATE INDEX "order_items_order_id_idx"
  ON "orders"."order_items" ("order_id");

CREATE TABLE "orders"."order_delivery_addresses" (
  "id" uuid PRIMARY KEY,
  "address1" text,
  "address2" text,
  "city" text,
  "country_code" varchar(2),
  "province_code" text,
  "postal_code" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "orders"."order_recipients" (
  "id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "first_name" text,
  "last_name" text,
  "middle_name" text,
  "email" text,
  "phone" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "order_recipients_store_id_idx"
  ON "orders"."order_recipients" ("store_id");

CREATE TABLE "orders"."orders_pii_records" (
  "store_id" uuid NOT NULL,
  "order_id" uuid PRIMARY KEY REFERENCES "orders"."orders" ("id") ON DELETE CASCADE,
  "first_name" text,
  "last_name" text,
  "middle_name" text,
  "customer_id" uuid,
  "customer_email" text,
  "customer_phone_e164" text,
  "customer_note" text,
  "country_code" varchar(2),
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "orders_pii_records_store_id_idx"
  ON "orders"."orders_pii_records" ("store_id");

CREATE TABLE "orders"."order_delivery_groups" (
  "id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"."orders" ("id") ON DELETE CASCADE,
  "address_id" uuid REFERENCES "orders"."order_delivery_addresses" ("id") ON DELETE SET NULL,
  "recipient_id" uuid REFERENCES "orders"."order_recipients" ("id") ON DELETE SET NULL,
  "selected_delivery_method_code" text,
  "selected_delivery_method_provider" text,
  "line_item_ids" uuid[] NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "order_delivery_groups_order_id_idx"
  ON "orders"."order_delivery_groups" ("order_id");

CREATE TABLE "orders"."order_delivery_methods" (
  "code" text NOT NULL,
  "provider" text NOT NULL,
  "store_id" uuid NOT NULL,
  "delivery_group_id" uuid NOT NULL,
  "delivery_method_type" varchar(32),
  "payment_model" varchar(32),
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "customer_input" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("code", "provider", "delivery_group_id"),
  CONSTRAINT "order_delivery_methods_group_fk"
    FOREIGN KEY ("delivery_group_id")
    REFERENCES "orders"."order_delivery_groups" ("id")
    ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);

ALTER TABLE "orders"."order_delivery_groups"
  ADD CONSTRAINT "order_delivery_groups_selected_method_fk"
  FOREIGN KEY (
    "selected_delivery_method_code",
    "selected_delivery_method_provider",
    "id"
  ) REFERENCES "orders"."order_delivery_methods" (
    "code",
    "provider",
    "delivery_group_id"
  ) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE "orders"."order_payment_methods" (
  "order_id" uuid NOT NULL REFERENCES "orders"."orders" ("id") ON DELETE CASCADE,
  "store_id" uuid NOT NULL,
  "code" text NOT NULL,
  "provider" text NOT NULL,
  "flow" varchar(32) NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "customer_input" jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY ("order_id", "code", "provider")
);

CREATE TABLE "orders"."order_selected_payment_methods" (
  "order_id" uuid PRIMARY KEY REFERENCES "orders"."orders" ("id") ON DELETE CASCADE,
  "store_id" uuid NOT NULL,
  "code" text NOT NULL,
  "provider" text NOT NULL,
  CONSTRAINT "order_selected_payment_method_fk"
    FOREIGN KEY ("order_id", "code", "provider")
    REFERENCES "orders"."order_payment_methods" ("order_id", "code", "provider")
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE "orders"."order_applied_discounts" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "order_id" uuid NOT NULL REFERENCES "orders"."orders" ("id") ON DELETE CASCADE,
  "store_id" uuid NOT NULL,
  "code" text,
  "discount_type" varchar(32),
  "value" bigint NOT NULL CHECK ("value" >= 0),
  "provider" text,
  "conditions" jsonb,
  "applied_at" timestamptz
);

CREATE INDEX "order_applied_discounts_order_id_idx"
  ON "orders"."order_applied_discounts" ("order_id");

CREATE TABLE "orders"."idempotency" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "response" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL,
  CONSTRAINT "orders_idempotency_store_key_unique" UNIQUE ("store_id", "idempotency_key")
);

CREATE INDEX "orders_idempotency_expires_at_idx"
  ON "orders"."idempotency" ("expires_at");

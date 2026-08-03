-- Up Migration

CREATE TABLE "orders"."order_lines" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "parent_line_id" uuid,
  "purchasable_id" text NOT NULL,
  "purchasable_type" varchar(64) NOT NULL DEFAULT 'VARIANT',
  "title" text NOT NULL,
  "sku" text,
  "image_url" text,
  "quantity" integer NOT NULL,
  "cancelled_quantity" integer NOT NULL DEFAULT 0,
  "requires_shipping" boolean NOT NULL DEFAULT true,
  "taxable" boolean NOT NULL DEFAULT true,
  "unit_price_amount" bigint NOT NULL,
  "unit_compare_at_price_amount" bigint,
  "subtotal_amount" bigint NOT NULL,
  "discount_amount" bigint NOT NULL DEFAULT 0,
  "tax_amount" bigint NOT NULL DEFAULT 0,
  "duty_amount" bigint NOT NULL DEFAULT 0,
  "total_amount" bigint NOT NULL,
  "purchasable_snapshot" jsonb NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_lines_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_lines_order_currency_fk"
    FOREIGN KEY ("store_id", "order_id", "currency_code")
    REFERENCES "orders"."orders" ("store_id", "id", "currency_code"),
  CONSTRAINT "order_lines_parent_fk"
    FOREIGN KEY ("store_id", "order_id", "parent_line_id")
    REFERENCES "orders"."order_lines" ("store_id", "order_id", "id"),
  CONSTRAINT "order_lines_currency_code_check" CHECK ("currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "order_lines_purchasable_snapshot_check" CHECK (
    jsonb_typeof("purchasable_snapshot") = 'object'
  ),
  CONSTRAINT "order_lines_metadata_check" CHECK (jsonb_typeof("metadata") = 'object'),
  CONSTRAINT "order_lines_quantity_check" CHECK (
    "quantity" > 0
    AND "cancelled_quantity" >= 0
    AND "cancelled_quantity" <= "quantity"
  ),
  CONSTRAINT "order_lines_unit_amounts_check" CHECK (
    "unit_price_amount" >= 0
    AND ("unit_compare_at_price_amount" IS NULL OR "unit_compare_at_price_amount" >= 0)
  ),
  CONSTRAINT "order_lines_amounts_non_negative_check" CHECK (
    "subtotal_amount" >= 0
    AND "discount_amount" >= 0
    AND "tax_amount" >= 0
    AND "duty_amount" >= 0
    AND "total_amount" >= 0
  ),
  CONSTRAINT "order_lines_subtotal_formula_check" CHECK (
    "subtotal_amount" = "unit_price_amount" * "quantity"
  ),
  CONSTRAINT "order_lines_total_formula_check" CHECK (
    "total_amount" =
      "subtotal_amount" - "discount_amount" + "tax_amount" + "duty_amount"
  )
);

CREATE INDEX "order_lines_store_order_idx"
  ON "orders"."order_lines" ("store_id", "order_id", "created_at", "id");

CREATE INDEX "order_lines_store_purchasable_idx"
  ON "orders"."order_lines" ("store_id", "purchasable_type", "purchasable_id");

CREATE INDEX "order_lines_parent_idx"
  ON "orders"."order_lines" ("store_id", "order_id", "parent_line_id")
  WHERE "parent_line_id" IS NOT NULL;

CREATE TRIGGER "order_lines_touch_updated_at"
BEFORE UPDATE ON "orders"."order_lines"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

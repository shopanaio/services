-- Up Migration

CREATE TABLE "orders"."order_delivery_methods" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "delivery_group_id" uuid NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "code" text NOT NULL,
  "provider" text NOT NULL,
  "title" text,
  "type" "orders"."order_delivery_method_type" NOT NULL,
  "payment_model" "orders"."order_shipping_payment_model",
  "quoted_amount" bigint NOT NULL DEFAULT 0,
  "is_selected" boolean NOT NULL DEFAULT false,
  "provider_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "customer_input_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_delivery_methods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_delivery_methods_store_order_group_id_id_unique"
    UNIQUE ("store_id", "order_id", "delivery_group_id", "id"),
  CONSTRAINT "order_delivery_methods_group_fk"
    FOREIGN KEY ("store_id", "order_id", "delivery_group_id")
    REFERENCES "orders"."order_delivery_groups" ("store_id", "order_id", "id"),
  CONSTRAINT "order_delivery_methods_order_currency_fk"
    FOREIGN KEY ("store_id", "order_id", "currency_code")
    REFERENCES "orders"."orders" ("store_id", "id", "currency_code"),
  CONSTRAINT "order_delivery_methods_quoted_amount_check" CHECK ("quoted_amount" >= 0),
  CONSTRAINT "order_delivery_methods_code_provider_check" CHECK (
    btrim("code") <> '' AND btrim("provider") <> ''
  ),
  CONSTRAINT "order_delivery_methods_business_key"
    UNIQUE ("store_id", "order_id", "delivery_group_id", "code", "provider")
);

CREATE UNIQUE INDEX "order_delivery_methods_one_selected_idx"
  ON "orders"."order_delivery_methods" ("store_id", "order_id", "delivery_group_id")
  WHERE "is_selected" = true;

CREATE INDEX "order_delivery_methods_group_idx"
  ON "orders"."order_delivery_methods" ("store_id", "order_id", "delivery_group_id", "id");

CREATE TRIGGER "order_delivery_methods_touch_updated_at"
BEFORE UPDATE ON "orders"."order_delivery_methods"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_delivery_discount_allocations" (
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "discount_application_id" uuid NOT NULL,
  "delivery_group_id" uuid NOT NULL,
  "amount" bigint NOT NULL,
  CONSTRAINT "order_delivery_discount_allocations_pkey"
    PRIMARY KEY ("store_id", "order_id", "discount_application_id", "delivery_group_id"),
  CONSTRAINT "order_delivery_discount_allocations_application_fk"
    FOREIGN KEY ("store_id", "order_id", "discount_application_id")
    REFERENCES "orders"."order_discount_applications" ("store_id", "order_id", "id"),
  CONSTRAINT "order_delivery_discount_allocations_group_fk"
    FOREIGN KEY ("store_id", "order_id", "delivery_group_id")
    REFERENCES "orders"."order_delivery_groups" ("store_id", "order_id", "id"),
  CONSTRAINT "order_delivery_discount_allocations_amount_check" CHECK ("amount" >= 0)
);

CREATE INDEX "order_delivery_discount_allocations_group_idx"
  ON "orders"."order_delivery_discount_allocations" (
    "store_id", "order_id", "delivery_group_id"
  );

CREATE TABLE "orders"."order_delivery_tax_lines" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "delivery_group_id" uuid NOT NULL,
  "title" text NOT NULL,
  "source" text,
  "jurisdiction_code" text,
  "rate" numeric(20, 10),
  "amount" bigint NOT NULL,
  "channel_liable" boolean,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "order_delivery_tax_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_delivery_tax_lines_group_fk"
    FOREIGN KEY ("store_id", "order_id", "delivery_group_id")
    REFERENCES "orders"."order_delivery_groups" ("store_id", "order_id", "id"),
  CONSTRAINT "order_delivery_tax_lines_rate_check" CHECK ("rate" IS NULL OR "rate" >= 0),
  CONSTRAINT "order_delivery_tax_lines_amount_check" CHECK ("amount" >= 0)
);

CREATE INDEX "order_delivery_tax_lines_group_idx"
  ON "orders"."order_delivery_tax_lines" ("store_id", "order_id", "delivery_group_id");

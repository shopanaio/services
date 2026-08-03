-- Up Migration

CREATE TABLE "orders"."order_delivery_groups" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "status" "orders"."order_delivery_group_status" NOT NULL DEFAULT 'OPEN',
  "address_id" uuid,
  "recipient_id" uuid,
  "requires_shipping" boolean NOT NULL DEFAULT true,
  "subtotal_amount" bigint NOT NULL DEFAULT 0,
  "discount_amount" bigint NOT NULL DEFAULT 0,
  "tax_amount" bigint NOT NULL DEFAULT 0,
  "total_amount" bigint NOT NULL DEFAULT 0,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_delivery_groups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_delivery_groups_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_delivery_groups_order_currency_fk"
    FOREIGN KEY ("store_id", "order_id", "currency_code")
    REFERENCES "orders"."orders" ("store_id", "id", "currency_code"),
  CONSTRAINT "order_delivery_groups_address_fk"
    FOREIGN KEY ("store_id", "order_id", "address_id")
    REFERENCES "orders"."order_addresses" ("store_id", "order_id", "id"),
  CONSTRAINT "order_delivery_groups_recipient_fk"
    FOREIGN KEY ("store_id", "order_id", "recipient_id")
    REFERENCES "orders"."order_recipients" ("store_id", "order_id", "id"),
  CONSTRAINT "order_delivery_groups_amounts_check" CHECK (
    "subtotal_amount" >= 0
    AND "discount_amount" >= 0
    AND "tax_amount" >= 0
    AND "total_amount" >= 0
  ),
  CONSTRAINT "order_delivery_groups_total_formula_check" CHECK (
    "total_amount" = "subtotal_amount" - "discount_amount" + "tax_amount"
  )
);

CREATE INDEX "order_delivery_groups_store_order_idx"
  ON "orders"."order_delivery_groups" ("store_id", "order_id", "created_at", "id");

CREATE INDEX "order_delivery_groups_store_status_idx"
  ON "orders"."order_delivery_groups" ("store_id", "status", "updated_at" DESC);

CREATE TRIGGER "order_delivery_groups_touch_updated_at"
BEFORE UPDATE ON "orders"."order_delivery_groups"
FOR EACH ROW
EXECUTE FUNCTION "orders"."touch_updated_at"();

CREATE TABLE "orders"."order_delivery_group_lines" (
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "delivery_group_id" uuid NOT NULL,
  "order_line_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  CONSTRAINT "order_delivery_group_lines_pkey"
    PRIMARY KEY ("store_id", "order_id", "delivery_group_id", "order_line_id"),
  CONSTRAINT "order_delivery_group_lines_group_fk"
    FOREIGN KEY ("store_id", "order_id", "delivery_group_id")
    REFERENCES "orders"."order_delivery_groups" ("store_id", "order_id", "id"),
  CONSTRAINT "order_delivery_group_lines_line_fk"
    FOREIGN KEY ("store_id", "order_id", "order_line_id")
    REFERENCES "orders"."order_lines" ("store_id", "order_id", "id"),
  CONSTRAINT "order_delivery_group_lines_quantity_check" CHECK ("quantity" > 0)
);

CREATE INDEX "order_delivery_group_lines_line_idx"
  ON "orders"."order_delivery_group_lines" ("store_id", "order_id", "order_line_id");

-- Up Migration

CREATE TABLE "orders"."order_discount_applications" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "currency_code" varchar(3) NOT NULL,
  "target_type" "orders"."order_discount_target_type" NOT NULL,
  "value_type" "orders"."order_discount_value_type" NOT NULL,
  "code" text,
  "title" text NOT NULL,
  "provider" text,
  "value_percentage" numeric(20, 10),
  "value_amount" bigint,
  "total_allocated_amount" bigint NOT NULL DEFAULT 0,
  "conditions" jsonb,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "applied_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_discount_applications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_discount_applications_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_discount_applications_order_currency_fk"
    FOREIGN KEY ("store_id", "order_id", "currency_code")
    REFERENCES "orders"."orders" ("store_id", "id", "currency_code"),
  CONSTRAINT "order_discount_applications_value_check" CHECK (
    (
      "value_type" = 'PERCENTAGE'
      AND "value_percentage" IS NOT NULL
      AND "value_percentage" > 0
      AND "value_percentage" <= 100
      AND "value_amount" IS NULL
    ) OR (
      "value_type" = 'FIXED_AMOUNT'
      AND "value_amount" IS NOT NULL
      AND "value_amount" > 0
      AND "value_percentage" IS NULL
    ) OR (
      "value_type" = 'FREE_SHIPPING'
      AND "target_type" = 'DELIVERY'
      AND "value_percentage" IS NULL
      AND "value_amount" IS NULL
    )
  ),
  CONSTRAINT "order_discount_applications_allocated_check" CHECK (
    "total_allocated_amount" >= 0
  )
);

CREATE INDEX "order_discount_applications_store_order_idx"
  ON "orders"."order_discount_applications" ("store_id", "order_id", "applied_at", "id");

CREATE INDEX "order_discount_applications_store_code_idx"
  ON "orders"."order_discount_applications" ("store_id", "code")
  WHERE "code" IS NOT NULL;

CREATE TABLE "orders"."order_line_discount_allocations" (
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "discount_application_id" uuid NOT NULL,
  "order_line_id" uuid NOT NULL,
  "amount" bigint NOT NULL,
  CONSTRAINT "order_line_discount_allocations_pkey"
    PRIMARY KEY ("store_id", "order_id", "discount_application_id", "order_line_id"),
  CONSTRAINT "order_line_discount_allocations_application_fk"
    FOREIGN KEY ("store_id", "order_id", "discount_application_id")
    REFERENCES "orders"."order_discount_applications" ("store_id", "order_id", "id"),
  CONSTRAINT "order_line_discount_allocations_line_fk"
    FOREIGN KEY ("store_id", "order_id", "order_line_id")
    REFERENCES "orders"."order_lines" ("store_id", "order_id", "id"),
  CONSTRAINT "order_line_discount_allocations_amount_check" CHECK ("amount" >= 0)
);

CREATE INDEX "order_line_discount_allocations_line_idx"
  ON "orders"."order_line_discount_allocations" ("store_id", "order_id", "order_line_id");

CREATE TABLE "orders"."order_line_tax_lines" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "order_line_id" uuid NOT NULL,
  "title" text NOT NULL,
  "source" text,
  "jurisdiction_code" text,
  "rate" numeric(20, 10),
  "amount" bigint NOT NULL,
  "channel_liable" boolean,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "order_line_tax_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_line_tax_lines_store_order_id_id_unique"
    UNIQUE ("store_id", "order_id", "id"),
  CONSTRAINT "order_line_tax_lines_line_fk"
    FOREIGN KEY ("store_id", "order_id", "order_line_id")
    REFERENCES "orders"."order_lines" ("store_id", "order_id", "id"),
  CONSTRAINT "order_line_tax_lines_rate_check" CHECK ("rate" IS NULL OR "rate" >= 0),
  CONSTRAINT "order_line_tax_lines_amount_check" CHECK ("amount" >= 0)
);

CREATE INDEX "order_line_tax_lines_line_idx"
  ON "orders"."order_line_tax_lines" ("store_id", "order_id", "order_line_id");

CREATE TABLE "orders"."order_line_duties" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "order_line_id" uuid NOT NULL,
  "title" text NOT NULL,
  "source" text,
  "country_code" varchar(2),
  "amount" bigint NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "order_line_duties_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_line_duties_line_fk"
    FOREIGN KEY ("store_id", "order_id", "order_line_id")
    REFERENCES "orders"."order_lines" ("store_id", "order_id", "id"),
  CONSTRAINT "order_line_duties_country_code_check" CHECK (
    "country_code" IS NULL OR "country_code" ~ '^[A-Z]{2}$'
  ),
  CONSTRAINT "order_line_duties_amount_check" CHECK ("amount" >= 0)
);

CREATE INDEX "order_line_duties_line_idx"
  ON "orders"."order_line_duties" ("store_id", "order_id", "order_line_id");

CREATE TABLE "orders"."order_adjustments" (
  "id" uuid NOT NULL DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "type" "orders"."order_adjustment_type" NOT NULL,
  "amount" bigint NOT NULL,
  "reason" text NOT NULL,
  "source" text,
  "source_reference" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "order_adjustments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_adjustments_order_fk"
    FOREIGN KEY ("store_id", "order_id")
    REFERENCES "orders"."orders" ("store_id", "id"),
  CONSTRAINT "order_adjustments_amount_check" CHECK (
    ("type" = 'FEE' AND "amount" > 0)
    OR ("type" = 'CREDIT' AND "amount" < 0)
    OR ("type" IN ('ROUNDING', 'CORRECTION', 'OTHER') AND "amount" <> 0)
  )
);

CREATE UNIQUE INDEX "order_adjustments_source_key"
  ON "orders"."order_adjustments" (
    "store_id", "order_id", "source", "source_reference"
  )
  WHERE "source" IS NOT NULL AND "source_reference" IS NOT NULL;

CREATE INDEX "order_adjustments_store_order_idx"
  ON "orders"."order_adjustments" ("store_id", "order_id", "created_at", "id");

-- Up Migration

CREATE TABLE "pricing"."discount_amount_off" (
  "discount_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "operation" "pricing"."price_adjustment_operation" NOT NULL,
  "value_type" "pricing"."price_adjustment_value_type" NOT NULL,
  "percentage_bps" smallint,
  "amount_minor" bigint,
  "allocation_method" "pricing"."discount_allocation_method" NOT NULL DEFAULT 'ACROSS',
  "maximum_discount_minor" bigint,

  CONSTRAINT "discount_amount_off_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "discount_amount_off_operation_check"
    CHECK ("operation" = 'DECREASE'),
  CONSTRAINT "discount_amount_off_value_check"
    CHECK (
      (
        "value_type" = 'PERCENTAGE'
        AND "percentage_bps" BETWEEN 1 AND 10000
        AND "amount_minor" IS NULL
      )
      OR (
        "value_type" = 'FIXED_AMOUNT'
        AND "percentage_bps" IS NULL
        AND "amount_minor" > 0
      )
    ),
  CONSTRAINT "discount_amount_off_maximum_check"
    CHECK ("maximum_discount_minor" IS NULL OR "maximum_discount_minor" > 0)
);

CREATE INDEX "discount_amount_off_store_idx"
  ON "pricing"."discount_amount_off" ("store_id", "discount_id");

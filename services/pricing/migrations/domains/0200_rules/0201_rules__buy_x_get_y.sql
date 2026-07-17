-- Up Migration

CREATE TABLE "pricing"."discount_buy_x_get_y" (
  "discount_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "requirement_type" "pricing"."discount_requirement_type" NOT NULL,
  "required_quantity" integer,
  "required_subtotal_minor" bigint,
  "benefit_quantity" integer NOT NULL,
  "benefit_value_type" "pricing"."discount_value_type" NOT NULL,
  "benefit_percentage_bps" smallint,
  "benefit_amount_minor" bigint,
  "uses_per_order_limit" integer,

  CONSTRAINT "discount_buy_x_get_y_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "discount_buy_x_get_y_requirement_check"
    CHECK (
      (
        "requirement_type" = 'QUANTITY'
        AND "required_quantity" > 0
        AND "required_subtotal_minor" IS NULL
      )
      OR (
        "requirement_type" = 'SUBTOTAL'
        AND "required_quantity" IS NULL
        AND "required_subtotal_minor" > 0
      )
    ),
  CONSTRAINT "discount_buy_x_get_y_benefit_quantity_check"
    CHECK ("benefit_quantity" > 0),
  CONSTRAINT "discount_buy_x_get_y_benefit_check"
    CHECK (
      (
        "benefit_value_type" = 'PERCENTAGE'
        AND "benefit_percentage_bps" BETWEEN 1 AND 10000
        AND "benefit_amount_minor" IS NULL
      )
      OR (
        "benefit_value_type" = 'FIXED_AMOUNT'
        AND "benefit_percentage_bps" IS NULL
        AND "benefit_amount_minor" > 0
      )
      OR (
        "benefit_value_type" = 'FREE'
        AND "benefit_percentage_bps" IS NULL
        AND "benefit_amount_minor" IS NULL
      )
    ),
  CONSTRAINT "discount_buy_x_get_y_uses_per_order_check"
    CHECK ("uses_per_order_limit" IS NULL OR "uses_per_order_limit" > 0)
);

CREATE INDEX "discount_buy_x_get_y_store_idx"
  ON "pricing"."discount_buy_x_get_y" ("store_id", "discount_id");

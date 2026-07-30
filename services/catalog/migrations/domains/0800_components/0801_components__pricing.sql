-- Up Migration

CREATE TYPE "catalog"."price_adjustment_operation" AS ENUM (
  'DECREASE',
  'INCREASE'
);

CREATE TYPE "catalog"."price_adjustment_value_type" AS ENUM (
  'PERCENTAGE',
  'FIXED_AMOUNT'
);

CREATE TYPE "catalog"."component_price_strategy" AS ENUM (
  'BASE',
  'ADJUSTMENT',
  'OVERRIDE',
  'FREE'
);

CREATE TABLE "catalog"."component_price_rule" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "strategy" "catalog"."component_price_strategy" NOT NULL,
  "operation" "catalog"."price_adjustment_operation",
  "value_type" "catalog"."price_adjustment_value_type",
  CONSTRAINT "component_price_rule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "component_price_rule_configuration_id_fk"
    FOREIGN KEY ("configuration_id")
    REFERENCES "catalog"."component_configuration" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "component_price_rule_shape_check"
    CHECK (
      (
        "strategy" = 'ADJUSTMENT'
        AND "operation" IS NOT NULL
        AND "value_type" IS NOT NULL
      )
      OR (
        "strategy" IN ('BASE', 'OVERRIDE', 'FREE')
        AND "operation" IS NULL
        AND "value_type" IS NULL
      )
    )
);

CREATE INDEX "idx_component_price_rule_configuration_id"
  ON "catalog"."component_price_rule" ("configuration_id");

CREATE TABLE "catalog"."component_price_rule_amount" (
  "store_id" uuid NOT NULL,
  "price_rule_id" uuid NOT NULL,
  "currency" "catalog"."currency_code" NOT NULL,
  "amount_minor" bigint NOT NULL,
  CONSTRAINT "component_price_rule_amount_pkey"
    PRIMARY KEY ("price_rule_id", "currency"),
  CONSTRAINT "component_price_rule_amount_price_rule_id_fk"
    FOREIGN KEY ("price_rule_id")
    REFERENCES "catalog"."component_price_rule" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "component_price_rule_amount_minor_check"
    CHECK ("amount_minor" > 0)
);

CREATE INDEX "idx_component_price_rule_amount_store_currency"
  ON "catalog"."component_price_rule_amount" ("store_id", "currency");

CREATE TABLE "catalog"."component_price_rule_percent" (
  "store_id" uuid NOT NULL,
  "price_rule_id" uuid NOT NULL,
  "percentage_bps" smallint NOT NULL,
  CONSTRAINT "component_price_rule_percent_pkey" PRIMARY KEY ("price_rule_id"),
  CONSTRAINT "component_price_rule_percent_price_rule_id_fk"
    FOREIGN KEY ("price_rule_id")
    REFERENCES "catalog"."component_price_rule" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "component_price_rule_percentage_bps_check"
    CHECK ("percentage_bps" BETWEEN 1 AND 10000)
);

CREATE INDEX "idx_component_price_rule_percent_store_id"
  ON "catalog"."component_price_rule_percent" ("store_id");

CREATE TABLE "catalog"."component_pricing_template" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "price_rule_id" uuid NOT NULL,
  "sort_index" integer NOT NULL DEFAULT 0,
  CONSTRAINT "component_pricing_template_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "component_pricing_template_configuration_id_fk"
    FOREIGN KEY ("configuration_id")
    REFERENCES "catalog"."component_configuration" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "component_pricing_template_price_rule_id_fk"
    FOREIGN KEY ("price_rule_id")
    REFERENCES "catalog"."component_price_rule" ("id")
    ON DELETE RESTRICT
);

CREATE INDEX "idx_component_pricing_template_configuration_id"
  ON "catalog"."component_pricing_template" ("configuration_id");

CREATE INDEX "idx_component_pricing_template_price_rule_id"
  ON "catalog"."component_pricing_template" ("price_rule_id");

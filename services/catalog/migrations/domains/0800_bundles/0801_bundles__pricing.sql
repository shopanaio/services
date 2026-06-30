-- Up Migration

CREATE TABLE "catalog"."bundle_price_rule" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "price_type" varchar(32) NOT NULL,
  CONSTRAINT "bundle_price_rule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bundle_price_rule_configuration_id_fk"
    FOREIGN KEY ("configuration_id")
    REFERENCES "catalog"."bundle_configuration" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_bundle_price_rule_configuration_id"
  ON "catalog"."bundle_price_rule" ("configuration_id");

CREATE TABLE "catalog"."bundle_price_rule_amount" (
  "project_id" uuid NOT NULL,
  "price_rule_id" uuid NOT NULL,
  "currency" "catalog"."currency" NOT NULL,
  "amount_minor" bigint NOT NULL,
  CONSTRAINT "bundle_price_rule_amount_pkey" PRIMARY KEY ("price_rule_id", "currency"),
  CONSTRAINT "bundle_price_rule_amount_price_rule_id_fk"
    FOREIGN KEY ("price_rule_id")
    REFERENCES "catalog"."bundle_price_rule" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "bundle_price_rule_amount_minor_check" CHECK ("amount_minor" >= 0)
);

CREATE INDEX "idx_bundle_price_rule_amount_project_currency"
  ON "catalog"."bundle_price_rule_amount" ("project_id", "currency");

CREATE TABLE "catalog"."bundle_price_rule_percent" (
  "project_id" uuid NOT NULL,
  "price_rule_id" uuid NOT NULL,
  "percent_value" integer NOT NULL,
  CONSTRAINT "bundle_price_rule_percent_pkey" PRIMARY KEY ("price_rule_id"),
  CONSTRAINT "bundle_price_rule_percent_price_rule_id_fk"
    FOREIGN KEY ("price_rule_id")
    REFERENCES "catalog"."bundle_price_rule" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "bundle_price_rule_percent_value_check"
    CHECK ("percent_value" >= 0 AND "percent_value" <= 100)
);

CREATE INDEX "idx_bundle_price_rule_percent_project_id"
  ON "catalog"."bundle_price_rule_percent" ("project_id");

CREATE TABLE "catalog"."bundle_pricing_template" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "price_rule_id" uuid NOT NULL,
  "sort_index" integer NOT NULL DEFAULT 0,
  CONSTRAINT "bundle_pricing_template_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bundle_pricing_template_configuration_id_fk"
    FOREIGN KEY ("configuration_id")
    REFERENCES "catalog"."bundle_configuration" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "bundle_pricing_template_price_rule_id_fk"
    FOREIGN KEY ("price_rule_id")
    REFERENCES "catalog"."bundle_price_rule" ("id")
    ON DELETE RESTRICT
);

CREATE INDEX "idx_bundle_pricing_template_configuration_id"
  ON "catalog"."bundle_pricing_template" ("configuration_id");

CREATE INDEX "idx_bundle_pricing_template_price_rule_id"
  ON "catalog"."bundle_pricing_template" ("price_rule_id");

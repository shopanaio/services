-- Up Migration

CREATE TABLE "catalog"."product_variant_cost_history" (
  "project_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "currency" "catalog"."currency" NOT NULL,
  "unit_cost_minor" bigint NOT NULL,
  "effective_from" timestamp with time zone NOT NULL DEFAULT now(),
  "effective_to" timestamp with time zone,
  "recorded_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_variant_cost_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_variant_cost_history_unit_cost_minor_check"
    CHECK ("unit_cost_minor" >= 0),
  CONSTRAINT "product_variant_cost_history_effective_interval_check"
    CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from")
);

CREATE INDEX "idx_product_variant_cost_history_variant_currency_effective_from"
  ON "catalog"."product_variant_cost_history" (
    "project_id",
    "variant_id",
    "currency",
    "effective_from"
  );

CREATE INDEX "idx_product_variant_cost_history_variant_effective_from"
  ON "catalog"."product_variant_cost_history" ("project_id", "variant_id", "effective_from");

CREATE INDEX "idx_product_variant_cost_history_recorded_at"
  ON "catalog"."product_variant_cost_history" ("project_id", "recorded_at");

CREATE INDEX "idx_product_variant_cost_history_effective_to"
  ON "catalog"."product_variant_cost_history" ("project_id", "effective_to");

CREATE UNIQUE INDEX "idx_product_variant_cost_history_current_unique"
  ON "catalog"."product_variant_cost_history" ("project_id", "variant_id", "currency")
  WHERE "effective_to" IS NULL;

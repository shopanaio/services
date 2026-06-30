-- Up Migration

CREATE TABLE "catalog"."item_pricing" (
  "project_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "currency" "catalog"."currency" NOT NULL,
  "amount_minor" bigint NOT NULL,
  "compare_at_minor" bigint,
  "effective_from" timestamp with time zone NOT NULL DEFAULT now(),
  "effective_to" timestamp with time zone,
  "recorded_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "item_pricing_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "item_pricing_variant_id_fk"
    FOREIGN KEY ("variant_id")
    REFERENCES "catalog"."variant" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "item_pricing_amount_minor_check" CHECK ("amount_minor" >= 0),
  CONSTRAINT "item_pricing_compare_at_minor_check" CHECK ("compare_at_minor" >= 0),
  CONSTRAINT "item_pricing_effective_interval_check"
    CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from")
);

CREATE INDEX "idx_item_pricing_variant_currency_effective_from"
  ON "catalog"."item_pricing" ("project_id", "variant_id", "currency", "effective_from");

CREATE INDEX "idx_item_pricing_variant_effective_from"
  ON "catalog"."item_pricing" ("project_id", "variant_id", "effective_from");

CREATE INDEX "idx_item_pricing_recorded_at"
  ON "catalog"."item_pricing" ("project_id", "recorded_at");

CREATE INDEX "idx_item_pricing_effective_to"
  ON "catalog"."item_pricing" ("project_id", "effective_to");

CREATE UNIQUE INDEX "idx_item_pricing_current_unique"
  ON "catalog"."item_pricing" ("project_id", "variant_id", "currency")
  WHERE "effective_to" IS NULL;

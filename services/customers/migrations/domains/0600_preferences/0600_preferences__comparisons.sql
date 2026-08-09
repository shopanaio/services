-- Up Migration

CREATE TABLE "customers"."customer_comparison" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "revision" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "customer_comparison_customer_fk"
    FOREIGN KEY ("customer_id")
    REFERENCES "customers"."customer" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_comparison_customer_id_uniq"
    UNIQUE ("customer_id"),
  CONSTRAINT "customer_comparison_revision_nonnegative_check"
    CHECK ("revision" >= 0)
);

CREATE INDEX "customer_comparison_store_customer_idx"
  ON "customers"."customer_comparison" ("store_id", "customer_id");

CREATE TABLE "customers"."customer_comparison_item" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "comparison_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "position" integer NOT NULL,
  "added_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "customer_comparison_item_comparison_fk"
    FOREIGN KEY ("comparison_id")
    REFERENCES "customers"."customer_comparison" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "customer_comparison_item_comparison_variant_uniq"
    UNIQUE ("comparison_id", "variant_id"),
  CONSTRAINT "customer_comparison_item_comparison_position_uniq"
    UNIQUE ("comparison_id", "position"),
  CONSTRAINT "customer_comparison_item_position_nonnegative_check"
    CHECK ("position" >= 0)
);

CREATE INDEX "customer_comparison_item_store_product_idx"
  ON "customers"."customer_comparison_item" ("store_id", "product_id");

CREATE INDEX "customer_comparison_item_store_variant_idx"
  ON "customers"."customer_comparison_item" ("store_id", "variant_id");

CREATE INDEX "customer_comparison_item_comparison_position_idx"
  ON "customers"."customer_comparison_item" ("comparison_id", "position");

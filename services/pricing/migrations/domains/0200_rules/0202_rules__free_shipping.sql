-- Up Migration

CREATE TABLE "pricing"."discount_free_shipping" (
  "discount_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "maximum_shipping_price_minor" bigint,

  CONSTRAINT "discount_free_shipping_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "discount_free_shipping_maximum_price_check"
    CHECK (
      "maximum_shipping_price_minor" IS NULL
      OR "maximum_shipping_price_minor" >= 0
    )
);

CREATE INDEX "discount_free_shipping_store_idx"
  ON "pricing"."discount_free_shipping" ("store_id", "discount_id");

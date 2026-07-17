-- Up Migration

-- A missing row means that the owning discount does not combine with that
-- class. Mutual compatibility is evaluated for every candidate pair.
CREATE TABLE "pricing"."discount_combination_class" (
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "combines_with_class" "pricing"."discount_class" NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_combination_class_pkey"
    PRIMARY KEY ("discount_id", "combines_with_class"),
  CONSTRAINT "discount_combination_class_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "discount_combination_class_store_lookup_idx"
  ON "pricing"."discount_combination_class" (
    "store_id",
    "combines_with_class",
    "discount_id"
  );

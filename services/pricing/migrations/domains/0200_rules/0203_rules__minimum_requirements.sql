-- Up Migration

CREATE TABLE "pricing"."discount_minimum_requirement" (
  "discount_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "requirement_type" "pricing"."discount_requirement_type" NOT NULL,
  "subtotal_minor" bigint,
  "quantity" integer,

  CONSTRAINT "discount_minimum_requirement_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "discount_minimum_requirement_value_check"
    CHECK (
      (
        "requirement_type" = 'SUBTOTAL'
        AND "subtotal_minor" > 0
        AND "quantity" IS NULL
      )
      OR (
        "requirement_type" = 'QUANTITY'
        AND "subtotal_minor" IS NULL
        AND "quantity" > 0
      )
    )
);

CREATE INDEX "discount_minimum_requirement_store_idx"
  ON "pricing"."discount_minimum_requirement" ("store_id", "discount_id");

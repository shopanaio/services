-- Up Migration

CREATE TABLE "pricing"."discount_buyer_context" (
  "discount_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "context_type" "pricing"."discount_buyer_context_type" NOT NULL DEFAULT 'ALL',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_buyer_context_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "discount_buyer_context_store_discount_unique"
    UNIQUE ("store_id", "discount_id")
);

CREATE INDEX "discount_buyer_context_store_type_idx"
  ON "pricing"."discount_buyer_context" (
    "store_id",
    "context_type",
    "discount_id"
  );

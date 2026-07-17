-- Up Migration

CREATE TABLE "pricing"."discount_tag" (
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "tag" varchar(64) NOT NULL,
  "normalized_tag" varchar(64)
    GENERATED ALWAYS AS (lower(btrim("tag"))) STORED,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_tag_pkey"
    PRIMARY KEY ("discount_id", "normalized_tag"),
  CONSTRAINT "discount_tag_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "discount_tag_value_check"
    CHECK (length(btrim("tag")) BETWEEN 1 AND 64)
);

CREATE INDEX "discount_tag_store_lookup_idx"
  ON "pricing"."discount_tag" ("store_id", "normalized_tag", "discount_id");

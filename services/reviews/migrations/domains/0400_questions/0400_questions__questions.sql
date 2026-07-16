-- Up Migration

CREATE TABLE "reviews"."product_question" (
  "id" uuid PRIMARY KEY,
  "content_kind" "reviews"."content_kind" NOT NULL DEFAULT 'PRODUCT_QUESTION',
  "store_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "variant_id" uuid,

  CONSTRAINT "product_question_content_kind_check"
    CHECK ("content_kind" = 'PRODUCT_QUESTION'),
  CONSTRAINT "product_question_content_fk"
    FOREIGN KEY ("id", "content_kind")
    REFERENCES "reviews"."content_item" ("id", "kind")
    ON DELETE CASCADE
);

CREATE INDEX "product_question_store_product_idx"
  ON "reviews"."product_question" ("store_id", "product_id", "id" DESC);

CREATE INDEX "product_question_store_variant_idx"
  ON "reviews"."product_question" ("store_id", "variant_id", "id" DESC)
  WHERE "variant_id" IS NOT NULL;

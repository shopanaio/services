-- Up Migration

CREATE TABLE "reviews"."review_rating" (
  "store_id" uuid NOT NULL,
  "review_id" uuid NOT NULL,
  "criterion_id" uuid NOT NULL,
  "value" smallint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "review_rating_pkey"
    PRIMARY KEY ("review_id", "criterion_id"),
  CONSTRAINT "review_rating_review_fk"
    FOREIGN KEY ("review_id")
    REFERENCES "reviews"."review" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "review_rating_criterion_fk"
    FOREIGN KEY ("criterion_id")
    REFERENCES "reviews"."rating_criterion" ("id")
    ON DELETE RESTRICT,
  CONSTRAINT "review_rating_value_check"
    CHECK ("value" BETWEEN 1 AND 5)
);

CREATE INDEX "review_rating_store_criterion_value_idx"
  ON "reviews"."review_rating" ("store_id", "criterion_id", "value", "review_id");

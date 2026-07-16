-- Up Migration

CREATE TABLE "reviews"."review" (
  "id" uuid PRIMARY KEY,
  "content_kind" "reviews"."content_kind" NOT NULL DEFAULT 'REVIEW',
  "store_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "variant_id" uuid,
  "order_id" uuid,
  "order_line_id" uuid,
  "rating" smallint NOT NULL,
  "verification_status" "reviews"."review_verification_status" NOT NULL DEFAULT 'UNVERIFIED',
  "verification_method" varchar(64),
  "verified_at" timestamptz,
  "is_incentivized" boolean NOT NULL DEFAULT false,
  "incentive_disclosure" varchar(500),

  CONSTRAINT "review_content_kind_check"
    CHECK ("content_kind" = 'REVIEW'),
  CONSTRAINT "review_content_fk"
    FOREIGN KEY ("id", "content_kind")
    REFERENCES "reviews"."content_item" ("id", "kind")
    ON DELETE CASCADE,
  CONSTRAINT "review_rating_check"
    CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "review_verification_check"
    CHECK (
      (
        "verification_status" = 'UNVERIFIED'
        AND "verification_method" IS NULL
        AND "verified_at" IS NULL
      )
      OR
      (
        "verification_status" IN ('VERIFIED', 'REVOKED')
        AND "verification_method" IS NOT NULL
        AND length(btrim("verification_method")) > 0
        AND "verified_at" IS NOT NULL
      )
    ),
  CONSTRAINT "review_incentive_disclosure_check"
    CHECK (
      NOT "is_incentivized"
      OR (
        "incentive_disclosure" IS NOT NULL
        AND length(btrim("incentive_disclosure")) > 0
      )
    )
);

CREATE INDEX "review_store_product_idx"
  ON "reviews"."review" ("store_id", "product_id", "id" DESC);

CREATE INDEX "review_store_product_rating_idx"
  ON "reviews"."review" ("store_id", "product_id", "rating", "id" DESC);

CREATE INDEX "review_store_rating_idx"
  ON "reviews"."review" ("store_id", "rating", "id" DESC);

CREATE INDEX "review_store_verification_idx"
  ON "reviews"."review" ("store_id", "verification_status", "id" DESC);

CREATE INDEX "review_store_order_line_idx"
  ON "reviews"."review" ("store_id", "order_line_id", "id")
  WHERE "order_line_id" IS NOT NULL;

CREATE INDEX "review_store_variant_idx"
  ON "reviews"."review" ("store_id", "variant_id", "id" DESC)
  WHERE "variant_id" IS NOT NULL;

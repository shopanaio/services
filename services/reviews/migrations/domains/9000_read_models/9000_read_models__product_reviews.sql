-- Up Migration

-- Projection over currently published, non-deleted reviews.
CREATE TABLE "reviews"."product_review_summary" (
  "product_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "review_count" integer NOT NULL DEFAULT 0,
  "verified_review_count" integer NOT NULL DEFAULT 0,
  "media_review_count" integer NOT NULL DEFAULT 0,
  "rating_sum" bigint NOT NULL DEFAULT 0,
  "rating_1_count" integer NOT NULL DEFAULT 0,
  "rating_2_count" integer NOT NULL DEFAULT 0,
  "rating_3_count" integer NOT NULL DEFAULT 0,
  "rating_4_count" integer NOT NULL DEFAULT 0,
  "rating_5_count" integer NOT NULL DEFAULT 0,
  "average_rating" numeric(4, 3) GENERATED ALWAYS AS (
    CASE
      WHEN "review_count" = 0 THEN 0::numeric
      ELSE round("rating_sum"::numeric / "review_count"::numeric, 3)
    END
  ) STORED,
  "last_reviewed_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "product_review_summary_counts_check"
    CHECK (
      "review_count" >= 0
      AND "verified_review_count" >= 0
      AND "media_review_count" >= 0
      AND "rating_sum" >= 0
      AND "rating_1_count" >= 0
      AND "rating_2_count" >= 0
      AND "rating_3_count" >= 0
      AND "rating_4_count" >= 0
      AND "rating_5_count" >= 0
    ),
  CONSTRAINT "product_review_summary_breakdown_check"
    CHECK (
      "review_count" =
        "rating_1_count"
        + "rating_2_count"
        + "rating_3_count"
        + "rating_4_count"
        + "rating_5_count"
      AND "rating_sum" =
        "rating_1_count"
        + 2::bigint * "rating_2_count"
        + 3::bigint * "rating_3_count"
        + 4::bigint * "rating_4_count"
        + 5::bigint * "rating_5_count"
    ),
  CONSTRAINT "product_review_summary_subset_counts_check"
    CHECK (
      "verified_review_count" <= "review_count"
      AND "media_review_count" <= "review_count"
    )
);

CREATE INDEX "product_review_summary_store_rating_idx"
  ON "reviews"."product_review_summary" (
    "store_id",
    "average_rating" DESC,
    "review_count" DESC,
    "product_id"
  );

CREATE INDEX "product_review_summary_store_recent_idx"
  ON "reviews"."product_review_summary" ("store_id", "last_reviewed_at" DESC, "product_id");

CREATE TABLE "reviews"."product_rating_criterion_summary" (
  "store_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "criterion_id" uuid NOT NULL,
  "review_count" integer NOT NULL DEFAULT 0,
  "rating_sum" bigint NOT NULL DEFAULT 0,
  "rating_1_count" integer NOT NULL DEFAULT 0,
  "rating_2_count" integer NOT NULL DEFAULT 0,
  "rating_3_count" integer NOT NULL DEFAULT 0,
  "rating_4_count" integer NOT NULL DEFAULT 0,
  "rating_5_count" integer NOT NULL DEFAULT 0,
  "average_rating" numeric(4, 3) GENERATED ALWAYS AS (
    CASE
      WHEN "review_count" = 0 THEN 0::numeric
      ELSE round("rating_sum"::numeric / "review_count"::numeric, 3)
    END
  ) STORED,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "product_rating_criterion_summary_pkey"
    PRIMARY KEY ("product_id", "criterion_id"),
  CONSTRAINT "product_rating_criterion_summary_criterion_fk"
    FOREIGN KEY ("criterion_id")
    REFERENCES "reviews"."rating_criterion" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "product_rating_criterion_summary_counts_check"
    CHECK (
      "review_count" >= 0
      AND "rating_sum" >= 0
      AND "rating_1_count" >= 0
      AND "rating_2_count" >= 0
      AND "rating_3_count" >= 0
      AND "rating_4_count" >= 0
      AND "rating_5_count" >= 0
    ),
  CONSTRAINT "product_rating_criterion_summary_breakdown_check"
    CHECK (
      "review_count" =
        "rating_1_count"
        + "rating_2_count"
        + "rating_3_count"
        + "rating_4_count"
        + "rating_5_count"
      AND "rating_sum" =
        "rating_1_count"
        + 2::bigint * "rating_2_count"
        + 3::bigint * "rating_3_count"
        + 4::bigint * "rating_4_count"
        + 5::bigint * "rating_5_count"
    )
);

CREATE INDEX "product_rating_criterion_summary_store_idx"
  ON "reviews"."product_rating_criterion_summary" (
    "store_id",
    "criterion_id",
    "average_rating" DESC,
    "product_id"
  );

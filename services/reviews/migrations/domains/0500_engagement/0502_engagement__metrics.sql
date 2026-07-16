-- Up Migration

-- Transactionally maintained projection for list sorting/filtering and storefront counters.
CREATE TABLE "reviews"."content_metrics" (
  "content_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "like_count" integer NOT NULL DEFAULT 0,
  "dislike_count" integer NOT NULL DEFAULT 0,
  "report_count" integer NOT NULL DEFAULT 0,
  "open_report_count" integer NOT NULL DEFAULT 0,
  "media_count" integer NOT NULL DEFAULT 0,
  "child_count" integer NOT NULL DEFAULT 0,
  "official_child_count" integer NOT NULL DEFAULT 0,
  "accepted_child_count" integer NOT NULL DEFAULT 0,
  "last_child_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "content_metrics_content_fk"
    FOREIGN KEY ("content_id")
    REFERENCES "reviews"."content_item" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "content_metrics_nonnegative_check"
    CHECK (
      "like_count" >= 0
      AND "dislike_count" >= 0
      AND "report_count" >= 0
      AND "open_report_count" >= 0
      AND "media_count" >= 0
      AND "child_count" >= 0
      AND "official_child_count" >= 0
      AND "accepted_child_count" >= 0
    ),
  CONSTRAINT "content_metrics_report_count_check"
    CHECK ("open_report_count" <= "report_count"),
  CONSTRAINT "content_metrics_child_count_check"
    CHECK (
      "official_child_count" <= "child_count"
      AND "accepted_child_count" <= "child_count"
    )
);

CREATE INDEX "content_metrics_store_like_idx"
  ON "reviews"."content_metrics" ("store_id", "like_count" DESC, "content_id");

CREATE INDEX "content_metrics_store_dislike_idx"
  ON "reviews"."content_metrics" ("store_id", "dislike_count" DESC, "content_id");

CREATE INDEX "content_metrics_store_report_idx"
  ON "reviews"."content_metrics" ("store_id", "report_count" DESC, "content_id");

CREATE INDEX "content_metrics_store_child_idx"
  ON "reviews"."content_metrics" ("store_id", "child_count" DESC, "content_id");

CREATE INDEX "content_metrics_store_media_idx"
  ON "reviews"."content_metrics" ("store_id", "media_count" DESC, "content_id");

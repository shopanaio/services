-- Up Migration

CREATE TABLE "reviews"."review_reply" (
  "id" uuid PRIMARY KEY,
  "content_kind" "reviews"."content_kind" NOT NULL DEFAULT 'REVIEW_REPLY',
  "store_id" uuid NOT NULL,
  "review_id" uuid NOT NULL,
  "is_official" boolean NOT NULL DEFAULT true,
  "sort_index" integer NOT NULL DEFAULT 0,

  CONSTRAINT "review_reply_content_kind_check"
    CHECK ("content_kind" = 'REVIEW_REPLY'),
  CONSTRAINT "review_reply_content_fk"
    FOREIGN KEY ("id", "content_kind")
    REFERENCES "reviews"."content_item" ("id", "kind")
    ON DELETE CASCADE,
  CONSTRAINT "review_reply_review_fk"
    FOREIGN KEY ("review_id")
    REFERENCES "reviews"."review" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "review_reply_sort_check"
    CHECK ("sort_index" >= 0)
);

CREATE INDEX "review_reply_store_review_sort_idx"
  ON "reviews"."review_reply" ("store_id", "review_id", "sort_index", "id");

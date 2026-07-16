-- Up Migration

CREATE TABLE "reviews"."review_media" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "review_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "sort_index" integer NOT NULL DEFAULT 0,
  "caption" varchar(500),
  "status" "reviews"."content_status" NOT NULL DEFAULT 'PENDING',
  "moderation_note" varchar(1000),
  "moderated_by_principal_id" text,
  "moderated_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "review_media_review_fk"
    FOREIGN KEY ("review_id")
    REFERENCES "reviews"."review" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "review_media_review_file_unique"
    UNIQUE ("review_id", "file_id"),
  CONSTRAINT "review_media_sort_check"
    CHECK ("sort_index" >= 0),
  CONSTRAINT "review_media_rejected_note_check"
    CHECK (
      "status" <> 'REJECTED'
      OR ("moderation_note" IS NOT NULL AND length(btrim("moderation_note")) > 0)
    ),
  CONSTRAINT "review_media_moderated_at_check"
    CHECK ("status" = 'PENDING' OR "moderated_at" IS NOT NULL)
);

CREATE INDEX "review_media_store_review_sort_idx"
  ON "reviews"."review_media" ("store_id", "review_id", "sort_index", "id");

CREATE INDEX "review_media_store_file_idx"
  ON "reviews"."review_media" ("store_id", "file_id", "review_id");

CREATE INDEX "review_media_pending_idx"
  ON "reviews"."review_media" ("store_id", "created_at", "id")
  WHERE "status" = 'PENDING';

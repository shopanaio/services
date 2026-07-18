-- Up Migration

CREATE TABLE "reviews"."content_publication" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "content_id" uuid NOT NULL,
  "channel" varchar(64) NOT NULL,
  "locale" "reviews"."locale_code",
  "status" "reviews"."publication_status" NOT NULL DEFAULT 'DRAFT',
  "scheduled_at" timestamptz,
  "published_at" timestamptz,
  "unpublished_at" timestamptz,
  "last_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "content_publication_content_fk"
    FOREIGN KEY ("content_id")
    REFERENCES "reviews"."content_item" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "content_publication_channel_check"
    CHECK (length(btrim("channel")) > 0),
  CONSTRAINT "content_publication_scheduled_check"
    CHECK ("status" <> 'SCHEDULED' OR "scheduled_at" IS NOT NULL),
  CONSTRAINT "content_publication_published_check"
    CHECK ("status" <> 'PUBLISHED' OR "published_at" IS NOT NULL),
  CONSTRAINT "content_publication_failed_check"
    CHECK ("status" <> 'FAILED' OR "last_error" IS NOT NULL),
  CONSTRAINT "content_publication_time_check"
    CHECK (
      ("scheduled_at" IS NULL OR "scheduled_at" >= "created_at")
      AND ("published_at" IS NULL OR "published_at" >= "created_at")
      AND ("unpublished_at" IS NULL OR "unpublished_at" >= "published_at")
    )
);

CREATE UNIQUE INDEX "content_publication_destination_unique"
  ON "reviews"."content_publication" (
    "content_id",
    "channel",
    "locale"
  ) NULLS NOT DISTINCT;

CREATE INDEX "content_publication_schedule_idx"
  ON "reviews"."content_publication" ("scheduled_at", "id")
  WHERE "status" = 'SCHEDULED';

CREATE INDEX "content_publication_store_channel_status_idx"
  ON "reviews"."content_publication" ("store_id", "channel", "status", "content_id");

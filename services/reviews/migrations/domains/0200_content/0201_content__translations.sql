-- Up Migration

CREATE TABLE "reviews"."content_translation" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "content_id" uuid NOT NULL,
  "locale" "reviews"."locale_code" NOT NULL,
  "title" varchar(150),
  "body" text NOT NULL,
  "source" "reviews"."translation_source" NOT NULL,
  "status" "reviews"."content_status" NOT NULL DEFAULT 'PENDING',
  "revision" integer NOT NULL DEFAULT 1,
  "reviewed_by_principal_id" text,
  "reviewed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "content_translation_content_fk"
    FOREIGN KEY ("content_id")
    REFERENCES "reviews"."content_item" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "content_translation_content_locale_unique"
    UNIQUE ("content_id", "locale"),
  CONSTRAINT "content_translation_title_check"
    CHECK ("title" IS NULL OR length(btrim("title")) BETWEEN 1 AND 150),
  CONSTRAINT "content_translation_body_check"
    CHECK (length(btrim("body")) BETWEEN 1 AND 5000),
  CONSTRAINT "content_translation_revision_check"
    CHECK ("revision" >= 1),
  CONSTRAINT "content_translation_review_check"
    CHECK (
      "status" = 'PENDING'
      OR ("reviewed_at" IS NOT NULL AND "reviewed_by_principal_id" IS NOT NULL)
    )
);

CREATE INDEX "content_translation_store_locale_status_idx"
  ON "reviews"."content_translation" ("store_id", "locale", "status", "content_id");

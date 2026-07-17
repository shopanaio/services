-- Up Migration

CREATE TABLE "reviews"."content_item" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "kind" "reviews"."content_kind" NOT NULL,
  "title" varchar(150),
  "body" text NOT NULL,
  "locale" "reviews"."locale_code" NOT NULL,
  "author_type" "reviews"."content_author_type" NOT NULL,
  "author_customer_id" uuid,
  "author_principal_id" text,
  "author_display_name" varchar(150) NOT NULL,
  "author_email" varchar(320),
  "source_channel" varchar(64) NOT NULL DEFAULT 'STOREFRONT',
  "source_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "idempotency_key" text,
  "status" "reviews"."content_status" NOT NULL DEFAULT 'PENDING',
  "moderation_note" varchar(1000),
  "moderated_by_principal_id" text,
  "moderated_at" timestamptz,
  "published_at" timestamptz,
  "unpublished_at" timestamptz,
  "revision" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  "redacted_at" timestamptz,

  CONSTRAINT "content_item_id_kind_unique" UNIQUE ("id", "kind"),
  CONSTRAINT "content_item_title_kind_check"
    CHECK ("kind" = 'REVIEW' OR "title" IS NULL),
  CONSTRAINT "content_item_title_length_check"
    CHECK ("title" IS NULL OR length(btrim("title")) BETWEEN 1 AND 150),
  CONSTRAINT "content_item_body_length_check"
    CHECK (
      CASE "kind"
        WHEN 'REVIEW' THEN length(btrim("body")) BETWEEN 20 AND 5000
        WHEN 'PRODUCT_QUESTION' THEN length(btrim("body")) BETWEEN 10 AND 5000
        WHEN 'QUESTION_ANSWER' THEN length(btrim("body")) BETWEEN 10 AND 5000
        WHEN 'REVIEW_REPLY' THEN length(btrim("body")) BETWEEN 1 AND 5000
      END
    ),
  CONSTRAINT "content_item_author_name_check"
    CHECK (length(btrim("author_display_name")) > 0),
  CONSTRAINT "content_item_guest_email_check"
    CHECK (
      "author_type" <> 'GUEST'
      OR "author_email" IS NOT NULL
      OR "redacted_at" IS NOT NULL
    ),
  CONSTRAINT "content_item_customer_author_check"
    CHECK (
      "author_type" <> 'CUSTOMER'
      OR "author_customer_id" IS NOT NULL
      OR "redacted_at" IS NOT NULL
    ),
  CONSTRAINT "content_item_source_channel_check"
    CHECK (length(btrim("source_channel")) > 0),
  CONSTRAINT "content_item_source_metadata_object_check"
    CHECK (jsonb_typeof("source_metadata") = 'object'),
  CONSTRAINT "content_item_revision_check"
    CHECK ("revision" >= 1),
  CONSTRAINT "content_item_rejected_note_check"
    CHECK (
      "status" <> 'REJECTED'
      OR ("moderation_note" IS NOT NULL AND length(btrim("moderation_note")) > 0)
    ),
  CONSTRAINT "content_item_published_at_check"
    CHECK ("status" <> 'PUBLISHED' OR "published_at" IS NOT NULL),
  CONSTRAINT "content_item_moderated_at_check"
    CHECK ("status" = 'PENDING' OR "moderated_at" IS NOT NULL),
  CONSTRAINT "content_item_publication_time_check"
    CHECK (
      ("published_at" IS NULL OR "published_at" >= "created_at")
      AND ("unpublished_at" IS NULL OR "unpublished_at" >= "published_at")
    ),
  CONSTRAINT "content_item_deleted_at_check"
    CHECK ("deleted_at" IS NULL OR "deleted_at" >= "created_at"),
  CONSTRAINT "content_item_redacted_at_check"
    CHECK ("redacted_at" IS NULL OR "redacted_at" >= "created_at")
);

CREATE UNIQUE INDEX "content_item_store_idempotency_unique"
  ON "reviews"."content_item" ("store_id", "source_channel", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX "content_item_store_kind_status_created_idx"
  ON "reviews"."content_item" (
    "store_id",
    "kind",
    "status",
    "created_at" DESC,
    "id"
  )
  WHERE "deleted_at" IS NULL;

CREATE INDEX "content_item_store_kind_updated_idx"
  ON "reviews"."content_item" ("store_id", "kind", "updated_at" DESC, "id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "content_item_store_author_customer_idx"
  ON "reviews"."content_item" (
    "store_id",
    "author_customer_id",
    "kind",
    "created_at" DESC,
    "id"
  )
  WHERE "author_customer_id" IS NOT NULL AND "deleted_at" IS NULL;

CREATE INDEX "content_item_title_trgm_idx"
  ON "reviews"."content_item" USING gin (lower("title") gin_trgm_ops)
  WHERE "title" IS NOT NULL AND "deleted_at" IS NULL;

CREATE INDEX "content_item_body_trgm_idx"
  ON "reviews"."content_item" USING gin (lower("body") gin_trgm_ops)
  WHERE "deleted_at" IS NULL;

CREATE INDEX "content_item_pending_moderation_idx"
  ON "reviews"."content_item" ("store_id", "created_at", "id")
  WHERE "status" = 'PENDING' AND "deleted_at" IS NULL;

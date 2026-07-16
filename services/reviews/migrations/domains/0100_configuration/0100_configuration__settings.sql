-- Up Migration

CREATE TABLE "reviews"."store_configuration" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "reviews_enabled" boolean NOT NULL DEFAULT true,
  "questions_enabled" boolean NOT NULL DEFAULT true,
  "guest_reviews_enabled" boolean NOT NULL DEFAULT false,
  "guest_questions_enabled" boolean NOT NULL DEFAULT true,
  "customer_answers_enabled" boolean NOT NULL DEFAULT true,
  "verified_purchase_required" boolean NOT NULL DEFAULT false,
  "review_moderation_mode" "reviews"."moderation_mode" NOT NULL DEFAULT 'PREMODERATION',
  "question_moderation_mode" "reviews"."moderation_mode" NOT NULL DEFAULT 'PREMODERATION',
  "answer_moderation_mode" "reviews"."moderation_mode" NOT NULL DEFAULT 'PREMODERATION',
  "review_duplicate_policy" "reviews"."review_duplicate_policy" NOT NULL DEFAULT 'ONE_PER_ORDER_LINE',
  "review_requests_enabled" boolean NOT NULL DEFAULT true,
  "review_request_delay_days" smallint NOT NULL DEFAULT 14,
  "review_request_expiry_days" smallint NOT NULL DEFAULT 90,
  "review_edit_window_hours" integer NOT NULL DEFAULT 720,
  "question_edit_window_hours" integer NOT NULL DEFAULT 720,
  "answer_edit_window_hours" integer NOT NULL DEFAULT 720,
  "max_review_media_count" smallint NOT NULL DEFAULT 8,
  "max_answers_per_question" smallint NOT NULL DEFAULT 50,
  "revision" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "store_configuration_store_unique" UNIQUE ("store_id"),
  CONSTRAINT "store_configuration_request_delay_check"
    CHECK ("review_request_delay_days" BETWEEN 1 AND 180),
  CONSTRAINT "store_configuration_request_expiry_check"
    CHECK ("review_request_expiry_days" BETWEEN 1 AND 365),
  CONSTRAINT "store_configuration_edit_windows_check"
    CHECK (
      "review_edit_window_hours" >= 0
      AND "question_edit_window_hours" >= 0
      AND "answer_edit_window_hours" >= 0
    ),
  CONSTRAINT "store_configuration_limits_check"
    CHECK (
      "max_review_media_count" BETWEEN 0 AND 20
      AND "max_answers_per_question" BETWEEN 1 AND 100
    ),
  CONSTRAINT "store_configuration_revision_check"
    CHECK ("revision" >= 1)
);

CREATE INDEX "store_configuration_updated_idx"
  ON "reviews"."store_configuration" ("updated_at" DESC, "id");

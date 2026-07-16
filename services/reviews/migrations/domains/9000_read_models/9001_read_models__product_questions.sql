-- Up Migration

-- Projection over currently published, non-deleted questions and answers.
CREATE TABLE "reviews"."product_question_summary" (
  "product_id" uuid PRIMARY KEY,
  "store_id" uuid NOT NULL,
  "question_count" integer NOT NULL DEFAULT 0,
  "answered_question_count" integer NOT NULL DEFAULT 0,
  "unanswered_question_count" integer GENERATED ALWAYS AS (
    "question_count" - "answered_question_count"
  ) STORED,
  "answer_count" integer NOT NULL DEFAULT 0,
  "official_answer_count" integer NOT NULL DEFAULT 0,
  "last_question_at" timestamptz,
  "last_answered_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "product_question_summary_counts_check"
    CHECK (
      "question_count" >= 0
      AND "answered_question_count" >= 0
      AND "answer_count" >= 0
      AND "official_answer_count" >= 0
      AND "answered_question_count" <= "question_count"
      AND "official_answer_count" <= "answer_count"
      AND "answer_count" >= "answered_question_count"
    )
);

CREATE INDEX "product_question_summary_store_unanswered_idx"
  ON "reviews"."product_question_summary" (
    "store_id",
    "unanswered_question_count" DESC,
    "last_question_at" DESC,
    "product_id"
  );

CREATE INDEX "product_question_summary_store_recent_idx"
  ON "reviews"."product_question_summary" ("store_id", "last_question_at" DESC, "product_id");

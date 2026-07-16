-- Up Migration

CREATE TABLE "reviews"."question_answer" (
  "id" uuid PRIMARY KEY,
  "content_kind" "reviews"."content_kind" NOT NULL DEFAULT 'QUESTION_ANSWER',
  "store_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "is_official" boolean NOT NULL DEFAULT false,
  "is_accepted" boolean NOT NULL DEFAULT false,
  "sort_index" integer NOT NULL DEFAULT 0,

  CONSTRAINT "question_answer_content_kind_check"
    CHECK ("content_kind" = 'QUESTION_ANSWER'),
  CONSTRAINT "question_answer_content_fk"
    FOREIGN KEY ("id", "content_kind")
    REFERENCES "reviews"."content_item" ("id", "kind")
    ON DELETE CASCADE,
  CONSTRAINT "question_answer_question_fk"
    FOREIGN KEY ("question_id")
    REFERENCES "reviews"."product_question" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "question_answer_sort_check"
    CHECK ("sort_index" >= 0)
);

CREATE UNIQUE INDEX "question_answer_one_accepted_unique"
  ON "reviews"."question_answer" ("question_id")
  WHERE "is_accepted";

CREATE INDEX "question_answer_store_question_sort_idx"
  ON "reviews"."question_answer" ("store_id", "question_id", "sort_index", "id");

CREATE INDEX "question_answer_store_official_idx"
  ON "reviews"."question_answer" ("store_id", "is_official", "id" DESC);

-- Up Migration

CREATE TABLE "reviews"."moderation_signal" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "content_id" uuid NOT NULL,
  "provider" varchar(64) NOT NULL,
  "signal_type" varchar(64) NOT NULL,
  "score" numeric(6, 5),
  "verdict" "reviews"."moderation_verdict" NOT NULL,
  "model_version" varchar(128),
  "evidence" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "moderation_signal_content_fk"
    FOREIGN KEY ("content_id")
    REFERENCES "reviews"."content_item" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "moderation_signal_provider_check"
    CHECK (length(btrim("provider")) > 0),
  CONSTRAINT "moderation_signal_type_check"
    CHECK (length(btrim("signal_type")) > 0),
  CONSTRAINT "moderation_signal_score_check"
    CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 1),
  CONSTRAINT "moderation_signal_evidence_object_check"
    CHECK (jsonb_typeof("evidence") = 'object')
);

CREATE INDEX "moderation_signal_content_time_idx"
  ON "reviews"."moderation_signal" ("content_id", "created_at" DESC, "id");

CREATE INDEX "moderation_signal_store_verdict_idx"
  ON "reviews"."moderation_signal" ("store_id", "verdict", "created_at", "id");

CREATE INDEX "moderation_signal_provider_type_idx"
  ON "reviews"."moderation_signal" ("provider", "signal_type", "created_at" DESC, "id");

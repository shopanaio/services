-- Up Migration

CREATE TABLE "reviews"."question_subscription" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "subscriber_customer_id" uuid,
  "subscriber_key" varchar(160) NOT NULL,
  "channel" "reviews"."notification_channel" NOT NULL,
  "status" "reviews"."subscription_status" NOT NULL DEFAULT 'ACTIVE',
  "locale" varchar(35) NOT NULL,
  "last_notified_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "question_subscription_question_fk"
    FOREIGN KEY ("question_id")
    REFERENCES "reviews"."product_question" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "question_subscription_unique"
    UNIQUE ("question_id", "subscriber_key", "channel"),
  CONSTRAINT "question_subscription_key_check"
    CHECK (length(btrim("subscriber_key")) > 0),
  CONSTRAINT "question_subscription_locale_check"
    CHECK (length(btrim("locale")) > 0)
);

CREATE INDEX "question_subscription_store_customer_idx"
  ON "reviews"."question_subscription" (
    "store_id",
    "subscriber_customer_id",
    "status",
    "id"
  )
  WHERE "subscriber_customer_id" IS NOT NULL;

CREATE INDEX "question_subscription_active_question_idx"
  ON "reviews"."question_subscription" ("question_id", "channel", "id")
  WHERE "status" = 'ACTIVE';

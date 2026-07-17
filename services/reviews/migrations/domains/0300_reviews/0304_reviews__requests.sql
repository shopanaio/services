-- Up Migration

CREATE TABLE "reviews"."review_request" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "order_line_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "variant_id" uuid,
  "review_id" uuid,
  "channel" "reviews"."notification_channel" NOT NULL,
  "status" "reviews"."review_request_status" NOT NULL DEFAULT 'SCHEDULED',
  "locale" "reviews"."locale_code" NOT NULL,
  "source_channel" varchar(64) NOT NULL DEFAULT 'STOREFRONT',
  "idempotency_key" text NOT NULL,
  "access_token_hash" bytea,
  "provider_message_id" text,
  "attempt_count" integer NOT NULL DEFAULT 0,
  "scheduled_at" timestamptz NOT NULL,
  "sent_at" timestamptz,
  "delivered_at" timestamptz,
  "opened_at" timestamptz,
  "submitted_at" timestamptz,
  "expires_at" timestamptz,
  "last_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "review_request_review_fk"
    FOREIGN KEY ("review_id")
    REFERENCES "reviews"."review" ("id")
    ON DELETE RESTRICT,
  CONSTRAINT "review_request_store_idempotency_unique"
    UNIQUE ("store_id", "idempotency_key"),
  CONSTRAINT "review_request_source_check"
    CHECK (length(btrim("source_channel")) > 0),
  CONSTRAINT "review_request_attempt_count_check"
    CHECK ("attempt_count" >= 0),
  CONSTRAINT "review_request_schedule_check"
    CHECK ("scheduled_at" >= "created_at"),
  CONSTRAINT "review_request_expiry_check"
    CHECK ("expires_at" IS NULL OR "expires_at" >= "scheduled_at"),
  CONSTRAINT "review_request_submitted_check"
    CHECK (
      ("status" = 'SUBMITTED' AND "review_id" IS NOT NULL AND "submitted_at" IS NOT NULL)
      OR
      ("status" <> 'SUBMITTED' AND "review_id" IS NULL AND "submitted_at" IS NULL)
    ),
  CONSTRAINT "review_request_failure_check"
    CHECK ("status" <> 'FAILED' OR "last_error" IS NOT NULL)
);

CREATE UNIQUE INDEX "review_request_access_token_unique"
  ON "reviews"."review_request" ("store_id", "access_token_hash")
  WHERE "access_token_hash" IS NOT NULL;

CREATE INDEX "review_request_due_idx"
  ON "reviews"."review_request" ("scheduled_at", "id")
  WHERE "status" = 'SCHEDULED';

CREATE INDEX "review_request_store_status_idx"
  ON "reviews"."review_request" ("store_id", "status", "scheduled_at", "id");

CREATE INDEX "review_request_store_customer_idx"
  ON "reviews"."review_request" ("store_id", "customer_id", "created_at" DESC, "id");

CREATE INDEX "review_request_store_order_line_idx"
  ON "reviews"."review_request" ("store_id", "order_line_id", "created_at" DESC, "id");

CREATE INDEX "review_request_store_product_idx"
  ON "reviews"."review_request" ("store_id", "product_id", "created_at" DESC, "id");

CREATE TABLE "reviews"."review_request_event" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "review_request_id" uuid NOT NULL,
  "type" "reviews"."review_request_event_type" NOT NULL,
  "provider_event_id" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "occurred_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "review_request_event_request_fk"
    FOREIGN KEY ("review_request_id")
    REFERENCES "reviews"."review_request" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "review_request_event_metadata_object_check"
    CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE UNIQUE INDEX "review_request_event_provider_unique"
  ON "reviews"."review_request_event" ("store_id", "provider_event_id")
  WHERE "provider_event_id" IS NOT NULL;

CREATE INDEX "review_request_event_request_time_idx"
  ON "reviews"."review_request_event" ("review_request_id", "occurred_at", "id");

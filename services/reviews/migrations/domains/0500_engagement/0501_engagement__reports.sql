-- Up Migration

CREATE TABLE "reviews"."content_report" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "content_id" uuid NOT NULL,
  "reporter_customer_id" uuid,
  "reporter_key" varchar(160) NOT NULL,
  "reason" "reviews"."report_reason" NOT NULL,
  "details" varchar(2000),
  "status" "reviews"."report_status" NOT NULL DEFAULT 'OPEN',
  "assigned_to_principal_id" text,
  "resolution_note" varchar(2000),
  "resolved_by_principal_id" text,
  "resolved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "content_report_content_fk"
    FOREIGN KEY ("content_id")
    REFERENCES "reviews"."content_item" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "content_report_reporter_key_check"
    CHECK (length(btrim("reporter_key")) > 0),
  CONSTRAINT "content_report_resolution_check"
    CHECK (
      (
        "status" IN ('ACTIONED', 'DISMISSED')
        AND "resolved_at" IS NOT NULL
        AND "resolved_by_principal_id" IS NOT NULL
      )
      OR
      (
        "status" IN ('OPEN', 'UNDER_REVIEW')
        AND "resolved_at" IS NULL
        AND "resolved_by_principal_id" IS NULL
      )
    )
);

CREATE UNIQUE INDEX "content_report_active_reporter_unique"
  ON "reviews"."content_report" ("content_id", "reporter_key")
  WHERE "status" IN ('OPEN', 'UNDER_REVIEW');

CREATE INDEX "content_report_store_queue_idx"
  ON "reviews"."content_report" ("store_id", "status", "created_at", "id");

CREATE INDEX "content_report_content_created_idx"
  ON "reviews"."content_report" ("content_id", "created_at" DESC, "id");

CREATE INDEX "content_report_reporter_customer_idx"
  ON "reviews"."content_report" (
    "store_id",
    "reporter_customer_id",
    "created_at" DESC,
    "id"
  )
  WHERE "reporter_customer_id" IS NOT NULL;

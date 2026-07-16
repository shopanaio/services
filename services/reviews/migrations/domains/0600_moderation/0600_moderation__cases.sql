-- Up Migration

CREATE TABLE "reviews"."moderation_case" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "content_id" uuid NOT NULL,
  "status" "reviews"."moderation_case_status" NOT NULL DEFAULT 'OPEN',
  "priority" smallint NOT NULL DEFAULT 50,
  "reason_code" varchar(64) NOT NULL,
  "assigned_to_principal_id" text,
  "due_at" timestamptz,
  "resolution_code" varchar(64),
  "resolution_note" varchar(2000),
  "resolved_by_principal_id" text,
  "resolved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "moderation_case_content_fk"
    FOREIGN KEY ("content_id")
    REFERENCES "reviews"."content_item" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "moderation_case_priority_check"
    CHECK ("priority" BETWEEN 0 AND 100),
  CONSTRAINT "moderation_case_reason_check"
    CHECK (length(btrim("reason_code")) > 0),
  CONSTRAINT "moderation_case_due_at_check"
    CHECK ("due_at" IS NULL OR "due_at" >= "created_at"),
  CONSTRAINT "moderation_case_resolution_check"
    CHECK (
      (
        "status" IN ('RESOLVED', 'CANCELLED')
        AND "resolved_at" IS NOT NULL
        AND "resolved_by_principal_id" IS NOT NULL
      )
      OR
      (
        "status" IN ('OPEN', 'IN_REVIEW')
        AND "resolved_at" IS NULL
        AND "resolved_by_principal_id" IS NULL
      )
    )
);

CREATE UNIQUE INDEX "moderation_case_active_content_unique"
  ON "reviews"."moderation_case" ("content_id")
  WHERE "status" IN ('OPEN', 'IN_REVIEW');

CREATE INDEX "moderation_case_store_queue_idx"
  ON "reviews"."moderation_case" (
    "store_id",
    "status",
    "priority" DESC,
    "created_at",
    "id"
  );

CREATE INDEX "moderation_case_assignee_queue_idx"
  ON "reviews"."moderation_case" (
    "assigned_to_principal_id",
    "status",
    "priority" DESC,
    "created_at",
    "id"
  )
  WHERE "assigned_to_principal_id" IS NOT NULL;

CREATE INDEX "moderation_case_due_idx"
  ON "reviews"."moderation_case" ("due_at", "id")
  WHERE "status" IN ('OPEN', 'IN_REVIEW') AND "due_at" IS NOT NULL;

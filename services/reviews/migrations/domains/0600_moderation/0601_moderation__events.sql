-- Up Migration

CREATE TABLE "reviews"."moderation_event" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "content_id" uuid NOT NULL,
  "case_id" uuid,
  "action" "reviews"."moderation_action" NOT NULL,
  "from_status" "reviews"."content_status",
  "to_status" "reviews"."content_status",
  "actor_type" varchar(32) NOT NULL,
  "actor_id" text,
  "reason_code" varchar(64),
  "note" varchar(2000),
  "is_automated" boolean NOT NULL DEFAULT false,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "moderation_event_content_fk"
    FOREIGN KEY ("content_id")
    REFERENCES "reviews"."content_item" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "moderation_event_case_fk"
    FOREIGN KEY ("case_id")
    REFERENCES "reviews"."moderation_case" ("id")
    ON DELETE SET NULL,
  CONSTRAINT "moderation_event_actor_type_check"
    CHECK (length(btrim("actor_type")) > 0),
  CONSTRAINT "moderation_event_status_change_check"
    CHECK (
      "from_status" IS NULL
      OR "to_status" IS NULL
      OR "from_status" <> "to_status"
    ),
  CONSTRAINT "moderation_event_metadata_object_check"
    CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE INDEX "moderation_event_content_time_idx"
  ON "reviews"."moderation_event" ("content_id", "created_at" DESC, "id");

CREATE INDEX "moderation_event_store_action_time_idx"
  ON "reviews"."moderation_event" ("store_id", "action", "created_at" DESC, "id");

CREATE INDEX "moderation_event_case_time_idx"
  ON "reviews"."moderation_event" ("case_id", "created_at", "id")
  WHERE "case_id" IS NOT NULL;

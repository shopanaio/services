-- Up Migration

CREATE TABLE "reviews"."content_revision" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "content_id" uuid NOT NULL,
  "revision" integer NOT NULL,
  "snapshot" jsonb NOT NULL,
  "changed_by_type" varchar(32) NOT NULL,
  "changed_by_id" text,
  "change_reason" varchar(500),
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "content_revision_content_fk"
    FOREIGN KEY ("content_id")
    REFERENCES "reviews"."content_item" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "content_revision_number_unique"
    UNIQUE ("content_id", "revision"),
  CONSTRAINT "content_revision_number_check"
    CHECK ("revision" >= 1),
  CONSTRAINT "content_revision_snapshot_object_check"
    CHECK (jsonb_typeof("snapshot") = 'object'),
  CONSTRAINT "content_revision_changed_by_type_check"
    CHECK (length(btrim("changed_by_type")) > 0)
);

CREATE INDEX "content_revision_store_created_idx"
  ON "reviews"."content_revision" ("store_id", "created_at" DESC, "id");

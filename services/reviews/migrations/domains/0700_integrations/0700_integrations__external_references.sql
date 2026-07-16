-- Up Migration

CREATE TABLE "reviews"."content_external_reference" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "content_id" uuid NOT NULL,
  "external_system" varchar(64) NOT NULL,
  "external_type" varchar(64) NOT NULL,
  "external_id" varchar(255) NOT NULL,
  "external_url" text,
  "direction" "reviews"."external_sync_direction" NOT NULL,
  "sync_status" "reviews"."external_sync_status" NOT NULL DEFAULT 'PENDING',
  "etag" text,
  "content_checksum" varchar(128),
  "last_synced_at" timestamptz,
  "last_error" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,

  CONSTRAINT "content_external_reference_content_fk"
    FOREIGN KEY ("content_id")
    REFERENCES "reviews"."content_item" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "content_external_reference_system_check"
    CHECK (length(btrim("external_system")) > 0),
  CONSTRAINT "content_external_reference_type_check"
    CHECK (length(btrim("external_type")) > 0),
  CONSTRAINT "content_external_reference_id_check"
    CHECK (length(btrim("external_id")) > 0),
  CONSTRAINT "content_external_reference_sync_check"
    CHECK ("sync_status" <> 'SYNCED' OR "last_synced_at" IS NOT NULL),
  CONSTRAINT "content_external_reference_failure_check"
    CHECK ("sync_status" <> 'FAILED' OR "last_error" IS NOT NULL),
  CONSTRAINT "content_external_reference_metadata_object_check"
    CHECK (jsonb_typeof("metadata") = 'object'),
  CONSTRAINT "content_external_reference_deleted_at_check"
    CHECK ("deleted_at" IS NULL OR "deleted_at" >= "created_at")
);

CREATE UNIQUE INDEX "content_external_reference_lookup_unique"
  ON "reviews"."content_external_reference" (
    "store_id",
    "external_system",
    "external_type",
    "external_id"
  )
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "content_external_reference_content_unique"
  ON "reviews"."content_external_reference" (
    "content_id",
    "external_system",
    "external_type"
  )
  WHERE "deleted_at" IS NULL;

CREATE INDEX "content_external_reference_sync_queue_idx"
  ON "reviews"."content_external_reference" (
    "store_id",
    "sync_status",
    "updated_at",
    "id"
  )
  WHERE "deleted_at" IS NULL;

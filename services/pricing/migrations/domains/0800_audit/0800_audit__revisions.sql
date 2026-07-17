-- Up Migration

-- Immutable configuration snapshots make historical evaluations reproducible
-- after the mutable discount aggregate advances to a newer revision.
CREATE TABLE "pricing"."discount_revision" (
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "revision" integer NOT NULL,
  "snapshot" jsonb NOT NULL,
  "change_reason" text,
  "created_by_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_revision_pkey"
    PRIMARY KEY ("discount_id", "revision"),
  CONSTRAINT "discount_revision_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE RESTRICT,
  CONSTRAINT "discount_revision_revision_check"
    CHECK ("revision" >= 0),
  CONSTRAINT "discount_revision_snapshot_object_check"
    CHECK (jsonb_typeof("snapshot") = 'object'),
  CONSTRAINT "discount_revision_change_reason_check"
    CHECK (
      "change_reason" IS NULL
      OR length(btrim("change_reason")) > 0
    )
);

CREATE INDEX "discount_revision_store_created_idx"
  ON "pricing"."discount_revision" (
    "store_id",
    "created_at" DESC,
    "discount_id",
    "revision" DESC
  );

-- Up Migration

CREATE TABLE "pricing"."discount_event" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "sequence" bigint GENERATED ALWAYS AS IDENTITY,
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "event_type" varchar(64) NOT NULL,
  "revision" integer NOT NULL,
  "actor_id" text,
  "idempotency_key" text NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "occurred_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "discount_event_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE RESTRICT,
  CONSTRAINT "discount_event_sequence_unique" UNIQUE ("sequence"),
  CONSTRAINT "discount_event_idempotency_unique"
    UNIQUE ("store_id", "idempotency_key"),
  CONSTRAINT "discount_event_type_check"
    CHECK (
      length(btrim("event_type")) BETWEEN 1 AND 64
      AND "event_type" ~ '^[A-Z][A-Z0-9_]*$'
    ),
  CONSTRAINT "discount_event_revision_check"
    CHECK ("revision" >= 0),
  CONSTRAINT "discount_event_idempotency_check"
    CHECK (length(btrim("idempotency_key")) > 0),
  CONSTRAINT "discount_event_payload_object_check"
    CHECK (jsonb_typeof("payload") = 'object')
);

CREATE INDEX "discount_event_discount_timeline_idx"
  ON "pricing"."discount_event" (
    "store_id",
    "discount_id",
    "occurred_at" DESC,
    "sequence" DESC
  );

CREATE INDEX "discount_event_store_sequence_idx"
  ON "pricing"."discount_event" ("store_id", "sequence");

-- Up Migration
CREATE TABLE "checkout"."checkout_placements" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "checkout_id" uuid NOT NULL,
  "checkout_version" integer NOT NULL,
  "result_revision" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "status" text NOT NULL DEFAULT 'IN_PROGRESS',
  "result" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "checkout_placements_checkout_fk"
    FOREIGN KEY ("store_id", "checkout_id", "checkout_version")
    REFERENCES "checkout"."checkouts" ("store_id", "id", "version")
    ON DELETE RESTRICT,
  CONSTRAINT "checkout_placements_checkout_unique"
    UNIQUE ("store_id", "checkout_id"),
  CONSTRAINT "checkout_placements_idempotency_unique"
    UNIQUE ("store_id", "idempotency_key"),
  CONSTRAINT "checkout_placements_version_positive_check"
    CHECK ("checkout_version" > 0),
  CONSTRAINT "checkout_placements_revision_not_blank_check"
    CHECK (length(btrim("result_revision")) > 0),
  CONSTRAINT "checkout_placements_idempotency_not_blank_check"
    CHECK (length(btrim("idempotency_key")) > 0),
  CONSTRAINT "checkout_placements_request_hash_not_blank_check"
    CHECK (length(btrim("request_hash")) > 0),
  CONSTRAINT "checkout_placements_status_check"
    CHECK ("status" IN ('IN_PROGRESS', 'PLACED', 'FAILED')),
  CONSTRAINT "checkout_placements_result_check"
    CHECK (
      ("status" = 'PLACED' AND "result" IS NOT NULL AND jsonb_typeof("result") = 'object')
      OR ("status" <> 'PLACED' AND "result" IS NULL)
    )
);

CREATE INDEX "checkout_placements_status_idx"
  ON "checkout"."checkout_placements" ("status", "updated_at");

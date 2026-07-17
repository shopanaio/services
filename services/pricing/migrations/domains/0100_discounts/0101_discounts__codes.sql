-- Up Migration

CREATE TABLE "pricing"."discount_code" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "discount_id" uuid NOT NULL,
  "code" varchar(255) NOT NULL,
  "normalized_code" varchar(255)
    GENERATED ALWAYS AS (upper(btrim("code"))) STORED,
  "status" "pricing"."discount_code_status" NOT NULL DEFAULT 'ACTIVE',
  "usage_limit" bigint,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "disabled_at" timestamptz,

  CONSTRAINT "discount_code_discount_fk"
    FOREIGN KEY ("discount_id")
    REFERENCES "pricing"."discount" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "discount_code_discount_id_id_unique"
    UNIQUE ("discount_id", "id"),
  CONSTRAINT "discount_code_store_discount_id_unique"
    UNIQUE ("store_id", "discount_id", "id"),
  CONSTRAINT "discount_code_store_normalized_unique"
    UNIQUE ("store_id", "normalized_code"),
  CONSTRAINT "discount_code_value_check"
    CHECK (length(btrim("code")) BETWEEN 1 AND 255),
  CONSTRAINT "discount_code_usage_limit_check"
    CHECK ("usage_limit" IS NULL OR "usage_limit" > 0),
  CONSTRAINT "discount_code_status_check"
    CHECK (
      ("status" = 'ACTIVE' AND "disabled_at" IS NULL)
      OR ("status" = 'DISABLED' AND "disabled_at" IS NOT NULL)
    ),
  CONSTRAINT "discount_code_disabled_time_check"
    CHECK ("disabled_at" IS NULL OR "disabled_at" >= "created_at"),
  CONSTRAINT "discount_code_metadata_object_check"
    CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE INDEX "discount_code_discount_status_idx"
  ON "pricing"."discount_code" (
    "store_id",
    "discount_id",
    "status",
    "created_at",
    "id"
  );

CREATE INDEX "discount_code_active_lookup_idx"
  ON "pricing"."discount_code" ("store_id", "normalized_code", "discount_id")
  WHERE "status" = 'ACTIVE';

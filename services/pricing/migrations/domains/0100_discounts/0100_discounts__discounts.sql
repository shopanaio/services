-- Up Migration

CREATE TABLE "pricing"."discount" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "method" "pricing"."discount_method" NOT NULL,
  "calculation_strategy" "pricing"."discount_calculation_strategy" NOT NULL,
  "kind" "pricing"."discount_kind",
  "discount_class" "pricing"."discount_class" NOT NULL,
  "state" "pricing"."discount_state" NOT NULL DEFAULT 'DRAFT',
  "title" varchar(255),
  "currency" "pricing"."currency_code" NOT NULL,
  "priority" integer NOT NULL DEFAULT 0,
  "usage_limit" bigint,
  "applies_once_per_customer" boolean NOT NULL DEFAULT false,
  "applies_on_one_time_purchase" boolean NOT NULL DEFAULT true,
  "applies_on_subscription" boolean NOT NULL DEFAULT false,
  "starts_at" timestamptz NOT NULL DEFAULT now(),
  "ends_at" timestamptz,
  "created_by_id" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "archived_at" timestamptz,

  CONSTRAINT "discount_store_id_id_unique" UNIQUE ("store_id", "id"),
  CONSTRAINT "discount_title_check"
    CHECK (
      "title" IS NULL
      OR length(btrim("title")) BETWEEN 1 AND 255
    ),
  CONSTRAINT "discount_automatic_title_check"
    CHECK (
      "method" <> 'AUTOMATIC'
      OR ("title" IS NOT NULL AND length(btrim("title")) > 0)
    ),
  CONSTRAINT "discount_kind_class_check"
    CHECK (
      ("calculation_strategy" = 'FUNCTION' AND "kind" IS NULL)
      OR ("calculation_strategy" = 'NATIVE' AND (
        ("kind" IN ('AMOUNT_OFF_PRODUCTS', 'BUY_X_GET_Y') AND "discount_class" = 'PRODUCT')
        OR ("kind" = 'AMOUNT_OFF_ORDER' AND "discount_class" = 'ORDER')
        OR ("kind" = 'FREE_SHIPPING' AND "discount_class" = 'SHIPPING')
      ))
    ),
  CONSTRAINT "discount_priority_check"
    CHECK ("priority" >= 0),
  CONSTRAINT "discount_usage_limit_check"
    CHECK ("usage_limit" IS NULL OR "usage_limit" > 0),
  CONSTRAINT "discount_automatic_usage_check"
    CHECK (
      "method" = 'CODE'
      OR (
        "usage_limit" IS NULL
        AND "applies_once_per_customer" = false
      )
    ),
  CONSTRAINT "discount_purchase_mode_check"
    CHECK ("applies_on_one_time_purchase" OR "applies_on_subscription"),
  CONSTRAINT "discount_active_interval_check"
    CHECK ("ends_at" IS NULL OR "ends_at" > "starts_at"),
  CONSTRAINT "discount_archive_state_check"
    CHECK (
      ("state" = 'ARCHIVED' AND "archived_at" IS NOT NULL)
      OR ("state" <> 'ARCHIVED' AND "archived_at" IS NULL)
    ),
  CONSTRAINT "discount_archive_time_check"
    CHECK ("archived_at" IS NULL OR "archived_at" >= "created_at"),
  CONSTRAINT "discount_metadata_object_check"
    CHECK (jsonb_typeof("metadata") = 'object')
);

CREATE INDEX "discount_store_state_schedule_idx"
  ON "pricing"."discount" (
    "store_id",
    "state",
    "starts_at",
    "ends_at",
    "id"
  );

CREATE INDEX "discount_store_active_priority_idx"
  ON "pricing"."discount" (
    "store_id",
    "priority" DESC,
    "starts_at",
    "id"
  )
  WHERE "state" = 'ACTIVE';

CREATE INDEX "discount_store_kind_updated_idx"
  ON "pricing"."discount" (
    "store_id",
    "kind",
    "updated_at" DESC,
    "id"
  );

CREATE INDEX "discount_store_archived_idx"
  ON "pricing"."discount" ("store_id", "archived_at" DESC, "id")
  WHERE "state" = 'ARCHIVED';

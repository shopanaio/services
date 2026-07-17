-- Up Migration

CREATE TABLE "reviews"."rating_criterion" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "code" varchar(64) NOT NULL,
  "default_title" varchar(150) NOT NULL,
  "default_description" text,
  "weight" numeric(7, 4) NOT NULL DEFAULT 1,
  "is_required" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "applies_to_all_products" boolean NOT NULL DEFAULT true,
  "sort_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,

  CONSTRAINT "rating_criterion_code_check"
    CHECK ("code" ~ '^[A-Za-z][A-Za-z0-9_-]{0,63}$'),
  CONSTRAINT "rating_criterion_title_check"
    CHECK (length(btrim("default_title")) > 0),
  CONSTRAINT "rating_criterion_weight_check"
    CHECK ("weight" > 0),
  CONSTRAINT "rating_criterion_sort_check"
    CHECK ("sort_index" >= 0),
  CONSTRAINT "rating_criterion_deleted_at_check"
    CHECK ("deleted_at" IS NULL OR "deleted_at" >= "created_at")
);

CREATE UNIQUE INDEX "rating_criterion_store_code_unique"
  ON "reviews"."rating_criterion" ("store_id", lower("code"))
  WHERE "deleted_at" IS NULL;

CREATE INDEX "rating_criterion_store_active_sort_idx"
  ON "reviews"."rating_criterion" ("store_id", "is_active", "sort_index", "id")
  WHERE "deleted_at" IS NULL;

CREATE TABLE "reviews"."rating_criterion_translation" (
  "store_id" uuid NOT NULL,
  "criterion_id" uuid NOT NULL,
  "locale" "reviews"."locale_code" NOT NULL,
  "title" varchar(150) NOT NULL,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "rating_criterion_translation_pkey"
    PRIMARY KEY ("criterion_id", "locale"),
  CONSTRAINT "rating_criterion_translation_criterion_fk"
    FOREIGN KEY ("criterion_id")
    REFERENCES "reviews"."rating_criterion" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "rating_criterion_translation_title_check"
    CHECK (length(btrim("title")) > 0)
);

CREATE INDEX "rating_criterion_translation_store_locale_idx"
  ON "reviews"."rating_criterion_translation" ("store_id", "locale", "criterion_id");

CREATE TABLE "reviews"."rating_criterion_assignment" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "store_id" uuid NOT NULL,
  "criterion_id" uuid NOT NULL,
  "target_type" "reviews"."rating_criterion_target_type" NOT NULL,
  "target_id" uuid NOT NULL,
  "is_required_override" boolean,
  "sort_index_override" integer,
  "created_at" timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "rating_criterion_assignment_criterion_fk"
    FOREIGN KEY ("criterion_id")
    REFERENCES "reviews"."rating_criterion" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "rating_criterion_assignment_unique"
    UNIQUE ("criterion_id", "target_type", "target_id"),
  CONSTRAINT "rating_criterion_assignment_sort_check"
    CHECK ("sort_index_override" IS NULL OR "sort_index_override" >= 0)
);

CREATE INDEX "rating_criterion_assignment_target_idx"
  ON "reviews"."rating_criterion_assignment" (
    "store_id",
    "target_type",
    "target_id",
    "criterion_id"
  );

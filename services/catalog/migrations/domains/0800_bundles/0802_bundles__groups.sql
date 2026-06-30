-- Up Migration

CREATE TABLE "catalog"."bundle_group" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "sort_index" integer NOT NULL DEFAULT 0,
  "min_selection" integer,
  "max_selection" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "bundle_group_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bundle_group_configuration_id_fk"
    FOREIGN KEY ("configuration_id")
    REFERENCES "catalog"."bundle_configuration" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "bundle_group_selection_check"
    CHECK (
      ("min_selection" IS NULL OR "min_selection" >= 0)
      AND ("max_selection" IS NULL OR "max_selection" >= 0)
      AND (
        "min_selection" IS NULL
        OR "max_selection" IS NULL
        OR "max_selection" >= "min_selection"
      )
    )
);

CREATE INDEX "idx_bundle_group_configuration_id"
  ON "catalog"."bundle_group" ("configuration_id");

CREATE INDEX "idx_bundle_group_sort"
  ON "catalog"."bundle_group" ("configuration_id", "sort_index");

CREATE TABLE "catalog"."bundle_group_translation" (
  "project_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "bundle_group_translation_pkey" PRIMARY KEY ("group_id", "locale"),
  CONSTRAINT "bundle_group_translation_group_id_fk"
    FOREIGN KEY ("group_id")
    REFERENCES "catalog"."bundle_group" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_bundle_group_translation_project_locale"
  ON "catalog"."bundle_group_translation" ("project_id", "locale");

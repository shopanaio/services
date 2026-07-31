-- Up Migration

CREATE TABLE "catalog"."component_group" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "target_kind" "catalog"."component_target_kind" NOT NULL DEFAULT 'GROUP',
  "sort_index" integer NOT NULL DEFAULT 0,
  "min_selection" integer,
  "max_selection" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "component_group_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "component_group_configuration_id_fk"
    FOREIGN KEY ("configuration_id")
    REFERENCES "catalog"."component_configuration" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "component_group_configuration_id_id_unique"
    UNIQUE ("configuration_id", "id"),
  CONSTRAINT "component_group_target_kind_check"
    CHECK ("target_kind" = 'GROUP'),
  CONSTRAINT "component_group_target_fk"
    FOREIGN KEY ("configuration_id", "id", "target_kind")
    REFERENCES "catalog"."component_target" ("configuration_id", "id", "kind")
    ON DELETE CASCADE,
  CONSTRAINT "component_group_selection_check"
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

CREATE INDEX "idx_component_group_configuration_id"
  ON "catalog"."component_group" ("configuration_id");

CREATE INDEX "idx_component_group_sort"
  ON "catalog"."component_group" ("configuration_id", "sort_index");

CREATE TABLE "catalog"."component_group_translation" (
  "store_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "locale" "catalog"."locale_code" NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "component_group_translation_pkey"
    PRIMARY KEY ("group_id", "locale"),
  CONSTRAINT "component_group_translation_group_id_fk"
    FOREIGN KEY ("group_id")
    REFERENCES "catalog"."component_group" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_component_group_translation_store_locale"
  ON "catalog"."component_group_translation" ("store_id", "locale");

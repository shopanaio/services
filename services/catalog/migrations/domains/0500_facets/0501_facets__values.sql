-- Up Migration

CREATE TABLE "catalog"."facet_swatch" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "swatch_type" varchar(32) NOT NULL,
  "color_one" varchar(32),
  "color_two" varchar(32),
  "image_id" uuid,
  "metadata" jsonb,
  CONSTRAINT "facet_swatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "catalog"."facet_value" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "facet_id" uuid NOT NULL,
  "parent_id" uuid,
  "kind" varchar(16) NOT NULL,
  "handle" text NOT NULL,
  "swatch_id" uuid,
  "sort_index" integer NOT NULL DEFAULT 0,
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "facet_value_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "facet_value_facet_id_fk"
    FOREIGN KEY ("facet_id")
    REFERENCES "catalog"."facet" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "facet_value_parent_id_fk"
    FOREIGN KEY ("parent_id")
    REFERENCES "catalog"."facet_value" ("id")
    ON DELETE NO ACTION,
  CONSTRAINT "facet_value_swatch_id_fk"
    FOREIGN KEY ("swatch_id")
    REFERENCES "catalog"."facet_swatch" ("id")
    ON DELETE SET NULL,
  CONSTRAINT "facet_value_kind_check"
    CHECK ("kind" IN ('source', 'display')),
  CONSTRAINT "facet_value_display_root_check"
    CHECK ("kind" <> 'display' OR "parent_id" IS NULL)
);

CREATE UNIQUE INDEX "facet_value_source_project_facet_handle_uniq"
  ON "catalog"."facet_value" ("project_id", "facet_id", "handle")
  WHERE "kind" = 'source';

CREATE UNIQUE INDEX "facet_value_root_project_facet_handle_uniq"
  ON "catalog"."facet_value" ("project_id", "facet_id", "handle")
  WHERE "parent_id" IS NULL;

CREATE INDEX "idx_facet_value_project_facet_visible_order"
  ON "catalog"."facet_value" ("project_id", "facet_id", "sort_index", "id")
  WHERE "parent_id" IS NULL;

CREATE INDEX "idx_facet_value_project_parent"
  ON "catalog"."facet_value" ("project_id", "parent_id")
  WHERE "parent_id" IS NOT NULL;

CREATE INDEX "idx_facet_value_project_facet_source_handle"
  ON "catalog"."facet_value" ("project_id", "facet_id", "handle")
  WHERE "kind" = 'source';

CREATE TABLE "catalog"."facet_value_translation" (
  "facet_value_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "project_id" uuid NOT NULL,
  "label" text NOT NULL,
  CONSTRAINT "facet_value_translation_pkey" PRIMARY KEY ("facet_value_id", "locale"),
  CONSTRAINT "facet_value_translation_facet_value_id_fk"
    FOREIGN KEY ("facet_value_id")
    REFERENCES "catalog"."facet_value" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_facet_value_translation_project_locale"
  ON "catalog"."facet_value_translation" ("project_id", "locale");

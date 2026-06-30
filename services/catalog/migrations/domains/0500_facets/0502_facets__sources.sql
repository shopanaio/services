-- Up Migration

CREATE TABLE "catalog"."facet_source" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "facet_id" uuid NOT NULL,
  "facet_type" varchar(32) NOT NULL,
  "handle" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "facet_source_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "facet_source_facet_id_fk"
    FOREIGN KEY ("facet_id")
    REFERENCES "catalog"."facet" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "facet_source_project_facet_handle_uniq"
    UNIQUE ("project_id", "facet_id", "handle"),
  CONSTRAINT "facet_source_project_type_handle_uniq"
    UNIQUE ("project_id", "facet_type", "handle")
);

CREATE INDEX "idx_facet_source_project_facet"
  ON "catalog"."facet_source" ("project_id", "facet_id");

CREATE INDEX "idx_facet_source_project_type_handle"
  ON "catalog"."facet_source" ("project_id", "facet_type", "handle");

CREATE TABLE "catalog"."facet_source_translation" (
  "facet_source_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "project_id" uuid NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "facet_source_translation_pkey" PRIMARY KEY ("facet_source_id", "locale"),
  CONSTRAINT "facet_source_translation_facet_source_id_fk"
    FOREIGN KEY ("facet_source_id")
    REFERENCES "catalog"."facet_source" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_facet_source_translation_project_locale"
  ON "catalog"."facet_source_translation" ("project_id", "locale");

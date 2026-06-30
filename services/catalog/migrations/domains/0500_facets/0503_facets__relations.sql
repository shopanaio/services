-- Up Migration

CREATE TABLE "catalog"."facet_value_source_handle" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "facet_id" uuid NOT NULL,
  "facet_value_id" uuid NOT NULL,
  "facet_type" varchar(32) NOT NULL,
  "source_handle" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "facet_value_source_handle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "facet_value_source_handle_facet_id_fk"
    FOREIGN KEY ("facet_id")
    REFERENCES "catalog"."facet" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "facet_value_source_handle_facet_value_id_fk"
    FOREIGN KEY ("facet_value_id")
    REFERENCES "catalog"."facet_value" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "facet_value_source_handle_project_facet_source_uniq"
    UNIQUE ("project_id", "facet_id", "source_handle"),
  CONSTRAINT "facet_value_source_handle_project_type_source_uniq"
    UNIQUE ("project_id", "facet_type", "source_handle"),
  CONSTRAINT "facet_value_source_handle_value_source_uniq"
    UNIQUE ("facet_value_id", "source_handle")
);

CREATE INDEX "idx_facet_value_source_handle_project_value"
  ON "catalog"."facet_value_source_handle" ("project_id", "facet_value_id");

CREATE INDEX "idx_facet_value_source_handle_project_type_source"
  ON "catalog"."facet_value_source_handle" ("project_id", "facet_type", "source_handle");

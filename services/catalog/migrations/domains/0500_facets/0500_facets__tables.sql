-- Up Migration

CREATE TABLE "catalog"."facet" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "facet_type" varchar(32) NOT NULL,
  "ui_type" varchar(16) NOT NULL DEFAULT 'checkbox',
  "selection_mode" varchar(16) NOT NULL DEFAULT 'multi',
  "lexo_rank" varchar(64) NOT NULL,
  "slug" varchar(255) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "facet_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "facet_project_id_slug_uniq" UNIQUE ("project_id", "slug")
);

CREATE INDEX "idx_facet_rank"
  ON "catalog"."facet" ("project_id", "lexo_rank");

CREATE TABLE "catalog"."facet_translation" (
  "facet_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "project_id" uuid NOT NULL,
  "label" text NOT NULL,
  CONSTRAINT "facet_translation_pkey" PRIMARY KEY ("facet_id", "locale"),
  CONSTRAINT "facet_translation_facet_id_fk"
    FOREIGN KEY ("facet_id")
    REFERENCES "catalog"."facet" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_facet_translation_project_locale"
  ON "catalog"."facet_translation" ("project_id", "locale");

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
  "slug" varchar(255) NOT NULL,
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
  CONSTRAINT "facet_value_swatch_id_fk"
    FOREIGN KEY ("swatch_id")
    REFERENCES "catalog"."facet_swatch" ("id")
    ON DELETE SET NULL,
  CONSTRAINT "facet_value_facet_id_slug_uniq" UNIQUE ("facet_id", "slug")
);

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

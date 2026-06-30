-- Up Migration

CREATE TABLE "catalog"."collection_translation" (
  "collection_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "project_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description_text" text,
  "description_html" text,
  "description_json" text,
  "excerpt_text" text,
  "excerpt_html" text,
  "excerpt_json" text,
  CONSTRAINT "collection_translation_pkey" PRIMARY KEY ("collection_id", "locale"),
  CONSTRAINT "collection_translation_collection_id_fk"
    FOREIGN KEY ("collection_id")
    REFERENCES "catalog"."collection" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_collection_translation_project_locale"
  ON "catalog"."collection_translation" ("project_id", "locale");

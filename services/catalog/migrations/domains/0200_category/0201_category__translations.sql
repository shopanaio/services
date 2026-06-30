-- Up Migration

CREATE TABLE "catalog"."category_translation" (
  "project_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "name" text NOT NULL,
  "description_text" text,
  "description_html" text,
  "description_json" text,
  "excerpt_text" text,
  "excerpt_html" text,
  "excerpt_json" text,
  CONSTRAINT "category_translation_pkey" PRIMARY KEY ("category_id", "locale"),
  CONSTRAINT "category_translation_category_id_fk"
    FOREIGN KEY ("category_id")
    REFERENCES "catalog"."category" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_category_translation_project"
  ON "catalog"."category_translation" ("project_id");

CREATE INDEX "idx_category_translation_project_locale"
  ON "catalog"."category_translation" ("project_id", "locale");

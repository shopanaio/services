-- Up Migration

CREATE TABLE "catalog"."category_seo" (
  "project_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "seo_title" varchar(70),
  "seo_description" varchar(160),
  "og_title" varchar(95),
  "og_description" text,
  "og_image_id" uuid,
  CONSTRAINT "category_seo_pkey" PRIMARY KEY ("category_id", "locale"),
  CONSTRAINT "category_seo_category_id_fk"
    FOREIGN KEY ("category_id")
    REFERENCES "catalog"."category" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_category_seo_project"
  ON "catalog"."category_seo" ("project_id");

CREATE INDEX "idx_category_seo_project_locale"
  ON "catalog"."category_seo" ("project_id", "locale");

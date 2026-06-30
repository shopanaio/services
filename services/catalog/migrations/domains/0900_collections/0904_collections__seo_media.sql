-- Up Migration

CREATE TABLE "catalog"."collection_seo" (
  "collection_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "project_id" uuid NOT NULL,
  "seo_title" varchar(70),
  "seo_description" varchar(160),
  "og_title" varchar(95),
  "og_description" text,
  "og_image_id" uuid,
  CONSTRAINT "collection_seo_pkey" PRIMARY KEY ("collection_id", "locale"),
  CONSTRAINT "collection_seo_collection_id_fk"
    FOREIGN KEY ("collection_id")
    REFERENCES "catalog"."collection" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_collection_seo_project_locale"
  ON "catalog"."collection_seo" ("project_id", "locale");

CREATE TABLE "catalog"."collection_media" (
  "collection_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "sort_index" integer NOT NULL DEFAULT 0,
  CONSTRAINT "collection_media_pkey" PRIMARY KEY ("collection_id", "file_id"),
  CONSTRAINT "collection_media_collection_id_fk"
    FOREIGN KEY ("collection_id")
    REFERENCES "catalog"."collection" ("id")
    ON DELETE CASCADE
);

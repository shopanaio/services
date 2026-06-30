-- Up Migration

CREATE TABLE "catalog"."category" (
  "project_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "parent_id" uuid,
  "path" text NOT NULL,
  "depth" integer NOT NULL DEFAULT 0,
  "handle" varchar(255) NOT NULL,
  "default_sort" varchar(32) NOT NULL DEFAULT 'manual',
  "default_sort_direction" varchar(4) NOT NULL DEFAULT 'asc',
  "published_at" timestamp with time zone,
  "revision" integer NOT NULL DEFAULT 0,
  "products_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone,
  CONSTRAINT "category_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "category_published_requires_handle"
    CHECK ("published_at" IS NULL OR "handle" IS NOT NULL),
  CONSTRAINT "category_default_sort_check"
    CHECK ("default_sort" IN ('manual', 'price', 'newest', 'name')),
  CONSTRAINT "category_default_sort_direction_check"
    CHECK ("default_sort_direction" IN ('asc', 'desc'))
);

CREATE UNIQUE INDEX "category_project_id_handle_key"
  ON "catalog"."category" ("project_id", "handle")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "idx_category_project_id"
  ON "catalog"."category" ("project_id");

CREATE INDEX "idx_category_parent_id"
  ON "catalog"."category" ("parent_id");

CREATE INDEX "idx_category_path"
  ON "catalog"."category" ("path");

CREATE INDEX "idx_category_published"
  ON "catalog"."category" ("project_id", "published_at")
  WHERE "deleted_at" IS NULL;

CREATE TABLE "catalog"."category_media" (
  "project_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "sort_index" integer NOT NULL DEFAULT 0,
  CONSTRAINT "category_media_pkey" PRIMARY KEY ("category_id", "file_id"),
  CONSTRAINT "category_media_category_id_fk"
    FOREIGN KEY ("category_id")
    REFERENCES "catalog"."category" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_category_media_category"
  ON "catalog"."category_media" ("category_id");

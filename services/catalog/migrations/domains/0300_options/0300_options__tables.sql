-- Up Migration

CREATE TABLE "catalog"."product_option_swatch" (
  "project_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "color_one" varchar(32),
  "color_two" varchar(32),
  "image_id" uuid,
  "swatch_type" varchar(32) NOT NULL,
  "metadata" jsonb,
  CONSTRAINT "product_option_swatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_product_option_swatch_project_id"
  ON "catalog"."product_option_swatch" ("project_id");

CREATE TABLE "catalog"."product_option" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "slug" varchar(255) NOT NULL,
  "display_type" varchar(32) NOT NULL,
  "sort_index" integer NOT NULL DEFAULT 0,
  CONSTRAINT "product_option_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_option_product_id_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "product_option_product_id_slug_key"
    UNIQUE ("product_id", "slug")
);

CREATE INDEX "idx_product_option_product_id"
  ON "catalog"."product_option" ("product_id");

CREATE INDEX "idx_product_option_sort"
  ON "catalog"."product_option" ("project_id", "product_id", "sort_index");

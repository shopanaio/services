-- Up Migration

CREATE TABLE "catalog"."product_option_swatch" (
  "store_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "color_one" varchar(32),
  "color_two" varchar(32),
  "image_id" uuid,
  "swatch_type" varchar(32) NOT NULL,
  "metadata" jsonb,
  CONSTRAINT "product_option_swatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_product_option_swatch_store_id"
  ON "catalog"."product_option_swatch" ("store_id");

CREATE TABLE "catalog"."product_option_category" (
  "store_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "product_option_category_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_option_category_store_id_slug_key" UNIQUE ("store_id", "slug"),
  CONSTRAINT "product_option_category_store_id_id_unique" UNIQUE ("store_id", "id")
);

CREATE INDEX "idx_product_option_category_store_id"
  ON "catalog"."product_option_category" ("store_id");

CREATE TABLE "catalog"."product_option" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "slug" varchar(255) NOT NULL,
  "sort_index" integer NOT NULL DEFAULT 0,
  CONSTRAINT "product_option_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_option_product_id_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "product_option_category_id_fk"
    FOREIGN KEY ("category_id")
    REFERENCES "catalog"."product_option_category" ("id")
    ON DELETE RESTRICT,
  CONSTRAINT "product_option_product_id_slug_key"
    UNIQUE ("product_id", "slug")
);

CREATE INDEX "idx_product_option_product_id"
  ON "catalog"."product_option" ("product_id");

CREATE INDEX "idx_product_option_category_id"
  ON "catalog"."product_option" ("category_id");

CREATE INDEX "idx_product_option_sort"
  ON "catalog"."product_option" ("store_id", "product_id", "sort_index");

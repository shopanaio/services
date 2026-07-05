-- Up Migration

CREATE TABLE "catalog"."product_media" (
  "store_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "sort_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_media_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_media_store_id_product_id_file_id_unique"
    UNIQUE ("store_id", "product_id", "file_id"),
  CONSTRAINT "product_media_store_id_product_id_id_unique"
    UNIQUE ("store_id", "product_id", "id"),
  CONSTRAINT "product_media_store_id_id_unique"
    UNIQUE ("store_id", "id"),
  CONSTRAINT "product_media_product_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_product_media_store"
  ON "catalog"."product_media" ("store_id");

CREATE INDEX "idx_product_media_product"
  ON "catalog"."product_media" ("store_id", "product_id");

CREATE INDEX "idx_product_media_file"
  ON "catalog"."product_media" ("store_id", "file_id");

CREATE INDEX "idx_product_media_sort"
  ON "catalog"."product_media" ("store_id", "product_id", "sort_index");

CREATE TABLE "catalog"."variant_media" (
  "store_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "product_media_id" uuid NOT NULL,
  "sort_index" integer NOT NULL DEFAULT 0,
  CONSTRAINT "variant_media_pkey"
    PRIMARY KEY ("variant_id", "product_media_id"),
  CONSTRAINT "variant_media_product_media_fk"
    FOREIGN KEY ("product_media_id")
    REFERENCES "catalog"."product_media" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "variant_media_variant_fk"
    FOREIGN KEY ("variant_id")
    REFERENCES "catalog"."variant" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_variant_media_store"
  ON "catalog"."variant_media" ("store_id");

CREATE INDEX "idx_variant_media_product"
  ON "catalog"."variant_media" ("store_id", "product_id");

CREATE INDEX "idx_variant_media_variant"
  ON "catalog"."variant_media" ("store_id", "variant_id");

CREATE INDEX "idx_variant_media_product_media"
  ON "catalog"."variant_media" ("store_id", "product_media_id");

CREATE INDEX "idx_variant_media_sort"
  ON "catalog"."variant_media" ("store_id", "variant_id", "sort_index");

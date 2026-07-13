-- Up Migration

CREATE TABLE "catalog"."product_seo" (
  "store_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "locale" "catalog"."locale_code" NOT NULL,
  "seo_title" varchar(70),
  "seo_description" varchar(160),
  "og_title" varchar(95),
  "og_description" text,
  "og_image_id" uuid,
  CONSTRAINT "product_seo_pkey" PRIMARY KEY ("product_id", "locale"),
  CONSTRAINT "product_seo_product_id_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_product_seo_store"
  ON "catalog"."product_seo" ("store_id");

CREATE INDEX "idx_product_seo_store_locale"
  ON "catalog"."product_seo" ("store_id", "locale");

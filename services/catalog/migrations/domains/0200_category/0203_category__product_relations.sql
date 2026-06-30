-- Up Migration

CREATE TABLE "catalog"."product_category" (
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "is_primary" boolean NOT NULL DEFAULT false,
  "lexo_rank" varchar(64) NOT NULL,
  CONSTRAINT "product_category_pkey" PRIMARY KEY ("product_id", "category_id"),
  CONSTRAINT "product_category_product_id_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "product_category_category_id_fk"
    FOREIGN KEY ("category_id")
    REFERENCES "catalog"."category" ("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX "product_category_one_primary_per_product_idx"
  ON "catalog"."product_category" ("project_id", "product_id")
  WHERE "is_primary" = true;

CREATE INDEX "idx_product_category_product"
  ON "catalog"."product_category" ("product_id");

CREATE INDEX "idx_product_category_category"
  ON "catalog"."product_category" ("category_id");

CREATE INDEX "idx_product_category_rank"
  ON "catalog"."product_category" ("category_id", "lexo_rank");

-- Up Migration

CREATE TABLE "catalog"."product_feature_value" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "feature_id" uuid NOT NULL,
  "slug" varchar(255) NOT NULL,
  "index" integer NOT NULL,
  CONSTRAINT "product_feature_value_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_feature_value_feature_id_fk"
    FOREIGN KEY ("feature_id")
    REFERENCES "catalog"."product_feature" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "product_feature_value_feature_id_index_uniq"
    UNIQUE ("feature_id", "index"),
  CONSTRAINT "product_feature_value_feature_id_slug_uniq"
    UNIQUE ("feature_id", "slug")
);

CREATE INDEX "idx_product_feature_value_feature_id"
  ON "catalog"."product_feature_value" ("feature_id");

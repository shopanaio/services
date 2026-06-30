-- Up Migration

CREATE TABLE "catalog"."product_feature" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "slug" varchar(255) NOT NULL,
  "index" integer[] NOT NULL,
  "is_group" boolean NOT NULL DEFAULT false,
  "parent_id" uuid,
  CONSTRAINT "product_feature_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_feature_product_id_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "product_feature_parent_id_fk"
    FOREIGN KEY ("parent_id")
    REFERENCES "catalog"."product_feature" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "feature_group_no_parent"
    CHECK ("is_group" = false OR "parent_id" IS NULL),
  CONSTRAINT "feature_index_not_empty"
    CHECK (array_length("index", 1) > 0),
  CONSTRAINT "feature_group_root_only"
    CHECK ("is_group" = false OR array_length("index", 1) = 1),
  CONSTRAINT "product_feature_product_id_index_uniq"
    UNIQUE ("product_id", "index"),
  CONSTRAINT "product_feature_product_id_slug_uniq"
    UNIQUE ("product_id", "slug")
);

CREATE INDEX "product_feature_sort_idx"
  ON "catalog"."product_feature" ("product_id", "index");

CREATE INDEX "idx_product_feature_product_id"
  ON "catalog"."product_feature" ("product_id");

CREATE INDEX "product_feature_children_idx"
  ON "catalog"."product_feature" ("product_id", "parent_id", "index");

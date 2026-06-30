-- Up Migration

CREATE TABLE "catalog"."product_feature_translation" (
  "project_id" uuid NOT NULL,
  "feature_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "product_feature_translation_pkey" PRIMARY KEY ("feature_id", "locale"),
  CONSTRAINT "product_feature_translation_feature_id_fk"
    FOREIGN KEY ("feature_id")
    REFERENCES "catalog"."product_feature" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_product_feature_translation_project"
  ON "catalog"."product_feature_translation" ("project_id");

CREATE TABLE "catalog"."product_feature_value_translation" (
  "project_id" uuid NOT NULL,
  "feature_value_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "product_feature_value_translation_pkey"
    PRIMARY KEY ("feature_value_id", "locale"),
  CONSTRAINT "product_feature_value_translation_feature_value_id_fk"
    FOREIGN KEY ("feature_value_id")
    REFERENCES "catalog"."product_feature_value" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_product_feature_value_translation_project"
  ON "catalog"."product_feature_value_translation" ("project_id");

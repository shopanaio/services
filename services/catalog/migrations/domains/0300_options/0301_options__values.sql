-- Up Migration

CREATE TABLE "catalog"."product_option_value" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "option_id" uuid NOT NULL,
  "swatch_id" uuid,
  "slug" varchar(255) NOT NULL,
  "sort_index" integer NOT NULL,
  CONSTRAINT "product_option_value_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_option_value_option_id_fk"
    FOREIGN KEY ("option_id")
    REFERENCES "catalog"."product_option" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "product_option_value_swatch_id_fk"
    FOREIGN KEY ("swatch_id")
    REFERENCES "catalog"."product_option_swatch" ("id")
    ON DELETE SET NULL,
  CONSTRAINT "product_option_value_option_id_slug_key"
    UNIQUE ("option_id", "slug")
);

CREATE INDEX "idx_product_option_value_option_id"
  ON "catalog"."product_option_value" ("option_id");

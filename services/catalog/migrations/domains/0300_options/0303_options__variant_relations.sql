-- Up Migration

CREATE TABLE "catalog"."product_option_variant_link" (
  "project_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "option_id" uuid NOT NULL,
  "option_value_id" uuid,
  CONSTRAINT "product_option_variant_link_pkey" PRIMARY KEY ("variant_id", "option_id"),
  CONSTRAINT "product_option_variant_link_variant_id_fk"
    FOREIGN KEY ("variant_id")
    REFERENCES "catalog"."variant" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "product_option_variant_link_option_id_fk"
    FOREIGN KEY ("option_id")
    REFERENCES "catalog"."product_option" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "product_option_variant_link_option_value_id_fk"
    FOREIGN KEY ("option_value_id")
    REFERENCES "catalog"."product_option_value" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_product_option_variant_link_project_id"
  ON "catalog"."product_option_variant_link" ("project_id");

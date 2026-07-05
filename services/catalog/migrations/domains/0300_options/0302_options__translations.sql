-- Up Migration

CREATE TABLE "catalog"."product_option_translation" (
  "store_id" uuid NOT NULL,
  "option_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "product_option_translation_pkey" PRIMARY KEY ("option_id", "locale"),
  CONSTRAINT "product_option_translation_option_id_fk"
    FOREIGN KEY ("option_id")
    REFERENCES "catalog"."product_option" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_product_option_translation_store"
  ON "catalog"."product_option_translation" ("store_id");

CREATE TABLE "catalog"."product_option_value_translation" (
  "store_id" uuid NOT NULL,
  "option_value_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "product_option_value_translation_pkey"
    PRIMARY KEY ("option_value_id", "locale"),
  CONSTRAINT "product_option_value_translation_option_value_id_fk"
    FOREIGN KEY ("option_value_id")
    REFERENCES "catalog"."product_option_value" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_product_option_value_translation_store"
  ON "catalog"."product_option_value_translation" ("store_id");

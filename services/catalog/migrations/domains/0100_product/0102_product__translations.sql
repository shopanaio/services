-- Up Migration

CREATE TABLE "catalog"."product_translation" (
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "name" text NOT NULL,
  "description_text" text,
  "description_html" text,
  "description_json" jsonb,
  "excerpt_text" text,
  "excerpt_html" text,
  "excerpt_json" jsonb,
  CONSTRAINT "product_translation_pkey" PRIMARY KEY ("product_id", "locale"),
  CONSTRAINT "product_translation_product_id_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_product_translation_project"
  ON "catalog"."product_translation" ("project_id");

CREATE INDEX "idx_product_translation_project_locale"
  ON "catalog"."product_translation" ("project_id", "locale");

CREATE TABLE "catalog"."variant_translation" (
  "project_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "title" text,
  CONSTRAINT "variant_translation_pkey" PRIMARY KEY ("variant_id", "locale"),
  CONSTRAINT "variant_translation_variant_id_fk"
    FOREIGN KEY ("variant_id")
    REFERENCES "catalog"."variant" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_variant_translation_project"
  ON "catalog"."variant_translation" ("project_id");

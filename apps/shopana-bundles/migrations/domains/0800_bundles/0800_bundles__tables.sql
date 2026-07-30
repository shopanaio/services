-- Up Migration

CREATE SCHEMA IF NOT EXISTS "app_shopana_bundles";

CREATE TABLE "app_shopana_bundles"."bundle" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "type" varchar(32),
  "display_style" varchar(32) NOT NULL DEFAULT 'ACCORDION',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "bundle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bundle_product_id_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "bundle_display_style_check"
    CHECK ("display_style" IN ('ACCORDION', 'TABS', 'FLAT', 'WIZARD'))
);

CREATE UNIQUE INDEX "bundle_product_id_unique"
  ON "app_shopana_bundles"."bundle" ("product_id");

CREATE INDEX "idx_bundle_store_id"
  ON "app_shopana_bundles"."bundle" ("store_id");

CREATE TABLE "app_shopana_bundles"."bundle_configuration" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "bundle_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "bundle_configuration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bundle_configuration_bundle_id_fk"
    FOREIGN KEY ("bundle_id")
    REFERENCES "app_shopana_bundles"."bundle" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_bundle_configuration_bundle_id"
  ON "app_shopana_bundles"."bundle_configuration" ("bundle_id");

CREATE TABLE "app_shopana_bundles"."bundle_configuration_variant" (
  "store_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  CONSTRAINT "bundle_configuration_variant_pkey"
    PRIMARY KEY ("configuration_id", "variant_id"),
  CONSTRAINT "bundle_configuration_variant_configuration_id_fk"
    FOREIGN KEY ("configuration_id")
    REFERENCES "app_shopana_bundles"."bundle_configuration" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "bundle_configuration_variant_variant_id_fk"
    FOREIGN KEY ("variant_id")
    REFERENCES "catalog"."variant" ("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX "bundle_configuration_variant_unique"
  ON "app_shopana_bundles"."bundle_configuration_variant" ("variant_id");

CREATE INDEX "idx_bundle_configuration_variant_store_id"
  ON "app_shopana_bundles"."bundle_configuration_variant" ("store_id");

-- Up Migration

CREATE TABLE "catalog"."bundle" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
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
  ON "catalog"."bundle" ("product_id");

CREATE INDEX "idx_bundle_project_id"
  ON "catalog"."bundle" ("project_id");

CREATE TABLE "catalog"."bundle_configuration" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "bundle_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "bundle_configuration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bundle_configuration_bundle_id_fk"
    FOREIGN KEY ("bundle_id")
    REFERENCES "catalog"."bundle" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_bundle_configuration_bundle_id"
  ON "catalog"."bundle_configuration" ("bundle_id");

CREATE TABLE "catalog"."bundle_configuration_variant" (
  "project_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  CONSTRAINT "bundle_configuration_variant_pkey"
    PRIMARY KEY ("configuration_id", "variant_id"),
  CONSTRAINT "bundle_configuration_variant_configuration_id_fk"
    FOREIGN KEY ("configuration_id")
    REFERENCES "catalog"."bundle_configuration" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "bundle_configuration_variant_variant_id_fk"
    FOREIGN KEY ("variant_id")
    REFERENCES "catalog"."variant" ("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX "bundle_configuration_variant_unique"
  ON "catalog"."bundle_configuration_variant" ("variant_id");

CREATE INDEX "idx_bundle_configuration_variant_project_id"
  ON "catalog"."bundle_configuration_variant" ("project_id");

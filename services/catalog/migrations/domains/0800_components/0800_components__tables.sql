-- Up Migration

CREATE TABLE "catalog"."component" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "display_style" varchar(32) NOT NULL DEFAULT 'ACCORDION',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "component_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "component_product_id_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "component_display_style_check"
    CHECK ("display_style" IN ('ACCORDION', 'TABS', 'FLAT', 'WIZARD'))
);

CREATE UNIQUE INDEX "component_product_id_unique"
  ON "catalog"."component" ("product_id");

CREATE INDEX "idx_component_store_id"
  ON "catalog"."component" ("store_id");

CREATE TABLE "catalog"."component_configuration" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "component_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "component_configuration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "component_configuration_component_id_fk"
    FOREIGN KEY ("component_id")
    REFERENCES "catalog"."component" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_component_configuration_component_id"
  ON "catalog"."component_configuration" ("component_id");

CREATE TABLE "catalog"."component_configuration_variant" (
  "store_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  CONSTRAINT "component_configuration_variant_pkey"
    PRIMARY KEY ("configuration_id", "variant_id"),
  CONSTRAINT "component_configuration_variant_configuration_id_fk"
    FOREIGN KEY ("configuration_id")
    REFERENCES "catalog"."component_configuration" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "component_configuration_variant_variant_id_fk"
    FOREIGN KEY ("variant_id")
    REFERENCES "catalog"."variant" ("id")
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX "component_configuration_variant_unique"
  ON "catalog"."component_configuration_variant" ("variant_id");

CREATE INDEX "idx_component_configuration_variant_store_id"
  ON "catalog"."component_configuration_variant" ("store_id");

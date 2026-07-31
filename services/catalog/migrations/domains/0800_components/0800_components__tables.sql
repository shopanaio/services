-- Up Migration

CREATE TYPE "catalog"."component_target_kind" AS ENUM (
  'CONFIGURATION',
  'GROUP',
  'ITEM'
);

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

CREATE TABLE "catalog"."component_target" (
  "store_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "kind" "catalog"."component_target_kind" NOT NULL,
  "parent_id" uuid,
  "parent_kind" "catalog"."component_target_kind",
  CONSTRAINT "component_target_pkey"
    PRIMARY KEY ("configuration_id", "id"),
  CONSTRAINT "component_target_configuration_id_fk"
    FOREIGN KEY ("configuration_id")
    REFERENCES "catalog"."component_configuration" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "component_target_identity_kind_unique"
    UNIQUE ("configuration_id", "id", "kind"),
  CONSTRAINT "component_target_item_parent_unique"
    UNIQUE ("configuration_id", "id", "kind", "parent_id"),
  CONSTRAINT "component_target_hierarchy_check"
    CHECK (
      (
        "kind" = 'CONFIGURATION'
        AND "parent_id" IS NULL
        AND "parent_kind" IS NULL
      )
      OR (
        "kind" = 'GROUP'
        AND "parent_id" IS NOT NULL
        AND "parent_kind" = 'CONFIGURATION'
      )
      OR (
        "kind" = 'ITEM'
        AND "parent_id" IS NOT NULL
        AND "parent_kind" = 'GROUP'
      )
    ),
  CONSTRAINT "component_target_parent_fk"
    FOREIGN KEY ("configuration_id", "parent_id", "parent_kind")
    REFERENCES "catalog"."component_target" (
      "configuration_id",
      "id",
      "kind"
    )
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX "component_target_configuration_root_unique"
  ON "catalog"."component_target" ("configuration_id")
  WHERE "kind" = 'CONFIGURATION';

CREATE INDEX "idx_component_target_parent"
  ON "catalog"."component_target" ("configuration_id", "parent_id");

CREATE TABLE "catalog"."component_configuration_target" (
  "store_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "kind" "catalog"."component_target_kind"
    NOT NULL
    DEFAULT 'CONFIGURATION',
  CONSTRAINT "component_configuration_target_pkey"
    PRIMARY KEY ("configuration_id", "id"),
  CONSTRAINT "component_configuration_target_configuration_unique"
    UNIQUE ("configuration_id"),
  CONSTRAINT "component_configuration_target_identity_check"
    CHECK ("kind" = 'CONFIGURATION' AND "id" = "configuration_id"),
  CONSTRAINT "component_configuration_target_registry_fk"
    FOREIGN KEY ("configuration_id", "id", "kind")
    REFERENCES "catalog"."component_target" ("configuration_id", "id", "kind")
    ON DELETE CASCADE
);

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

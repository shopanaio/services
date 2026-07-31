-- Up Migration

CREATE TABLE "catalog"."component_item" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "configuration_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "target_kind" "catalog"."component_target_kind" NOT NULL DEFAULT 'ITEM',
  "item_type" varchar(32) NOT NULL,
  "sort_index" integer NOT NULL DEFAULT 0,
  "ref_product_id" uuid,
  "ref_variant_id" uuid,
  "featured_image_id" uuid,
  "min_qty" integer DEFAULT 1,
  "max_qty" integer,
  "default_qty" integer DEFAULT 1,
  "price_rule_id" uuid,
  "pricing_template_id" uuid,
  "visible" boolean NOT NULL DEFAULT true,
  "selected" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "component_item_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "component_item_target_kind_check"
    CHECK ("target_kind" = 'ITEM'),
  CONSTRAINT "component_item_group_fk"
    FOREIGN KEY ("configuration_id", "group_id")
    REFERENCES "catalog"."component_group" ("configuration_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "component_item_target_fk"
    FOREIGN KEY ("configuration_id", "id", "target_kind", "group_id")
    REFERENCES "catalog"."component_target" (
      "configuration_id",
      "id",
      "kind",
      "parent_id"
    )
    ON DELETE CASCADE,
  CONSTRAINT "component_item_price_rule_id_fk"
    FOREIGN KEY ("price_rule_id")
    REFERENCES "catalog"."component_price_rule" ("id")
    ON DELETE SET NULL,
  CONSTRAINT "component_item_pricing_template_id_fk"
    FOREIGN KEY ("pricing_template_id")
    REFERENCES "catalog"."component_pricing_template" ("id")
    ON DELETE SET NULL,
  CONSTRAINT "component_item_quantity_check"
    CHECK (
      ("min_qty" IS NULL OR "min_qty" >= 0)
      AND (
        "default_qty" IS NULL
        OR "min_qty" IS NULL
        OR "default_qty" >= "min_qty"
      )
      AND (
        "default_qty" IS NULL
        OR "max_qty" IS NULL
        OR "default_qty" <= "max_qty"
      )
      AND (
        "max_qty" IS NULL
        OR "min_qty" IS NULL
        OR "max_qty" >= "min_qty"
      )
    ),
  CONSTRAINT "component_item_reference_check"
    CHECK (
      (
        "item_type" = 'PRODUCT'
        AND "ref_product_id" IS NOT NULL
        AND "ref_variant_id" IS NULL
      )
      OR (
        "item_type" = 'VARIANT'
        AND "ref_variant_id" IS NOT NULL
        AND "ref_product_id" IS NULL
      )
    ),
  CONSTRAINT "component_item_pricing_source_check"
    CHECK (
      NOT (
        "pricing_template_id" IS NOT NULL
        AND "price_rule_id" IS NOT NULL
      )
    )
);

CREATE INDEX "idx_component_item_group_id"
  ON "catalog"."component_item" ("group_id");

CREATE INDEX "idx_component_item_ref_product_id"
  ON "catalog"."component_item" ("ref_product_id");

CREATE INDEX "idx_component_item_ref_variant_id"
  ON "catalog"."component_item" ("ref_variant_id");

CREATE INDEX "idx_component_item_sort"
  ON "catalog"."component_item" ("group_id", "sort_index");

CREATE INDEX "idx_component_item_price_rule_id"
  ON "catalog"."component_item" ("price_rule_id");

CREATE TABLE "catalog"."component_item_option_selection" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "ref_option_id" uuid NOT NULL,
  "parent_option_id" uuid,
  "sort_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "component_item_option_selection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "component_item_option_selection_item_id_fk"
    FOREIGN KEY ("item_id")
    REFERENCES "catalog"."component_item" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "component_item_option_selection_ref_option_id_fk"
    FOREIGN KEY ("ref_option_id")
    REFERENCES "catalog"."product_option" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "component_item_option_selection_parent_option_id_fk"
    FOREIGN KEY ("parent_option_id")
    REFERENCES "catalog"."product_option" ("id")
    ON DELETE SET NULL
);

CREATE INDEX "idx_component_item_option_selection_item_id"
  ON "catalog"."component_item_option_selection" ("item_id");

CREATE INDEX "idx_component_item_option_selection_ref_option_id"
  ON "catalog"."component_item_option_selection" ("ref_option_id");

CREATE INDEX "idx_component_item_option_selection_parent_option_id"
  ON "catalog"."component_item_option_selection" ("parent_option_id");

CREATE UNIQUE INDEX "component_item_option_selection_item_option_unique"
  ON "catalog"."component_item_option_selection" ("item_id", "ref_option_id");

CREATE TABLE "catalog"."component_item_option_value_selection" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "option_selection_id" uuid NOT NULL,
  "ref_option_value_id" uuid,
  "value" text NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'SELECTED',
  "sort_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "component_item_option_value_selection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "component_item_option_value_selection_option_selection_id_fk"
    FOREIGN KEY ("option_selection_id")
    REFERENCES "catalog"."component_item_option_selection" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "component_item_option_value_selection_ref_option_value_id_fk"
    FOREIGN KEY ("ref_option_value_id")
    REFERENCES "catalog"."product_option_value" ("id")
    ON DELETE SET NULL
);

CREATE INDEX "idx_component_item_option_value_selection_option_id"
  ON "catalog"."component_item_option_value_selection" ("option_selection_id");

CREATE INDEX "idx_component_item_option_value_selection_ref_value_id"
  ON "catalog"."component_item_option_value_selection" ("ref_option_value_id");

CREATE INDEX "idx_component_item_option_value_selection_status"
  ON "catalog"."component_item_option_value_selection" (
    "option_selection_id",
    "status"
  );

CREATE UNIQUE INDEX "component_item_option_value_selection_value_unique"
  ON "catalog"."component_item_option_value_selection" (
    "option_selection_id",
    "value"
  );

CREATE TABLE "catalog"."component_item_translation" (
  "store_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "locale" "catalog"."locale_code" NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "component_item_translation_pkey"
    PRIMARY KEY ("item_id", "locale"),
  CONSTRAINT "component_item_translation_item_id_fk"
    FOREIGN KEY ("item_id")
    REFERENCES "catalog"."component_item" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_component_item_translation_store_locale"
  ON "catalog"."component_item_translation" ("store_id", "locale");

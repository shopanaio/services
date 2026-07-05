-- Up Migration

CREATE TABLE "listing"."facet_swatch" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "swatch_type" varchar(32) NOT NULL,
  "color_one" varchar(32),
  "color_two" varchar(32),
  "image_id" uuid,
  "metadata" jsonb,
  CONSTRAINT "facet_swatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listing"."facet_value" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "facet_id" uuid NOT NULL,
  "parent_id" uuid,
  "kind" varchar(16) NOT NULL,
  "handle" text NOT NULL,
  "swatch_id" uuid,
  "sort_index" integer NOT NULL DEFAULT 0,
  "enabled" boolean NOT NULL DEFAULT true,
  "reference_status" "listing"."reference_status" NOT NULL DEFAULT 'VALID',
  "reference_status_changed_at" timestamp with time zone,
  "reference_checked_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "facet_value_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "facet_value_facet_id_fk"
    FOREIGN KEY ("facet_id")
    REFERENCES "listing"."facet" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "facet_value_parent_id_fk"
    FOREIGN KEY ("parent_id")
    REFERENCES "listing"."facet_value" ("id")
    ON DELETE NO ACTION,
  CONSTRAINT "facet_value_swatch_id_fk"
    FOREIGN KEY ("swatch_id")
    REFERENCES "listing"."facet_swatch" ("id")
    ON DELETE SET NULL,
  CONSTRAINT "facet_value_kind_check"
    CHECK ("kind" IN ('source', 'display')),
  CONSTRAINT "facet_value_display_root_check"
    CHECK ("kind" <> 'display' OR "parent_id" IS NULL),
  CONSTRAINT "facet_value_display_reference_status_check"
    CHECK ("kind" <> 'display' OR "reference_status" = 'VALID')
);

CREATE UNIQUE INDEX "facet_value_source_store_facet_handle_uniq"
  ON "listing"."facet_value" ("store_id", "facet_id", "handle")
  WHERE "kind" = 'source';

CREATE UNIQUE INDEX "facet_value_root_store_facet_handle_uniq"
  ON "listing"."facet_value" ("store_id", "facet_id", "handle")
  WHERE "parent_id" IS NULL;

CREATE INDEX "idx_facet_value_store_facet_visible_order"
  ON "listing"."facet_value" ("store_id", "facet_id", "sort_index", "id")
  WHERE "parent_id" IS NULL;

CREATE INDEX "idx_facet_value_store_parent"
  ON "listing"."facet_value" ("store_id", "parent_id")
  WHERE "parent_id" IS NOT NULL;

CREATE INDEX "idx_facet_value_store_facet_source_handle"
  ON "listing"."facet_value" ("store_id", "facet_id", "handle")
  WHERE "kind" = 'source';

CREATE TABLE "listing"."facet_value_translation" (
  "facet_value_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "store_id" uuid NOT NULL,
  "label" text NOT NULL,
  CONSTRAINT "facet_value_translation_pkey" PRIMARY KEY ("facet_value_id", "locale"),
  CONSTRAINT "facet_value_translation_facet_value_id_fk"
    FOREIGN KEY ("facet_value_id")
    REFERENCES "listing"."facet_value" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_facet_value_translation_store_locale"
  ON "listing"."facet_value_translation" ("store_id", "locale");

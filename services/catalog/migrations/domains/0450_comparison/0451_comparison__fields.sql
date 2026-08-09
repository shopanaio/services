-- Up Migration

CREATE TABLE "catalog"."comparison_field" (
  "store_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "profile_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "handle" varchar(255) NOT NULL,
  "value_type" "catalog"."comparison_value_type" NOT NULL,
  "cardinality" "catalog"."comparison_cardinality" NOT NULL DEFAULT 'SINGLE',
  "canonical_unit" varchar(32),
  "sort_index" integer NOT NULL,
  "featured" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "comparison_field_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "comparison_field_profile_group_fk"
    FOREIGN KEY ("profile_id", "group_id")
    REFERENCES "catalog"."comparison_group" ("profile_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "comparison_field_profile_id_handle_uniq"
    UNIQUE ("profile_id", "handle"),
  CONSTRAINT "comparison_field_group_id_sort_index_uniq"
    UNIQUE ("group_id", "sort_index"),
  CONSTRAINT "comparison_field_profile_id_id_uniq"
    UNIQUE ("profile_id", "id"),
  CONSTRAINT "comparison_field_id_value_type_uniq"
    UNIQUE ("id", "value_type"),
  CONSTRAINT "comparison_field_canonical_unit_shape_check"
    CHECK (
      "canonical_unit" IS NULL OR (
        "value_type" IN ('DECIMAL', 'INTEGER')
        AND "canonical_unit" = btrim("canonical_unit")
        AND length("canonical_unit") > 0
      )
    )
);

CREATE INDEX "idx_comparison_field_store_id"
  ON "catalog"."comparison_field" ("store_id");

CREATE INDEX "idx_comparison_field_profile_sort"
  ON "catalog"."comparison_field" ("profile_id", "group_id", "sort_index");

CREATE INDEX "idx_comparison_field_profile_featured"
  ON "catalog"."comparison_field" ("profile_id", "featured", "sort_index");

CREATE TABLE "catalog"."comparison_field_option" (
  "store_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "field_id" uuid NOT NULL,
  "value_type" "catalog"."comparison_value_type" NOT NULL DEFAULT 'ENUM',
  "handle" varchar(255) NOT NULL,
  "sort_index" integer NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "comparison_field_option_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "comparison_field_option_enum_field_fk"
    FOREIGN KEY ("field_id", "value_type")
    REFERENCES "catalog"."comparison_field" ("id", "value_type")
    ON DELETE CASCADE,
  CONSTRAINT "comparison_field_option_enum_only_check"
    CHECK ("value_type" = 'ENUM'),
  CONSTRAINT "comparison_field_option_field_id_handle_uniq"
    UNIQUE ("field_id", "handle"),
  CONSTRAINT "comparison_field_option_field_id_sort_index_uniq"
    UNIQUE ("field_id", "sort_index"),
  CONSTRAINT "comparison_field_option_field_id_id_uniq"
    UNIQUE ("field_id", "id")
);

CREATE INDEX "idx_comparison_field_option_store_id"
  ON "catalog"."comparison_field_option" ("store_id");

CREATE INDEX "idx_comparison_field_option_field_sort"
  ON "catalog"."comparison_field_option" ("field_id", "sort_index");

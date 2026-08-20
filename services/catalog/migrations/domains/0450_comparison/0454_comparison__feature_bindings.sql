-- Up Migration

CREATE TABLE "catalog"."comparison_field_not_applicable" (
  "store_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "profile_id" uuid NOT NULL,
  "field_id" uuid NOT NULL,
  "reason" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "comparison_field_not_applicable_pkey"
    PRIMARY KEY ("product_id", "field_id"),
  CONSTRAINT "comparison_field_not_applicable_product_id_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "comparison_field_not_applicable_profile_field_fk"
    FOREIGN KEY ("profile_id", "field_id")
    REFERENCES "catalog"."comparison_field" ("profile_id", "id")
    ON DELETE RESTRICT,
  CONSTRAINT "comparison_field_not_applicable_reason_shape_check"
    CHECK ("reason" IS NULL OR length(btrim("reason")) > 0)
);

CREATE INDEX "idx_comparison_field_not_applicable_store_id"
  ON "catalog"."comparison_field_not_applicable" ("store_id");

CREATE INDEX "idx_comparison_field_not_applicable_store_product_field"
  ON "catalog"."comparison_field_not_applicable" ("store_id", "product_id", "field_id");

CREATE INDEX "idx_comparison_field_not_applicable_profile_field"
  ON "catalog"."comparison_field_not_applicable" ("profile_id", "field_id");

CREATE TABLE "catalog"."comparison_feature_binding" (
  "store_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "feature_id" uuid NOT NULL,
  "profile_id" uuid NOT NULL,
  "field_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "comparison_feature_binding_pkey" PRIMARY KEY ("feature_id"),
  CONSTRAINT "comparison_feature_binding_product_feature_fk"
    FOREIGN KEY ("product_id", "feature_id")
    REFERENCES "catalog"."product_feature" ("product_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "comparison_feature_binding_profile_field_fk"
    FOREIGN KEY ("profile_id", "field_id")
    REFERENCES "catalog"."comparison_field" ("profile_id", "id")
    ON DELETE RESTRICT,
  CONSTRAINT "comparison_feature_binding_feature_field_uniq"
    UNIQUE ("feature_id", "field_id"),
  CONSTRAINT "comparison_feature_binding_product_field_uniq"
    UNIQUE ("product_id", "field_id")
);

CREATE INDEX "idx_comparison_feature_binding_store_id"
  ON "catalog"."comparison_feature_binding" ("store_id");

CREATE INDEX "idx_comparison_feature_binding_store_product_field"
  ON "catalog"."comparison_feature_binding" ("store_id", "product_id", "field_id");

CREATE INDEX "idx_comparison_feature_binding_profile_field"
  ON "catalog"."comparison_feature_binding" ("profile_id", "field_id");

CREATE TABLE "catalog"."comparison_feature_value_binding" (
  "store_id" uuid NOT NULL,
  "feature_id" uuid NOT NULL,
  "feature_value_id" uuid NOT NULL,
  "field_id" uuid NOT NULL,
  "value_type" "catalog"."comparison_value_type" NOT NULL,
  "field_option_id" uuid,
  "decimal_value" numeric(38, 12),
  "integer_value" bigint,
  "boolean_value" boolean,
  "text_value" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "comparison_feature_value_binding_pkey"
    PRIMARY KEY ("feature_value_id"),
  CONSTRAINT "comparison_feature_value_binding_feature_value_fk"
    FOREIGN KEY ("feature_id", "feature_value_id")
    REFERENCES "catalog"."product_feature_value" ("feature_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "comparison_feature_value_binding_feature_field_fk"
    FOREIGN KEY ("feature_id", "field_id")
    REFERENCES "catalog"."comparison_feature_binding" ("feature_id", "field_id")
    ON DELETE CASCADE,
  CONSTRAINT "comparison_feature_value_binding_field_type_fk"
    FOREIGN KEY ("field_id", "value_type")
    REFERENCES "catalog"."comparison_field" ("id", "value_type")
    ON DELETE RESTRICT,
  CONSTRAINT "comparison_feature_value_binding_field_option_fk"
    FOREIGN KEY ("field_id", "field_option_id")
    REFERENCES "catalog"."comparison_field_option" ("field_id", "id")
    ON DELETE RESTRICT,
  CONSTRAINT "comparison_feature_value_binding_shape_check"
    CHECK (
      (
        "value_type" = 'BOOLEAN'
        AND "boolean_value" IS NOT NULL
        AND "decimal_value" IS NULL
        AND "integer_value" IS NULL
        AND "text_value" IS NULL
        AND "field_option_id" IS NULL
      ) OR (
        "value_type" = 'DECIMAL'
        AND "decimal_value" IS NOT NULL
        AND "boolean_value" IS NULL
        AND "integer_value" IS NULL
        AND "text_value" IS NULL
        AND "field_option_id" IS NULL
      ) OR (
        "value_type" = 'ENUM'
        AND "field_option_id" IS NOT NULL
        AND "boolean_value" IS NULL
        AND "decimal_value" IS NULL
        AND "integer_value" IS NULL
        AND "text_value" IS NULL
      ) OR (
        "value_type" = 'INTEGER'
        AND "integer_value" IS NOT NULL
        AND "boolean_value" IS NULL
        AND "decimal_value" IS NULL
        AND "text_value" IS NULL
        AND "field_option_id" IS NULL
      ) OR (
        "value_type" = 'TEXT'
        AND "text_value" IS NOT NULL
        AND length(btrim("text_value")) > 0
        AND "boolean_value" IS NULL
        AND "decimal_value" IS NULL
        AND "integer_value" IS NULL
        AND "field_option_id" IS NULL
      )
    )
);

CREATE INDEX "idx_comparison_feature_value_binding_store_id"
  ON "catalog"."comparison_feature_value_binding" ("store_id");

CREATE INDEX "idx_comparison_feature_value_binding_feature_id"
  ON "catalog"."comparison_feature_value_binding" ("feature_id");

CREATE INDEX "idx_comparison_feature_value_binding_field_id"
  ON "catalog"."comparison_feature_value_binding" ("field_id");

CREATE INDEX "idx_comparison_feature_value_binding_store_field"
  ON "catalog"."comparison_feature_value_binding" ("store_id", "field_id");

CREATE INDEX "idx_comparison_feature_value_binding_field_option_id"
  ON "catalog"."comparison_feature_value_binding" ("field_option_id");

CREATE TABLE "catalog"."comparison_option_binding" (
  "store_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "option_id" uuid NOT NULL,
  "profile_id" uuid NOT NULL,
  "field_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "comparison_option_binding_pkey" PRIMARY KEY ("option_id"),
  CONSTRAINT "comparison_option_binding_product_option_fk"
    FOREIGN KEY ("product_id", "option_id")
    REFERENCES "catalog"."product_option" ("product_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "comparison_option_binding_profile_field_fk"
    FOREIGN KEY ("profile_id", "field_id")
    REFERENCES "catalog"."comparison_field" ("profile_id", "id")
    ON DELETE RESTRICT,
  CONSTRAINT "comparison_option_binding_option_field_uniq"
    UNIQUE ("option_id", "field_id"),
  CONSTRAINT "comparison_option_binding_product_field_uniq"
    UNIQUE ("product_id", "field_id")
);

CREATE INDEX "idx_comparison_option_binding_store_id"
  ON "catalog"."comparison_option_binding" ("store_id");

CREATE INDEX "idx_comparison_option_binding_store_product_field"
  ON "catalog"."comparison_option_binding" ("store_id", "product_id", "field_id");

CREATE INDEX "idx_comparison_option_binding_profile_field"
  ON "catalog"."comparison_option_binding" ("profile_id", "field_id");

CREATE TABLE "catalog"."comparison_option_value_binding" (
  "store_id" uuid NOT NULL,
  "option_id" uuid NOT NULL,
  "option_value_id" uuid NOT NULL,
  "field_id" uuid NOT NULL,
  "value_type" "catalog"."comparison_value_type" NOT NULL,
  "field_option_id" uuid,
  "decimal_value" numeric(38, 12),
  "integer_value" bigint,
  "boolean_value" boolean,
  "text_value" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "comparison_option_value_binding_pkey"
    PRIMARY KEY ("option_value_id"),
  CONSTRAINT "comparison_option_value_binding_option_value_fk"
    FOREIGN KEY ("option_id", "option_value_id")
    REFERENCES "catalog"."product_option_value" ("option_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "comparison_option_value_binding_option_field_fk"
    FOREIGN KEY ("option_id", "field_id")
    REFERENCES "catalog"."comparison_option_binding" ("option_id", "field_id")
    ON DELETE CASCADE,
  CONSTRAINT "comparison_option_value_binding_field_type_fk"
    FOREIGN KEY ("field_id", "value_type")
    REFERENCES "catalog"."comparison_field" ("id", "value_type")
    ON DELETE RESTRICT,
  CONSTRAINT "comparison_option_value_binding_field_option_fk"
    FOREIGN KEY ("field_id", "field_option_id")
    REFERENCES "catalog"."comparison_field_option" ("field_id", "id")
    ON DELETE RESTRICT,
  CONSTRAINT "comparison_option_value_binding_shape_check"
    CHECK (
      (
        "value_type" = 'BOOLEAN'
        AND "boolean_value" IS NOT NULL
        AND "decimal_value" IS NULL
        AND "integer_value" IS NULL
        AND "text_value" IS NULL
        AND "field_option_id" IS NULL
      ) OR (
        "value_type" = 'DECIMAL'
        AND "decimal_value" IS NOT NULL
        AND "boolean_value" IS NULL
        AND "integer_value" IS NULL
        AND "text_value" IS NULL
        AND "field_option_id" IS NULL
      ) OR (
        "value_type" = 'ENUM'
        AND "field_option_id" IS NOT NULL
        AND "boolean_value" IS NULL
        AND "decimal_value" IS NULL
        AND "integer_value" IS NULL
        AND "text_value" IS NULL
      ) OR (
        "value_type" = 'INTEGER'
        AND "integer_value" IS NOT NULL
        AND "boolean_value" IS NULL
        AND "decimal_value" IS NULL
        AND "text_value" IS NULL
        AND "field_option_id" IS NULL
      ) OR (
        "value_type" = 'TEXT'
        AND "text_value" IS NOT NULL
        AND length(btrim("text_value")) > 0
        AND "boolean_value" IS NULL
        AND "decimal_value" IS NULL
        AND "integer_value" IS NULL
        AND "field_option_id" IS NULL
      )
    )
);

CREATE INDEX "idx_comparison_option_value_binding_store_id"
  ON "catalog"."comparison_option_value_binding" ("store_id");

CREATE INDEX "idx_comparison_option_value_binding_option_id"
  ON "catalog"."comparison_option_value_binding" ("option_id");

CREATE INDEX "idx_comparison_option_value_binding_field_id"
  ON "catalog"."comparison_option_value_binding" ("field_id");

CREATE INDEX "idx_comparison_option_value_binding_store_field"
  ON "catalog"."comparison_option_value_binding" ("store_id", "field_id");

CREATE INDEX "idx_comparison_option_value_binding_field_option_id"
  ON "catalog"."comparison_option_value_binding" ("field_option_id");

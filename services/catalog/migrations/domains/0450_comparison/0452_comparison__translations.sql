-- Up Migration

CREATE TABLE "catalog"."comparison_profile_translation" (
  "store_id" uuid NOT NULL,
  "profile_id" uuid NOT NULL,
  "locale" "catalog"."locale_code" NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "comparison_profile_translation_pkey"
    PRIMARY KEY ("profile_id", "locale"),
  CONSTRAINT "comparison_profile_translation_profile_id_fk"
    FOREIGN KEY ("profile_id")
    REFERENCES "catalog"."comparison_profile" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_comparison_profile_translation_store_locale"
  ON "catalog"."comparison_profile_translation" ("store_id", "locale");

CREATE TABLE "catalog"."comparison_group_translation" (
  "store_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "locale" "catalog"."locale_code" NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "comparison_group_translation_pkey"
    PRIMARY KEY ("group_id", "locale"),
  CONSTRAINT "comparison_group_translation_group_id_fk"
    FOREIGN KEY ("group_id")
    REFERENCES "catalog"."comparison_group" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_comparison_group_translation_store_locale"
  ON "catalog"."comparison_group_translation" ("store_id", "locale");

CREATE TABLE "catalog"."comparison_field_translation" (
  "store_id" uuid NOT NULL,
  "field_id" uuid NOT NULL,
  "locale" "catalog"."locale_code" NOT NULL,
  "name" text NOT NULL,
  "description" text,
  CONSTRAINT "comparison_field_translation_pkey"
    PRIMARY KEY ("field_id", "locale"),
  CONSTRAINT "comparison_field_translation_field_id_fk"
    FOREIGN KEY ("field_id")
    REFERENCES "catalog"."comparison_field" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_comparison_field_translation_store_locale"
  ON "catalog"."comparison_field_translation" ("store_id", "locale");

CREATE TABLE "catalog"."comparison_field_option_translation" (
  "store_id" uuid NOT NULL,
  "field_option_id" uuid NOT NULL,
  "locale" "catalog"."locale_code" NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "comparison_field_option_translation_pkey"
    PRIMARY KEY ("field_option_id", "locale"),
  CONSTRAINT "comparison_field_option_translation_field_option_id_fk"
    FOREIGN KEY ("field_option_id")
    REFERENCES "catalog"."comparison_field_option" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_comparison_field_option_translation_store_locale"
  ON "catalog"."comparison_field_option_translation" ("store_id", "locale");

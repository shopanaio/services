-- Up Migration

CREATE TABLE "catalog"."category_comparison_profile" (
  "store_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "profile_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "category_comparison_profile_pkey" PRIMARY KEY ("category_id"),
  CONSTRAINT "category_comparison_profile_category_id_fk"
    FOREIGN KEY ("category_id")
    REFERENCES "catalog"."category" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "category_comparison_profile_profile_id_fk"
    FOREIGN KEY ("profile_id")
    REFERENCES "catalog"."comparison_profile" ("id")
    ON DELETE RESTRICT
);

CREATE INDEX "idx_category_comparison_profile_store_id"
  ON "catalog"."category_comparison_profile" ("store_id");

CREATE INDEX "idx_category_comparison_profile_store_category"
  ON "catalog"."category_comparison_profile" ("store_id", "category_id");

CREATE INDEX "idx_category_comparison_profile_store_profile"
  ON "catalog"."category_comparison_profile" ("store_id", "profile_id");

CREATE INDEX "idx_category_comparison_profile_profile_id"
  ON "catalog"."category_comparison_profile" ("profile_id");

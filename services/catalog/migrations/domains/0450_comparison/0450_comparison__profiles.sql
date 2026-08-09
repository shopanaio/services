-- Up Migration

CREATE TABLE "catalog"."comparison_profile" (
  "store_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "handle" varchar(255) NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "comparison_profile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "comparison_profile_store_id_handle_uniq"
    UNIQUE ("store_id", "handle")
);

CREATE INDEX "idx_comparison_profile_store_enabled"
  ON "catalog"."comparison_profile" ("store_id", "enabled");

CREATE TABLE "catalog"."comparison_group" (
  "store_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "profile_id" uuid NOT NULL,
  "handle" varchar(255) NOT NULL,
  "sort_index" integer NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "comparison_group_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "comparison_group_profile_id_fk"
    FOREIGN KEY ("profile_id")
    REFERENCES "catalog"."comparison_profile" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "comparison_group_profile_id_handle_uniq"
    UNIQUE ("profile_id", "handle"),
  CONSTRAINT "comparison_group_profile_id_sort_index_uniq"
    UNIQUE ("profile_id", "sort_index"),
  CONSTRAINT "comparison_group_profile_id_id_uniq"
    UNIQUE ("profile_id", "id")
);

CREATE INDEX "idx_comparison_group_store_id"
  ON "catalog"."comparison_group" ("store_id");

CREATE INDEX "idx_comparison_group_profile_sort"
  ON "catalog"."comparison_group" ("profile_id", "sort_index");

-- Up Migration

CREATE TABLE "apps"."app_catalog" (
  "store_id" uuid NOT NULL,
  "app_code" varchar(128) NOT NULL,
  "version" varchar(64) NOT NULL,
  "display_name" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "capabilities" text NOT NULL,
  "manifest" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_catalog_pkey" PRIMARY KEY ("store_id", "app_code")
);

CREATE INDEX "app_catalog_store_display_name_idx"
  ON "apps"."app_catalog" ("store_id", "display_name", "app_code");

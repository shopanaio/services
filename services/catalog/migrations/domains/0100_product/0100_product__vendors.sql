-- Up Migration

CREATE TABLE "catalog"."vendor" (
  "project_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  CONSTRAINT "vendor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vendor_project_id_id_unique" UNIQUE ("project_id", "id")
);

CREATE UNIQUE INDEX "vendor_project_id_name_key"
  ON "catalog"."vendor" ("project_id", "name");

CREATE INDEX "idx_vendor_project_id"
  ON "catalog"."vendor" ("project_id");

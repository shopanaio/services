-- Up Migration

CREATE TABLE "catalog"."vendor" (
  "store_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  CONSTRAINT "vendor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vendor_store_id_id_unique" UNIQUE ("store_id", "id")
);

CREATE UNIQUE INDEX "vendor_store_id_name_key"
  ON "catalog"."vendor" ("store_id", "name");

CREATE INDEX "idx_vendor_store_id"
  ON "catalog"."vendor" ("store_id");

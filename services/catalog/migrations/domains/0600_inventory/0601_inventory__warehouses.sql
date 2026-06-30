-- Up Migration

CREATE TABLE "catalog"."warehouses" (
  "project_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "code" varchar(32) NOT NULL,
  "name" text NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "warehouses_project_id_code_key" UNIQUE ("project_id", "code"),
  CONSTRAINT "warehouses_project_id_id_unique" UNIQUE ("project_id", "id")
);

CREATE UNIQUE INDEX "idx_warehouses_default_unique"
  ON "catalog"."warehouses" ("project_id")
  WHERE "is_default" = true;

CREATE TABLE "catalog"."warehouse_translation" (
  "project_id" uuid NOT NULL,
  "warehouse_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "warehouse_translation_pkey" PRIMARY KEY ("warehouse_id", "locale"),
  CONSTRAINT "warehouse_translation_warehouse_id_fk"
    FOREIGN KEY ("warehouse_id")
    REFERENCES "catalog"."warehouses" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_warehouse_translation_project"
  ON "catalog"."warehouse_translation" ("project_id");

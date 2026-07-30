-- Up Migration

CREATE TABLE "catalog"."entity_registry" (
  "store_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "entity_type" varchar(128) NOT NULL,
  "handle" varchar(255),
  "published_at" timestamp with time zone,
  "owner_type" varchar(16) NOT NULL,
  "owner_app_code" varchar(128),
  "owner_installation_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone,
  "revision" integer NOT NULL DEFAULT 0,
  CONSTRAINT "entity_registry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "entity_registry_published_requires_handle"
    CHECK ("published_at" IS NULL OR "handle" IS NOT NULL),
  CONSTRAINT "entity_registry_owner_type_check"
    CHECK ("owner_type" IN ('NATIVE', 'APP')),
  CONSTRAINT "entity_registry_owner_consistency_check"
    CHECK (
      (
        "owner_type" = 'NATIVE'
        AND "owner_app_code" IS NULL
        AND "owner_installation_id" IS NULL
      )
      OR
      (
        "owner_type" = 'APP'
        AND "owner_app_code" IS NOT NULL
        AND "owner_installation_id" IS NOT NULL
      )
    ),
  CONSTRAINT "entity_registry_revision_nonnegative_check"
    CHECK ("revision" >= 0)
);

CREATE UNIQUE INDEX "entity_registry_store_id_type_handle_key"
  ON "catalog"."entity_registry" ("store_id", "entity_type", "handle")
  WHERE "deleted_at" IS NULL AND "handle" IS NOT NULL;

CREATE INDEX "idx_entity_registry_store_type"
  ON "catalog"."entity_registry" ("store_id", "entity_type", "id");

CREATE INDEX "idx_entity_registry_owner"
  ON "catalog"."entity_registry"
    ("store_id", "entity_type", "owner_type", "owner_app_code", "id");

CREATE INDEX "idx_entity_registry_owner_installation"
  ON "catalog"."entity_registry"
    ("store_id", "owner_installation_id", "entity_type", "id")
  WHERE "owner_type" = 'APP';

CREATE INDEX "idx_entity_registry_created_at"
  ON "catalog"."entity_registry"
    ("store_id", "entity_type", "created_at", "id");

CREATE INDEX "idx_entity_registry_updated_at"
  ON "catalog"."entity_registry"
    ("store_id", "entity_type", "updated_at", "id");

CREATE INDEX "idx_entity_registry_deleted_at"
  ON "catalog"."entity_registry"
    ("store_id", "entity_type", "deleted_at", "id")
  WHERE "deleted_at" IS NOT NULL;

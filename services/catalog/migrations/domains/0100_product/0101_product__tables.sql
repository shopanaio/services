-- Up Migration

CREATE TABLE "catalog"."product" (
  "project_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "vendor_id" uuid,
  "handle" varchar(255),
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone,
  "revision" integer NOT NULL DEFAULT 0,
  "kind" "catalog"."product_kind" NOT NULL DEFAULT 'BASE',
  CONSTRAINT "product_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_published_requires_handle"
    CHECK ("published_at" IS NULL OR "handle" IS NOT NULL),
  CONSTRAINT "product_project_id_id_unique" UNIQUE ("project_id", "id"),
  CONSTRAINT "product_vendor_fk"
    FOREIGN KEY ("project_id", "vendor_id")
    REFERENCES "catalog"."vendor" ("project_id", "id")
);

CREATE UNIQUE INDEX "product_project_id_handle_key"
  ON "catalog"."product" ("project_id", "handle")
  WHERE "deleted_at" IS NULL AND "handle" IS NOT NULL;

CREATE INDEX "idx_product_project_id"
  ON "catalog"."product" ("project_id");

CREATE INDEX "idx_product_vendor_id"
  ON "catalog"."product" ("vendor_id");

CREATE INDEX "idx_product_created_at"
  ON "catalog"."product" ("created_at");

CREATE INDEX "idx_product_updated_at"
  ON "catalog"."product" ("updated_at");

CREATE INDEX "idx_product_deleted_at"
  ON "catalog"."product" ("deleted_at")
  WHERE "deleted_at" IS NOT NULL;

CREATE INDEX "idx_product_revision"
  ON "catalog"."product" ("id", "revision");

CREATE TABLE "catalog"."variant" (
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "kind" "catalog"."product_kind" NOT NULL DEFAULT 'BASE',
  "id" uuid NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "handle" varchar(255) NOT NULL,
  "sku" varchar(64),
  "external_system" varchar(32),
  "external_id" text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone,
  CONSTRAINT "variant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "variant_handle_required_if_not_default"
    CHECK ("is_default" = true OR length("handle") > 0),
  CONSTRAINT "variant_project_id_product_id_id_unique"
    UNIQUE ("project_id", "product_id", "id")
);

CREATE UNIQUE INDEX "variant_product_id_default_key"
  ON "catalog"."variant" ("product_id")
  WHERE "is_default" = true AND "deleted_at" IS NULL;

CREATE UNIQUE INDEX "variant_product_id_handle_key"
  ON "catalog"."variant" ("product_id", "handle")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "variant_project_id_sku_key"
  ON "catalog"."variant" ("project_id", "sku")
  WHERE "deleted_at" IS NULL AND "sku" IS NOT NULL;

CREATE UNIQUE INDEX "variant_project_id_external_system_external_id_key"
  ON "catalog"."variant" ("project_id", "external_system", "external_id")
  WHERE "deleted_at" IS NULL AND "external_id" IS NOT NULL;

CREATE INDEX "idx_variant_project_id"
  ON "catalog"."variant" ("project_id");

CREATE INDEX "idx_variant_product_id"
  ON "catalog"."variant" ("product_id");

CREATE INDEX "idx_variant_product_active"
  ON "catalog"."variant" ("product_id")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "idx_variant_created_at"
  ON "catalog"."variant" ("created_at");

CREATE INDEX "idx_variant_updated_at"
  ON "catalog"."variant" ("updated_at");

CREATE INDEX "idx_variant_deleted_at"
  ON "catalog"."variant" ("deleted_at")
  WHERE "deleted_at" IS NOT NULL;

-- Up Migration

CREATE TABLE "catalog"."tag" (
  "project_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "handle" varchar(255) NOT NULL,
  "products_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tag_project_id_handle_key"
  ON "catalog"."tag" ("project_id", "handle");

CREATE INDEX "idx_tag_project_id"
  ON "catalog"."tag" ("project_id");

CREATE TABLE "catalog"."tag_translation" (
  "project_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "tag_translation_pkey" PRIMARY KEY ("tag_id", "locale"),
  CONSTRAINT "tag_translation_tag_id_fk"
    FOREIGN KEY ("tag_id")
    REFERENCES "catalog"."tag" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_tag_translation_project"
  ON "catalog"."tag_translation" ("project_id");

CREATE TABLE "catalog"."product_tag" (
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  CONSTRAINT "product_tag_pkey" PRIMARY KEY ("product_id", "tag_id"),
  CONSTRAINT "product_tag_product_id_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "product_tag_tag_id_fk"
    FOREIGN KEY ("tag_id")
    REFERENCES "catalog"."tag" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_product_tag_product"
  ON "catalog"."product_tag" ("product_id");

CREATE INDEX "idx_product_tag_tag"
  ON "catalog"."product_tag" ("tag_id");

CREATE TABLE "catalog"."category_tag" (
  "project_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL,
  CONSTRAINT "category_tag_pkey" PRIMARY KEY ("category_id", "tag_id"),
  CONSTRAINT "category_tag_category_id_fk"
    FOREIGN KEY ("category_id")
    REFERENCES "catalog"."category" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "category_tag_tag_id_fk"
    FOREIGN KEY ("tag_id")
    REFERENCES "catalog"."tag" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_category_tag_category"
  ON "catalog"."category_tag" ("category_id");

CREATE INDEX "idx_category_tag_tag"
  ON "catalog"."category_tag" ("tag_id");

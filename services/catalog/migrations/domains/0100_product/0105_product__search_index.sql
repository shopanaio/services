-- Up Migration

CREATE TABLE "catalog"."product_search_index" (
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'draft',
  "tag_handles" text[] NOT NULL DEFAULT '{}'::text[],
  "feature_slugs" text[] NOT NULL DEFAULT '{}'::text[],
  "category_handles" text[] NOT NULL DEFAULT '{}'::text[],
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_search_index_pkey" PRIMARY KEY ("product_id"),
  CONSTRAINT "product_search_index_product_id_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_product_search_index_project_status"
  ON "catalog"."product_search_index" ("project_id", "status");

CREATE INDEX "idx_product_search_index_created_at"
  ON "catalog"."product_search_index" ("project_id", "created_at");

CREATE INDEX "idx_product_search_index_tag_handles_gin"
  ON "catalog"."product_search_index" USING gin ("tag_handles");

CREATE INDEX "idx_product_search_index_feature_slugs_gin"
  ON "catalog"."product_search_index" USING gin ("feature_slugs");

CREATE INDEX "idx_product_search_index_category_handles_gin"
  ON "catalog"."product_search_index" USING gin ("category_handles");

CREATE TABLE "catalog"."variant_search_index" (
  "project_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "price_currency" varchar(3) NOT NULL,
  "price_minor" bigint,
  "in_stock" boolean NOT NULL DEFAULT false,
  "total_stock" integer NOT NULL DEFAULT 0,
  "option_slugs" text[] NOT NULL DEFAULT '{}'::text[],
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "variant_search_index_pkey" PRIMARY KEY ("variant_id"),
  CONSTRAINT "variant_search_index_variant_id_fk"
    FOREIGN KEY ("variant_id")
    REFERENCES "catalog"."variant" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "variant_search_index_product_id_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_variant_search_index_project_product"
  ON "catalog"."variant_search_index" ("project_id", "product_id");

CREATE INDEX "idx_variant_search_index_project_in_stock"
  ON "catalog"."variant_search_index" ("project_id", "in_stock");

CREATE INDEX "idx_variant_search_index_project_price"
  ON "catalog"."variant_search_index" ("project_id", "price_currency", "price_minor");

CREATE INDEX "idx_variant_search_index_option_slugs_gin"
  ON "catalog"."variant_search_index" USING gin ("option_slugs");

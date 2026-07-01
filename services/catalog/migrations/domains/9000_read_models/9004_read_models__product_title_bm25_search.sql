-- Up Migration

CREATE EXTENSION IF NOT EXISTS "pg_search";

CREATE TABLE "catalog"."product_title_bm25_search_index" (
  "search_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "locale" varchar(8) NOT NULL,
  "kind" "catalog"."product_kind" NOT NULL,
  "status" varchar(16) NOT NULL,
  "published_at" timestamp with time zone,
  "product_created_at" timestamp with time zone NOT NULL,
  "product_updated_at" timestamp with time zone NOT NULL,
  "product_revision" integer NOT NULL DEFAULT 0,
  "title" text NOT NULL DEFAULT '',
  "indexed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_title_bm25_search_index_pkey"
    PRIMARY KEY ("product_id", "locale"),
  CONSTRAINT "product_title_bm25_search_id_unique"
    UNIQUE ("search_id"),
  CONSTRAINT "fk_product_title_bm25_product"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_product_title_bm25_project_locale_product"
  ON "catalog"."product_title_bm25_search_index" ("project_id", "locale", "product_id");

CREATE INDEX "idx_product_title_bm25_visible"
  ON "catalog"."product_title_bm25_search_index" (
    "project_id",
    "locale",
    "published_at" DESC,
    "product_id"
  )
  WHERE "status" = 'published';

CREATE INDEX "idx_product_title_bm25_search"
  ON "catalog"."product_title_bm25_search_index"
  USING bm25 (
    "search_id",
    "project_id",
    "locale",
    "status",
    "kind",
    "product_id",
    "title",
    "published_at",
    "product_created_at"
  )
  WITH (key_field = 'search_id');

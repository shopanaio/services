-- Up Migration

CREATE TABLE "app_shopana_online_store"."pages" (
  "id" uuid DEFAULT uuidv7() NOT NULL,
  "installation_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "handle" varchar(255) NOT NULL,
  "template_suffix" varchar(64),
  "published_at" timestamp with time zone,
  "revision" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "pages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pages_installation_id_app_installations_id_fk"
    FOREIGN KEY ("installation_id")
    REFERENCES "apps"."app_installations" ("id"),
  CONSTRAINT "pages_handle_not_empty_check"
    CHECK (btrim("handle") <> ''),
  CONSTRAINT "pages_revision_check"
    CHECK ("revision" >= 0)
);

CREATE UNIQUE INDEX "pages_store_handle_key"
  ON "app_shopana_online_store"."pages" ("store_id", "handle")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "pages_installation_idx"
  ON "app_shopana_online_store"."pages" ("installation_id");

CREATE INDEX "pages_store_publication_idx"
  ON "app_shopana_online_store"."pages" ("store_id", "published_at")
  WHERE "deleted_at" IS NULL;

CREATE TABLE "app_shopana_online_store"."page_translations" (
  "page_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "locale" "app_shopana_online_store"."locale_code" NOT NULL,
  "title" varchar(255) NOT NULL,
  "body_text" text,
  "body_html" text,
  "body_json" jsonb,
  "seo_title" varchar(255),
  "seo_description" text,
  CONSTRAINT "page_translations_pkey" PRIMARY KEY ("page_id", "locale"),
  CONSTRAINT "page_translations_page_id_pages_id_fk"
    FOREIGN KEY ("page_id")
    REFERENCES "app_shopana_online_store"."pages" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "page_translations_title_not_empty_check"
    CHECK (btrim("title") <> '')
);

CREATE INDEX "page_translations_store_locale_idx"
  ON "app_shopana_online_store"."page_translations" ("store_id", "locale");

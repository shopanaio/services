-- Up Migration

CREATE TABLE "catalog"."product_listing_index" (
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "kind" "catalog"."product_kind" NOT NULL,
  "vendor_id" uuid,
  "handle" varchar(255),
  "status" varchar(16) NOT NULL,
  "published_at" timestamp with time zone,
  "product_created_at" timestamp with time zone NOT NULL,
  "product_updated_at" timestamp with time zone NOT NULL,
  "product_revision" integer NOT NULL DEFAULT 0,
  "tag_handles" text[] NOT NULL DEFAULT '{}'::text[],
  "feature_value_handles" text[] NOT NULL DEFAULT '{}'::text[],
  "category_handles" text[] NOT NULL DEFAULT '{}'::text[],
  "in_stock" boolean NOT NULL DEFAULT false,
  "total_stock" integer NOT NULL DEFAULT 0,
  "indexed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_listing_index_pkey"
    PRIMARY KEY ("product_id"),
  CONSTRAINT "fk_product_listing_product"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "chk_product_listing_status"
    CHECK ("status" IN ('published', 'draft'))
);

CREATE INDEX "idx_product_listing_project_product"
  ON "catalog"."product_listing_index" ("project_id", "product_id");

CREATE INDEX "idx_product_listing_visible_newest"
  ON "catalog"."product_listing_index" (
    "project_id",
    "in_stock" DESC,
    "published_at" DESC NULLS LAST,
    "product_created_at" DESC,
    "product_id"
  )
  WHERE "status" = 'published';

CREATE INDEX "idx_product_listing_visible_created"
  ON "catalog"."product_listing_index" (
    "project_id",
    "in_stock" DESC,
    "product_created_at" DESC,
    "product_id"
  )
  WHERE "status" = 'published';

CREATE INDEX "idx_product_listing_vendor"
  ON "catalog"."product_listing_index" ("project_id", "vendor_id")
  WHERE "vendor_id" IS NOT NULL;

CREATE INDEX "idx_product_listing_in_stock"
  ON "catalog"."product_listing_index" ("project_id", "in_stock");

CREATE INDEX "idx_product_listing_category_handles_gin"
  ON "catalog"."product_listing_index" USING gin ("category_handles");

CREATE TABLE "catalog"."product_listing_price_index" (
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "currency" varchar(3) NOT NULL,
  "min_price_minor" bigint,
  "max_price_minor" bigint,
  "has_price" boolean NOT NULL DEFAULT false,
  "indexed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_listing_price_index_pkey"
    PRIMARY KEY ("product_id", "currency"),
  CONSTRAINT "fk_product_listing_price_product"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product_listing_index" ("product_id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_product_listing_price_visible_asc"
  ON "catalog"."product_listing_price_index" (
    "project_id",
    "currency",
    "min_price_minor" ASC,
    "product_id"
  )
  WHERE "has_price" = true;

CREATE INDEX "idx_product_listing_price_visible_desc"
  ON "catalog"."product_listing_price_index" (
    "project_id",
    "currency",
    "max_price_minor" DESC,
    "product_id"
  )
  WHERE "has_price" = true;

CREATE TABLE "catalog"."variant_listing_index" (
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "kind" "catalog"."product_kind" NOT NULL,
  "variant_created_at" timestamp with time zone NOT NULL,
  "variant_updated_at" timestamp with time zone NOT NULL,
  "option_value_handles" text[] NOT NULL DEFAULT '{}'::text[],
  "in_stock" boolean NOT NULL DEFAULT false,
  "total_stock" integer NOT NULL DEFAULT 0,
  "indexed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "variant_listing_index_pkey"
    PRIMARY KEY ("variant_id"),
  CONSTRAINT "variant_listing_product_variant_unique"
    UNIQUE ("product_id", "variant_id"),
  CONSTRAINT "fk_variant_listing_product"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product_listing_index" ("product_id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_variant_listing_variant"
    FOREIGN KEY ("variant_id")
    REFERENCES "catalog"."variant" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_variant_listing_project_product"
  ON "catalog"."variant_listing_index" ("project_id", "product_id");

CREATE INDEX "idx_variant_listing_project_variant"
  ON "catalog"."variant_listing_index" ("project_id", "variant_id");

CREATE INDEX "idx_variant_listing_in_stock"
  ON "catalog"."variant_listing_index" ("project_id", "in_stock");

CREATE TABLE "catalog"."variant_listing_price_index" (
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "currency" varchar(3) NOT NULL,
  "price_minor" bigint,
  "has_price" boolean NOT NULL DEFAULT false,
  "indexed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "variant_listing_price_index_pkey"
    PRIMARY KEY ("variant_id", "currency"),
  CONSTRAINT "fk_variant_listing_price_variant"
    FOREIGN KEY ("variant_id")
    REFERENCES "catalog"."variant_listing_index" ("variant_id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_variant_listing_price_product"
  ON "catalog"."variant_listing_price_index" (
    "project_id",
    "currency",
    "product_id",
    "price_minor"
  )
  WHERE "has_price" = true;

CREATE INDEX "idx_variant_listing_price_value"
  ON "catalog"."variant_listing_price_index" ("project_id", "currency", "price_minor")
  WHERE "has_price" = true;

CREATE TABLE "catalog"."product_listing_facet_token" (
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "facet_id" uuid NOT NULL,
  "facet_value_id" uuid NOT NULL,
  "facet_type" varchar(16) NOT NULL,
  "indexed_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_listing_facet_token_pkey"
    PRIMARY KEY ("product_id", "facet_id", "facet_value_id"),
  CONSTRAINT "fk_product_listing_facet_token_product"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product_listing_index" ("product_id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_product_listing_facet_token_facet"
    FOREIGN KEY ("facet_id")
    REFERENCES "catalog"."facet" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_product_listing_facet_token_value"
    FOREIGN KEY ("facet_value_id")
    REFERENCES "catalog"."facet_value" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "chk_product_listing_facet_token_type"
    CHECK ("facet_type" IN ('tag', 'feature'))
);

CREATE INDEX "idx_product_listing_facet_token_count"
  ON "catalog"."product_listing_facet_token" (
    "project_id",
    "facet_id",
    "facet_value_id",
    "product_id"
  );

CREATE INDEX "idx_product_listing_facet_token_product"
  ON "catalog"."product_listing_facet_token" (
    "project_id",
    "product_id",
    "facet_id",
    "facet_value_id"
  );

CREATE TABLE "catalog"."variant_listing_facet_token" (
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "variant_id" uuid NOT NULL,
  "facet_id" uuid NOT NULL,
  "facet_value_id" uuid NOT NULL,
  "indexed_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "variant_listing_facet_token_pkey"
    PRIMARY KEY ("variant_id", "facet_id", "facet_value_id"),
  CONSTRAINT "fk_variant_listing_facet_token_variant"
    FOREIGN KEY ("variant_id")
    REFERENCES "catalog"."variant_listing_index" ("variant_id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_variant_listing_facet_token_facet"
    FOREIGN KEY ("facet_id")
    REFERENCES "catalog"."facet" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "fk_variant_listing_facet_token_value"
    FOREIGN KEY ("facet_value_id")
    REFERENCES "catalog"."facet_value" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_variant_listing_facet_token_count"
  ON "catalog"."variant_listing_facet_token" (
    "project_id",
    "facet_id",
    "facet_value_id",
    "product_id",
    "variant_id"
  );

CREATE INDEX "idx_variant_listing_facet_token_variant"
  ON "catalog"."variant_listing_facet_token" (
    "project_id",
    "variant_id",
    "facet_id",
    "facet_value_id"
  );

CREATE INDEX "idx_variant_listing_facet_token_product"
  ON "catalog"."variant_listing_facet_token" (
    "project_id",
    "product_id",
    "facet_id",
    "facet_value_id"
  );

CREATE INDEX "idx_product_category_listing_scope"
  ON "catalog"."product_category" ("project_id", "category_id", "lexo_rank", "product_id");

CREATE INDEX "idx_collection_item_listing_scope"
  ON "catalog"."collection_item" ("project_id", "collection_id", "lexo_rank", "product_id");

CREATE INDEX "idx_product_translation_listing_name"
  ON "catalog"."product_translation" ("project_id", "locale", "name", "product_id");

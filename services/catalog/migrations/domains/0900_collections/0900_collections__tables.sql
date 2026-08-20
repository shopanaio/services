-- Up Migration

CREATE TABLE "catalog"."collection" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "handle" varchar(255),
  "type" varchar(16) NOT NULL,
  "default_sort" varchar(32) NOT NULL DEFAULT 'newest',
  "default_sort_direction" varchar(4) NOT NULL DEFAULT 'desc',
  "effective_from" timestamp with time zone,
  "effective_to" timestamp with time zone,
  "published_at" timestamp with time zone,
  "revision" integer NOT NULL DEFAULT 0,
  "listing_revision" integer NOT NULL DEFAULT 0,
  "listing_updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone,
  CONSTRAINT "collection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "collection_type_check" CHECK ("type" IN ('manual', 'rule')),
  CONSTRAINT "collection_default_sort_check"
    CHECK ("default_sort" IN ('manual', 'price', 'newest', 'name')),
  CONSTRAINT "collection_default_sort_direction_check"
    CHECK ("default_sort_direction" IN ('asc', 'desc')),
  CONSTRAINT "collection_default_sort_direction_pair_check"
    CHECK (
      ("default_sort" = 'manual' AND "default_sort_direction" = 'asc')
      OR ("default_sort" = 'newest' AND "default_sort_direction" = 'desc')
      OR ("default_sort" IN ('price', 'name') AND "default_sort_direction" IN ('asc', 'desc'))
    ),
  CONSTRAINT "collection_rule_manual_sort_check"
    CHECK ("type" != 'rule' OR "default_sort" != 'manual'),
  CONSTRAINT "collection_revision_check"
    CHECK ("revision" BETWEEN 0 AND 2147483646),
  CONSTRAINT "collection_listing_revision_check"
    CHECK ("listing_revision" BETWEEN 0 AND 2147483646),
  CONSTRAINT "collection_effective_range_check"
    CHECK (
      "effective_to" IS NULL
      OR "effective_from" IS NULL
      OR "effective_to" > "effective_from"
    )
);

CREATE UNIQUE INDEX "collection_store_id_handle_uniq"
  ON "catalog"."collection" ("store_id", "handle")
  WHERE "deleted_at" IS NULL AND "handle" IS NOT NULL;

CREATE INDEX "idx_collection_scheduling"
  ON "catalog"."collection" ("store_id", "effective_from", "effective_to");

CREATE UNIQUE INDEX "collection_store_id_id_uniq"
  ON "catalog"."collection" ("store_id", "id");

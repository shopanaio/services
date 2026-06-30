-- Up Migration

CREATE TABLE "catalog"."collection" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "handle" varchar(255),
  "type" varchar(16) NOT NULL,
  "default_sort" varchar(32) NOT NULL DEFAULT 'newest',
  "default_sort_direction" varchar(4) NOT NULL DEFAULT 'asc',
  "effective_from" timestamp with time zone,
  "effective_to" timestamp with time zone,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone,
  CONSTRAINT "collection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "collection_type_check" CHECK ("type" IN ('manual', 'rule')),
  CONSTRAINT "collection_default_sort_check"
    CHECK ("default_sort" IN ('manual', 'price', 'newest', 'name')),
  CONSTRAINT "collection_default_sort_direction_check"
    CHECK ("default_sort_direction" IN ('asc', 'desc')),
  CONSTRAINT "collection_rule_manual_sort_check"
    CHECK ("type" != 'rule' OR "default_sort" != 'manual'),
  CONSTRAINT "collection_effective_range_check"
    CHECK (
      "effective_to" IS NULL
      OR "effective_from" IS NULL
      OR "effective_to" > "effective_from"
    )
);

CREATE UNIQUE INDEX "collection_project_id_handle_uniq"
  ON "catalog"."collection" ("project_id", "handle")
  WHERE "deleted_at" IS NULL AND "handle" IS NOT NULL;

CREATE INDEX "idx_collection_scheduling"
  ON "catalog"."collection" ("project_id", "effective_from", "effective_to");

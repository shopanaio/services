-- Up Migration

CREATE TABLE "catalog"."collection_rule" (
  "id" uuid NOT NULL,
  "collection_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "field" varchar(64) NOT NULL,
  "operator" varchar(16) NOT NULL,
  "value" jsonb NOT NULL,
  "sort_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "collection_rule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "collection_rule_collection_id_fk"
    FOREIGN KEY ("collection_id")
    REFERENCES "catalog"."collection" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "collection_rule_field_check"
    CHECK (
      "field" IN (
        'category', 'tag', 'vendor', 'feature', 'option',
        'price', 'in_stock', 'created_at'
      )
    ),
  CONSTRAINT "collection_rule_operator_check"
    CHECK ("operator" IN ('in', 'all', 'eq', 'gt', 'gte', 'lt', 'lte', 'between')),
  CONSTRAINT "collection_rule_sort_index_check"
    CHECK ("sort_index" >= 0),
  CONSTRAINT "collection_rule_store_collection_sort_uniq"
    UNIQUE ("store_id", "collection_id", "sort_index")
);

CREATE INDEX "idx_collection_rule_collection"
  ON "catalog"."collection_rule" ("store_id", "collection_id", "sort_index");

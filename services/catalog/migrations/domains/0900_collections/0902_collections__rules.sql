-- Up Migration

CREATE TABLE "catalog"."collection_rule" (
  "id" uuid NOT NULL,
  "collection_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
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
    ON DELETE CASCADE
);

CREATE INDEX "idx_collection_rule_collection"
  ON "catalog"."collection_rule" ("collection_id");

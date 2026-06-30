-- Up Migration

CREATE TABLE "catalog"."collection_item" (
  "collection_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "lexo_rank" varchar(64) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "collection_item_pkey" PRIMARY KEY ("collection_id", "product_id"),
  CONSTRAINT "collection_item_collection_id_fk"
    FOREIGN KEY ("collection_id")
    REFERENCES "catalog"."collection" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "collection_item_product_id_fk"
    FOREIGN KEY ("product_id")
    REFERENCES "catalog"."product" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_collection_item_rank"
  ON "catalog"."collection_item" ("collection_id", "lexo_rank");

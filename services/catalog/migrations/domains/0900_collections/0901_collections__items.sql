-- Up Migration

CREATE TABLE "catalog"."collection_item" (
  "collection_id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
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

CREATE INDEX "idx_collection_item_listing_scope"
  ON "catalog"."collection_item" ("store_id", "collection_id", "lexo_rank", "product_id");

CREATE TABLE "catalog"."collection_mutation_receipt" (
  "store_id" uuid NOT NULL,
  "workflow_id" text NOT NULL,
  "request_hash" text NOT NULL,
  "mutation_kind" varchar(32) NOT NULL,
  "result_json" jsonb NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "completed_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "collection_mutation_receipt_pkey"
    PRIMARY KEY ("store_id", "workflow_id"),
  CONSTRAINT "collection_mutation_receipt_hash_check"
    CHECK ("request_hash" ~ '^sha256:v1:[0-9a-f]{64}$')
);

CREATE INDEX "idx_collection_mutation_receipt_cleanup"
  ON "catalog"."collection_mutation_receipt" ("completed_at");

CREATE TABLE "catalog"."collection_product_sync_operation" (
  "store_id" uuid NOT NULL,
  "operation_id" uuid NOT NULL,
  "workflow_id" text NOT NULL,
  "collection_id" uuid NOT NULL,
  "collection_revision" integer NOT NULL,
  "reason" varchar(16) NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'pending',
  "affected_count" integer NOT NULL,
  "emitted_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "completed_at" timestamp with time zone,
  CONSTRAINT "collection_product_sync_operation_pkey"
    PRIMARY KEY ("store_id", "operation_id"),
  CONSTRAINT "collection_product_sync_operation_collection_fk"
    FOREIGN KEY ("store_id", "collection_id")
    REFERENCES "catalog"."collection" ("store_id", "id")
    ON DELETE CASCADE,
  CONSTRAINT "collection_product_sync_operation_workflow_uniq"
    UNIQUE ("store_id", "workflow_id"),
  CONSTRAINT "collection_product_sync_operation_status_check"
    CHECK ("status" IN ('pending', 'completed')),
  CONSTRAINT "collection_product_sync_operation_reason_check"
    CHECK ("reason" IN ('add', 'remove', 'move', 'rebalance', 'clear')),
  CONSTRAINT "collection_product_sync_operation_counts_check"
    CHECK (
      "affected_count" >= 0
      AND "emitted_count" >= 0
      AND "emitted_count" <= "affected_count"
    )
);

CREATE INDEX "idx_collection_product_sync_operation_cleanup"
  ON "catalog"."collection_product_sync_operation" ("status", "completed_at")
  WHERE "status" = 'completed';

CREATE TABLE "catalog"."collection_product_sync_item" (
  "store_id" uuid NOT NULL,
  "operation_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "emitted_at" timestamp with time zone,
  CONSTRAINT "collection_product_sync_item_pkey"
    PRIMARY KEY ("store_id", "operation_id", "product_id"),
  CONSTRAINT "collection_product_sync_item_operation_fk"
    FOREIGN KEY ("store_id", "operation_id")
    REFERENCES "catalog"."collection_product_sync_operation" ("store_id", "operation_id")
    ON DELETE CASCADE
);

CREATE INDEX "idx_collection_product_sync_item_pending"
  ON "catalog"."collection_product_sync_item" ("store_id", "operation_id", "product_id")
  WHERE "emitted_at" IS NULL;

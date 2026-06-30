-- Up Migration

CREATE TABLE "catalog"."bulk_edit_item" (
  "id" uuid NOT NULL,
  "job_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "variant_id" uuid,
  "op_type" text NOT NULL,
  "op_index" integer NOT NULL,
  "chunk_index" integer NOT NULL,
  "params" jsonb NOT NULL,
  "status" "catalog"."bulk_edit_item_status" NOT NULL DEFAULT 'PENDING',
  "fence_token" text NOT NULL,
  "cancel_requested" boolean NOT NULL DEFAULT false,
  "cancel_reason" "catalog"."bulk_edit_cancel_reason",
  "superseded_by_job_id" uuid,
  "errors" jsonb,
  "started_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  CONSTRAINT "bulk_edit_item_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bulk_edit_item_job_id_fk"
    FOREIGN KEY ("job_id")
    REFERENCES "catalog"."bulk_edit_job" ("id")
    ON DELETE CASCADE
);

CREATE INDEX "bulk_edit_item_project_product_status_idx"
  ON "catalog"."bulk_edit_item" ("project_id", "product_id", "status");

CREATE INDEX "bulk_edit_item_job_chunk_op_idx"
  ON "catalog"."bulk_edit_item" ("job_id", "chunk_index", "op_index");

CREATE INDEX "bulk_edit_item_job_status_idx"
  ON "catalog"."bulk_edit_item" ("job_id", "status");

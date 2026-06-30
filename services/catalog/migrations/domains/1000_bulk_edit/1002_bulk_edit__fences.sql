-- Up Migration

CREATE TABLE "catalog"."product_bulk_fence" (
  "project_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "fence_token" text NOT NULL,
  "job_id" uuid NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_bulk_fence_pkey" PRIMARY KEY ("project_id", "product_id"),
  CONSTRAINT "product_bulk_fence_job_id_fk"
    FOREIGN KEY ("job_id")
    REFERENCES "catalog"."bulk_edit_job" ("id")
    ON DELETE CASCADE
);

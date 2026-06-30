-- Up Migration

CREATE TABLE "catalog"."bulk_edit_job" (
  "id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "status" "catalog"."bulk_edit_job_status" NOT NULL DEFAULT 'QUEUED',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "started_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  CONSTRAINT "bulk_edit_job_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bulk_edit_job_project_created_idx"
  ON "catalog"."bulk_edit_job" ("project_id", "created_at");

CREATE INDEX "bulk_edit_job_project_status_idx"
  ON "catalog"."bulk_edit_job" ("project_id", "status");

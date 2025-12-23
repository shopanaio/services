ALTER TABLE "project"."project" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
CREATE INDEX "idx_project_organization" ON "project"."project" USING btree ("organization_id");
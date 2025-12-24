DROP INDEX "iam"."idx_role_org_name";--> statement-breakpoint
ALTER TABLE "iam"."role" ADD COLUMN "domain" varchar(128) DEFAULT '*' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_role_domain" ON "iam"."role" USING btree ("organization_id","domain");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_role_org_domain_name" ON "iam"."role" USING btree ("organization_id","domain","name");
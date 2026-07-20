CREATE TABLE "iam"."application_auth_admin_audit" (
	"record_id" uuid PRIMARY KEY NOT NULL,
	"schema_version" integer NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"category" varchar(64) NOT NULL,
	"action" varchar(64) NOT NULL,
	"outcome" varchar(16) NOT NULL,
	"reason_category" varchar(64) NOT NULL,
	"actor_type" varchar(32) NOT NULL,
	"actor_id" text,
	"organization_id" uuid,
	"application_id" uuid,
	"target_type" varchar(64) NOT NULL,
	"target_id" text,
	"request_id" varchar(256) NOT NULL,
	"safe_diff_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "application_auth_admin_audit_schema_check" CHECK ("iam"."application_auth_admin_audit"."schema_version" = 1 AND "iam"."application_auth_admin_audit"."category" = 'application_auth_admin'),
	CONSTRAINT "application_auth_admin_audit_outcome_check" CHECK ("iam"."application_auth_admin_audit"."outcome" IN ('success', 'failure')),
	CONSTRAINT "application_auth_admin_audit_actor_check" CHECK (("iam"."application_auth_admin_audit"."actor_type" = 'platform_admin' AND "iam"."application_auth_admin_audit"."actor_id" IS NOT NULL) OR ("iam"."application_auth_admin_audit"."actor_type" = 'anonymous' AND "iam"."application_auth_admin_audit"."actor_id" IS NULL)),
	CONSTRAINT "application_auth_admin_audit_safe_diff_check" CHECK (jsonb_typeof("iam"."application_auth_admin_audit"."safe_diff_json") = 'object')
);
--> statement-breakpoint
CREATE INDEX "idx_application_auth_admin_audit_org_occurred" ON "iam"."application_auth_admin_audit" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_application_auth_admin_audit_application_occurred" ON "iam"."application_auth_admin_audit" USING btree ("application_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_application_auth_admin_audit_request" ON "iam"."application_auth_admin_audit" USING btree ("request_id");
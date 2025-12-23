CREATE TABLE "iam"."organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"slug" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "iam"."organization_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"org_role" varchar(32) DEFAULT 'member' NOT NULL,
	"invited_by" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."registered_resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"display_name" varchar(256),
	"actions" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "iam"."idx_casbin_rule_tenant";--> statement-breakpoint
DROP INDEX "iam"."idx_role_tenant_name";--> statement-breakpoint
DROP INDEX "iam"."idx_role_hierarchy_unique";--> statement-breakpoint
DROP INDEX "iam"."idx_user_role_unique";--> statement-breakpoint
ALTER TABLE "iam"."role" ALTER COLUMN "tenant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."role_hierarchy" ALTER COLUMN "tenant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."user_role" ALTER COLUMN "tenant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."casbin_rule" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "iam"."role" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."role_hierarchy" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."tenant" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "iam"."user_role" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."user_role" ADD COLUMN "domain" varchar(256) DEFAULT '*' NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."organization_member" ADD CONSTRAINT "organization_member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_organization_slug" ON "iam"."organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_org_member_org" ON "iam"."organization_member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_org_member_user" ON "iam"."organization_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_org_member_unique" ON "iam"."organization_member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_registered_resource_unique" ON "iam"."registered_resource" USING btree ("service","name");--> statement-breakpoint
CREATE INDEX "idx_registered_resource_service" ON "iam"."registered_resource" USING btree ("service");--> statement-breakpoint
ALTER TABLE "iam"."casbin_rule" ADD CONSTRAINT "casbin_rule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role" ADD CONSTRAINT "role_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."tenant" ADD CONSTRAINT "tenant_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_role" ADD CONSTRAINT "user_role_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_casbin_rule_org" ON "iam"."casbin_rule" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_casbin_rule_v1" ON "iam"."casbin_rule" USING btree ("v1");--> statement-breakpoint
CREATE INDEX "idx_casbin_rule_org_domain" ON "iam"."casbin_rule" USING btree ("organization_id","v1");--> statement-breakpoint
CREATE INDEX "idx_role_org" ON "iam"."role" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_role_org_name" ON "iam"."role" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "idx_tenant_org" ON "iam"."tenant" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_user_role_org_user" ON "iam"."user_role" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_user_role_domain" ON "iam"."user_role" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_role_hierarchy_unique" ON "iam"."role_hierarchy" USING btree ("organization_id","parent_role_id","child_role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_role_unique" ON "iam"."user_role" USING btree ("organization_id","user_id","domain");
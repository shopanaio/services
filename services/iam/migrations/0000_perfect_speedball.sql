CREATE SCHEMA "iam";
--> statement-breakpoint
CREATE TABLE "iam"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "iam"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "iam"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "iam"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."casbin_rule" (
	"id" serial PRIMARY KEY NOT NULL,
	"ptype" varchar(10) NOT NULL,
	"v0" varchar(256),
	"v1" varchar(256),
	"v2" varchar(256),
	"v3" varchar(256),
	"v4" varchar(256),
	"v5" varchar(256),
	"organization_id" uuid
);
--> statement-breakpoint
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
CREATE TABLE "iam"."role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tenant_id" uuid,
	"domain" varchar(128) NOT NULL,
	"name" varchar(64) NOT NULL,
	"display_name" varchar(256),
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."role_hierarchy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tenant_id" uuid,
	"parent_role_id" uuid NOT NULL,
	"child_role_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."tenant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iam"."user_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tenant_id" uuid,
	"user_id" varchar(128) NOT NULL,
	"role_id" uuid NOT NULL,
	"domain" varchar(256) NOT NULL,
	"granted_by" varchar(128),
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "iam"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."casbin_rule" ADD CONSTRAINT "casbin_rule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."organization_member" ADD CONSTRAINT "organization_member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role" ADD CONSTRAINT "role_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role" ADD CONSTRAINT "role_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "iam"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "iam"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_parent_role_id_role_id_fk" FOREIGN KEY ("parent_role_id") REFERENCES "iam"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_child_role_id_role_id_fk" FOREIGN KEY ("child_role_id") REFERENCES "iam"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."tenant" ADD CONSTRAINT "tenant_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_role" ADD CONSTRAINT "user_role_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_role" ADD CONSTRAINT "user_role_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "iam"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."user_role" ADD CONSTRAINT "user_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "iam"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_user_id" ON "iam"."account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_account_provider" ON "iam"."account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "idx_session_user_id" ON "iam"."session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_session_token" ON "iam"."session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_session_expires_at" ON "iam"."session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_user_email" ON "iam"."user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_user_created_at" ON "iam"."user" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_verification_identifier" ON "iam"."verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "idx_verification_expires_at" ON "iam"."verification" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_casbin_rule_ptype" ON "iam"."casbin_rule" USING btree ("ptype");--> statement-breakpoint
CREATE INDEX "idx_casbin_rule_org" ON "iam"."casbin_rule" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_casbin_rule_v0" ON "iam"."casbin_rule" USING btree ("v0");--> statement-breakpoint
CREATE INDEX "idx_casbin_rule_v1" ON "iam"."casbin_rule" USING btree ("v1");--> statement-breakpoint
CREATE INDEX "idx_casbin_rule_org_domain" ON "iam"."casbin_rule" USING btree ("organization_id","v1");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_organization_slug" ON "iam"."organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_org_member_org" ON "iam"."organization_member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_org_member_user" ON "iam"."organization_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_org_member_unique" ON "iam"."organization_member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_registered_resource_unique" ON "iam"."registered_resource" USING btree ("service","name");--> statement-breakpoint
CREATE INDEX "idx_registered_resource_service" ON "iam"."registered_resource" USING btree ("service");--> statement-breakpoint
CREATE INDEX "idx_role_org" ON "iam"."role" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_role_tenant" ON "iam"."role" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_role_domain" ON "iam"."role" USING btree ("organization_id","domain");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_role_org_domain_name" ON "iam"."role" USING btree ("organization_id","domain","name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_role_hierarchy_unique" ON "iam"."role_hierarchy" USING btree ("organization_id","parent_role_id","child_role_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_org" ON "iam"."tenant" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_user_role_org_user" ON "iam"."user_role" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_user_role_tenant_user" ON "iam"."user_role" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_user_role_user" ON "iam"."user_role" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_role_domain" ON "iam"."user_role" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_role_unique" ON "iam"."user_role" USING btree ("organization_id","user_id","domain");
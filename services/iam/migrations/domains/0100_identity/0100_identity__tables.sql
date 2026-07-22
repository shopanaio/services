-- Up Migration

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
CREATE TABLE "iam"."jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
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
CREATE TABLE "iam"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
CREATE TABLE "iam"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "iam"."application_account" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
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
CREATE TABLE "iam"."application_jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"private_key_key_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
CREATE TABLE "iam"."application_session" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "iam"."application_user" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"global_user_id" text,
	"name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "iam"."application_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "iam"."application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"display_name" varchar(256) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
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
CREATE TABLE "iam"."organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"display_name" varchar(256) NOT NULL,
	"logo_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
CREATE TABLE "iam"."organization_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"invited_by" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "iam"."registered_resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"display_name" varchar(256),
	"actions" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "iam"."role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"domain" varchar(128) NOT NULL,
	"name" varchar(64) NOT NULL,
	"display_name" varchar(256),
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "iam"."role_hierarchy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"parent_role_id" uuid NOT NULL,
	"child_role_id" uuid NOT NULL
);
CREATE TABLE "iam"."user_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"role_id" uuid NOT NULL,
	"domain" varchar(256) NOT NULL,
	"granted_by" varchar(128),
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "iam"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."user"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "idx_application_user_application_id" ON "iam"."application_user" USING btree ("application_id","id");
ALTER TABLE "iam"."application_account" ADD CONSTRAINT "application_account_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_account" ADD CONSTRAINT "application_account_application_user_fk" FOREIGN KEY ("application_id","user_id") REFERENCES "iam"."application_user"("application_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_jwks" ADD CONSTRAINT "application_jwks_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_session" ADD CONSTRAINT "application_session_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_session" ADD CONSTRAINT "application_session_application_user_fk" FOREIGN KEY ("application_id","user_id") REFERENCES "iam"."application_user"("application_id","id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_user" ADD CONSTRAINT "application_user_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application_user" ADD CONSTRAINT "application_user_global_user_id_user_id_fk" FOREIGN KEY ("global_user_id") REFERENCES "iam"."user"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "iam"."application_verification" ADD CONSTRAINT "application_verification_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."application" ADD CONSTRAINT "application_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."casbin_rule" ADD CONSTRAINT "casbin_rule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."organization_member" ADD CONSTRAINT "organization_member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."role" ADD CONSTRAINT "role_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_parent_role_id_role_id_fk" FOREIGN KEY ("parent_role_id") REFERENCES "iam"."role"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."role_hierarchy" ADD CONSTRAINT "role_hierarchy_child_role_id_role_id_fk" FOREIGN KEY ("child_role_id") REFERENCES "iam"."role"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."user_role" ADD CONSTRAINT "user_role_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iam"."user_role" ADD CONSTRAINT "user_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "iam"."role"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "idx_account_user_id" ON "iam"."account" USING btree ("user_id");
CREATE UNIQUE INDEX "idx_account_provider" ON "iam"."account" USING btree ("provider_id","account_id");
CREATE INDEX "idx_session_user_id" ON "iam"."session" USING btree ("user_id");
CREATE UNIQUE INDEX "idx_session_token" ON "iam"."session" USING btree ("token");
CREATE INDEX "idx_session_expires_at" ON "iam"."session" USING btree ("expires_at");
CREATE INDEX "idx_user_email" ON "iam"."user" USING btree ("email");
CREATE INDEX "idx_user_created_at" ON "iam"."user" USING btree ("created_at");
CREATE INDEX "idx_verification_identifier" ON "iam"."verification" USING btree ("identifier");
CREATE INDEX "idx_verification_expires_at" ON "iam"."verification" USING btree ("expires_at");
CREATE UNIQUE INDEX "idx_application_account_application_id" ON "iam"."application_account" USING btree ("application_id","id");
CREATE UNIQUE INDEX "idx_application_account_provider" ON "iam"."application_account" USING btree ("application_id","provider_id","account_id");
CREATE INDEX "idx_application_account_application_user" ON "iam"."application_account" USING btree ("application_id","user_id");
CREATE UNIQUE INDEX "idx_application_jwks_application_id" ON "iam"."application_jwks" USING btree ("application_id","id");
CREATE INDEX "idx_application_jwks_application_created" ON "iam"."application_jwks" USING btree ("application_id","created_at");
CREATE UNIQUE INDEX "idx_application_session_application_id" ON "iam"."application_session" USING btree ("application_id","id");
CREATE UNIQUE INDEX "idx_application_session_application_token" ON "iam"."application_session" USING btree ("application_id","token");
CREATE INDEX "idx_application_session_application_user" ON "iam"."application_session" USING btree ("application_id","user_id");
CREATE INDEX "idx_application_session_expires_at" ON "iam"."application_session" USING btree ("expires_at");
CREATE UNIQUE INDEX "idx_application_user_application_email" ON "iam"."application_user" USING btree ("application_id","email");
CREATE UNIQUE INDEX "idx_application_user_application_global_user" ON "iam"."application_user" USING btree ("application_id","global_user_id");
CREATE INDEX "idx_application_user_application_status" ON "iam"."application_user" USING btree ("application_id","status");
CREATE UNIQUE INDEX "idx_application_verification_application_id" ON "iam"."application_verification" USING btree ("application_id","id");
CREATE INDEX "idx_application_verification_identifier" ON "iam"."application_verification" USING btree ("application_id","identifier");
CREATE INDEX "idx_application_verification_expires_at" ON "iam"."application_verification" USING btree ("expires_at");
CREATE INDEX "idx_application_org" ON "iam"."application" USING btree ("organization_id");
CREATE UNIQUE INDEX "idx_application_org_name" ON "iam"."application" USING btree ("organization_id","name");
CREATE INDEX "idx_casbin_rule_ptype" ON "iam"."casbin_rule" USING btree ("ptype");
CREATE INDEX "idx_casbin_rule_org" ON "iam"."casbin_rule" USING btree ("organization_id");
CREATE INDEX "idx_casbin_rule_v0" ON "iam"."casbin_rule" USING btree ("v0");
CREATE INDEX "idx_casbin_rule_v1" ON "iam"."casbin_rule" USING btree ("v1");
CREATE INDEX "idx_casbin_rule_org_domain" ON "iam"."casbin_rule" USING btree ("organization_id","v1");
CREATE UNIQUE INDEX "idx_organization_name" ON "iam"."organization" USING btree ("name");
CREATE INDEX "idx_org_member_org" ON "iam"."organization_member" USING btree ("organization_id");
CREATE INDEX "idx_org_member_user" ON "iam"."organization_member" USING btree ("user_id");
CREATE UNIQUE INDEX "idx_org_member_unique" ON "iam"."organization_member" USING btree ("organization_id","user_id");
CREATE UNIQUE INDEX "idx_registered_resource_unique" ON "iam"."registered_resource" USING btree ("service","name");
CREATE INDEX "idx_registered_resource_service" ON "iam"."registered_resource" USING btree ("service");
CREATE INDEX "idx_role_org" ON "iam"."role" USING btree ("organization_id");
CREATE INDEX "idx_role_domain" ON "iam"."role" USING btree ("organization_id","domain");
CREATE UNIQUE INDEX "idx_role_org_domain_name" ON "iam"."role" USING btree ("organization_id","domain","name");
CREATE UNIQUE INDEX "idx_role_hierarchy_unique" ON "iam"."role_hierarchy" USING btree ("organization_id","parent_role_id","child_role_id");
CREATE INDEX "idx_user_role_org_user" ON "iam"."user_role" USING btree ("organization_id","user_id");
CREATE INDEX "idx_user_role_user" ON "iam"."user_role" USING btree ("user_id");
CREATE INDEX "idx_user_role_domain" ON "iam"."user_role" USING btree ("domain");
CREATE UNIQUE INDEX "idx_user_role_unique" ON "iam"."user_role" USING btree ("organization_id","user_id","domain");

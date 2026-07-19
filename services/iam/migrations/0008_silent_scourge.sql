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
--> statement-breakpoint
CREATE TABLE "iam"."application_jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "iam"."application_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "iam"."account" DROP CONSTRAINT "chk_account_auth_scope_application";--> statement-breakpoint
ALTER TABLE "iam"."session" DROP CONSTRAINT "chk_session_auth_scope_application";--> statement-breakpoint
ALTER TABLE "iam"."verification" DROP CONSTRAINT "chk_verification_auth_scope_application";--> statement-breakpoint
ALTER TABLE "iam"."account" DROP CONSTRAINT "account_application_id_application_id_fk";
--> statement-breakpoint
ALTER TABLE "iam"."session" DROP CONSTRAINT "session_application_id_application_id_fk";
--> statement-breakpoint
ALTER TABLE "iam"."verification" DROP CONSTRAINT "verification_application_id_application_id_fk";
--> statement-breakpoint
DROP INDEX "iam"."idx_account_scope_application_user";--> statement-breakpoint
DROP INDEX "iam"."idx_account_platform_provider";--> statement-breakpoint
DROP INDEX "iam"."idx_account_application_provider";--> statement-breakpoint
DROP INDEX "iam"."idx_session_application";--> statement-breakpoint
DROP INDEX "iam"."idx_session_scope_application";--> statement-breakpoint
DROP INDEX "iam"."idx_verification_scope_application_identifier";--> statement-breakpoint
ALTER TABLE "iam"."application_account" ADD CONSTRAINT "application_account_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."application_account" ADD CONSTRAINT "application_account_application_user_fk" FOREIGN KEY ("application_id","user_id") REFERENCES "iam"."application_user"("application_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."application_jwks" ADD CONSTRAINT "application_jwks_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."application_session" ADD CONSTRAINT "application_session_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."application_session" ADD CONSTRAINT "application_session_application_user_fk" FOREIGN KEY ("application_id","user_id") REFERENCES "iam"."application_user"("application_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."application_user" ADD CONSTRAINT "application_user_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."application_user" ADD CONSTRAINT "application_user_global_user_id_user_id_fk" FOREIGN KEY ("global_user_id") REFERENCES "iam"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."application_verification" ADD CONSTRAINT "application_verification_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_application_account_application_id" ON "iam"."application_account" USING btree ("application_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_application_account_provider" ON "iam"."application_account" USING btree ("application_id","provider_id","account_id");--> statement-breakpoint
CREATE INDEX "idx_application_account_application_user" ON "iam"."application_account" USING btree ("application_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_application_jwks_application_id" ON "iam"."application_jwks" USING btree ("application_id","id");--> statement-breakpoint
CREATE INDEX "idx_application_jwks_application_created" ON "iam"."application_jwks" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_application_session_application_id" ON "iam"."application_session" USING btree ("application_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_application_session_application_token" ON "iam"."application_session" USING btree ("application_id","token");--> statement-breakpoint
CREATE INDEX "idx_application_session_application_user" ON "iam"."application_session" USING btree ("application_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_application_session_expires_at" ON "iam"."application_session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_application_user_application_id" ON "iam"."application_user" USING btree ("application_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_application_user_application_email" ON "iam"."application_user" USING btree ("application_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_application_user_application_global_user" ON "iam"."application_user" USING btree ("application_id","global_user_id");--> statement-breakpoint
CREATE INDEX "idx_application_user_application_status" ON "iam"."application_user" USING btree ("application_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_application_verification_application_id" ON "iam"."application_verification" USING btree ("application_id","id");--> statement-breakpoint
CREATE INDEX "idx_application_verification_identifier" ON "iam"."application_verification" USING btree ("application_id","identifier");--> statement-breakpoint
CREATE INDEX "idx_application_verification_expires_at" ON "iam"."application_verification" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_account_provider" ON "iam"."account" USING btree ("provider_id","account_id");--> statement-breakpoint
ALTER TABLE "iam"."account" DROP COLUMN "auth_scope";--> statement-breakpoint
ALTER TABLE "iam"."account" DROP COLUMN "application_id";--> statement-breakpoint
ALTER TABLE "iam"."session" DROP COLUMN "scope";--> statement-breakpoint
ALTER TABLE "iam"."session" DROP COLUMN "application_id";--> statement-breakpoint
ALTER TABLE "iam"."verification" DROP COLUMN "auth_scope";--> statement-breakpoint
ALTER TABLE "iam"."verification" DROP COLUMN "application_id";
DROP INDEX "iam"."idx_account_provider";--> statement-breakpoint
ALTER TABLE "iam"."account" ADD COLUMN "auth_scope" varchar(16) DEFAULT 'platform' NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."account" ADD COLUMN "application_id" uuid;--> statement-breakpoint
ALTER TABLE "iam"."verification" ADD COLUMN "auth_scope" varchar(16) DEFAULT 'platform' NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."verification" ADD COLUMN "application_id" uuid;--> statement-breakpoint
ALTER TABLE "iam"."account" ADD CONSTRAINT "account_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."verification" ADD CONSTRAINT "verification_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_scope_application_user" ON "iam"."account" USING btree ("auth_scope","application_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_account_platform_provider" ON "iam"."account" USING btree ("provider_id","account_id") WHERE "iam"."account"."auth_scope" = 'platform';--> statement-breakpoint
CREATE UNIQUE INDEX "idx_account_application_provider" ON "iam"."account" USING btree ("application_id","provider_id","account_id") WHERE "iam"."account"."auth_scope" = 'application';--> statement-breakpoint
CREATE INDEX "idx_verification_scope_application_identifier" ON "iam"."verification" USING btree ("auth_scope","application_id","identifier");
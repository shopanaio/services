ALTER TABLE "iam"."application_auth_provider" DROP CONSTRAINT "application_auth_provider_name_check";--> statement-breakpoint
ALTER TABLE "iam"."application_auth_provider" ALTER COLUMN "provider" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "iam"."application_auth_configuration" DROP COLUMN "google_enabled";--> statement-breakpoint
ALTER TABLE "iam"."application_auth_configuration" DROP COLUMN "facebook_enabled";--> statement-breakpoint
ALTER TABLE "iam"."application_auth_provider" ADD CONSTRAINT "application_auth_provider_name_check" CHECK ("iam"."application_auth_provider"."provider" ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$');
ALTER TABLE "iam"."role" ALTER COLUMN "domain" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "iam"."user_role" ALTER COLUMN "domain" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "iam"."user" ADD COLUMN "admin" boolean DEFAULT false NOT NULL;
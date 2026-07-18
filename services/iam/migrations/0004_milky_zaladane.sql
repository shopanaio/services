DROP TABLE IF EXISTS "iam"."application_account";
--> statement-breakpoint
DROP TABLE IF EXISTS "iam"."application_session";
--> statement-breakpoint
DROP TABLE IF EXISTS "iam"."application_verification";
--> statement-breakpoint
DROP TABLE IF EXISTS "iam"."application_jwks";
--> statement-breakpoint
DROP TABLE IF EXISTS "iam"."application_user";
--> statement-breakpoint
CREATE TABLE "iam"."application_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "iam"."application_member" ADD CONSTRAINT "application_member_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iam"."application_member" ADD CONSTRAINT "application_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "iam"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_application_member_application" ON "iam"."application_member" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_application_member_user" ON "iam"."application_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_application_member_application_status" ON "iam"."application_member" USING btree ("application_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_application_member_unique" ON "iam"."application_member" USING btree ("application_id","user_id");

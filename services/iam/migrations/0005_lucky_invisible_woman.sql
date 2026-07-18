ALTER TABLE "iam"."session" ADD COLUMN "scope" varchar(16) DEFAULT 'platform' NOT NULL;--> statement-breakpoint
ALTER TABLE "iam"."session" ADD COLUMN "application_id" uuid;--> statement-breakpoint
ALTER TABLE "iam"."session" ADD CONSTRAINT "session_application_id_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "iam"."application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_session_application" ON "iam"."session" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_session_scope_application" ON "iam"."session" USING btree ("scope","application_id");
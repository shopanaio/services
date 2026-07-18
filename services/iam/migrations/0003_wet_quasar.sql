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
--> statement-breakpoint
ALTER TABLE "iam"."application" ADD CONSTRAINT "application_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_application_org" ON "iam"."application" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_application_org_name" ON "iam"."application" USING btree ("organization_id","name");
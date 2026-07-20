CREATE TABLE "iam"."resource_management" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"resource_kind" varchar(64) NOT NULL,
	"resource_id" uuid NOT NULL,
	"management_mode" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_management_kind_not_empty" CHECK ("iam"."resource_management"."resource_kind" <> ''),
	CONSTRAINT "resource_management_mode_check" CHECK ("iam"."resource_management"."management_mode" IN ('organization', 'service'))
);
--> statement-breakpoint
ALTER TABLE "iam"."resource_management" ADD CONSTRAINT "resource_management_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_resource_management_resource" ON "iam"."resource_management" USING btree ("organization_id","resource_kind","resource_id");
-- Up Migration

CREATE TABLE "iam"."service_linked_resource" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"resource_kind" varchar(64) NOT NULL,
	"resource_id" uuid NOT NULL,
	"linked_service" varchar(64) NOT NULL,
	"linked_owner_type" varchar(64) NOT NULL,
	"linked_owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "service_linked_resource_kind_not_empty" CHECK ("iam"."service_linked_resource"."resource_kind" <> ''),
	CONSTRAINT "service_linked_service_not_empty" CHECK ("iam"."service_linked_resource"."linked_service" <> ''),
	CONSTRAINT "service_linked_owner_type_not_empty" CHECK ("iam"."service_linked_resource"."linked_owner_type" <> '')
);
ALTER TABLE "iam"."service_linked_resource" ADD CONSTRAINT "service_linked_resource_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "iam"."organization"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "uq_service_linked_resource_active" ON "iam"."service_linked_resource" USING btree ("organization_id","resource_kind","resource_id") WHERE deleted_at IS NULL;
CREATE INDEX "idx_service_linked_owner_active" ON "iam"."service_linked_resource" USING btree ("organization_id","linked_service","linked_owner_type","linked_owner_id") WHERE deleted_at IS NULL;

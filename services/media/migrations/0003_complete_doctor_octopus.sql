CREATE TABLE "media"."file_back_refs" (
	"file_id" uuid NOT NULL,
	"service" varchar(64) NOT NULL,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"role" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_back_refs_file_id_service_entity_type_entity_id_role_pk" PRIMARY KEY("file_id","service","entity_type","entity_id","role")
);
--> statement-breakpoint
ALTER TABLE "media"."file_back_refs" ADD CONSTRAINT "file_back_refs_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "media"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fbr_entity" ON "media"."file_back_refs" USING btree ("service","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_fbr_file_usage" ON "media"."file_back_refs" USING btree ("file_id","entity_type","entity_id");
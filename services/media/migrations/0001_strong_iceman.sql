CREATE TABLE "media"."asset_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_type" varchar(50) NOT NULL,
	"owner_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "media"."idx_files_project_id";--> statement-breakpoint
ALTER TABLE "media"."files" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "media"."files" ADD COLUMN "asset_group_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_asset_groups_owner" ON "media"."asset_groups" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "idx_asset_groups_owner_type" ON "media"."asset_groups" USING btree ("owner_type");--> statement-breakpoint
ALTER TABLE "media"."files" ADD CONSTRAINT "files_asset_group_id_asset_groups_id_fk" FOREIGN KEY ("asset_group_id") REFERENCES "media"."asset_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_files_asset_group" ON "media"."files" USING btree ("asset_group_id") WHERE deleted_at IS NULL AND asset_group_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_files_project_id" ON "media"."files" USING btree ("project_id") WHERE deleted_at IS NULL AND project_id IS NOT NULL;
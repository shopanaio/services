DROP INDEX "media"."idx_files_project_id";--> statement-breakpoint
DROP INDEX "media"."idx_files_asset_group";--> statement-breakpoint
DROP INDEX "media"."idx_files_provider";--> statement-breakpoint
DROP INDEX "media"."idx_files_created_at";--> statement-breakpoint
DROP INDEX "media"."idx_files_source_url";--> statement-breakpoint
DROP INDEX "media"."idx_files_idempotency_key";--> statement-breakpoint
DROP INDEX "media"."idx_s3_objects_hash";--> statement-breakpoint
DROP INDEX "media"."idx_external_media_external_id";--> statement-breakpoint
ALTER TABLE "media"."files" ALTER COLUMN "asset_group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "media"."s3_objects" ADD COLUMN "asset_group_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "media"."external_media" ADD COLUMN "asset_group_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "media"."s3_objects" ADD CONSTRAINT "s3_objects_asset_group_id_asset_groups_id_fk" FOREIGN KEY ("asset_group_id") REFERENCES "media"."asset_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media"."external_media" ADD CONSTRAINT "external_media_asset_group_id_asset_groups_id_fk" FOREIGN KEY ("asset_group_id") REFERENCES "media"."asset_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_s3_objects_asset_group" ON "media"."s3_objects" USING btree ("asset_group_id");--> statement-breakpoint
CREATE INDEX "idx_external_media_asset_group" ON "media"."external_media" USING btree ("asset_group_id");--> statement-breakpoint
CREATE INDEX "idx_files_asset_group" ON "media"."files" USING btree ("asset_group_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_files_provider" ON "media"."files" USING btree ("asset_group_id","provider") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_files_created_at" ON "media"."files" USING btree ("asset_group_id","created_at" DESC) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_files_source_url" ON "media"."files" USING btree ("asset_group_id","source_url") WHERE deleted_at IS NULL AND source_url IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_files_idempotency_key" ON "media"."files" USING btree ("asset_group_id","idempotency_key") WHERE deleted_at IS NULL AND idempotency_key IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_s3_objects_hash" ON "media"."s3_objects" USING btree ("asset_group_id","content_hash") WHERE content_hash IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_external_media_external_id" ON "media"."external_media" USING btree ("asset_group_id","external_id");--> statement-breakpoint
ALTER TABLE "media"."files" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "media"."s3_objects" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "media"."external_media" DROP COLUMN "project_id";
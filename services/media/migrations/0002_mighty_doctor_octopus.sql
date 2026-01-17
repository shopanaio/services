DROP INDEX "media"."idx_s3_objects_hash";--> statement-breakpoint
ALTER TABLE "media"."s3_objects" DROP COLUMN "content_hash";
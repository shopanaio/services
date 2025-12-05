CREATE SCHEMA IF NOT EXISTS "media";

--> statement-breakpoint
CREATE TABLE
	"media"."buckets" (
		"id" uuid PRIMARY KEY NOT NULL,
		"project_id" uuid NOT NULL,
		"bucket_name" varchar(63) NOT NULL,
		"region" varchar(32) DEFAULT 'us-east-1' NOT NULL,
		"status" varchar(16) DEFAULT 'active' NOT NULL,
		"priority" integer DEFAULT 0 NOT NULL,
		"endpoint_url" text,
		"created_at" timestamp with time zone DEFAULT now() NOT NULL,
		"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
		"archived_at" timestamp with time zone,
		"deleted_at" timestamp with time zone,
		CONSTRAINT "buckets_bucket_name_unique" UNIQUE ("bucket_name")
	);

--> statement-breakpoint
CREATE TABLE
	"media"."files" (
		"id" uuid PRIMARY KEY NOT NULL,
		"project_id" uuid NOT NULL,
		"provider" varchar(32) NOT NULL,
		"url" text NOT NULL,
		"mime_type" varchar(127),
		"ext" varchar(16),
		"size_bytes" bigint DEFAULT 0 NOT NULL,
		"original_name" varchar(255),
		"width" integer,
		"height" integer,
		"duration_ms" integer,
		"alt_text" varchar(255),
		"source_url" text,
		"idempotency_key" varchar(255),
		"is_processed" boolean DEFAULT false NOT NULL,
		"meta" jsonb,
		"created_at" timestamp with time zone DEFAULT now() NOT NULL,
		"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
		"deleted_at" timestamp with time zone
	);

--> statement-breakpoint
CREATE TABLE
	"media"."s3_objects" (
		"file_id" uuid PRIMARY KEY NOT NULL,
		"project_id" uuid NOT NULL,
		"bucket_id" uuid NOT NULL,
		"object_key" varchar(1024) NOT NULL,
		"content_hash" varchar(64),
		"etag" varchar(64),
		"storage_class" varchar(32) DEFAULT 'STANDARD' NOT NULL
	);

--> statement-breakpoint
CREATE TABLE
	"media"."external_media" (
		"file_id" uuid PRIMARY KEY NOT NULL,
		"project_id" uuid NOT NULL,
		"external_id" varchar(255) NOT NULL,
		"provider_meta" jsonb
	);

--> statement-breakpoint
CREATE TABLE
	"media"."upload_sessions" (
		"id" uuid PRIMARY KEY NOT NULL,
		"project_id" uuid NOT NULL,
		"bucket_id" uuid NOT NULL,
		"object_key" varchar(1024) NOT NULL,
		"original_name" varchar(255),
		"mime_type" varchar(127),
		"total_size_bytes" bigint NOT NULL,
		"uploaded_bytes" bigint DEFAULT 0 NOT NULL,
		"multipart_upload_id" varchar(255),
		"status" varchar(32) DEFAULT 'pending' NOT NULL,
		"expires_at" timestamp with time zone NOT NULL,
		"created_at" timestamp with time zone DEFAULT now() NOT NULL,
		"updated_at" timestamp with time zone DEFAULT now() NOT NULL
	);

--> statement-breakpoint
CREATE TABLE
	"media"."bucket_rotation_log" (
		"id" uuid PRIMARY KEY NOT NULL,
		"project_id" uuid NOT NULL,
		"old_bucket_id" uuid,
		"new_bucket_id" uuid,
		"reason" varchar(64) NOT NULL,
		"details" jsonb,
		"created_at" timestamp with time zone DEFAULT now() NOT NULL
	);

--> statement-breakpoint
ALTER TABLE "media"."s3_objects"
ADD CONSTRAINT "s3_objects_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "media"."files" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "media"."s3_objects"
ADD CONSTRAINT "s3_objects_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "media"."buckets" ("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "media"."external_media"
ADD CONSTRAINT "external_media_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "media"."files" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "media"."upload_sessions"
ADD CONSTRAINT "upload_sessions_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "media"."buckets" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "media"."bucket_rotation_log"
ADD CONSTRAINT "bucket_rotation_log_old_bucket_id_buckets_id_fk" FOREIGN KEY ("old_bucket_id") REFERENCES "media"."buckets" ("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "media"."bucket_rotation_log"
ADD CONSTRAINT "bucket_rotation_log_new_bucket_id_buckets_id_fk" FOREIGN KEY ("new_bucket_id") REFERENCES "media"."buckets" ("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
CREATE UNIQUE INDEX "idx_buckets_active_per_project" ON "media"."buckets" USING btree ("project_id")
WHERE
	status = 'active'
	AND deleted_at IS NULL;

--> statement-breakpoint
CREATE INDEX "idx_buckets_project_id" ON "media"."buckets" USING btree ("project_id");

--> statement-breakpoint
CREATE INDEX "idx_buckets_status" ON "media"."buckets" USING btree ("project_id", "status")
WHERE
	deleted_at IS NULL;

--> statement-breakpoint
CREATE INDEX "idx_files_project_id" ON "media"."files" USING btree ("project_id")
WHERE
	deleted_at IS NULL;

--> statement-breakpoint
CREATE INDEX "idx_files_provider" ON "media"."files" USING btree ("project_id", "provider")
WHERE
	deleted_at IS NULL;

--> statement-breakpoint
CREATE INDEX "idx_files_created_at" ON "media"."files" USING btree ("project_id", "created_at" DESC)
WHERE
	deleted_at IS NULL;

--> statement-breakpoint
CREATE INDEX "idx_files_deleted_at" ON "media"."files" USING btree ("deleted_at")
WHERE
	deleted_at IS NOT NULL;

--> statement-breakpoint
CREATE UNIQUE INDEX "idx_files_source_url" ON "media"."files" USING btree ("project_id", "source_url")
WHERE
	deleted_at IS NULL
	AND source_url IS NOT NULL;

--> statement-breakpoint
CREATE UNIQUE INDEX "idx_files_idempotency_key" ON "media"."files" USING btree ("project_id", "idempotency_key")
WHERE
	deleted_at IS NULL
	AND idempotency_key IS NOT NULL;

--> statement-breakpoint
CREATE UNIQUE INDEX "idx_s3_objects_key" ON "media"."s3_objects" USING btree ("bucket_id", "object_key");

--> statement-breakpoint
CREATE UNIQUE INDEX "idx_s3_objects_hash" ON "media"."s3_objects" USING btree ("project_id", "content_hash")
WHERE
	content_hash IS NOT NULL;

--> statement-breakpoint
CREATE INDEX "idx_s3_objects_bucket" ON "media"."s3_objects" USING btree ("bucket_id");

--> statement-breakpoint
CREATE INDEX "idx_external_media_external_id" ON "media"."external_media" USING btree ("project_id", "external_id");

--> statement-breakpoint
CREATE INDEX "idx_upload_sessions_project" ON "media"."upload_sessions" USING btree ("project_id");

--> statement-breakpoint
CREATE INDEX "idx_upload_sessions_expires" ON "media"."upload_sessions" USING btree ("expires_at")
WHERE
	status = 'pending';

--> statement-breakpoint
CREATE INDEX "idx_bucket_rotation_log_project" ON "media"."bucket_rotation_log" USING btree ("project_id", "created_at" DESC);

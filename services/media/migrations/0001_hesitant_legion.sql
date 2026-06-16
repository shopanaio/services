CREATE TABLE "media"."file_deletion_states" (
	"file_id" uuid PRIMARY KEY NOT NULL,
	"deletion_state" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"deletion_error_code" varchar(20),
	"last_deletion_error" text,
	"deleting_started_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	CONSTRAINT "chk_fds_error_fields_paired" CHECK ((deletion_error_code IS NULL) = (failed_at IS NULL)),
	CONSTRAINT "chk_fds_deleting_has_no_errors" CHECK (deletion_state <> 'DELETING' OR (deletion_error_code IS NULL AND failed_at IS NULL AND last_deletion_error IS NULL)),
	CONSTRAINT "chk_fds_deleting_has_started_at" CHECK (deletion_state <> 'DELETING' OR deleting_started_at IS NOT NULL),
	CONSTRAINT "chk_fds_active_has_no_deletion_fields" CHECK (deletion_state <> 'ACTIVE' OR (deleting_started_at IS NULL AND deletion_error_code IS NULL AND failed_at IS NULL AND last_deletion_error IS NULL)),
	CONSTRAINT "chk_fds_deletion_state_valid" CHECK (deletion_state IN ('ACTIVE', 'SOFT_DELETED', 'DELETING')),
	CONSTRAINT "chk_fds_deletion_error_code_valid" CHECK (deletion_error_code IS NULL OR deletion_error_code IN ('RETRYABLE', 'FATAL'))
);
--> statement-breakpoint
ALTER TABLE "media"."file_deletion_states" ADD CONSTRAINT "file_deletion_states_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "media"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fds_gc_soft_deleted" ON "media"."file_deletion_states" USING btree ("file_id") WHERE deletion_state = 'SOFT_DELETED';--> statement-breakpoint
CREATE INDEX "idx_fds_gc_soft_deleted_clean" ON "media"."file_deletion_states" USING btree ("file_id") WHERE deletion_state = 'SOFT_DELETED' AND deletion_error_code IS NULL;--> statement-breakpoint
CREATE INDEX "idx_fds_stuck_deleting" ON "media"."file_deletion_states" USING btree ("deleting_started_at","file_id") WHERE deletion_state = 'DELETING' AND deleting_started_at IS NOT NULL;--> statement-breakpoint
-- Data migration: create deletion state for all existing files
INSERT INTO "media"."file_deletion_states" (file_id, deletion_state)
SELECT id, CASE WHEN deleted_at IS NULL THEN 'ACTIVE' ELSE 'SOFT_DELETED' END
FROM "media"."files"
ON CONFLICT (file_id) DO NOTHING;
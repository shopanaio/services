-- Media Service Schema
-- Handles file storage in S3 with bucket rotation
-- All tables are scoped to project_id (no FK to external tables)

-- Create media schema
CREATE SCHEMA IF NOT EXISTS media;

-- S3 Buckets with rotation support
-- Each project can have multiple buckets for rotation
CREATE TABLE
  media.buckets (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL,
    -- S3 bucket name (globally unique in AWS)
    bucket_name varchar(63) NOT NULL UNIQUE,
    -- AWS region where bucket is located
    region varchar(32) NOT NULL DEFAULT 'us-east-1',
    -- Bucket status for rotation: active, readonly, archived, deleting
    status varchar(16) NOT NULL DEFAULT 'active',
    -- Rotation priority (lower = preferred for new uploads)
    priority int NOT NULL DEFAULT 0,
    -- Optional custom endpoint (for S3-compatible services)
    endpoint_url text,
    -- Metadata
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz,
    deleted_at timestamptz
  );

-- Only one active bucket per project at a time for uploads
CREATE UNIQUE INDEX idx_buckets_active_per_project
  ON media.buckets (project_id)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX idx_buckets_project_id ON media.buckets (project_id);
CREATE INDEX idx_buckets_status ON media.buckets (project_id, status) WHERE deleted_at IS NULL;

-- Base files table (provider-agnostic)
CREATE TABLE
  media.files (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL,
    -- Provider type: s3, youtube, vimeo, url, local, etc
    provider varchar(32) NOT NULL,
    -- Public URL to access file
    url text NOT NULL,
    -- MIME type
    mime_type varchar(127),
    -- File extension (jpg, png, pdf, etc)
    ext varchar(16),
    -- Size in bytes (0 for external providers like youtube)
    size_bytes bigint NOT NULL DEFAULT 0,
    -- Original filename from upload
    original_name varchar(255),
    -- Image/video dimensions (nullable)
    width int,
    height int,
    duration_ms int,
    -- Alt text for accessibility
    alt_text varchar(255),
    -- Source URL for idempotency (prevents duplicates when uploading from URL)
    source_url text,
    -- Idempotency key for custom deduplication
    idempotency_key varchar(255),
    -- Processing status (for s3 files)
    is_processed boolean NOT NULL DEFAULT false,
    -- Metadata (thumbnails for youtube, etc)
    meta jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

CREATE INDEX idx_files_project_id ON media.files (project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_provider ON media.files (project_id, provider) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_created_at ON media.files (project_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_files_deleted_at ON media.files (deleted_at) WHERE deleted_at IS NOT NULL;

-- Idempotency indexes (prevent duplicates)
CREATE UNIQUE INDEX idx_files_source_url ON media.files (project_id, source_url) WHERE deleted_at IS NULL AND source_url IS NOT NULL;
CREATE UNIQUE INDEX idx_files_idempotency_key ON media.files (project_id, idempotency_key) WHERE deleted_at IS NULL AND idempotency_key IS NOT NULL;

-- S3-specific file data (only for provider = 's3')
CREATE TABLE
  media.s3_objects (
    -- 1:1 with files
    file_id uuid PRIMARY KEY REFERENCES media.files (id) ON DELETE CASCADE,
    project_id uuid NOT NULL,
    -- Bucket reference
    bucket_id uuid NOT NULL REFERENCES media.buckets (id) ON DELETE RESTRICT,
    -- S3 object key (path within bucket)
    object_key varchar(1024) NOT NULL,
    -- Content hash for deduplication (SHA-256)
    content_hash varchar(64),
    -- ETag from S3
    etag varchar(64),
    -- Storage class (STANDARD, GLACIER, etc)
    storage_class varchar(32) NOT NULL DEFAULT 'STANDARD'
  );

CREATE UNIQUE INDEX idx_s3_objects_key ON media.s3_objects (bucket_id, object_key);
CREATE UNIQUE INDEX idx_s3_objects_hash ON media.s3_objects (project_id, content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX idx_s3_objects_bucket ON media.s3_objects (bucket_id);

-- External provider data (youtube, vimeo, etc)
CREATE TABLE
  media.external_media (
    -- 1:1 with files
    file_id uuid PRIMARY KEY REFERENCES media.files (id) ON DELETE CASCADE,
    project_id uuid NOT NULL,
    -- External ID (youtube video id, vimeo id, etc)
    external_id varchar(255) NOT NULL,
    -- Provider-specific metadata
    provider_meta jsonb
  );

CREATE INDEX idx_external_media_external_id ON media.external_media (project_id, external_id);

-- Upload sessions for resumable/chunked uploads
CREATE TABLE
  media.upload_sessions (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL,
    -- Target bucket for upload
    bucket_id uuid NOT NULL REFERENCES media.buckets (id) ON DELETE CASCADE,
    -- Target object key
    object_key varchar(1024) NOT NULL,
    -- Original filename
    original_name varchar(255),
    -- Expected MIME type
    mime_type varchar(127),
    -- Expected total size
    total_size_bytes bigint NOT NULL,
    -- Bytes uploaded so far
    uploaded_bytes bigint NOT NULL DEFAULT 0,
    -- S3 multipart upload ID
    multipart_upload_id varchar(255),
    -- Upload status
    status varchar(32) NOT NULL DEFAULT 'pending',
    -- Expiration (cleanup stale uploads)
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

CREATE INDEX idx_upload_sessions_project ON media.upload_sessions (project_id);
CREATE INDEX idx_upload_sessions_expires ON media.upload_sessions (expires_at) WHERE status = 'pending';

-- Bucket rotation history/audit log
CREATE TABLE
  media.bucket_rotation_log (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL,
    -- Old bucket that was rotated out
    old_bucket_id uuid REFERENCES media.buckets (id) ON DELETE SET NULL,
    -- New bucket that became active
    new_bucket_id uuid REFERENCES media.buckets (id) ON DELETE SET NULL,
    -- Reason for rotation
    reason varchar(64) NOT NULL,
    -- Details
    details jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );

CREATE INDEX idx_bucket_rotation_log_project ON media.bucket_rotation_log (project_id, created_at DESC);

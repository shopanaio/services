CREATE TABLE
  files (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    -- full url to file
    url text NOT NULL,
    -- s3, youtube, vimeo, local etc...
    driver varchar(32) NOT NULL,
    -- size in bytes
    size int NOT NULL DEFAULT 0,
    -- extension like jpg, png, pdf etc...
    ext varchar(16),
    -- Original name of file
    original_name varchar(255) NOT NULL,
    -- s3 object key
    object_key varchar(255) UNIQUE NOT NULL,
    -- external key like url from external storage
    -- which prevents from duplication
    uploaded_from_url varchar(255),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

CREATE UNIQUE INDEX idx_files_uploaded_from_url ON files (project_id, uploaded_from_url) WHERE deleted_at IS NULL;

CREATE INDEX idx_files_deleted_at ON files (deleted_at) WHERE deleted_at IS NOT NULL;

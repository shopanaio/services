CREATE_TABLE s3_storage (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  s3_bucket_name varchar(255) NOT NULL UNIQUE,
  PRIMARY KEY (id)
)

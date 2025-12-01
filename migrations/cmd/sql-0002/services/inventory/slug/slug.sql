CREATE TABLE
  record (
    id uuid PRIMARY KEY,
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    record_type varchar(64) NOT NULL,
    record_id uuid NOT NULL,
    slug text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    published_at timestamptz,
    deleted_at timestamptz
  );

-- slug уникален для активных (не удалённых) записей данного типа
CREATE UNIQUE INDEX record_active_slug_uniq ON record (project_id, record_type, slug)
WHERE
  deleted_at IS NULL;

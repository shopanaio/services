-- ==== Tag Groups ====
-- Tag Groups (similar to feature_groups)
CREATE TABLE
  tag_groups (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    slug varchar(255) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

CREATE UNIQUE INDEX idx_tag_groups_slug ON tag_groups (project_id, slug);

-- ==== Tags ====
CREATE TABLE
  tags (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    slug varchar(255) NOT NULL,
    group_id uuid REFERENCES tag_groups (id) ON DELETE SET NULL,
    sort_index int NOT NULL DEFAULT 0 CHECK (sort_index >= 0),
    color_hex char(7) CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    deleted_at timestamptz
  );

CREATE UNIQUE INDEX idx_tags_slug ON tags (project_id, slug)
WHERE
  deleted_at IS NULL;

CREATE INDEX idx_tags_group_id ON tags (group_id);

CREATE INDEX idx_tags_sort_index ON tags (sort_index);

CREATE INDEX idx_tags_deleted_at ON tags (deleted_at)
WHERE
  deleted_at IS NOT NULL;

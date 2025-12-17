CREATE TABLE
  category (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    parent_id uuid REFERENCES category (id) ON DELETE CASCADE,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

CREATE INDEX idx_category_parent_id ON category (parent_id);

-- Индексы для soft-delete
CREATE INDEX idx_category_deleted_at ON category (deleted_at)
WHERE
  deleted_at IS NOT NULL;

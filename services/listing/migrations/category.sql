CREATE TABLE
  category (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    parent_id uuid REFERENCES category (id) ON DELETE CASCADE,
    sort_by varchar(32) NOT NULL,
    sort_by_availability boolean NOT NULL DEFAULT false,
    is_recursive boolean NOT NULL DEFAULT false,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

CREATE INDEX idx_category_project_id ON category (project_id);

CREATE INDEX idx_category_parent_id ON category (parent_id);

-- Индексы для soft-delete
CREATE INDEX idx_category_deleted_at ON category (deleted_at)
WHERE
  deleted_at IS NOT NULL;

CREATE TABLE
  category_item (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    category_id uuid REFERENCES category (id) ON DELETE CASCADE NOT NULL,
    product_id uuid NOT NULL REFERENCES product (id) ON DELETE CASCADE,
    sort_rank varchar(32) COLLATE "C",
    PRIMARY KEY (product_id, category_id),
    CONSTRAINT uq_category_sort_rank UNIQUE (category_id, sort_rank) DEFERRABLE INITIALLY DEFERRED
  );

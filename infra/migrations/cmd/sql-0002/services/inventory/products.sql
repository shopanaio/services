CREATE TABLE
  product (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    status varchar(16) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

CREATE TABLE
  variant (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES product (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY,
    sort_index int NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

CREATE INDEX idx_product_status ON product (status);

CREATE INDEX idx_product_created_at ON product (created_at);

CREATE INDEX idx_product_updated_at ON product (updated_at);

CREATE INDEX idx_product_deleted_at ON product (deleted_at)
WHERE
  deleted_at IS NOT NULL;

CREATE INDEX idx_variant_product_id ON variant (product_id);

CREATE INDEX idx_variant_created_at ON variant (created_at);

CREATE INDEX idx_variant_updated_at ON variant (updated_at);

CREATE UNIQUE INDEX idx_variant_sort_index_unique_live ON variant (product_id, sort_index)
WHERE
  deleted_at IS NULL;

CREATE INDEX idx_variant_deleted_at ON variant (deleted_at)
WHERE
  deleted_at IS NOT NULL;

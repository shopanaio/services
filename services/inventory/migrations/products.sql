CREATE TABLE
  product (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

CREATE TABLE
  variant (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES product (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY,
    sku varchar(64),
    -- External source (nullable = internal)
    external_system varchar(32),
    external_id text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    UNIQUE (project_id, sku),
    UNIQUE (project_id, external_system, external_id)
  );

CREATE INDEX idx_product_project_id ON product (project_id);

CREATE INDEX idx_product_created_at ON product (created_at);

CREATE INDEX idx_product_updated_at ON product (updated_at);

CREATE INDEX idx_product_deleted_at ON product (deleted_at)
WHERE
  deleted_at IS NOT NULL;

CREATE INDEX idx_variant_project_id ON variant (project_id);

CREATE INDEX idx_variant_product_id ON variant (product_id);

CREATE INDEX idx_variant_created_at ON variant (created_at);

CREATE INDEX idx_variant_updated_at ON variant (updated_at);

CREATE INDEX idx_variant_deleted_at ON variant (deleted_at)
WHERE
  deleted_at IS NOT NULL;

CREATE INDEX idx_variant_sku ON variant (project_id, sku)
WHERE
  sku IS NOT NULL;

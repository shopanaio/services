CREATE TABLE
  customers (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    external_id varchar(255) NOT NULL,
    deleted_at timestamptz
  );

CREATE UNIQUE INDEX idx_customers_external_id_project_id ON customers (external_id, project_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_customers_deleted_at ON customers (deleted_at) WHERE deleted_at IS NOT NULL;

-- payment
CREATE TABLE
  payment_services (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    code varchar(32) NOT NULL,
    cover_id uuid REFERENCES files (id),
    name varchar(255) NOT NULL,
    meta jsonb,
    deleted_at timestamptz
  );

CREATE TABLE
  payment_methods (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    code varchar(32) NOT NULL,
    name varchar(255) NOT NULL,
    service_id uuid REFERENCES payment_services (id) ON DELETE CASCADE NOT NULL,
    meta jsonb,
    deleted_at timestamptz
  );

-- shipping
CREATE TABLE
  shipping_services (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    code varchar(32) NOT NULL,
    cover_id uuid REFERENCES files (id),
    name varchar(255) NOT NULL,
    meta jsonb,
    deleted_at timestamptz
  );

CREATE TABLE
  shipping_methods (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    code varchar(32) NOT NULL,
    name varchar(255) NOT NULL,
    service_id uuid REFERENCES shipping_services (id) ON DELETE CASCADE NOT NULL,
    meta jsonb,
    deleted_at timestamptz
  );

CREATE UNIQUE INDEX idx_payment_services_code ON payment_services (project_id, code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_payment_methods_code ON payment_methods (project_id, code) WHERE deleted_at IS NULL;

CREATE INDEX payment_methods_service_id_idx ON payment_methods (service_id);
CREATE INDEX shipping_methods_service_id_idx ON shipping_methods (service_id);

-- soft delete helper indexes
CREATE INDEX idx_payment_services_deleted_at ON payment_services (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_payment_methods_deleted_at ON payment_methods (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_shipping_services_deleted_at ON shipping_services (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_shipping_methods_deleted_at ON shipping_methods (deleted_at) WHERE deleted_at IS NOT NULL;

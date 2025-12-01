-- Warehouses
CREATE TABLE
  warehouses (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY,
    code varchar(32) NOT NULL,
    name text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, code)
  );

-- Ensure only one default warehouse per project
CREATE UNIQUE INDEX idx_warehouses_default_unique
  ON warehouses (project_id)
  WHERE is_default = true;

-- Composite uniqueness for references (project_id, id)
CREATE UNIQUE INDEX idx_warehouses_project_id_id_unique ON warehouses (project_id, id);

-- Stock levels by warehouse
CREATE TABLE
  warehouse_stock (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY,
    warehouse_id uuid NOT NULL,
    variant_id uuid NOT NULL REFERENCES variant (id) ON DELETE CASCADE,
    quantity_on_hand int NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (quantity_on_hand >= 0),
    UNIQUE (project_id, warehouse_id, variant_id)
  );

-- Index for fast variant lookup
CREATE INDEX idx_warehouse_stock_variant ON warehouse_stock (project_id, variant_id);

-- Foreign key to warehouse with cross-project reference protection
ALTER TABLE warehouse_stock
  ADD CONSTRAINT warehouse_stock_warehouse_fk
  FOREIGN KEY (project_id, warehouse_id)
  REFERENCES warehouses (project_id, id)
  ON DELETE CASCADE;

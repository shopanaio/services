-- Складская схема: минимальный набор для интеграций по SKU

-- Склады
CREATE TABLE
  warehouses (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    code varchar(32) NOT NULL,
    name text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, code)
  );

-- Гарантируем один склад по умолчанию на проект
CREATE UNIQUE INDEX idx_warehouses_default_unique
  ON warehouses (project_id)
  WHERE is_default = true;

-- Композитная уникальность для ссылок (project_id, id)
CREATE UNIQUE INDEX idx_warehouses_project_id_id_unique ON warehouses (project_id, id);

-- Остатки по складам по SKU (без привязки к variant_id)
CREATE TABLE
  warehouse_stock (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    warehouse_id uuid NOT NULL,
    -- SKU обязателен для интеграций с внешними системами
    sku varchar(64) NOT NULL,
    quantity_on_hand int NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (quantity_on_hand >= 0),
    UNIQUE (project_id, warehouse_id, sku)
  );

-- Индекс для быстрого поиска по SKU в рамках проекта
CREATE INDEX idx_warehouse_stock_project_sku ON warehouse_stock (project_id, sku);

-- Ссылка на склад с защитой от межпроектных ссылок
ALTER TABLE warehouse_stock
  ADD CONSTRAINT warehouse_stock_warehouse_fk
  FOREIGN KEY (project_id, warehouse_id)
  REFERENCES warehouses (project_id, id)
  ON DELETE CASCADE;

-- Сопоставления SKU с внешними системами (для CMS/ERP и т.п.)
CREATE TABLE
  inventory_sku_mappings (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    sku varchar(64) NOT NULL,
    external_system varchar(32) NOT NULL,
    external_id text NOT NULL,
    UNIQUE (project_id, external_system, external_id),
    UNIQUE (project_id, external_system, sku)
  );

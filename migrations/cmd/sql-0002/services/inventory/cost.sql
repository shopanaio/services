-- История себестоимости по вариантам товаров
-- Хранит интервалы действия себестоимости и актуальную стоимость на вариант

CREATE TABLE
  product_variant_cost_history (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    variant_id uuid REFERENCES variant (id) ON DELETE CASCADE NOT NULL,
    unit_cost_minor bigint NOT NULL CHECK (unit_cost_minor >= 0),
    effective_from timestamptz NOT NULL DEFAULT now(),
    effective_to timestamptz,
    recorded_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
      effective_to IS NULL
      OR effective_to > effective_from
    )
  );

-- Индексы для истории себестоимости
CREATE INDEX idx_product_variant_cost_history_variant_effective_from ON product_variant_cost_history (project_id, variant_id, effective_from);

CREATE INDEX idx_product_variant_cost_history_recorded_at ON product_variant_cost_history (project_id, recorded_at);

CREATE INDEX idx_product_variant_cost_history_effective_to ON product_variant_cost_history (project_id, effective_to);

-- Гарантия одной актуальной записи себестоимости на (project_id, variant_id)
CREATE UNIQUE INDEX idx_product_variant_cost_history_current_unique ON product_variant_cost_history (project_id, variant_id)
WHERE
  effective_to IS NULL;

-- Текущая себестоимость по (project_id, variant_id)
CREATE OR REPLACE VIEW
  variant_costs_current AS
SELECT DISTINCT ON (project_id, variant_id)
  project_id,
  variant_id,
  unit_cost_minor,
  effective_from,
  effective_to,
  recorded_at
FROM
  product_variant_cost_history
WHERE
  effective_to IS NULL
ORDER BY
  project_id,
  variant_id,
  effective_from DESC;

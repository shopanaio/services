-- История цен: интервальные записи в центах; связь по variant_id (UUID)
-- Индексы оптимизированы под выборки по времени и текущие цены
-- Таблица истории цен по вариантам товаров
CREATE TABLE
  item_pricing (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    -- Связь с вариантом товара
    variant_id uuid REFERENCES variant (id) ON DELETE CASCADE NOT NULL,
    -- Валюта ISO-4217 (3 буквы в верхнем регистре), например USD
    currency currency NOT NULL,
    -- Значения цен в минимальных денежных единицах (cents)
    amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
    compare_at_minor bigint CHECK (compare_at_minor >= 0),
    -- Интервал действия цены: [effective_from, effective_to)
    effective_from timestamptz NOT NULL DEFAULT now(),
    effective_to timestamptz,
    -- Момент фиксации записи (аудит)
    recorded_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
      effective_to IS NULL
      OR effective_to > effective_from
    )
  );

-- Индексы для быстрых выборок по варианту/валюте и времени начала
CREATE INDEX idx_item_pricing_variant_currency_effective_from ON item_pricing (project_id, variant_id, currency, effective_from);

CREATE INDEX idx_item_pricing_variant_effective_from ON item_pricing (project_id, variant_id, effective_from);

CREATE INDEX idx_item_pricing_recorded_at ON item_pricing (project_id, recorded_at);

CREATE INDEX idx_item_pricing_effective_to ON item_pricing (project_id, effective_to);

-- Гарантия одной актуальной записи на (project_id, variant_id, currency)
CREATE UNIQUE INDEX idx_item_pricing_current_unique ON item_pricing (project_id, variant_id, currency)
WHERE
  effective_to IS NULL;

-- Текущие цены (effective_to IS NULL) по каждой паре (project_id, variant_id, currency)
CREATE OR REPLACE VIEW
  variant_prices_current AS
SELECT DISTINCT
  ON (project_id, variant_id, currency) project_id,
  variant_id,
  currency,
  amount_minor,
  compare_at_minor,
  effective_from,
  effective_to,
  recorded_at
FROM
  item_pricing
WHERE
  effective_to IS NULL
ORDER BY
  project_id,
  variant_id,
  currency,
  effective_from DESC;

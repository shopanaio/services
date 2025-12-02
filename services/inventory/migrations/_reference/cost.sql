c -- Cost history for product variants
-- Stores cost validity intervals and current cost per variant
CREATE TABLE
  product_variant_cost_history (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY,
    variant_id uuid REFERENCES variant (id) ON DELETE CASCADE NOT NULL,
    -- ISO-4217 currency code (3 uppercase letters), e.g. USD
    currency currency NOT NULL,
    unit_cost_minor bigint NOT NULL CHECK (unit_cost_minor >= 0),
    effective_from timestamptz NOT NULL DEFAULT now(),
    effective_to timestamptz,
    recorded_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
      effective_to IS NULL
      OR effective_to > effective_from
    )
  );

-- Indexes for cost history
CREATE INDEX idx_product_variant_cost_history_variant_currency_effective_from ON product_variant_cost_history (project_id, variant_id, currency, effective_from);

CREATE INDEX idx_product_variant_cost_history_variant_effective_from ON product_variant_cost_history (project_id, variant_id, effective_from);

CREATE INDEX idx_product_variant_cost_history_recorded_at ON product_variant_cost_history (project_id, recorded_at);

CREATE INDEX idx_product_variant_cost_history_effective_to ON product_variant_cost_history (project_id, effective_to);

-- Ensure only one current cost record per (project_id, variant_id, currency)
CREATE UNIQUE INDEX idx_product_variant_cost_history_current_unique ON product_variant_cost_history (project_id, variant_id, currency)
WHERE
  effective_to IS NULL;

-- Current cost per (project_id, variant_id, currency)
-- Uniqueness guaranteed by partial unique index idx_product_variant_cost_history_current_unique
CREATE OR REPLACE VIEW
  variant_costs_current AS
SELECT
  id,
  project_id,
  variant_id,
  currency,
  unit_cost_minor,
  effective_from,
  effective_to,
  recorded_at
FROM
  product_variant_cost_history
WHERE
  effective_to IS NULL;

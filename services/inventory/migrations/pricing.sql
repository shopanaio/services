-- Price history: interval records in cents; linked by variant_id (UUID)
-- Indexes optimized for time-based queries and current prices
-- Price history table for product variants
CREATE TABLE
  item_pricing (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    -- Link to product variant
    variant_id uuid REFERENCES variant (id) ON DELETE CASCADE NOT NULL,
    -- ISO-4217 currency code (3 uppercase letters), e.g. USD
    currency currency NOT NULL,
    -- Price values in minor currency units (cents)
    amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
    compare_at_minor bigint CHECK (compare_at_minor >= 0),
    -- Price validity interval: [effective_from, effective_to)
    effective_from timestamptz NOT NULL DEFAULT now(),
    effective_to timestamptz,
    -- Record timestamp (audit)
    recorded_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
      effective_to IS NULL
      OR effective_to > effective_from
    )
  );

-- Indexes for fast lookups by variant/currency and effective date
CREATE INDEX idx_item_pricing_variant_currency_effective_from ON item_pricing (project_id, variant_id, currency, effective_from);

CREATE INDEX idx_item_pricing_variant_effective_from ON item_pricing (project_id, variant_id, effective_from);

CREATE INDEX idx_item_pricing_recorded_at ON item_pricing (project_id, recorded_at);

CREATE INDEX idx_item_pricing_effective_to ON item_pricing (project_id, effective_to);

-- Ensure only one current record per (project_id, variant_id, currency)
CREATE UNIQUE INDEX idx_item_pricing_current_unique ON item_pricing (project_id, variant_id, currency)
WHERE
  effective_to IS NULL;

-- Current prices (effective_to IS NULL) for each (project_id, variant_id, currency)
-- Uniqueness guaranteed by partial unique index idx_item_pricing_current_unique
CREATE OR REPLACE VIEW
  variant_prices_current AS
SELECT
  id,
  project_id,
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
  effective_to IS NULL;

-- Риск/фрод
CREATE TABLE IF NOT EXISTS
  order_risk (
    order_id uuid PRIMARY KEY REFERENCES orders (id) ON DELETE CASCADE,
    risk_score numeric(6, 3),
    risk_flags text[],
    review_hold boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  );

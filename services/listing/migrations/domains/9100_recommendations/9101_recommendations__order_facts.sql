CREATE TABLE listing.recommendation_order_fact (
  order_id uuid NOT NULL,
  store_id uuid NOT NULL,
  state varchar(16) NOT NULL,
  order_revision integer NOT NULL,
  committed_at timestamptz NOT NULL,
  reversed_at timestamptz,
  last_event_id uuid NOT NULL,
  last_event_at timestamptz NOT NULL,
  payload_hash varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (order_id),
  CONSTRAINT recommendation_order_fact_last_event_unique
    UNIQUE (last_event_id),
  CONSTRAINT recommendation_order_fact_store_order_unique
    UNIQUE (store_id, order_id),
  CONSTRAINT chk_recommendation_order_fact_uuid_v7
    CHECK (
      substring(order_id::text FROM 15 FOR 1) = '7'
      AND substring(store_id::text FROM 15 FOR 1) = '7'
      AND substring(last_event_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_recommendation_order_fact_state
    CHECK (state IN ('COMMITTED', 'REVERSED')),
  CONSTRAINT chk_recommendation_order_fact_revision
    CHECK (order_revision > 0),
  CONSTRAINT chk_recommendation_order_fact_timestamps
    CHECK (
      last_event_at >= committed_at
      AND (
        (state = 'COMMITTED' AND reversed_at IS NULL)
        OR (
          state = 'REVERSED'
          AND reversed_at IS NOT NULL
          AND reversed_at >= committed_at
        )
      )
    ),
  CONSTRAINT chk_recommendation_order_fact_payload_hash
    CHECK (payload_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX recommendation_order_fact_committed_window_idx
  ON listing.recommendation_order_fact (store_id, committed_at, order_id)
  WHERE state = 'COMMITTED';

CREATE INDEX recommendation_order_fact_updated_idx
  ON listing.recommendation_order_fact (store_id, updated_at, order_id);

CREATE TABLE listing.recommendation_order_product_fact (
  order_product_fact_id uuid NOT NULL,
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (order_product_fact_id),
  CONSTRAINT recommendation_order_product_fact_order_product_unique
    UNIQUE (order_id, product_id),
  CONSTRAINT fk_recommendation_order_product_fact_order
    FOREIGN KEY (order_id)
    REFERENCES listing.recommendation_order_fact(order_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_recommendation_order_product_fact_uuid_v7
    CHECK (
      substring(order_product_fact_id::text FROM 15 FOR 1) = '7'
      AND substring(order_id::text FROM 15 FOR 1) = '7'
      AND substring(product_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_recommendation_order_product_fact_quantity
    CHECK (quantity > 0)
);

CREATE INDEX recommendation_order_product_fact_product_reverse_idx
  ON listing.recommendation_order_product_fact (product_id, order_id);

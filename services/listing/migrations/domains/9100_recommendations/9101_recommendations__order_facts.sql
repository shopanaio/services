CREATE TABLE listing.recommendation_ingestion_cursor (
  cursor_id uuid NOT NULL,
  store_id uuid NOT NULL,
  last_position bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (cursor_id),
  CONSTRAINT recommendation_ingestion_cursor_store_unique
    UNIQUE (store_id),
  CONSTRAINT chk_recommendation_ingestion_cursor_uuid_v7
    CHECK (
      substring(cursor_id::text FROM 15 FOR 1) = '7'
      AND substring(store_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_recommendation_ingestion_cursor_position
    CHECK (last_position >= 0)
);

CREATE TABLE listing.recommendation_order_fact (
  order_fact_id uuid NOT NULL,
  event_id uuid NOT NULL,
  ingestion_position bigint NOT NULL,
  store_id uuid NOT NULL,
  order_id uuid NOT NULL,
  state varchar(16) NOT NULL,
  order_revision integer NOT NULL,
  committed_at timestamptz NOT NULL,
  occurred_at timestamptz NOT NULL,
  payload_hash varchar(64) NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (order_fact_id),
  CONSTRAINT recommendation_order_fact_event_unique
    UNIQUE (event_id),
  CONSTRAINT recommendation_order_fact_ingestion_position_unique
    UNIQUE (store_id, ingestion_position),
  CONSTRAINT recommendation_order_fact_order_revision_unique
    UNIQUE (order_id, order_revision),
  CONSTRAINT chk_recommendation_order_fact_uuid_v7
    CHECK (
      substring(order_fact_id::text FROM 15 FOR 1) = '7'
      AND substring(event_id::text FROM 15 FOR 1) = '7'
      AND substring(store_id::text FROM 15 FOR 1) = '7'
      AND substring(order_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_recommendation_order_fact_state
    CHECK (state IN ('COMMITTED', 'REVERSED')),
  CONSTRAINT chk_recommendation_order_fact_revision
    CHECK (order_revision > 0),
  CONSTRAINT chk_recommendation_order_fact_ingestion_position
    CHECK (ingestion_position > 0),
  CONSTRAINT chk_recommendation_order_fact_timestamps
    CHECK (occurred_at >= committed_at),
  CONSTRAINT chk_recommendation_order_fact_payload_hash
    CHECK (payload_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX recommendation_order_fact_calculation_scan_idx
  ON listing.recommendation_order_fact (
    store_id,
    ingestion_position,
    order_id,
    order_revision DESC
  );

CREATE INDEX recommendation_order_fact_order_timeline_idx
  ON listing.recommendation_order_fact (
    order_id,
    order_revision DESC,
    ingestion_position DESC
  );

CREATE INDEX recommendation_order_fact_committed_window_idx
  ON listing.recommendation_order_fact (
    store_id,
    committed_at,
    ingestion_position,
    order_id
  )
  WHERE state = 'COMMITTED';

CREATE TABLE listing.recommendation_order_product_fact (
  order_product_fact_id uuid NOT NULL,
  order_fact_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (order_product_fact_id),
  CONSTRAINT recommendation_order_product_fact_order_product_unique
    UNIQUE (order_fact_id, product_id),
  CONSTRAINT fk_recommendation_order_product_fact_order
    FOREIGN KEY (order_fact_id)
    REFERENCES listing.recommendation_order_fact(order_fact_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_recommendation_order_product_fact_uuid_v7
    CHECK (
      substring(order_product_fact_id::text FROM 15 FOR 1) = '7'
      AND substring(order_fact_id::text FROM 15 FOR 1) = '7'
      AND substring(product_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_recommendation_order_product_fact_quantity
    CHECK (quantity > 0)
);

CREATE INDEX recommendation_order_product_fact_product_reverse_idx
  ON listing.recommendation_order_product_fact (product_id, order_fact_id);

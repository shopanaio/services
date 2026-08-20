ALTER TABLE listing.recommendation_calculation_run
  ADD COLUMN materialization_phase varchar(16) NOT NULL DEFAULT 'ACCUMULATE',
  ADD COLUMN order_progress_after uuid,
  ADD COLUMN order_count bigint NOT NULL DEFAULT 0,
  ADD COLUMN product_progress_after uuid,
  ADD COLUMN pair_progress_anchor_after uuid,
  ADD COLUMN pair_progress_target_after uuid,
  ADD CONSTRAINT chk_recommendation_calculation_run_materialization_phase
    CHECK (materialization_phase IN ('ACCUMULATE', 'PRODUCTS', 'PAIRS', 'COMPLETE')),
  ADD CONSTRAINT chk_recommendation_calculation_run_order_count
    CHECK (order_count >= 0),
  ADD CONSTRAINT chk_recommendation_calculation_run_progress_uuid_v7
    CHECK (
      (order_progress_after IS NULL OR substring(order_progress_after::text FROM 15 FOR 1) = '7')
      AND (product_progress_after IS NULL OR substring(product_progress_after::text FROM 15 FOR 1) = '7')
      AND (pair_progress_anchor_after IS NULL OR substring(pair_progress_anchor_after::text FROM 15 FOR 1) = '7')
      AND (pair_progress_target_after IS NULL OR substring(pair_progress_target_after::text FROM 15 FOR 1) = '7')
    ),
  ADD CONSTRAINT chk_recommendation_calculation_run_pair_progress
    CHECK ((pair_progress_anchor_after IS NULL) = (pair_progress_target_after IS NULL));

CREATE INDEX recommendation_order_fact_effective_order_scan_idx
  ON listing.recommendation_order_fact (
    store_id,
    order_id,
    order_revision DESC,
    ingestion_position DESC
  );

ALTER TABLE listing.recommendation_snapshot
  ALTER COLUMN policy_id SET NOT NULL,
  ADD COLUMN content_hash varchar(64),
  ADD CONSTRAINT chk_recommendation_snapshot_content_hash
    CHECK (content_hash IS NULL OR content_hash ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT chk_recommendation_snapshot_ready_content_hash
    CHECK (
      status NOT IN ('READY', 'ACTIVE', 'SUPERSEDED')
      OR content_hash IS NOT NULL
    );

CREATE TABLE listing.recommendation_product_accumulator (
  run_id uuid NOT NULL,
  product_id uuid NOT NULL,
  orders_count bigint NOT NULL,
  quantity bigint NOT NULL,
  last_purchased_at timestamptz NOT NULL,
  PRIMARY KEY (run_id, product_id),
  FOREIGN KEY (run_id)
    REFERENCES listing.recommendation_calculation_run(run_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_recommendation_product_accumulator_uuid_v7
    CHECK (
      substring(run_id::text FROM 15 FOR 1) = '7'
      AND substring(product_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_recommendation_product_accumulator_counts
    CHECK (orders_count > 0 AND quantity > 0)
);

CREATE TABLE listing.recommendation_pair_accumulator (
  run_id uuid NOT NULL,
  anchor_product_id uuid NOT NULL,
  target_product_id uuid NOT NULL,
  orders_together bigint NOT NULL,
  last_purchased_together_at timestamptz NOT NULL,
  PRIMARY KEY (run_id, anchor_product_id, target_product_id),
  FOREIGN KEY (run_id)
    REFERENCES listing.recommendation_calculation_run(run_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_recommendation_pair_accumulator_uuid_v7
    CHECK (
      substring(run_id::text FROM 15 FOR 1) = '7'
      AND substring(anchor_product_id::text FROM 15 FOR 1) = '7'
      AND substring(target_product_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_recommendation_pair_accumulator_not_self
    CHECK (anchor_product_id <> target_product_id),
  CONSTRAINT chk_recommendation_pair_accumulator_count
    CHECK (orders_together > 0)
);

CREATE TABLE listing.recommendation_maintenance_cursor (
  cursor_id uuid PRIMARY KEY,
  store_id uuid NOT NULL UNIQUE,
  status varchar(16) NOT NULL DEFAULT 'BOOTSTRAPPING',
  bootstrap_cutoff_at timestamptz NOT NULL,
  last_manual_boundary_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_recommendation_maintenance_cursor_uuid_v7
    CHECK (
      substring(cursor_id::text FROM 15 FOR 1) = '7'
      AND substring(store_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_recommendation_maintenance_cursor_status
    CHECK (status IN ('BOOTSTRAPPING', 'ACTIVE')),
  CONSTRAINT chk_recommendation_maintenance_cursor_boundary
    CHECK (
      (status = 'BOOTSTRAPPING' AND last_manual_boundary_at IS NULL)
      OR (
        status = 'ACTIVE'
        AND last_manual_boundary_at IS NOT NULL
        AND last_manual_boundary_at >= bootstrap_cutoff_at
        AND last_manual_boundary_at <= updated_at
      )
    )
);

CREATE INDEX recommendation_maintenance_cursor_store_lookup_idx
  ON listing.recommendation_maintenance_cursor (store_id, status, cursor_id);

CREATE TABLE listing.recommendation_build_request (
  request_id uuid PRIMARY KEY,
  store_id uuid NOT NULL,
  anchor_product_id uuid NOT NULL,
  placement varchar(48) NOT NULL,
  generation bigint NOT NULL,
  trigger_key varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, anchor_product_id, placement),
  CONSTRAINT chk_recommendation_build_request_uuid_v7
    CHECK (
      substring(request_id::text FROM 15 FOR 1) = '7'
      AND substring(store_id::text FROM 15 FOR 1) = '7'
      AND substring(anchor_product_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_recommendation_build_request_placement
    CHECK (placement IN ('PRODUCT_RELATED', 'FREQUENTLY_BOUGHT_TOGETHER')),
  CONSTRAINT chk_recommendation_build_request_generation
    CHECK (generation > 0),
  CONSTRAINT chk_recommendation_build_request_trigger_key
    CHECK (trigger_key <> '')
);

CREATE INDEX recommendation_build_request_store_lookup_idx
  ON listing.recommendation_build_request (
    store_id,
    placement,
    anchor_product_id
  );

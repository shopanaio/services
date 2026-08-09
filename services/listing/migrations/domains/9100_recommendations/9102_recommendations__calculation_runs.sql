CREATE TABLE listing.recommendation_calculation_run (
  run_id uuid NOT NULL,
  store_id uuid NOT NULL,
  calculation_type varchar(32) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'BUILDING',
  algorithm_version varchar(64) NOT NULL,
  window_started_at timestamptz NOT NULL,
  window_ended_at timestamptz NOT NULL,
  source_ingestion_watermark bigint NOT NULL,
  source_event_time_watermark timestamptz,
  idempotency_key varchar(255) NOT NULL,
  product_count integer NOT NULL DEFAULT 0,
  pair_count bigint NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  activated_at timestamptz,
  statistics_purged_at timestamptz,
  failure_code varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (run_id),
  CONSTRAINT recommendation_calculation_run_idempotency_unique
    UNIQUE (store_id, calculation_type, idempotency_key),
  CONSTRAINT chk_recommendation_calculation_run_uuid_v7
    CHECK (
      substring(run_id::text FROM 15 FOR 1) = '7'
      AND substring(store_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_recommendation_calculation_run_type
    CHECK (calculation_type IN ('FREQUENTLY_BOUGHT_TOGETHER')),
  CONSTRAINT chk_recommendation_calculation_run_status
    CHECK (status IN ('BUILDING', 'READY', 'ACTIVE', 'SUPERSEDED', 'FAILED')),
  CONSTRAINT chk_recommendation_calculation_run_algorithm_version
    CHECK (algorithm_version <> ''),
  CONSTRAINT chk_recommendation_calculation_run_window
    CHECK (window_started_at < window_ended_at),
  CONSTRAINT chk_recommendation_calculation_run_ingestion_watermark
    CHECK (source_ingestion_watermark >= 0),
  CONSTRAINT chk_recommendation_calculation_run_idempotency_key
    CHECK (idempotency_key <> ''),
  CONSTRAINT chk_recommendation_calculation_run_counts
    CHECK (product_count >= 0 AND pair_count >= 0),
  CONSTRAINT chk_recommendation_calculation_run_lifecycle
    CHECK (
      (status = 'BUILDING' AND completed_at IS NULL AND activated_at IS NULL AND failure_code IS NULL)
      OR (status = 'READY' AND completed_at IS NOT NULL AND activated_at IS NULL AND failure_code IS NULL)
      OR (status = 'ACTIVE' AND completed_at IS NOT NULL AND activated_at IS NOT NULL AND failure_code IS NULL)
      OR (status = 'SUPERSEDED' AND completed_at IS NOT NULL AND activated_at IS NOT NULL AND failure_code IS NULL)
      OR (status = 'FAILED' AND completed_at IS NOT NULL AND activated_at IS NULL AND failure_code IS NOT NULL)
    ),
  CONSTRAINT chk_recommendation_calculation_run_failure_code
    CHECK (failure_code IS NULL OR failure_code <> ''),
  CONSTRAINT chk_recommendation_calculation_run_statistics_retention
    CHECK (
      statistics_purged_at IS NULL
      OR status IN ('SUPERSEDED', 'FAILED')
    )
);

CREATE UNIQUE INDEX recommendation_calculation_run_one_active_idx
  ON listing.recommendation_calculation_run (store_id, calculation_type)
  WHERE status = 'ACTIVE';

CREATE INDEX recommendation_calculation_run_history_idx
  ON listing.recommendation_calculation_run (
    store_id,
    calculation_type,
    started_at DESC,
    run_id DESC
  );

CREATE TABLE listing.recommendation_product_stat (
  product_stat_id uuid NOT NULL,
  run_id uuid NOT NULL,
  product_id uuid NOT NULL,
  orders_count bigint NOT NULL,
  quantity bigint NOT NULL,
  last_purchased_at timestamptz NOT NULL,

  PRIMARY KEY (product_stat_id),
  CONSTRAINT recommendation_product_stat_run_product_unique
    UNIQUE (run_id, product_id),
  CONSTRAINT fk_recommendation_product_stat_run
    FOREIGN KEY (run_id)
    REFERENCES listing.recommendation_calculation_run(run_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_recommendation_product_stat_uuid_v7
    CHECK (
      substring(product_stat_id::text FROM 15 FOR 1) = '7'
      AND substring(run_id::text FROM 15 FOR 1) = '7'
      AND substring(product_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_recommendation_product_stat_counts
    CHECK (orders_count > 0 AND quantity > 0)
);

CREATE INDEX recommendation_product_stat_product_reverse_idx
  ON listing.recommendation_product_stat (product_id, run_id);

CREATE TABLE listing.recommendation_product_pair_stat (
  pair_stat_id uuid NOT NULL,
  run_id uuid NOT NULL,
  anchor_product_id uuid NOT NULL,
  target_product_id uuid NOT NULL,
  orders_together bigint NOT NULL,
  anchor_orders bigint NOT NULL,
  target_orders bigint NOT NULL,
  store_orders bigint NOT NULL,
  support numeric(20, 10) NOT NULL,
  confidence numeric(20, 10) NOT NULL,
  lift numeric(20, 10) NOT NULL,
  recency_score numeric(20, 10) NOT NULL,
  source_score numeric(20, 10) NOT NULL,

  PRIMARY KEY (pair_stat_id),
  CONSTRAINT recommendation_product_pair_stat_run_pair_unique
    UNIQUE (run_id, anchor_product_id, target_product_id),
  CONSTRAINT fk_recommendation_product_pair_stat_run
    FOREIGN KEY (run_id)
    REFERENCES listing.recommendation_calculation_run(run_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_recommendation_product_pair_stat_uuid_v7
    CHECK (
      substring(pair_stat_id::text FROM 15 FOR 1) = '7'
      AND substring(run_id::text FROM 15 FOR 1) = '7'
      AND substring(anchor_product_id::text FROM 15 FOR 1) = '7'
      AND substring(target_product_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_recommendation_product_pair_stat_not_self
    CHECK (anchor_product_id <> target_product_id),
  CONSTRAINT chk_recommendation_product_pair_stat_counts
    CHECK (
      orders_together > 0
      AND anchor_orders >= orders_together
      AND target_orders >= orders_together
      AND store_orders >= anchor_orders
      AND store_orders >= target_orders
    ),
  CONSTRAINT chk_recommendation_product_pair_stat_support
    CHECK (support >= 0 AND support <= 1),
  CONSTRAINT chk_recommendation_product_pair_stat_confidence
    CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT chk_recommendation_product_pair_stat_lift
    CHECK (lift >= 0),
  CONSTRAINT chk_recommendation_product_pair_stat_recency_score
    CHECK (recency_score >= 0 AND recency_score <= 1),
  CONSTRAINT chk_recommendation_product_pair_stat_source_score
    CHECK (source_score >= 0)
);

CREATE INDEX recommendation_product_pair_stat_anchor_rank_idx
  ON listing.recommendation_product_pair_stat (
    run_id,
    anchor_product_id,
    source_score DESC,
    target_product_id
  );

CREATE INDEX recommendation_product_pair_stat_target_reverse_idx
  ON listing.recommendation_product_pair_stat (
    target_product_id,
    run_id,
    anchor_product_id
  );

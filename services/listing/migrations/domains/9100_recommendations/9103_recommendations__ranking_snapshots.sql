CREATE TABLE listing.recommendation_snapshot (
  snapshot_id uuid NOT NULL,
  store_id uuid NOT NULL,
  anchor_product_id uuid NOT NULL,
  placement varchar(48) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'BUILDING',
  strategy varchar(32) NOT NULL,
  policy_id uuid,
  calculation_run_id uuid,
  ranker_type varchar(16) NOT NULL,
  model_version varchar(64) NOT NULL,
  build_key varchar(255) NOT NULL,
  source_watermarks jsonb NOT NULL DEFAULT '{}'::jsonb,
  item_count smallint NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  expires_at timestamptz,
  failure_code varchar(64),

  PRIMARY KEY (snapshot_id),
  CONSTRAINT recommendation_snapshot_build_key_unique
    UNIQUE (store_id, anchor_product_id, placement, build_key),
  CONSTRAINT fk_recommendation_snapshot_policy
    FOREIGN KEY (policy_id)
    REFERENCES listing.recommendation_placement_policy(policy_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_recommendation_snapshot_calculation_run
    FOREIGN KEY (calculation_run_id)
    REFERENCES listing.recommendation_calculation_run(run_id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_recommendation_snapshot_uuid_v7
    CHECK (
      substring(snapshot_id::text FROM 15 FOR 1) = '7'
      AND substring(store_id::text FROM 15 FOR 1) = '7'
      AND substring(anchor_product_id::text FROM 15 FOR 1) = '7'
      AND (policy_id IS NULL OR substring(policy_id::text FROM 15 FOR 1) = '7')
      AND (
        calculation_run_id IS NULL
        OR substring(calculation_run_id::text FROM 15 FOR 1) = '7'
      )
    ),
  CONSTRAINT chk_recommendation_snapshot_placement
    CHECK (
      placement IN (
        'PRODUCT_RELATED',
        'FREQUENTLY_BOUGHT_TOGETHER',
        'CART_CROSS_SELL',
        'CHECKOUT_UPSELL',
        'HOME_PERSONALIZED',
        'SEARCH_RERANK'
      )
    ),
  CONSTRAINT chk_recommendation_snapshot_status
    CHECK (status IN ('BUILDING', 'READY', 'ACTIVE', 'SUPERSEDED', 'FAILED')),
  CONSTRAINT chk_recommendation_snapshot_strategy
    CHECK (
      strategy IN (
        'CURATED_ONLY',
        'CURATED_FIRST',
        'BLENDED',
        'AUTOMATED_ONLY'
      )
    ),
  CONSTRAINT chk_recommendation_snapshot_ranker_type
    CHECK (ranker_type IN ('RULES', 'ML')),
  CONSTRAINT chk_recommendation_snapshot_model_version
    CHECK (model_version <> ''),
  CONSTRAINT chk_recommendation_snapshot_build_key
    CHECK (build_key <> ''),
  CONSTRAINT chk_recommendation_snapshot_source_watermarks
    CHECK (jsonb_typeof(source_watermarks) = 'object'),
  CONSTRAINT chk_recommendation_snapshot_item_count
    CHECK (item_count BETWEEN 0 AND 100),
  CONSTRAINT chk_recommendation_snapshot_expiry
    CHECK (expires_at IS NULL OR expires_at > generated_at),
  CONSTRAINT chk_recommendation_snapshot_lifecycle
    CHECK (
      (status IN ('BUILDING', 'READY') AND activated_at IS NULL AND failure_code IS NULL)
      OR (status IN ('ACTIVE', 'SUPERSEDED') AND activated_at IS NOT NULL AND failure_code IS NULL)
      OR (status = 'FAILED' AND activated_at IS NULL AND failure_code IS NOT NULL)
    ),
  CONSTRAINT chk_recommendation_snapshot_failure_code
    CHECK (failure_code IS NULL OR failure_code <> '')
);

CREATE UNIQUE INDEX recommendation_snapshot_one_active_idx
  ON listing.recommendation_snapshot (store_id, anchor_product_id, placement)
  WHERE status = 'ACTIVE';

CREATE INDEX recommendation_snapshot_history_idx
  ON listing.recommendation_snapshot (
    store_id,
    anchor_product_id,
    placement,
    generated_at DESC,
    snapshot_id DESC
  );

CREATE INDEX recommendation_snapshot_expiry_idx
  ON listing.recommendation_snapshot (expires_at, snapshot_id)
  WHERE status = 'ACTIVE' AND expires_at IS NOT NULL;

CREATE TABLE listing.recommendation_snapshot_item (
  snapshot_item_id uuid NOT NULL,
  snapshot_id uuid NOT NULL,
  target_product_id uuid NOT NULL,
  rank smallint NOT NULL,
  score numeric(20, 10) NOT NULL,
  primary_source varchar(32) NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (snapshot_item_id),
  CONSTRAINT recommendation_snapshot_item_rank_unique
    UNIQUE (snapshot_id, rank),
  CONSTRAINT recommendation_snapshot_item_product_unique
    UNIQUE (snapshot_id, target_product_id),
  CONSTRAINT fk_recommendation_snapshot_item_snapshot
    FOREIGN KEY (snapshot_id)
    REFERENCES listing.recommendation_snapshot(snapshot_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_recommendation_snapshot_item_uuid_v7
    CHECK (
      substring(snapshot_item_id::text FROM 15 FOR 1) = '7'
      AND substring(snapshot_id::text FROM 15 FOR 1) = '7'
      AND substring(target_product_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_recommendation_snapshot_item_rank
    CHECK (rank BETWEEN 1 AND 100),
  CONSTRAINT chk_recommendation_snapshot_item_score
    CHECK (score >= 0),
  CONSTRAINT chk_recommendation_snapshot_item_primary_source
    CHECK (
      primary_source IN (
        'MANUAL',
        'FREQUENTLY_BOUGHT_TOGETHER',
        'CONTENT_SIMILARITY',
        'POPULARITY',
        'FALLBACK'
      )
    ),
  CONSTRAINT chk_recommendation_snapshot_item_features
    CHECK (jsonb_typeof(features) = 'object'),
  CONSTRAINT chk_recommendation_snapshot_item_source_breakdown
    CHECK (jsonb_typeof(source_breakdown) = 'object')
);

CREATE INDEX recommendation_snapshot_item_rank_lookup_idx
  ON listing.recommendation_snapshot_item (snapshot_id, rank, target_product_id);

CREATE INDEX recommendation_snapshot_item_target_reverse_idx
  ON listing.recommendation_snapshot_item (target_product_id, snapshot_id);

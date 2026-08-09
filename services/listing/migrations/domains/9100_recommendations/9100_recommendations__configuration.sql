CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE listing.recommendation_placement_policy (
  policy_id uuid NOT NULL,
  store_id uuid NOT NULL,
  placement varchar(48) NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  strategy varchar(32) NOT NULL DEFAULT 'CURATED_FIRST',
  minimum_results smallint NOT NULL DEFAULT 0,
  maximum_results smallint NOT NULL DEFAULT 12,
  fallback_chain jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (policy_id),
  CONSTRAINT recommendation_placement_policy_store_placement_unique
    UNIQUE (store_id, placement),
  CONSTRAINT chk_recommendation_placement_policy_uuid_v7
    CHECK (
      substring(policy_id::text FROM 15 FOR 1) = '7'
      AND substring(store_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_recommendation_placement_policy_placement
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
  CONSTRAINT chk_recommendation_placement_policy_strategy
    CHECK (
      strategy IN (
        'CURATED_ONLY',
        'CURATED_FIRST',
        'BLENDED',
        'AUTOMATED_ONLY'
      )
    ),
  CONSTRAINT chk_recommendation_placement_policy_result_limits
    CHECK (
      minimum_results BETWEEN 0 AND 100
      AND maximum_results BETWEEN 1 AND 100
      AND minimum_results <= maximum_results
    ),
  CONSTRAINT chk_recommendation_placement_policy_fallback_chain
    CHECK (jsonb_typeof(fallback_chain) = 'array'),
  CONSTRAINT chk_recommendation_placement_policy_version
    CHECK (version > 0)
);

CREATE INDEX recommendation_placement_policy_enabled_idx
  ON listing.recommendation_placement_policy (store_id, placement, policy_id)
  WHERE enabled = true;

CREATE TABLE listing.manual_product_recommendation (
  recommendation_id uuid NOT NULL,
  store_id uuid NOT NULL,
  anchor_product_id uuid NOT NULL,
  target_product_id uuid NOT NULL,
  placement varchar(48) NOT NULL DEFAULT 'PRODUCT_RELATED',
  action varchar(16) NOT NULL DEFAULT 'PIN',
  position smallint,
  boost numeric(12, 6),
  enabled boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  anchor_reference_status varchar(16) NOT NULL DEFAULT 'VALID',
  target_reference_status varchar(16) NOT NULL DEFAULT 'VALID',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (recommendation_id),
  CONSTRAINT chk_manual_product_recommendation_uuid_v7
    CHECK (
      substring(recommendation_id::text FROM 15 FOR 1) = '7'
      AND substring(store_id::text FROM 15 FOR 1) = '7'
      AND substring(anchor_product_id::text FROM 15 FOR 1) = '7'
      AND substring(target_product_id::text FROM 15 FOR 1) = '7'
    ),
  CONSTRAINT chk_manual_product_recommendation_not_self
    CHECK (anchor_product_id <> target_product_id),
  CONSTRAINT chk_manual_product_recommendation_placement
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
  CONSTRAINT chk_manual_product_recommendation_action
    CHECK (action IN ('PIN', 'BOOST', 'EXCLUDE')),
  CONSTRAINT chk_manual_product_recommendation_action_values
    CHECK (
      (
        action = 'PIN'
        AND position BETWEEN 1 AND 100
        AND boost IS NULL
      )
      OR (
        action = 'BOOST'
        AND position IS NULL
        AND boost > 0
        AND boost <= 1000
      )
      OR (
        action = 'EXCLUDE'
        AND position IS NULL
        AND boost IS NULL
      )
    ),
  CONSTRAINT chk_manual_product_recommendation_schedule
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at),
  CONSTRAINT chk_manual_product_recommendation_anchor_reference_status
    CHECK (anchor_reference_status IN ('VALID', 'STALE')),
  CONSTRAINT chk_manual_product_recommendation_target_reference_status
    CHECK (target_reference_status IN ('VALID', 'STALE')),
  CONSTRAINT chk_manual_product_recommendation_version
    CHECK (version > 0),
  CONSTRAINT manual_product_recommendation_target_schedule_excl
    EXCLUDE USING gist (
      store_id WITH =,
      anchor_product_id WITH =,
      placement WITH =,
      target_product_id WITH =,
      (
        tstzrange(
          COALESCE(starts_at, '-infinity'::timestamptz),
          COALESCE(ends_at, 'infinity'::timestamptz),
          '[)'
        )
      ) WITH &&
    )
    WHERE (
      enabled = true
      AND anchor_reference_status = 'VALID'
      AND target_reference_status = 'VALID'
    ),
  CONSTRAINT manual_product_recommendation_pin_schedule_excl
    EXCLUDE USING gist (
      store_id WITH =,
      anchor_product_id WITH =,
      placement WITH =,
      position WITH =,
      (
        tstzrange(
          COALESCE(starts_at, '-infinity'::timestamptz),
          COALESCE(ends_at, 'infinity'::timestamptz),
          '[)'
        )
      ) WITH &&
    )
    WHERE (
      action = 'PIN'
      AND enabled = true
      AND anchor_reference_status = 'VALID'
      AND target_reference_status = 'VALID'
    )
);

CREATE INDEX manual_product_recommendation_active_lookup_idx
  ON listing.manual_product_recommendation (
    store_id,
    anchor_product_id,
    placement,
    action,
    position,
    target_product_id
  )
  WHERE enabled = true
    AND anchor_reference_status = 'VALID'
    AND target_reference_status = 'VALID';

CREATE INDEX manual_product_recommendation_target_reverse_idx
  ON listing.manual_product_recommendation (
    store_id,
    target_product_id,
    recommendation_id
  );

CREATE INDEX manual_product_recommendation_schedule_idx
  ON listing.manual_product_recommendation (
    store_id,
    starts_at,
    ends_at,
    recommendation_id
  )
  WHERE enabled = true;

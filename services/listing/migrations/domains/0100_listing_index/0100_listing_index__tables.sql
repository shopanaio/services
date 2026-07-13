CREATE EXTENSION IF NOT EXISTS roaringbitmap;

CREATE TABLE listing.listing_doc_id_allocator (
  store_id              uuid NOT NULL,
  next_product_doc_id     int NOT NULL DEFAULT 1,
  next_variant_doc_id     int NOT NULL DEFAULT 1,
  updated_at              timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (store_id),
  CONSTRAINT chk_listing_doc_id_allocator_product_positive
    CHECK (next_product_doc_id > 0),
  CONSTRAINT chk_listing_doc_id_allocator_variant_positive
    CHECK (next_variant_doc_id > 0)
);

CREATE TABLE listing.product_listing_index (
  store_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  product_doc_id         int NOT NULL,

  kind                   varchar(16) NOT NULL,
  vendor_id              uuid,
  handle                 varchar(255),
  status                 varchar(16) NOT NULL,
  published_at           timestamptz,
  product_created_at     timestamptz NOT NULL,
  product_updated_at     timestamptz NOT NULL,
  product_revision       int NOT NULL DEFAULT 0,

  total_stock            int NOT NULL DEFAULT 0,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (product_id),
  CONSTRAINT product_listing_store_doc_unique
    UNIQUE (store_id, product_doc_id),
  CONSTRAINT product_listing_store_product_unique
    UNIQUE (store_id, product_id),
  CONSTRAINT product_listing_store_doc_product_unique
    UNIQUE (store_id, product_doc_id, product_id),
  CONSTRAINT product_listing_doc_product_unique
    UNIQUE (product_doc_id, product_id),
  CONSTRAINT chk_product_listing_kind
    CHECK (kind IN ('BASE', 'BUNDLE')),
  CONSTRAINT chk_product_listing_status
    CHECK (status IN ('published', 'draft')),
  CONSTRAINT chk_product_listing_doc_positive
    CHECK (product_doc_id > 0),
  CONSTRAINT chk_product_listing_total_stock_nonnegative
    CHECK (total_stock >= 0)
);

CREATE INDEX idx_product_listing_store_product
  ON listing.product_listing_index (store_id, product_id);

CREATE INDEX idx_product_listing_store_doc
  ON listing.product_listing_index (store_id, product_doc_id);

CREATE INDEX idx_product_listing_published_doc
  ON listing.product_listing_index (store_id, product_doc_id)
  WHERE status = 'published';

CREATE INDEX idx_product_listing_vendor
  ON listing.product_listing_index (store_id, vendor_id)
  WHERE vendor_id IS NOT NULL;

CREATE TABLE listing.product_listing_price_index (
  store_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  currency               "listing"."currency_code" NOT NULL,

  min_price_minor        bigint,
  max_price_minor        bigint,
  has_price              boolean NOT NULL DEFAULT false,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (product_id, currency),
  CONSTRAINT fk_product_listing_price_product
    FOREIGN KEY (product_id)
    REFERENCES listing.product_listing_index(product_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_product_listing_price_store_product
    FOREIGN KEY (store_id, product_id)
    REFERENCES listing.product_listing_index(store_id, product_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_product_listing_price_state
    CHECK (
      (
        has_price = false
        AND min_price_minor IS NULL
        AND max_price_minor IS NULL
      )
      OR (
        has_price = true
        AND min_price_minor IS NOT NULL
        AND max_price_minor IS NOT NULL
        AND min_price_minor >= 0
        AND max_price_minor >= min_price_minor
      )
    )
);

CREATE INDEX idx_product_listing_price_visible_asc
  ON listing.product_listing_price_index (
    store_id,
    currency,
    min_price_minor ASC,
    product_id
  )
  WHERE has_price = true;

CREATE INDEX idx_product_listing_price_visible_desc
  ON listing.product_listing_price_index (
    store_id,
    currency,
    max_price_minor DESC,
    product_id
  )
  WHERE has_price = true;

CREATE TABLE listing.variant_listing_index (
  store_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  product_doc_id         int NOT NULL,
  variant_id             uuid NOT NULL,
  variant_doc_id         int NOT NULL,
  total_stock            int NOT NULL DEFAULT 0,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (variant_id),
  CONSTRAINT variant_listing_store_product_variant_unique
    UNIQUE (product_id, variant_id),
  CONSTRAINT variant_listing_store_variant_unique
    UNIQUE (store_id, variant_id),
  CONSTRAINT variant_listing_store_doc_unique
    UNIQUE (store_id, variant_doc_id),
  CONSTRAINT variant_listing_store_doc_variant_unique
    UNIQUE (store_id, variant_doc_id, product_doc_id, product_id),
  CONSTRAINT fk_variant_listing_product
    FOREIGN KEY (product_id)
    REFERENCES listing.product_listing_index(product_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_variant_listing_product_doc
    FOREIGN KEY (store_id, product_doc_id, product_id)
    REFERENCES listing.product_listing_index(
      store_id,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE,
  CONSTRAINT chk_variant_listing_doc_positive
    CHECK (variant_doc_id > 0),
  CONSTRAINT chk_variant_listing_product_doc_positive
    CHECK (product_doc_id > 0),
  CONSTRAINT chk_variant_listing_total_stock_nonnegative
    CHECK (total_stock >= 0)
);

CREATE INDEX idx_variant_listing_store_product
  ON listing.variant_listing_index (store_id, product_id);

CREATE INDEX idx_variant_listing_store_variant
  ON listing.variant_listing_index (store_id, variant_id);

CREATE INDEX idx_variant_listing_store_doc
  ON listing.variant_listing_index (store_id, variant_doc_id);

CREATE TABLE listing.listing_index_item_state (
  store_id                      uuid NOT NULL,
  item_id                         uuid NOT NULL,
  event_sequence                  integer NOT NULL,
  payload_hash                    text NOT NULL,
  lifecycle_status                varchar(32) NOT NULL,
  last_effective_idempotency_key  text NOT NULL,
  last_operation_id               text NOT NULL,
  updated_at                      timestamptz NOT NULL,

  PRIMARY KEY (store_id, item_id),
  CONSTRAINT chk_listing_index_item_state_event_sequence
    CHECK (event_sequence > 0),
  CONSTRAINT chk_listing_index_item_state_lifecycle_status
    CHECK (lifecycle_status IN ('indexed', 'deleted'))
);

CREATE TABLE listing.variant_listing_price_index (
  store_id             uuid NOT NULL,
  variant_id             uuid NOT NULL,
  currency               "listing"."currency_code" NOT NULL,
  variant_doc_id         int NOT NULL,
  product_doc_id         int NOT NULL,
  product_id             uuid NOT NULL,
  price_minor            bigint,
  has_price              boolean NOT NULL DEFAULT false,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (variant_id, currency),
  CONSTRAINT fk_variant_listing_price_variant
    FOREIGN KEY (variant_id)
    REFERENCES listing.variant_listing_index(variant_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_variant_listing_price_store_variant
    FOREIGN KEY (store_id, variant_id)
    REFERENCES listing.variant_listing_index(store_id, variant_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_variant_listing_price_state
    CHECK (
      (
        has_price = false
        AND price_minor IS NULL
      )
      OR (
        has_price = true
        AND price_minor IS NOT NULL
        AND price_minor >= 0
      )
    ),
  CONSTRAINT chk_variant_listing_price_variant_doc_positive
    CHECK (variant_doc_id > 0),
  CONSTRAINT chk_variant_listing_price_product_doc_positive
    CHECK (product_doc_id > 0)
);

CREATE INDEX idx_variant_listing_price_value
  ON listing.variant_listing_price_index (store_id, currency, price_minor)
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_variant
  ON listing.variant_listing_price_index (
    store_id,
    currency,
    variant_id,
    price_minor
  )
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_value_variant
  ON listing.variant_listing_price_index (
    store_id,
    currency,
    price_minor,
    variant_id
  )
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_range_covering
  ON listing.variant_listing_price_index (
    store_id,
    currency,
    price_minor,
    product_id,
    variant_doc_id,
    product_doc_id
  )
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_desc_covering
  ON listing.variant_listing_price_index (
    store_id,
    currency,
    price_minor DESC,
    product_id,
    variant_doc_id,
    product_doc_id
  )
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_product_order
  ON listing.variant_listing_price_index (
    store_id,
    currency,
    product_id,
    price_minor,
    variant_doc_id,
    product_doc_id
  )
  WHERE has_price = true;

CREATE TABLE listing.listing_posting_bitmap (
  store_id             uuid NOT NULL,
  entity_type            varchar(16) NOT NULL,
  field                  varchar(64) NOT NULL,
  value_key              text NOT NULL,
  bitmap                 roaringbitmap NOT NULL,
  cardinality            bigint NOT NULL,
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (store_id, entity_type, field, value_key),
  CONSTRAINT chk_listing_posting_bitmap_entity_type
    CHECK (entity_type IN ('product', 'variant')),
  CONSTRAINT chk_listing_posting_bitmap_no_collection_field
    CHECK (field <> 'collection'),
  CONSTRAINT chk_listing_posting_bitmap_entity_field
    CHECK (
      (entity_type = 'product' AND field IN ('category', 'vendor', 'facet'))
      OR
      (entity_type = 'variant' AND field IN ('term', 'variant_product'))
    )
);

CREATE TABLE listing.listing_posting_product_sort (
  store_id             uuid NOT NULL,
  product_doc_id         int NOT NULL,
  product_id             uuid NOT NULL,
  sort_kind              varchar(32) NOT NULL,
  locale                 "listing"."locale_code",
  currency               "listing"."currency_code",
  manual_scope_id        uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  bool_value             boolean,
  timestamptz_value      timestamptz,
  timestamptz_value_2    timestamptz,
  bigint_value           bigint,
  text_value             text,
  numeric_value          numeric,

  CONSTRAINT listing_posting_product_sort_key
  UNIQUE NULLS NOT DISTINCT (
    store_id,
    product_doc_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id
  ),
  CONSTRAINT fk_listing_posting_product_sort_doc
    FOREIGN KEY (store_id, product_doc_id, product_id)
    REFERENCES listing.product_listing_index(
      store_id,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE
);

CREATE INDEX idx_listing_posting_product_sort_newest
  ON listing.listing_posting_product_sort (
    store_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    bool_value DESC,
    timestamptz_value DESC NULLS LAST,
    timestamptz_value_2 DESC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE INDEX idx_listing_posting_product_sort_text
  ON listing.listing_posting_product_sort (
    store_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    bool_value DESC,
    text_value ASC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE INDEX idx_listing_posting_product_sort_bigint_asc
  ON listing.listing_posting_product_sort (
    store_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    bool_value DESC,
    bigint_value ASC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE INDEX idx_listing_posting_product_sort_bigint_desc
  ON listing.listing_posting_product_sort (
    store_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    bool_value DESC,
    bigint_value DESC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE INDEX idx_listing_product_sort_newest_no_availability
  ON listing.listing_posting_product_sort (
    store_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    timestamptz_value DESC NULLS LAST,
    timestamptz_value_2 DESC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE INDEX idx_listing_product_sort_created_no_availability
  ON listing.listing_posting_product_sort (
    store_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    timestamptz_value DESC,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE INDEX idx_listing_product_sort_text_asc_no_availability
  ON listing.listing_posting_product_sort (
    store_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    text_value ASC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE INDEX idx_listing_product_sort_text_desc_no_availability
  ON listing.listing_posting_product_sort (
    store_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    text_value DESC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE INDEX idx_listing_product_sort_bigint_asc_no_availability
  ON listing.listing_posting_product_sort (
    store_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    bigint_value ASC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE INDEX idx_listing_product_sort_bigint_desc_no_availability
  ON listing.listing_posting_product_sort (
    store_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    bigint_value DESC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE TABLE listing.listing_posting_variant_storeion_block (
  store_id             uuid NOT NULL,
  block_id               int NOT NULL,
  variant_doc_from       int NOT NULL,
  variant_doc_to         int NOT NULL,
  variant_bitmap         roaringbitmap NOT NULL,
  product_bitmap         roaringbitmap NOT NULL,
  variant_count          int NOT NULL,
  product_count          int NOT NULL,

  PRIMARY KEY (store_id, block_id),
  CONSTRAINT chk_listing_storeion_block_id_nonnegative
    CHECK (block_id >= 0),
  CONSTRAINT chk_listing_storeion_block_range
    CHECK (variant_doc_from >= 0 AND variant_doc_to > variant_doc_from),
  CONSTRAINT chk_listing_storeion_block_counts_nonnegative
    CHECK (variant_count >= 0 AND product_count >= 0)
);

CREATE INDEX idx_listing_storeion_block_range
  ON listing.listing_posting_variant_storeion_block (
    store_id,
    variant_doc_from,
    variant_doc_to
  );

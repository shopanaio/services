CREATE EXTENSION IF NOT EXISTS roaringbitmap;

CREATE TABLE listing.listing_doc_id_allocator (
  project_id              uuid NOT NULL,
  next_product_doc_id     int NOT NULL DEFAULT 1,
  next_variant_doc_id     int NOT NULL DEFAULT 1,
  updated_at              timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id),
  CONSTRAINT chk_listing_doc_id_allocator_product_positive
    CHECK (next_product_doc_id > 0),
  CONSTRAINT chk_listing_doc_id_allocator_variant_positive
    CHECK (next_variant_doc_id > 0)
);

CREATE TABLE listing.product_listing_index (
  project_id             uuid NOT NULL,
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

  in_stock               boolean NOT NULL DEFAULT false,
  total_stock            int NOT NULL DEFAULT 0,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (product_id),
  CONSTRAINT product_listing_project_doc_unique
    UNIQUE (project_id, product_doc_id),
  CONSTRAINT product_listing_project_product_unique
    UNIQUE (project_id, product_id),
  CONSTRAINT product_listing_project_doc_product_unique
    UNIQUE (project_id, product_doc_id, product_id),
  CONSTRAINT chk_product_listing_kind
    CHECK (kind IN ('BASE', 'BUNDLE')),
  CONSTRAINT chk_product_listing_status
    CHECK (status IN ('published', 'draft')),
  CONSTRAINT chk_product_listing_doc_positive
    CHECK (product_doc_id > 0),
  CONSTRAINT chk_product_listing_total_stock_nonnegative
    CHECK (total_stock >= 0)
);

CREATE INDEX idx_product_listing_project_product
  ON listing.product_listing_index (project_id, product_id);

CREATE INDEX idx_product_listing_project_doc
  ON listing.product_listing_index (project_id, product_doc_id);

CREATE INDEX idx_product_listing_visible_newest
  ON listing.product_listing_index (
    project_id,
    in_stock DESC,
    published_at DESC NULLS LAST,
    product_created_at DESC,
    product_id
  )
  WHERE status = 'published';

CREATE INDEX idx_product_listing_visible_created
  ON listing.product_listing_index (
    project_id,
    in_stock DESC,
    product_created_at DESC,
    product_id
  )
  WHERE status = 'published';

CREATE INDEX idx_product_listing_vendor
  ON listing.product_listing_index (project_id, vendor_id)
  WHERE vendor_id IS NOT NULL;

CREATE INDEX idx_product_listing_in_stock
  ON listing.product_listing_index (project_id, in_stock);

CREATE TABLE listing.product_listing_price_index (
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  currency               varchar(3) NOT NULL,

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
  CONSTRAINT fk_product_listing_price_project_product
    FOREIGN KEY (project_id, product_id)
    REFERENCES listing.product_listing_index(project_id, product_id)
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
    project_id,
    currency,
    min_price_minor ASC,
    product_id
  )
  WHERE has_price = true;

CREATE INDEX idx_product_listing_price_visible_desc
  ON listing.product_listing_price_index (
    project_id,
    currency,
    max_price_minor DESC,
    product_id
  )
  WHERE has_price = true;

CREATE TABLE listing.variant_listing_index (
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  product_doc_id         int NOT NULL,
  variant_id             uuid NOT NULL,
  variant_doc_id         int NOT NULL,

  in_stock               boolean NOT NULL DEFAULT false,
  total_stock            int NOT NULL DEFAULT 0,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (variant_id),
  CONSTRAINT variant_listing_project_product_variant_unique
    UNIQUE (product_id, variant_id),
  CONSTRAINT variant_listing_project_variant_unique
    UNIQUE (project_id, variant_id),
  CONSTRAINT variant_listing_project_doc_unique
    UNIQUE (project_id, variant_doc_id),
  CONSTRAINT variant_listing_project_doc_variant_unique
    UNIQUE (project_id, variant_doc_id, product_doc_id, product_id),
  CONSTRAINT fk_variant_listing_product
    FOREIGN KEY (product_id)
    REFERENCES listing.product_listing_index(product_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_variant_listing_product_doc
    FOREIGN KEY (project_id, product_doc_id, product_id)
    REFERENCES listing.product_listing_index(
      project_id,
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

CREATE INDEX idx_variant_listing_project_product
  ON listing.variant_listing_index (project_id, product_id);

CREATE INDEX idx_variant_listing_project_variant
  ON listing.variant_listing_index (project_id, variant_id);

CREATE INDEX idx_variant_listing_project_doc
  ON listing.variant_listing_index (project_id, variant_doc_id);

CREATE INDEX idx_variant_listing_in_stock
  ON listing.variant_listing_index (project_id, in_stock);

CREATE INDEX idx_variant_listing_in_stock_product_variant
  ON listing.variant_listing_index (
    project_id,
    product_doc_id,
    product_id,
    variant_doc_id,
    variant_id
  )
  WHERE in_stock = true;

CREATE TABLE listing.variant_listing_price_index (
  project_id             uuid NOT NULL,
  variant_id             uuid NOT NULL,
  currency               varchar(3) NOT NULL,

  price_minor            bigint,
  has_price              boolean NOT NULL DEFAULT false,

  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (variant_id, currency),
  CONSTRAINT fk_variant_listing_price_variant
    FOREIGN KEY (variant_id)
    REFERENCES listing.variant_listing_index(variant_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_variant_listing_price_project_variant
    FOREIGN KEY (project_id, variant_id)
    REFERENCES listing.variant_listing_index(project_id, variant_id)
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
    )
);

CREATE INDEX idx_variant_listing_price_value
  ON listing.variant_listing_price_index (project_id, currency, price_minor)
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_variant
  ON listing.variant_listing_price_index (
    project_id,
    currency,
    variant_id,
    price_minor
  )
  WHERE has_price = true;

CREATE INDEX idx_variant_listing_price_value_variant
  ON listing.variant_listing_price_index (
    project_id,
    currency,
    price_minor,
    variant_id
  )
  WHERE has_price = true;

CREATE TABLE listing.listing_posting_bitmap (
  project_id             uuid NOT NULL,
  entity_type            varchar(16) NOT NULL,
  field                  varchar(64) NOT NULL,
  value_key              text NOT NULL,
  bitmap                 roaringbitmap NOT NULL,
  cardinality            bigint NOT NULL,
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at             timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id, entity_type, field, value_key),
  CONSTRAINT chk_listing_posting_bitmap_entity_type
    CHECK (entity_type IN ('product', 'variant'))
);

CREATE TABLE listing.listing_posting_product_sort (
  project_id             uuid NOT NULL,
  product_doc_id         int NOT NULL,
  product_id             uuid NOT NULL,
  sort_kind              varchar(32) NOT NULL,
  locale                 varchar(16) NOT NULL DEFAULT '',
  currency               varchar(3) NOT NULL DEFAULT '',
  manual_scope_id        uuid NOT NULL
    DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  bool_value             boolean,
  timestamptz_value      timestamptz,
  timestamptz_value_2    timestamptz,
  bigint_value           bigint,
  text_value             text,
  numeric_value          numeric,

  PRIMARY KEY (
    project_id,
    product_doc_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id
  ),
  CONSTRAINT fk_listing_posting_product_sort_doc
    FOREIGN KEY (project_id, product_doc_id, product_id)
    REFERENCES listing.product_listing_index(
      project_id,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE
);

CREATE INDEX idx_listing_posting_product_sort_newest
  ON listing.listing_posting_product_sort (
    project_id,
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
    project_id,
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
    project_id,
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
    project_id,
    sort_kind,
    locale,
    currency,
    manual_scope_id,
    bool_value DESC,
    bigint_value DESC NULLS LAST,
    product_id
  )
  INCLUDE (product_doc_id);

CREATE TABLE listing.listing_posting_variant_price (
  project_id             uuid NOT NULL,
  currency               varchar(3) NOT NULL,
  variant_doc_id         int NOT NULL,
  product_doc_id         int NOT NULL,
  product_id             uuid NOT NULL,
  price_minor            bigint NOT NULL,

  PRIMARY KEY (project_id, currency, variant_doc_id),
  CONSTRAINT fk_listing_posting_variant_price_doc
    FOREIGN KEY (
      project_id,
      variant_doc_id,
      product_doc_id,
      product_id
    )
    REFERENCES listing.variant_listing_index(
      project_id,
      variant_doc_id,
      product_doc_id,
      product_id
    )
    ON DELETE CASCADE
);

CREATE INDEX idx_listing_posting_variant_price_range
  ON listing.listing_posting_variant_price (
    project_id,
    currency,
    price_minor,
    product_id,
    variant_doc_id,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_variant_price_desc
  ON listing.listing_posting_variant_price (
    project_id,
    currency,
    price_minor DESC,
    product_id,
    variant_doc_id,
    product_doc_id
  );

CREATE INDEX idx_listing_posting_variant_price_product_order
  ON listing.listing_posting_variant_price (
    project_id,
    currency,
    product_id,
    price_minor,
    variant_doc_id,
    product_doc_id
  );

CREATE TABLE listing.listing_posting_variant_projection_block (
  project_id             uuid NOT NULL,
  block_id               int NOT NULL,
  variant_doc_from       int NOT NULL,
  variant_doc_to         int NOT NULL,
  variant_bitmap         roaringbitmap NOT NULL,
  product_bitmap         roaringbitmap NOT NULL,
  variant_count          int NOT NULL,
  product_count          int NOT NULL,

  PRIMARY KEY (project_id, block_id),
  CONSTRAINT chk_listing_projection_block_id_nonnegative
    CHECK (block_id >= 0),
  CONSTRAINT chk_listing_projection_block_range
    CHECK (variant_doc_from >= 0 AND variant_doc_to > variant_doc_from),
  CONSTRAINT chk_listing_projection_block_counts_nonnegative
    CHECK (variant_count >= 0 AND product_count >= 0)
);

CREATE INDEX idx_listing_projection_block_range
  ON listing.listing_posting_variant_projection_block (
    project_id,
    variant_doc_from,
    variant_doc_to
  );

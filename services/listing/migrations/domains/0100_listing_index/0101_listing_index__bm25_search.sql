CREATE EXTENSION IF NOT EXISTS pg_search;

CREATE TABLE listing.product_title_bm25_search_index (
  search_id              uuid NOT NULL,
  project_id             uuid NOT NULL,
  product_id             uuid NOT NULL,
  locale                 varchar(8) NOT NULL,
  kind                   varchar(16) NOT NULL,
  status                 varchar(16) NOT NULL,
  published_at           timestamptz,
  product_created_at     timestamptz NOT NULL,
  product_updated_at     timestamptz NOT NULL,
  product_revision       int NOT NULL DEFAULT 0,
  title                  text NOT NULL DEFAULT '',
  indexed_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT product_title_bm25_search_index_pkey
    PRIMARY KEY (product_id, locale),
  CONSTRAINT product_title_bm25_search_id_unique
    UNIQUE (search_id),
  CONSTRAINT fk_product_title_bm25_product
    FOREIGN KEY (product_id)
    REFERENCES listing.product_listing_index(product_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_product_title_bm25_kind
    CHECK (kind IN ('BASE', 'BUNDLE')),
  CONSTRAINT chk_product_title_bm25_status
    CHECK (status IN ('published', 'draft'))
);

CREATE INDEX idx_product_title_bm25_project_locale_product
  ON listing.product_title_bm25_search_index (project_id, locale, product_id);

CREATE INDEX idx_product_title_bm25_visible
  ON listing.product_title_bm25_search_index (
    project_id,
    locale,
    published_at DESC,
    product_id
  )
  WHERE status = 'published';

CREATE INDEX idx_product_title_bm25_search
  ON listing.product_title_bm25_search_index
  USING bm25 (
    search_id,
    project_id,
    locale,
    status,
    kind,
    product_id,
    title,
    published_at,
    product_created_at
  )
  WITH (key_field = 'search_id');

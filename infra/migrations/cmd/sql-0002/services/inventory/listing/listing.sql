CREATE TABLE
  listing (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    category_id uuid REFERENCES category (id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (project_id, category_id),
    sort_by varchar(32) NOT NULL,
    sort_by_availability boolean NOT NULL DEFAULT false,
    is_recursive boolean NOT NULL DEFAULT false,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

CREATE INDEX idx_listing_listing_children ON listing (listing_children);

CREATE TABLE
  listing_item (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    listing_id uuid REFERENCES listing (id) ON DELETE CASCADE NOT NULL,
    product_id uuid NOT NULL REFERENCES product (id) ON DELETE CASCADE,
    sort_rank varchar(32) COLLATE "C",
    PRIMARY KEY (product_variant_id, category_id),
    CONSTRAINT uq_category_sort_rank UNIQUE (category_id, sort_rank) DEFERRABLE INITIALLY DEFERRED
  );

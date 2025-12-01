CREATE TABLE
  stock_statuses (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    code varchar(16) NOT NULL,
    item_available boolean NOT NULL DEFAULT false
  );

CREATE UNIQUE INDEX idx_stock_statuses_code ON stock_statuses (project_id, code);

CREATE TABLE
  product_containers (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    slug text NOT NULL,
    requires_shipping boolean NOT NULL DEFAULT false,
    primary_category_id uuid REFERENCES categories (id) ON DELETE SET NULL,
    status varchar(16) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

CREATE UNIQUE INDEX idx_product_containers_slug ON product_containers (project_id, slug)
WHERE
  deleted_at IS NULL;

CREATE INDEX idx_product_containers_status ON product_containers (status);

CREATE INDEX idx_product_containers_created_at ON product_containers (created_at);

CREATE INDEX idx_product_containers_updated_at ON product_containers (updated_at);

CREATE INDEX idx_product_containers_primary_category_id ON product_containers (primary_category_id);

CREATE TABLE
  product_variants (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    container_id uuid REFERENCES product_containers (id) ON DELETE CASCADE NOT NULL,
    slug text NOT NULL,
    barcode varchar(64),
    cost_price int NOT NULL DEFAULT 0,
    cover_id uuid REFERENCES files (id),
    old_price int NOT NULL DEFAULT 0,
    price int NOT NULL DEFAULT 0,
    sku varchar(64),
    sort_index int NOT NULL DEFAULT 0,
    stock_status uuid REFERENCES stock_statuses (id) NOT NULL,
    in_listing boolean NOT NULL DEFAULT false,
    in_search boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CHECK (old_price >= 0),
    CHECK (price >= 0),
    CHECK (sort_index >= 0)
  );

CREATE UNIQUE INDEX idx_unique_product_variants_slug ON product_variants (project_id, slug)
WHERE
  deleted_at IS NULL;

-- Access by container
CREATE INDEX idx_product_variants_container_id ON product_variants (container_id);

CREATE INDEX idx_product_cover_id ON product_variants (cover_id);

CREATE INDEX idx_product_variants_stock_status ON product_variants (stock_status);

CREATE INDEX idx_product_variants_in_listing ON product_variants (in_listing);

CREATE INDEX idx_product_variants_price ON product_variants (price);

CREATE INDEX idx_product_variants_created_at ON product_variants (created_at);

CREATE INDEX idx_product_variants_updated_at ON product_variants (updated_at);

CREATE UNIQUE INDEX idx_product_variants_sort_index_unique_live ON product_variants (container_id, sort_index)
WHERE
  deleted_at IS NULL;

CREATE UNIQUE INDEX idx_product_variants_unique_sku_live ON product_variants (project_id, sku)
WHERE
  deleted_at IS NULL
  AND sku IS NOT NULL;

CREATE INDEX idx_product_containers_deleted_at ON product_containers (deleted_at)
WHERE
  deleted_at IS NOT NULL;

CREATE INDEX idx_product_variants_deleted_at ON product_variants (deleted_at)
WHERE
  deleted_at IS NOT NULL;

CREATE TABLE
  product_variant_shipping_settings (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    product_variant_id uuid NOT NULL,
    PRIMARY KEY (product_variant_id),
    -- weight
    weight float NOT NULL DEFAULT 0,
    weight_unit varchar(8) NOT NULL,
    -- dimensions
    width float NOT NULL DEFAULT 0,
    length float NOT NULL DEFAULT 0,
    height float NOT NULL DEFAULT 0,
    dimension_unit varchar(8) NOT NULL,
    CONSTRAINT product_variant_shipping_settings_fk FOREIGN KEY (product_variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
    CHECK (
      weight >= 0
      AND width >= 0
      AND length >= 0
      AND height >= 0
    )
  );

CREATE TABLE
  product_variants_categories_links (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    category_id uuid REFERENCES categories (id) ON DELETE CASCADE NOT NULL,
    product_variant_id uuid NOT NULL,
    sort_rank varchar(32) COLLATE "C",
    PRIMARY KEY (product_variant_id, category_id),
    CONSTRAINT product_variants_categories_links_product_fk FOREIGN KEY (product_variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
    CONSTRAINT uq_category_sort_rank UNIQUE (category_id, sort_rank) DEFERRABLE INITIALLY DEFERRED
  );

-- Product Badges
CREATE TABLE
  product_badges (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY ,
    name varchar(50) NOT NULL,
    slug varchar(50) NOT NULL,
    color_hex char(7) CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

CREATE UNIQUE INDEX idx_product_badges_slug ON product_badges (project_id, slug);

CREATE TABLE
  product_badges_links (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    product_container_id uuid NOT NULL,
    badge_id uuid NOT NULL,
    PRIMARY KEY (product_container_id, badge_id),
    CONSTRAINT product_badges_links_product_fk FOREIGN KEY (product_container_id) REFERENCES product_containers (id) ON DELETE CASCADE,
    CONSTRAINT product_badges_links_badge_fk FOREIGN KEY (badge_id) REFERENCES product_badges (id) ON DELETE CASCADE
  );

CREATE INDEX idx_product_badges_links_badge_id ON product_badges_links (badge_id);

CREATE TABLE
  product_containers_tags_links (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    product_container_id uuid NOT NULL,
    tag_id uuid REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (product_container_id, tag_id),
    CONSTRAINT product_containers_tags_links_product_fk FOREIGN KEY (product_container_id) REFERENCES product_containers (id) ON DELETE CASCADE
  );

CREATE INDEX idx_product_containers_tags_links_tag_id ON product_containers_tags_links (tag_id);

CREATE TABLE
  product_containers_labels_links (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    product_container_id uuid NOT NULL,
    label_id uuid REFERENCES labels (id) ON DELETE CASCADE,
    PRIMARY KEY (product_container_id, label_id),
    CONSTRAINT product_containers_labels_links_product_fk FOREIGN KEY (product_container_id) REFERENCES product_containers (id) ON DELETE CASCADE
  );

CREATE INDEX idx_product_containers_labels_links_label_id ON product_containers_labels_links (label_id);

-- === Price History ===
CREATE TABLE
  product_variant_price_history (
    id uuid PRIMARY KEY ,
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    product_variant_id uuid NOT NULL,
    price int,
    old_price int,
    cost_price int,
    -- One or more of the fields must be set
    CHECK (
      price IS NOT NULL
      OR old_price IS NOT NULL
      OR cost_price IS NOT NULL
    ),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT product_variant_price_history_fk FOREIGN KEY (product_variant_id) REFERENCES product_variants (id) ON DELETE CASCADE,
    UNIQUE (product_variant_id, created_at)
  );

CREATE INDEX idx_product_variant_price_history_project_id ON product_variant_price_history (project_id);

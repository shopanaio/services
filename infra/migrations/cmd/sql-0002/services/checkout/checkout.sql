-- =========================================================
-- CHECKOUT: READ MODELS
-- =========================================================
CREATE EXTENSION IF NOT EXISTS citext;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE
  checkouts (
    id uuid PRIMARY KEY,
    project_id uuid REFERENCES projects (id),
    api_key_id uuid REFERENCES api_keys (id),
    admin_id uuid REFERENCES users (id),
    sales_channel varchar(32),
    external_source text,
    external_id text,
    customer_note text,
    locale_code char(5),
    currency_code char(3) NOT NULL,
    subtotal bigint NOT NULL CHECK (subtotal >= 0),
    shipping_total bigint NOT NULL CHECK (shipping_total >= 0),
    discount_total bigint NOT NULL CHECK (discount_total >= 0),
    tax_total bigint NOT NULL CHECK (tax_total >= 0),
    grand_total bigint NOT NULL CHECK (grand_total >= 0),
    status varchar(32) NOT NULL,
    expires_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

CREATE TABLE
  checkout_customer_identities (
    id uuid PRIMARY KEY,
    project_id uuid REFERENCES projects (id),
    first_name text,
    last_name text,
    middle_name text,
    customer_id uuid,
    email text,
    phone_e164 text,
    country_code char(2),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

ALTER TABLE checkout_customer_identities
ADD CONSTRAINT fk_checkout_customer_identities_id FOREIGN KEY (id) REFERENCES checkouts (id) ON DELETE CASCADE;

CREATE TABLE
  checkout_line_items (
    id uuid PRIMARY KEY,
    project_id uuid REFERENCES projects (id),
    checkout_id uuid,
    parent_line_item_id uuid REFERENCES checkout_line_items (id) ON DELETE CASCADE,
    tag_id uuid,
    -- Количество единиц товара
    quantity int NOT NULL CHECK (quantity > 0),
    -- Цены (в минорных единицах базовой валюты)
    subtotal_amount bigint NOT NULL CHECK (subtotal_amount >= 0),
    discount_amount bigint NOT NULL CHECK (discount_amount >= 0),
    tax_amount bigint NOT NULL CHECK (tax_amount >= 0),
    total_amount bigint NOT NULL CHECK (total_amount >= 0),
    -- product data
    unit_id text,
    unit_title text,
    unit_price bigint,
    unit_compare_at_price bigint,
    unit_sku text,
    unit_image_url text,
    unit_snapshot jsonb DEFAULT '{}'::jsonb,
    -- Произвольные служебные данные позиции
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );

CREATE TABLE
  checkout_tags (
    id uuid PRIMARY KEY,
    checkout_id uuid NOT NULL REFERENCES checkouts (id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects (id),
    slug varchar(64) NOT NULL,
    is_unique boolean NOT NULL DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_checkout_tags_slug CHECK (slug ~ '^[a-zA-Z0-9]+$'),
    UNIQUE (checkout_id, slug)
  );

CREATE TABLE
  checkout_notifications (
    project_id uuid REFERENCES projects (id),
    id uuid PRIMARY KEY,
    checkout_id uuid NOT NULL,
    code varchar(255),
    severity varchar(255),
    projected_version bigint,
    created_at timestamptz,
    dismissed_at timestamptz
  );

CREATE TABLE
  checkout_applied_discounts (
    checkout_id uuid NOT NULL REFERENCES checkouts (id) ON DELETE CASCADE,
    project_id uuid REFERENCES projects (id),
    code text,
    discount_type varchar(32),
    value bigint NOT NULL CHECK (value >= 0),
    provider text,
    conditions jsonb,
    applied_at timestamptz,
    PRIMARY KEY (checkout_id, code)
    -- CHECK (discount_type = 'percentage' AND value >= 0 AND value <= 100)
  );

-- Адреса доставки для групп
CREATE TABLE
  checkout_delivery_addresses (
    id uuid PRIMARY KEY,
    address1 text,
    address2 text,
    city text,
    country_code char(2),
    province_code text,
    postal_code text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

CREATE TABLE
  checkout_recipients (
    id uuid PRIMARY KEY,
    project_id uuid REFERENCES projects (id),
    first_name text,
    last_name text,
    middle_name text,
    email text,
    phone text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

CREATE TABLE
  checkout_delivery_groups (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES projects (id),
    checkout_id uuid NOT NULL REFERENCES checkouts (id) ON DELETE CASCADE,
    address_id uuid REFERENCES checkout_delivery_addresses (id) ON DELETE SET NULL,
    recipient_id uuid REFERENCES checkout_recipients (id) ON DELETE SET NULL,
    selected_delivery_method_code text,
    selected_delivery_method_provider text,
    line_item_ids uuid[] NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

CREATE TABLE
  checkout_delivery_methods (
    code text NOT NULL,
    provider text NOT NULL,
    project_id uuid NOT NULL REFERENCES projects (id),
    delivery_group_id uuid,
    delivery_method_type varchar(32), -- PICKUP | SHIPPING | NONE
    payment_model varchar(32), -- MERCHANT_COLLECTED | CARRIER_DIRECT
    metadata jsonb DEFAULT '{}'::jsonb,
    customer_input jsonb DEFAULT '{}'::jsonb,
    PRIMARY KEY (code, provider, delivery_group_id)
  );

ALTER TABLE checkout_delivery_methods
ADD CONSTRAINT fk_checkout_delivery_methods_delivery_group_id FOREIGN KEY (delivery_group_id) REFERENCES checkout_delivery_groups (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE checkout_delivery_groups
ADD CONSTRAINT fk_checkout_delivery_groups_selected_delivery_method FOREIGN KEY (
  selected_delivery_method_code,
  selected_delivery_method_provider,
  id
) REFERENCES checkout_delivery_methods (code, provider, delivery_group_id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE
  checkout_payment_methods (
    checkout_id uuid NOT NULL REFERENCES checkouts (id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects (id),
    code text NOT NULL,
    provider text NOT NULL,
    flow varchar(32) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    customer_input jsonb DEFAULT '{}'::jsonb,
    PRIMARY KEY (checkout_id, code, provider)
  );

CREATE TABLE
  checkout_selected_payment_methods (
    checkout_id uuid NOT NULL REFERENCES checkouts (id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects (id),
    code text NOT NULL,
    provider text NOT NULL,
    PRIMARY KEY (checkout_id),
    CONSTRAINT fk_selected_payment_method FOREIGN KEY (checkout_id, code, provider) REFERENCES checkout_payment_methods (checkout_id, code, provider) DEFERRABLE INITIALLY DEFERRED
  );

-- =========================================================
-- Foreign Keys (missing) and Indexes for performance
-- =========================================================
-- FK from checkout_line_items to checkouts
ALTER TABLE checkout_line_items
ADD CONSTRAINT fk_checkout_line_items_checkout_id FOREIGN KEY (checkout_id) REFERENCES checkouts (id) ON DELETE CASCADE;

ALTER TABLE checkout_line_items
ADD CONSTRAINT fk_checkout_line_items_tag_id FOREIGN KEY (tag_id) REFERENCES checkout_tags (id) ON DELETE SET NULL;

-- FK from checkout_line_items to itself for parent_line_item_id
ALTER TABLE checkout_line_items
ADD CONSTRAINT fk_cli_parent FOREIGN KEY (parent_line_item_id) REFERENCES checkout_line_items (id) ON DELETE CASCADE;

-- Helpful indexes on checkouts
CREATE INDEX IF NOT EXISTS idx_checkouts_project_id ON checkouts (project_id);

CREATE INDEX IF NOT EXISTS idx_checkouts_external_id ON checkouts (external_id);

CREATE INDEX IF NOT EXISTS idx_checkouts_status ON checkouts (status);

CREATE INDEX IF NOT EXISTS idx_checkouts_project_id_id ON checkouts (project_id, id);

-- Helpful indexes on checkout_line_items
CREATE INDEX IF NOT EXISTS idx_checkout_line_items_checkout_id ON checkout_line_items (checkout_id);

CREATE INDEX IF NOT EXISTS idx_checkout_line_items_project_checkout ON checkout_line_items (project_id, checkout_id);

CREATE INDEX IF NOT EXISTS idx_cli_parent ON checkout_line_items (checkout_id, parent_line_item_id);

CREATE INDEX IF NOT EXISTS idx_checkout_line_items_tag_id ON checkout_line_items (tag_id);

CREATE INDEX IF NOT EXISTS idx_checkout_tags_checkout_id ON checkout_tags (checkout_id);

CREATE INDEX IF NOT EXISTS idx_checkout_tags_project_id ON checkout_tags (project_id);

-- Helpful indexes on checkout_delivery_groups
CREATE INDEX IF NOT EXISTS idx_checkout_delivery_groups_checkout_id ON checkout_delivery_groups (checkout_id);

-- Helpful indexes on checkout_delivery_methods
CREATE INDEX IF NOT EXISTS idx_checkout_delivery_methods_project_id ON checkout_delivery_methods (project_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_checkout_delivery_methods_code_provider_group ON checkout_delivery_methods (delivery_group_id, provider, code);

-- Helpful indexes on checkout_payment methods
CREATE INDEX IF NOT EXISTS idx_checkout_payment_methods_checkout_id ON checkout_payment_methods (checkout_id);

CREATE INDEX IF NOT EXISTS idx_checkout_payment_methods_project_id ON checkout_payment_methods (project_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_checkout_payment_methods_code_provider ON checkout_payment_methods (checkout_id, code, provider);

CREATE INDEX IF NOT EXISTS idx_checkout_selected_payment_methods_checkout_id ON checkout_selected_payment_methods (checkout_id);

-- Helpful indexes on checkout_customer_identities
CREATE INDEX IF NOT EXISTS idx_checkout_customer_identities_project_id ON checkout_customer_identities (project_id);

CREATE INDEX IF NOT EXISTS idx_checkout_customer_identities_customer_id ON checkout_customer_identities (customer_id);

-- Helpful indexes on checkout_recipients
CREATE INDEX IF NOT EXISTS idx_checkout_recipients_project_id ON checkout_recipients (project_id);

-- Helpful indexes on checkout_applied_discounts
CREATE INDEX IF NOT EXISTS idx_checkout_applied_discounts_project_id ON checkout_applied_discounts (project_id);

-- Foreign key for checkout_notifications.checkout_id and helpful index
ALTER TABLE checkout_notifications
ADD CONSTRAINT fk_checkout_notifications_checkout_id FOREIGN KEY (checkout_id) REFERENCES checkouts (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_checkout_notifications_checkout_id ON checkout_notifications (checkout_id);

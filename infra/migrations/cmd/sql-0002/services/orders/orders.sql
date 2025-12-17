-- =========================================================
-- ОБЩИЕ ТИПЫ И ДОМЕНЫ
-- =========================================================

CREATE TABLE
  orders (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    order_number bigint NOT NULL,
    api_key_id uuid REFERENCES api_keys (id) ON DELETE SET NULL,
    user_id uuid REFERENCES users (id) ON DELETE SET NULL,
    sales_channel varchar(32),
    external_source text,
    external_id text,
    locale_code char(5),
    currency_code char(3),
    subtotal bigint NOT NULL CHECK (subtotal >= 0),
    shipping_total bigint NOT NULL CHECK (shipping_total >= 0),
    discount_total bigint NOT NULL CHECK (discount_total >= 0),
    tax_total bigint NOT NULL CHECK (tax_total >= 0),
    grand_total bigint NOT NULL CHECK (grand_total >= 0),
    status varchar(255) NOT NULL,
    placed_at timestamptz, -- когда клиент отправил
    closed_at timestamptz,
    expires_at timestamptz,
    metadata jsonb,
    projected_version bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT uq_orders_project_number UNIQUE (project_id, order_number)
  );

CREATE TABLE
  order_number_counters (
    project_id uuid PRIMARY KEY REFERENCES projects (id) ON DELETE CASCADE,
    last_number bigint NOT NULL CHECK (last_number >= 0),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

CREATE TABLE
  order_items (
    id uuid PRIMARY KEY,
    project_id uuid REFERENCES projects (id),
    order_id uuid,
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
    unit_snapshot jsonb,
    -- Произвольные служебные данные позиции
    metadata jsonb,
    projected_version bigint,
    created_at timestamptz,
    updated_at timestamptz,
    deleted_at timestamptz
  );

CREATE TABLE
  order_items_physical_properties (
    id uuid PRIMARY KEY ,
    order_item_id uuid REFERENCES order_items (id) ON DELETE CASCADE NOT NULL,
    weight_g integer CHECK (weight_g >= 0),
    length_mm integer CHECK (length_mm >= 0),
    width_mm integer CHECK (width_mm >= 0),
    height_mm integer CHECK (height_mm >= 0)
  );

-- =========================================================
-- ДОСТАВКА И СКИДКИ ДЛЯ ЗАКАЗОВ (checkout_v2)
-- ---------------------------------------------------------
-- Внимание: Таблицы order_delivery_addresses и order_recipients
-- находятся в orders_pii.sql как PII данные.
-- Структуры ниже повторяют подход checkout_v2 (checkout.sql),
-- но адаптированы под заказы.
-- =========================================================

-- Группы доставки для заказа
CREATE TABLE
  order_delivery_groups (
    id uuid PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES projects (id),
    order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    address_id uuid REFERENCES order_delivery_addresses (id) ON DELETE SET NULL,
    recipient_id uuid REFERENCES order_recipients (id) ON DELETE SET NULL,
    selected_delivery_method_code text,
    selected_delivery_method_provider text,
    line_item_ids uuid[] NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

-- Методы доставки, доступные для группы
CREATE TABLE
  order_delivery_methods (
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

ALTER TABLE order_delivery_methods
ADD CONSTRAINT fk_order_delivery_methods_delivery_group_id FOREIGN KEY (delivery_group_id) REFERENCES order_delivery_groups (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE order_delivery_groups
ADD CONSTRAINT fk_order_delivery_groups_selected_delivery_method FOREIGN KEY (
  selected_delivery_method_code,
  selected_delivery_method_provider,
  id
) REFERENCES order_delivery_methods (code, provider, delivery_group_id) DEFERRABLE INITIALLY DEFERRED;

-- Методы оплаты для заказа
CREATE TABLE
  order_payment_methods (
    order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects (id),
    code text NOT NULL,
    provider text NOT NULL,
    flow varchar(32) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    customer_input jsonb DEFAULT '{}'::jsonb,
    PRIMARY KEY (order_id, code, provider)
  );

CREATE TABLE
  order_selected_payment_methods (
    order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects (id),
    code text NOT NULL,
    provider text NOT NULL,
    PRIMARY KEY (order_id),
    CONSTRAINT fk_order_selected_payment_method FOREIGN KEY (order_id, code, provider) REFERENCES order_payment_methods (order_id, code, provider) DEFERRABLE INITIALLY DEFERRED
  );

-- Применённые скидки к заказу (нормализовано)
CREATE TABLE
  order_applied_discounts (
    order_id uuid,
    project_id uuid,
    code text,
    discount_type varchar(32),
    value bigint NOT NULL CHECK (value >= 0),
    provider text,
    conditions jsonb,
    applied_at timestamptz
  );

-- =========================================================
-- Indexes for order delivery groups and methods
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_order_delivery_groups_order_id ON order_delivery_groups (order_id);

CREATE INDEX IF NOT EXISTS idx_order_delivery_methods_project_id ON order_delivery_methods (project_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_delivery_methods_code_provider_group ON order_delivery_methods (delivery_group_id, provider, code);

-- Indexes for order payment methods
CREATE INDEX IF NOT EXISTS idx_order_payment_methods_order_id ON order_payment_methods (order_id);

CREATE INDEX IF NOT EXISTS idx_order_payment_methods_project_id ON order_payment_methods (project_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_payment_methods_code_provider ON order_payment_methods (order_id, code, provider);

CREATE INDEX IF NOT EXISTS idx_order_selected_payment_methods_order_id ON order_selected_payment_methods (order_id);

-- =========================================================
-- Add foreign key constraint for orders_pii_records after orders table creation
-- =========================================================
ALTER TABLE orders_pii_records
ADD CONSTRAINT fk_orders_pii_records_order_id FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;

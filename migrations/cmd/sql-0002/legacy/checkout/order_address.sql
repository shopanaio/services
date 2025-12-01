-- =========================================================
-- УЧАСТНИКИ ЗАКАЗА И АДРЕСА (неизменные снимки)
-- =========================================================
CREATE TABLE IF NOT EXISTS
  order_parties (
    id uuid PRIMARY KEY ,
    order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    role varchar(16) NOT NULL, -- 'клиент','получатель','плательщик'
    CONSTRAINT ck_order_parties_role CHECK (role IN ('customer','recipient','payer')),
    email citext,
    phone_e164 text,
    first_name text,
    last_name text,
    company text,
    created_at timestamptz NOT NULL DEFAULT now()
  );

CREATE INDEX IF NOT EXISTS idx_order_parties_order ON order_parties (order_id);

CREATE TABLE IF NOT EXISTS
  order_addresses (
    id uuid PRIMARY KEY ,
    order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    kind varchar(255) NOT NULL, -- счет/доставка/самовывоз
    -- first_name text,
    -- last_name text,
    -- middle_name text,
    contact_name text,
    company text,
    line1 text NOT NULL,
    line2 text,
    city text NOT NULL,
    region text, -- штат/провинция
    postal_code text,
    country_code char(2) NOT NULL REFERENCES country_codes (code),
    email citext,
    phone_e164 text,
    -- таможня/юридические
    vat_number text,
    eori_number text,
    created_at timestamptz NOT NULL DEFAULT now(),
    latitude numeric(10, 8),
    longitude numeric(11, 8),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_addr_kind ON order_addresses (order_id, kind);

CREATE INDEX IF NOT EXISTS idx_order_addresses_country ON order_addresses (country_code);

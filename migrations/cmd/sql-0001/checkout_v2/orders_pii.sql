-- =========================================================
-- PII STORAGE FOR ORDERS (checkout_v2)
-- ---------------------------------------------------------
-- Purpose:
-- - Keep personally identifiable information (PII) OUT of event payloads
--   and the core immutable order facts.
-- - Store PII in dedicated relational tables with clear retention,
--   access control, and deletion policies (GDPR/CCPA compliance).
-- - Read-models and CRM screens can join these tables to enrich orders
--   for authorized users, while domain events remain PII-free.
--
-- Design notes:
-- - Addresses live per delivery group; however, event payloads should carry
--   only a reference (delivery_group_id) and jurisdictional slice where needed.
-- - Contacts (email/phone/note) are stored per order in a single row for
--   convenience; versions/history can be added with SCDv2 if required.
-- - Consider column/row-level encryption/KMS and stricter ACLs at runtime.
-- =========================================================

-- ---------------------------------------------------------
-- Delivery addresses (PII)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS
  order_delivery_addresses (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
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

COMMENT ON TABLE order_delivery_addresses IS 'PII: Delivery addresses for order delivery groups. Keep out of event store. Subject to GDPR retention/erasure.';

-- ---------------------------------------------------------
-- Recipients (PII)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS
  order_recipients (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    first_name text,
    last_name text,
    middle_name text,
    email text,
    phone text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

COMMENT ON TABLE order_recipients IS 'PII: Recipients for order delivery groups. Keep out of event store. Subject to GDPR retention/erasure.';

CREATE INDEX IF NOT EXISTS idx_order_recipients_project
  ON order_recipients (project_id);

-- ---------------------------------------------------------
-- Per-order customer identity PII
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS
  orders_pii_records (
    -- Multitenancy boundary for ACLs and cleanup
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    -- One-to-one with orders (FK will be added after orders table creation)
    order_id uuid PRIMARY KEY,

    -- PII fields: store only here, never in event payloads
    first_name text,
    last_name text,
    middle_name text,
    customer_id uuid,
    customer_email citext,
    customer_phone_e164 text,
    customer_note text,
    country_code char(2),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

    -- Optional retention helper (crypto-erasure or TTL scheduler can rely on it)
    expires_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

COMMENT ON TABLE orders_pii_records IS 'PII: Per-order customer identity (name/email/phone/note). Keep out of events. Support GDPR deletion and retention policies.';

CREATE INDEX IF NOT EXISTS idx_orders_pii_records_project
  ON orders_pii_records (project_id);

CREATE INDEX IF NOT EXISTS idx_orders_pii_records_expires
  ON orders_pii_records (expires_at)
  WHERE expires_at IS NOT NULL;

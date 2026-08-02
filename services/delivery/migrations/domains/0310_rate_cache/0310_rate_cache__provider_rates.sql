CREATE TABLE delivery.provider_rate_cache (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id uuid NOT NULL,
  checkout_id uuid NOT NULL,
  based_on_checkout_version integer NOT NULL CHECK (based_on_checkout_version >= 0),
  cache_key text NOT NULL,
  result jsonb NOT NULL,
  cached_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  CONSTRAINT provider_rate_cache_key UNIQUE (store_id, cache_key)
);
CREATE INDEX provider_rate_cache_expiry_idx ON delivery.provider_rate_cache (store_id, expires_at);

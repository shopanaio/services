CREATE TABLE delivery.checkout_option_bindings (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id uuid NOT NULL,
  checkout_id uuid NOT NULL,
  based_on_checkout_version integer NOT NULL CHECK (based_on_checkout_version >= 0),
  target_checkout_version integer NOT NULL CHECK (target_checkout_version = based_on_checkout_version + 1),
  group_id text NOT NULL,
  option_handle text NOT NULL,
  preliminary_revision text NOT NULL,
  delivery_revision text NOT NULL,
  snapshot jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT checkout_option_bindings_identity_key
    UNIQUE (store_id, checkout_id, target_checkout_version, group_id, option_handle)
);
CREATE INDEX checkout_option_bindings_lookup_idx
  ON delivery.checkout_option_bindings
  (store_id, checkout_id, target_checkout_version, group_id, option_handle, expires_at);

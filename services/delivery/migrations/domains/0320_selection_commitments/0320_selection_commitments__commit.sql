ALTER TABLE delivery.checkout_option_bindings
  ADD COLUMN option jsonb NOT NULL;

CREATE TABLE delivery.checkout_selection_commitments (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  store_id uuid NOT NULL,
  checkout_id uuid NOT NULL,
  checkout_version integer NOT NULL CHECK (checkout_version > 0),
  group_id text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  snapshot jsonb NOT NULL,
  committed_at timestamptz NOT NULL,
  CONSTRAINT checkout_selection_commitments_group_key
    UNIQUE (store_id, checkout_id, checkout_version, group_id),
  CONSTRAINT checkout_selection_commitments_idempotency_key
    UNIQUE (store_id, idempotency_key, group_id)
);

CREATE INDEX checkout_selection_commitments_checkout_idx
  ON delivery.checkout_selection_commitments (store_id, checkout_id, checkout_version);

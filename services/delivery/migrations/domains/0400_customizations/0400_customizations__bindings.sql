CREATE TABLE delivery.customizations (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'DISABLED')),
  policy_revision text NOT NULL,
  configuration_revision text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customizations_store_status_idx ON delivery.customizations (store_id, status);

CREATE TABLE delivery.customization_bindings (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id uuid NOT NULL,
  customization_id uuid NOT NULL REFERENCES delivery.customizations(id) ON DELETE CASCADE,
  installation_id uuid NOT NULL,
  function_key text NOT NULL,
  configuration jsonb NOT NULL,
  configuration_revision text NOT NULL,
  pinned_route_revision text NOT NULL,
  precedence integer NOT NULL,
  activation_sequence integer NOT NULL CHECK (activation_sequence >= 0),
  failure_mode text NOT NULL CHECK (failure_mode IN ('REQUIRED', 'OPTIONAL')),
  status text NOT NULL CHECK (status IN ('ACTIVE', 'DISABLED')),
  CONSTRAINT customization_bindings_owner_sequence_key UNIQUE (customization_id, activation_sequence)
);
CREATE INDEX customization_bindings_store_status_idx ON delivery.customization_bindings (store_id, status);

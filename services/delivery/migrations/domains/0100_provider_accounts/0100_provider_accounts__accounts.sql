CREATE TABLE delivery.provider_accounts (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  store_id uuid NOT NULL,
  installation_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('TEST', 'LIVE')),
  provider_code text NOT NULL,
  display_name text NOT NULL,
  account_revision integer NOT NULL CHECK (account_revision > 0),
  supported_country_codes jsonb NOT NULL,
  supported_currency_codes jsonb NOT NULL,
  supported_operations jsonb NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_accounts_store_installation_key UNIQUE (store_id, installation_id)
);
CREATE INDEX provider_accounts_store_idx ON delivery.provider_accounts (store_id);

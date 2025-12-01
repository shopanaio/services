-- Apps core tables

-- Registered app definitions (catalog of available apps; optional for MVP)
CREATE TABLE IF NOT EXISTS apps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  code varchar(64) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Installation of an app for a specific project
CREATE TABLE IF NOT EXISTS app_installations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
  app_code varchar(64) NOT NULL,
  base_url text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, app_code)
);

-- Secrets for a specific installation (key-value encrypted)
CREATE TABLE IF NOT EXISTS app_secrets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  installation_id uuid REFERENCES app_installations (id) ON DELETE CASCADE NOT NULL,
  key varchar(64) NOT NULL,
  value_encrypted text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (installation_id, key)
);

-- Event subscriptions for an installation
CREATE TABLE IF NOT EXISTS app_subscriptions (
  installation_id uuid REFERENCES app_installations (id) ON DELETE CASCADE NOT NULL,
  event_type varchar(128) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (installation_id, event_type)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_app_installations_project_id ON app_installations (project_id);
CREATE INDEX IF NOT EXISTS idx_app_installations_app_code ON app_installations (app_code);
CREATE INDEX IF NOT EXISTS idx_app_subscriptions_event_type ON app_subscriptions (event_type);

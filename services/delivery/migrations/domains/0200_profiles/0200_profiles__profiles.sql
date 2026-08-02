CREATE TABLE delivery.profiles (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id uuid NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  status text NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profiles_store_status_idx ON delivery.profiles (store_id, status);

CREATE TABLE delivery.profile_sets (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id uuid NOT NULL,
  revision text NOT NULL,
  currency_code text NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  snapshot jsonb NOT NULL,
  activated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_sets_store_key UNIQUE (store_id),
  CONSTRAINT profile_sets_store_revision_key UNIQUE (store_id, revision)
);

CREATE TABLE delivery.profile_assignment_memberships (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id uuid NOT NULL,
  profile_set_revision text NOT NULL,
  profile_id uuid NOT NULL,
  assignment_set_id uuid NOT NULL,
  membership_type text NOT NULL CHECK (membership_type IN ('VARIANT', 'SELLING_PLAN_GROUP')),
  resource_id uuid NOT NULL,
  assignment_revision text NOT NULL,
  sequence bigint NOT NULL CHECK (sequence >= 0),
  CONSTRAINT profile_assignment_membership_key UNIQUE (assignment_set_id, membership_type, resource_id)
);
CREATE INDEX profile_assignment_lookup_idx
  ON delivery.profile_assignment_memberships (store_id, membership_type, resource_id);

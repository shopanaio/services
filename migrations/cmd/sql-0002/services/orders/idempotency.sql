-- Idempotency storage for API-level request deduplication (per tenant)
CREATE TABLE IF NOT EXISTS
  idempotency (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    response jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    CONSTRAINT pk_idempotency PRIMARY KEY (project_id, idempotency_key)
  );

CREATE INDEX IF NOT EXISTS idempotency_expires_at_idx ON idempotency (expires_at);

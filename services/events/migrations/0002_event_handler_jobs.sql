CREATE TABLE IF NOT EXISTS event_handler_jobs (
  job_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  batch_key TEXT,
  aggregate_key TEXT,
  handler_service TEXT NOT NULL,
  handler_action TEXT NOT NULL,
  handler_kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL,
  interval_seconds INTEGER NOT NULL,
  backoff_rate INTEGER NOT NULL,
  timeout_ms INTEGER,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_by TEXT,
  locked_until TIMESTAMPTZ,
  last_error TEXT,
  last_error_code TEXT,
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT event_handler_jobs_event_fk
    FOREIGN KEY (event_id)
    REFERENCES domain_events(event_id)
    ON DELETE CASCADE,
  CONSTRAINT event_handler_jobs_event_action_unique
    UNIQUE (event_id, handler_action),
  CONSTRAINT event_handler_jobs_kind_chk
    CHECK (handler_kind IN ('single', 'batch')),
  CONSTRAINT event_handler_jobs_status_chk
    CHECK (status IN ('pending', 'dispatching', 'succeeded', 'dlq')),
  CONSTRAINT event_handler_jobs_attempts_chk
    CHECK (attempts >= 0 AND max_attempts > 0),
  CONSTRAINT event_handler_jobs_retry_policy_chk
    CHECK (interval_seconds >= 0 AND backoff_rate >= 1)
);

CREATE INDEX idx_event_handler_jobs_event
  ON event_handler_jobs(event_id);

CREATE INDEX idx_event_handler_jobs_ready
  ON event_handler_jobs(status, next_attempt_at);

CREATE INDEX idx_event_handler_jobs_batch
  ON event_handler_jobs(
    organization_id,
    event_type,
    batch_key,
    handler_action,
    status,
    next_attempt_at
  );

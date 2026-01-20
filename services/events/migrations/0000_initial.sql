CREATE TABLE IF NOT EXISTS domain_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  correlation_id TEXT NOT NULL,
  causation_id TEXT,
  emit_key TEXT NOT NULL,
  parent_workflow_id TEXT,
  status TEXT NOT NULL DEFAULT 'dispatching',
  dispatch_started_at TIMESTAMPTZ,
  dispatch_completed_at TIMESTAMPTZ,
  handler_results JSONB,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  related JSONB NOT NULL DEFAULT '[]'::jsonb,
  actor_type TEXT NOT NULL DEFAULT 'service',
  actor_id TEXT,
  payload_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT domain_events_status_chk
    CHECK (status IN ('dispatching', 'completed')),
  CONSTRAINT domain_events_actor_type_chk
    CHECK (actor_type IN ('user', 'service', 'system'))
);

CREATE INDEX idx_events_type ON domain_events(event_type);
CREATE INDEX idx_events_correlation ON domain_events(correlation_id);
CREATE INDEX idx_events_status ON domain_events(status) WHERE status != 'completed';
CREATE INDEX idx_events_parent_workflow ON domain_events(parent_workflow_id, event_type);

CREATE INDEX idx_events_tenant_timestamp ON domain_events(tenant_id, timestamp DESC);
CREATE INDEX idx_events_subject_timeline ON domain_events(tenant_id, subject_type, subject_id, timestamp DESC);
CREATE INDEX idx_events_type_timestamp ON domain_events(tenant_id, event_type, timestamp DESC);

CREATE INDEX idx_events_related ON domain_events USING GIN (related);

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  handler_service TEXT NOT NULL,
  handler_action TEXT NOT NULL,
  error TEXT NOT NULL,
  error_code TEXT,
  attempts INTEGER NOT NULL,
  tenant_id TEXT NOT NULL,
  correlation_id TEXT,
  status TEXT NOT NULL DEFAULT 'failed',
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT dlq_event_handler_unique
    UNIQUE (event_id, handler_service, handler_action),
  CONSTRAINT dlq_status_chk
    CHECK (status IN ('failed', 'retried', 'resolved'))
);

CREATE INDEX idx_dlq_status ON dead_letter_queue(status);
CREATE INDEX idx_dlq_event_type ON dead_letter_queue(event_type, status);
CREATE INDEX idx_dlq_tenant ON dead_letter_queue(tenant_id, status);
CREATE INDEX idx_dlq_expires ON dead_letter_queue(expires_at) WHERE expires_at IS NOT NULL;

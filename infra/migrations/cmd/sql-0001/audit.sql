-- Universal events system for all tables (replaces orders_events)
-- Compatible with existing manual event creation logic
CREATE TABLE events (
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),

    -- Table and record identification
    table_name varchar(255) NOT NULL,
    record_id uuid NOT NULL,

    -- Event details (compatible with orders_events structure)
    event_type varchar(32) NOT NULL,
    event_data jsonb,

    -- Authorization (same as orders_events)
    created_by_tenant_id uuid,
    api_key_id text,
    CHECK (
        api_key_id IS NOT NULL
        OR created_by_tenant_id IS NOT NULL
    ),

    -- Additional context for audit purposes
    operation varchar(10), -- INSERT, UPDATE, DELETE (optional)
    old_values jsonb,      -- For UPDATE/DELETE operations (optional)
    new_values jsonb,      -- For INSERT/UPDATE operations (optional)

    -- Security context
    ip_address inet,
    user_agent text,

    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_events_project_id ON events (project_id);
CREATE INDEX idx_events_table_name ON events (table_name);
CREATE INDEX idx_events_record_id ON events (record_id);
CREATE INDEX idx_events_event_type ON events (event_type);
CREATE INDEX idx_events_created_at ON events (created_at);
CREATE INDEX idx_events_created_by_tenant_id ON events (created_by_tenant_id);
CREATE INDEX idx_events_api_key_id ON events (api_key_id);

-- Composite indexes for common queries
CREATE INDEX idx_events_table_record ON events (table_name, record_id);
CREATE INDEX idx_events_table_type ON events (table_name, event_type);
CREATE INDEX idx_events_record_created ON events (record_id, created_at);

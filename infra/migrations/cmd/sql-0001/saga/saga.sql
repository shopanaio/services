-- Schema for orchestrator saga module (broker-first)
-- Namespace: platform

-- results_applied: exactly-once эффект у потребителя
CREATE TABLE IF NOT EXISTS platform.results_applied(
  tenant      text        NOT NULL,
  handler     text        NOT NULL,
  message_id  text        NOT NULL,
  applied_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant, handler, message_id)
);

CREATE INDEX IF NOT EXISTS results_applied_applied_at_idx
  ON platform.results_applied (applied_at);

-- app_commands: трассировка и идемпотентность команд (not-before только как диагностическое поле)
CREATE TABLE IF NOT EXISTS platform.app_commands(
  id                   uuid        PRIMARY KEY,
  tenant               text        NOT NULL,
  subject              text        NOT NULL,
  version              int         NOT NULL,
  correlation_id       text        NOT NULL,
  causation_id         text,
  command_instance_id  text        NOT NULL,
  payload              jsonb       NOT NULL,
  headers              jsonb       NOT NULL,
  available_at         timestamptz,
  ttl_seconds          int         NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_commands_inst_unq
  ON platform.app_commands(tenant, command_instance_id);

CREATE INDEX IF NOT EXISTS app_commands_available_idx
  ON platform.app_commands (tenant, available_at);

-- saga_store: устойчивое состояние для оркестрации
CREATE TABLE IF NOT EXISTS platform.saga_instances(
  id           uuid        PRIMARY KEY,
  tenant       text        NOT NULL,
  name         text        NOT NULL,
  version      int         NOT NULL DEFAULT 0,
  state        text        NOT NULL, -- new|executing|compensating|completed|failed|cancelled
  data         jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saga_instances_tenant_name_idx
  ON platform.saga_instances (tenant, name);

-- шаги саги (история и компенсации)
CREATE TABLE IF NOT EXISTS platform.saga_steps(
  id            uuid        PRIMARY KEY,
  saga_id       uuid        NOT NULL REFERENCES platform.saga_instances(id) ON DELETE CASCADE,
  step_order    int         NOT NULL,
  step_name     text        NOT NULL,
  command_subject text      NOT NULL,
  command_instance_id text  NOT NULL,
  status        text        NOT NULL, -- pending|executing|applied|compensating|compensated|failed|timeout
  result_status text,
  result_data   jsonb,
  error         jsonb,
  applied_at    timestamptz,
  compensated_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (saga_id, step_order)
);

CREATE INDEX IF NOT EXISTS saga_steps_saga_idx
  ON platform.saga_steps (saga_id, step_order);

CREATE INDEX IF NOT EXISTS saga_steps_command_instance_idx
  ON platform.saga_steps (command_instance_id);

-- Проверочные ограничения
ALTER TABLE platform.saga_instances
  ADD CONSTRAINT saga_instances_state_check
  CHECK (state IN ('new', 'executing', 'compensating', 'completed', 'failed', 'cancelled'));

ALTER TABLE platform.saga_steps
  ADD CONSTRAINT saga_steps_status_check
  CHECK (status IN ('pending', 'executing', 'applied', 'compensating', 'compensated', 'failed', 'timeout'));

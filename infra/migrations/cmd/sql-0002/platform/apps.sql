-- Каталог + привязки слотов
-- App-Wide Orchestrator — Slots (normalized: catalog + assignments)

-- ====================================================================
-- Provider Configurations (Normalized)
-- ====================================================================
-- Centralized provider configurations to avoid data duplication
-- across multi-domain slots (e.g., novaposhta for shipping + payment)
CREATE TABLE provider_configs (
  -- UUID v7 identifier
  id uuid PRIMARY KEY ,
  -- Project reference
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- Provider code (e.g., 'novaposhta', 'meest', 'bank_transfer')
  provider text NOT NULL,
  -- Provider configuration (apiKey, baseUrl, etc.)
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Configuration version
  version int NOT NULL DEFAULT 1,
  -- Status
  status varchar(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'maintenance', 'deprecated')),
  -- Environment
  environment varchar(20) NOT NULL DEFAULT 'production'
    CHECK (environment IN ('development', 'staging', 'production')),
  -- Created timestamp
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Updated timestamp
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint: one config per provider per project
  CONSTRAINT uq_provider_configs_project_provider UNIQUE (project_id, provider)
);

-- Index for faster lookups
CREATE INDEX idx_provider_configs_lookup ON provider_configs(project_id, provider);

COMMENT ON TABLE provider_configs IS 'Centralized provider configurations to avoid duplication across multi-domain slots';
COMMENT ON COLUMN provider_configs.data IS 'Provider-specific configuration (API keys, URLs, settings)';

-- ====================================================================
-- Slots (Domain-specific references to providers)
-- ====================================================================
-- Catalog of providers (application-level slots)
-- Каталог слотов уровня приложения
CREATE TABLE slots (
  -- Идентификатор слота (UUID v7)
  id uuid PRIMARY KEY ,
  -- Project reference
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- Домен интеграции (payment/shipping/tax/inventory/pricing/...)
  domain varchar(32) NOT NULL,
  -- Код провайдера (например, 'novaposhta', 'meest')
  provider text NOT NULL,
  -- Reference to shared provider configuration
  provider_config_id uuid NOT NULL REFERENCES provider_configs(id) ON DELETE CASCADE,
  -- Список возможностей провайдера для данного домена
  capabilities text[] NOT NULL DEFAULT '{}',
  -- Время создания
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Время обновления
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Гарантировать уникальность: один слот на комбинацию (project + domain + provider)
-- Это позволяет одному провайдеру работать в разных доменах
-- Например: novaposhta может быть и в shipping, и в payment
CREATE UNIQUE INDEX uidx_slots_project_domain_provider ON slots (project_id, domain, provider);

-- Index for faster queries by domain
CREATE INDEX idx_slots_domain_lookup ON slots (project_id, domain);

COMMENT ON TABLE slots IS 'Lightweight domain-specific references to providers. One provider can have multiple slots (one per domain).';
COMMENT ON COLUMN slots.provider_config_id IS 'Reference to shared provider configuration (data not duplicated)';
COMMENT ON COLUMN slots.domain IS 'Domain this slot operates in (shipping, payment, pricing, inventory, etc.)';

-- ====================================================================
-- Slot Assignments
-- ====================================================================
-- Assignments of providers to aggregates per project (m:n)
-- Привязки слотов к проектам/агрегатам (m:n)
CREATE TABLE slot_assignments (
  -- Идентификатор привязки (UUID v7)
  id uuid PRIMARY KEY ,
  -- Проект; каскадное удаление
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- Имя агрегата ('checkout','order', ...)
  aggregate text NOT NULL,
  -- ID экземпляра агрегата
  aggregate_id uuid NOT NULL,
  -- Ссылка на слот каталога
  slot_id uuid NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  -- Денормализованный домен (для уникальности/поиска)
  domain varchar(32) NOT NULL,
  -- Приоритет среди нескольких привязок (меньше = выше)
  precedence int NOT NULL DEFAULT 0,
  -- Статус привязки
  status varchar(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  -- Время создания
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Время обновления
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Запретить дубликаты одного slot_id для активных привязок
CREATE UNIQUE INDEX uidx_slot_assign_unique_active
  ON slot_assignments (project_id, aggregate, aggregate_id, domain, slot_id)
  WHERE status = 'active';

-- Индекс: быстрый поиск привязок для resolve (только активные)
CREATE INDEX idx_slot_assign_lookup ON slot_assignments (project_id, aggregate, aggregate_id, status);

-- Ограничение: приоритет не может быть отрицательным
ALTER TABLE slot_assignments
ADD CONSTRAINT chk_slot_assign_precedence_nonneg CHECK (precedence >= 0);

COMMENT ON TABLE slot_assignments IS 'Assignments of slots to specific aggregate instances (checkout, order, etc.)';

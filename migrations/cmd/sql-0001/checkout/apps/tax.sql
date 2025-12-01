-- Таблица: order_tax_legal
-- Назначение: неизменяемый снимок (snapshot) юр.-налоговых реквизитов покупателя на момент заказа.
-- Используется для инвоисов, расчёта VAT/GST, применения льгот (exempt/reverse charge)
-- и хранения доказательств юрисдикции (MOSS/OSS) для аудита.
CREATE TABLE IF NOT EXISTS
  order_tax_legal (
    -- Связь 1:1 с заказом; при удалении заказа запись удаляется каскадно.
    order_id uuid PRIMARY KEY REFERENCES orders (id) ON DELETE CASCADE,
    -- Юридическое наименование покупателя на момент оформления (снимок, не меняем задним числом).
    buyer_company text,
    -- Налоговый идентификатор (VAT/GST/ИНН и т.п.), при наличии может включать префикс страны (напр. "DE123456789").
    buyer_vat_number text,
    -- Налоговая страна покупателя (ISO 3166-1 alpha-2), влияет на выбор ставки/режима налогообложения.
    buyer_tax_country char(2),
    -- Признак налогового освобождения (exempt/reverse charge/сертификат). По умолчанию — false.
    buyer_tax_exempt boolean NOT NULL DEFAULT false,
    -- Доказательства места реализации/льготы (JSONB): ip_country, bin_country, billing_country, номера сертификатов, ссылки на документы и т.д.
    tax_evidence jsonb,
    -- Время фиксации этого среза для конкретного заказа.
    created_at timestamptz NOT NULL DEFAULT now()
  );

-- =========================================================
-- РАЗБИВКА НАЛОГОВ (юрисдикционные детали для соответствия)
-- =========================================================
CREATE TABLE IF NOT EXISTS
  order_taxes (
    -- Уникальный идентификатор записи налога (UUID v7 для сортируемости по времени).
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    -- Ссылка на заказ, к которому относится этот налог.
    -- При удалении заказа все связанные налоги удаляются каскадно.
    order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    -- (Опционально) Ссылка на конкретную позицию заказа.
    -- NULL означает налог, рассчитанный на уровень всего заказа.
    -- При удалении позиции соответствующие записи налога удаляются каскадно.
    line_item_id uuid REFERENCES order_items (id) ON DELETE CASCADE,
    -- Тип юрисдикции, для которой действует налог: 'country'/'state'/'county'/'city' и т.п.
    jurisdiction_type varchar(16) NOT NULL,
    CONSTRAINT ck_ot_jurisdiction_type CHECK (jurisdiction_type IN ('country','state','county','city','region','eu')),
    -- Код юрисдикции (например, ISO-код страны или «страна-регион»).
    -- Примеры: 'US-CA', 'CA-BC', 'DE', 'EU'.
    jurisdiction_code text NOT NULL,
    -- Человекочитаемое имя налога: 'VAT', 'GST', 'PST', 'City Tax' и т.п.
    tax_name text NOT NULL,
    -- Ставка налога в процентах.
    -- ⚠️ Договоритесь о формате: 7.5 означает 7.5% (рекомендую так),
    -- либо храните долю (0.075) и тогда лучше назвать поле rate.
    rate_percent numeric(9, 6) NOT NULL,
    -- Сумма налога в минимальных денежных единицах (например, в центах/копейках).
    -- Нельзя быть отрицательной.
    amount int NOT NULL CHECK (amount >= 0),
    -- Признак «налог включён в цену» (tax-inclusive pricing).
    tax_included boolean NOT NULL DEFAULT false,
    -- Время создания записи (UTC с часовым поясом).
    created_at timestamptz NOT NULL DEFAULT now()
  );

-- Индекс для быстрых выборок по заказу.
CREATE INDEX IF NOT EXISTS idx_ot_order ON order_taxes (order_id);

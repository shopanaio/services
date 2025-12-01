-- =========================================================
-- СЧЕТА (юридические документы)
-- Назначение: юридическая фиксация продажи. Содержит нумерацию по серии,
-- суммы, валюту, статусы, срок оплаты и ссылку на PDF. Связана с заказом 1:N.
-- =========================================================
CREATE TABLE IF NOT EXISTS
  invoices (
    -- Уникальный идентификатор счета (UUID v7 для временной сортировки).
    id uuid PRIMARY KEY ,
    -- FK на заказ; при удалении заказа связанные счета удаляются каскадно.
    order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    -- Юридическое лицо, которое выставляет счет (ваша компания/филиал).
    -- Используется для раздельной нумерации и отчетности.
    legal_entity_id text NOT NULL,
    -- Серия нумерации (например, по юр. лицу/региону/году). По умолчанию 'A'.
    series text NOT NULL DEFAULT 'A',
    -- Порядковый номер в рамках серии (увеличивается вашим приложением).
    number integer NOT NULL,
    -- Человеко-читаемый код счета: <SERIES>-<YEAR>-<NNNNNN>.
    -- Год берется из placed_at заказа, номер — из поля number.
    -- Пример: A-2025-000123
    invoice_code text NOT NULL,
    -- Статус счета (используется ваш enum invoice_status):
    -- draft / issued / void / paid / overdue / refunded.
    status varchar(24) NOT NULL DEFAULT 'issued',
    CONSTRAINT ck_invoices_status CHECK (
      status IN (
        'draft',
        'issued',
        'void',
        'paid',
        'overdue',
        'refunded'
      )
    ),
    -- Валюта счета (обычно совпадает с валютой заказа).
    currency_code char(3) NOT NULL REFERENCES currency_codes (code),
    -- Сумма без налогов (в минорных единицах). Должна быть ≥ 0.
    subtotal_amount int NOT NULL CHECK (subtotal_amount >= 0),
    -- Сумма налогов (в минорных единицах). Должна быть ≥ 0.
    total_tax_amount int NOT NULL CHECK (total_tax_amount >= 0),
    -- Итоговая сумма счета (в минорных единицах). Должна быть ≥ 0.
    -- Обычно subtotal_amount + total_tax_amount.
    total_amount int NOT NULL CHECK (total_amount >= 0),
    -- Срок оплаты (due date) по счету; может быть NULL (например, предоплата).
    due_date date,
    -- Момент выставления счета (юридически значимая дата).
    issued_at timestamptz NOT NULL DEFAULT now(),
    -- Ссылка/путь на PDF-версию счета (в хранилище/облаке).
    pdf_url text,
    -- Произвольные атрибуты/интеграционные метки (JSONB).
    metadata jsonb NOT NULL DEFAULT '{}'
    -- Уникальность номера в рамках (юр. лицо, серия, год по issued_at, номер).
    -- Позволяет перезапускать нумерацию каждый год.
  );

-- Индекс для быстрых выборок счетов по заказу.
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices (order_id);

-- Примечание:
-- invoice_code формирует год из orders.placed_at, а уникальность серий привязана к году из issued_at.
-- Убедитесь, что ваша политика нумерации осознанно допускает такую разницу
-- (или унифицируйте на один источник года — placed_at или issued_at).

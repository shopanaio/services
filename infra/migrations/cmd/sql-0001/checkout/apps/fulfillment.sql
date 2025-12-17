-- fulfillments (выделено из orders.sql)
CREATE TABLE
  order_fulfillments (
    -- Идентификатор проекта
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    -- Уникальный идентификатор отгрузки/фулфилмента
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    -- Ссылка на заказ
    order_id uuid REFERENCES orders (id) ON DELETE CASCADE NOT NULL,
    -- Родительская отгрузка (для вложенных/частичных)
    parent_id uuid REFERENCES order_fulfillments (id),
    -- Статус фулфилмента
    -- управляется сервисом fulfillment (@apps/fulfillment); может меняться косвенно
    -- интеграциями shipping/payment/CRM (@apps/shipping,@apps/payment,@apps/crm)
    -- через команды/слоты и бизнес-события (например shipped/delivered/cancelled/returned)
    status varchar(32) NOT NULL,
    CONSTRAINT ck_order_fulfillments_status CHECK (status IN ('pending','allocated','packed','shipped','delivered','cancelled','returned')),
    -- Назначенный провайдер (через слот)
    provider text,
    -- Внешний ID у провайдера
    external_id text,
    -- Дополнительные данные
    -- может обогащаться интеграциями (@apps/shipping: трекинг/сервисы, @apps/crm: метки, @apps/payment: ссылки на инвойсы)
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- Время создания записи
    created_at timestamptz NOT NULL DEFAULT now(),
    -- Время последнего обновления
    updated_at timestamptz NOT NULL DEFAULT now()
  );

CREATE INDEX IF NOT EXISTS idx_order_fulfillments_order_id ON order_fulfillments (order_id);

CREATE TABLE
  order_fulfillment_items (
    -- Идентификатор проекта
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    -- Уникальный идентификатор позиции фулфилмента
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    -- Ссылка на позицию заказа
    order_item_id uuid REFERENCES order_items (id) ON DELETE CASCADE NOT NULL,
    -- Ссылка на фулфилмент
    order_fulfillment_id uuid REFERENCES order_fulfillments (id) ON DELETE CASCADE NOT NULL,
    -- Количество, выделенное в данном фулфилменте
    quantity int NOT NULL,
    -- Дополнительные данные
    -- может обогащаться интеграциями (@apps/shipping,@apps/fulfillment): упаковка/лот/ячейка, трекинг по линии
    metadata jsonb,
    CHECK (quantity > 0)
  );

CREATE UNIQUE INDEX IF NOT EXISTS order_fulfillment_items_order_item_id_order_fulfillment_id_idx ON order_fulfillment_items (order_item_id, order_fulfillment_id);

-- =========================================================
-- EAV-АТРИБУТЫ ДЛЯ ФУЛФИЛМЕНТОВ И ИХ ПОЗИЦИЙ (для интеграций @apps/*)
-- =========================================================
CREATE TABLE IF NOT EXISTS
  order_fulfillment_attributes (
    -- Идентификатор проекта
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    -- Ссылка на фулфилмент
    order_fulfillment_id uuid NOT NULL REFERENCES order_fulfillments (id) ON DELETE CASCADE,
    -- Источник/интеграция (@apps/shipping,@apps/fulfillment,@apps/crm,@apps/payment,...)
    provider text NOT NULL,
    -- Ключ атрибута
    attr_key text NOT NULL,
    -- Значение атрибута (произвольная структура)
    attr_value jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- Метки времени
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (order_fulfillment_id, provider, attr_key),
    CHECK (attr_key <> '')
  );

CREATE INDEX IF NOT EXISTS idx_of_attr_provider
  ON order_fulfillment_attributes (provider);

CREATE TABLE IF NOT EXISTS
  order_fulfillment_item_attributes (
    -- Идентификатор проекта
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    -- Ссылка на позицию фулфилмента
    order_fulfillment_item_id uuid NOT NULL REFERENCES order_fulfillment_items (id) ON DELETE CASCADE,
    -- Источник/интеграция (@apps/shipping,@apps/fulfillment,...)
    provider text NOT NULL,
    -- Ключ атрибута
    attr_key text NOT NULL,
    -- Значение атрибута
    attr_value jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- Метки времени
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (order_fulfillment_item_id, provider, attr_key),
    CHECK (attr_key <> '')
  );

CREATE INDEX IF NOT EXISTS idx_of_item_attr_provider
  ON order_fulfillment_item_attributes (provider);

-- =========================================================
-- ВОЗВРАТЫ (RMA) И КРЕДИТ-НОТЫ (CREDIT MEMOS)
-- Назначение блока:
--  - return_orders: карточка возврата (RMA) по заказу и его жизненный цикл.
--  - return_line_items: перечень возвращаемых позиций и их состояние.
--  - credit_memos: учетный документ на возмещение (может жить отдельно от фактического PSP-refund).
-- =========================================================
-- Карточка возврата (RMA) по заказу.
CREATE TABLE IF NOT EXISTS
  return_orders (
    -- Уникальный идентификатор возврата (UUID v7 для сортировки по времени).
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    -- FK на исходный заказ; при удалении заказа возврат удаляется каскадно.
    order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    -- Внешний человеко-читаемый номер RMA (для WMS/ERP/саппорта). Уникальный.
    rma_number text UNIQUE,
    -- Статус жизненного цикла возврата.
    -- Типичные значения: requested/approved/received/inspected/completed/rejected.
    status varchar(24) NOT NULL DEFAULT 'requested',
    CONSTRAINT ck_return_orders_status CHECK (status IN ('requested','approved','received','inspected','completed','rejected')),
    -- Причина возврата (свободный текст: «не подошёл размер», «брак» и т.п.).
    reason text,
    -- Комиссия за возврат/рестокинг (в minor units базовой валюты). Обычно >= 0.
    -- Используется для удержания части суммы при возмещении.
    restocking_fee int NOT NULL DEFAULT 0,
    -- Когда создана карточка возврата.
    created_at timestamptz NOT NULL DEFAULT now(),
    -- Технический штамп обновления (обновляется триггером).
    updated_at timestamptz NOT NULL DEFAULT now()
  );

-- Позиции, входящие в возврат (детализация по SKU/line_item).
CREATE TABLE IF NOT EXISTS
  return_line_items (
    -- FK на карточку возврата; каскадное удаление при удалении RMA.
    return_id uuid NOT NULL REFERENCES return_orders (id) ON DELETE CASCADE,
    -- FK на строчку заказа, которую возвращают.
    line_item_id uuid NOT NULL REFERENCES order_items (id) ON DELETE CASCADE,
    -- Количество возвращаемых единиц (> 0).
    quantity integer NOT NULL CHECK (quantity > 0),
    -- Состояние товара при приёмке: например, new / open_box / used / damaged.
    -- (При желании можно заменить на ENUM для нормализации.)
    condition text,
    -- Уникальность строчки возврата в рамках RMA.
    PRIMARY KEY (return_id, line_item_id)
  );

-- Кредит-мемо (credit note): бухгалтерский документ на возмещение.
-- Может оформляться независимо от PSP-refund (разные даты и статусы).
CREATE TABLE IF NOT EXISTS
  credit_memos (
    -- Уникальный идентификатор кредит-мемо (UUID v7).
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    -- FK на заказ, к которому относится кредит-мемо.
    order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    -- Номер документа (по вашей серии/учётной политике). Уникален в рамках заказа.
    number text NOT NULL,
    -- Статус документа (используется invoice_status): draft/issued/void/paid/overdue/refunded.
    status varchar(24) NOT NULL DEFAULT 'issued',
    CONSTRAINT ck_credit_memos_status CHECK (status IN ('draft','issued','void','paid','overdue','refunded')),
    -- Валюта кредит-мемо (обычно совпадает с валютой заказа).
    currency_code char(3) NOT NULL REFERENCES currency_codes (code),
    -- Сумма без налогов (minor units), ≥ 0.
    subtotal_amount int NOT NULL CHECK (subtotal_amount >= 0),
    -- Сумма налогов (minor units), ≥ 0.
    total_tax_amount int NOT NULL CHECK (total_tax_amount >= 0),
    -- Итоговая сумма к возмещению (minor units), ≥ 0.
    -- (Обычно subtotal_amount + total_tax_amount, можно добавить CHECK при желании.)
    total_amount int NOT NULL CHECK (total_amount >= 0),
    -- Время выставления документа (момент юридической фиксации кредит-мемо).
    issued_at timestamptz NOT NULL DEFAULT now(),
    -- Произвольные атрибуты/интеграционные метки (JSONB).
    metadata jsonb NOT NULL DEFAULT '{}',
    -- Уникальность номера в рамках заказа.
    CONSTRAINT uq_credit_memo UNIQUE (order_id, number)
  );

CREATE TABLE IF NOT EXISTS
  fulfillment_items_physical_properties (
    tenant_id uuid NOT NULL,
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    fulfillment_item_id uuid NOT NULL REFERENCES order_fulfillment_items (id) ON DELETE CASCADE,
    weight_g int CHECK (weight_g >= 0),
    length_mm int CHECK (length_mm >= 0),
    width_mm int CHECK (width_mm >= 0),
    height_mm int CHECK (height_mm >= 0)
  );

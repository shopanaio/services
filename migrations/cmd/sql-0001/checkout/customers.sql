-- customers (снепшоты заказчика на момент заказа)
CREATE TABLE IF NOT EXISTS
  order_customers (
    -- Идентификатор проекта
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    -- Уникальный идентификатор записи снепшота покупателя
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    -- Ссылка на заказ
    order_id uuid REFERENCES orders (id) ON DELETE CASCADE NOT NULL,
    -- Ссылка на покупателя (если известен)
    customer_id uuid REFERENCES customers (id) ON DELETE SET NULL,
    -- Email покупателя на момент заказа
    email citext,
    -- Телефон покупателя на момент заказа
    phone_e164 text,
    -- Имя покупателя
    first_name text,
    -- Отчество покупателя
    middle_name text,
    -- Фамилия покупателя
    last_name text,
    -- Дополнительные данные
    metadata jsonb,
    -- Источник данных/провайдер
    provider text,
    -- Внешний идентификатор в провайдере
    external_id text,
    -- Время создания записи
    created_at timestamptz NOT NULL DEFAULT now()
  );

CREATE UNIQUE INDEX IF NOT EXISTS uidx_order_customers_order ON order_customers (order_id);

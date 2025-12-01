-- draft
-- shipping (выделено из orders.sql)
CREATE TABLE
  order_shipping_items (
    -- Идентификатор проекта
    project_id uuid REFERENCES projects (id) ON DELETE CASCADE NOT NULL,
    -- Уникальный идентификатор записи доставки
    id uuid PRIMARY KEY DEFAULT uuid_generate_v7 (),
    -- Признак включённых уведомлений о доставке
    notifications_enabled boolean,
    -- Оценочная дата доставки
    estimated_delivery_at timestamptz,
    -- Ссылка на фулфилмент
    order_fulfillment_id uuid REFERENCES order_fulfillments (id) ON DELETE CASCADE NOT NULL,
    -- Метод доставки
    shipping_method_id uuid REFERENCES shipping_methods (id) ON DELETE SET NULL,
    -- Назначенный провайдер (через слот)
    provider text,
    -- Внешний ID у провайдера
    external_id text,
    -- Стоимость доставки
    shipping_price int,
    -- Признак включённого трекинга
    tracking_enabled boolean,
    -- Данные трекинга
    tracking_data jsonb,
    -- Трек-номер
    tracking_code varchar(255),
    -- URL для трекинга
    tracking_url text,
    -- Время создания записи
    created_at timestamptz NOT NULL DEFAULT now(),
    -- Дополнительные данные
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
  );

CREATE INDEX IF NOT EXISTS idx_order_shipping_items_fulfillment_id ON order_shipping_items (order_fulfillment_id);
